import os
import asyncio
from beacon_client import BeaconClient
from divoom_client import DivoomClient
from slot_client import SlotClient
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
VIEW_INTERVAL_MINUTES = int(os.getenv('VIEW_INTERVAL_MINUTES', '10'))
DIVOOM_REQUEST_INTERVAL_SECONDS = int(os.getenv('DIVOOM_REQUEST_INTERVAL_SECONDS', '30'))

# Validate configuration
if not BEACON_NODE_URL:
    raise ValueError("BEACON_NODE_URL environment variable is required")
if not VALIDATOR_INDEXES or VALIDATOR_INDEXES == ['']:
    raise ValueError("VALIDATOR_INDEXES environment variable is required")
if not DIVOOM_API_ENDPOINT:
    raise ValueError("DIVOOM_API_ENDPOINT environment variable is required")

@dataclass
class View:
    name: str
    enabled: bool
    needs_refresh: bool  # If True, remount component on refresh
    refresh_interval: float  # In seconds, 0 means no refresh
    description: Optional[str] = None

ENABLED_VIEWS = os.getenv('ENABLED_VIEWS', 'proposer,overview,execution,layer2,mev').split(',')

VIEWS = {
    "proposer": View(
        name="proposer",
        enabled="proposer" in ENABLED_VIEWS,
        needs_refresh=False,
        refresh_interval=4,  # Refresh every slot
        description="Shows upcoming block proposers"
    ),
    "overview": View(
        name="overview", 
        enabled="overview" in ENABLED_VIEWS,
        needs_refresh=False,
        refresh_interval=4,
        description="Validator performance overview"
    ),
    "execution": View(
        name="execution",
        enabled="execution" in ENABLED_VIEWS,
        needs_refresh=False, 
        refresh_interval=4,
        description="Execution layer metrics"
    ),
    "layer2": View(
        name="layer2",
        enabled="layer2" in ENABLED_VIEWS,
        needs_refresh=True,
        refresh_interval=0.1,
        description="Layer 2 metrics"
    ),
    "mev": View(
        name="mev",
        enabled="mev" in ENABLED_VIEWS,
        needs_refresh=False,
        refresh_interval=4,  # Refresh every slot
        description="MEV data from ethpandaops lab"
    )
}

class ViewRotation:
    def __init__(self, views: Dict[str, View], interval_minutes: int):
        self.views = {k: v for k, v in views.items() if v.enabled}
        self.interval_minutes = interval_minutes
        self.last_view = None
        self.last_change_time = datetime.now() - timedelta(minutes=interval_minutes)
        self.override_view = None
        self.override_until = None

    def get_current_view(self) -> Optional[View]:
        now = datetime.now()
        
        if self.override_view and self.override_until:
            if now < self.override_until:
                return self.views[self.override_view]
            self.override_view = None
            self.override_until = None
        
        if (now - self.last_change_time).total_seconds() >= self.interval_minutes * 60:
            available_views = [name for name in self.views.keys() if name != self.last_view]
            if not available_views:
                available_views = list(self.views.keys())
            
            import random
            self.last_view = random.choice(available_views)
            self.last_change_time = now
            
        return self.views.get(self.last_view)

    def set_override(self, view: str, duration_minutes: int):
        if view != "none" and view not in self.views:
            raise ValueError(f"Invalid view: {view}")
        
        self.override_view = view if view != "none" else None
        self.override_until = datetime.now() + timedelta(minutes=duration_minutes) if view != "none" else None

    def get_view_config(self, view_name: str) -> Optional[View]:
        return self.views.get(view_name)

# Add to the global variables
l2_tracker = L2MetricsTracker()
slot_client = SlotClient()
screenshot_cache = None
browser_lock = asyncio.Lock()
playwright = None
browser = None
context = None
page = None

async def initialize_browser():
    global playwright, browser, context, page
    
    try:
        playwright = await async_playwright().start()
        browser = await playwright.chromium.launch(
            args=['--no-sandbox', '--disable-dev-shm-usage']
        )
        
        context = await browser.new_context(
            viewport={'width': 64, 'height': 64},
            device_scale_factor=1,
        )
        
        page = await context.new_page()
        
        # Anti-aliasing prevention
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
        
    except Exception as e:
        logging.error(f"Failed to initialize browser: {e}")
        await cleanup_browser()
        raise

async def cleanup_browser():
    global playwright, browser, context, page
    
    if page:
        await page.close()
    if context:
        await context.close()
    if browser:
        await browser.close()
    if playwright:
        await playwright.stop()
        
    page = None
    context = None
    browser = None
    playwright = None

async def update_screenshot_cache():
    global screenshot_cache, page
    
    while True:
        try:
            if not page:
                await initialize_browser()
                
            url = f"http://localhost:{PORT}"
            await page.goto(url)
            await page.wait_for_timeout(500)
            
            async with browser_lock:
                screenshot_cache = await page.screenshot(
                    type='png',
                    omit_background=False,
                    scale='css',
                    animations='disabled',
                )
            
            await asyncio.sleep(1)
            
        except Exception as e:
            logging.error(f"Screenshot error: {e}")
            await cleanup_browser()
            await asyncio.sleep(1)  # Wait before retrying

# Replace capture_react_page with this simpler version
async def capture_react_page():
    async with browser_lock:
        return screenshot_cache

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

    # Initialize slot client and start background fetch
    await slot_client.start()
    print("Initialized slot client")

    # Start display update task
    asyncio.create_task(update_display())

    # Start screenshot cache update task
    asyncio.create_task(update_screenshot_cache())

    yield  # Server is running

    # Cleanup
    print("Shutting down...")
    await cleanup_browser()
    await l2_tracker.stop()
    await slot_client.stop()

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
divoom_client = DivoomClient(DIVOOM_API_ENDPOINT, DIVOOM_REQUEST_INTERVAL_SECONDS)
validator_gadget = ValidatorGadget()
view_rotation = ViewRotation(VIEWS, VIEW_INTERVAL_MINUTES)

async def update_display():
    while True:
        try:
            screenshot = await capture_react_page()
            if screenshot:  # Only update if we have a cached screenshot
                await divoom_client.update_display(screenshot)
        except Exception as e:
            print(f"Error updating display: {e}")
        
        current_view = view_rotation.get_current_view()
        if current_view:
            await asyncio.sleep(current_view.refresh_interval)
        else:
            await asyncio.sleep(4)  # Default fallback

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

async def handle_head_event(event_data: Dict):
    """Handle new head events by updating the display and cache"""
    slot = int(event_data.get('slot', 0))

    # Fetch and cache the new block
    asyncio.create_task(beacon_client.get_block(slot))

    current_view = view_rotation.get_current_view()
    if current_view and current_view.name in ["overview", "execution", "proposer", "mev"]:
        try:
            screenshot = await capture_react_page()
            if screenshot:
                await divoom_client.update_display(screenshot)
        except Exception as e:
            print(f"Error updating display on head event: {e}")

async def handle_slot_change(slot_data: Dict):
    """Handle slot changes by updating the Divoom display"""
    current_view = view_rotation.get_current_view()
    if current_view and current_view.name in ["overview", "execution", "proposer", "mev"]:
        print(f"Re-rendering display for slot {slot_data['slot']} on view {current_view.name}")
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
        if not screenshot:
            return Response(
                content="Screenshot not available",
                status_code=503
            )
        return Response(
            content=screenshot,
            media_type="image/png"
        )
    except Exception as e:
        print(f"Error getting screenshot: {e}")
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
    current_view = view_rotation.get_current_view()
    return {
        "view": current_view.name if current_view else None,
        "refreshInterval": current_view.refresh_interval if current_view else None,
        "needsRefresh": current_view.needs_refresh if current_view else None
    }

@app.get("/api/views/available")
async def get_available_views():
    available_views = []
    for view_name, view in VIEWS.items():
        if view.enabled and (view_name != "layer2" or l2_tracker.get_connection_status()):
            available_views.append({
                "name": view_name,
                "refreshInterval": view.refresh_interval,
                "needsRefresh": view.needs_refresh,
                "description": view.description
            })
    
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

@app.get("/api/slot")
async def get_slot_data():
    """Get current slot data from ethpandaops lab"""
    try:
        # Get cached data (background fetch updates this)
        slot_data = await slot_client.get_slot_data()

        if not slot_data:
            return {}  # Return empty object instead of error

        # Extract winning bid
        winning_bid = None
        try:
            block_hash = slot_data.get("block", {}).get("execution_payload_block_hash")
            relay_bids = slot_data.get("relay_bids", {})

            if block_hash and relay_bids:
                for relay_name, relay_data in relay_bids.items():
                    bids = relay_data.get("bids", [])
                    for bid in bids:
                        if bid.get("block_hash") == block_hash:
                            bid["relay_name"] = relay_name
                            winning_bid = bid
                            break
                    if winning_bid:
                        break
        except Exception as bid_error:
            logging.error(f"Error processing relay bids: {bid_error}")
            winning_bid = None

        # Get arrival times (already extracted in slot_client, but cached here)
        arrival_times = slot_client._extract_arrival_times(slot_data)

        # Get slot history (already pre-processed from raw payloads)
        slot_history = slot_client.get_slot_history()

        # Generate bid history statistics
        bid_stats = {}
        if slot_history and len(slot_history) > 1:
            try:
                # Extract bids from history
                bid_values = []
                for entry in slot_history:
                    if entry.get("bid_value"):
                        try:
                            wei = int(entry["bid_value"])
                            eth = wei / 1e18
                            bid_values.append(eth)
                        except:
                            continue

                if bid_values and len(bid_values) > 1:
                    bid_stats = {
                        "highest": max(bid_values),
                        "lowest": min(bid_values),
                        "average": sum(bid_values) / len(bid_values),
                        "count": len(bid_values)
                    }

                    # Calculate trend for bids (positive is increasing, negative is decreasing)
                    if len(bid_values) >= 3:
                        recent = bid_values[-3:]
                        oldest = recent[0]
                        newest = recent[-2]
                        bid_stats["trend"] = newest - oldest
                        bid_stats["trend_pct"] = (newest - oldest) / oldest * 100 if oldest > 0 else 0
            except Exception as stats_error:
                logging.error(f"Error calculating bid statistics: {stats_error}")

        # Calculate arrival time history statistics if available
        arrival_stats = {}
        if slot_history and len(slot_history) > 1:
            try:
                # Extract arrival times from history
                history_times = []
                for entry in slot_history:
                    time_val = entry.get("arrival_times", {}).get("fastest_time")
                    if time_val is not None:
                        history_times.append(time_val)

                if history_times:
                    history_times.sort()
                    arrival_stats = {
                        "fastest": min(history_times),
                        "slowest": max(history_times),
                        "average": sum(history_times) / len(history_times),
                        "median": history_times[len(history_times) // 2],
                        "count": len(history_times)
                    }

                    # Calculate trend (negative is improving/faster, positive is degrading/slower)
                    if len(history_times) >= 4:
                        recent = history_times[-4:]
                        oldest = recent[0]
                        newest = recent[-1]
                        arrival_stats["trend"] = newest - oldest
                        arrival_stats["trend_pct"] = (newest - oldest) / oldest * 100 if oldest > 0 else 0
            except Exception as stats_error:
                logging.error(f"Error calculating arrival statistics: {stats_error}")

        # Return the processed data
        return {
            "slot": slot_data.get("slot"),
            "network": slot_data.get("network"),
            "entity": slot_data.get("entity"),
            "arrival_times": arrival_times,
            "winning_bid": winning_bid,
            "slot_history": slot_history,
            "arrival_stats": arrival_stats,
            "bid_stats": bid_stats
        }
    except Exception as e:
        logging.error(f"Error getting slot data: {e}")
        import traceback
        traceback.print_exc()
        return {}  # Return empty object instead of error

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