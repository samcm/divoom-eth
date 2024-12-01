# l2_metrics.py
import asyncio
import aiohttp
import json
import logging
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)

@dataclass
class L2Metrics:
    name: str
    tps: float
    gas_used: int
    last_updated: datetime

class L2MetricsTracker:
    def __init__(self):
        self.metrics: Dict[str, L2Metrics] = {}
        self.total_tps: float = 0
        self.total_gas: int = 0
        self._session: Optional[aiohttp.ClientSession] = None
        self._is_connected: bool = False

    async def start(self):
        if self._session:
            logger.info("L2 metrics tracker already started")
            return
            
        logger.info("Starting L2 metrics tracker")
        self._session = aiohttp.ClientSession()
        asyncio.create_task(self._stream_metrics())

    async def stop(self):
        if self._session:
            logger.info("Stopping L2 metrics tracker")
            await self._session.close()
            self._session = None
            self._is_connected = False

    def get_top_l2s(self, count: int = 10) -> List[L2Metrics]:
        sorted_l2s = sorted(
            self.metrics.values(),
            key=lambda x: x.tps,
            reverse=True
        )
        return sorted_l2s[:count]

    def get_connection_status(self) -> bool:
        return self._is_connected

    async def _stream_metrics(self):
        headers = {
            'accept': 'text/event-stream',
            'accept-language': 'en-US,en;q=0.9',
            'origin': 'https://rollup.wtf',
            'priority': 'u=1, i',
            'referer': 'https://rollup.wtf/',
            'sec-ch-ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors', 
            'sec-fetch-site': 'cross-site',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
        }

        while True:
            try:
                logger.info("Connecting to L2 metrics stream...")
                async with self._session.get(
                    'https://tracker-api-gdesfolyga-uw.a.run.app/sse',
                    headers=headers
                ) as response:
                    if response.status == 200:
                        logger.info("Connected to L2 metrics stream")
                        self._is_connected = True
                        
                        async for line in response.content:
                            line = line.decode('utf-8').strip()
                            if line.startswith('event:'):
                                chain_name = line[6:].strip()
                            elif line.startswith('data:'):
                                data = json.loads(line[5:])
                                self._process_metrics(chain_name, data)
                    else:
                        logger.error(f"Failed to connect to L2 metrics stream: {response.status}")
                        self._is_connected = False
                        
            except aiohttp.ClientError as e:
                logger.error(f"Connection error in L2 metrics stream: {e}")
                self._is_connected = False
            except Exception as e:
                logger.error(f"Unexpected error in L2 metrics stream: {e}")
                self._is_connected = False
            
            # Wait before reconnecting
            await asyncio.sleep(30)

    def _process_metrics(self, chain_name: str, data: Dict):
        try:
            tps = float(data.get('tps', 0))
            gas = int(data.get('gasCount', 0))
            
            self.metrics[chain_name] = L2Metrics(
                name=chain_name,
                tps=tps,
                gas_used=gas,
                last_updated=datetime.now()
            )
            
            # Recalculate totals
            self.total_tps = sum(m.tps for m in self.metrics.values())
            self.total_gas = sum(m.gas_used for m in self.metrics.values())
            
            logger.debug(f"Updated metrics for {chain_name}. Total TPS: {self.total_tps:.2f}, Total Gas: {self.total_gas}")
        except Exception as e:
            logger.error(f"Error processing L2 metrics for {chain_name}: {e}")