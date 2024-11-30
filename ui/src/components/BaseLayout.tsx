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
      transform: 'scale(4)',                // Scale up 4x without blur
      transformOrigin: 'top left',          // Scale from top-left corner
    }}>
      {/* Title */}
      <div style={{
        color: '#666666',
        fontSize: '5px',
        height: 'auto', // Allow height to adjust
        fontFamily: '"Pixelify Sans", monospace',
        fontWeight: '400',
        WebkitFontSmoothing: 'none',
        MozOsxFontSmoothing: 'none',
        fontSmooth: 'never',
        textRendering: 'geometricPrecision',
        letterSpacing: '0px',
        whiteSpace: 'pre-wrap', // Allow wrapping
        marginTop: '0px', // Add margin to position it from the top
      }}>
        ETHEREUM BEACON CHAIN
      </div>
      <div style={{
        color: '#666666',
        fontSize: '5px',
        height: 'auto', // Allow height to adjust
        fontFamily: '"Pixelify Sans", monospace',
        fontWeight: '400',
        WebkitFontSmoothing: 'none',
        MozOsxFontSmoothing: 'none',
        fontSmooth: 'never',
        textRendering: 'geometricPrecision',
        letterSpacing: '0px',
        whiteSpace: 'pre-wrap', // Allow wrapping
        marginTop: '0px', // Add margin to position it from the top
      }}>
        {title}
      </div>

      {children}
    </div>
  );
}

export default BaseLayout; 