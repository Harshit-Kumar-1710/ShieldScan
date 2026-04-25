"""
XSS Attack Detection API — FastAPI Backend
Author: Harshit Kumar
"""

import os, re, json, time, logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime

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
# ─────────────────────────────────────────────
logger.info("Loading model artifacts…")

if not MODEL_PATH.exists() or not VEC_PATH.exists():
    raise FileNotFoundError(f"Model artifacts not found in {ARTIFACTS_DIR}.")

model      = joblib.load(MODEL_PATH)
vectorizer = joblib.load(VEC_PATH)
metadata   = json.loads(META_PATH.read_text()) if META_PATH.exists() else {}

SEVERITY_THRESHOLDS: dict = metadata.get("severity_thresholds", {
    "safe_max": 0.20, "low_max": 0.45, "medium_max": 0.65, "high_max": 0.85,
})

FEATURE_NAMES = [
    "has_script_tag", "has_javascript_protocol", "has_event_handler",
    "has_alert", "has_eval", "has_document_access", "has_window_access",
    "has_remote_src", "has_url_encoding", "has_html_entity",
    "has_unicode_escape", "has_base64", "has_fromcharcode",
    "has_iframe", "has_img_src", "has_data_uri", "has_vbscript",
    "tag_density_ratio",
]

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


def predict_single(text: str) -> dict:
    tfidf_feat = vectorizer.transform([text])
    sec_feat   = csr_matrix(np.array([extract_security_features(text)]))
    combined   = hstack([tfidf_feat, sec_feat])
    prob       = float(model.predict_proba(combined)[0][1])
    pred       = int(model.predict(combined)[0])
    severity   = get_severity(prob)
    sec_vals   = extract_security_features(text)
    triggered  = [FEATURE_NAMES[i] for i, v in enumerate(sec_vals[:-1]) if v == 1]
    return {
        "is_xss"            : pred == 1,
        "xss_probability"   : round(prob, 4),
        "severity"          : severity,
        "triggered_features": triggered,
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
    description = "ML-powered XSS detection — Random Forest + TF-IDF",
    version     = "1.0.0",
    docs_url    = "/docs",
    redoc_url   = "/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET", "POST"], allow_headers=["*"])

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
    inference_ms      : float


class BatchResult(BaseModel):
    results            : List[PredictionResult]
    total              : int
    xss_count          : int
    total_inference_ms : float

# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────
@app.get("/", tags=["health"])
def root():
    return {
        "service"   : "XSS Detection API",
        "status"    : "running",
        "model"     : metadata.get("model_type", "RandomForestClassifier"),
        "accuracy"  : metadata.get("test_accuracy"),
        "docs"      : "/docs",
    }


@app.get("/health", tags=["health"])
def health():
    """✅ Returns model_loaded, uptime, version for Dashboard."""
    return {
        "status"        : "ok",
        "model_loaded"  : True,
        "uptime_seconds": round(time.time() - START_TIME, 1),
        "version"       : metadata.get("version", "1.0.0"),
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
    return BatchResult(results=results, total=len(results), xss_count=xss_count, total_inference_ms=total_ms)


@app.get("/model/info", tags=["model"])
def model_info():
    """✅ Returns full metadata including test_accuracy, test_f1, model_type."""
    return {
        **metadata,
        # Ensure these keys always exist for Dashboard
        "model_type"    : metadata.get("model_type", "RandomForestClassifier"),
        "accuracy"      : metadata.get("test_accuracy"),
        "test_accuracy" : metadata.get("test_accuracy"),
        "f1_score"      : metadata.get("test_f1"),
        "test_f1"       : metadata.get("test_f1"),
        "trained_at"    : metadata.get("trained_at"),
        "n_features"    : metadata.get("n_features", 18),
        "version"       : metadata.get("version", "1.0.0"),
    }


@app.get("/model/thresholds", tags=["model"])
def thresholds():
    """✅ Returns flat threshold values for Dashboard display."""
    return {
        "safe_max"  : SEVERITY_THRESHOLDS.get("safe_max",   0.20),
        "low_max"   : SEVERITY_THRESHOLDS.get("low_max",    0.45),
        "medium_max": SEVERITY_THRESHOLDS.get("medium_max", 0.65),
        "high_max"  : SEVERITY_THRESHOLDS.get("high_max",   0.85),
        "critical"  : 1.00,
    }


@app.get("/model/features", tags=["model"])
def feature_list():
    """✅ Returns features as {name: importance} dict for Dashboard chart."""
    # Try to get importances from model
    try:
        importances = model.feature_importances_
        # Last 18 are our security features
        sec_importances = importances[-len(FEATURE_NAMES):]
        return {name: round(float(imp), 4) for name, imp in zip(FEATURE_NAMES, sec_importances)}
    except Exception:
        # Fallback: equal weights
        return {name: round(1 / len(FEATURE_NAMES), 4) for name in FEATURE_NAMES}
