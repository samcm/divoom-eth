import React, { useEffect, useState } from 'react';
import axios from 'axios';
import BaseLayout from '../../components/BaseLayout';

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
        // Don't set error state, we'll just render nothing
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

  // If no data or error, render nothing
  if (!slotData) {
    return <BaseLayout title="MEV" />;
  }

  // Get the raw history data from the API
  const slotHistory = slotData.slot_history || [];

  // Reduce to 15 bids to create more space and better padding
  // Reverse the array so newest slots are on the right
  const recentBids = [...slotHistory].slice(0, 15).reverse();

  // Find the max bid value in the recent bids
  let maxBidValue: string | null = null;
  let maxBidSlot: number | undefined = undefined;
  
  recentBids.forEach((entry) => {
    if (entry.bid_value) {
      if (!maxBidValue || BigInt(entry.bid_value) > BigInt(maxBidValue)) {
        maxBidValue = entry.bid_value;
        maxBidSlot = entry.slot;
      }
    }
  });

  return (
    <BaseLayout title="MEV">
      {/* Chart Area */}
      <div style={{
        position: 'absolute',
        bottom: '11px', // 1px more for padding between chart and latest value
        left: '2px',
        width: '60px',
        height: '24px',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: '1px',
        borderBottom: '2px solid #333333', // 2 pixel border at bottom
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

            const isMaxBid = entry.slot === maxBidSlot;
            const barHeight = getBidHeight(entry.bid_value);
            // Use gold for max bid, blue for all others
            const barColor = isMaxBid ? '#ffcc00' : '#44aaff';
            
            return (
              <div
                key={`bar-${index}`}
                style={{
                  width: '2px',
                  height: barHeight,
                  backgroundColor: barColor,
                }}
              />
            );
          })
        )}
      </div>
      
      {/* Show max bid value instead of current */}
      {maxBidValue && (
        <div style={{
          position: 'absolute',
          bottom: '1px',
          width: '100%',
          textAlign: 'center',
          color: '#ffcc00', // Gold for max value
          fontSize: '8px',
          fontFamily: '"Pixelify Sans", monospace',
          fontWeight: '400',
          whiteSpace: 'pre',
        }}>
          {formatEth(maxBidValue)}
        </div>
      )}
    </BaseLayout>
  );
}

export default SlotView;