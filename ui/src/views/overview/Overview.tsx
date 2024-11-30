import React from 'react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import BaseLayout from '../../components/BaseLayout';
import SlotHistory from '../../components/SlotHistory';
import { StatusResponse, SlotsResponse, ArrivalTimesResponse } from '../../types';

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
    <BaseLayout title="BLOCK ARRIVAL TIMES">
      <SlotHistory/>
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
          bottom: '0px',
          left: '6px',
          color: '#0088ff',
          fontSize: '10px',
          fontFamily: '"Pixelify Sans", monospace',
          fontWeight: '400',
          WebkitFontSmoothing: 'none',
          MozOsxFontSmoothing: 'none',
          fontSmooth: 'never',
          textRendering: 'geometricPrecision',
          transform: 'translate(0, 0)',
          letterSpacing: '0px',
          whiteSpace: 'pre',
        }}>
          VALS: {Math.round(status.active/status.total*100)}%
        </div>
      )}
    </BaseLayout>
  );
}

export default Overview; 