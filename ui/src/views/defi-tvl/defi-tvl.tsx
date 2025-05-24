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
      {/* Large TVL Display */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
      }}>
        <div style={{
          color: '#00ff88',
          fontSize: '12px',
          fontFamily: '"Pixelify Sans", monospace',
          fontWeight: 'bold',
          marginBottom: '2px',
        }}>
          ${(totalTvl / 1e9).toFixed(0)}B
        </div>
        <div style={{
          color: '#888',
          fontSize: '8px',
          fontFamily: '"Pixelify Sans", monospace',
        }}>
          ETH DEFI
        </div>
      </div>


      {/* Top Protocol */}
      {protocols.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '2px',
          left: '2px',
          color: '#aaa',
          fontSize: '6px',
          fontFamily: '"Pixelify Sans", monospace',
        }}>
          #{protocols[0].name.slice(0, 6)}
        </div>
      )}
    </BaseLayout>
  );
}

export default DefiTvl;