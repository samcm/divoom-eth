# Beacon-Divoom Project Guide

This guide provides an overview of the `beacon-divoom` project structure, components, and guidance for future development.

## Project Overview

The `beacon-divoom` project is a system that displays Ethereum beacon chain and Layer 2 status information on a Divoom pixel display device. The application consists of:

1. A Python backend that communicates with an Ethereum beacon node
2. Integration with a Divoom device API
3. A React frontend that renders visualizations for the Divoom display
4. Layer 2 metrics tracking

## Core Components

### 1. Backend Services

#### `main.py`
- Entry point for the application
- Sets up the FastAPI server, routes, and background services
- Manages view rotation between different display modes
- Handles frontend/backend communication
- Controls screenshot capturing and display updates

#### `beacon_client.py`
- Interfaces with Ethereum beacon node API
- Fetches and caches Ethereum validator data, blocks, and metrics
- Manages event subscriptions for head events and slot changes
- Provides real-time information about the beacon chain

#### `divoom_client.py`
- Handles communication with Divoom device API
- Processes image data and sends it to the Divoom display
- Implements rate limiting to prevent excessive updates

#### `validator_gadget.py`
- Manages validator entity mapping data
- Maps validator indexes to entities/operators
- Provides data enrichment for validator information

#### `l2_metrics.py`
- Tracks Layer 2 metrics from external sources
- Connects to L2 metrics stream
- Processes and aggregates metrics for display

### 2. Frontend Components

#### UI Structure (React)
- Located in the `ui/` directory
- Uses Vite for building and development
- Tailored for 64x64 pixel display

#### Views
- **Overview**: Shows general validator status and block arrival times
- **Proposer**: Displays current and upcoming block proposers
- **Execution**: Shows gas metrics and transaction information
- **Layer2**: Displays Layer 2 TPS metrics and comparisons
- **Admin**: Admin interface for controlling the display

#### Components
- **BaseLayout**: Shared layout template for all views
- **SlotHistory**: Common component for showing slot status across views

## Configuration

### Environment Variables
- `BEACON_NODE_URL`: URL of the Ethereum beacon node (required)
- `VALIDATOR_INDEXES`: Comma-separated list of validator indexes to monitor (required)
- `DIVOOM_API_ENDPOINT`: Endpoint for the Divoom API service (required)
- `REACT_APP_PATH`: Path to React app build directory (default: 'ui/dist')
- `HOST`: Host to bind server to (default: '0.0.0.0')
- `PORT`: Port to run the server on (default: 8000)
- `MODE`: Operating mode - 'production' or 'development' (default: 'production')
- `VIEW_INTERVAL_MINUTES`: How often to rotate views (default: 10)
- `ENABLED_VIEWS`: Comma-separated list of enabled views (default: 'proposer,overview,execution,layer2')

## Development Workflow

### Running the Application

1. Configure environment variables (see Configuration section)
2. Build the frontend:
   ```bash
   cd ui
   npm install
   npm run build
   ```
3. Run the backend:
   ```bash
   python main.py
   ```

### Development Mode

Set `MODE=development` to enable development features:
- Frontend proxy to React dev server
- Real-time UI updates without rebuilding

### Docker Deployment

The project includes a Dockerfile for containerized deployment:
```bash
docker run -p 8000:8000 \
-e BEACON_NODE_URL=http://your-beacon-node:5052 \
-e VALIDATOR_INDEXES=123,456,789 \
-e DIVOOM_API_ENDPOINT=http://your-divoom-rest-api:5000 \
ghcr.io/samcm/divoom-eth:latest
```

## Architecture Details

### Data Flow

1. `BeaconClient` connects to a beacon node and subscribes to events
2. Backend processes and caches beacon chain data
3. React frontend renders display components
4. Browser page is captured as a screenshot with Playwright
5. Screenshot is sent to Divoom device via `DivoomClient`

### View Rotation System

The application rotates between different views:
- Views are configured in `main.py` (VIEWS dictionary)
- `ViewRotation` class manages switching between views
- Each view has refresh intervals and display configurations
- Admin API allows overriding the current view temporarily

### Caching Mechanisms

- Block data is cached to reduce API calls
- Screenshot caching for efficient display updates
- Validator mapping is downloaded and cached on startup

## Guidelines for Future Development

### Adding New Views

1. Create a new React component in `ui/src/views/`
2. Add the view to the routes in `ui/src/App.tsx`
3. Register the view in the `VIEWS` dictionary in `main.py`
4. Add the view name to the `ENABLED_VIEWS` environment variable

### Modifying Display Logic

The display update workflow is:
1. React frontend renders the current view
2. Playwright captures a screenshot of the page
3. Screenshot is sent to the Divoom device

Modify `update_screenshot_cache()` or `update_display()` in `main.py` to change this behavior.

### Adding New Data Sources

1. Create a new client class or extend existing ones
2. Add API endpoints in `main.py`
3. Create UI components to visualize the data

### Code Style and Practices

- Python code follows standard conventions
- React components use functional style with hooks
- Views are self-contained with minimal dependencies
- Common UI elements are shared via components

## Troubleshooting

### Common Issues

- Ensure the beacon node is accessible and configured correctly
- Check that the Divoom API endpoint is responding
- Verify that the React app is built (`npm run build` in the ui directory)
- For development mode, ensure the React dev server is running

### Logging

- The application uses Python's logging system
- Check log messages for connection issues or errors
- Browser console may contain frontend errors

## Future Enhancements

Potential areas for improvement:

1. Additional validator performance metrics
2. More customizable view rotation
3. Enhanced L2 metrics and visualization
4. Support for different Divoom device models/sizes
5. Historical data visualization
6. Alert system for missed blocks or performance issues