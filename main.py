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

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

beacon_client = BeaconClient(BEACON_NODE_URL)
divoom_client = DivoomClient(DIVOOM_API_ENDPOINT)

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
        
        with open('latest_screenshot.png', 'wb') as f:
            f.write(screenshot)
            
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

@app.on_event("startup")
async def startup_event():
    await beacon_client.initialize()
    # Add event listeners
    beacon_client.add_head_listener(handle_head_event)
    beacon_client.add_slot_listener(handle_slot_change)
    # Start background tasks
    asyncio.create_task(beacon_client.subscribe_to_head_events())
    asyncio.create_task(beacon_client.start_slot_timer())
    print("Started SSE subscription and slot timer")

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
    # In production mode, serve static files
    app.mount("/", StaticFiles(directory=REACT_APP_PATH, html=True), name="static")

if __name__ == "__main__":
    print(f"Running in {MODE} mode")
    uvicorn.run(app, host=HOST, port=PORT)