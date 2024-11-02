import React from 'react';
import { useState, useEffect } from 'react';
import Overview from './views/overview/Overview';

type View = 'overview';

function App() {
  const [currentView, setCurrentView] = useState<View>('overview');

  const renderView = () => {
    switch (currentView) {
      case 'overview':
        return <Overview />;
      default:
        return <Overview />;
    }
  };

  return (
    <div style={{
      width: '64px',
      height: '64px',
      backgroundColor: 'black',
    }}>
      {renderView()}
    </div>
  );
}

export default App; 