import React from 'react';

interface BaseLayoutProps {
  children: React.ReactNode;
  title?: string;
}

function BaseLayout({ children, title = 'ETHEREUM' }: BaseLayoutProps) {
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
    }}>
      {/* Title */}
      <div style={{
        position: 'absolute',
        top: '0px',
        left: '6px',
        color: '#666666',
        fontSize: '11px',
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
        {title}
      </div>

      {children}
    </div>
  );
}

export default BaseLayout; 