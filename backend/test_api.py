"""
Quick integration test — run AFTER starting the API server.

Usage:
    uvicorn main:app &        # start server
    python test_api.py        # run tests
"""

import requests, json

BASE = "http://localhost:8000"
PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"

def check(label, condition, detail=""):
    icon = PASS if condition else FAIL
    print(f"  {icon}  {label}", f"({detail})" if detail else "")
    return condition


print("\n── GET / ──────────────────────────")
r = requests.get(f"{BASE}/")
check("HTTP 200",     r.status_code == 200)
check("Has accuracy", "accuracy" in r.json())

print("\n── GET /health ────────────────────")
r = requests.get(f"{BASE}/health")
check("HTTP 200",  r.status_code == 200)
check("Status ok", r.json()["status"] == "ok")

print("\n── POST /predict — benign ─────────")
r = requests.post(f"{BASE}/predict",
                  json={"payload": "Hello, this is a normal sentence."})
d = r.json()
check("HTTP 200",        r.status_code == 200)
check("Not XSS",         d["is_xss"] is False)
check("Severity SAFE",   d["severity"] == "SAFE",   d["severity"])
check("Prob < 0.20",     d["xss_probability"] < 0.20, str(d["xss_probability"]))

print("\n── POST /predict — script tag ─────")
r = requests.post(f"{BASE}/predict",
                  json={"payload": "<script>alert('XSS')</script>"})
d = r.json()
check("HTTP 200",           r.status_code == 200)
check("Is XSS",             d["is_xss"] is True)
check("Severity not SAFE",  d["severity"] != "SAFE",   d["severity"])
check("Feature triggered",  "has_script_tag" in d["triggered_features"])
check("has_alert triggered","has_alert" in d["triggered_features"])

print("\n── POST /predict — event handler ──")
r = requests.post(f"{BASE}/predict",
                  json={"payload": "<img src=x onerror=alert(document.cookie)>"})
d = r.json()
check("HTTP 200", r.status_code == 200)
check("Is XSS",   d["is_xss"] is True)

print("\n── POST /predict/batch ────────────")
payloads = [
    "Normal text here",
    "<script>alert(1)</script>",
    "SELECT * FROM users",
    "<svg onload=alert(1)>",
    "Hello world",
]
r = requests.post(f"{BASE}/predict/batch", json={"payloads": payloads})
d = r.json()
check("HTTP 200",          r.status_code == 200)
check("5 results",         d["total"] == 5)
check("2 XSS detected",    d["xss_count"] == 2, str(d["xss_count"]))
check("inference_ms",      d["total_inference_ms"] > 0)

print("\n── GET /model/info ────────────────")
r = requests.get(f"{BASE}/model/info")
check("HTTP 200",     r.status_code == 200)
check("Has thresholds","severity_thresholds" in r.json())

print("\n── GET /model/thresholds ──────────")
r = requests.get(f"{BASE}/model/thresholds")
d = r.json()
check("HTTP 200",       r.status_code == 200)
check("5 levels",       len(d["levels"]) == 5)

print("\n── GET /model/features ────────────")
r = requests.get(f"{BASE}/model/features")
d = r.json()
check("HTTP 200",   r.status_code == 200)
check("18 features", d["count"] == 18)

print("\n── Validation errors ──────────────")
r = requests.post(f"{BASE}/predict", json={"payload": ""})
check("Empty payload → 422", r.status_code == 422)

r = requests.post(f"{BASE}/predict/batch", json={"payloads": []})
check("Empty batch → 422",   r.status_code == 422)

print("\n────────────────────────────────────")
print("Done.\n")
