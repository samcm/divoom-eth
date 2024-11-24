import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { SlotsResponse } from '../types';

function SlotHistory() {
  const [slotsData, setSlotsData] = useState<SlotsResponse | null>(null);
  const baseUrl = window.location.origin;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/slots`);
        setSlotsData(response.data);
      } catch (error) {
        console.error('Error fetching slots data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [baseUrl]);

  if (!slotsData) return null;

  const { slots, epoch_data, checkpoints, duties } = slotsData;
  const slots_per_epoch = epoch_data.slots_per_epoch;
  const start_slot = epoch_data.current_epoch_start_slot - (slots_per_epoch * 5);

  return (
    <React.Fragment>
      {slots.map((slot) => {
        // Calculate which epoch this slot belongs to (0-6, where 5 is current, 6 is next)
        const epochOffset = Math.floor((slot.slot - start_slot) / slots_per_epoch);
        const slotInEpoch = slot.slot % slots_per_epoch;
        const col = slotInEpoch % 32;
        
        // Calculate vertical position based on epoch, starting from top
        const baseTop = 12;  // Start from top
        const yOffset = epochOffset * 2;  // 2 pixels per epoch

        // Calculate slot's epoch
        const slotEpoch = Math.floor(slot.slot / slots_per_epoch);
        
        // Determine if this slot is in a finalized or justified epoch
        const isFinalized = slotEpoch <= checkpoints.finalized;
        const isJustified = slotEpoch <= checkpoints.justified && !isFinalized;
        
        // Check if we have duties in this slot
        const hasProposerDuty = duties.proposer.includes(slot.slot);
        
        // Determine color based on status, finalization, and duties
        let color = getSlotColor(slot.status);
        if (slot.status === 'proposed') {
          if (isFinalized) {
            color = '#000088'; // Dark blue for finalized
          } else if (isJustified) {
            color = '#0088ff'; // Light blue for justified
          }
        } else if (slot.status === 'upcoming' && hasProposerDuty) {
        }

        return (
          <div
            key={slot.slot}
            style={{
              position: 'absolute',
              width: '2px',
              height: '2px',
              backgroundColor: color,
              left: `${col * 2}px`,
              top: `${baseTop + yOffset}px`,
            }}
          />
        );
      })}
    </React.Fragment>
  );
}

function getSlotColor(status: string): string {
  switch (status) {
    case 'proposed':
      return '#00ff00';
    case 'missing':
      return '#ff0000';
    case 'pending':
      return '#ffcc00';
    case 'upcoming':
      return '#444400';
    default:
      return '#000000';
  }
}

export default SlotHistory; 