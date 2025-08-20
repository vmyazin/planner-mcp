import React, { useEffect, useState, useRef } from 'react';
import { useTour } from '../contexts/TourContext';

interface Position {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TourOverlay() {
  const { isActive, currentStep, steps, nextStep, prevStep, skipTour, waitingForAction } = useTour();
  const [targetPosition, setTargetPosition] = useState<Position | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);



  useEffect(() => {
    if (!isActive || !steps[currentStep]) return;

    const updatePositions = () => {
      const step = steps[currentStep];
      let targetElement = document.querySelector(step.target) as HTMLElement;
      
              // Fallback targeting if primary target not found
        if (!targetElement) {
          
          // Try fallback selectors
        const fallbacks = [
          '.tour-task-list',
          '.tour-protocol-inspector',
          '.tour-concepts-panel', 
          '.tour-server-status',
          '.tour-add-task-form',
          '.tour-welcome'
        ];
        
        for (const fallback of fallbacks) {
          targetElement = document.querySelector(fallback) as HTMLElement;
          if (targetElement) {
            break;
          }
        }
      }
      
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const newTargetPosition = {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: Math.max(rect.width, 10), // Minimum width
          height: Math.max(rect.height, 10) // Minimum height
        };
        setTargetPosition(newTargetPosition);

        // Calculate tooltip position
        if (tooltipRef.current) {
          const tooltipRect = tooltipRef.current.getBoundingClientRect();
          let tooltipTop = 0;
          let tooltipLeft = 0;

          switch (step.position) {
            case 'top':
              tooltipTop = newTargetPosition.top - tooltipRect.height - 20;
              tooltipLeft = newTargetPosition.left + (newTargetPosition.width / 2) - (tooltipRect.width / 2);
              break;
            case 'bottom':
              tooltipTop = newTargetPosition.top + newTargetPosition.height + 20;
              tooltipLeft = newTargetPosition.left + (newTargetPosition.width / 2) - (tooltipRect.width / 2);
              break;
            case 'left':
              tooltipTop = newTargetPosition.top + (newTargetPosition.height / 2) - (tooltipRect.height / 2);
              tooltipLeft = newTargetPosition.left - tooltipRect.width - 20;
              break;
            case 'right':
              tooltipTop = newTargetPosition.top + (newTargetPosition.height / 2) - (tooltipRect.height / 2);
              tooltipLeft = newTargetPosition.left + newTargetPosition.width + 20;
              break;
          }

          // Keep tooltip within viewport
          tooltipTop = Math.max(10, Math.min(tooltipTop, window.innerHeight - tooltipRect.height - 10));
          tooltipLeft = Math.max(10, Math.min(tooltipLeft, window.innerWidth - tooltipRect.width - 10));

          setTooltipPosition({ top: tooltipTop, left: tooltipLeft });
        }
      } else {
        setTargetPosition(null);
      }
    };

    updatePositions();
    window.addEventListener('resize', updatePositions);
    window.addEventListener('scroll', updatePositions);

    return () => {
      window.removeEventListener('resize', updatePositions);
      window.removeEventListener('scroll', updatePositions);
    };
  }, [isActive, currentStep, steps]);

  // Scroll target into view
  useEffect(() => {
    if (!isActive || !steps[currentStep]) return;

    const step = steps[currentStep];
    const targetElement = document.querySelector(step.target);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isActive, currentStep, steps]);

  if (!isActive || !steps[currentStep] || !targetPosition) return null;

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      {/* Top overlay */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: targetPosition.top - 8,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 9998,
          pointerEvents: 'auto'
        }}
      />
      
      {/* Left overlay */}
      <div 
        style={{
          position: 'fixed',
          top: targetPosition.top - 8,
          left: 0,
          width: targetPosition.left - 8,
          height: targetPosition.height + 16,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 9998,
          pointerEvents: 'auto'
        }}
      />
      
      {/* Right overlay */}
      <div 
        style={{
          position: 'fixed',
          top: targetPosition.top - 8,
          left: targetPosition.left + targetPosition.width + 8,
          right: 0,
          height: targetPosition.height + 16,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 9998,
          pointerEvents: 'auto'
        }}
      />
      
      {/* Bottom overlay */}
      <div 
        style={{
          position: 'fixed',
          top: targetPosition.top + targetPosition.height + 8,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 9998,
          pointerEvents: 'auto'
        }}
      />
      
      {/* Highlight border around interactive element */}
      <div
        style={{
          position: 'fixed',
          top: targetPosition.top - 4,
          left: targetPosition.left - 4,
          width: targetPosition.width + 8,
          height: targetPosition.height + 8,
          zIndex: 9999,
          pointerEvents: 'none',
          border: '4px solid #2196f3',
          borderRadius: '8px',
          backgroundColor: 'transparent',
          boxShadow: '0 0 20px rgba(33, 150, 243, 0.8)',
          animation: 'tour-pulse 2s infinite'
        }}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={{
          position: 'fixed',
          top: tooltipPosition?.top || 100,
          left: tooltipPosition?.left || 100,
            backgroundColor: 'white',
            border: '2px solid #2196f3',
            borderRadius: '12px',
            padding: '20px',
            maxWidth: '450px',
            minWidth: '350px',
            zIndex: 10001,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            fontFamily: 'Arial, sans-serif'
          }}
        >
          {/* Progress bar */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#666' }}>
                Step {currentStep + 1} of {steps.length}
              </span>
              <span style={{ fontSize: '14px', color: '#666' }}>
                {Math.round(progress)}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#e0e0e0',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#2196f3',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          {/* Arrow pointing to target */}
          <div
            style={{
              position: 'absolute',
              width: 0,
              height: 0,
              ...(step.position === 'top' && {
                bottom: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                borderLeft: '12px solid transparent',
                borderRight: '12px solid transparent',
                borderTop: '12px solid white'
              }),
              ...(step.position === 'bottom' && {
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                borderLeft: '12px solid transparent',
                borderRight: '12px solid transparent',
                borderBottom: '12px solid white'
              }),
              ...(step.position === 'left' && {
                right: '-12px',
                top: '50%',
                transform: 'translateY(-50%)',
                borderTop: '12px solid transparent',
                borderBottom: '12px solid transparent',
                borderLeft: '12px solid white'
              }),
              ...(step.position === 'right' && {
                left: '-12px',
                top: '50%',
                transform: 'translateY(-50%)',
                borderTop: '12px solid transparent',
                borderBottom: '12px solid transparent',
                borderRight: '12px solid white'
              })
            }}
          />
          
          {/* Arrow border */}
          <div
            style={{
              position: 'absolute',
              width: 0,
              height: 0,
              ...(step.position === 'top' && {
                bottom: '-14px',
                left: '50%',
                transform: 'translateX(-50%)',
                borderLeft: '14px solid transparent',
                borderRight: '14px solid transparent',
                borderTop: '14px solid #2196f3'
              }),
              ...(step.position === 'bottom' && {
                top: '-14px',
                left: '50%',
                transform: 'translateX(-50%)',
                borderLeft: '14px solid transparent',
                borderRight: '14px solid transparent',
                borderBottom: '14px solid #2196f3'
              }),
              ...(step.position === 'left' && {
                right: '-14px',
                top: '50%',
                transform: 'translateY(-50%)',
                borderTop: '14px solid transparent',
                borderBottom: '14px solid transparent',
                borderLeft: '14px solid #2196f3'
              }),
              ...(step.position === 'right' && {
                left: '-14px',
                top: '50%',
                transform: 'translateY(-50%)',
                borderTop: '14px solid transparent',
                borderBottom: '14px solid transparent',
                borderRight: '14px solid #2196f3'
              })
            }}
          />

          {/* Content */}
          <h3 style={{ margin: '0 0 10px 0', color: '#1976d2', fontSize: '18px' }}>
            {step.title}
          </h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '14px', lineHeight: '1.5' }}>
            {step.content}
          </p>

          {waitingForAction && (
            <div style={{
              padding: '10px',
              backgroundColor: '#fff3e0',
              border: '1px solid #ff9800',
              borderRadius: '4px',
              marginBottom: '15px',
              fontSize: '14px',
              color: '#e65100'
            }}>
              <strong>👆 Try it now!</strong> {step.action === 'click' ? 'Click the highlighted element to continue.' : 'Complete the action to proceed.'}
            </div>
          )}

          {/* Navigation buttons */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginTop: '20px',
            borderTop: '1px solid #eee',
            paddingTop: '15px'
          }}>
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              style={{
                padding: '10px 20px',
                backgroundColor: currentStep === 0 ? '#e0e0e0' : '#f5f5f5',
                border: '2px solid #ccc',
                borderRadius: '6px',
                cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                minWidth: '80px'
              }}
            >
              Previous
            </button>

            <button
              onClick={skipTour}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                fontSize: '14px',
                textDecoration: 'underline'
              }}
            >
              Skip Tour
            </button>

            <button
                          onClick={nextStep}
              disabled={waitingForAction}
              style={{
                padding: '12px 24px',
                backgroundColor: waitingForAction ? '#e0e0e0' : '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: waitingForAction ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                minWidth: '100px',
                boxShadow: waitingForAction ? 'none' : '0 2px 8px rgba(33, 150, 243, 0.3)'
              }}
            >
              {currentStep === steps.length - 1 ? 'Complete Tour' : 'Continue Journey'}
            </button>
          </div>
        </div>

      <style jsx>{`
        @keyframes tour-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
    </>
  );
}