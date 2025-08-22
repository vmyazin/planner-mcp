import { useEffect, useState } from 'react';
import { getLocalStorageDate, setLocalStorageDate } from '../utils/localStorage';

interface TimedWelcomeModalProps {
  /** Number of days between modal displays */
  intervalDays?: number;
  /** Key used in localStorage to store the last shown timestamp */
  storageKey?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Additional CSS class name */
  className?: string;
  /** Override default content */
  children?: React.ReactNode;
}

/**
 * Self-contained Welcome Modal that manages its own display timing
 * Shows automatically on first visit, then every N days (default: 3)
 * 
 * For testing, you can call: window.resetWelcomeModal() in browser console
 */
export const TimedWelcomeModal = ({
  intervalDays = 3,
  storageKey = 'welcomeModalLastShown',
  debug = false,
  className,
  children
}: TimedWelcomeModalProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Development helper for testing
  useEffect(() => {
    if (debug && typeof window !== 'undefined') {
      (window as any).resetWelcomeModal = () => {
        localStorage.removeItem(storageKey);
        console.log(`[TimedWelcomeModal] Reset localStorage key: ${storageKey}`);
        window.location.reload();
      };
      (window as any).checkWelcomeModal = () => {
        const value = localStorage.getItem(storageKey);
        const date = value ? new Date(value) : null;
        console.log(`[TimedWelcomeModal] Current stored value:`, value);
        console.log(`[TimedWelcomeModal] Parsed date:`, date);
        if (date) {
          const daysSince = (new Date().getTime() - date.getTime()) / (24 * 60 * 60 * 1000);
          console.log(`[TimedWelcomeModal] Days since last shown:`, daysSince);
        }
      };
    }
  }, [debug, storageKey]);

  // Check if modal should be shown (client-side only)
  useEffect(() => {
    // Ensure we're running on the client side
    if (typeof window === 'undefined') return;
    
    const shouldShow = () => {
      const lastShown = getLocalStorageDate(storageKey, { debug });
      const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
      
      if (debug) {
        console.log(`[TimedWelcomeModal] Checking if modal should show. Last shown: ${lastShown}`);
        console.log(`[TimedWelcomeModal] Storage key: ${storageKey}`);
        console.log(`[TimedWelcomeModal] Interval days: ${intervalDays}`);
        // Also check raw localStorage value
        try {
          console.log(`[TimedWelcomeModal] Raw localStorage value:`, localStorage.getItem(storageKey));
        } catch (e) {
          console.log(`[TimedWelcomeModal] localStorage not available:`, e);
        }
      }
      
      if (!lastShown) {
        // First time visiting - show the modal
        if (debug) {
          console.log('[TimedWelcomeModal] First time visit - showing modal');
        }
        return true;
      }
      
      const now = new Date();
      const timeDiff = now.getTime() - lastShown.getTime();
      const daysDiff = timeDiff / (24 * 60 * 60 * 1000);
      
      if (debug) {
        console.log(`[TimedWelcomeModal] Days since last shown: ${daysDiff.toFixed(2)}`);
        console.log(`[TimedWelcomeModal] Time diff in ms: ${timeDiff}`);
        console.log(`[TimedWelcomeModal] Required interval ms: ${intervalMs}`);
      }
      
      if (timeDiff >= intervalMs) {
        // It's been enough time, show the modal again
        if (debug) {
          console.log(`[TimedWelcomeModal] ${intervalDays}+ days passed - showing modal`);
        }
        return true;
      } else {
        if (debug) {
          console.log('[TimedWelcomeModal] Modal shown recently - not showing');
        }
        return false;
      }
    };

    // Small delay to ensure proper hydration
    const timer = setTimeout(() => {
      setIsOpen(shouldShow());
    }, 100);
    
    return () => clearTimeout(timer);
  }, [intervalDays, storageKey, debug]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = () => {
    const now = new Date();
    if (debug) {
      console.log('[TimedWelcomeModal] Closing modal...');
      console.log('[TimedWelcomeModal] Current time:', now.toISOString());
      console.log('[TimedWelcomeModal] Storage key:', storageKey);
    }
    
    setIsOpen(false);
    const success = setLocalStorageDate(storageKey, now, { debug });
    
    if (debug) {
      console.log('[TimedWelcomeModal] localStorage write success:', success);
      console.log('[TimedWelcomeModal] Verification - stored value:', localStorage.getItem(storageKey));
      console.log('[TimedWelcomeModal] Modal closed and timestamp saved');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={className}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          maxWidth: '800px',
          maxHeight: '90vh',
          position: 'relative',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
          fontFamily: 'Arial, sans-serif',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            backgroundColor: 'white',
            borderRadius: '8px 8px 0 0',
            padding: '24px 32px 16px 32px',
            borderBottom: '1px solid #e0e0e0',
            zIndex: 10,
          }}
        >
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
              padding: '8px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ×
          </button>

          <h1 style={{ 
            color: '#1976d2', 
            margin: '0',
            fontSize: '28px',
            fontWeight: 'bold',
            lineHeight: '1.2',
            paddingRight: '40px'
          }}>
            Welcome to Your MCP Learning Environment
          </h1>
        </div>

        <div style={{ 
          padding: '24px 32px 32px 32px',
          overflow: 'auto',
          flex: 1
        }}>
          {children || <DefaultWelcomeContent />}
          
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <button
              onClick={handleClose}
              style={{
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                padding: '12px 32px',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#1565c0';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#1976d2';
              }}
            >
              Let's Get Started!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Default welcome content - can be overridden via children prop
 */
const DefaultWelcomeContent = () => (
  <>
    <section style={{ marginBottom: '32px' }}>
      <h2 style={{ 
        color: '#333', 
        fontSize: '20px', 
        marginBottom: '12px',
        fontWeight: '600'
      }}>
        What is MCP?
      </h2>
      <p style={{ 
        fontSize: '16px', 
        lineHeight: '1.6', 
        color: '#555',
        marginBottom: '0'
      }}>
        The Model Context Protocol (MCP) is a standardized way for AI assistants to connect with external tools and data sources. Think of it as USB for AI integrations - build an MCP server once, and any AI can use it.
      </p>
    </section>

    <section style={{ marginBottom: '32px' }}>
      <h2 style={{ 
        color: '#333', 
        fontSize: '20px', 
        marginBottom: '12px',
        fontWeight: '600'
      }}>
        Why MCP Matters
      </h2>
      <p style={{ 
        fontSize: '16px', 
        lineHeight: '1.6', 
        color: '#555',
        marginBottom: '0'
      }}>
        Instead of custom integrations for each AI project, MCP provides a universal "language" for AI-tool communication. Your MCP servers work with Claude, future AI models, and any MCP-compatible client.
      </p>
    </section>

    <section style={{ marginBottom: '32px' }}>
      <h2 style={{ 
        color: '#333', 
        fontSize: '20px', 
        marginBottom: '16px',
        fontWeight: '600'
      }}>
        10 Real-World MCP Projects
      </h2>
      <ol style={{ 
        fontSize: '16px', 
        lineHeight: '1.6', 
        color: '#555',
        paddingLeft: '20px',
        margin: '0'
      }}>
        <li style={{ marginBottom: '8px' }}>
          <strong>Personal Knowledge Assistant</strong> - AI searches your notes, documents, and bookmarks
        </li>
        <li style={{ marginBottom: '8px' }}>
          <strong>Development Workflow Helper</strong> - Connect AI to Git repos, logs, and monitoring dashboards
        </li>
        <li style={{ marginBottom: '8px' }}>
          <strong>Smart Home Controller</strong> - "Turn off lights and set alarm based on my calendar"
        </li>
        <li style={{ marginBottom: '8px' }}>
          <strong>Financial Tracker</strong> - AI analyzes banking APIs for spending insights and budgets
        </li>
        <li style={{ marginBottom: '8px' }}>
          <strong>Content Creation Pipeline</strong> - AI researches, writes, and schedules blog posts automatically
        </li>
        <li style={{ marginBottom: '8px' }}>
          <strong>Project Management Assistant</strong> - Connect Notion/Linear for task prioritization and timeline estimates
        </li>
        <li style={{ marginBottom: '8px' }}>
          <strong>Data Analysis Companion</strong> - Ask complex database questions in plain English
        </li>
        <li style={{ marginBottom: '8px' }}>
          <strong>Email & Calendar Optimizer</strong> - AI schedules meetings and suggests optimal time blocks
        </li>
        <li style={{ marginBottom: '8px' }}>
          <strong>Learning Assistant</strong> - AI creates personalized quizzes from your study materials
        </li>
        <li style={{ marginBottom: '8px' }}>
          <strong>Automation Hub</strong> - AI-powered decision making across multiple productivity tools
        </li>
      </ol>
    </section>

    <section style={{ marginBottom: '32px' }}>
      <h2 style={{ 
        color: '#333', 
        fontSize: '20px', 
        marginBottom: '12px',
        fontWeight: '600'
      }}>
        Start Learning
      </h2>
      <p style={{ 
        fontSize: '16px', 
        lineHeight: '1.6', 
        color: '#555',
        marginBottom: '16px'
      }}>
        This simple day planner demonstrates core MCP concepts you'll use in all these projects. Every click shows you the protocol in action, building your intuition for what's possible.
      </p>
      <p style={{ 
        fontSize: '18px', 
        fontWeight: '600', 
        color: '#1976d2',
        marginBottom: '0'
      }}>
        Ready to see how MCP works under the hood?
      </p>
    </section>
  </>
);