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

  // Create CSS for chart container
  const chartContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    width: '64px',
    height: '64px',
    backgroundColor: '#000000',
    color: '#ffffff',
    fontFamily: '"Pixelify Sans", monospace',
    WebkitFontSmoothing: 'none',
    MozOsxFontSmoothing: 'none',
    fontSmooth: 'never',
    textRendering: 'geometricPrecision',
    letterSpacing: '0px',
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    left: 0,
    imageRendering: 'pixelated',
  };

  // CSS for the header
  const headerStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '2px 0',
    fontSize: '7px',
    fontWeight: 'bold',
    fontFamily: '"Pixelify Sans", monospace',
    WebkitFontSmoothing: 'none',
    MozOsxFontSmoothing: 'none',
    fontSmooth: 'never',
    textRendering: 'geometricPrecision',
    letterSpacing: '0px',
    backgroundColor: newData ? '#222222' : 'transparent',
    transition: 'background-color 0.3s ease',
  };

  // CSS for the chart area
  const chartAreaStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    height: '36px', // Make chart slightly smaller
    marginBottom: '4px', // Add some space at the bottom
  };

  // CSS for the grid lines
  const gridLineStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '1px',
    backgroundColor: '#111111',
  };

  // CSS for the bar container
  const barContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
    padding: '0 2px',
    paddingRight: '6px', // Add more padding on the right side
    zIndex: 1,
    justifyContent: 'flex-start', // Start from the left
    overflow: 'hidden',
    position: 'relative', // For positioning the bottom line
    borderBottom: '1px solid #333333', // Add a single line at the bottom
  };

  // CSS for the footer
  const footerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '2px 0',
  };

  // CSS for bid value
  const bidValueStyle: React.CSSProperties = {
    fontSize: '9px',
    fontFamily: '"Pixelify Sans", monospace',
    WebkitFontSmoothing: 'none',
    MozOsxFontSmoothing: 'none',
    fontSmooth: 'never',
    textRendering: 'geometricPrecision',
    letterSpacing: '0px',
    fontWeight: 'bold',
    marginBottom: '1px',
  };

  // CSS for entity name
  const entityStyle: React.CSSProperties = {
    fontSize: '5px',
    fontFamily: '"Pixelify Sans", monospace',
    WebkitFontSmoothing: 'none',
    MozOsxFontSmoothing: 'none',
    fontSmooth: 'never',
    textRendering: 'geometricPrecision',
    letterSpacing: '0px',
    color: '#888888',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    width: '100%',
    textAlign: 'center',
  };

  // CSS for no data state
  const noDataStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    color: '#ff0000',
    fontSize: '8px',
    fontFamily: '"Pixelify Sans", monospace',
    WebkitFontSmoothing: 'none',
    MozOsxFontSmoothing: 'none',
    fontSmooth: 'never',
    textRendering: 'geometricPrecision',
    letterSpacing: '0px',
  };

  if (!slotData || slotData.error) {
    return (
      <BaseLayout title="MEV">
        <div style={chartContainerStyle}>
          <div style={noDataStyle}>
            {slotData?.error || 'NO DATA'}
          </div>
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
      <div style={chartContainerStyle}>
        {/* Header */}
        <div style={headerStyle}>
          {slotData.slot}
        </div>
        
        {/* Chart Area */}
        <div style={chartAreaStyle}>
          
          {/* Bars */}
          <div style={barContainerStyle}>
            {recentBids.length === 0 ? (
              <div style={{
                margin: 'auto',
                fontSize: '6px',
                fontFamily: '"Pixelify Sans", monospace',
                WebkitFontSmoothing: 'none',
                MozOsxFontSmoothing: 'none',
                fontSmooth: 'never',
                textRendering: 'geometricPrecision',
                letterSpacing: '0px',
                color: '#666666',
              }}>
                No bid history
              </div>
            ) : (
              recentBids.map((entry, index) => {
                const isCurrentSlot = entry.slot === slotData.slot;
                // Skip rendering completely if there's no bid
                if (!entry.bid_value) {
                  return (
                    <div
                      key={`bar-container-${index}`}
                      style={{
                        width: '2px',
                        minWidth: '2px',
                        maxWidth: '2px',
                        marginRight: '2px',
                      }}
                    />
                  );
                }

                const barHeight = getBidHeight(entry.bid_value);
                const barColor = getBidColor(entry.bid_value);

                return (
                  <div
                    key={`bar-container-${index}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      width: '2px',
                      minWidth: '2px',
                      maxWidth: '2px',
                      marginRight: '2px',
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: '#0a0a0a',
                        width: '2px',
                        height: '100%',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: barColor,
                          width: '2px',
                          height: barHeight,
                          position: 'absolute',
                          bottom: 0,
                          border: isCurrentSlot ? '1px solid #ffffff' : 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div style={footerStyle}>
          {slotData.winning_bid?.value ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
              }}
            >
              <div
                style={{
                  ...bidValueStyle,
                  color: getBidColor(slotData.winning_bid.value),
                }}
              >
                {formatEth(slotData.winning_bid.value)}
              </div>
            </div>
          ) : (
            // Render nothing if there's no bid
            <div style={{ height: '9px' }}></div>
          )}

          <div style={entityStyle}>
            {slotData.entity || 'unknown'}
          </div>

        </div>
      </div>
    </BaseLayout>
  );
}

export default SlotView;