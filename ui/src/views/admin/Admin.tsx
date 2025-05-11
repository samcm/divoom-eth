import React, { useState, useEffect } from 'react';
import { ViewInfo, ViewOverride, ViewsResponse } from '../../types';

export default function Admin() {
  const [availableViews, setAvailableViews] = useState<ViewInfo[]>([]);
  const [selectedView, setSelectedView] = useState<string>('none');
  const [duration, setDuration] = useState<number>(30);
  const [currentOverride, setCurrentOverride] = useState<ViewOverride | null>(null);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    fetchViews();
    const interval = setInterval(fetchViews, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchViews = async () => {
    try {
      const response = await fetch('/api/views/available');
      const data: ViewsResponse = await response.json();
      setAvailableViews(data.views);
      setCurrentOverride(data.currentOverride);
    } catch (error) {
      console.error('Failed to fetch views:', error);
    }
  };

  const handleOverride = async () => {
    try {
      const response = await fetch('/api/views/override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          view: selectedView,
          duration_minutes: duration,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to set override');
      }
      
      const data = await response.json();
      setStatus(data.status === 'success' ? 'Override set successfully' : data.message);
      if (data.status === 'success') {
        fetchViews();
      }
    } catch (error) {
      setStatus('Failed to set override');
      console.error('Override error:', error);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>View Admin</h1>
      
      {currentOverride?.view && (
        <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
          <h3>Current Override</h3>
          <p>View: {currentOverride.view}</p>
          <p>Until: {new Date(currentOverride.until!).toLocaleString()}</p>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h3>Set Override</h3>
        <div style={{ marginBottom: '10px' }}>
          <label>
            View:
            <select 
              value={selectedView}
              onChange={(e) => setSelectedView(e.target.value)}
              style={{ marginLeft: '10px' }}
            >
              <option value="none">None (Clear Override)</option>
              {availableViews.map(view => (
                <option key={view.name} value={view.name}>{view.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>
            Duration (minutes):
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              min="1"
              style={{ marginLeft: '10px' }}
            />
          </label>
        </div>

        <button onClick={handleOverride}>
          {selectedView === 'none' ? 'Clear Override' : 'Set Override'}
        </button>

        {status && (
          <div style={{ marginTop: '10px', color: status.includes('error') ? 'red' : 'green' }}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}