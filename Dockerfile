FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (layer-cached)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY main.py .

# Artifacts are mounted at runtime (or baked in for immutable deploys)
# docker run -v /path/to/artifacts:/app/artifacts ...
RUN mkdir -p artifacts

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
