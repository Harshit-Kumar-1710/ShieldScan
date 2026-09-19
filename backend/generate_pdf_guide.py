"""
ShieldScan PDF Guide Generator
Converts the project explanation guide into a beautifully styled PDF document.
"""

import os
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
    ListFlowable,
    ListItem
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header (pages 2+)
        if self._pageNumber > 1:
            self.drawString(54, 750, "ShieldScan — Explainable ML XSS Detection & Security Analysis System")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(54, 742, 558, 742)
            
        # Footer (all pages)
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 35, page_str)
        self.drawString(54, 35, "Confidential & Proprietary — Author: Harshit Kumar")
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(54, 48, 558, 48)
        self.restoreState()


def generate_pdf():
    output_path = Path("ShieldScan_Project_Guide.pdf")
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    primary_color = colors.HexColor("#0f172a")
    accent_color = colors.HexColor("#059669")
    dark_bg = colors.HexColor("#0f172a")
    border_color = colors.HexColor("#cbd5e1")
    
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=26,
        textColor=primary_color,
        spaceAfter=4,
    )

    subtitle_style = ParagraphStyle(
        "DocSubTitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#475569"),
        spaceAfter=14,
    )

    h1_style = ParagraphStyle(
        "Heading1_Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        "Heading2_Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=accent_color,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "Body_Custom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6,
    )

    bullet_style = ParagraphStyle(
        "Bullet_Custom",
        parent=body_style,
        leftIndent=12,
        spaceAfter=3,
    )

    callout_style = ParagraphStyle(
        "Callout",
        parent=body_style,
        fontName="Helvetica-Oblique",
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#065f46"),
    )

    code_style = ParagraphStyle(
        "Code_Custom",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
    )

    story = []

    # Title & Header
    story.append(Paragraph("ShieldScan — Complete Project Guide & Interview Manual", title_style))
    story.append(Paragraph("<b>Author:</b> Harshit Kumar &nbsp;|&nbsp; <b>Topic:</b> Explainable ML Cybersecurity System &nbsp;|&nbsp; <b>Model:</b> Calibrated Linear SVM", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=accent_color, spaceAfter=12))

    # Section 1: Executive Summary
    story.append(Paragraph("1. Executive Summary (The 30-Second Pitch)", h1_style))
    pitch_text = (
        "<b>ShieldScan</b> is an explainable machine-learning cybersecurity system that detects Cross-Site Scripting (XSS) "
        "attacks in real time. Instead of relying on brittle regex rules or slow cloud AI APIs, ShieldScan uses a local "
        "<b>Calibrated Linear SVM model</b> combined with 3,000 character-level n-grams and 18 handcrafted security features. "
        "It screens payloads in sub-millisecond time (~0.005 ms) with <b>99.80% recall</b> and an exceptionally low <b>0.20% false-negative rate</b>, "
        "providing human-readable explanations, safe decoding, and OWASP remediation guidelines."
    )
    
    callout_data = [[Paragraph(pitch_text, callout_style)]]
    t_callout = Table(callout_data, colWidths=[504])
    t_callout.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), colors.HexColor("#ecfdf5")),
        ("BORDER", (0,0), (-1,-1), 1, colors.HexColor("#6ee7b7")),
        ("TOPPADDING", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("LEFTPADDING", (0,0), (-1,-1), 10),
        ("RIGHTPADDING", (0,0), (-1,-1), 10),
    ]))
    story.append(t_callout)
    story.append(Spacer(1, 10))

    # Section 2: Problem & Motivation
    story.append(Paragraph("2. Motivation & The Real-World Problem", h1_style))
    story.append(Paragraph("<b>What is Cross-Site Scripting (XSS)?</b>", h2_style))
    story.append(Paragraph(
        "Cross-Site Scripting is a critical web application vulnerability (OWASP Top 10) where attackers inject malicious JavaScript into web applications. "
        "When executed in victim browsers, it leads to session hijacking (cookie theft), credential theft via fake modals, malicious redirections, and unauthorized transactions.",
        body_style
    ))
    story.append(Paragraph("<b>Why Traditional Defenses Fail:</b>", h2_style))
    story.append(Paragraph("• <b>Brittle Regex Filters:</b> Easily bypassed with character encoding (%3Cscript%3E), inline event handlers (onerror=), or Unicode escapes (\\u003cscript\\u003e).", bullet_style))
    story.append(Paragraph("• <b>Black-Box Machine Learning:</b> Typical ML classifiers only return a number without explaining what rule triggered or how to fix it.", bullet_style))
    story.append(Paragraph("• <b>Cloud AI Privacy Risks:</b> Sending internal web traffic and customer logs to external LLMs (like ChatGPT) violates enterprise data privacy laws (GDPR, HIPAA).", bullet_style))
    story.append(Spacer(1, 10))

    # Section 3: ML Architecture
    story.append(Paragraph("3. Machine Learning Architecture (How It Works)", h1_style))
    story.append(Paragraph(
        "ShieldScan processes untrusted strings through a dual feature extraction pipeline feeding into a Calibrated Linear SVM:",
        body_style
    ))
    story.append(Paragraph("1. <b>Safe In-Memory Canonicalization:</b> Decodes URL, HTML entities, and Unicode escapes in memory without executing HTML.", bullet_style))
    story.append(Paragraph("2. <b>Character TF-IDF (2–5 N-grams):</b> Extracts 3,000 sub-word character patterns to capture malformed syntax and structural anomalies.", bullet_style))
    story.append(Paragraph("3. <b>18 Handcrafted Security Features:</b> Regex indicators detecting dangerous JavaScript primitives (script tags, onerror, alert, eval, document.cookie, iframe, data: URIs, vbscript).", bullet_style))
    story.append(Paragraph("4. <b>Calibrated Linear SVM:</b> Outputs true mathematical probabilities (0.0 to 1.0) via Platt Scaling for threshold-based severity classification (SAFE, LOW, MEDIUM, HIGH, CRITICAL).", bullet_style))
    story.append(Spacer(1, 10))

    # Section 4: Model Benchmark Table
    story.append(Paragraph("4. Model Selection & Held-Out Benchmark", h1_style))
    story.append(Paragraph(
        "In cybersecurity screening, <b>False-Negative Rate (FNR)</b> is the primary metric because a missed attack executes malicious code in user browsers. "
        "Evaluated on a held-out 80/20 test split (11,259 samples):",
        body_style
    ))

    bm_data = [
        ["Candidate Model", "Accuracy", "F1 Score", "Recall", "False-Negative Rate", "Latency / payload"],
        ["Logistic Regression", "99.33%", "99.51%", "99.22%", "0.78%", "0.001 ms"],
        ["Random Forest", "99.69%", "99.77%", "99.67%", "0.33%", "0.050 ms"],
        ["Calibrated Linear SVM (Selected)", "99.73%", "99.80%", "99.80%", "0.20% (Lowest Misses)", "0.005 ms (10x faster)"],
    ]
    t_bm = Table(bm_data, colWidths=[160, 65, 65, 65, 85, 64])
    t_bm.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#0f172a")),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("TOPPADDING", (0,0), (-1,-1), 4),
        ("GRID", (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ("BACKGROUND", (0,3), (-1,3), colors.HexColor("#d1fae5")),
        ("TEXTCOLOR", (0,3), (-1,3), colors.HexColor("#065f46")),
        ("FONTNAME", (0,3), (-1,3), "Helvetica-Bold"),
    ]))
    story.append(t_bm)
    story.append(Spacer(1, 10))

    # Section 5: Tech Stack
    story.append(Paragraph("5. Technology Stack & Technical Justification", h1_style))
    ts_data = [
        ["Component", "Technology", "Why This Specific Tool?"],
        ["ML Core", "Scikit-learn & NumPy", "Industry-standard classical ML; high-speed sparse matrix multiplication."],
        ["Model Persistence", "Joblib", "Efficient serialization for scikit-learn models with zero disk bloat."],
        ["API Backend", "FastAPI & Pydantic", "Sub-millisecond async performance, automatic Swagger docs, strict schema validation."],
        ["Rate Limiting", "SlowAPI", "Protects API endpoints against denial-of-service and brute-force scans."],
        ["Frontend UI", "React 18 & Vite", "Instant HMR development, modern component tree, and sub-second production builds."],
        ["CSS Framework", "Tailwind CSS", "Utility-first design system with dark/light theme support and zero runtime overhead."],
    ]
    t_ts = Table(ts_data, colWidths=[100, 120, 284])
    t_ts.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#0f172a")),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("TOPPADDING", (0,0), (-1,-1), 4),
        ("GRID", (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
    ]))
    story.append(t_ts)
    story.append(Spacer(1, 10))

    # Section 6: AI vs ML Comparison
    story.append(Paragraph("6. Local Machine Learning vs. Generative AI Advisory", h1_style))
    story.append(Paragraph(
        "<b>Local ML (Primary Engine):</b> Fast (~0.005 ms), 100% deterministic, privacy-preserving, and mathematically calculates probabilities.<br/>"
        "<b>Generative AI (Advisory Layer):</b> Slower (1.5-3.0s), non-deterministic, but provides natural language AppSec advice, OWASP code review, and comparative triage.",
        body_style
    ))
    story.append(Spacer(1, 10))

    # Section 7: Top Interview Questions & Defense
    story.append(Paragraph("7. Top Interview Questions & Winning Defense Answers", h1_style))
    
    qas = [
        ("Q1: Walk me through what ShieldScan does.",
         "ShieldScan is an explainable XSS detection system. It extracts 3,000 character TF-IDF n-grams and 18 handcrafted security features, which feed into a Calibrated Linear SVM. In ~0.005 ms, it classifies the payload with 99.80% recall and outputs exact probabilities, severity tiers, attack categories, and OWASP code fixes."),
        
        ("Q2: Why not just use an LLM or ChatGPT to detect XSS?",
         "LLMs are 1,000x slower (seconds vs. microseconds), non-deterministic, expensive, and present customer data privacy risks. ShieldScan uses local ML as the authoritative detector and keeps LLMs as an optional advisory second opinion."),
        
        ("Q3: Why choose Calibrated Linear SVM over Random Forest?",
         "In cybersecurity, missed attacks (False Negatives) are critical. Calibrated Linear SVM achieved a 0.20% False-Negative Rate (a 39% reduction vs. Random Forest's 0.33%), while executing 10x faster (~0.005 ms). Platt Scaling calibration allows true probability output."),
        
        ("Q4: Can this ML model replace standard sanitization and output encoding?",
         "No. ML is a pre-execution screening/triage layer (defense-in-depth). Complete application security requires contextual output encoding, strict DOMPurify sanitization, and Content Security Policy (CSP) headers at the rendering layer.")
    ]

    for q, a in qas:
        story.append(Paragraph(f"<b>{q}</b>", h2_style))
        story.append(Paragraph(f"<i>Defense Answer:</i> \"{a}\"", body_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Generated PDF: {output_path.absolute()}")

if __name__ == "__main__":
    generate_pdf()
