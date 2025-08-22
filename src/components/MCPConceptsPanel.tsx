import { useState } from 'react';
import { Lightbulb } from 'lucide-react';

interface MCPConceptsPanelProps {
  currentAction: string;
}

export const MCPConceptsPanel = ({ currentAction }: MCPConceptsPanelProps) => {
  const [activeTab, setActiveTab] = useState('resources');

  const concepts = {
    resources: {
      title: 'Resources',
      definition: 'Data sources that provide read-only information',
      purpose: 'Access structured data like today\'s tasks or schedule',
      example: 'Reading "today-tasks" to get current task list',
      liveExample: currentAction.includes('resource') ? '🔴 Resource being read now!' : ''
    },
    tools: {
      title: 'Tools',
      definition: 'Actions that can modify state or perform operations',
      purpose: 'Execute actions like adding tasks, completing tasks, or planning day',
      example: 'Calling "add_task" to create a new task',
      liveExample: currentAction.includes('tool') ? '🔴 Tool being called now!' : ''
    },
    prompts: {
      title: 'Prompts',
      definition: 'AI-powered templates for intelligent assistance',
      purpose: 'Get AI suggestions for tasks, schedule optimization, and productivity tips',
      example: 'Getting task suggestions or schedule optimization advice',
      liveExample: currentAction.includes('prompt') ? '🔴 AI prompt being called now!' : ''
    }
  };

  return (
    <div className="tour-concepts-panel" style={{ border: '1px solid #ccc', borderRadius: '5px', height: '250px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderBottom: '1px solid #ccc', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Lightbulb size={16} />
        Interactive MCP Concepts
      </div>
      <div style={{ display: 'flex', borderBottom: '1px solid #ccc' }}>
        {Object.entries(concepts).map(([key, concept]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              backgroundColor: activeTab === key ? '#2196f3' : '#f9f9f9',
              color: activeTab === key ? 'white' : 'black',
              cursor: 'pointer'
            }}
          >
            {concept.title}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, padding: '15px', overflow: 'auto' }}>
        {(() => {
          const concept = concepts[activeTab as keyof typeof concepts];
          return (
            <div>
              <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>{concept.title}</h4>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                <strong>What:</strong> {concept.definition}
              </p>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                <strong>Why:</strong> {concept.purpose}
              </p>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                <strong>Example:</strong> {concept.example}
              </p>
              {concept.liveExample && (
                <div style={{ 
                  padding: '8px', 
                  backgroundColor: '#fff3e0', 
                  border: '1px solid #ff9800', 
                  borderRadius: '3px',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  {concept.liveExample}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};