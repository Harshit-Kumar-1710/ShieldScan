# ShieldScan — XSS Attack Detection System

ML-powered Cross-Site Scripting (XSS) detection system using Random Forest + TF-IDF, achieving 99.7% accuracy.

## Tech Stack
- **ML Model:** Random Forest, TF-IDF, Scikit-learn
- **Backend:** Python, FastAPI
- **Frontend:** React, Vite, Tailwind CSS

## Features
- Real-time XSS payload detection
- 99.7% accuracy, 99.8% F1 score
- 18 custom security features
- Severity scoring (Safe/Low/Medium/High/Critical)
- Batch scanning support
- Scan history with CSV export
- Dark/Light theme

## Run Locally

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

## Model Performance
| Metric | Score |
|--------|-------|
| Accuracy | 99.7% |
| F1 Score | 99.8% |
| AUC-ROC | 99.99% |
