import React from 'react';
import { useTour } from '../contexts/TourContext';

export function TourButton() {
  const { startTour, restartTour, hasCompletedTour, isActive } = useTour();



  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      {!hasCompletedTour ? (
        <button
          onClick={startTour}
          style={{
            padding: '14px 24px',
            backgroundColor: '#ff9800',
            color: 'white',
            border: '2px solid #fff',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(255, 152, 0, 0.4)',
            animation: 'tour-button-pulse 2s infinite',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f57c00';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ff9800';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          🎓 Start MCP Tour
        </button>
      ) : (
        <button
          onClick={restartTour}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          🔄 Restart Tour
        </button>
      )}
      
      <style jsx>{`
        @keyframes tour-button-pulse {
          0% { transform: scale(1); box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3); }
          50% { transform: scale(1.05); box-shadow: 0 4px 16px rgba(255, 152, 0, 0.5); }
          100% { transform: scale(1); box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3); }
        }
      `}</style>
    </div>
  );
}