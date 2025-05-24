# Beacon Chain Display

A display interface for Ethereum beacon chain status using a Divoom device.

## Configuration

The application is configured using environment variables:

- `BEACON_NODE_URL`: URL of the beacon node (required)
- `VALIDATOR_INDEXES`: Comma-separated list of validator indexes to monitor (required)
- `DIVOOM_API_ENDPOINT`: URL of the Divoom API endpoint (required)
- `DIVOOM_REQUEST_INTERVAL_SECONDS`: Minimum seconds between Divoom API requests (default: 30)
- `PORT`: Port to run the server on (default: 8000)
- `HOST`: Host to bind the server to (default: 0.0.0.0)

## Running with Docker 
```bash
docker run -p 8000:8000 \
-e BEACON_NODE_URL=http://your-beacon-node:5052 \
-e VALIDATOR_INDEXES=123,456,789 \
-e DIVOOM_API_ENDPOINT=http://your-divoom-rest-api:5000 \
ghcr.io/samcm/divoom-eth:latest
```
