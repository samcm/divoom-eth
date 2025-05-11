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
        return `${eth.toFixed(4)}Ξ`;
      } else {
        return `${eth.toFixed(2)}Ξ`;
      }
    } catch (error) {
      return value;
    }
  };

  // Create the background grid layout
  const renderGrid = () => {
    const cells = [];
    
    // Add horizontal lines
    for (let y = 16; y < 64; y += 16) {
      for (let x = 0; x < 64; x++) {
        cells.push(
          <div
            key={`h-${y}-${x}`}
            style={{
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
              width: '1px',
              height: '1px',
              backgroundColor: '#222222',
            }}
          />
        );
      }
    }
    
    // Add vertical lines
    for (let x = 0; x < 64; x += 16) {
      for (let y = 0; y < 64; y++) {
        cells.push(
          <div
            key={`v-${x}-${y}`}
            style={{
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
              width: '1px',
              height: '1px',
              backgroundColor: '#222222',
            }}
          />
        );
      }
    }
    
    return cells;
  };

  // Render the arrival time bar
  const renderArrivalBar = (time?: number) => {
    if (!time) return null;
    
    const MAX_TIME = 2000;
    const barWidth = Math.min(60, Math.floor((time / MAX_TIME) * 60));
    const barY = 58;
    
    const pixels = [];
    
    // Bar background
    for (let i = 2; i <= 62; i++) {
      pixels.push(
        <div 
          key={`bar-bg-${i}`}
          style={{
            position: 'absolute',
            left: `${i}px`,
            top: `${barY}px`,
            width: '1px',
            height: '3px',
            backgroundColor: '#222222'
          }}
        />
      );
    }
    
    // Bar fill - color gradient based on speed
    for (let i = 2; i < 2 + barWidth; i++) {
      // Calculate a gradient from green to red
      const progress = (i - 2) / 60;
      // Use HSL where hue 120 is green, 60 is yellow, 0 is red
      const hue = 120 - (progress * 120);
      
      pixels.push(
        <div 
          key={`bar-fill-${i}`}
          style={{
            position: 'absolute',
            left: `${i}px`,
            top: `${barY}px`,
            width: '1px',
            height: '3px',
            backgroundColor: `hsl(${hue}, 100%, 50%)`
          }}
        />
      );
    }
    
    return pixels;
  };

  return (
    <BaseLayout title="SLOT">
      {slotData && !slotData.error ? (
        <>
          {/* Background grid */}
          {renderGrid()}
          
          {/* Slot number - dominant element */}
          <div style={{
            position: 'absolute',
            top: '18px',
            left: '2px',
            right: '2px',
            textAlign: 'center',
            fontSize: '12px',
            fontFamily: '"Pixelify Sans", monospace',
            color: '#00ff00',
            fontWeight: 'bold',
          }}>
            {slotData.slot}
          </div>
          
          {/* Entity - second most important */}
          <div style={{
            position: 'absolute',
            top: '30px',
            left: '2px',
            right: '2px',
            textAlign: 'center',
            fontSize: '9px',
            fontFamily: '"Pixelify Sans", monospace',
            color: '#ffffff',
          }}>
            {slotData.entity || 'unknown'}
          </div>
          
          {/* Bid value - if available */}
          {slotData.winning_bid?.value && (
            <div style={{
              position: 'absolute',
              top: '40px',
              left: '2px',
              right: '2px',
              textAlign: 'center',
              fontSize: '9px',
              fontFamily: '"Pixelify Sans", monospace',
              color: '#ffaa00',
            }}>
              {formatEthValue(slotData.winning_bid.value)}
            </div>
          )}
          
          {/* Label for arrival time */}
          <div style={{
            position: 'absolute',
            bottom: '8px',
            left: '2px',
            right: '2px',
            textAlign: 'center',
            fontSize: '8px',
            fontFamily: '"Pixelify Sans", monospace',
            color: '#00aaff',
          }}>
            {getArrivalTime(slotData.arrival_times?.min_arrival_time)}
          </div>
          
          {/* Arrival time bar */}
          {renderArrivalBar(slotData.arrival_times?.min_arrival_time)}
        </>
      ) : (
        <div style={{
          position: 'absolute',
          top: '25px',
          left: '5px',
          right: '5px',
          textAlign: 'center',
          color: '#ff0000',
          fontSize: '8px',
          fontFamily: '"Pixelify Sans", monospace',
        }}>
          {slotData?.error || 'NO DATA'}
        </div>
      )}
    </BaseLayout>
  );
}

export default SlotView;