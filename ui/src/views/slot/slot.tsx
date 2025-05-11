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

    // Initial fetch
    fetchData();
    
    // Set up interval for every 12 seconds (typical slot time)
    const interval = setInterval(fetchData, 12000);
    
    // Clean up interval on component unmount
    return () => clearInterval(interval);
  }, [baseUrl]); // Only recreate when baseUrl changes
  
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

  const renderPixel = (x: number, y: number, color: string) => {
    return (
      <div
        key={`${x}-${y}`}
        style={{
          position: 'absolute',
          left: `${x}px`,
          top: `${y}px`,
          width: '1px',
          height: '1px',
          backgroundColor: color,
        }}
      />
    );
  };

  const renderArrivalTimeBar = (time?: number) => {
    if (!time) return null;
    
    // Scale 0-2000ms to 0-50px
    const MAX_TIME = 2000;
    const normalizedValue = Math.min(50, Math.floor((time / MAX_TIME) * 50));
    
    const pixels = [];
    
    // Background bar
    for (let i = 0; i < 50; i++) {
      pixels.push(renderPixel(i + 10, 45, '#222222'));
    }
    
    // Time bar with color based on speed
    for (let i = 0; i < normalizedValue; i++) {
      // Gradient from green to red based on time
      const hue = Math.floor(120 - (i / 50) * 120);
      pixels.push(renderPixel(i + 10, 45, `hsl(${hue}, 100%, 50%)`));
    }
    
    return pixels;
  };

  return (
    <BaseLayout title="SLOT">
      {slotData && !slotData.error ? (
        <>
          <div style={{
            position: 'absolute',
            top: '15px',
            left: '5px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1px',
            lineHeight: '12px',
            fontSize: '8px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
            color: '#00ff00'
          }}>
            {/* Slot number */}
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
          
          {/* Arrival time bar visualization */}
          {renderArrivalTimeBar(slotData.arrival_times?.min_arrival_time)}
        </>
      ) : (
        <div style={{
          position: 'absolute',
          top: '25px',
          left: '5px',
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