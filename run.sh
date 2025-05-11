#!/bin/bash
set -e

# Ensure we're in the project directory
cd "$(dirname "$0")"

# Check if the virtual environment exists
if [ ! -d ".venv" ]; then
    echo "Virtual environment not found. Running setup first..."
    ./setup.sh
fi

# Activate the virtual environment
source .venv/bin/activate

# Run the application
echo "Running beacon-divoom application..."
python main.py