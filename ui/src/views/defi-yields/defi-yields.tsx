import React, { useEffect, useState } from 'react';
import axios from 'axios';
import BaseLayout from '../../components/BaseLayout';

interface YieldPool {
  protocol: string;
  symbol: string;
  apy: number;
  tvl_usd: number;
  stable: boolean;
}

function DefiYields() {
  const [selectedYield, setSelectedYield] = useState<YieldPool | null>(null);
  const [loading, setLoading] = useState(true);

  const baseUrl = window.location.origin;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/defillama/yields`);
        const data = response.data || [];
        
        // Filter out unrealistic APYs (over 1000% are likely farming rewards or bugs)
        const filteredYields = data.filter((pool: YieldPool) => pool.apy > 0 && pool.apy < 1000);
        
        // Pick a random yield from top 10 reasonable yields
        if (filteredYields.length > 0) {
          const topYields = filteredYields.slice(0, 10);
          const randomYield = topYields[Math.floor(Math.random() * topYields.length)];
          setSelectedYield(randomYield);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch yields data:', error);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 120000); // 2 min refresh
    return () => clearInterval(interval);
  }, [baseUrl]);

  if (loading) {
    return (
      <BaseLayout title="DeFi Yields">
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#888',
          fontSize: '8px',
          fontFamily: '"Pixelify Sans", monospace',
        }}>
          Loading...
        </div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout title="DeFi Yields">
      {/* Large APY Display */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
      }}>
        <div style={{
          color: '#ffff00',
          fontSize: '12px',
          fontFamily: '"Pixelify Sans", monospace',
          fontWeight: 'bold',
          marginBottom: '2px',
        }}>
          {selectedYield ? selectedYield.apy.toFixed(1) : '0.0'}%
        </div>
        <div style={{
          color: '#888',
          fontSize: '8px',
          fontFamily: '"Pixelify Sans", monospace',
        }}>
          TOP APY
        </div>
      </div>


      {/* Random Protocol */}
      {selectedYield && (
        <div style={{
          position: 'absolute',
          bottom: '2px',
          left: '0px',
          right: '0px',
          color: '#aaa',
          fontSize: '6px',
          fontFamily: '"Pixelify Sans", monospace',
          textAlign: 'center',
          backgroundColor: 'rgba(0,0,0,0.3)',
          padding: '1px 2px',
        }}>
          {selectedYield.protocol.slice(0, 8)} • {selectedYield.symbol.slice(0, 4)}
        </div>
      )}
    </BaseLayout>
  );
}

export default DefiYields;