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
  execution_payload_gas_used?: number;
  execution_payload_gas_limit?: number;
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

  const getGasUtilization = () => {
    if (!slotData?.block?.execution_payload_gas_used || !slotData?.block?.execution_payload_gas_limit) {
      return 0;
    }
    return Math.floor((slotData.block.execution_payload_gas_used / slotData.block.execution_payload_gas_limit) * 100);
  };

  return (
    <BaseLayout title="SLOT">
      <SlotHistory />
      
      {slotData && !slotData.error ? (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '2px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0px',
          lineHeight: '9px',
          fontSize: '8px',
          fontFamily: '"Pixelify Sans", monospace',
          whiteSpace: 'pre',
          color: '#00ff00'
        }}>
          <div>
            {slotData.slot}
          </div>
          <div>
            {slotData.block?.epoch || 'N/A'}
          </div>
          <div>
            {slotData.block?.execution_payload_transactions_count || 'N/A'} TX
          </div>
          <div>
            {getArrivalTime(slotData.arrival_times?.min_arrival_time)}
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