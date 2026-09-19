<div align="center">

# 🛡️ ShieldScan — Explainable ML XSS Detection System

[![Live Web Application](https://img.shields.io/badge/Live%20App-shield--scan--five.vercel.app-10b981?style=for-the-badge&logo=vercel&logoColor=white)](https://shield-scan-five.vercel.app)
[![Live FastAPI Backend](https://img.shields.io/badge/Live%20API-shieldscan--api--gtvx.onrender.com-46E3B7?style=for-the-badge&logo=fastapi&logoColor=black)](https://shieldscan-api-gtvx.onrender.com/docs)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

<p align="center">
  <b>Sub-Millisecond Machine Learning Screening Engine & Explainable AppSec Security Intelligence</b><br/>
  <i>Combines 3,000 Character TF-IDF N-Grams + 18 Security Indicators with OWASP Defense Mapping & Offline AI Advisory</i>
</p>

<p align="center">
  🌐 <b>Official Live Website:</b> <a href="https://shield-scan-five.vercel.app" target="_blank"><b>https://shield-scan-five.vercel.app</b></a><br/>
  ⚡ <b>Backend Inference API:</b> <a href="https://shieldscan-api-gtvx.onrender.com" target="_blank"><b>https://shieldscan-api-gtvx.onrender.com</b></a>
</p>

---

</div>

## 📌 Executive Summary

**ShieldScan** is an enterprise-grade, explainable machine-learning Cross-Site Scripting (XSS) detection system built with **FastAPI** and **React (Vite + TailwindCSS)**. 

Traditional WAFs rely on brittle regular expressions that are vulnerable to evasion techniques (e.g., character encoding, case mutation, nested tags) and regular expression denial-of-service (ReDoS). ShieldScan solves this by using a **Calibrated Linear SVM (`CalibratedClassifierCV` over `LinearSVC`)** trained on **3,000 character-level TF-IDF n-grams** (2–5 character windows) combined with **18 handcrafted cybersecurity indicators**.

The system delivers **sub-millisecond inference (~0.005 ms/payload)**, a **99.80% F1-score**, and a **0.20% False-Negative Rate (FNR)**—ensuring dangerous payloads are caught before reaching downstream web applications.

---

## 🔗 Live Deployments

* 🌐 **Live Web Interface (Vercel):** [https://shield-scan-five.vercel.app](https://shield-scan-five.vercel.app)
* ⚡ **Live API Service (Render):** [https://shieldscan-api-gtvx.onrender.com](https://shieldscan-api-gtvx.onrender.com)
* 📚 **Interactive OpenAPI (Swagger) Docs:** [https://shieldscan-api-gtvx.onrender.com/docs](https://shieldscan-api-gtvx.onrender.com/docs)

---

## 🌟 System Architecture & Workflow

```
 ┌──────────────────────────────────────────────────────────────────────────────────────────┐
 │                                 ShieldScan Web Interface                                 │
 │              (Scanner · Dashboard · Flashcards Hub · History · Docs)                    │
 └────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              │ HTTP REST JSON API
                                              ▼
 ┌──────────────────────────────────────────────────────────────────────────────────────────┐
 │                               FastAPI Security Service                                   │
 │                                                                                          │
 │  ┌─────────────────────────┐   ┌───────────────────────────┐   ┌──────────────────────┐  │
 │  │ 18 Security Indicators  │ + │  3,000 TF-IDF N-Grams     │ ──▶│  hstack Sparse Matrix│  │
 │  └─────────────────────────┘   └───────────────────────────┘   └──────────┬───────────┘  │
 │                                                                           │              │
 │                                                                           ▼              │
 │                                                           ┌───────────────────────────┐  │
 │                                                           │   Calibrated Linear SVM   │  │
 │                                                           │  (99.8% F1 · 0.20% FNR)   │  │
 │                                                           └──────────────┬────────────┘  │
 │                                                                          │               │
 │ ┌───────────────────────────┐  ┌──────────────────────────┐             ▼               │
 │ │ Safe Multi-Layer Decoder  │  │   OWASP Defense Map      │ ◀── Calibrated Severity  │
 │ └───────────────────────────┘  └──────────────────────────┘      & Attack Category       │
 └────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              │ Optional Consent-Gated
                                              ▼
                               ┌─────────────────────────────┐
                               │  Server-Side AI Advisory    │
                               │  (Live GPT-4o / Demo Mode)  │
                               └─────────────────────────────┘
```

### 🧠 1. Local ML Detection Engine (Primary & Authoritative)
* **Model:** Calibrated Linear SVM (`CalibratedClassifierCV` wrapping `LinearSVC`).
* **Feature Engineering:** 3,000 character TF-IDF n-grams (2–5 grams) + 18 explicit regex security features.
* **Ultra-Fast Performance:** ~0.005 ms per payload (capable of screening 200,000 payloads/second).
* **Outputs:** Calibrated probability (0.00 to 1.00), Risk Severity (`SAFE`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), attack classification, and triggered signal indicators.

### 🔍 2. Safe Payload Decoder & Obfuscation Analysis
* **Multi-Layer Decoding:** Safely unrolls URL encoding (`%3Cscript%3E`), HTML entity encoding (`&#x3C;`), and Unicode escapes (`\u003cscript\u003e`) in memory without DOM evaluation.
* **Primitive Extraction:** Exposes obfuscated payload contents while protecting security analysts from executing malicious vectors in their browser.

### 🛡️ 3. OWASP Defense Mapping & Remediation
* Automatically maps detected attack categories to contextual OWASP defenses:
  * **Script Injection:** Contextual output encoding & dangerous DOM sink replacement (`textContent` over `innerHTML`).
  * **Event-Handler Injection:** Attribute encoding, programmatic event binding, and DOMPurify attribute allowlisting.
  * **Protocol Injection:** URL scheme allowlists (`https:`, `mailto:`) rejecting dangerous schemes (`javascript:`, `data:`, `vbscript:`).
  * **Encoded / Obfuscated Payloads:** Single-pass canonicalization and HTML sanitization pipelines.
  * **Markup Injection:** Strict element allowlisting and Content Security Policy (`frame-ancestors 'none'`).

### 🤖 4. Server-Side AI Security Review (Advisory Layer)
* Gated behind **explicit user consent** (`consent: true`) and server-side `OPENAI_API_KEY`.
* **Zero Frontend Exposure:** API keys are strictly retained on the backend server.
* **ML vs. AI Comparison:** Highlights agreement/disagreement between statistical ML classification and AI advisory reasoning.
* **Offline Demo Mode:** Built-in deterministic offline mock advisory mode for demonstrations without external network calls or paid API usage.

---

## 📊 Model Benchmark & Selection Rationale

In security screening, the **False-Negative Rate (FNR / missed attacks)** is the critical metric. A missed XSS payload leads to DOM compromise, session hijacking, or data exfiltration.

All candidate models were evaluated on a 80/20 stratified test split:

| Candidate Model | Test Accuracy | F1 Score | Test Recall | False-Negative Rate (FNR) | ROC-AUC | Inference Latency | Selection Rationale |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Logistic Regression** | 99.33% | 99.51% | 99.22% | 0.78% | 0.9999 | 0.001 ms | Fast baseline, but higher false-negative rate |
| **Random Forest** | 99.69% | 99.77% | 99.67% | 0.33% | 1.0000 | 0.050 ms | High ensemble accuracy; 10× higher inference latency |
| **Calibrated Linear SVM (Deployed)** | **99.73%** | **99.80%** | **99.80%** | **0.20%** | **0.9999** | **0.005 ms** | **Lowest FNR (-39% vs RF), highest F1/Recall, low latency & calibrated probabilities** |

> **Key takeaway:** Calibrated Linear SVM achieved the lowest False-Negative Rate (0.20%), cutting missed attacks by **39%** compared to Random Forest while running **10× faster**.

---

## 💻 Tech Stack & Justification

| Layer | Component | Technology | Rationale |
| :--- | :--- | :--- | :--- |
| **Frontend** | Framework | **React 18 + Vite** | Fast SPA rendering, component reusability, instant HMR. |
| | Styling | **TailwindCSS + CSS Variables** | Modern glassmorphism design system with dark/light mode toggle. |
| | Icons & Charts | **Lucide Icons & Recharts** | High-performance SVG icons and interactive data visualizations. |
| **Backend** | Framework | **FastAPI (Python 3.12)** | Asynchronous execution, native Pydantic validation, interactive OpenAPI docs. |
| | ML Pipeline | **scikit-learn + joblib** | Calibrated classifier pipeline combined with TF-IDF vectorizer. |
| | Rate Limiting | **slowapi** | Protects API endpoints against denial-of-service abuse. |
| **Deployment**| Frontend | **Vercel** | Edge deployment with automatic static distribution and SPA rewriting. |
| | Backend | **Render / Docker** | Containerized Python microservice with health checks and CORS security. |

---

## 🚀 Quick Start Guide (Local Setup)

### Prerequisites
* **Python 3.10+**
* **Node.js 18+ & npm**

### 1. Backend Installation & Server Launch

```powershell
# Clone the repository
git clone https://github.com/Harshit-Kumar-1710/ShieldScan.git
cd ShieldScan

# Create & activate virtual environment (Windows PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install backend dependencies
pip install -r backend/requirements.txt

# Run FastAPI backend
python -m uvicorn main:app --app-dir backend --reload --port 8000
```
> The API will start at `http://localhost:8000` with interactive Swagger docs at `http://localhost:8000/docs`.

### 2. Frontend Installation & Client Launch

In a new terminal tab:

```powershell
cd ShieldScan/frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
> Open `http://localhost:5173` in your browser.

### 3. Running Backend Verification Tests

```powershell
python backend/test_api.py
```
> Executes all **59 unit and API integration tests** covering single scans, batch predictions, rate limiting, and demo mode.

---

## 🐋 Docker & Multi-Container Deployment

ShieldScan provides full **Docker** and **Docker Compose** support for one-command local execution or production container hosting.

```powershell
# Build and run both API and Frontend containers
docker-compose up --build -d
```
* **Frontend:** Available at `http://localhost:5173`
* **Backend API:** Available at `http://localhost:8000`

---

## 📡 API Reference Endpoint Summary

| Endpoint | Method | Description | Example Input |
| :--- | :---: | :--- | :--- |
| `GET /` | `GET` | Service status, model info, and accuracy. | N/A |
| `GET /health` | `GET` | System health check and uptime. | N/A |
| `POST /predict` | `POST` | Single payload security scan. | `{"payload": "<script>alert(1)</script>"}` |
| `POST /predict/batch` | `POST` | Batch payload scan (up to 100 items). | `{"payloads": ["test1", "<img src=x onerror=alert(1)>"]}` |
| `GET /model/info` | `GET` | Full ML model metadata and accuracy metrics. | N/A |
| `GET /model/benchmark` | `GET` | Model comparison table data. | N/A |
| `GET /model/features` | `GET` | List of all 18 handcrafted security indicators. | N/A |
| `POST /ai/review` | `POST` | Optional advisory AI review (requires consent). | `{"payload": "...", "consent": true, "demo_mode": true}` |

---

## 🎯 Interview Q&A Defense Guide

**Q1: Why use Machine Learning for XSS detection instead of traditional Regex or WAF rules?**
> *"Pure regex rules suffer from regular expression denial of service (ReDoS), high maintenance overhead, and brittle evasion via character encoding and case mutations. By training a Calibrated Linear SVM on 2–5 character n-grams and 18 security features, ShieldScan learns contextual character distributions and structural markers simultaneously, maintaining 99.80% recall with ~0.005 ms inference latency."*

**Q2: Why did you choose Calibrated Linear SVM over Random Forest?**
> *"Random Forest achieved 99.77% F1, but in security screening, false negatives are critical. Calibrated Linear SVM achieved a 0.20% false-negative rate (a 39% reduction compared to Random Forest's 0.33%), while running over 10× faster. Probability calibration allows us to assign reliable confidence scores and severity tiers."*

**Q3: How is privacy preserved when using AI review?**
> *"ShieldScan’s primary ML detection engine is 100% local. The AI review is strictly optional, gated behind an explicit consent checkbox, and executed server-side so API keys are never exposed in the browser. Furthermore, an offline Demo Mode allows full verification without sending any payload data across the network."*

**Q4: Can this model replace standard output encoding and sanitization?**
> *"No. ML is a fast screening and triage layer (defense-in-depth). Complete protection requires contextual output encoding, strict DOMPurify sanitization, and Content Security Policy (CSP) at the presentation layer. ShieldScan guides developers directly to those controls via its OWASP Defense Map."*

---

## 📄 License & Author

Developed by **Harshit Kumar** as an open-source AppSec & Machine Learning project.

* **GitHub:** [@Harshit-Kumar-1710](https://github.com/Harshit-Kumar-1710)
* **Live Web App:** [https://shield-scan-five.vercel.app](https://shield-scan-five.vercel.app)
* **Live Backend API:** [https://shieldscan-api-gtvx.onrender.com](https://shieldscan-api-gtvx.onrender.com)
* **License:** [MIT License](LICENSE)
