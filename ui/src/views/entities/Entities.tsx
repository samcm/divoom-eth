import React from 'react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import BaseLayout from '../../components/BaseLayout';
import SlotHistory from '../../components/SlotHistory';
import { ValidatorEntity } from '../../types';

function Entities() {
  const [entities, setEntities] = useState<ValidatorEntity[] | null>(null);
  const baseUrl = window.location.origin;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/validator-entities`);
        setEntities(response.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [baseUrl]);

  const renderEntities = () => {
    if (!entities) return null;

    // Get unique entities and count validators per entity
    const entityCounts: { [key: string]: number } = {};
    Object.values(entities).forEach(entity => {
      if (!entity) return;
      const name = entity.label;
      entityCounts[name] = (entityCounts[name] || 0) + 1;
    });

    // Sort by count
    const sortedEntities = Object.entries(entityCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3); // Show top 3

    return (
      <div style={{
        position: 'absolute',
        top: '25px',
        left: '2px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      }}>
        {sortedEntities.map(([name, count], i) => (
          <div key={name} style={{
            color: i === 0 ? '#00ff00' : i === 1 ? '#0088ff' : '#666666',
            fontSize: '8px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
          }}>
            {name.substring(0, 6).toUpperCase()}: {count}
          </div>
        ))}
      </div>
    );
  };

  return (
    <BaseLayout title="ENTITIES">
      <SlotHistory />
      {renderEntities()}
    </BaseLayout>
  );
}

export default Entities; 