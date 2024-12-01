import React from 'react';

interface BaseLayoutProps {
  children: React.ReactNode;
  title?: string;
}

function BaseLayout({ children, title = 'BEACON CHAIN' }: BaseLayoutProps) {
  return (
    <div style={{
      width: '64px',
      height: '64px',
      backgroundColor: 'black',
      position: 'relative',
      WebkitFontSmoothing: 'none',
      MozOsxFontSmoothing: 'none',
      fontSmooth: 'never',
      textRendering: 'optimizeLegibility',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center', // Center horizontally
      justifyContent: 'flex-start', // Align to the top
      imageRendering: 'pixelated',          // Chrome
      transformOrigin: 'top left',          // Scale from top-left corner
    }}>
      <div style={{
        color: '#ffffff',
        fontSize: '8px',
        height: 'auto', // Allow height to adjust
        fontFamily: '"Pixelify Sans", monospace',
        fontWeight: '400',
        WebkitFontSmoothing: 'none',
        MozOsxFontSmoothing: 'none',
        fontSmooth: 'never',
        textRendering: 'geometricPrecision',
        letterSpacing: '0px',
        whiteSpace: 'pre-wrap', // Allow wrapping
        marginTop: '2px', // Add margin to position it from the top
      }}>
        {title}
      </div>
      <div style={{
        width: '100%',
        height: '1px',
        opacity: '0.5',
        backgroundColor: '#333333',
        marginTop: '0px',
        marginBottom: '2px'
      }} />
      {children}
    </div>
  );
}

export default BaseLayout; 