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
  execution_payload_base_fee_per_gas?: number;
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

  const getArrivalColor = (time?: number) => {
    if (!time) return '#ffffff';
    if (time < 100) return '#00ff00';
    if (time < 300) return '#88ff00';
    if (time < 500) return '#ffff00';
    if (time < 1000) return '#ffaa00';
    return '#ff0000';
  };

  const getGasColor = (utilPercent: number) => {
    if (utilPercent < 20) return '#00ff00';
    if (utilPercent < 40) return '#88ff00';
    if (utilPercent < 60) return '#ffff00';
    if (utilPercent < 80) return '#ffaa00';
    return '#ff0000';
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

  const renderGasUtilizationBar = () => {
    const utilPercent = getGasUtilization();
    const barWidth = Math.floor((utilPercent / 100) * 30); // Max width 30px
    const pixels = [];
    
    // Background bar
    for (let i = 0; i < 30; i++) {
      pixels.push(renderPixel(i + 32, 35, '#333333'));
    }
    
    // Filled bar
    for (let i = 0; i < barWidth; i++) {
      pixels.push(renderPixel(i + 32, 35, getGasColor(utilPercent)));
    }
    
    return pixels;
  };

  const renderArrivalTimeIndicator = () => {
    const arrivalTime = slotData?.arrival_times?.min_arrival_time;
    if (!arrivalTime) return null;
    
    // Normalize arrival time to 0-30 range for visualization
    // 0-1500ms is typical range for block propagation
    const normalizedValue = Math.min(30, Math.floor((arrivalTime / 1500) * 30));
    const pixels = [];
    
    // Background bar
    for (let i = 0; i < 30; i++) {
      pixels.push(renderPixel(i + 32, 45, '#333333'));
    }
    
    // Filled bar
    for (let i = 0; i < normalizedValue; i++) {
      pixels.push(renderPixel(i + 32, 45, getArrivalColor(arrivalTime)));
    }
    
    return pixels;
  };

  // Create a simple animated beacon
  const [beaconPhase, setBeaconPhase] = useState(0);
  
  useEffect(() => {
    const beaconInterval = setInterval(() => {
      setBeaconPhase(prev => (prev + 1) % 6);
    }, 500);
    
    return () => clearInterval(beaconInterval);
  }, []);
  
  const renderBeacon = () => {
    const centerX = 56;
    const centerY = 56;
    const pixels = [];
    
    // Draw the center dot
    pixels.push(renderPixel(centerX, centerY, '#ffffff'));
    
    // Draw pulsing rings
    if (beaconPhase > 0) {
      // First ring
      pixels.push(renderPixel(centerX - 1, centerY, '#aaaaaa'));
      pixels.push(renderPixel(centerX + 1, centerY, '#aaaaaa'));
      pixels.push(renderPixel(centerX, centerY - 1, '#aaaaaa'));
      pixels.push(renderPixel(centerX, centerY + 1, '#aaaaaa'));
    }
    
    if (beaconPhase > 1) {
      // Second ring
      pixels.push(renderPixel(centerX - 2, centerY, '#888888'));
      pixels.push(renderPixel(centerX + 2, centerY, '#888888'));
      pixels.push(renderPixel(centerX, centerY - 2, '#888888'));
      pixels.push(renderPixel(centerX, centerY + 2, '#888888'));
      
      // Diagonals
      pixels.push(renderPixel(centerX - 1, centerY - 1, '#888888'));
      pixels.push(renderPixel(centerX + 1, centerY - 1, '#888888'));
      pixels.push(renderPixel(centerX - 1, centerY + 1, '#888888'));
      pixels.push(renderPixel(centerX + 1, centerY + 1, '#888888'));
    }
    
    if (beaconPhase > 2) {
      // Third ring
      pixels.push(renderPixel(centerX - 3, centerY, '#666666'));
      pixels.push(renderPixel(centerX + 3, centerY, '#666666'));
      pixels.push(renderPixel(centerX, centerY - 3, '#666666'));
      pixels.push(renderPixel(centerX, centerY + 3, '#666666'));
      
      pixels.push(renderPixel(centerX - 2, centerY - 1, '#666666'));
      pixels.push(renderPixel(centerX - 1, centerY - 2, '#666666'));
      pixels.push(renderPixel(centerX + 1, centerY - 2, '#666666'));
      pixels.push(renderPixel(centerX + 2, centerY - 1, '#666666'));
      
      pixels.push(renderPixel(centerX - 2, centerY + 1, '#666666'));
      pixels.push(renderPixel(centerX - 1, centerY + 2, '#666666'));
      pixels.push(renderPixel(centerX + 1, centerY + 2, '#666666'));
      pixels.push(renderPixel(centerX + 2, centerY + 1, '#666666'));
    }
    
    if (beaconPhase > 3) {
      // Fourth ring (fading)
      const color = '#444444';
      pixels.push(renderPixel(centerX - 4, centerY, color));
      pixels.push(renderPixel(centerX + 4, centerY, color));
      pixels.push(renderPixel(centerX, centerY - 4, color));
      pixels.push(renderPixel(centerX, centerY + 4, color));
    }
    
    if (beaconPhase > 4) {
      // Fifth ring (fading more)
      const color = '#222222';
      pixels.push(renderPixel(centerX - 5, centerY, color));
      pixels.push(renderPixel(centerX + 5, centerY, color));
      pixels.push(renderPixel(centerX, centerY - 5, color));
      pixels.push(renderPixel(centerX, centerY + 5, color));
    }
    
    return pixels;
  };

  return (
    <BaseLayout title="SLOT">
      <SlotHistory />
      
      {slotData && !slotData.error ? (
        <>
          <div style={{
            position: 'absolute',
            top: '15px',
            left: '2px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0px',
            lineHeight: '5px'
          }}>
            <div style={{
              fontSize: '6px',
              fontFamily: '"Pixelify Sans", monospace',
              whiteSpace: 'pre',
              marginBottom: '3px',
            }}>
              <span style={{ color: '#ff66ff' }}>SLOT:</span>
              <span style={{ color: '#ffffff', marginLeft: '2px' }}>
                {slotData.slot}
              </span>
            </div>
            <div style={{
              fontSize: '6px',
              fontFamily: '"Pixelify Sans", monospace',
              whiteSpace: 'pre',
              marginBottom: '3px',
            }}>
              <span style={{ color: '#66ffff' }}>EPOCH:</span>
              <span style={{ color: '#ffffff', marginLeft: '2px' }}>
                {slotData.block?.epoch || 'N/A'}
              </span>
            </div>
            <div style={{
              fontSize: '6px',
              fontFamily: '"Pixelify Sans", monospace',
              whiteSpace: 'pre',
              marginBottom: '3px',
            }}>
              <span style={{ color: '#ffff66' }}>VAL:</span>
              <span style={{ color: '#ffffff', marginLeft: '2px' }}>
                {slotData.proposer?.proposer_validator_index || slotData.block?.proposer_index || 'N/A'}
              </span>
            </div>
            <div style={{
              fontSize: '6px',
              fontFamily: '"Pixelify Sans", monospace',
              whiteSpace: 'pre',
              marginBottom: '3px',
            }}>
              <span style={{ color: '#66ff66' }}>TXS:</span>
              <span style={{ color: '#ffffff', marginLeft: '2px' }}>
                {slotData.block?.execution_payload_transactions_count || 'N/A'}
              </span>
            </div>
          </div>
          
          {/* Gas Utilization Label */}
          <div style={{
            position: 'absolute',
            top: '30px',
            left: '2px',
            fontSize: '6px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
            color: '#ff6666',
          }}>
            GAS:
          </div>
          
          {/* Gas Utilization Percentage */}
          <div style={{
            position: 'absolute',
            top: '32px',
            left: '20px',
            fontSize: '5px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
            color: getGasColor(getGasUtilization()),
          }}>
            {getGasUtilization()}%
          </div>
          
          {/* Gas Bar */}
          {renderGasUtilizationBar()}
          
          {/* Arrival Time Label */}
          <div style={{
            position: 'absolute',
            top: '40px',
            left: '2px',
            fontSize: '6px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
            color: '#6666ff',
          }}>
            ARR:
          </div>
          
          {/* Arrival Time Value */}
          <div style={{
            position: 'absolute',
            top: '42px',
            left: '20px',
            fontSize: '5px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
            color: getArrivalColor(slotData.arrival_times?.min_arrival_time),
          }}>
            {getArrivalTime(slotData.arrival_times?.min_arrival_time)}
          </div>
          
          {/* Arrival Time Bar */}
          {renderArrivalTimeIndicator()}
          
          {/* Entity Label */}
          <div style={{
            position: 'absolute',
            top: '50px',
            left: '2px',
            fontSize: '6px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
            color: '#ffaa66',
          }}>
            ENT:
          </div>
          
          {/* Entity Value */}
          <div style={{
            position: 'absolute',
            top: '50px',
            left: '20px',
            fontSize: '5px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
            color: '#ffffff',
          }}>
            {slotData.entity || 'unknown'}
          </div>
          
          {/* Animated Beacon */}
          {renderBeacon()}
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