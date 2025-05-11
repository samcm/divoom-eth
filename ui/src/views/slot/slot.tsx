import React, { useEffect, useState } from 'react';
import axios from 'axios';
import BaseLayout from '../../components/BaseLayout';
import SlotHistory from '../../components/SlotHistory';

interface BlockData {
  slot: number;
  slot_start_date_time?: string;
  epoch?: number;
  proposer_index?: number;
  execution_payload_transactions_count?: number;
}

interface ProposerData {
  slot?: number;
  proposer_validator_index?: number;
}

interface SlotData {
  slot?: number;
  network?: string;
  processed_at?: string;
  block?: BlockData;
  proposer?: ProposerData;
  entity?: string;
  nodes_count?: number;
  arrival_times?: {
    min_arrival_time?: number;
    max_arrival_time?: number;
    nodes_count?: number;
  };
  error?: string;
}

function SlotView() {
  const [slotData, setSlotData] = useState<SlotData | null>(null);
  const baseUrl = window.location.origin;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/slot`);
        setSlotData(response.data);
      } catch (error) {
        console.error('Error fetching slot data:', error);
        setSlotData({ error: 'Failed to fetch data' });
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 12000); // Every slot
    return () => clearInterval(interval);
  }, [baseUrl]);
  
  const getArrivalTime = (time?: number) => {
    if (!time) return 'N/A';
    return `${time}ms`;
  };

  return (
    <BaseLayout title="SLOT">
      <SlotHistory />
      
      {slotData && !slotData.error ? (
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
            <span style={{ color: '#888888' }}>SLOT: </span>
            <span style={{ color: '#00ff00' }}>
              {slotData.slot}
            </span>
          </div>
          <div style={{
            fontSize: '8px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
            marginBottom: '4px',
          }}>
            <span style={{ color: '#888888' }}>EPOCH: </span>
            <span style={{ color: '#00ff00' }}>
              {slotData.block?.epoch || 'N/A'}
            </span>
          </div>
          <div style={{
            fontSize: '8px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
            marginBottom: '4px',
          }}>
            <span style={{ color: '#888888' }}>VAL: </span>
            <span style={{ color: '#00ff00' }}>
              {slotData.proposer?.proposer_validator_index || slotData.block?.proposer_index || 'N/A'}
            </span>
          </div>
          <div style={{
            fontSize: '8px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
            marginBottom: '4px',
          }}>
            <span style={{ color: '#888888' }}>ENT: </span>
            <span style={{ color: '#00ff00' }}>
              {slotData.entity || 'unknown'}
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
              {slotData.block?.execution_payload_transactions_count || 'N/A'}
            </span>
          </div>
          <div style={{
            fontSize: '8px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
          }}>
            <span style={{ color: '#888888' }}>ARR: </span>
            <span style={{ color: '#00ff00' }}>
              {getArrivalTime(slotData.arrival_times?.min_arrival_time)}
            </span>
          </div>
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
          {slotData?.error || 'NO DATA'}
        </div>
      )}
    </BaseLayout>
  );
}

export default SlotView;