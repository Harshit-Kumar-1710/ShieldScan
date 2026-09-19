"""
Comprehensive test suite for ShieldScan XSS Detection API.
Uses FastAPI TestClient to verify all ML and AI review endpoints self-contained.

Usage:
    python backend/test_api.py
"""

import sys
import os
from pathlib import Path

# Add backend directory to sys.path so we can import main
BASE_DIR = Path(__file__).parent
sys.path.insert(0, str(BASE_DIR))

# Ensure UTF-8 output on Windows consoles
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

PASS = "[PASS]"
FAIL = "[FAIL]"

failed_count = 0
total_count = 0

def check(label, condition, detail=""):
    global failed_count, total_count
    total_count += 1
    if not condition:
        failed_count += 1
    icon = PASS if condition else FAIL
    print(f"  {icon}  {label}", f"({detail})" if detail else "")
    return condition


print("=" * 60)
print("ShieldScan ML & AI Security Test Suite")
print("=" * 60)

print("\n-- 1. Root & Health Endpoints --------------------------")
r = client.get("/")
check("GET / returns 200", r.status_code == 200)
check("Uses CalibratedLinearSVC model", r.json().get("model") == "CalibratedLinearSVC", r.json().get("model"))
check("Exposes accuracy metric", "accuracy" in r.json())

r = client.get("/health")
check("GET /health returns 200", r.status_code == 200)
check("Status is 'ok'", r.json().get("status") == "ok")
check("Model is marked loaded", r.json().get("model_loaded") is True)

print("\n-- 2. Local ML Single Predictions (No AI Key Required) -")
# Benign payload
r = client.post("/predict", json={"payload": "Hello, this is a normal sentence."})
d = r.json()
check("Benign input returns 200", r.status_code == 200)
check("Benign classified as not XSS", d["is_xss"] is False)
check("Benign severity is SAFE", d["severity"] == "SAFE", d["severity"])
check("Probability is low (< 0.20)", d["xss_probability"] < 0.20, str(d["xss_probability"]))
check("Attack type indicates no XSS", "No XSS" in d["attack_type"])

# Obvious script injection
r = client.post("/predict", json={"payload": "<script>alert('XSS')</script>"})
d = r.json()
check("Script tag returns 200", r.status_code == 200)
check("Classified as XSS", d["is_xss"] is True)
check("Severity is not SAFE", d["severity"] != "SAFE", d["severity"])
check("Triggered 'has_script_tag'", "has_script_tag" in d["triggered_features"])
check("Triggered 'has_alert'", "has_alert" in d["triggered_features"])
check("Attack type is Script injection", d["attack_type"] == "Script injection", d["attack_type"])
check("Remediation list provided", len(d["recommendations"]) > 0)

# Event handler injection
r = client.post("/predict", json={"payload": "<img src=x onerror=alert(document.cookie)>"})
d = r.json()
check("Event handler returns 200", r.status_code == 200)
check("Event handler classified as XSS", d["is_xss"] is True)
check("Triggered 'has_event_handler'", "has_event_handler" in d["triggered_features"])
check("Attack type is Event-handler injection", d["attack_type"] == "Event-handler injection")

# Protocol injection
r = client.post("/predict", json={"payload": "javascript:alert(1)"})
d = r.json()
check("javascript: URI classified as XSS", d["is_xss"] is True)
check("Attack type is Protocol injection", d["attack_type"] == "Protocol injection")

# Encoded payload
r = client.post("/predict", json={"payload": "%3Cscript%3Ealert%281%29%3C%2Fscript%3E"})
d = r.json()
check("URL encoded payload classified as XSS", d["is_xss"] is True)
check("Triggered 'has_url_encoding'", "has_url_encoding" in d["triggered_features"])

print("\n-- 3. Batch Predictions --------------------------------")
batch_payloads = [
    "Normal benign text here",
    "<script>alert(1)</script>",
    "SELECT * FROM users WHERE id = 1",
    "<svg onload=alert(1)>",
    "https://example.com/search?q=test",
]
r = client.post("/predict/batch", json={"payloads": batch_payloads})
d = r.json()
check("Batch predict returns 200", r.status_code == 200)
check("Returns 5 results", d["total"] == 5)
check("Accurately identifies XSS count", d["xss_count"] == 2, str(d["xss_count"]))
check("Calculates safe count", d["safe_count"] == 3)
check("Calculates average confidence", 0 <= d["avg_confidence"] <= 1)
check("Reports total inference latency", d["total_inference_ms"] > 0)

print("\n-- 4. Model Metadata, Features & Benchmark -------------")
r = client.get("/model/info")
check("GET /model/info returns 200", r.status_code == 200)
check("Includes severity_thresholds", "severity_thresholds" in r.json())
check("Includes test_f1", "test_f1" in r.json())

r = client.get("/model/thresholds")
d = r.json()
check("GET /model/thresholds returns 200", r.status_code == 200)
check("Has 5 threshold keys", len(d) == 5)

r = client.get("/model/features")
d = r.json()
check("GET /model/features returns 200", r.status_code == 200)
check("Returns 18 handcrafted features", len(d) == 18)

r = client.get("/model/benchmark")
d = r.json()
check("GET /model/benchmark returns 200", r.status_code == 200)
check("Contains benchmark results", "results" in d and len(d["results"]) == 3)
check("Winner is CalibratedLinearSVC", d.get("winner") == "CalibratedLinearSVC")

print("\n-- 5. AI Security Review Privacy & Consent Gating ------")
# 1. Reject without explicit consent
r = client.post("/ai/review", json={"payload": "<script>alert(1)</script>", "consent": False})
check("Rejects request without consent (HTTP 400)", r.status_code == 400)
check("Consent error detail message returned", "consent is required" in r.json().get("detail", "").lower())

# 2. Reject missing API key gracefully when not in demo mode (and key not in env)
if not os.environ.get("OPENAI_API_KEY"):
    r = client.post("/ai/review", json={"payload": "<script>alert(1)</script>", "consent": True, "demo_mode": False})
    check("Missing API key returns 503 / disabled notice", r.status_code == 503)
    check("Explains key missing and points to Demo Mode", "openai_api_key missing" in r.json().get("detail", "").lower())

# 3. Demo Mode functionality
r = client.post("/ai/review", json={
    "payload": "<script>alert(1)</script>",
    "consent": True,
    "demo_mode": True,
    "ml_result": {
        "is_xss": True,
        "xss_probability": 0.98,
        "severity": "CRITICAL",
        "attack_type": "Script injection",
        "triggered_features": ["has_script_tag", "has_alert"]
    }
})
d = r.json()
check("Demo Mode returns 200", r.status_code == 200)
check("Risk assessment is 'suspicious'", d.get("risk_assessment") == "suspicious")
check("Confidence level is 'high'", d.get("confidence_level") == "high")
check("Includes suggested defenses", len(d.get("suggested_defenses", [])) >= 2)
check("Includes triage notes", len(d.get("reasons_to_review_manually", [])) >= 1)
check("ML and AI agree on script tag", d.get("ml_agreement") == "agrees")
check("Includes advisory disclaimer", "advisory review" in d.get("disclaimer", "").lower())
check("Flagged as demo mode", d.get("is_demo") is True)

# Demo Mode with benign input
r = client.post("/ai/review", json={
    "payload": "Hello, this is safe text.",
    "consent": True,
    "demo_mode": True,
    "ml_result": {
        "is_xss": False,
        "xss_probability": 0.02,
        "severity": "SAFE",
        "attack_type": "No XSS pattern detected",
        "triggered_features": []
    }
})
d = r.json()
check("Demo Mode on benign text returns 200", r.status_code == 200)
check("Benign risk assessment is 'likely benign'", d.get("risk_assessment") == "likely benign")
check("ML and AI agree on benign", d.get("ml_agreement") == "agrees")

print("\n-- 6. Validation Error Handling ------------------------")
r = client.post("/predict", json={"payload": ""})
check("Empty payload returns 422", r.status_code == 422)

r = client.post("/predict/batch", json={"payloads": []})
check("Empty batch list returns 422", r.status_code == 422)

print("\n" + "=" * 60)
if failed_count == 0:
    print(f"All {total_count} tests passed successfully!")
else:
    print(f"{failed_count} out of {total_count} tests failed!")
print("=" * 60 + "\n")

sys.exit(failed_count)
