import { useState } from 'react';
import { Brain, Target, Lightbulb, Calendar, Clock, Send } from 'lucide-react';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  timeSlot?: 'morning' | 'afternoon' | 'evening';
}

interface Schedule {
  morning: Task[];
  afternoon: Task[];
  evening: Task[];
  unscheduled: Task[];
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface MCPPromptsPanelProps {
  currentAction: string;
  setCurrentAction: (action: string) => void;
  schedule: Schedule;
  onScheduleUpdate?: () => void;
}

const callPrompt = async (promptName: string, args: any = {}) => {
  const queryParams = new URLSearchParams(args).toString();
  const response = await fetch(`/api/mcp/prompts/${promptName}?${queryParams}`);
  
  if (!response.ok) {
    throw new Error(`Prompt call failed: ${response.statusText}`);
  }
  
  return response.json();
};

const callTool = async (toolName: string, args: any = {}) => {
  const response = await fetch(`/api/mcp/tools/${toolName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  
  if (!response.ok) {
    throw new Error(`Tool call failed: ${response.statusText}`);
  }
  
  return response.json();
};

export const MCPPromptsPanel = ({ currentAction, setCurrentAction, schedule, onScheduleUpdate }: MCPPromptsPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your AI productivity assistant. I can help you manage tasks, provide productivity tips, and plan your day!\n\n✨ **New**: I can now execute actions directly! Try saying:\n• "Add task: make breakfast"\n• "Complete task: [task name]"\n• "Plan my day"\n• Or just ask me questions about productivity!',
      timestamp: new Date(),
    }
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [selectedRole, setSelectedRole] = useState('productivity_coach');
  const [loading, setLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const roles = [
    { value: 'productivity_coach', label: 'Productivity Coach', description: 'Focus on efficiency and time management' },
    { value: 'task_planner', label: 'Task Planner', description: 'Help organize and prioritize tasks' },
    { value: 'creative_helper', label: 'Creative Helper', description: 'Brainstorm ideas and solutions' },
    { value: 'helpful_assistant', label: 'General Assistant', description: 'All-purpose AI helper' },
  ];

  const simulateStreaming = (text: string, messageId: string) => {
    const words = text.split(' ');
    let currentText = '';
    let wordIndex = 0;

    const streamInterval = setInterval(() => {
      if (wordIndex < words.length) {
        currentText += (wordIndex > 0 ? ' ' : '') + words[wordIndex];
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: currentText, isStreaming: true }
            : msg
        ));
        wordIndex++;
      } else {
        clearInterval(streamInterval);
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, isStreaming: false }
            : msg
        ));
        setStreamingMessageId(null);
      }
    }, 50);
  };

  const detectAndExecuteToolActions = async (userMessage: string): Promise<string | null> => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Detect task creation requests
    const addTaskPatterns = [
      /(?:add|create|make|new)\s+(?:a\s+)?task\s*:?\s*(.+)/i,
      /(?:can you|please)\s+(?:add|create)\s+(?:a\s+)?task\s*:?\s*(.+)/i,
      /(?:i need to|i want to|i should)\s+(.+)/i,
      /(?:remind me to|help me)\s+(.+)/i
    ];

    for (const pattern of addTaskPatterns) {
      const match = userMessage.match(pattern);
      if (match && match[1]) {
        try {
          setCurrentAction('Calling tool: smart_add_task');
          const result = await callTool('smart_add_task', { text: match[1].trim() });
          if (onScheduleUpdate) onScheduleUpdate();
          return `✅ ${result.content[0].text}`;
        } catch (error) {
          return `❌ Failed to add task: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
    }

    // Detect planning requests
    if (lowerMessage.includes('plan my day') || lowerMessage.includes('organize my tasks') || lowerMessage.includes('schedule my tasks')) {
      try {
        setCurrentAction('Calling tool: plan_day');
        const result = await callTool('plan_day');
        if (onScheduleUpdate) onScheduleUpdate();
        return `📅 ${result.content[0].text}`;
      } catch (error) {
        return `❌ Failed to plan day: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    // Detect completion requests
    const completeTaskPattern = /(?:complete|mark as done|finish|done)\s+(?:task\s+)?(?:with\s+)?(?:id\s+)?(.+)/i;
    const completeMatch = userMessage.match(completeTaskPattern);
    if (completeMatch && completeMatch[1]) {
      const taskIdentifier = completeMatch[1].trim();
      
      // Find task by text or ID
      const allTasks = [...schedule.morning, ...schedule.afternoon, ...schedule.evening, ...schedule.unscheduled];
      const task = allTasks.find(t => 
        t.text.toLowerCase().includes(taskIdentifier.toLowerCase()) || 
        t.id === taskIdentifier
      );
      
      if (task) {
        try {
          setCurrentAction('Calling tool: complete_task');
          const result = await callTool('complete_task', { taskId: task.id });
          if (onScheduleUpdate) onScheduleUpdate();
          return `✅ ${result.content[0].text}`;
        } catch (error) {
          return `❌ Failed to complete task: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      } else {
        return `❌ Could not find a task matching "${taskIdentifier}". Please be more specific or use the exact task name.`;
      }
    }

    return null; // No tool action detected
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: currentInput.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = currentInput.trim();
    setCurrentInput('');
    setLoading(true);

    try {
      // First, try to detect and execute tool actions
      const toolResult = await detectAndExecuteToolActions(messageToSend);
      
      if (toolResult) {
        // Tool action was executed, show the result
        const toolMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: toolResult,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, toolMessage]);
      } else {
        // No tool action detected, use the AI assistant
        setCurrentAction('Calling prompt: custom_assistant');
        
        // Create context from recent messages
        const conversationContext = messages.slice(-5).map(msg => 
          `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n');

        // Add current task data to context
        const allTasks = [
          ...schedule.morning,
          ...schedule.afternoon, 
          ...schedule.evening,
          ...schedule.unscheduled
        ];

        const taskContext = allTasks.length > 0 ? 
          `\n\nCurrent user's tasks:\n${allTasks.map(task => 
            `- ${task.text} (${task.timeSlot || 'unscheduled'}) ${task.completed ? '[COMPLETED]' : '[PENDING]'}`
          ).join('\n')}` : 
          '\n\nThe user has no tasks currently planned.';

        const enhancedContext = conversationContext + taskContext + 
          '\n\nNote: You can suggest that the user try commands like "add task: [description]", "complete task: [task name]", or "plan my day" to perform actions directly through the chat.';

        const result = await callPrompt('custom_assistant', {
          message: messageToSend,
          context: enhancedContext,
          role: selectedRole
        });

        const responseText = result.messages?.[0]?.content?.text || 'No response received';
        
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: '',
          timestamp: new Date(),
          isStreaming: true,
        };

        setMessages(prev => [...prev, assistantMessage]);
        setStreamingMessageId(assistantMessage.id);
        simulateStreaming(responseText, assistantMessage.id);
      }

    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setCurrentAction('');
    }
  };

  const handleQuickPrompt = async (promptType: string) => {
    let message = '';
    const hasActiveTasks = schedule.morning.length + schedule.afternoon.length + schedule.evening.length + schedule.unscheduled.length > 0;
    
    switch (promptType) {
      case 'tasks':
        message = hasActiveTasks ? 
          'Can you help me prioritize my current tasks and suggest what to focus on next?' :
          'Can you suggest some productive tasks for my day?';
        break;
      case 'tips':
        message = hasActiveTasks ? 
          'Based on my current tasks, what productivity tips would help me get more done?' :
          'What are some productivity tips for better time management?';
        break;
      case 'schedule':
        message = hasActiveTasks ? 
          'How can I optimize my current schedule and task list for better productivity?' :
          'How can I structure my day for better productivity?';
        break;
    }
    setCurrentInput(message);
  };

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: '5px', height: '400px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '12px', 
        backgroundColor: '#f5f5f5', 
        borderBottom: '1px solid #ccc', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Brain size={16} />
          Interactive AI Assistant
        </div>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: 'white'
          }}
        >
          {roles.map(role => (
            <option key={role.value} value={role.value} title={role.description}>
              {role.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ flex: 1, padding: '12px', overflow: 'auto', backgroundColor: '#fafafa' }}>
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: 'flex',
              justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                maxWidth: '80%',
                padding: '10px 12px',
                borderRadius: '12px',
                backgroundColor: message.type === 'user' ? '#2196f3' : '#e3f2fd',
                color: message.type === 'user' ? 'white' : '#333',
                fontSize: '14px',
                lineHeight: '1.4',
                wordBreak: 'break-word',
                position: 'relative',
              }}
            >
              {message.content}
              {message.isStreaming && (
                <span style={{ 
                  animation: 'blink 1s infinite',
                  marginLeft: '2px' 
                }}>|</span>
              )}
              <div style={{
                fontSize: '11px',
                opacity: 0.7,
                marginTop: '4px',
                textAlign: message.type === 'user' ? 'right' : 'left'
              }}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {loading && !streamingMessageId && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-start',
            marginBottom: '12px' 
          }}>
            <div style={{
              padding: '10px 12px',
              borderRadius: '12px',
              backgroundColor: '#e3f2fd',
              fontSize: '14px',
              fontStyle: 'italic',
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Brain size={16} />
              Thinking...
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '12px', borderTop: '1px solid #ccc', backgroundColor: 'white' }}>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          <button
            onClick={() => handleQuickPrompt('tasks')}
            disabled={loading}
            style={{
              flex: 1,
              padding: '6px',
              fontSize: '11px',
              backgroundColor: '#e8f5e8',
              border: '1px solid #4caf50',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Target size={14} />
              Tasks
            </div>
          </button>
          <button
            onClick={() => handleQuickPrompt('tips')}
            disabled={loading}
            style={{
              flex: 1,
              padding: '6px',
              fontSize: '11px',
              backgroundColor: '#fff3e0',
              border: '1px solid #ff9800',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Lightbulb size={14} />
              Tips
            </div>
          </button>
          <button
            onClick={() => handleQuickPrompt('schedule')}
            disabled={loading}
            style={{
              flex: 1,
              padding: '6px',
              fontSize: '11px',
              backgroundColor: '#e3f2fd',
              border: '1px solid #2196f3',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Calendar size={14} />
              Schedule
            </div>
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask me anything about productivity..."
            disabled={loading}
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={loading || !currentInput.trim()}
            style={{
              padding: '10px 16px',
              backgroundColor: loading ? '#ccc' : '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            {loading ? <Clock size={16} /> : <Send size={16} />}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};