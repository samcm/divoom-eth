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
  const [loading, setLoading] = useState(true);

  const baseUrl = window.location.origin;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/defillama/volumes`);
        const data = response.data || [];
        
        setDexes(data.slice(0, 5)); // Top 5 for space
        setTotalVolume(data.reduce((sum: number, dex: DexData) => sum + dex.volume_24h, 0));
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
      {/* Large Volume Display */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
      }}>
        <div style={{
          color: '#00ffff',
          fontSize: '12px',
          fontFamily: '"Pixelify Sans", monospace',
          fontWeight: 'bold',
          marginBottom: '2px',
        }}>
          ${(totalVolume / 1e9).toFixed(1)}B
        </div>
        <div style={{
          color: '#888',
          fontSize: '8px',
          fontFamily: '"Pixelify Sans", monospace',
        }}>
          24H VOL
        </div>
      </div>

      {/* Volume Icon */}
      <div style={{
        position: 'absolute',
        bottom: '2px',
        right: '2px',
        width: '12px',
        height: '12px',
        backgroundColor: '#00ffff',
        borderRadius: '2px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          color: '#000',
          fontSize: '8px',
          fontFamily: '"Pixelify Sans", monospace',
          fontWeight: 'bold',
        }}>
          $
        </div>
      </div>

      {/* Top DEX */}
      {dexes.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '2px',
          left: '2px',
          color: '#aaa',
          fontSize: '6px',
          fontFamily: '"Pixelify Sans", monospace',
        }}>
          {dexes[0].name.slice(0, 6)}
        </div>
      )}
    </BaseLayout>
  );
}

export default DefiVolume;