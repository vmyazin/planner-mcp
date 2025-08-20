import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string; // CSS selector or element ID
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'wait' | 'highlight' | 'refresh' | 'simulate-error';
  actionTarget?: string;
  waitForAction?: boolean;
  onEnter?: () => void;
  onExit?: () => void;
}

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  steps: TourStep[];
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  restartTour: () => void;
  hasCompletedTour: boolean;
  waitingForAction: boolean;
  completeAction: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

const TOUR_STORAGE_KEY = 'mcp-planner-tour-completed';

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to MCP Learning!',
    content: 'This app demonstrates the Model Context Protocol (MCP) - think of it like a special language that lets AI assistants talk to different programs and data. It\'s like having a universal translator that helps AI understand and use various tools and information sources!',
    target: '.tour-welcome',
    position: 'bottom'
  },
  {
    id: 'resources-concept',
    title: 'MCP Resources - Reading Data',
    content: 'These tasks come from an MCP Resource called "schedule". Think of Resources like reading a book or checking a menu - you can look at the information, but you can\'t change what\'s written. They\'re like digital filing cabinets that AI can peek into.',
    target: '.tour-task-container',
    position: 'right',
    action: 'highlight'
  },
  {
    id: 'live-resource-call',
    title: 'Watch a Resource Call Happen',
    content: 'Now let\'s see the actual MCP conversation! Just like watching a phone call between two people, the Protocol Inspector shows us the messages being sent back and forth. It\'s like eavesdropping on how the AI asks for information and gets answers back.',
    target: '.tour-protocol-inspector',
    position: 'left',
    action: 'refresh',
    onEnter: () => {
      // Force a refresh of the schedule resource
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          // Trigger SWR refresh
          const event = new CustomEvent('tour-refresh-schedule');
          window.dispatchEvent(event);
        }, 1000);
      }
    }
  },
  {
    id: 'tools-concept',
    title: 'MCP Tools - Taking Action',
    content: 'Tools are different from Resources - while Resources are like reading, Tools are like doing! Think of Tools as remote controls that let AI actually press buttons and make changes. This "Add Task" button is like giving the AI a magic wand to create something new.',
    target: '.tour-add-task-button',
    position: 'bottom',
    action: 'highlight'
  },
  {
    id: 'live-tool-call',
    title: 'Try Calling a Tool',
    content: 'Add a task with "Learn MCP" and watch the Protocol Inspector! It\'s like ordering food at a restaurant - you give specific instructions (the task name), and then you get confirmation that your order was received and processed.',
    target: '.tour-add-task-form',
    position: 'bottom',
    action: 'click',
    waitForAction: true,
    actionTarget: '.tour-add-task-button',
    onEnter: () => {
      // Pre-fill the task input with example text
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          const input = document.querySelector('.tour-add-task-form input[type="text"]') as HTMLInputElement;
          if (input) {
            input.value = 'Learn MCP protocol';
            const event = new Event('input', { bubbles: true });
            input.dispatchEvent(event);
          }
        }, 500);
      }
    }
  },
  {
    id: 'server-status',
    title: 'Server Capabilities',
    content: 'This panel shows what the system can do - like a store posting its hours and services on the window. When AI connects, it asks "What can you help me with?" and gets a list of available Resources (things to read) and Tools (actions to take). It\'s like getting a capabilities brochure!',
    target: '.tour-server-status',
    position: 'left',
    action: 'highlight'
  },
  {
    id: 'error-handling',
    title: 'MCP Error Handling Demo',
    content: 'MCP is designed to handle problems gracefully - like having a backup plan when your internet cuts out during a video call. Watch as we simulate a connection problem and then see how MCP automatically tries to reconnect and keep working, just like your phone reconnecting to WiFi.',
    target: '.tour-protocol-inspector',
    position: 'left',
    action: 'simulate-error',
    onEnter: () => {
      // Simulate connection error by triggering a forced error scenario
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          // Trigger error simulation
          const event = new CustomEvent('tour-simulate-error');
          window.dispatchEvent(event);
        }, 1000);
        
        // Auto advance after showing error recovery
        setTimeout(() => {
          const event = new CustomEvent('tour-error-complete');
          window.dispatchEvent(event);
        }, 5000);
      }
    }
  },
  {
    id: 'mcp-vs-rest',
    title: 'MCP vs REST APIs',
    content: 'Unlike traditional web connections (like visiting websites), MCP works more like having a smart conversation. Both sides can talk and listen, the system explains what it can do, and it\'s designed specifically for AI to understand and use. You\'ve seen how reading info (Resources), taking actions (Tools), and automatic discovery make MCP perfect for AI helpers!',
    target: '.tour-concepts-panel',
    position: 'left',
    action: 'highlight'
  }
];

export function TourProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedTour, setHasCompletedTour] = useState(false);
  const [waitingForAction, setWaitingForAction] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY) === 'true';
    setHasCompletedTour(completed);
  }, []);

  const startTour = () => {
    setIsActive(true);
    setCurrentStep(0);
    setWaitingForAction(false);
  };

  const nextStep = () => {
    const step = tourSteps[currentStep];
    if (step?.onExit) {
      step.onExit();
    }

    if (currentStep < tourSteps.length - 1) {
      const nextStepIndex = currentStep + 1;
      setCurrentStep(nextStepIndex);
      setWaitingForAction(false);
      
      const nextStep = tourSteps[nextStepIndex];
      if (nextStep?.onEnter) {
        nextStep.onEnter();
      }
      
      if (nextStep?.waitForAction) {
        setWaitingForAction(true);
      }
    } else {
      // Tour completed
      setIsActive(false);
      setHasCompletedTour(true);
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setWaitingForAction(false);
    }
  };

  const skipTour = () => {
    setIsActive(false);
    setHasCompletedTour(true);
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
  };

  const restartTour = () => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    setHasCompletedTour(false);
    startTour();
  };

  const completeAction = () => {
    if (waitingForAction) {
      setWaitingForAction(false);
      // Auto-advance after a short delay to let user see the result
      setTimeout(() => {
        nextStep();
      }, 2000);
    }
  };

  const value: TourContextType = {
    isActive,
    currentStep,
    steps: tourSteps,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    restartTour,
    hasCompletedTour,
    waitingForAction,
    completeAction
  };

  return (
    <TourContext.Provider value={value}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}