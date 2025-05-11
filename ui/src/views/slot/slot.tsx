import React, { useEffect, useState } from 'react';
import axios from 'axios';
import BaseLayout from '../../components/BaseLayout';
import SlotHistory from '../../components/SlotHistory';

interface HistoryEntry {
  slot?: number;
  entity?: string;
  bid_value?: string | null;
}

interface BidStats {
  highest?: number;
  lowest?: number;
  average?: number;
  count?: number;
  trend?: number;
  trend_pct?: number;
}

interface SlotData {
  slot?: number;
  entity?: string;
  winning_bid?: {
    value?: string;
    relay_name?: string;
  };
  slot_history?: HistoryEntry[];
  bid_stats?: BidStats;
  error?: string;
}

function SlotView() {
  const [slotData, setSlotData] = useState<SlotData | null>(null);
  const [newData, setNewData] = useState(false);
  const baseUrl = window.location.origin;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/slot`);
        setSlotData(response.data);
        // Flash indicator when new data arrives
        setNewData(true);
        setTimeout(() => setNewData(false), 500);
      } catch (error) {
        console.error('Error fetching slot data:', error);
        setSlotData({ error: 'Failed to fetch data' });
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 12000);
    return () => clearInterval(interval);
  }, [baseUrl]);

  // Format ETH value
  const formatEth = (value?: string) => {
    if (!value) return '0';
    try {
      const wei = BigInt(value);
      const eth = Number(wei) / 1e18;
      
      if (eth >= 1) {
        return `${eth.toFixed(2)}Ξ`;
      } else if (eth >= 0.01) {
        return `${eth.toFixed(3)}Ξ`;
      } else if (eth >= 0.001) {
        return `${eth.toFixed(4)}Ξ`;
      } else {
        return `${(eth * 1000).toFixed(2)}mΞ`;
      }
    } catch {
      return '0';
    }
  };

  // Get bar height from bid value (in pixels)
  const getBidHeight = (bidValue?: string | null) => {
    if (!bidValue) return '3px'; // Small but visible default height for slots with no bid
    try {
      const wei = BigInt(bidValue);
      const eth = Number(wei) / 1e18;
      // Scale based on realistic bid ranges
      // Most bids are between 0.01 and 0.5 ETH
      const height = Math.min(35, Math.max(5, Math.floor(eth * 100)));
      return `${height}px`;
    } catch {
      return '3px';
    }
  };

  // Get color from bid value
  const getBidColor = (bidValue?: string | null) => {
    if (!bidValue) return '#555555'; // Gray for no bid
    try {
      const wei = BigInt(bidValue);
      const eth = Number(wei) / 1e18;
      
      // Color scale from low bids (blue) to high bids (green/yellow)
      if (eth < 0.01) return '#4444ff'; // Very low
      if (eth < 0.05) return '#44aaff'; // Low
      if (eth < 0.1) return '#44ffaa';  // Medium
      if (eth < 0.2) return '#88ff44';  // High
      return '#ffcc00';                 // Very high
    } catch {
      return '#555555';
    }
  };

  if (!slotData || slotData.error) {
    return (
      <BaseLayout title="MEV">
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          color: '#ff0000',
          fontSize: '8px',
          fontFamily: '"Pixelify Sans", monospace',
          whiteSpace: 'pre',
        }}>
          {slotData?.error || 'NO DATA'}
        </div>
      </BaseLayout>
    );
  }

  // Get the raw history data from the API
  const slotHistory = slotData.slot_history || [];

  // Reduce to 15 bids to create more space and better padding
  // Reverse the array so newest slots are on the right
  const recentBids = [...slotHistory].slice(0, 15).reverse();

  return (
    <BaseLayout title="MEV">
      <SlotHistory />
      
      {/* Chart Area */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '2px',
        width: '60px',
        height: '24px',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: '1px',
      }}>
        {recentBids.length === 0 ? (
          <div style={{
            margin: 'auto',
            fontSize: '8px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
            color: '#666666',
          }}>
            No bid history
          </div>
        ) : (
          recentBids.map((entry, index) => {
            // Skip rendering completely if there's no bid
            if (!entry.bid_value) {
              return (
                <div
                  key={`bar-${index}`}
                  style={{
                    width: '2px',
                    height: '1px',
                    backgroundColor: '#111111',
                  }}
                />
              );
            }

            const isCurrentSlot = entry.slot === slotData.slot;
            const barHeight = getBidHeight(entry.bid_value);
            const barColor = getBidColor(entry.bid_value);

            return (
              <div
                key={`bar-${index}`}
                style={{
                  width: '2px',
                  height: barHeight,
                  backgroundColor: barColor,
                  border: isCurrentSlot ? '1px solid #ffffff' : 'none',
                }}
              />
            );
          })
        )}
      </div>
      
      {/* Current value */}
      {slotData.winning_bid?.value && (
        <div style={{
          position: 'absolute',
          bottom: '1px',
          width: '100%',
          textAlign: 'center',
          color: getBidColor(slotData.winning_bid.value),
          fontSize: '8px',
          fontFamily: '"Pixelify Sans", monospace',
          fontWeight: '400',
          whiteSpace: 'pre',
        }}>
          {formatEth(slotData.winning_bid.value)}
        </div>
      )}
      
      {/* Entity name */}
      {slotData.entity && (
        <div style={{
          position: 'absolute',
          top: '30px',
          left: '2px',
          color: '#888888',
          fontSize: '8px',
          fontFamily: '"Pixelify Sans", monospace',
          whiteSpace: 'pre',
        }}>
          {slotData.entity.substring(0, 8).toUpperCase()}
        </div>
      )}
      
      {/* Slot number */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '2px',
        color: '#997700',
        fontSize: '8px',
        fontFamily: '"Pixelify Sans", monospace',
        whiteSpace: 'pre',
      }}>
        #{slotData.slot}
      </div>
    </BaseLayout>
  );
}

export default SlotView;