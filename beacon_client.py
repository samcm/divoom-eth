import aiohttp
import asyncio
from typing import List, Dict, Callable, Any
import time
import json
from datetime import datetime
from collections import deque

class BeaconClient:
    def __init__(self, node_url: str):
        self.node_url = node_url
        self.config = None
        self.genesis = None
        self._event_listeners: Dict[str, List[Callable]] = {
            'head': [],
            'slot': []
        }
        # Changed from 12 to 16 slots
        self.block_arrival_times = deque(maxlen=16)
        # Cache duties by epoch
        self.duties_cache = {
            'proposer': {},  # epoch -> set of slots
            'attester': {},  # epoch -> set of slots
            'last_fetched_epoch': -1  # Track last fetched epoch
        }

    async def initialize(self):
        """Fetch config and genesis data on startup"""
        self.config = await self._fetch_config()
        self.genesis = await self._fetch_genesis()
        print(f"Slots per epoch: {self.config['data']['SLOTS_PER_EPOCH']}")

    async def _fetch_config(self):
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{self.node_url}/eth/v1/config/spec") as response:
                if response.status != 200:
                    raise Exception(f"Failed to fetch config: {await response.text()}")
                return await response.json()

    async def _fetch_genesis(self):
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{self.node_url}/eth/v1/beacon/genesis") as response:
                if response.status != 200:
                    raise Exception(f"Failed to fetch genesis: {await response.text()}")
                return await response.json()

    def calculate_current_slot(self) -> int:
        if not self.config or not self.genesis:
            raise Exception("BeaconClient not initialized. Call initialize() first")
        
        genesis_time = int(self.genesis['data']['genesis_time'])
        seconds_per_slot = int(self.config['data']['SECONDS_PER_SLOT'])
        
        current_time = int(time.time())
        return (current_time - genesis_time) // seconds_per_slot

    def get_epoch_data(self) -> Dict[str, int]:
        current_slot = self.calculate_current_slot()
        slots_per_epoch = int(self.config['data']['SLOTS_PER_EPOCH'])
        
        current_epoch = current_slot // slots_per_epoch
        current_epoch_start_slot = current_epoch * slots_per_epoch
        previous_epoch_start_slot = (current_epoch - 1) * slots_per_epoch
        
        return {
            'current_epoch': current_epoch,
            'current_epoch_start_slot': current_epoch_start_slot,
            'previous_epoch_start_slot': previous_epoch_start_slot,
            'slots_per_epoch': slots_per_epoch,
            'current_slot': current_slot
        }

    async def get_checkpoints(self):
        """Fetch current finalized and justified checkpoints"""
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{self.node_url}/eth/v1/beacon/states/head/finality_checkpoints") as response:
                if response.status != 200:
                    raise Exception(f"Failed to fetch checkpoints: {await response.text()}")
                return await response.json()

    async def update_duties(self, validator_indexes: List[str]):
        """Fetch and update proposer and attester duties"""
        epoch_data = self.get_epoch_data()
        current_epoch = epoch_data['current_epoch']
        
        # Check if we already have duties for current and next epoch
        epochs_to_fetch = []
        for epoch in [current_epoch, current_epoch + 1]:
            if (epoch not in self.duties_cache['proposer'] or 
                epoch not in self.duties_cache['attester']):
                epochs_to_fetch.append(epoch)

        if not epochs_to_fetch:
            # If we have all duties cached, just combine them
            self.duties = {
                'proposer': set().union(*[self.duties_cache['proposer'].get(e, set()) 
                                        for e in [current_epoch, current_epoch + 1]]),
                'attester': set().union(*[self.duties_cache['attester'].get(e, set()) 
                                        for e in [current_epoch, current_epoch + 1]])
            }
            return

        # Fetch duties for epochs we don't have
        async with aiohttp.ClientSession() as session:
            for epoch in epochs_to_fetch:
                # Initialize cache for this epoch
                if epoch not in self.duties_cache['proposer']:
                    self.duties_cache['proposer'][epoch] = set()
                if epoch not in self.duties_cache['attester']:
                    self.duties_cache['attester'][epoch] = set()

                # Fetch proposer duties
                url = f"{self.node_url}/eth/v1/validator/duties/proposer/{epoch}"
                async with session.get(url) as response:
                    if response.status == 200:
                        duties = await response.json()
                        for duty in duties.get('data', []):
                            if str(duty.get('validator_index')) in validator_indexes:
                                self.duties_cache['proposer'][epoch].add(int(duty.get('slot')))

                # Fetch attester duties
                url = f"{self.node_url}/eth/v1/validator/duties/attester/{epoch}"
                headers = {'Content-Type': 'application/json'}
                async with session.post(url, json=validator_indexes, headers=headers) as response:
                    if response.status == 200:
                        duties = await response.json()
                        for duty in duties.get('data', []):
                            self.duties_cache['attester'][epoch].add(int(duty.get('slot')))

        # Clean up old epochs
        for duty_type in ['proposer', 'attester']:
            self.duties_cache[duty_type] = {
                epoch: slots 
                for epoch, slots in self.duties_cache[duty_type].items() 
                if epoch >= current_epoch
            }

        # Combine current and next epoch duties
        self.duties = {
            'proposer': set().union(*[self.duties_cache['proposer'].get(e, set()) 
                                    for e in [current_epoch, current_epoch + 1]]),
            'attester': set().union(*[self.duties_cache['attester'].get(e, set()) 
                                    for e in [current_epoch, current_epoch + 1]])
        }

    async def get_slots(self, validator_indexes: List[str]):
        """Get slots from last 6 epochs and next epoch"""
        epoch_data = self.get_epoch_data()
        slots_per_epoch = int(self.config['data']['SLOTS_PER_EPOCH'])
        current_slot = epoch_data['current_slot']
        
        # Get slots from five epochs ago until next epoch
        start_slot = epoch_data['current_epoch_start_slot'] - (slots_per_epoch * 5)
        end_slot = epoch_data['current_epoch_start_slot'] + (slots_per_epoch * 2) - 1  # Include next epoch
        
        print(f"Processing slots from {start_slot} to {end_slot} (current slot: {current_slot})")
        
        # Fetch checkpoints
        checkpoints = await self.get_checkpoints()
        finalized_epoch = int(checkpoints['data']['finalized']['epoch'])
        justified_epoch = int(checkpoints['data']['current_justified']['epoch'])
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            for slot in range(start_slot, end_slot + 1):
                url = f"{self.node_url}/eth/v1/beacon/blocks/{slot}"
                tasks.append(self._check_slot(session, url, slot, current_slot))
            
            slots = await asyncio.gather(*tasks)
            
            # Update duties before returning slots
            await self.update_duties(validator_indexes)
            
            return {
                'slots': slots,
                'epoch_data': epoch_data,
                'checkpoints': {
                    'finalized': finalized_epoch,
                    'justified': justified_epoch
                },
                'duties': self.duties
            }

    async def _check_slot(self, session, url: str, slot: int, current_slot: int):
        """Check slot status and return appropriate state"""
        # Future slot
        if slot > current_slot:
            return {
                "slot": slot,
                "status": "upcoming"
            }
        
        # Current slot
        if slot == current_slot:
            try:
                async with session.get(url) as response:
                    if response.status == 404:
                        return {"slot": slot, "status": "pending"}
                    elif response.status == 200:
                        return {"slot": slot, "status": "proposed"}
                    else:
                        return {"slot": slot, "status": "pending"}
            except:
                return {"slot": slot, "status": "pending"}
        
        # Past slot
        try:
            async with session.get(url) as response:
                if response.status == 404:
                    # More than 2 slots old and missing
                    if current_slot - slot > 2:
                        return {"slot": slot, "status": "missing"}
                    # Recent missing slot
                    return {"slot": slot, "status": "pending"}
                elif response.status == 200:
                    return {"slot": slot, "status": "proposed"}
                else:
                    return {"slot": slot, "status": "missing"}
        except:
            return {"slot": slot, "status": "missing"}

    async def get_validator_status_summary(self, validator_indexes: List[str]) -> Dict:
        async with aiohttp.ClientSession() as session:
            tasks = []
            for validator_index in validator_indexes:
                url = f"{self.node_url}/eth/v1/beacon/states/head/validators/{validator_index}"
                tasks.append(self._fetch_validator_data(session, url))
            
            results = await asyncio.gather(*tasks)
            
            active_count = sum(
                1 for result in results 
                if result.get('data', {}).get('status') == 'active_ongoing'
            )
            
            return {
                'total': len(validator_indexes),
                'active': active_count
            }

    async def _fetch_validator_data(self, session, url: str):
        async with session.get(url) as response:
            if response.status != 200:
                return {"data": {"status": "unknown"}}
            return await response.json()

    def get_slot_start_time(self, slot: int) -> float:
        """Calculate the start time of a given slot"""
        if not self.config or not self.genesis:
            raise Exception("BeaconClient not initialized. Call initialize() first")
        
        genesis_time = int(self.genesis['data']['genesis_time'])
        seconds_per_slot = int(self.config['data']['SECONDS_PER_SLOT'])
        return genesis_time + (slot * seconds_per_slot)

    async def subscribe_to_head_events(self):
        """Subscribe to head events from the beacon node"""
        while True:
            try:
                async with aiohttp.ClientSession() as session:
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] Subscribing to head events")
                    async with session.get(
                        f"{self.node_url}/eth/v1/events?topics=head",
                        headers={'Accept': 'text/event-stream'}
                    ) as response:
                        async for line in response.content:
                            if line:
                                try:
                                    decoded = line.decode('utf-8').strip()
                                    if decoded.startswith('event:'):
                                        continue
                                    if decoded.startswith('data:'):
                                        data = json.loads(decoded[5:])
                                        now = time.time()
                                        slot = int(data.get('slot', 0))
                                        
                                        # Calculate arrival time (seconds since slot start)
                                        slot_start = self.get_slot_start_time(slot)
                                        arrival_time = now - slot_start
                                        
                                        # Store arrival time
                                        self.block_arrival_times.append({
                                            'slot': slot,
                                            'arrival_time': arrival_time
                                        })
                                        
                                        print(f"[{datetime.now().strftime('%H:%M:%S')}] Head event - Slot: {slot}, "
                                              f"Block: {data.get('block')[:8]}..., Arrival: {arrival_time:.2f}s")
                                        
                                        await self._notify_listeners('head', {
                                            **data,
                                            'arrival_time': arrival_time
                                        })
                                except Exception as e:
                                    print(f"Error processing event: {e}")
            except Exception as e:
                print(f"SSE connection error: {e}")
                await asyncio.sleep(5)  # Wait before reconnecting

    async def get_arrival_times(self):
        """Get the last 32 block arrival times"""
        return {
            'arrival_times': list(self.block_arrival_times),
            'seconds_per_slot': int(self.config['data']['SECONDS_PER_SLOT'])
        }

    def add_head_listener(self, callback: Callable[[Dict], Any]):
        """Add a listener for head events"""
        self._event_listeners['head'].append(callback)

    async def _notify_listeners(self, event_type: str, data: Dict):
        """Notify all listeners of a specific event type"""
        for listener in self._event_listeners.get(event_type, []):
            try:
                await listener(data)
            except Exception as e:
                print(f"Error in event listener: {e}")

    def get_next_slot_time(self) -> float:
        """Calculate the timestamp of the next slot"""
        if not self.config or not self.genesis:
            raise Exception("BeaconClient not initialized. Call initialize() first")
        
        genesis_time = int(self.genesis['data']['genesis_time'])
        seconds_per_slot = int(self.config['data']['SECONDS_PER_SLOT'])
        current_time = time.time()
        
        # Calculate the start time of the next slot
        current_slot = self.calculate_current_slot()
        next_slot_time = genesis_time + (current_slot + 1) * seconds_per_slot
        
        return next_slot_time

    async def start_slot_timer(self):
        """Start a timer to trigger events at the start of each slot"""
        while True:
            try:
                next_slot_time = self.get_next_slot_time()
                current_time = time.time()
                wait_time = next_slot_time - current_time
                
                if wait_time > 0:
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] Waiting {wait_time:.1f}s for next slot")
                    await asyncio.sleep(wait_time)
                
                # Notify slot listeners
                await self._notify_listeners('slot', {
                    'slot': self.calculate_current_slot(),
                    'timestamp': time.time()
                })
                
            except Exception as e:
                print(f"Error in slot timer: {e}")
                await asyncio.sleep(1)

    def add_slot_listener(self, callback: Callable[[Dict], Any]):
        """Add a listener for slot changes"""
        self._event_listeners['slot'].append(callback)