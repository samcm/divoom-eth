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
  const [yields, setYields] = useState<YieldPool[]>([]);
  const [avgApy, setAvgApy] = useState(0);
  const [loading, setLoading] = useState(true);

  const baseUrl = window.location.origin;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/defillama/yields`);
        const data = response.data || [];
        
        setYields(data.slice(0, 6)); // Top 6 for space
        
        // Calculate average APY
        if (data.length > 0) {
          const totalApy = data.reduce((sum: number, pool: YieldPool) => sum + pool.apy, 0);
          setAvgApy(totalApy / data.length);
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
          {yields.length > 0 ? yields[0].apy.toFixed(1) : avgApy.toFixed(1)}%
        </div>
        <div style={{
          color: '#888',
          fontSize: '8px',
          fontFamily: '"Pixelify Sans", monospace',
        }}>
          TOP APY
        </div>
      </div>


      {/* Top Protocol */}
      {yields.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '2px',
          left: '2px',
          color: '#aaa',
          fontSize: '6px',
          fontFamily: '"Pixelify Sans", monospace',
        }}>
          {yields[0].protocol.slice(0, 6)}
        </div>
      )}
    </BaseLayout>
  );
}

export default DefiYields;