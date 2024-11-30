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

  const getEpochInfo = () => {
    if (!currentProposer) return { epoch: 0, progress: 0 };
    const epoch = Math.floor(currentProposer.slot / 32);
    const slotsIntoEpoch = currentProposer.slot % 32;
    const progress = Math.round((slotsIntoEpoch / 32) * 100);
    return { epoch, progress };
  };

  const { epoch, progress } = getEpochInfo();

  return (
    <BaseLayout title="UP NEXT">
      <SlotHistory />
      
      {currentProposer ? (
        <div style={{
          position: 'absolute',
          top: '30px',
          left: '2px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0px',
          lineHeight: '5px'
        }}>
          <div style={{
            color: '#997700',
            fontSize: '8px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
            marginBottom: '4px',
          }}>
            E:{epoch}
          </div>
          <div style={{
            color: '#0088ff',
            fontSize: '8px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
            marginBottom: '4px',
          }}>
            P:{currentProposer.validator_index}
          </div>
          <div style={{
            color: '#00ff00',
            fontSize: '8px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
            marginBottom: '4px',
          }}>
            SLOT: {Math.floor(currentProposer.slot % 32)}
          </div>
          <div style={{
            color: '#888888',
            fontSize: '8px',
            fontFamily: '"Pixelify Sans", monospace',
            whiteSpace: 'pre',
            marginBottom: '4px',
          }}>
            {getEntityName(currentProposer.entity).substring(0, 8).toUpperCase()}
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