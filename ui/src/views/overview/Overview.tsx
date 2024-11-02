import React from 'react';
import { useEffect, useState } from 'react';
import axios from 'axios';

interface SlotData {
  slot: number;
  status: 'proposed' | 'missing' | 'pending' | 'upcoming';
}

interface EpochData {
  current_epoch: number;
  current_epoch_start_slot: number;
  previous_epoch_start_slot: number;
  slots_per_epoch: number;
  current_slot: number;
}

interface SlotsResponse {
  slots: SlotData[];
  epoch_data: EpochData;
  checkpoints: {
    finalized: number;
    justified: number;
  };
  duties: {
    proposer: number[];
    attester: number[];
  };
}

interface StatusResponse {
  total: number;
  active: number;
}

interface ArrivalTime {
  slot: number;
  arrival_time: number;
}

interface ArrivalTimesResponse {
  arrival_times: ArrivalTime[];
  seconds_per_slot: number;
}

function Overview() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [slotsData, setSlotsData] = useState<SlotsResponse | null>(null);
  const [arrivalTimes, setArrivalTimes] = useState<ArrivalTimesResponse | null>(null);

  // Get the base URL from the current window location
  const baseUrl = window.location.origin;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusResponse, slotsResponse, arrivalTimesResponse] = await Promise.all([
          axios.get(`${baseUrl}/api/status`),
          axios.get(`${baseUrl}/api/slots`),
          axios.get(`${baseUrl}/api/arrival-times`)
        ]);
        
        setStatus(statusResponse.data);
        setSlotsData(slotsResponse.data);
        setArrivalTimes(arrivalTimesResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [baseUrl]);

  const getSlotColor = (status: SlotData['status']) => {
    switch (status) {
      case 'proposed':
        return '#00ff00'; // Green
      case 'missing':
        return '#ff0000'; // Red
      case 'pending':
        return '#ffcc00'; // Yellow
      case 'upcoming':
        return '#444400'; // Dark yellow
      default:
        return '#000000';
    }
  };

  const renderSlots = () => {
    if (!slotsData) return null;

    const { slots, epoch_data, checkpoints, duties } = slotsData;
    const slots_per_epoch = epoch_data.slots_per_epoch;
    const start_slot = epoch_data.current_epoch_start_slot - (slots_per_epoch * 5);

    return (
      <React.Fragment>
        {slots.map((slot, index) => {
          // Calculate which epoch this slot belongs to (0-6, where 5 is current, 6 is next)
          const epochOffset = Math.floor((slot.slot - start_slot) / slots_per_epoch);
          const slotInEpoch = slot.slot % slots_per_epoch;
          const row = Math.floor(slotInEpoch / 32);
          const col = slotInEpoch % 32;
          
          // Calculate vertical position based on epoch
          const yOffset = epochOffset * 2;
          const baseTop = 12;

          // Calculate slot's epoch
          const slotEpoch = Math.floor(slot.slot / slots_per_epoch);
          
          // Determine if this slot is in a finalized or justified epoch
          const isFinalized = slotEpoch <= checkpoints.finalized;
          const isJustified = slotEpoch <= checkpoints.justified && !isFinalized;
          const isNextEpoch = slotEpoch > epoch_data.current_epoch;

          // Check if we have duties in this slot
          const hasProposerDuty = duties.proposer.includes(slot.slot);
          const hasAttesterDuty = duties.attester.includes(slot.slot);
          const hasDuty = hasProposerDuty;
          
          // Determine color based on status, finalization, and duties
          let color = getSlotColor(slot.status);
          if (slot.status === 'proposed') {
            if (isFinalized) {
              color = '#000088'; // Dark blue for finalized
            } else if (isJustified) {
              color = '#0088ff'; // Light blue for justified
            }
          } else if (slot.status === 'upcoming' && hasDuty) {
            color = '#ff00ff'; // Pink for upcoming slots with duties
          }
          
          // Calculate opacity
          const opacity = isNextEpoch ? 0.5 :  // Very dim for next epoch
            isFinalized ? 0.3 : 
            isJustified ? 1 : 
            epochOffset === 5 ? 1 : 
            epochOffset === 4 ? 0.9 : 
            epochOffset === 3 ? 0.7 : 
            epochOffset === 2 ? 0.5 : 
            epochOffset === 1 ? 0.3 : 0.1;
          
          return (
            <div
              key={`slot-${slot.slot}`}
              style={{
                position: 'absolute',
                top: `${baseTop + yOffset}px`,
                left: `${col * 2}px`,
                width: '2px',
                height: '2px',
                backgroundColor: color,
                opacity: hasDuty ? 1 : opacity, // Full opacity for slots with duties
              }}
            />
          );
        })}
      </React.Fragment>
    );
  };

  const renderArrivalTimes = () => {
    if (!arrivalTimes?.arrival_times.length) return null;

    const lastSixteen = arrivalTimes.arrival_times.slice(-16);
    const maxHeight = 20; // pixels
    const barWidth = 2;
    const spacing = 1;
    const lateThreshold = 4; // 4 seconds threshold

    return (
      <div style={{
        position: 'absolute',
        bottom: '11px',
        left: '0px',
        display: 'flex',
        alignItems: 'flex-end',
        gap: `${spacing}px`,
        height: `${maxHeight}px`,
      }}>
        {/* Late Threshold Line (4s) */}
        <div style={{
          position: 'absolute',
          left: '0',
          right: '0',
          height: '1px',
          backgroundColor: '#ffcc00',
          bottom: `${(4 / lateThreshold) * maxHeight}px`,
          opacity: 0.7,
        }} />

        {lastSixteen.map((at, index) => {
          const heightPercent = Math.min((at.arrival_time / lateThreshold) * 100, 100);
          const height = (heightPercent / 100) * maxHeight;
          
          const color = at.arrival_time > lateThreshold ? '#ff0000' : '#00ff00';

          return (
            <div
              key={at.slot}
              style={{
                width: `${barWidth}px`,
                height: `${height}px`,
                backgroundColor: color,
                transition: 'height 0.3s ease-out',
                zIndex: 1,
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div style={{
      width: '64px',
      height: '64px',
      backgroundColor: 'black',
      position: 'relative',
      WebkitFontSmoothing: 'none',
      MozOsxFontSmoothing: 'none',
      fontSmooth: 'never',
      textRendering: 'optimizeLegibility',
    }}>
      {/* Title */}
      <div style={{
        position: 'absolute',
        top: '0px',
        left: '6px',
        color: '#666666',
        fontSize: '11px',
        fontFamily: '"Pixelify Sans", monospace',
        fontWeight: '400',
        WebkitFontSmoothing: 'none',
        MozOsxFontSmoothing: 'none',
        fontSmooth: 'never',
        textRendering: 'geometricPrecision',
        transform: 'translate(0, 0)', // Force pixel alignment
        letterSpacing: '0px',
        whiteSpace: 'pre',
      }}>
        ETHEREUM
      </div>

      {renderSlots()}
      {renderArrivalTimes()}
      
      {/* Ethereum Logo */}
      <svg
        width="21"
        height="21"
        viewBox="0 0 20 32"
        fill="none"
        style={{
          position: 'absolute',
          top: '30px',
          right: '-2px',
          imageRendering: 'pixelated',
        //   shapeRendering: 'crispEdges',
        }}
      >
        <path
          d="M9.998 0L9.8 0.674v21.83l0.198 0.198 9.997-5.91L9.998 0z"
          fill="#fff"
          fillOpacity={0.8}
        />
        <path
          d="M9.998 0L0 16.792l9.998 5.91V0z"
          fill="#fff"
        />
        <path
          d="M9.998 24.573l-0.123 0.15v7.672l0.123 0.359 10.005-14.083L9.998 24.573z"
          fill="#fff"
          fillOpacity={0.8}
        />
        <path
          d="M9.998 32.754v-8.181L0 18.671 9.998 32.754z"
          fill="#fff"
        />
      </svg>

      {/* Status Text */}
      {status && (
        <div style={{
          position: 'absolute',
          bottom: '-1px',
          left: '2px',
          color: '#0088ff',
          fontSize: '11px',
          fontFamily: '"Pixelify Sans", monospace',
          fontWeight: '400',
          WebkitFontSmoothing: 'none',
          MozOsxFontSmoothing: 'none',
          fontSmooth: 'never',
          textRendering: 'geometricPrecision',
          transform: 'translate(0, 0)', // Force pixel alignment
          letterSpacing: '0px',
          whiteSpace: 'pre',
        }}>
          VALS: {Math.round(status.active/status.total*100)}%
        </div>
      )}
    </div>
  );
}

export default Overview; 