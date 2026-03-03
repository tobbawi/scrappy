FROM python:3.13-slim

# Playwright system deps — single layer, minimal footprint
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
        libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
        libpango-1.0-0 libcairo2 libasound2 libxshmfence1 libx11-xcb1 \
        libxcb1 libx11-6 libxext6 libxfixes3 fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# Dependencies first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Playwright Chromium (ARM64-native on Apple Silicon)
RUN playwright install chromium

COPY . .

RUN mkdir -p /app/data

EXPOSE 8000

# Single worker is fine for local use; keep memory low
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
