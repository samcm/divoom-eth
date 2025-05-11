import React, { useEffect, useState } from 'react';
import axios from 'axios';
import BaseLayout from '../../components/BaseLayout';

interface BlockData {
  slot: number;
  execution_payload_block_hash?: string;
  execution_payload_gas_used?: number;
  execution_payload_gas_limit?: number;
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
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const baseUrl = window.location.origin;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/slot`);
        
        // Store previous bid value for comparison
        if (slotData?.winning_bid?.value && response.data?.winning_bid?.value !== slotData.winning_bid.value) {
          setPreviousValue(slotData.winning_bid.value);
        }
        
        setSlotData(response.data);
      } catch (error) {
        console.error('Error fetching slot data:', error);
        setSlotData({ error: 'Failed to fetch data' });
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 12000); // Every slot
    return () => clearInterval(interval);
  }, [baseUrl, slotData]);
  
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

  const getComparisonColor = (current?: string, previous?: string | null) => {
    if (!current || !previous) return '#00ff00';
    
    try {
      const currentValue = BigInt(current);
      const previousValue = BigInt(previous);
      
      if (currentValue > previousValue) {
        return '#00ff00'; // Green for higher
      } else if (currentValue < previousValue) {
        return '#ff0000'; // Red for lower
      } else {
        return '#ffffff'; // White for equal
      }
    } catch (error) {
      return '#00ff00';
    }
  };

  const renderBidValueBar = (value?: string) => {
    if (!value) return null;
    
    try {
      // Convert to ETH and determine a reasonable scale
      const valueInWei = BigInt(value);
      const valueInEth = Number(valueInWei) / 1e18;
      
      // Scale for visualization (adjust based on typical values)
      // Typically bids might range from 0.01 to 0.5 ETH
      const MAX_EXPECTED_VALUE = 0.5; // ETH 
      const barWidth = Math.min(50, Math.floor((valueInEth / MAX_EXPECTED_VALUE) * 50));
      
      const pixels = [];
      
      // Background bar
      for (let i = 0; i < 50; i++) {
        pixels.push(renderPixel(i + 10, 35, '#222222'));
      }
      
      // Value bar
      for (let i = 0; i < barWidth; i++) {
        // Gradient from green to yellow based on size
        const hue = Math.floor(120 - (i / barWidth) * 60);
        pixels.push(renderPixel(i + 10, 35, `hsl(${hue}, 100%, 50%)`));
      }
      
      return pixels;
    } catch (error) {
      return null;
    }
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

  // Pulsing animation for the slot number
  const [pulseState, setPulseState] = useState(0);
  
  useEffect(() => {
    const pulseInterval = setInterval(() => {
      setPulseState(prev => (prev + 1) % 10);
    }, 200);
    
    return () => clearInterval(pulseInterval);
  }, []);

  const renderPulsingBorder = () => {
    if (!slotData?.slot) return null;
    
    const pixels = [];
    const color = pulseState > 5 ? '#00ff00' : '#009900';
    
    // Top border
    for (let x = 0; x < 62; x++) {
      pixels.push(renderPixel(x + 1, 1, color));
    }
    
    // Bottom border
    for (let x = 0; x < 62; x++) {
      pixels.push(renderPixel(x + 1, 62, color));
    }
    
    // Left border
    for (let y = 0; y < 62; y++) {
      pixels.push(renderPixel(1, y + 1, color));
    }
    
    // Right border
    for (let y = 0; y < 62; y++) {
      pixels.push(renderPixel(62, y + 1, color));
    }
    
    return pixels;
  };

  // Create a sparkling effect for the entity name
  const [sparklePositions, setSparklePositions] = useState<Array<{x: number, y: number}>>([]);
  
  useEffect(() => {
    const sparkleInterval = setInterval(() => {
      // Generate random sparkle positions
      const newPositions = [];
      for (let i = 0; i < 3; i++) { // 3 sparkles at a time
        newPositions.push({
          x: Math.floor(Math.random() * 60) + 2,
          y: Math.floor(Math.random() * 15) + 25 // Around the entity name area
        });
      }
      setSparklePositions(newPositions);
    }, 300);
    
    return () => clearInterval(sparkleInterval);
  }, []);

  const renderSparkles = () => {
    return sparklePositions.map((pos, index) => 
      renderPixel(pos.x, pos.y, '#ffff00')
    );
  };

  // Render patterns based on slot number
  const renderSlotPattern = () => {
    if (!slotData?.slot) return null;
    
    const pixels = [];
    const slotNumber = slotData.slot;
    
    // Generate a deterministic pattern based on slot number
    const seed = slotNumber % 100; // Use last two digits for variety
    
    for (let i = 0; i < 10; i++) {
      const x = ((seed * 7 + i * 13) % 56) + 4; // Pseudorandom but deterministic position
      const y = ((seed * 11 + i * 17) % 8) + 52; // At bottom of screen
      
      // Color determined by position
      const hue = (x + y + seed) % 360;
      pixels.push(renderPixel(x, y, `hsl(${hue}, 100%, 50%)`));
    }
    
    return pixels;
  };

  return (
    <BaseLayout title="SLOT">
      {slotData && !slotData.error ? (
        <>
          {/* Pulsing border */}
          {renderPulsingBorder()}
          
          {/* Slot number */}
          <div style={{
            position: 'absolute',
            top: '15px',
            left: '5px',
            fontSize: '10px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
            color: '#00ff00',
            fontWeight: 'bold'
          }}>
            #{slotData.slot}
          </div>
          
          {/* Entity display with background */}
          <div style={{
            position: 'absolute',
            top: '27px',
            left: '5px',
            right: '5px',
            padding: '2px',
            backgroundColor: '#222222',
            borderRadius: '1px',
          }}>
            <div style={{
              fontSize: '8px',
              fontFamily: '"Pixelify Sans", monospace',
              whiteSpace: 'pre',
              color: '#ffffff',
              textAlign: 'center'
            }}>
              {slotData.entity || 'unknown'}
            </div>
          </div>
          
          {/* Sparkles around entity */}
          {renderSparkles()}
          
          {/* Bid value label */}
          <div style={{
            position: 'absolute',
            top: '38px',
            left: '4px',
            fontSize: '6px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
            color: '#ffaa00'
          }}>
            BID:
          </div>
          
          {/* Bid value */}
          {slotData.winning_bid && (
            <div style={{
              position: 'absolute',
              top: '38px',
              left: '22px',
              fontSize: '6px',
              fontFamily: '"Pixelify Sans", monospace',
              whiteSpace: 'pre',
              color: getComparisonColor(slotData.winning_bid.value, previousValue)
            }}>
              {formatEthValue(slotData.winning_bid.value)}
            </div>
          )}
          
          {/* Bid value bar chart */}
          {renderBidValueBar(slotData.winning_bid?.value)}
          
          {/* Arrival time label */}
          <div style={{
            position: 'absolute',
            top: '48px',
            left: '4px',
            fontSize: '6px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
            color: '#00aaff'
          }}>
            ARR:
          </div>
          
          {/* Arrival time */}
          <div style={{
            position: 'absolute',
            top: '48px',
            left: '22px',
            fontSize: '6px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
            color: '#00aaff'
          }}>
            {getArrivalTime(slotData.arrival_times?.min_arrival_time)}
          </div>
          
          {/* Arrival time bar */}
          {renderArrivalTimeBar(slotData.arrival_times?.min_arrival_time)}
          
          {/* Slot-based pattern visualization */}
          {renderSlotPattern()}
        </>
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