"""Reproducibly benchmark ShieldScan's text classifiers and deploy the winner.

Run from the project root after placing both CSV files in data/:
    .\\.venv\\Scripts\\python backend\\train_and_benchmark.py
"""

from __future__ import annotations

import json
import re
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix, hstack
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.svm import LinearSVC


ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
ARTIFACT_DIRS = [ROOT / "artifacts", ROOT / "backend" / "artifacts"]
RANDOM_STATE = 42
FEATURE_NAMES = [
    "has_script_tag", "has_javascript_protocol", "has_event_handler", "has_alert",
    "has_eval", "has_document_access", "has_window_access", "has_remote_src",
    "has_url_encoding", "has_html_entity", "has_unicode_escape", "has_base64",
    "has_fromcharcode", "has_iframe", "has_img_src", "has_data_uri", "has_vbscript",
    "tag_density_ratio",
]


def security_features(texts: pd.Series) -> csr_matrix:
    rows = []
    for text in texts:
        value = str(text).lower()
        rows.append([
            int(bool(re.search(r"<script", value))), int(bool(re.search(r"javascript:", value))),
            int(bool(re.search(r"on\w+=", value))), int(bool(re.search(r"alert\s*\(", value))),
            int(bool(re.search(r"eval\s*\(", value))), int(bool(re.search(r"document\s*\.", value))),
            int(bool(re.search(r"window\s*\.", value))), int(bool(re.search(r"src\s*=\s*['\"]?\s*http", value))),
            int(bool(re.search(r"%[0-9a-f]{2}", value))), int(bool(re.search(r"&#x?[0-9a-f]+;", value))),
            int(bool(re.search(r"\\u[0-9a-f]{4}", value))), int(bool(re.search(r"base64", value))),
            int(bool(re.search(r"fromcharcode", value))), int(bool(re.search(r"<iframe", value))),
            int(bool(re.search(r"<img[^>]+src", value))), int(bool(re.search(r"data:", value))),
            int(bool(re.search(r"vbscript:", value))), len(re.findall(r"<[^>]+>", value)) / max(len(value), 1),
        ])
    return csr_matrix(np.asarray(rows, dtype=np.float64))


def load_dataset() -> pd.DataFrame:
    expected = [DATA_DIR / "XSS_dataset.csv", DATA_DIR / "modern_xss_dataset_2022_2025.csv"]
    missing = [str(path) for path in expected if not path.exists()]
    if missing:
        raise FileNotFoundError(f"Missing training data: {', '.join(missing)}")
    frames = []
    for path in expected:
        frame = pd.read_csv(path, usecols=["Sentence", "Label"])
        frame.columns = ["text", "label"]
        frames.append(frame)
    data = pd.concat(frames, ignore_index=True).dropna().copy()
    data["text"] = data["text"].astype(str).str.strip()
    data = data[data["text"].str.len() > 0]
    data["label"] = data["label"].astype(int)
    data = data[data["label"].isin([0, 1])].drop_duplicates(subset=["text"])
    return data.reset_index(drop=True)


def metric_row(name: str, model, x_train, y_train, x_test, y_test) -> tuple[dict, object]:
    started = time.perf_counter()
    model.fit(x_train, y_train)
    train_seconds = time.perf_counter() - started
    started = time.perf_counter()
    predicted = model.predict(x_test)
    probabilities = model.predict_proba(x_test)[:, 1]
    inference_ms = (time.perf_counter() - started) * 1000 / len(y_test)
    recall = recall_score(y_test, predicted)
    return {
        "model": name,
        "accuracy": round(float(accuracy_score(y_test, predicted)), 4),
        "precision": round(float(precision_score(y_test, predicted, zero_division=0)), 4),
        "recall": round(float(recall), 4),
        "f1": round(float(f1_score(y_test, predicted)), 4),
        "false_negative_rate": round(float(1 - recall), 4),
        "roc_auc": round(float(roc_auc_score(y_test, probabilities)), 4),
        "inference_ms_per_payload": round(float(inference_ms), 4),
        "training_seconds": round(float(train_seconds), 2),
    }, model


def main() -> None:
    data = load_dataset()
    x_train_text, x_test_text, y_train, y_test = train_test_split(
        data["text"], data["label"], test_size=0.20, random_state=RANDOM_STATE, stratify=data["label"]
    )
    vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), max_features=3000,
                                 sublinear_tf=True, min_df=2, strip_accents="unicode")
    x_train = hstack([vectorizer.fit_transform(x_train_text), security_features(x_train_text)]).tocsr()
    x_test = hstack([vectorizer.transform(x_test_text), security_features(x_test_text)]).tocsr()

    candidates = [
        ("LogisticRegression", LogisticRegression(C=2.0, class_weight="balanced", max_iter=2500, n_jobs=-1, random_state=RANDOM_STATE)),
        ("RandomForestClassifier", RandomForestClassifier(n_estimators=200, class_weight="balanced", n_jobs=-1, random_state=RANDOM_STATE)),
        ("CalibratedLinearSVC", CalibratedClassifierCV(LinearSVC(C=1.0, class_weight="balanced", random_state=RANDOM_STATE), method="sigmoid", cv=5)),
    ]
    rows, trained = [], {}
    for name, candidate in candidates:
        row, fitted = metric_row(name, candidate, x_train, y_train, x_test, y_test)
        rows.append(row)
        trained[name] = fitted
        print(name, row)

    # Security-first selection: minimize missed attacks, then maximize F1, then prefer lower latency.
    ranked = sorted(rows, key=lambda row: (row["false_negative_rate"], -row["f1"], row["inference_ms_per_payload"]))
    winner = ranked[0]
    winner_name = winner["model"]
    winner_model = trained[winner_name]

    metadata = {
        "model_type": winner_name,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "dataset_size": int(len(data)),
        "train_size": int(len(y_train)),
        "test_size_samples": int(len(y_test)),
        "total_features": int(x_train.shape[1]),
        "tfidf_features": int(x_train.shape[1] - len(FEATURE_NAMES)),
        "security_features": len(FEATURE_NAMES),
        "test_accuracy": winner["accuracy"], "test_precision": winner["precision"],
        "test_recall": winner["recall"], "test_f1": winner["f1"],
        "test_roc_auc": winner["roc_auc"], "false_negative_rate": winner["false_negative_rate"],
        "inference_ms_per_payload": winner["inference_ms_per_payload"],
        "selection_rationale": "Lowest held-out false-negative rate, then highest F1, then lower inference latency.",
        "severity_thresholds": {"safe_max": 0.20, "low_max": 0.45, "medium_max": 0.65, "high_max": 0.85},
        "tfidf_config": {"max_features": 3000, "analyzer": "char_wb", "ngram_range": [2, 5]},
    }
    benchmark = {"evaluation_protocol": "Stratified 80/20 split; vectorizer fitted on training data only; no SMOTE.", "results": rows, "winner": winner_name}
    for directory in ARTIFACT_DIRS:
        directory.mkdir(exist_ok=True)
        joblib.dump(winner_model, directory / "xss_model.pkl")
        joblib.dump(vectorizer, directory / "xss_vectorizer.pkl")
        (directory / "model_metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
        (directory / "model_benchmark.json").write_text(json.dumps(benchmark, indent=2), encoding="utf-8")
        (directory / "feature_names.json").write_text(json.dumps({"security_features": FEATURE_NAMES}, indent=2), encoding="utf-8")
    print(f"\nDeployed {winner_name}. Benchmark: {json.dumps(benchmark, indent=2)}")


if __name__ == "__main__":
    main()
