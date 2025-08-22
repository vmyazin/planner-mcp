import { Calendar } from 'lucide-react';
import { TourButton } from './TourButton';

export const DashboardHeader = () => {
  return (
    <div className="tour-welcome" style={{ padding: '20px', backgroundColor: '#1976d2', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={24} />
            MCP Day Planner - Learning Tool
          </h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>
            Learn MCP protocol by seeing it in action • Watch the right panel as you interact!
          </p>
        </div>
        <TourButton />
      </div>
    </div>
  );
};