# ShieldScan — The Complete Project Guide & Interview Manual

> **Project Name:** ShieldScan — Explainable ML XSS Detection & Security Analysis System  
> **Author:** Harshit Kumar  
> **Target Audience:** Beginners, Developers, Recruiters, and Technical Interviewers  

---

## 1. Executive Summary (The 30-Second Pitch)

> **"ShieldScan is an explainable machine-learning cybersecurity system that detects Cross-Site Scripting (XSS) attacks in real time. Instead of relying on brittle regex rules or slow third-party AI APIs, ShieldScan uses a local Calibrated Linear SVM model combined with 3,000 character-level n-grams and 18 handcrafted cybersecurity features. It screens payloads in sub-millisecond time (~0.005 ms) with 99.80% recall and a 0.20% false-negative rate, providing human-readable explanations, safe decoding, and OWASP remediation guidelines."**

---

## 2. Motivation & The Real-World Problem

### What is Cross-Site Scripting (XSS)?
Cross-Site Scripting (XSS) is one of the most critical and common web vulnerabilities (consistently ranked in the **OWASP Top 10**). It occurs when an attacker tricks a web application into executing untrusted JavaScript code in a victim's browser.

### The Real-World Impact of an XSS Breach:
- **Session Hijacking / Account Takeover:** Stealing sensitive `document.cookie` session tokens.
- **Credential Harvesting:** Displaying fake login modals to capture passwords.
- **Malicious Redirection:** Redirecting legitimate users to phishing websites.
- **Unauthorized Actions:** Making purchases, transferring funds, or changing account passwords on behalf of the victim.

### Why Traditional Solutions Fail:
1. **Brittle Regex / Static Blocklists:** Attackers evade simple keyword filters using obfuscation (e.g. `<img src=x onerror=alert(1)>`, `%3Cscript%3E`, `javascript:`, or Unicode escapes `\u003cscript\u003e`).
2. **Black-Box AI:** Traditional AI models just return a number or "XSS" without telling developers *why* it was flagged or *how to fix it*.
3. **Cloud AI Privacy Risks:** Sending company web traffic or internal database logs to third-party LLMs (like ChatGPT) violates enterprise data privacy laws (GDPR, HIPAA, SOC-2).

### How ShieldScan Solves This:
- **Fast, Local Screening:** Operates 100% on-device in **~0.005 milliseconds** per payload.
- **Explainability:** Explains the attack category, highlights triggered security rules, and decodes obfuscated text safely in memory.
- **Actionable OWASP Remediation:** Gives developers copyable secure code examples (context-aware encoding, DOMPurify sanitization, and CSP headers).
- **Optional Privacy-First AI Review:** External AI is strictly optional, gated behind explicit user consent, and used only as an advisory second opinion.

---

## 3. Machine Learning Architecture (How It Works Under the Hood)

ShieldScan uses a **two-stage feature extraction pipeline** feeding into a **Calibrated Linear Support Vector Machine (Linear SVM)**.

```
Incoming Untrusted Payload (String)
               │
               ▼
┌────────────────────────────────────────────────────────┐
│ 1. Safe In-Memory Canonicalization & Decoding          │
│    • URL decoding (%XX)                                │
│    • HTML entity decoding (&#xHH;, &amp;)              │
│    • Unicode unescaping (\uXXXX)                       │
│    (Rendered purely in memory without HTML execution)  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 2. Dual Feature Extraction Pipeline (3,018 Features)  │
│    ├── 3,000 Character TF-IDF N-grams (2–5 grams)      │
│    └── 18 Handcrafted Cybersecurity Domain Indicators  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 3. Calibrated Linear SVM Classifier (Platt Scaling)    │
│    • Test Accuracy: 99.73%                             │
│    • Test Recall: 99.80%                               │
│    • False-Negative Rate: 0.20% (Lowest Missed Attacks)│
│    • Inference Latency: ~0.005 ms / payload            │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 4. Explainable Security Triage Output                  │
│    • Calibrated Probability (0.0% – 100.0%)            │
│    • Severity Tier (SAFE, LOW, MEDIUM, HIGH, CRITICAL) │
│    • Attack Category (Script, Event-Handler, Protocol) │
│    • Triggered Features & OWASP Defense Code Snippets  │
└────────────────────────────────────────────────────────┘
```

### The 18 Handcrafted Security Features:
1. `has_script_tag`: Matches `<script` tag openers.
2. `has_javascript_protocol`: Detects `javascript:` inline URI schemes.
3. `has_event_handler`: Matches inline event listeners (`onerror=`, `onload=`, `onclick=`).
4. `has_alert`: Matches `alert()` execution calls.
5. `has_eval`: Identifies dynamic string code execution (`eval()`).
6. `has_document_access`: Catches `document.cookie`, `document.location`.
7. `has_window_access`: Detects `window.location` redirects.
8. `has_remote_src`: Matches external script URLs (`src="http..."`).
9. `has_url_encoding`: Detects `%XX` hex-encoded bypasses.
10. `has_html_entity`: Detects `&#xHH;` character entities.
11. `has_unicode_escape`: Identifies `\uXXXX` hexadecimal escapes.
12. `has_base64`: Catches base64 data encoding markers.
13. `has_fromcharcode`: Catches `String.fromCharCode()` bypasses.
14. `has_iframe`: Matches `<iframe>` framing and clickjacking tags.
15. `has_img_src`: Matches `<img src` paired with error fallbacks.
16. `has_data_uri`: Matches `data:text/html` schemes.
17. `has_vbscript`: Matches legacy ActiveScripting injection.
18. `tag_density_ratio`: Ratio of HTML delimiters (`<...>`) to payload length.

---

## 4. Model Selection & Benchmark (Why Calibrated SVM Won)

In cybersecurity, **Accuracy alone is misleading**. What matters most is the **False-Negative Rate (FNR)** — the percentage of real attacks that slipped past the filter undetected.

All models were evaluated on a held-out 80/20 stratified test dataset of 11,259 real-world and modern XSS payloads:

| Model | Accuracy | F1 Score | Recall | False-Negative Rate (FNR) | Latency | Why it was or wasn't chosen |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Logistic Regression** | 99.33% | 99.51% | 99.22% | 0.78% | 0.001 ms | Baseline model; missed too many real attacks. |
| **Random Forest** | 99.69% | 99.77% | 99.67% | 0.33% | 0.050 ms | Strong ensemble, but 10× slower latency. |
| **Calibrated Linear SVM (Selected)** | **99.73%** | **99.80%** | **99.80%** | **0.20%** | **0.005 ms** | **Lowest missed attacks (-39% vs RF), highest Recall, sub-millisecond speed, and calibrated probabilities.** |

### Key Takeaway for Interviews:
*Why Calibrate the SVM?* Standard Linear SVM only outputs a geometric distance from the decision boundary. By applying **Platt Scaling (`CalibratedClassifierCV`)**, the model outputs true mathematical probabilities from 0.0 to 1.0, enabling clear risk severity tiers (`SAFE`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).

---

## 5. Technology Stack & Why Each Tool Was Chosen

| Technology | Role | Why This Specific Choice? |
| :--- | :--- | :--- |
| **Python & Scikit-learn** | Machine Learning Core | Industry-standard for classical supervised ML. Fast sparse matrix multiplication (`scipy.sparse`) for TF-IDF. |
| **Joblib** | Model Serialization | High-performance serialization for numpy arrays and scikit-learn pipelines with zero disk bloat. |
| **FastAPI** | Backend Microservice | Async, high-throughput Python API with automatic OpenAPI/Swagger documentation, strict Pydantic data validation, and rate limiting. |
| **React 18 & Vite** | Frontend Interface | Instant sub-second HMR builds, modern component architecture, and responsive state management. |
| **Tailwind CSS** | Styling & UI System | Clean utility-first design system with dark/light mode, responsive layouts, and zero CSS runtime overhead. |
| **Lucide Icons** | Visual Indicators | Clean, accessible, and lightweight icon library for color-independent severity indicators. |

---

## 6. The Role of Generative AI (LLM) vs. Local ML

| Aspect | Local Machine Learning (Calibrated SVM) | Generative AI Advisory (LLM / Demo Mode) |
| :--- | :--- | :--- |
| **Role** | **Primary Detection Engine** | **Advisory AppSec Consultant** |
| **Speed** | **~0.005 ms** (Instant) | **1,500 – 3,000 ms** (Slow) |
| **Determinism** | **100% Deterministic** (Same input = exact same score) | **Non-deterministic** (Contextual semantic reasoning) |
| **Data Privacy** | **100% Local & On-Premise** | Gated by user consent & server API key |
| **Output** | Exact probability, severity, & triggered signals | Human-readable explanation, triage notes, & defense review |

---

## 7. The 5 Application Interfaces (Product Walkthrough)

1. **Threat Scanner (`/`):** Interactive workbench with 1-click test payloads, character count, Safe Payload Decoder, OWASP Defense Map, structured JSON download, and ML vs AI comparison.
2. **Security Dashboard (`/dashboard`):** Real-time telemetry, 14-day scan timeline, offline Model Benchmark comparison matrix, feature importance weight bars, and AI review analytics.
3. **AppSec Flashcards (`/learn`):** Interactive 3D flip cards covering XSS taxonomy, OWASP defense mechanisms, and interview defense topics with a study progress tracker.
4. **Audit History (`/history`):** Searchable enterprise scan log, risk filters, analyst feedback tracking (`✓ Correct` / `⚠ Incorrect`), and CSV/JSON export.
5. **Technical Docs (`/docs`):** Deep-dive documentation on all 18 handcrafted features, regex patterns, and pre-execution gateway middleware code.

---

## 8. Top 5 Interview Questions & Winning Answers

### Q1: "Walk me through what ShieldScan does."
> *"ShieldScan is an explainable XSS detection system. It takes untrusted web input, safely canonicalizes it in memory, and extracts 3,000 character TF-IDF n-grams alongside 18 handcrafted security indicators. A Calibrated Linear SVM classifies the payload in 0.005 milliseconds with 99.80% recall. It outputs exact probabilities, severity levels, the specific attack category, and actionable OWASP defensive code snippets."*

### Q2: "Why didn't you just use an LLM or ChatGPT to detect XSS?"
> *"LLMs are great for natural language, but for real-time security screening they have major flaws: they are 1,000× slower (seconds vs. microseconds), non-deterministic, expensive, and present data privacy risks. In ShieldScan, the local Calibrated SVM is the primary detection engine, while the LLM acts purely as an opt-in advisory layer for human-friendly triage."*

### Q3: "Why did you choose Calibrated Linear SVM over Random Forest?"
> *"In cybersecurity, False Negatives (missed attacks) are critical. On our held-out test set, Calibrated Linear SVM achieved a 0.20% False-Negative Rate — a 39% reduction compared to Random Forest (0.33%) — while running 10× faster (~0.005 ms). Calibration via Platt Scaling allows us to output reliable probability percentages for severity tiering."*

### Q4: "How do you handle obfuscated and encoded payloads?"
> *"ShieldScan uses multi-layered defense: first, the feature extractor captures encoding primitives like hex (%XX), HTML entities (&#xHH;), and Unicode escapes (\uXXXX). Second, the Safe Payload Decoder canonicalizes the string in memory without browser execution to expose any hidden attack structures."*

### Q5: "Can this ML model replace standard output encoding and sanitization?"
> *"No. Machine learning is a fast screening and triage layer (defense-in-depth). Complete application security requires contextual output encoding, strict DOMPurify sanitization, and Content Security Policy (CSP) headers at the presentation boundary. ShieldScan guides developers directly to those controls via its OWASP Defense Map."*

---

## 9. How to Run the Project Locally

```powershell
# 1. Activate Python virtual environment & start backend:
cd "R:\Harshit\Coding\Projects\ShieldScan-XSS Detection System"
.\.venv\Scripts\Activate.ps1
python -m uvicorn main:app --app-dir backend --reload

# 2. In a separate terminal, start the frontend:
cd frontend
npm install
npm run dev

# 3. Run automated test suite:
python backend/test_api.py
```

*Interactive API Docs:* `http://localhost:8000/docs`  
*Frontend Dashboard:* `http://localhost:5173`
