import { useState } from 'react';
import { Brain, Target, Lightbulb, Calendar, Clock, Send } from 'lucide-react';
import { parseTaskCommand, getTabForDate } from '../utils/commandProcessor';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  archived?: boolean;
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
  onNavigateToDay?: (date: Date, tabId: string) => void;
}

interface TaskMatchResult {
  task: Task | null;
  confidence: 'exact' | 'high' | 'medium' | 'low' | 'ambiguous' | 'none';
  matches?: Task[];
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

export const MCPPromptsPanel = ({ currentAction, setCurrentAction, schedule, onScheduleUpdate, onNavigateToDay }: MCPPromptsPanelProps) => {
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

  const findTaskByName = (taskName: string): TaskMatchResult => {
    const allTasks = [...schedule.morning, ...schedule.afternoon, ...schedule.evening, ...schedule.unscheduled]
      .filter(t => !t.completed);
    
    const lowerTaskName = taskName.toLowerCase();
    
    // 1. Exact match
    let exactMatch = allTasks.find(t => t.text.toLowerCase() === lowerTaskName);
    if (exactMatch) return { task: exactMatch, confidence: 'exact' };
    
    // 2. Starts with task name
    let startsWithMatch = allTasks.find(t => t.text.toLowerCase().startsWith(lowerTaskName));
    if (startsWithMatch) return { task: startsWithMatch, confidence: 'high' };
    
    // 3. Contains all words from task name
    const taskWords = lowerTaskName.split(/\s+/);
    let containsAllWords = allTasks.find(t => {
      const taskText = t.text.toLowerCase();
      return taskWords.every(word => taskText.includes(word));
    });
    if (containsAllWords) return { task: containsAllWords, confidence: 'high' };
    
    // 4. Contains task name as substring
    let containsMatch = allTasks.find(t => t.text.toLowerCase().includes(lowerTaskName));
    if (containsMatch) return { task: containsMatch, confidence: 'medium' };
    
    // 5. Fuzzy match - contains any word from task name
    const fuzzyMatches = allTasks.filter(t => {
      const taskText = t.text.toLowerCase();
      return taskWords.some(word => word.length > 2 && taskText.includes(word));
    });
    
    if (fuzzyMatches.length === 1) {
      return { task: fuzzyMatches[0], confidence: 'low' };
    } else if (fuzzyMatches.length > 1) {
      return { task: null, confidence: 'ambiguous', matches: fuzzyMatches };
    }
    
    return { task: null, confidence: 'none' };
  };

  const analyzeUserIntent = async (userMessage: string): Promise<{intent: string, params: any} | null> => {
    try {
      setCurrentAction('🤖 Analyzing intent...');
      const response = await fetch('/api/mcp/tools/analyze_intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });
      
      if (!response.ok) {
        return null; // Fallback to conversation
      }
      
      const result = await response.json();
      return JSON.parse(result.content[0].text);
    } catch (error) {
      console.error('Intent analysis failed:', error);
      return null; // Fallback to conversation
    }
  };

  const detectAndExecuteToolActions = async (userMessage: string): Promise<string | null> => {
    // First, try to parse as a day-specific task command using our natural language processor
    const commandResult = parseTaskCommand(userMessage);
    
    if (commandResult.success && commandResult.command) {
      const { command } = commandResult;
      
      if (command.action === 'add-task') {
        try {
          let taskDate: string;
          let navigationMessage = '';
          
          if (command.date && onNavigateToDay) {
            // Navigate to the specified day
            taskDate = command.date.toISOString().split('T')[0];
            const tabId = getTabForDate(command.date);
            onNavigateToDay(command.date, tabId);
            navigationMessage = ` (navigated to ${command.day || 'selected day'})`;
          } else {
            // Use current date
            taskDate = new Date().toISOString().split('T')[0];
          }
          
          if (command.timeSlot) {
            // Use add_task with specific time slot
            setCurrentAction('Calling tool: add_task');
            await callTool('add_task', {
              text: command.taskText,
              date: taskDate,
              timeSlot: command.timeSlot
            });
            if (onScheduleUpdate) onScheduleUpdate();
            return `✅ Added "${command.taskText}" to ${command.timeSlot}${navigationMessage}`;
          } else {
            // Use smart categorization
            setCurrentAction('Calling tool: smart_add_task');
            const result = await callTool('smart_add_task', {
              text: command.taskText,
              date: taskDate
            });
            if (onScheduleUpdate) onScheduleUpdate();
            return `✅ ${result.content[0].text}${navigationMessage}`;
          }
        } catch (error) {
          return `❌ Failed to add task: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
    }

    // If no day-specific command detected, use LLM to analyze user intent
    const intentResult = await analyzeUserIntent(userMessage);
    
    if (!intentResult) {
      return null; // Let it fall through to normal conversation
    }

    const { intent, params } = intentResult;

    // Handle different intents
    switch (intent) {
      case 'add_task':
        try {
          setCurrentAction('Calling tool: smart_add_task');
          const result = await callTool('smart_add_task', { text: params.taskText });
          if (onScheduleUpdate) onScheduleUpdate();
          return `✅ ${result.content[0].text}`;
        } catch (error) {
          return `❌ Failed to add task: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }

      case 'complete_task':
        if (params.taskId) {
          try {
            setCurrentAction('Calling tool: complete_task');
            const result = await callTool('complete_task', { taskId: params.taskId });
            if (onScheduleUpdate) onScheduleUpdate();
            return `✅ ${result.content[0].text}`;
          } catch (error) {
            return `❌ Failed to complete task: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        } else if (params.taskName) {
          // Find task by name
          const matchResult = findTaskByName(params.taskName);
          if (matchResult.confidence === 'exact' || matchResult.confidence === 'high') {
            try {
              setCurrentAction('Calling tool: complete_task');
              const result = await callTool('complete_task', { taskId: matchResult.task!.id });
              if (onScheduleUpdate) onScheduleUpdate();
              return `✅ ${result.content[0].text}`;
            } catch (error) {
              return `❌ Failed to complete task: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
          }
        } else if (params.taskNumber) {
          const taskNumber = parseInt(params.taskNumber) - 1;
          const allTasks = [...schedule.morning, ...schedule.afternoon, ...schedule.evening, ...schedule.unscheduled]
            .filter(t => !t.completed);
          
          if (taskNumber >= 0 && taskNumber < allTasks.length) {
            const task = allTasks[taskNumber];
            try {
              setCurrentAction('Calling tool: complete_task');
              const result = await callTool('complete_task', { taskId: task.id });
              if (onScheduleUpdate) onScheduleUpdate();
              return `✅ ${result.content[0].text} (selected by number)`;
            } catch (error) {
              return `❌ Failed to complete task: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
          }
        }
        break;

      case 'plan_day':
        try {
          setCurrentAction('Calling tool: plan_day');
          const result = await callTool('plan_day');
          if (onScheduleUpdate) onScheduleUpdate();
          return `📅 ${result.content[0].text}`;
        } catch (error) {
          return `❌ Failed to plan day: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }

      case 'archive_completed':
        const allTasks = [...schedule.morning, ...schedule.afternoon, ...schedule.evening, ...schedule.unscheduled];
        const completedTasks = allTasks.filter(t => t.completed && !t.archived);
        
        if (completedTasks.length === 0) {
          return '📋 No completed tasks to archive. All your completed tasks are already archived or you have no completed tasks.';
        }

        try {
          setCurrentAction('Archiving all completed tasks...');
          let archivedCount = 0;
          let errors: string[] = [];

          for (const task of completedTasks) {
            try {
              await callTool('archive_task', { taskId: task.id });
              archivedCount++;
            } catch (error) {
              errors.push(`Failed to archive "${task.text}": ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }

          if (onScheduleUpdate) onScheduleUpdate();

          let result = `✅ Successfully archived ${archivedCount} completed task${archivedCount !== 1 ? 's' : ''}!`;
          
          if (errors.length > 0) {
            result += `\n\n⚠️ Some tasks could not be archived:\n${errors.join('\n')}`;
          }

          return result;

        } catch (error) {
          return `❌ Failed to archive completed tasks: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }

      case 'list_tasks':
        const allTasksList = [...schedule.morning, ...schedule.afternoon, ...schedule.evening, ...schedule.unscheduled];
        const incompleteTasks = allTasksList.filter(t => !t.completed);
        const completedTasksList = allTasksList.filter(t => t.completed);

        if (allTasksList.length === 0) {
          return '📋 You have no tasks currently planned. Try saying "Add task: [description]" to create one!';
        }

        let response = '📋 **Your Current Tasks:**\n\n';
        
        if (incompleteTasks.length > 0) {
          response += '**🔄 Pending Tasks:**\n';
          incompleteTasks.forEach((task, index) => {
            const timeSlot = task.timeSlot ? ` (${task.timeSlot})` : ' (unscheduled)';
            response += `${index + 1}. ${task.text}${timeSlot}\n`;
          });
          response += '\n';
        }

        if (completedTasksList.length > 0) {
          response += '**✅ Completed Tasks:**\n';
          completedTasksList.forEach(task => {
            const timeSlot = task.timeSlot ? ` (${task.timeSlot})` : ' (unscheduled)';
            response += `• ${task.text}${timeSlot}\n`;
          });
          response += '\n';
        }

        response += '💡 **Tips:** \n• Say "complete [task name]" to mark a task as done\n• Say "complete task 1" to complete by number\n• Say "help" for more commands';
        return response;

      case 'help':
        return `🤖 **Assistant Commands:**

**Task Management:**
• "Add task: [description]" - Create a new task with smart categorization
• "Complete [task name]" - Mark a task as completed
• "Plan my day" - Organize unscheduled tasks into time slots
• "Archive all completed tasks" - Archive all finished tasks

**Information:**
• "List tasks" or "Show my tasks" - See all current tasks
• "What tasks do I have?" - View pending and completed tasks

**Examples:**
• "Add task: morning coffee" or just "Add morning coffee"
• "Create shopping list" or "Make shopping list"
• "Return letters to Bob" (natural language)
• "Buy groceries" or "Call dentist"
• "I need to call mom"
• "Complete presentation"
• "Archive all finished tasks"
• "Show me my evening tasks"

**Natural Language:**
I understand natural language - just speak naturally! I can also provide productivity advice and tips when you ask questions.`;
    }

    // If no intent matched, return null to fall through to normal conversation
    return null;
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