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
      <div style={{
        width: '100%',
        height: '54px',
        position: 'relative',
        top: '2px',
      }}>
        {/* Average APY Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '8px',
          backgroundColor: 'rgba(0, 150, 0, 0.3)',
          padding: '0 1px',
          marginBottom: '1px',
        }}>
          <span style={{
            color: 'rgb(100, 255, 100)',
            fontSize: '7px',
            fontFamily: '"Pixelify Sans", monospace',
          }}>
            Avg APY
          </span>
          <span style={{
            color: 'rgb(255, 255, 100)',
            fontSize: '7px',
            fontFamily: '"Pixelify Sans", monospace',
            fontWeight: 'bold',
          }}>
            {avgApy.toFixed(1)}%
          </span>
        </div>
        
        {/* Yields List */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1px',
          height: '44px',
          overflow: 'hidden',
        }}>
          {yields.map((pool, idx) => (
            <div key={idx} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              height: '7px',
              padding: '0 1px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1px',
                overflow: 'hidden',
                maxWidth: '24px',
              }}>
                {pool.stable && (
                  <div style={{
                    width: '1px',
                    height: '1px',
                    borderRadius: '50%',
                    backgroundColor: 'rgb(100, 150, 255)',
                  }} />
                )}
                <span style={{
                  color: '#fff',
                  fontSize: '7px',
                  fontFamily: '"Pixelify Sans", monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '16px',
                }}>
                  {pool.protocol.slice(0, 6)}
                </span>
                <span style={{
                  color: 'rgb(150, 150, 150)',
                  fontSize: '6px',
                  fontFamily: '"Pixelify Sans", monospace',
                  maxWidth: '6px',
                  overflow: 'hidden',
                }}>
                  {pool.symbol.slice(0, 3)}
                </span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1px',
              }}>
                <span style={{
                  color: 'rgb(255, 255, 100)',
                  fontSize: '7px',
                  fontFamily: '"Pixelify Sans", monospace',
                  fontWeight: 'bold',
                  minWidth: '16px',
                  textAlign: 'right',
                }}>
                  {pool.apy.toFixed(1)}%
                </span>
                <span style={{
                  color: 'rgb(150, 150, 150)',
                  fontSize: '6px',
                  fontFamily: '"Pixelify Sans", monospace',
                  minWidth: '8px',
                  textAlign: 'right',
                }}>
                  ${(pool.tvl_usd / 1e6).toFixed(1)}M
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </BaseLayout>
  );
}

export default DefiYields;