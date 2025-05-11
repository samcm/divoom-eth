#!/bin/bash
set -e

echo "Beacon-Divoom Setup Script"
echo "=========================="

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "Installing uv..."
    pip install uv
fi

# Check Python version
python_version=$(python --version | cut -d' ' -f2)
python_major=$(echo $python_version | cut -d'.' -f1)
python_minor=$(echo $python_version | cut -d'.' -f2)

if [ "$python_major" -gt 3 ] || ([ "$python_major" -eq 3 ] && [ "$python_minor" -ge 13 ]); then
    echo "Warning: Python version $python_version detected."
    echo "This project is not compatible with Python 3.13+ due to greenlet dependency issues."
    echo "Consider using Python 3.8-3.12 instead."
    
    read -p "Do you want to continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Exiting setup. Please install Python 3.8-3.12 and try again."
        exit 1
    fi
fi

# Create and activate virtual environment
echo "Creating virtual environment..."
uv venv .venv

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate || {
    echo "Failed to activate virtual environment. Please activate it manually:"
    echo "source .venv/bin/activate (Unix/macOS)"
    echo ".venv\\Scripts\\activate (Windows)"
    exit 1
}

# Install dependencies
echo "Installing dependencies with uv..."
uv pip install -r requirements.txt

# Install playwright browser
echo "Installing Playwright browsers..."
python -m playwright install chromium

echo ""
echo "Setup complete! To run the application:"
echo "1. Make sure environment variables are set (see README.md)"
echo "2. Build the frontend (cd ui && npm install && npm run build)"
echo "3. Run the application with: ./run.sh"
echo ""
echo "IMPORTANT: Always use ./run.sh to run the application to ensure the virtual environment is activated."