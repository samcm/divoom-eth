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
    fastest_time?: number;
    slowest_time?: number;
    nodes_count?: number;
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

  // Render the arrival time bar
  const renderArrivalBar = (time?: number) => {
    if (!time) return null;
    
    const MAX_TIME = 2000;
    const barWidth = Math.min(58, Math.floor((time / MAX_TIME) * 58));
    const barY = 52;
    
    const pixels = [];
    
    // Bar background - thicker bar (2px height)
    for (let i = 3; i <= 61; i++) {
      pixels.push(
        <div 
          key={`bar-bg-${i}`}
          style={{
            position: 'absolute',
            left: `${i}px`,
            top: `${barY}px`,
            width: '1px',
            height: '4px',
            backgroundColor: '#111111'
          }}
        />
      );
    }
    
    // Bar fill - color gradient based on speed
    for (let i = 3; i < 3 + barWidth; i++) {
      // Calculate a gradient from green to red
      const progress = (i - 3) / 58;
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
            height: '4px',
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
          {/* Black background to ensure cleaner look */}
          <div style={{
            position: 'absolute',
            top: '0px',
            left: '0px',
            width: '64px',
            height: '64px',
            backgroundColor: '#000000',
            zIndex: -1
          }}/>
          
          {/* Slot number - dominant element */}
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '0px',
            width: '64px',
            textAlign: 'center',
            fontSize: '14px',
            fontFamily: '"Pixelify Sans", monospace',
            color: '#00ff00',
            fontWeight: 'bold',
            lineHeight: '14px'
          }}>
            {slotData.slot}
          </div>
          
          {/* Entity - second most important */}
          <div style={{
            position: 'absolute',
            top: '32px',
            left: '0px',
            width: '64px',
            textAlign: 'center',
            fontSize: '8px',
            fontFamily: '"Pixelify Sans", monospace',
            color: '#ffffff',
            lineHeight: '8px'
          }}>
            {slotData.entity || 'unknown'}
          </div>
          
          {/* Bid value - if available */}
          {slotData.winning_bid?.value && (
            <div style={{
              position: 'absolute',
              top: '42px',
              left: '0px',
              width: '64px',
              textAlign: 'center',
              fontSize: '8px',
              fontFamily: '"Pixelify Sans", monospace',
              color: '#ffaa00',
              lineHeight: '8px'
            }}>
              {formatEthValue(slotData.winning_bid.value)}
            </div>
          )}
          
          {/* Arrival time bar */}
          {renderArrivalBar(slotData.arrival_times?.fastest_time)}

          {/* Label for arrival time */}
          <div style={{
            position: 'absolute',
            bottom: '3px',
            left: '0px',
            width: '64px',
            textAlign: 'center',
            fontSize: '7px',
            fontFamily: '"Pixelify Sans", monospace',
            color: '#00aaff',
          }}>
            {getArrivalTime(slotData.arrival_times?.fastest_time)}
          </div>
        </>
      ) : (
        <div style={{
          position: 'absolute',
          top: '25px',
          left: '0px',
          width: '64px',
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