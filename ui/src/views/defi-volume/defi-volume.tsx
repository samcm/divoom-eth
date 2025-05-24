import React, { useEffect, useState } from 'react';
import axios from 'axios';
import BaseLayout from '../../components/BaseLayout';

interface DexData {
  name: string;
  volume_24h: number;
  change_24h: number;
  fees_24h: number;
}

function DefiVolume() {
  const [dexes, setDexes] = useState<DexData[]>([]);
  const [totalVolume, setTotalVolume] = useState(0);
  const [totalFees, setTotalFees] = useState(0);
  const [loading, setLoading] = useState(true);

  const baseUrl = window.location.origin;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/defillama/volumes`);
        const data = response.data || [];
        
        setDexes(data.slice(0, 5)); // Top 5 for space
        setTotalVolume(data.reduce((sum: number, dex: DexData) => sum + dex.volume_24h, 0));
        setTotalFees(data.reduce((sum: number, dex: DexData) => sum + dex.fees_24h, 0));
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch volume data:', error);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 90000); // 1.5 min refresh
    return () => clearInterval(interval);
  }, [baseUrl]);

  if (loading) {
    return (
      <BaseLayout title="DEX Volume">
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
    <BaseLayout title="DEX Volume">
      <div style={{
        width: '100%',
        height: '54px',
        position: 'relative',
        top: '2px',
      }}>
        {/* Total Volume Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '8px',
          backgroundColor: 'rgba(150, 0, 150, 0.3)',
          padding: '0 1px',
          marginBottom: '1px',
        }}>
          <span style={{
            color: 'rgb(200, 100, 255)',
            fontSize: '7px',
            fontFamily: '"Pixelify Sans", monospace',
          }}>
            24h Vol
          </span>
          <span style={{
            color: 'rgb(100, 255, 255)',
            fontSize: '7px',
            fontFamily: '"Pixelify Sans", monospace',
            fontWeight: 'bold',
          }}>
            ${(totalVolume / 1e9).toFixed(1)}B
          </span>
        </div>
        
        {/* DEX Volume List */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1px',
          height: '36px',
          overflow: 'hidden',
        }}>
          {dexes.map((dex, idx) => (
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
                maxWidth: '22px',
              }}>
                <div style={{
                  width: '2px',
                  height: '1px',
                  borderRadius: '1px',
                  background: 'linear-gradient(to right, rgb(150, 100, 255), rgb(100, 255, 255))',
                }} />
                <span style={{
                  color: '#fff',
                  fontSize: '7px',
                  fontFamily: '"Pixelify Sans", monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '18px',
                }}>
                  {dex.name.slice(0, 7)}
                </span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1px',
              }}>
                <span style={{
                  color: 'rgb(100, 255, 255)',
                  fontSize: '7px',
                  fontFamily: '"Pixelify Sans", monospace',
                  minWidth: '14px',
                  textAlign: 'right',
                }}>
                  ${(dex.volume_24h / 1e6).toFixed(0)}M
                </span>
                <span style={{
                  color: dex.change_24h >= 0 ? 'rgb(100, 255, 100)' : 'rgb(255, 100, 100)',
                  fontSize: '6px',
                  fontFamily: '"Pixelify Sans", monospace',
                  minWidth: '12px',
                  textAlign: 'right',
                }}>
                  {dex.change_24h >= 0 ? '+' : ''}{dex.change_24h.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
        
        {/* Fees Summary */}
        <div style={{
          marginTop: '1px',
          textAlign: 'center',
          height: '6px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <span style={{
            color: 'rgb(150, 150, 150)',
            fontSize: '6px',
            fontFamily: '"Pixelify Sans", monospace',
          }}>
            Total Fees: ${(totalFees / 1e6).toFixed(1)}M
          </span>
        </div>
      </div>
    </BaseLayout>
  );
}

export default DefiVolume;