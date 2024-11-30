# Build UI stage
FROM node:18 AS ui-builder
WORKDIR /app/ui
COPY ui/package*.json ./
RUN npm install
COPY ui/ .
RUN npm run build

# Python stage
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies for Playwright
RUN apt-get update && apt-get install -y \
    wget \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxcb1 \
    libxkbcommon0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    python3-tk \
    tk-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browser
RUN playwright install chromium

# Copy built UI files
COPY --from=ui-builder /app/ui/dist /app/ui/dist

# Copy Python files
COPY *.py /app/

# Default environment variables
ENV PORT=8000
ENV HOST=0.0.0.0
ENV BEACON_NODE_URL=""
ENV VALIDATOR_INDEXES=""
ENV DIVOOM_API_ENDPOINT=""
ENV REACT_APP_PATH="/app/ui/dist"

# Expose API port
EXPOSE 8000

# Run the application
CMD ["python", "main.py"] 