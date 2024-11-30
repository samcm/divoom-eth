import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Overview from './views/overview/Overview';
import Entities from './views/entities/Entities';
import Proposer from './views/proposer/Proposer';

type View = 'overview' | 'entities' | 'proposer';

function TimeBasedRouter() {
  const [currentView, setCurrentView] = useState<View>('overview');
  const location = useLocation();

  useEffect(() => {
    // Only run if we're on the root path
    if (location.pathname !== '/') {
      return;
    }

    const updateView = () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const hour = now.getHours();
      const sixHourBlock = Math.floor(hour / 2);
      
      const views: View[] = [
        'proposer', 
        'overview', 
        // 'entities'
      ];
      const totalBlocks = views.length * 4;
      const blockIndex = (dayOfWeek * 4 + sixHourBlock) % totalBlocks;
      const viewIndex = Math.floor(blockIndex / 4);
      
      setCurrentView(views[viewIndex]);
    };

    updateView();
    const interval = setInterval(updateView, 1000 * 60); // Check every minute
    
    return () => clearInterval(interval);
  }, [location.pathname]);

  if (location.pathname !== '/') {
    return null;
  }

  switch (currentView) {
    case 'proposer':
      return <Proposer />;
    case 'entities':
      return <Entities />;
    case 'overview':
      return <Overview />;
    default:
      return <Overview />;
  }
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/views/overview" element={<Overview />} />
        <Route path="/views/entities" element={<Entities />} />
        <Route path="/views/proposer" element={<Proposer />} />
        <Route path="/" element={<TimeBasedRouter />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;