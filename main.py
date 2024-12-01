import os
import asyncio
from beacon_client import BeaconClient
from divoom_client import DivoomClient
from fastapi import FastAPI, Response, Body
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
from PIL import Image
import io
import tkinter as tk
from PIL import Image, ImageTk
from datetime import datetime, timedelta
import aiohttp
import json
from typing import Dict, List, Optional
from dataclasses import dataclass
from l2_metrics import L2MetricsTracker

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
VIEW_INTERVAL_MINUTES = int(os.getenv('VIEW_INTERVAL_MINUTES', '30'))
ENABLED_VIEWS = os.getenv('ENABLED_VIEWS', 'proposer,overview,execution,layer2').split(',')

# Validate configuration
if not BEACON_NODE_URL:
    raise ValueError("BEACON_NODE_URL environment variable is required")
if not VALIDATOR_INDEXES or VALIDATOR_INDEXES == ['']:
    raise ValueError("VALIDATOR_INDEXES environment variable is required")
if not DIVOOM_API_ENDPOINT:
    raise ValueError("DIVOOM_API_ENDPOINT environment variable is required")

class ViewRotation:
    def __init__(self, enabled_views, interval_minutes):
        self.enabled_views = enabled_views
        self.interval_minutes = interval_minutes
        self.last_view = None
        self.last_change_time = datetime.now() - timedelta(minutes=interval_minutes)
        self.override_view = None
        self.override_until = None

    def get_current_view(self):
        now = datetime.now()
        
        # Check if there's an active override
        if self.override_view and self.override_until:
            if now < self.override_until:
                return self.override_view
            else:
                # Clear expired override
                self.override_view = None
                self.override_until = None
        
        # Normal rotation logic
        if (now - self.last_change_time).total_seconds() >= self.interval_minutes * 60:
            available_views = [view for view in self.enabled_views if view != self.last_view]
            if not available_views:
                available_views = self.enabled_views
            
            import random
            self.last_view = random.choice(available_views)
            self.last_change_time = now
            
        return self.last_view

    def set_override(self, view: str, duration_minutes: int):
        if view not in self.enabled_views and view != "none":
            raise ValueError(f"Invalid view: {view}")
        
        self.override_view = view if view != "none" else None
        self.override_until = datetime.now() + timedelta(minutes=duration_minutes) if view != "none" else None

# Add to the global variables
l2_tracker = L2MetricsTracker()

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
    asyncio.create_task(load_historical_blocks())
    print("Started SSE subscription and slot timer")
    
    # Start L2 tracker
    await l2_tracker.start()
    
    # Start L2 display update task
    asyncio.create_task(update_l2_display())
    
    yield  # Server is running
    
    # Cleanup (if needed)
    print("Shutting down...")
    
    # Stop L2 tracker
    await l2_tracker.stop()

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
view_rotation = ViewRotation(ENABLED_VIEWS, VIEW_INTERVAL_MINUTES)

async def update_l2_display():
    while True:
        if view_rotation.get_current_view() == "layer2":
            try:
                screenshot = await capture_react_page()
                await divoom_client.update_display(screenshot)
            except Exception as e:
                print(f"Error updating L2 display: {e}")
        await asyncio.sleep(0.5)

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
        
        # Enhanced anti-aliasing prevention
        await page.add_init_script("""
            document.addEventListener('DOMContentLoaded', () => {
                const style = document.createElement('style');
                style.textContent = `
                    * {
                        image-rendering: pixelated !important;
                        -webkit-font-smoothing: none !important;
                        -moz-osx-font-smoothing: none !important;
                        font-smoothing: none !important;
                        text-rendering: optimizeSpeed !important;
                        transform: translate3d(0, 0, 0);
                        backface-visibility: hidden;
                    }
                `;
                document.head.appendChild(style);
            });
        """)
        
        url = f"http://localhost:{PORT}"
        await page.goto(url)
        await page.wait_for_timeout(2000)
        
        screenshot = await page.screenshot(
            type='png',
            omit_background=False,
            scale='css',
            animations='disabled',
        )
        
        await browser.close()
            
        return screenshot

async def handle_head_event(event_data: Dict):
    """Handle new head events by updating the display and cache"""
    slot = int(event_data.get('slot', 0))
    
    # Fetch and cache the new block
    asyncio.create_task(beacon_client.get_block(slot))
    
    if view_rotation.get_current_view() == "overview" or \
       view_rotation.get_current_view() == "execution" or \
       view_rotation.get_current_view() == "proposer":
        print(f"Re-rendering display for head event")
        try:
            screenshot = await capture_react_page()
            await divoom_client.update_display(screenshot)
        except Exception as e:
            print(f"Error updating display on head event: {e}")

async def handle_slot_change(slot_data: Dict):
    """Handle slot changes by updating the Divoom display"""
    if view_rotation.get_current_view() == "overview" or \
       view_rotation.get_current_view() == "execution" or \
       view_rotation.get_current_view() == "proposer":
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

@app.get("/api/rewards/{epoch}")
async def get_rewards(epoch: int):
    """Get rewards for all validators in specified epoch"""
    rewards = await beacon_client.get_epoch_rewards(epoch)
    if not rewards:
        return {"error": "Failed to fetch rewards"}
        
    # Calculate total rewards
    totals = {
        "head": 0,
        "target": 0,
        "source": 0,
        "inclusion_delay": 0,
        "inactivity": 0,
        "total_attestations": 0
    }
    
    for reward in rewards:
        if reward["attestation_included"]:
            totals["total_attestations"] += 1
            totals["head"] += 1 if reward["head"] > 0 else 0
            totals["target"] += 1 if reward["target"] > 0 else 0
            totals["source"] += 1 if reward["source"] > 0 else 0
            totals["inclusion_delay"] += 1 if reward["inclusion_delay"] > 0 else 0
            totals["inactivity"] += 1 if reward["inactivity"] < 0 else 0
    
    # Calculate percentages
    if totals["total_attestations"] > 0:
        return {
            "head": round((totals["head"] / totals["total_attestations"]) * 100, 1),
            "target": round((totals["target"] / totals["total_attestations"]) * 100, 1),
            "source": round((totals["source"] / totals["total_attestations"]) * 100, 1),
            "inclusion_delay": round((totals["inclusion_delay"] / totals["total_attestations"]) * 100, 1),
            "inactivity": round((totals["inactivity"] / totals["total_attestations"]) * 100, 1)
        }
    else:
        return {
            "head": 0,
            "target": 0, 
            "source": 0,
            "inclusion_delay": 0,
            "inactivity": 0
        }

@app.get("/api/gas")
async def get_gas():
    """Get current gas metrics"""
    metrics = await beacon_client.get_gas_metrics()
    if not metrics:
        return {"error": "Failed to fetch gas metrics"}
    return metrics

@app.get("/api/current-view")
async def get_current_view():
    return {"view": view_rotation.get_current_view()}

@app.get("/api/views/available")
async def get_available_views():
    # Filter out L2 metrics view if not connected
    available_views = [view for view in ENABLED_VIEWS if view != "layer2" or l2_tracker.get_connection_status()]
    
    return {
        "views": available_views,
        "currentOverride": {
            "view": view_rotation.override_view,
            "until": view_rotation.override_until.isoformat() if view_rotation.override_until else None
        }
    }

@app.post("/api/views/override")
async def set_view_override(
    view: str = Body(..., embed=True),
    duration_minutes: int = Body(..., embed=True)
):
    try:
        view_rotation.set_override(view, duration_minutes)
        return {"status": "success"}
    except ValueError as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/l2metrics")
async def get_l2_metrics():
    top_l2s = l2_tracker.get_top_l2s(5)
    return {
        "total_tps": round(l2_tracker.total_tps, 2),
        "total_gas": l2_tracker.total_gas,
        "top_l2s": [
            {
                "name": l2.name,
                "tps": round(l2.tps, 2),
                "gas_used": l2.gas_used
            } for l2 in top_l2s
        ],
        "is_connected": l2_tracker.get_connection_status()
    }

# Verify dist directory exists before mounting
if not os.path.exists(REACT_APP_PATH):
    raise RuntimeError(f"Production mode requires the '{REACT_APP_PATH}' directory. Run 'npm run build' in the ui directory first.")

@app.get("/{full_path:path}")
async def proxy_to_react(full_path: str):
    if MODE == 'development':
        # In dev mode, proxy to React dev server
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
        # In prod mode, serve from static files
        try:
            with open(f"{REACT_APP_PATH}/{full_path}", "rb") as f:
                content = f.read()
                
            # Set correct MIME types
            if full_path.endswith('.js'):
                return Response(content=content, media_type='application/javascript')
            elif full_path.endswith('.mjs'):
                return Response(content=content, media_type='application/javascript')
            elif full_path.endswith('.css'):
                return Response(content=content, media_type='text/css')
            elif full_path.endswith('.html'):
                return Response(content=content, media_type='text/html')
            elif full_path.endswith(('.woff2', '.woff')):
                return Response(content=content, media_type='font/woff2' if full_path.endswith('.woff2') else 'font/woff')
            elif full_path.endswith('.ttf'):
                return Response(content=content, media_type='font/ttf')
            elif full_path.endswith('.otf'):
                return Response(content=content, media_type='font/otf')
            else:
                return Response(content=content)
                
        except:
            # Fallback to index.html for client-side routing
            with open(f"{REACT_APP_PATH}/index.html", "rb") as f:
                content = f.read()
            return Response(content=content, media_type='text/html')

async def load_historical_blocks():
    """Lazily load the last 5 epochs of blocks"""
    try:
        current_slot = beacon_client.calculate_current_slot()
        slots_per_epoch = int(beacon_client.config['data']['SLOTS_PER_EPOCH'])
        start_slot = current_slot - (slots_per_epoch * 5)
        
        for slot in range(start_slot, current_slot + 1):
            # Don't wait for the result - let it load in background
            asyncio.create_task(beacon_client.get_block(slot))
            await asyncio.sleep(0.05)  # Small delay to prevent overwhelming the node
            
    except Exception as e:
        logging.error(f"Error loading historical blocks: {e}")

if __name__ == "__main__":
    print(f"Running in {MODE} mode")
    if MODE == 'development':
        print(f"Using React dev server at {REACT_DEV_SERVER}")
    else:
        print(f"Serving static files from {REACT_APP_PATH}")
    uvicorn.run(app, host=HOST, port=PORT)
