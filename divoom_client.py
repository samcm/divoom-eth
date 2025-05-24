import aiohttp
from typing import Dict
from PIL import Image
import io
import time

class DivoomClient:
    def __init__(self, api_endpoint: str, request_interval_seconds: int = 5):
        self.api_endpoint = api_endpoint
        self.request_interval_seconds = request_interval_seconds
        self.last_update = 0

    async def update_display(self, image_data: bytes, x: int = 0, y: int = 0, push_immediately: bool = True):
        now = time.time()
        if now - self.last_update < self.request_interval_seconds:
            return
            
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(image_data))
        
        # Crop to 64x64
        width, height = image.size
        # left = (width - 64) // 2
        # top = (height - 64) // 2
        # cropped = image.crop((left, top, left + 64, top + 64))
        
        # Convert back to bytes
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format='PNG')
        img_byte_arr = img_byte_arr.getvalue()

        async with aiohttp.ClientSession() as session:
            form_data = aiohttp.FormData()
            form_data.add_field('image', img_byte_arr)
            form_data.add_field('x', str(x))
            form_data.add_field('y', str(y))
            form_data.add_field('push_immediately', str(push_immediately).lower())
            
            async with session.post(f"{self.api_endpoint}/image", data=form_data) as response:
                if response.status != 200:
                    raise Exception(f"Failed to update Divoom display: {await response.text()}")
                self.last_update = now