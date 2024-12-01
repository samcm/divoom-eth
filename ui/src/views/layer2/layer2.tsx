import React, { useEffect, useState } from 'react';
import BaseLayout from '../../components/BaseLayout';

interface L2Data {
  name: string;
  tps: number;
  gas_used: number;
}

interface MetricsData {
  total_tps: number;
  total_gas: number;
  top_l2s: L2Data[];
  is_connected: boolean;
}

const COLORS = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FF8000',
  '#FF0080', '#80FF00', '#00FF80', '#8000FF', '#0080FF', '#FFB366', '#FF66B3',
  '#B3FF66', '#66FFB3', '#B366FF', '#66B3FF', '#FFCC00', '#FF00CC', '#CCFF00',
  '#00FFCC', '#CC00FF', '#00CCFF', '#FF3333', '#33FF33', '#3333FF', '#FFFF33',
  '#FF33FF', '#33FFFF', '#FF6666', '#66FF66', '#6666FF', '#FFFF66', '#FF66FF',
  '#66FFFF', '#FF9999', '#99FF99', '#9999FF', '#FFFF99', '#FF99FF', '#99FFFF',
  '#FFCCCC', '#CCFFCC', '#CCCCFF', '#FFFFCC', '#FFCCFF', '#CCFFFF', '#FFE5CC',
  '#CCE5FF'
];

function getColorForL2(name: string): string {
  // Hash the name to get a consistent index
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % COLORS.length;
  return COLORS[index];
}

export default function L2Metrics() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/l2metrics');
        const data = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error('Failed to fetch L2 metrics:', error);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!metrics) {
    return <BaseLayout title="L2">Loading...</BaseLayout>;
  }
  return (
    <BaseLayout title="L2 TPS">
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '2px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        lineHeight: '8px'
      }}>
        {metrics.top_l2s.slice(0,4).map((l2) => (
          <div key={l2.name} style={{
            color: getColorForL2(l2.name),
            fontSize: '8px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
            width: '60px',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>{l2.name.split('-')[0].slice(0,5)}</span>
            <span>{Math.round(l2.tps)}</span>
          </div>
        ))}
        <div style={{
          color: '#00ff00',
          fontSize: '8px',
          fontFamily: '"Pixelify Sans", monospace',
          whiteSpace: 'pre',
          width: '60px',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>TOTAL</span>
          <span>{Math.round(metrics.total_tps)}</span>
        </div>
      </div>
    </BaseLayout>
  );
}