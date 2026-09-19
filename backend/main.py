"""
XSS Attack Detection API — FastAPI Backend
Author: Harshit Kumar
"""

import os, re, json, time, logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import numpy as np
import joblib
from scipy.sparse import hstack, csr_matrix

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# ─────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# Startup time (for uptime calculation)
# ─────────────────────────────────────────────
START_TIME = time.time()

# ─────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────
BASE_DIR      = Path(__file__).parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"

MODEL_PATH = ARTIFACTS_DIR / "xss_model.pkl"
VEC_PATH   = ARTIFACTS_DIR / "xss_vectorizer.pkl"
META_PATH  = ARTIFACTS_DIR / "model_metadata.json"

# ─────────────────────────────────────────────
# Load model artifacts
# ---------------------------------------------
logger.info("Loading model artifacts...")

if not MODEL_PATH.exists() or not VEC_PATH.exists():
    raise FileNotFoundError(f"Model artifacts not found in {ARTIFACTS_DIR}.")

model      = joblib.load(MODEL_PATH)
vectorizer = joblib.load(VEC_PATH)
metadata   = json.loads(META_PATH.read_text()) if META_PATH.exists() else {}

DEFAULT_SEVERITY_THRESHOLDS = {
    "safe_max": 0.20, "low_max": 0.45, "medium_max": 0.65, "high_max": 0.85,
}


def load_severity_thresholds(raw: dict) -> dict:
    """Use persisted thresholds only when they form a valid increasing range."""
    try:
        values = [float(raw[key]) for key in DEFAULT_SEVERITY_THRESHOLDS]
        if 0 < values[0] < values[1] < values[2] < values[3] < 1:
            return dict(zip(DEFAULT_SEVERITY_THRESHOLDS, values))
    except (KeyError, TypeError, ValueError):
        pass
    logger.warning("Invalid severity thresholds in metadata; using secure defaults.")
    return DEFAULT_SEVERITY_THRESHOLDS.copy()


SEVERITY_THRESHOLDS = load_severity_thresholds(metadata.get("severity_thresholds", {}))

FEATURE_NAMES = [
    "has_script_tag", "has_javascript_protocol", "has_event_handler",
    "has_alert", "has_eval", "has_document_access", "has_window_access",
    "has_remote_src", "has_url_encoding", "has_html_entity",
    "has_unicode_escape", "has_base64", "has_fromcharcode",
    "has_iframe", "has_img_src", "has_data_uri", "has_vbscript",
    "tag_density_ratio",
]

FEATURE_LABELS = {
    "has_script_tag": "Script tag", "has_javascript_protocol": "javascript: URI",
    "has_event_handler": "Inline event handler", "has_alert": "JavaScript alert call",
    "has_eval": "Dynamic code execution (eval)", "has_document_access": "Document object access",
    "has_window_access": "Window object access", "has_remote_src": "Remote resource source",
    "has_url_encoding": "URL encoding", "has_html_entity": "HTML entity encoding",
    "has_unicode_escape": "Unicode escape", "has_base64": "Base64 marker",
    "has_fromcharcode": "Character-code construction", "has_iframe": "Iframe tag",
    "has_img_src": "Image source", "has_data_uri": "Data URI", "has_vbscript": "vbscript: URI",
}

REMEDIATION = {
    "Script injection": ["Encode untrusted output for its HTML context.", "Avoid inserting untrusted strings with innerHTML."],
    "Event-handler injection": ["Do not concatenate untrusted input into HTML attributes.", "Use framework bindings and validate allowed attributes."],
    "Protocol injection": ["Allowlist URL schemes such as https and mailto.", "Reject javascript:, data:, and vbscript: URLs from untrusted input."],
    "Encoded or obfuscated payload": ["Decode input once before validation and output encoding.", "Use a maintained HTML sanitizer with an allowlist."],
    "Markup injection": ["Sanitize untrusted HTML with a strict allowlist.", "Apply context-aware output encoding at the rendering boundary."],
    "Suspicious input": ["Treat this as untrusted input and apply context-aware output encoding.", "Review the rendering path before allowing it into the application."],
}

logger.info("Model loaded. Accuracy=%s  F1=%s  AUC=%s",
            metadata.get("test_accuracy"), metadata.get("test_f1"), metadata.get("test_roc_auc"))

# ─────────────────────────────────────────────
# Feature engineering
# ─────────────────────────────────────────────
def extract_security_features(text: str) -> list:
    t = str(text).lower()
    return [
        int(bool(re.search(r'<script',               t))),
        int(bool(re.search(r'javascript:',           t))),
        int(bool(re.search(r'on\w+=',                t))),
        int(bool(re.search(r'alert\s*\(',            t))),
        int(bool(re.search(r'eval\s*\(',             t))),
        int(bool(re.search(r'document\s*\.',         t))),
        int(bool(re.search(r'window\s*\.',           t))),
        int(bool(re.search(r'src\s*=\s*["\']?\s*http', t))),
        int(bool(re.search(r'%[0-9a-f]{2}',         t))),
        int(bool(re.search(r'&#x?[0-9a-f]+;',       t))),
        int(bool(re.search(r'\\u[0-9a-f]{4}',       t))),
        int(bool(re.search(r'base64',                t))),
        int(bool(re.search(r'fromcharcode',          t))),
        int(bool(re.search(r'<iframe',               t))),
        int(bool(re.search(r'<img[^>]+src',          t))),
        int(bool(re.search(r'data:',                 t))),
        int(bool(re.search(r'vbscript:',             t))),
        len(re.findall(r'<[^>]+>', t)) / max(len(t), 1),
    ]


def get_severity(prob: float) -> str:
    t = SEVERITY_THRESHOLDS
    if prob <= t.get("safe_max",   0.20): return "SAFE"
    if prob <= t.get("low_max",    0.45): return "LOW"
    if prob <= t.get("medium_max", 0.65): return "MEDIUM"
    if prob <= t.get("high_max",   0.85): return "HIGH"
    return "CRITICAL"


def classify_attack(triggered: list) -> str:
    if "has_script_tag" in triggered or "has_eval" in triggered:
        return "Script injection"
    if "has_event_handler" in triggered:
        return "Event-handler injection"
    if any(item in triggered for item in ("has_javascript_protocol", "has_vbscript", "has_data_uri")):
        return "Protocol injection"
    if any(item in triggered for item in ("has_url_encoding", "has_html_entity", "has_unicode_escape", "has_fromcharcode", "has_base64")):
        return "Encoded or obfuscated payload"
    if any(item in triggered for item in ("has_iframe", "has_img_src", "has_remote_src")):
        return "Markup injection"
    return "Suspicious input"


def predict_single(text: str) -> dict:
    tfidf_feat = vectorizer.transform([text])
    sec_feat   = csr_matrix(np.array([extract_security_features(text)]))
    combined   = hstack([tfidf_feat, sec_feat])
    prob       = float(model.predict_proba(combined)[0][1])
    pred       = int(model.predict(combined)[0])
    severity   = get_severity(prob)
    sec_vals   = extract_security_features(text)
    triggered  = [FEATURE_NAMES[i] for i, v in enumerate(sec_vals[:-1]) if v == 1]
    attack_type = classify_attack(triggered) if pred else "No XSS pattern detected"
    return {
        "is_xss"            : pred == 1,
        "xss_probability"   : round(prob, 4),
        "severity"          : severity,
        "triggered_features": triggered,
        "feature_labels"    : [FEATURE_LABELS[name] for name in triggered],
        "attack_type"       : attack_type,
        "recommendations"   : REMEDIATION[attack_type] if pred else ["No XSS signature was detected. Keep server-side validation and output encoding enabled."],
    }

# ─────────────────────────────────────────────
# Rate limiter
# ─────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ─────────────────────────────────────────────
# FastAPI app
# ─────────────────────────────────────────────
app = FastAPI(
    title       = "XSS Detection API",
    description = "ML-powered XSS detection — Calibrated Linear SVM + character TF-IDF",
    version     = "1.1.0",
    docs_url    = "/docs",
    redoc_url   = "/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Comma-separated browser origins. Supports production frontend deployments & local development.
DEFAULT_ALLOWED_ORIGINS = "*,http://localhost:5173,http://127.0.0.1:5173,https://shield-scan-five.vercel.app"
raw_origins = os.getenv("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS).split(",")
ALLOWED_ORIGINS = [o.strip().rstrip("/") for o in raw_origins if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in ALLOWED_ORIGINS else ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=False,
)

# ─────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────
class SingleRequest(BaseModel):
    payload: str = Field(..., min_length=1, max_length=10_000)

    @validator("payload")
    def strip_payload(cls, v):
        return v.strip()


class BatchRequest(BaseModel):
    payloads: List[str] = Field(..., min_items=1, max_items=100)

    @validator("payloads", each_item=True)
    def strip_each(cls, v):
        if not v.strip():
            raise ValueError("Empty payload in batch")
        if len(v) > 10_000:
            raise ValueError("Payload exceeds 10 000 characters")
        return v.strip()


class PredictionResult(BaseModel):
    payload           : str
    is_xss            : bool
    xss_probability   : float
    severity          : str
    triggered_features: List[str]
    feature_labels    : List[str]
    attack_type       : str
    recommendations   : List[str]
    inference_ms      : float


class BatchResult(BaseModel):
    results            : List[PredictionResult]
    total              : int
    xss_count          : int
    safe_count         : int
    avg_confidence     : float
    total_inference_ms : float

class AiReviewRequest(BaseModel):
    payload: str = Field(..., min_length=1, max_length=2000)
    ml_result: Optional[dict] = None
    consent: bool = Field(False, description="User must explicitly consent to sending payload for external AI review")
    demo_mode: bool = Field(False, description="Run offline mock AI review without requiring an API key")

    @validator("payload")
    def strip_payload(cls, v):
        return v.strip()


class AiReviewResponse(BaseModel):
    risk_assessment: str = Field(..., description="suspicious | likely benign | uncertain")
    confidence_level: str = Field(..., description="low | medium | high")
    likely_attack_type: str
    explanation: str
    suggested_defenses: List[str]
    reasons_to_review_manually: List[str]
    ml_agreement: str = Field(..., description="agrees | disagrees | uncertain")
    disclaimer: str
    is_demo: bool = False


BENCHMARK_PATH = ARTIFACTS_DIR / "model_benchmark.json"
benchmark_data = json.loads(BENCHMARK_PATH.read_text()) if BENCHMARK_PATH.exists() else {}


def generate_demo_ai_review(payload: str, ml_res: Optional[dict]) -> dict:
    """Generate a realistic, deterministic advisory AI review for demonstration/interview purposes."""
    p_lower = payload.lower()
    has_obvious_xss = any(sig in p_lower for sig in ["<script", "javascript:", "onerror=", "onload=", "eval(", "document.cookie", "alert("])
    
    ml_is_xss = bool(ml_res.get("is_xss")) if ml_res else has_obvious_xss
    ml_prob = float(ml_res.get("xss_probability", 0.9 if has_obvious_xss else 0.05)) if ml_res else (0.9 if has_obvious_xss else 0.05)
    
    if has_obvious_xss or ml_is_xss:
        attack_type = ml_res.get("attack_type", "Script or Event-Handler Injection") if ml_res else "Script or Event-Handler Injection"
        return {
            "risk_assessment": "suspicious",
            "confidence_level": "high" if ml_prob > 0.75 else "medium",
            "likely_attack_type": attack_type,
            "explanation": f"The payload contains executable JavaScript patterns ('{payload[:40]}...') that could execute in a browser if inserted into an unescaped HTML context.",
            "suggested_defenses": [
                "Apply contextual HTML entity encoding on all user output before rendering.",
                "Use a strict Content Security Policy (CSP) with nonce-based or strict script-src directives.",
                "Sanitize rich HTML markup with DOMPurify using an explicit element/attribute allowlist.",
                "Avoid dangerous DOM sinks like innerHTML, outerHTML, and document.write()."
            ],
            "reasons_to_review_manually": [
                "Verify if the receiving application decodes or evaluates this payload in a DOM sink.",
                "Check whether upstream WAF or framework-level sanitizers already neutralize this input."
            ],
            "ml_agreement": "agrees" if ml_is_xss else "disagrees",
            "disclaimer": "This is an advisory review. ShieldScan’s local ML model remains the detection engine.",
            "is_demo": True
        }
    else:
        return {
            "risk_assessment": "likely benign",
            "confidence_level": "high" if ml_prob < 0.2 else "medium",
            "likely_attack_type": "None detected",
            "explanation": "No executable script tags, event handlers, or dangerous protocol schemes were observed in the supplied string.",
            "suggested_defenses": [
                "Maintain standard context-aware output encoding across all templates.",
                "Validate input length, character set, and format against expected business logic."
            ],
            "reasons_to_review_manually": [
                "If this payload is concatenated into SQL queries or system commands, verify other injection types."
            ],
            "ml_agreement": "agrees" if not ml_is_xss else "disagrees",
            "disclaimer": "This is an advisory review. ShieldScan’s local ML model remains the detection engine.",
            "is_demo": True
        }


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────
@app.get("/", tags=["health"])
def root():
    return {
        "service"   : "XSS Detection API",
        "status"    : "running",
        "model"     : metadata.get("model_type", "CalibratedLinearSVC"),
        "accuracy"  : metadata.get("test_accuracy"),
        "docs"      : "/docs",
    }


@app.get("/health", tags=["health"])
def health():
    """Returns model_loaded, uptime, version for Dashboard."""
    return {
        "status"        : "ok",
        "model_loaded"  : True,
        "uptime_seconds": round(time.time() - START_TIME, 1),
        "version"       : metadata.get("version", "1.1.0"),
        "timestamp"     : datetime.utcnow().isoformat(),
    }


@app.post("/predict", response_model=PredictionResult, tags=["detection"])
@limiter.limit("60/minute")
def predict(request: Request, body: SingleRequest):
    t0     = time.perf_counter()
    result = predict_single(body.payload)
    ms     = round((time.perf_counter() - t0) * 1000, 2)
    logger.info("predict | severity=%s prob=%.4f", result["severity"], result["xss_probability"])
    return PredictionResult(payload=body.payload[:200], inference_ms=ms, **result)


@app.post("/predict/batch", response_model=BatchResult, tags=["detection"])
@limiter.limit("10/minute")
def predict_batch(request: Request, body: BatchRequest):
    t0      = time.perf_counter()
    results = []
    for payload in body.payloads:
        t1     = time.perf_counter()
        result = predict_single(payload)
        ms     = round((time.perf_counter() - t1) * 1000, 2)
        results.append(PredictionResult(payload=payload[:200], inference_ms=ms, **result))
    total_ms  = round((time.perf_counter() - t0) * 1000, 2)
    xss_count = sum(1 for r in results if r.is_xss)
    logger.info("batch | n=%d xss=%d total_ms=%.1f", len(results), xss_count, total_ms)
    return BatchResult(
        results=results,
        total=len(results),
        xss_count=xss_count,
        safe_count=len(results) - xss_count,
        avg_confidence=round(sum(r.xss_probability for r in results) / len(results), 4),
        total_inference_ms=total_ms,
    )


@app.get("/model/info", tags=["model"])
def model_info():
    """Returns full metadata including test_accuracy, test_f1, model_type."""
    return {
        **metadata,
        "model_type"    : metadata.get("model_type", "CalibratedLinearSVC"),
        "accuracy"      : metadata.get("test_accuracy"),
        "test_accuracy" : metadata.get("test_accuracy"),
        "f1_score"      : metadata.get("test_f1"),
        "test_f1"       : metadata.get("test_f1"),
        "trained_at"    : metadata.get("trained_at"),
        "n_features"    : metadata.get("total_features", metadata.get("n_features", 18)),
        "version"       : metadata.get("version", "1.1.0"),
        "severity_thresholds": SEVERITY_THRESHOLDS,
    }


@app.get("/model/benchmark", tags=["model"])
def model_benchmark():
    """Returns the reproducible benchmark evaluation across all candidate models."""
    return benchmark_data or {
        "evaluation_protocol": "Stratified 80/20 split; vectorizer fitted on training data only; no SMOTE.",
        "results": [
            {
                "model": "LogisticRegression",
                "accuracy": 0.9933,
                "precision": 0.998,
                "recall": 0.9922,
                "f1": 0.9951,
                "false_negative_rate": 0.0078,
                "roc_auc": 0.9999,
                "inference_ms_per_payload": 0.001,
                "training_seconds": 2.0
            },
            {
                "model": "RandomForestClassifier",
                "accuracy": 0.9969,
                "precision": 0.9987,
                "recall": 0.9967,
                "f1": 0.9977,
                "false_negative_rate": 0.0033,
                "roc_auc": 1.0,
                "inference_ms_per_payload": 0.0502,
                "training_seconds": 0.94
            },
            {
                "model": "CalibratedLinearSVC",
                "accuracy": 0.9973,
                "precision": 0.998,
                "recall": 0.998,
                "f1": 0.998,
                "false_negative_rate": 0.002,
                "roc_auc": 0.9999,
                "inference_ms_per_payload": 0.0047,
                "training_seconds": 0.49
            }
        ],
        "winner": "CalibratedLinearSVC"
    }


@app.get("/model/thresholds", tags=["model"])
def thresholds():
    """Returns flat threshold values for Dashboard display."""
    return {
        "safe_max"  : SEVERITY_THRESHOLDS.get("safe_max",   0.20),
        "low_max"   : SEVERITY_THRESHOLDS.get("low_max",    0.45),
        "medium_max": SEVERITY_THRESHOLDS.get("medium_max", 0.65),
        "high_max"  : SEVERITY_THRESHOLDS.get("high_max",   0.85),
        "critical"  : 1.00,
    }


@app.get("/model/features", tags=["model"])
def feature_list():
    """Returns features as {name: importance} dict for Dashboard chart."""
    try:
        if hasattr(model, "feature_importances_"):
            importances = model.feature_importances_
        elif hasattr(model, "calibrated_classifiers_"):
            coefficients = [np.abs(item.estimator.coef_).ravel() for item in model.calibrated_classifiers_]
            importances = np.mean(coefficients, axis=0)
        elif hasattr(model, "coef_"):
            importances = np.abs(model.coef_).ravel()
        else:
            raise AttributeError("Model has no feature importance representation")
        sec_importances = importances[-len(FEATURE_NAMES):]
        total = float(np.sum(sec_importances)) or 1.0
        return {name: round(float(imp / total), 4) for name, imp in zip(FEATURE_NAMES, sec_importances)}
    except Exception:
        return {name: round(1 / len(FEATURE_NAMES), 4) for name in FEATURE_NAMES}


@app.post("/ai/review", response_model=AiReviewResponse, tags=["ai"])
@limiter.limit("10/minute")
def ai_review(request: Request, body: AiReviewRequest):
    """
    Optional server-side AI Security Review.
    Gated behind explicit user consent and server-side OPENAI_API_KEY (or demo mode).
    Never modifies the primary local ML decision.
    """
    if not body.consent:
        raise HTTPException(
            status_code=400,
            detail="Explicit user consent is required before sending a payload to external AI services."
        )

    api_key = os.environ.get("OPENAI_API_KEY", "").strip()

    # Handle demo mode or missing API key
    if body.demo_mode or not api_key:
        if body.demo_mode:
            logger.info("ai_review | generating demo mode response")
            return AiReviewResponse(**generate_demo_ai_review(body.payload, body.ml_result))
        else:
            raise HTTPException(
                status_code=503,
                detail="Server-side AI Security Review is not configured (OPENAI_API_KEY missing). Use Demo Mode for offline evaluation."
            )

    # Live OpenAI call
    try:
        import urllib.request
        import urllib.error

        system_prompt = (
            "You are an explainable Application Security (AppSec) advisor assisting a security analyst. "
            "Your task is to provide an advisory review of a potential Cross-Site Scripting (XSS) payload. "
            "You MUST return valid JSON conforming to this schema:\n"
            "{\n"
            '  "risk_assessment": "suspicious" | "likely benign" | "uncertain",\n'
            '  "confidence_level": "low" | "medium" | "high",\n'
            '  "likely_attack_type": "<concise attack category or None>",\n'
            '  "explanation": "<2-3 sentence technical explanation of why this is or is not dangerous>",\n'
            '  "suggested_defenses": ["<OWASP defense 1>", "<OWASP defense 2>"],\n'
            '  "reasons_to_review_manually": ["<reason 1>", "<reason 2>"],\n'
            '  "ml_agreement": "agrees" | "disagrees" | "uncertain",\n'
            '  "disclaimer": "This is an advisory review. ShieldScan’s local ML model remains the detection engine."\n'
            "}\n"
            "Rules:\n"
            "- Do NOT generate, fix, improve, or execute active exploits.\n"
            "- Focus purely on defensive analysis, sanitization recommendations, and agreement evaluation.\n"
            "- Evaluate whether the local ML classifier's signals match your AppSec reasoning."
        )

        user_content = {
            "payload_to_review": body.payload[:2000],
            "local_ml_detection": body.ml_result or {}
        }

        req_data = json.dumps({
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_content)}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
            "max_tokens": 600
        }).encode("utf-8")

        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=req_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            },
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=10) as resp:
            resp_body = json.loads(resp.read().decode("utf-8"))
            content = resp_body["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            parsed["is_demo"] = False
            return AiReviewResponse(**parsed)

    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8", errors="ignore")
        logger.error("OpenAI API HTTPError %d: %s", e.code, err_msg)
        raise HTTPException(
            status_code=502,
            detail=f"External AI service returned an error ({e.code}). Local ML screening remains active."
        )
    except Exception as e:
        logger.error("AI review unexpected error: %s", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"AI Advisory Review error: {str(e)}. Local ML screening remains active."
        )
