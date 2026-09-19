# XSS Detection API

FastAPI backend for the XSS Attack Detection ML model.

## Quick start

### 1. Place your model artifacts
```
xss_api/
├── main.py
├── requirements.txt
├── test_api.py
├── Dockerfile
└── artifacts/
    ├── xss_model.pkl          ← from xss_model_artifacts.zip
    ├── xss_vectorizer.pkl
    └── model_metadata.json
```

### 2. Install & run
```bash
pip install -r requirements.txt
uvicorn main:app --reload
```
Server starts at http://localhost:8000
Interactive docs at http://localhost:8000/docs

### 3. Run with Docker
```bash
docker build -t xss-api .
docker run -p 8000:8000 -v $(pwd)/artifacts:/app/artifacts xss-api
```

---

## API Reference

### `POST /predict`
Analyse one payload.
```json
// Request
{ "payload": "<script>alert('XSS')</script>" }

// Response
{
  "payload": "<script>alert('XSS')</script>",
  "is_xss": true,
  "xss_probability": 0.9823,
  "severity": "CRITICAL",
  "triggered_features": ["has_script_tag", "has_alert"],
  "inference_ms": 12.4
}
```

### `POST /predict/batch`
Analyse up to 100 payloads at once.
```json
// Request
{ "payloads": ["<script>alert(1)</script>", "Hello world"] }

// Response
{
  "results": [...],
  "total": 2,
  "xss_count": 1,
  "total_inference_ms": 18.7
}
```

### `GET /model/info`
Full model metadata (accuracy, F1, AUC, thresholds, data sources).

### `GET /model/thresholds`
Severity level ranges.

### `GET /model/features`
All 18 handcrafted security features.

---

## Severity levels

| Level    | Meaning                              |
|----------|--------------------------------------|
| SAFE     | No XSS indicators detected           |
| LOW      | Weak signal, likely benign           |
| MEDIUM   | Moderate risk, review recommended    |
| HIGH     | Strong XSS indicators                |
| CRITICAL | Near-certain XSS payload             |

---

## Rate limits

| Endpoint        | Limit       |
|----------------|-------------|
| POST /predict   | 60/minute   |
| POST /predict/batch | 10/minute |

---

## Integration example (Python)
```python
import requests

API = "http://localhost:8000"

# Single check
resp = requests.post(f"{API}/predict",
    json={"payload": user_input})
result = resp.json()

if result["is_xss"]:
    print(f"XSS detected! Severity: {result['severity']}")
    print(f"Triggered rules: {result['triggered_features']}")
```

## Integration example (JavaScript / fetch)
```javascript
const response = await fetch('http://localhost:8000/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ payload: userInput })
});
const { is_xss, severity, xss_probability } = await response.json();
```
