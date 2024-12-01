import React, { useEffect, useState } from 'react';
import axios from 'axios';
import BaseLayout from '../../components/BaseLayout';
import SlotHistory from '../../components/SlotHistory';

interface GasMetrics {
  latest: {
    base_fee: number;
    gas_used: number;
    gas_limit: number;
    utilization: number;
    tx_count: number;
    extra_data?: string;
  };
  total_tx: number;
  blocks_counted: number;
}

function GasView() {
  const [metrics, setMetrics] = useState<GasMetrics | null>(null);
  const baseUrl = window.location.origin;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/gas`);
        setMetrics(response.data);
      } catch (error) {
        console.error('Error fetching gas metrics:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 12000); // Every slot
    return () => clearInterval(interval);
  }, [baseUrl]);

  const formatGwei = (gwei: number) => {
    return gwei < 100 ? gwei.toFixed(1) : Math.round(gwei);
  };

  const formatGas = (gas: number) => {
    return `${Math.round(gas / 1000000)}M`;
  };

  const getFeeColor = (fee: number) => {
    if (fee < 10) return '#00ff00';
    if (fee < 25) return '#997700';
    if (fee < 50) return '#ff8800';
    return '#ff0000';
  };

  const getUtilColor = (util: number) => {
    if (util < 25) return '#00ff00';
    if (util < 50) return '#997700';
    if (util < 75) return '#ff8800';
    return '#ff0000';
  };

  return (
    <BaseLayout title="EXECUTION">
      <SlotHistory />
      
      {metrics ? (
        <div style={{
          position: 'absolute',
          top: '30px',
          left: '2px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0px',
          lineHeight: '5px'
        }}>
          <div style={{
            fontSize: '8px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
            marginBottom: '4px',
          }}>
            <span style={{ color: '#888888' }}>FEE: </span>
            <span style={{ color: getFeeColor(metrics.latest.base_fee) }}>
              {formatGwei(metrics.latest.base_fee)}
            </span>
          </div>
          <div style={{
            fontSize: '8px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
            marginBottom: '4px',
          }}>
            <span style={{ color: '#888888' }}>TXS: </span>
            <span style={{ color: '#00ff00' }}>
              {metrics.latest.tx_count}
            </span>
          </div>
          <div style={{
            fontSize: '8px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
            marginBottom: '4px',
          }}>
            <span style={{ color: '#888888' }}>GAS: </span>
            <span style={{ color: getUtilColor(metrics.latest.utilization) }}>
              {formatGas(metrics.latest.gas_used)}
            </span>
          </div>
          {metrics.latest.extra_data ? (
            <div style={{
              fontSize: '8px',
              fontFamily: '"Pixelify Sans", monospace',
              whiteSpace: 'pre',
            }}>
              <span style={{ color: '#888888' }}></span>
              <span style={{ color: '#ffffff' }}>
                {metrics.latest.extra_data.substring(0,9)}
              </span>
            </div>
          ) : (
            <div style={{
              fontSize: '8px',
              fontFamily: '"Pixelify Sans", monospace',
              whiteSpace: 'pre',
            }}>
              <span style={{ color: '#888888' }}>UTL: </span>
              <span style={{ color: getUtilColor(metrics.latest.utilization) }}>
                {metrics.latest.utilization}%
              </span>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          position: 'absolute',
          top: '25px',
          left: '2px',
          color: '#ff0000',
          fontSize: '8px',
          fontFamily: '"Pixelify Sans", monospace',
          whiteSpace: 'pre',
        }}>
          NO DATA
        </div>
      )}
    </BaseLayout>
  );
}

export default GasView; 