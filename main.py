import os
import asyncio
from beacon_client import BeaconClient
from divoom_client import DivoomClient
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import httpx
import uvicorn
from dotenv import load_dotenv
from playwright.async_api import async_playwright
from typing import Dict
from validator_gadget import ValidatorGadget
import requests
from tqdm import tqdm
import logging
from contextlib import asynccontextmanager

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)

load_dotenv()

# Configuration from environment
BEACON_NODE_URL = os.getenv('BEACON_NODE_URL')
VALIDATOR_INDEXES = os.getenv('VALIDATOR_INDEXES', '').split(',')
DIVOOM_API_ENDPOINT = os.getenv('DIVOOM_API_ENDPOINT')
REACT_APP_PATH = os.getenv('REACT_APP_PATH', 'ui/dist')
HOST = os.getenv('HOST', '0.0.0.0')
PORT = int(os.getenv('PORT', '8000'))
MODE = os.getenv('MODE', 'production')
REACT_DEV_SERVER = "http://localhost:5173" if MODE == 'development' else None

# Validate configuration
if not BEACON_NODE_URL:
    raise ValueError("BEACON_NODE_URL environment variable is required")
if not VALIDATOR_INDEXES or VALIDATOR_INDEXES == ['']:
    raise ValueError("VALIDATOR_INDEXES environment variable is required")
if not DIVOOM_API_ENDPOINT:
    raise ValueError("DIVOOM_API_ENDPOINT environment variable is required")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Download validator mapping if needed
    download_validator_mapping()
    
    # Initialize validator gadget
    global validator_gadget
    validator_gadget = ValidatorGadget()
    
    # Initialize beacon client
    await beacon_client.initialize()
    
    # Add event listeners
    beacon_client.add_head_listener(handle_head_event)
    beacon_client.add_slot_listener(handle_slot_change)
    
    # Start background tasks
    asyncio.create_task(beacon_client.subscribe_to_head_events())
    asyncio.create_task(beacon_client.start_slot_timer())
    print("Started SSE subscription and slot timer")
    
    yield  # Server is running
    
    # Cleanup (if needed)
    print("Shutting down...")

app = FastAPI(lifespan=lifespan)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

beacon_client = BeaconClient(BEACON_NODE_URL, VALIDATOR_INDEXES)
divoom_client = DivoomClient(DIVOOM_API_ENDPOINT)
validator_gadget = ValidatorGadget()

def download_validator_mapping():
    """Downloads the validator mapping file if it doesn't exist"""
    url = "https://storage.googleapis.com/public_eth_data/openethdata/validator_data.parquet.gzip"
    file_path = "validator_mapping.parquet"
    
    if os.path.isfile(file_path):
        return
        
    logging.info(f"Downloading validator mapping from {url}")
    response = requests.get(url, stream=True)
    total_size = int(response.headers.get('content-length', 0))
    
    with open(file_path, 'wb') as file, tqdm(
        desc="Downloading validator mapping",
        total=total_size,
        unit='iB',
        unit_scale=True,
        unit_divisor=1024,
    ) as progress_bar:
        for data in response.iter_content(chunk_size=1024):
            size = file.write(data)
            progress_bar.update(size)
            
    logging.info("Validator mapping download complete")

async def capture_react_page():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        
        context = await browser.new_context(
            viewport={'width': 64, 'height': 64},
            device_scale_factor=1,
        )
        
        page = await context.new_page()
        
        await page.add_init_script("""
            CSS.supports = () => false;
            document.body.style.webkitFontSmoothing = 'none';
            document.body.style.mozOsxFontSmoothing = 'none';
            document.body.style.textRendering = 'geometricPrecision';
        """)
        
        # Use dev server in development mode, local server in production
        url = REACT_DEV_SERVER if MODE == 'development' else f"http://localhost:{PORT}"
        await page.goto(url)
        await page.wait_for_timeout(2000)
        
        screenshot = await page.screenshot(
            clip={'x': 0, 'y': 0, 'width': 64, 'height': 64},
            type='png',
            omit_background=False,
        )
        
        await browser.close()
        return screenshot

async def handle_head_event(event_data: Dict):
    """Handle new head events by updating the Divoom display"""
    print(f"Re-rendering display for head event")
    try:
        screenshot = await capture_react_page()
        await divoom_client.update_display(screenshot)
    except Exception as e:
        print(f"Error updating display on head event: {e}")

async def handle_slot_change(slot_data: Dict):
    """Handle slot changes by updating the Divoom display"""
    print(f"Re-rendering display for slot {slot_data['slot']}")
    try:
        screenshot = await capture_react_page()
        await divoom_client.update_display(screenshot)
    except Exception as e:
        print(f"Error updating display on slot change: {e}")

@app.get("/api/status")
async def get_status():
    return await beacon_client.get_validator_status_summary(VALIDATOR_INDEXES)

@app.get("/api/slots")
async def get_slots():
    return await beacon_client.get_slots(VALIDATOR_INDEXES)

@app.get("/api/arrival-times")
async def get_arrival_times():
    return await beacon_client.get_arrival_times()

@app.get("/api/image")
async def get_image():
    try:
        screenshot = await capture_react_page()
        return Response(
            content=screenshot,
            media_type="image/png"
        )
    except Exception as e:
        print(f"Error capturing screenshot: {e}")
        return Response(
            content=str(e),
            status_code=500
        )

@app.get("/api/validator-entities")
async def get_validator_entities():
    """Get entity information for configured validators"""
    entities = {}
    for validator_index in VALIDATOR_INDEXES:
        entities[validator_index] = validator_gadget.get_validator_entity(validator_index)
    return entities

@app.get("/api/proposers")
async def get_proposers():
    """Get current and upcoming proposers with their entities"""
    try:
        proposers = await beacon_client.get_upcoming_proposers()
        
        # Sanitize and structure the data
        sanitized_proposers = []
        for proposer in proposers:
            entity = validator_gadget.get_validator_entity(proposer['validator_index'])
            sanitized_proposer = {
                'slot': int(proposer['slot']),
                'validator_index': int(proposer['validator_index']),
                'when': str(proposer['when']),
                'epoch': int(proposer['epoch']),
                'is_current_slot': bool(proposer['is_current_slot']),
                'entity': {
                    'label': str(entity['label'] if entity else 'unknown'),
                    'node_operator': str(entity['node_operator'] if entity else 'unknown')
                }
            }
            sanitized_proposers.append(sanitized_proposer)
            
        return sanitized_proposers
    except Exception as e:
        logging.error(f"Error getting proposers: {e}")
        import traceback
        traceback.print_exc()
        return []

# In development mode, proxy non-API requests to React dev server
if MODE == 'development':
    @app.get("/{full_path:path}")
    async def proxy_to_react(full_path: str):
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{REACT_DEV_SERVER}/{full_path}")
                return Response(
                    content=response.content,
                    status_code=response.status_code,
                    media_type=response.headers.get("content-type", "text/html")
                )
            except httpx.RequestError:
                response = await client.get(f"{REACT_DEV_SERVER}/")
                return Response(
                    content=response.content,
                    media_type=response.headers.get("content-type", "text/html")
                )
else:
    # In production mode, verify dist directory exists before mounting
    if not os.path.exists(REACT_APP_PATH):
        raise RuntimeError(f"Production mode requires the '{REACT_APP_PATH}' directory. Run 'npm run build' in the ui directory first.")
    app.mount("/", StaticFiles(directory=REACT_APP_PATH, html=True), name="static")

if __name__ == "__main__":
    print(f"Running in {MODE} mode")
    if MODE == 'development':
        print(f"Using React dev server at {REACT_DEV_SERVER}")
    else:
        print(f"Serving static files from {REACT_APP_PATH}")
    uvicorn.run(app, host=HOST, port=PORT)