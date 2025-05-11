import aiohttp
import asyncio
import json
import logging
import time
from datetime import datetime
from typing import Dict, Optional

class SlotClient:
    """Client for fetching slot data from ethpandaops lab"""
    
    def __init__(self):
        self.base_url = "https://lab-api.primary.production.platform.ethpandaops.io/lab-data/api/labapi.LabAPI/GetSlotData"
        self.network = "mainnet"
        self.latest_slot_data = None
        self.last_update_time = 0
        self.update_interval = 12  # 12 seconds (3 slots)
        self.headers = {
            'accept': '*/*',
            'accept-language': 'en-US,en;q=0.9',
            'cache-control': 'no-cache',
            'origin': 'https://lab.ethpandaops.io',
            'pragma': 'no-cache',
            'referer': 'https://lab.ethpandaops.io/',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
        }
    
    def calculate_current_slot(self) -> int:
        """Calculate the current slot based on time since genesis"""
        # Ethereum mainnet genesis timestamp: 1606824023 (Dec 1, 2020, 12:00:23 PM UTC)
        genesis_time = 1606824023
        slot_time = 12  # 12 seconds per slot
        
        current_time = int(time.time())
        seconds_since_genesis = current_time - genesis_time
        
        current_slot = seconds_since_genesis // slot_time
        return current_slot
    
    async def get_slot_data(self, slot: Optional[int] = None) -> Dict:
        """Fetch slot data from ethpandaops lab"""
        current_time = time.time()
        
        # Check if we need to update (either first time or update interval passed)
        if (self.latest_slot_data is None or 
            current_time - self.last_update_time > self.update_interval):
            
            # Calculate current slot if not provided
            if slot is None:
                # Get slot from 3 slots ago to ensure data is available
                slot = self.calculate_current_slot() - 3
            
            try:
                # Prepare the message parameter for the API call
                message = json.dumps({
                    "network": self.network,
                    "slot": str(slot)
                })
                
                # Build the query URL with proper encoding
                url = f"{self.base_url}?connect=v1&encoding=json&message={message}"
                
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, headers=self.headers) as response:
                        if response.status == 200:
                            response_data = await response.json()
                            if 'data' in response_data and response_data['data'] is not None:
                                # Store the response data
                                self.latest_slot_data = response_data['data']
                                self.last_update_time = current_time
                                logging.info(f"Updated slot data for slot {slot}")
                            else:
                                logging.error(f"Invalid response format or empty data: {response_data}")
                        else:
                            logging.error(f"Failed to fetch slot data: {response.status}")
            
            except Exception as e:
                logging.error(f"Error fetching slot data: {e}")
        
        return self.latest_slot_data if self.latest_slot_data else {}
    
    def get_cached_slot_data(self) -> Dict:
        """Return the cached slot data without making a new request"""
        return self.latest_slot_data if self.latest_slot_data else {}