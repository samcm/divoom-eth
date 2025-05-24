"""
DeFiLlama API client for fetching Ethereum DeFi protocol data.

This module provides an async client for accessing DeFiLlama's open API
to retrieve TVL, yield, and volume data for Ethereum DeFi protocols.
"""

import httpx
import asyncio
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


@dataclass
class ProtocolData:
    """Data structure for DeFi protocol information."""
    name: str
    tvl: float
    change_1d: float
    chain: str
    category: str
    logo: str


@dataclass
class YieldPool:
    """Data structure for yield/APY pool information."""
    protocol: str
    symbol: str
    apy: float
    tvl_usd: float
    stable: bool


@dataclass
class DexData:
    """Data structure for DEX volume information."""
    name: str
    volume_24h: float
    change_24h: float
    fees_24h: float


class DeFiLlamaClient:
    """
    Async client for DeFiLlama API with caching and error handling.
    
    Provides methods to fetch Ethereum DeFi data including:
    - Protocol TVL data
    - Yield/APY opportunities  
    - DEX volume and trading data
    """
    
    def __init__(self):
        """Initialize the DeFiLlama client with default configuration."""
        self.base_url = "https://api.llama.fi"
        self.client = httpx.AsyncClient(timeout=30.0)
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._cache_duration = {
            "protocols": timedelta(minutes=5),
            "yields": timedelta(minutes=2),
            "volumes": timedelta(minutes=1)
        }
    
    def _get_cached(self, key: str) -> Optional[Any]:
        """
        Retrieve cached data if it exists and hasn't expired.
        
        Args:
            key: Cache key to look up
            
        Returns:
            Cached data if valid, None if expired or missing
        """
        if key not in self._cache:
            return None
            
        cache_entry = self._cache[key]
        cache_time = cache_entry.get("timestamp")
        cache_duration = self._cache_duration.get(key.split("_")[0], timedelta(minutes=5))
        
        if cache_time and datetime.now() - cache_time < cache_duration:
            return cache_entry.get("data")
            
        # Cache expired, remove it
        del self._cache[key]
        return None
    
    def _set_cache(self, key: str, data: Any) -> None:
        """
        Store data in cache with timestamp.
        
        Args:
            key: Cache key to store under
            data: Data to cache
        """
        self._cache[key] = {
            "data": data,
            "timestamp": datetime.now()
        }
    
    async def get_ethereum_protocols(self) -> List[ProtocolData]:
        """
        Get top Ethereum DeFi protocols by TVL.
        
        Returns:
            List of ProtocolData objects sorted by TVL (highest first)
        """
        cached = self._get_cached("protocols_eth")
        if cached:
            return cached
            
        try:
            response = await self.client.get(f"{self.base_url}/protocols")
            response.raise_for_status()
            protocols = response.json()
            
            # Filter for Ethereum protocols
            eth_protocols = []
            for p in protocols:
                chains = p.get('chains', [])
                if not isinstance(chains, list):
                    continue
                    
                # Check if protocol supports Ethereum
                if 'Ethereum' in chains or 'ethereum' in [c.lower() for c in chains]:
                    tvl_val = p.get('tvl')
                    change_val = p.get('change_1d')
                    
                    # Skip protocols with invalid data
                    if tvl_val is None or change_val is None:
                        continue
                        
                    protocol_data = ProtocolData(
                        name=p.get('name', 'Unknown'),
                        tvl=float(tvl_val),
                        change_1d=float(change_val),
                        chain='ethereum',
                        category=p.get('category', 'Unknown'),
                        logo=p.get('logo', '')
                    )
                    eth_protocols.append(protocol_data)
            
            # Sort by TVL and take top 10
            eth_protocols.sort(key=lambda x: x.tvl, reverse=True)
            result = eth_protocols[:10]
            
            self._set_cache("protocols_eth", result)
            logger.info(f"Fetched {len(result)} Ethereum protocols")
            return result
            
        except Exception as e:
            logger.error(f"Failed to fetch Ethereum protocols: {e}")
            return []
    
    async def get_top_yields(self) -> List[YieldPool]:
        """
        Get top yield opportunities on Ethereum.
        
        Returns:
            List of YieldPool objects sorted by APY (highest first)
        """
        cached = self._get_cached("yields_eth")
        if cached:
            return cached
            
        try:
            # Use the yields API endpoint from DeFiLlama docs
            response = await self.client.get("https://yields.llama.fi/pools")
            response.raise_for_status()
            data = response.json()
            
            pools_data = data.get('data', [])
            if not isinstance(pools_data, list):
                logger.warning("Unexpected pools data format")
                return []
            
            # Filter for Ethereum pools with good APY
            eth_pools = []
            for pool in pools_data:
                if not isinstance(pool, dict):
                    continue
                    
                chain = pool.get('chain', '').lower()
                apy = pool.get('apy')
                tvl_usd = pool.get('tvlUsd', 0)
                
                # Filter for Ethereum pools with valid data
                if (chain == 'ethereum' and 
                    isinstance(apy, (int, float)) and apy > 0 and
                    isinstance(tvl_usd, (int, float)) and tvl_usd > 100000):  # Min $100k TVL
                    
                    yield_pool = YieldPool(
                        protocol=pool.get('project', ''),
                        symbol=pool.get('symbol', ''),
                        apy=float(apy),
                        tvl_usd=float(tvl_usd),
                        stable=bool(pool.get('stablecoin', False))
                    )
                    eth_pools.append(yield_pool)
            
            # Sort by APY and take top 8
            eth_pools.sort(key=lambda x: x.apy, reverse=True)
            result = eth_pools[:8]
            
            self._set_cache("yields_eth", result)
            logger.info(f"Fetched {len(result)} Ethereum yield pools")
            return result
            
        except Exception as e:
            logger.error(f"Failed to fetch Ethereum yields: {e}")
            return []
    
    async def get_dex_volumes(self) -> List[DexData]:
        """
        Get DEX volume data for Ethereum.
        
        Returns:
            List of DexData objects sorted by 24h volume (highest first)
        """
        cached = self._get_cached("volumes_eth")
        if cached:
            return cached
            
        try:
            response = await self.client.get(f"{self.base_url}/overview/dexs/ethereum")
            response.raise_for_status()
            data = response.json()
            
            protocols = data.get('protocols', [])
            if not isinstance(protocols, list):
                logger.warning("Unexpected DEX data format")
                return []
            
            # Process DEX data
            dex_data = []
            for dex in protocols:
                if not isinstance(dex, dict):
                    continue
                    
                volume_24h = dex.get('total24h')
                change_24h = dex.get('change_1d')
                fees_24h = dex.get('totalAllTime', 0) * 0.01  # Estimate daily fees
                
                if (isinstance(volume_24h, (int, float)) and volume_24h > 0 and
                    isinstance(change_24h, (int, float))):
                    
                    dex_info = DexData(
                        name=dex.get('name', 'Unknown'),
                        volume_24h=float(volume_24h),
                        change_24h=float(change_24h),
                        fees_24h=float(fees_24h)
                    )
                    dex_data.append(dex_info)
            
            # Sort by volume and take top 6
            dex_data.sort(key=lambda x: x.volume_24h, reverse=True)
            result = dex_data[:6]
            
            self._set_cache("volumes_eth", result)
            logger.info(f"Fetched {len(result)} Ethereum DEX volumes")
            return result
            
        except Exception as e:
            logger.error(f"Failed to fetch DEX volumes: {e}")
            return []
    
    async def close(self):
        """Close the HTTP client connection."""
        await self.client.aclose()
    
    def __del__(self):
        """Cleanup on object destruction."""
        try:
            if hasattr(self, 'client'):
                asyncio.create_task(self.client.aclose())
        except Exception:
            pass  # Ignore cleanup errors