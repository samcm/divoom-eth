import React from 'react';
import { useState, useEffect } from 'react';
import Overview from './views/overview/Overview';
import Entities from './views/entities/Entities';
import Proposer from './views/proposer/Proposer';

type View = 'overview' | 'entities' | 'proposer';

function App() {
  const [currentView, setCurrentView] = useState<View>('overview');

  useEffect(() => {
    const updateView = () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const hour = now.getHours();
      const sixHourBlock = Math.floor(hour / 6);
      
      const views: View[] = [
        'proposer', 
        'overview', 
        // 'entities'
      ];
      const totalBlocks = views.length * 4; // 4 six-hour blocks per day
      const blockIndex = (dayOfWeek * 4 + sixHourBlock) % totalBlocks;
      const viewIndex = Math.floor(blockIndex / 4);
      
      setCurrentView(views[viewIndex]);
    };

    updateView();
    const interval = setInterval(updateView, 1000 * 60); // Check every minute
    
    return () => clearInterval(interval);
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'proposer':
        return <Proposer />;
      case 'entities':
        return <Entities />;
      case 'overview':
        return <Overview />;
      default:
        return <Proposer />;
    }
  };

  return renderView();
}

export default App;