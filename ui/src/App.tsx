import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Overview from './views/overview/Overview';
import Proposer from './views/proposer/Proposer';
import Execution from './views/execution/execution';
import Admin from './views/admin/Admin';
import Layer2 from './views/layer2/layer2';
import Mev from './views/slot/slot';
import DefiTvl from './views/defi-tvl/defi-tvl';
import DefiYields from './views/defi-yields/defi-yields';
import DefiVolume from './views/defi-volume/defi-volume';

function ViewRouter() {
  const [currentView, setCurrentView] = useState<string>('overview');
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== '/') {
      return;
    }

    const fetchCurrentView = async () => {
      try {
        const response = await fetch('/api/current-view');
        const data = await response.json();
        setCurrentView(data.view);
      } catch (error) {
        console.error('Failed to fetch current view:', error);
        setCurrentView('overview');
      }
    };

    fetchCurrentView();
    const interval = setInterval(fetchCurrentView, 10000); // Poll every 10 seconds
    
    return () => clearInterval(interval);
  }, [location.pathname]);

  if (location.pathname !== '/') {
    return null;
  }

  switch (currentView) {
    case 'proposer':
      return <Proposer />;
    case 'execution':
      return <Execution />;
    case 'layer2':
      return <Layer2 />;
    case 'mev':
      return <Mev />;
    case 'defi-tvl':
      return <DefiTvl />;
    case 'defi-yields':
      return <DefiYields />;
    case 'defi-volume':
      return <DefiVolume />;
    case 'overview':
    default:
      return <Overview />;
  }
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/views/overview" element={<Overview />} />
        <Route path="/views/layer2" element={<Layer2 />} />
        <Route path="/views/proposer" element={<Proposer />} />
        <Route path="/views/execution" element={<Execution />} />
        <Route path="/views/mev" element={<Mev />} />
        <Route path="/views/slot" element={<Mev />} /> {/* Keep old path for backward compatibility */}
        <Route path="/views/defi-tvl" element={<DefiTvl />} />
        <Route path="/views/defi-yields" element={<DefiYields />} />
        <Route path="/views/defi-volume" element={<DefiVolume />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/" element={<ViewRouter />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;