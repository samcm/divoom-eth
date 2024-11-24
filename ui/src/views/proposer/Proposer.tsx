import React, { useEffect, useState } from 'react';
import axios from 'axios';
import BaseLayout from '../../components/BaseLayout';
import SlotHistory from '../../components/SlotHistory';
import { ProposerInfo, ValidatorEntity } from '../../types';

function Proposer() {
  const [proposers, setProposers] = useState<ProposerInfo[]>([]);
  const baseUrl = window.location.origin;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/proposers`);
        setProposers(response.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [baseUrl]);

  const getCurrentProposer = () => {
    const current = proposers.find(p => p.is_current_slot);
    console.log('Current proposer:', current);
    return current;
  };

  const getEntityName = (entity: ValidatorEntity) => {
    return entity.node_operator !== 'unknown' ? entity.node_operator : entity.label;
  };

  const currentProposer = getCurrentProposer();
  console.log('Rendering with proposer:', currentProposer);

  return (
    <BaseLayout title="ETHEREUM">
      <SlotHistory />
      
      {currentProposer ? (
        <div style={{
          position: 'absolute',
          top: '28px',
          left: '2px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}>
          <div style={{
            color: '#00ff00',
            fontSize: '8px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
          }}>
            SLOT: {currentProposer.slot}
          </div>
          <div style={{
            color: '#0088ff',
            fontSize: '8px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
          }}>
            VAL: {currentProposer.validator_index}
          </div>
          <div style={{
            color: '#666666',
            fontSize: '8px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
          }}>
            {getEntityName(currentProposer.entity).substring(0, 14).toUpperCase()}
          </div>
        </div>
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
          NO DATA
        </div>
      )}
    </BaseLayout>
  );
}

export default Proposer; 