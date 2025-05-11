import aiohttp
import asyncio
import json
import logging
import time
from datetime import datetime
from typing import Dict, List, Optional, Any

class SlotClient:
    """Client for fetching slot data from ethpandaops lab"""

    def __init__(self):
        self.base_url = "https://lab-api.primary.production.platform.ethpandaops.io/lab-data/api/labapi.LabAPI/GetSlotData"
        self.network = "mainnet"
        self.latest_slot_data = None
        self.last_update_time = 0
        self.update_interval = 12  # 12 seconds (3 slots)
        self.slot_payloads = []  # List to store last N slot payloads
        self.max_history = 16   # Maximum number of slots to keep
        self.headers = {
            'accept': '*/*',
            'accept-language': 'en-US,en;q=0.9',
            'cache-control': 'no-cache',
            'origin': 'https://lab.ethpandaops.io',
            'pragma': 'no-cache',
            'referer': 'https://lab.ethpandaops.io/',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
        }
        # Start background fetch task
        self.fetch_task = None
        
    async def start(self):
        """Start background fetching task"""
        if self.fetch_task is None:
            self.fetch_task = asyncio.create_task(self._background_fetch())
            logging.info("Started slot data background fetch task")
    
    async def stop(self):
        """Stop background fetching task"""
        if self.fetch_task:
            self.fetch_task.cancel()
            try:
                await self.fetch_task
            except asyncio.CancelledError:
                pass
            self.fetch_task = None
            logging.info("Stopped slot data background fetch task")
    
    async def _background_fetch(self):
        """Background task to periodically fetch slot data"""
        while True:
            try:
                # Calculate current slot - 3 to ensure data is available
                slot = self.calculate_current_slot() - 3
                await self._fetch_slot_data(slot)
            except Exception as e:
                logging.error(f"Error in background fetch: {e}")
            
            # Wait for next update interval
            await asyncio.sleep(self.update_interval)
    
    def calculate_current_slot(self) -> int:
        """Calculate the current slot based on time since genesis"""
        # Ethereum mainnet genesis timestamp: 1606824023 (Dec 1, 2020, 12:00:23 PM UTC)
        genesis_time = 1606824023
        slot_time = 12  # 12 seconds per slot
        
        current_time = int(time.time())
        seconds_since_genesis = current_time - genesis_time
        
        current_slot = seconds_since_genesis // slot_time
        return current_slot
    
    async def get_slot_data(self) -> Dict:
        """
        Return the cached slot data without fetching.
        This is the API endpoint method that clients will call.
        """
        return self.latest_slot_data if self.latest_slot_data else {}
    
    async def _fetch_slot_data(self, slot: int) -> Dict:
        """
        Internal method to fetch slot data from ethpandaops lab.
        This updates our internal cache but doesn't return anything.
        """
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
                            new_slot_data = response_data['data']

                            # Only add to history if it's a new slot
                            if (self.latest_slot_data is None or
                                new_slot_data.get('slot') != self.latest_slot_data.get('slot')):
                                
                                # Clean entity name for display
                                if 'entity' in new_slot_data and new_slot_data['entity']:
                                    new_slot_data['entity'] = self._clean_entity_name(new_slot_data['entity'])

                                # Store the complete payload
                                self.slot_payloads.append(new_slot_data)
                                
                                # Keep only the most recent N payloads
                                if len(self.slot_payloads) > self.max_history:
                                    self.slot_payloads.pop(0)  # Remove oldest entry

                            # Store the full response data
                            self.latest_slot_data = new_slot_data
                            self.last_update_time = time.time()
                            logging.info(f"Updated slot data for slot {slot}")
                        else:
                            logging.error(f"Invalid response format or empty data: {response_data}")
                    else:
                        logging.error(f"Failed to fetch slot data: {response.status}")

        except Exception as e:
            logging.error(f"Error fetching slot data: {e}")
        
        return self.latest_slot_data if self.latest_slot_data else {}
    
    def _clean_entity_name(self, entity: str) -> str:
        """Clean up entity name for display"""
        if not entity:
            return "unknown"
            
        # Remove common prefixes/suffixes for cleaner display
        entity = entity.replace("validators", "").replace("Validators", "")
        entity = entity.replace("staking", "").replace("Staking", "")
        
        # Capitalize properly
        if len(entity) <= 3:  # Keep acronyms uppercase
            entity = entity.upper()
        else:
            entity = entity.title()
        
        # Trim if too long for display
        if len(entity) > 10:
            entity = entity[:9] + "."
            
        return entity
    
    def _extract_bid_value(self, slot_data: Dict) -> Optional[str]:
        """Extract the winning bid value from slot data"""
        try:
            block_hash = slot_data.get("block", {}).get("execution_payload_block_hash")
            relay_bids = slot_data.get("relay_bids", {})

            if block_hash and relay_bids:
                for relay_name, relay_data in relay_bids.items():
                    bids = relay_data.get("bids", [])
                    for bid in bids:
                        if bid.get("block_hash") == block_hash:
                            return bid.get("value")
        except Exception as e:
            logging.error(f"Error extracting bid value: {e}")
            
        return None
    
    def _extract_arrival_times(self, slot_data: Dict) -> Dict:
        """Extract arrival time information from slot data"""
        arrival_times = {}
        try:
            if "timings" in slot_data and slot_data["timings"] is not None:
                block_seen = slot_data.get("timings", {}).get("block_seen", {})
                if block_seen and len(block_seen) > 0:
                    arrival_values = []
                    for val in block_seen.values():
                        try:
                            if isinstance(val, str) and val.isdigit():
                                arrival_values.append(int(val))
                            elif isinstance(val, (int, float)):
                                arrival_values.append(int(val))
                            elif isinstance(val, str):
                                # Try to handle string representations of floats
                                cleaned_val = val.strip().replace(',', '')
                                if cleaned_val.replace('.', '', 1).isdigit():
                                    arrival_values.append(int(float(cleaned_val)))
                        except (ValueError, TypeError):
                            continue

                    if arrival_values:
                        # Filter out extreme outliers (more than 3x median)
                        arrival_values.sort()
                        median_idx = len(arrival_values) // 2
                        median = arrival_values[median_idx]
                        filtered_values = [v for v in arrival_values if v < median * 3]

                        if filtered_values:
                            arrival_times = {
                                "fastest_time": min(filtered_values),
                                "slowest_time": max(filtered_values),
                                "nodes_count": len(arrival_values)  # Keep original count for reference
                            }
        except Exception as e:
            logging.error(f"Error processing arrival times: {e}")
            
        return arrival_times
    
    def get_slot_history(self) -> List[Dict]:
        """
        Return the slot history constructed from stored payloads.
        Each history entry contains the slot, entity, bid value, and arrival times.
        """
        history = []
        
        # Process each payload to extract only what we need for the frontend
        for payload in self.slot_payloads:
            slot_number = payload.get("slot")
            entity = payload.get("entity", "unknown")
            
            # Extract bid value
            bid_value = self._extract_bid_value(payload)
            
            # Extract arrival times
            arrival_times = self._extract_arrival_times(payload)
            
            # Add to history
            history.append({
                "slot": slot_number,
                "entity": entity,
                "bid_value": bid_value,
                "arrival_times": arrival_times
            })
        
        # Sort by slot number (descending, newest first)
        history.sort(key=lambda x: x.get("slot", 0), reverse=True)
        
        return history