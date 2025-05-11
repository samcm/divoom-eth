import React, { useEffect, useState } from 'react';
import axios from 'axios';
import BaseLayout from '../../components/BaseLayout';

interface BlockData {
  slot: number;
  execution_payload_block_hash?: string;
}

interface ProposerData {
  slot?: number;
  proposer_validator_index?: number;
}

interface WinningBid {
  relay_name?: string;
  value?: string;
  slot_time?: number;
  builder_pubkey?: string;
}

interface SlotData {
  slot?: number;
  block?: BlockData;
  proposer?: ProposerData;
  entity?: string;
  arrival_times?: {
    min_arrival_time?: number;
  };
  winning_bid?: WinningBid;
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

  const formatEthValue = (value?: string) => {
    if (!value) return '0';
    
    // Value is likely a large integer string representing wei
    try {
      // Convert to ETH (divide by 10^18) and format to 4 decimal places
      const valueInWei = BigInt(value);
      const eth = Number(valueInWei) / 1e18;
      
      if (eth < 0.01) {
        return `${eth.toFixed(4)} ETH`;
      } else {
        return `${eth.toFixed(2)} ETH`;
      }
    } catch (error) {
      return value;
    }
  };

  return (
    <BaseLayout title="SLOT">
      {slotData && !slotData.error ? (
        <div style={{
          position: 'absolute',
          top: '15px',
          left: '2px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1px',
          lineHeight: '11px',
          fontSize: '8px',
          fontFamily: '"Pixelify Sans", monospace',
          whiteSpace: 'pre',
          color: '#00ff00'
        }}>
          <div>
            #{slotData.slot}
          </div>
          
          {/* Proposer entity */}
          <div>
            {slotData.entity || 'unknown'}
          </div>
          
          {/* Bid value */}
          {slotData.winning_bid && (
            <div>
              {formatEthValue(slotData.winning_bid.value)}
            </div>
          )}
          
          {/* Arrival time */}
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