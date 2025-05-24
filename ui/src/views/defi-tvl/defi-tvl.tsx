import React, { useEffect, useState } from 'react';
import axios from 'axios';
import BaseLayout from '../../components/BaseLayout';

interface ProtocolData {
  name: string;
  tvl: number;
  change_1d: number;
  category: string;
}

function DefiTvl() {
  const [protocols, setProtocols] = useState<ProtocolData[]>([]);
  const [totalTvl, setTotalTvl] = useState(0);
  const [loading, setLoading] = useState(true);

  const baseUrl = window.location.origin;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/defillama/protocols`);
        const data = response.data || [];
        
        setProtocols(data.slice(0, 6)); // Top 6 for space
        setTotalTvl(data.reduce((sum: number, p: ProtocolData) => sum + p.tvl, 0));
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch DeFi data:', error);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // 1 min refresh
    return () => clearInterval(interval);
  }, [baseUrl]);

  if (loading) {
    return (
      <BaseLayout title="DeFi TVL">
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
    <BaseLayout title="DeFi TVL">
      <div style={{
        width: '100%',
        height: '54px', // Reserve space for title
        position: 'relative',
        top: '2px',
      }}>
        {/* Total TVL Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '8px',
          backgroundColor: 'rgba(0, 100, 200, 0.3)',
          padding: '0 1px',
          marginBottom: '1px',
        }}>
          <span style={{
            color: 'rgb(100, 150, 255)',
            fontSize: '7px',
            fontFamily: '"Pixelify Sans", monospace',
          }}>
            ETH TVL
          </span>
          <span style={{
            color: 'rgb(100, 255, 100)',
            fontSize: '7px',
            fontFamily: '"Pixelify Sans", monospace',
            fontWeight: 'bold',
          }}>
            ${(totalTvl / 1e9).toFixed(1)}B
          </span>
        </div>
        
        {/* Protocol List */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1px',
          height: '44px',
          overflow: 'hidden',
        }}>
          {protocols.map((protocol, idx) => (
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
                maxWidth: '30px',
              }}>
                <div style={{
                  width: '2px',
                  height: '1px',
                  borderRadius: '1px',
                  background: 'linear-gradient(to right, rgb(100, 150, 255), rgb(150, 100, 255))',
                }} />
                <span style={{
                  color: '#fff',
                  fontSize: '7px',
                  fontFamily: '"Pixelify Sans", monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '26px',
                }}>
                  {protocol.name.slice(0, 8)}
                </span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1px',
              }}>
                <span style={{
                  color: 'rgb(200, 200, 200)',
                  fontSize: '7px',
                  fontFamily: '"Pixelify Sans", monospace',
                }}>
                  ${(protocol.tvl / 1e9).toFixed(1)}B
                </span>
                <span style={{
                  color: protocol.change_1d >= 0 ? 'rgb(100, 255, 100)' : 'rgb(255, 100, 100)',
                  fontSize: '6px',
                  fontFamily: '"Pixelify Sans", monospace',
                  minWidth: '12px',
                  textAlign: 'right',
                }}>
                  {protocol.change_1d >= 0 ? '+' : ''}{protocol.change_1d.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </BaseLayout>
  );
}

export default DefiTvl;