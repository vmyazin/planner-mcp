import { NextApiRequest, NextApiResponse } from 'next';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import fs from 'fs/promises';
import Anthropic from '@anthropic-ai/sdk';

export interface MCPLogEntry {
  id: string;
  timestamp: string;
  direction: 'request' | 'response';
  method: string;
  data: any;
  success: boolean;
  error?: string;
}

let mcpClient: Client | null = null;
let mcpLogs: MCPLogEntry[] = [];

// Task interfaces for direct implementation
interface Task {
  id: string;
  text: string;
  completed: boolean;
  archived?: boolean;
  timeSlot?: 'morning' | 'afternoon' | 'evening';
}

interface DailyPlan {
  date: string;
  tasks: Task[];
}

function logMCPInteraction(entry: Omit<MCPLogEntry, 'id' | 'timestamp'>) {
  const logEntry: MCPLogEntry = {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  mcpLogs.push(logEntry);
  // Keep only last 100 entries
  if (mcpLogs.length > 100) {
    mcpLogs = mcpLogs.slice(-100);
  }
}

// For Vercel deployment, implement MCP server functionality directly
// instead of spawning a separate process which doesn't work in serverless environment
async function getMcpClient(): Promise<Client> {
  if (mcpClient) {
    return mcpClient;
  }

  const isVercel = process.env.VERCEL === '1';
  
  if (isVercel) {
    // On Vercel, we can't spawn separate processes, so we'll return a mock client
    // and handle MCP operations directly in the API handlers below
    throw new Error('Vercel deployment uses direct MCP implementation - no client needed');
  }

  // For local development
  const serverPath = path.join(process.cwd(), '..', 'mcp-server', 'dist', 'index.js');
  const serverDir = path.join(process.cwd(), '..', 'mcp-server');
  
  const transport = new StdioClientTransport({
    command: process.execPath, // Use the same node executable that's running Next.js
    args: [serverPath],
    env: {
      ...process.env,
      // Ensure ANTHROPIC_API_KEY is passed through
      ...(process.env.ANTHROPIC_API_KEY && { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY })
    },
    cwd: serverDir, // Set working directory to mcp-server
  });

  mcpClient = new Client(
    {
      name: 'planner-dashboard-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  await mcpClient.connect(transport);
  return mcpClient;
}

// Direct MCP implementation for Vercel (serverless environment)
const getDataFilePath = () => {
  const isVercel = process.env.VERCEL === '1';
  if (isVercel) {
    // On Vercel, use /tmp for file storage (ephemeral)
    return '/tmp/daily-plan.json';
  }
  // Local development - use relative path to mcp-server directory
  return path.join(process.cwd(), '..', 'mcp-server', 'daily-plan.json');
};

async function ensureDataFile(): Promise<void> {
  const dataFile = getDataFilePath();
  try {
    await fs.access(dataFile);
  } catch {
    const today = new Date().toISOString().split('T')[0];
    const initialData: DailyPlan = { date: today, tasks: [] };
    await fs.writeFile(dataFile, JSON.stringify(initialData, null, 2));
  }
}

async function readPlan(): Promise<DailyPlan> {
  await ensureDataFile();
  const dataFile = getDataFilePath();
  const data = await fs.readFile(dataFile, 'utf-8');
  return JSON.parse(data);
}

async function writePlan(plan: DailyPlan): Promise<void> {
  const dataFile = getDataFilePath();
  await fs.writeFile(dataFile, JSON.stringify(plan, null, 2));
}

function categorizeTask(text: string): 'morning' | 'afternoon' | 'evening' | undefined {
  const lowerText = text.toLowerCase();
  
  // Morning keywords and patterns
  const morningKeywords = [
    'breakfast', 'coffee', 'morning', 'wake up', 'shower', 'exercise', 'gym',
    'jog', 'run', 'meditation', 'yoga', 'check email', 'review', 'plan day',
    'morning routine', 'get ready', 'commute', 'early', 'dawn', 'sunrise'
  ];
  
  // Afternoon keywords and patterns
  const afternoonKeywords = [
    'lunch', 'meeting', 'work', 'call', 'appointment', 'errands', 'shopping',
    'grocery', 'bank', 'office', 'project', 'deadline', 'presentation',
    'conference', 'interview', 'doctor', 'dentist', 'pickup', 'drop off'
  ];
  
  // Evening keywords and patterns
  const eveningKeywords = [
    'dinner', 'cook', 'evening', 'night', 'after work', 'relax', 'unwind',
    'watch', 'movie', 'tv', 'read', 'book', 'family time', 'date',
    'friends', 'bar', 'restaurant', 'late', 'sunset', 'bedtime', 'sleep'
  ];
  
  // Check for explicit lunch mention first
  if (lowerText.includes('lunch')) {
    return 'afternoon';
  }
  
  // Check for time-specific patterns (e.g., "at 7am", "in the morning")
  if (lowerText.includes('am') || lowerText.includes('morning') || 
      lowerText.match(/\b[6-9]\s*(:|am|\s*am)/)) {
    return 'morning';
  }
  
  if (lowerText.includes('pm') && (lowerText.includes('6') || lowerText.includes('7') || 
      lowerText.includes('8') || lowerText.includes('9') || lowerText.includes('10'))) {
    return 'evening';
  }
  
  if (lowerText.includes('evening') || lowerText.includes('night') || 
      lowerText.includes('tonight')) {
    return 'evening';
  }
  
  // Count keyword matches for each time slot
  const morningScore = morningKeywords.filter(keyword => lowerText.includes(keyword)).length;
  const afternoonScore = afternoonKeywords.filter(keyword => lowerText.includes(keyword)).length;
  const eveningScore = eveningKeywords.filter(keyword => lowerText.includes(keyword)).length;
  
  // Return the time slot with the highest score, or undefined if all scores are 0
  if (morningScore === 0 && afternoonScore === 0 && eveningScore === 0) {
    return undefined;
  }
  
  if (morningScore >= afternoonScore && morningScore >= eveningScore) {
    return 'morning';
  } else if (afternoonScore >= eveningScore) {
    return 'afternoon';
  } else {
    return 'evening';
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const action = req.query.action as string[];
    const isVercel = process.env.VERCEL === '1';

    // Special endpoint for fetching logs
    if (req.method === 'GET' && action[0] === 'logs') {
      return res.json({ logs: mcpLogs });
    }

    // Special endpoint for server status
    if (req.method === 'GET' && action[0] === 'status') {
      let isConnected = false;
      let capabilities: any = null;
      
      try {
        if (isVercel) {
          // On Vercel, use direct implementation
          isConnected = true;
          capabilities = {
            tools: [
              {
                name: 'add_task',
                description: 'Add a new task to today\'s plan',
                inputSchema: {
                  type: 'object',
                  properties: {
                    text: { type: 'string', description: 'Task description' },
                    timeSlot: { 
                      type: 'string', 
                      enum: ['morning', 'afternoon', 'evening'],
                      description: 'Optional time slot assignment'
                    },
                  },
                  required: ['text'],
                },
              },
              {
                name: 'complete_task',
                description: 'Mark a task as completed',
                inputSchema: {
                  type: 'object',
                  properties: {
                    taskId: { type: 'string', description: 'Task ID to complete' },
                  },
                  required: ['taskId'],
                },
              },
              {
                name: 'plan_day',
                description: 'Automatically assign unscheduled tasks to time slots',
                inputSchema: {
                  type: 'object',
                  properties: {},
                  additionalProperties: false,
                },
              },
              {
                name: 'archive_task',
                description: 'Archive a completed task to remove it from active view',
                inputSchema: {
                  type: 'object',
                  properties: {
                    taskId: { type: 'string', description: 'Task ID to archive' },
                  },
                  required: ['taskId'],
                },
              },
              {
                name: 'smart_add_task',
                description: 'Add a task using natural language with automatic time slot categorization',
                inputSchema: {
                  type: 'object',
                  properties: {
                    text: { type: 'string', description: 'Natural language task description' },
                  },
                  required: ['text'],
                },
              },
            ],
            resources: [
              {
                name: 'Today\'s Tasks',
                uri: 'today-tasks',
                description: 'Current day\'s tasks',
                mimeType: 'application/json',
              },
              {
                name: 'Time Slots',
                uri: 'schedule',
                description: 'Morning, afternoon, and evening time slots',
                mimeType: 'application/json',
              },
            ],
            prompts: [
              {
                name: 'custom_assistant',
                description: 'Interactive AI assistant for any question or task',
                arguments: [
                  {
                    name: 'message',
                    description: 'Your question or request for the AI assistant',
                    required: true,
                  },
                  {
                    name: 'context',
                    description: 'Additional context or conversation history',
                    required: false,
                  },
                  {
                    name: 'role',
                    description: 'AI assistant role (productivity_coach, task_planner, creative_helper, etc.)',
                    required: false,
                  },
                ],
              },
              {
                name: 'suggest_tasks',
                description: 'Get AI-powered task suggestions for your day',
                arguments: [
                  {
                    name: 'context',
                    description: 'Additional context about your day, goals, or priorities',
                    required: false,
                  },
                  {
                    name: 'focus_area',
                    description: 'Specific area to focus on (work, personal, health, etc.)',
                    required: false,
                  },
                ],
              },
            ]
          };
        } else {
          // Local development - use MCP client
          const client = await getMcpClient();
          isConnected = true;
          
          const tools = await client.listTools();
          const resources = await client.listResources();
          capabilities = {
            tools: tools.tools || [],
            resources: resources.resources || [],
            prompts: [] as any[]
          };
          
          try {
            const prompts = await client.listPrompts();
            capabilities.prompts = prompts.prompts || [];
          } catch (error) {
            // Prompts might not be supported
          }
        }
      } catch (error) {
        console.error('Status check failed:', error);
        isConnected = false;
      }
      
      return res.json({
        connected: isConnected,
        capabilities,
        messageCount: mcpLogs.length
      });
    }

    // Get client for local development, use direct implementation for Vercel
    let client: Client | null = null;
    if (!isVercel) {
      client = await getMcpClient();
    }

    if (req.method === 'GET') {
      if (action[0] === 'prompts') {
        if (action.length === 1) {
          logMCPInteraction({
            direction: 'request',
            method: 'listPrompts',
            data: {},
            success: true
          });

          let result;
          if (isVercel) {
            // Direct implementation for Vercel
            result = {
              prompts: [
                {
                  name: 'custom_assistant',
                  description: 'Interactive AI assistant for any question or task',
                  arguments: [
                    {
                      name: 'message',
                      description: 'Your question or request for the AI assistant',
                      required: true,
                    },
                    {
                      name: 'context',
                      description: 'Additional context or conversation history',
                      required: false,
                    },
                    {
                      name: 'role',
                      description: 'AI assistant role (productivity_coach, task_planner, creative_helper, etc.)',
                      required: false,
                    },
                  ],
                },
                {
                  name: 'suggest_tasks',
                  description: 'Get AI-powered task suggestions for your day',
                  arguments: [
                    {
                      name: 'context',
                      description: 'Additional context about your day, goals, or priorities',
                      required: false,
                    },
                    {
                      name: 'focus_area',
                      description: 'Specific area to focus on (work, personal, health, etc.)',
                      required: false,
                    },
                  ],
                },
              ]
            };
          } else {
            result = await client!.listPrompts();
          }
          
          logMCPInteraction({
            direction: 'response',
            method: 'listPrompts',
            data: result,
            success: true
          });

          return res.json(result);
        } else {
          const promptName = action[1];
          
          // Convert query parameters to proper arguments object
          const args: Record<string, any> = {};
          Object.entries(req.query).forEach(([key, value]) => {
            if (key !== 'action') {
              args[key] = Array.isArray(value) ? value[0] : value;
            }
          });
          
          const requestData = { 
            name: promptName,
            arguments: args
          };
          
          logMCPInteraction({
            direction: 'request',
            method: 'getPrompt',
            data: requestData,
            success: true
          });

          let result;
          if (isVercel) {
            // Direct implementation for Vercel with Anthropic API
            const promptName = requestData.name;
            const args = requestData.arguments;
            
            if (!process.env.ANTHROPIC_API_KEY) {
              throw new Error('Anthropic API key not configured. Please set ANTHROPIC_API_KEY in your environment.');
            }
            
            const anthropic = new Anthropic({
              apiKey: process.env.ANTHROPIC_API_KEY,
            });

            if (promptName === 'custom_assistant') {
              const message = args?.message || '';
              const context = args?.context || '';
              const role = args?.role || 'helpful assistant';

              if (!message) {
                throw new Error('Message is required for custom_assistant prompt');
              }

              const systemPrompt = `You are a ${role} helping with productivity and task management. 

${context ? `Previous conversation and current context: ${context}` : ''}

When the user mentions "my tasks", "my day", "current tasks", or similar references, use the task information provided in the context above. Be specific about their actual tasks when giving advice.

Provide helpful, practical, and actionable responses. Be conversational and engaging while staying focused on productivity and planning topics. When you can see their actual tasks, reference them specifically in your advice.`;

              const response = await anthropic.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 500,
                messages: [
                  {
                    role: 'user',
                    content: message,
                  },
                ],
                system: systemPrompt,
              });

              result = {
                description: 'Interactive AI assistant response',
                messages: [
                  {
                    role: 'assistant',
                    content: {
                      type: 'text',
                      text: response.content[0].type === 'text' ? response.content[0].text : 'Error generating response',
                    },
                  },
                ],
              };
            } else if (promptName === 'suggest_tasks') {
              const context = args?.context || '';
              const focusArea = args?.focus_area || '';
              
              const systemPrompt = `You are a helpful productivity assistant. Generate 3-5 practical, actionable task suggestions for today.

${context ? `Context: ${context}` : ''}
${focusArea ? `Focus area: ${focusArea}` : ''}

Provide tasks that are:
- Specific and actionable
- Achievable in a day
- Relevant to the context/focus area
- Varied in scope (mix of quick wins and deeper work)

Format as a simple numbered list.`;

              const response = await anthropic.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 300,
                messages: [
                  {
                    role: 'user',
                    content: 'Please suggest some tasks for my day.',
                  },
                ],
                system: systemPrompt,
              });

              result = {
                description: 'AI-generated task suggestions for your day',
                messages: [
                  {
                    role: 'assistant',
                    content: {
                      type: 'text',
                      text: response.content[0].type === 'text' ? response.content[0].text : 'Error generating suggestions',
                    },
                  },
                ],
              };
            } else {
              throw new Error(`Unknown prompt: ${promptName}`);
            }
          } else {
            result = await client!.getPrompt(requestData);
          }
          
          logMCPInteraction({
            direction: 'response',
            method: 'getPrompt',
            data: result,
            success: true
          });

          return res.json(result);
        }
      }

      if (action[0] === 'resources') {
        if (action.length === 1) {
          logMCPInteraction({
            direction: 'request',
            method: 'listResources',
            data: {},
            success: true
          });

          let result;
          if (isVercel) {
            // Direct implementation for Vercel
            result = {
              resources: [
                {
                  uri: 'today-tasks',
                  name: 'Today\'s Tasks',
                  description: 'Current day\'s tasks',
                  mimeType: 'application/json',
                },
                {
                  uri: 'schedule',
                  name: 'Time Slots',
                  description: 'Morning, afternoon, and evening time slots',
                  mimeType: 'application/json',
                },
              ]
            };
          } else {
            result = await client!.listResources();
          }
          
          logMCPInteraction({
            direction: 'response',
            method: 'listResources',
            data: result,
            success: true
          });

          return res.json(result);
        } else {
          const resourceUri = action[1];
          const requestData = { uri: resourceUri };
          
          logMCPInteraction({
            direction: 'request',
            method: 'readResource',
            data: requestData,
            success: true
          });

          let result;
          if (isVercel) {
            // Direct implementation for Vercel
            const plan = await readPlan();
            
            if (resourceUri === 'today-tasks') {
              const activeTasks = plan.tasks.filter(t => !t.archived);
              result = {
                contents: [
                  {
                    uri: 'today-tasks',
                    mimeType: 'application/json',
                    text: JSON.stringify(activeTasks, null, 2),
                  },
                ],
              };
            } else if (resourceUri === 'schedule') {
              const activeTasks = plan.tasks.filter(t => !t.archived);
              const schedule = {
                morning: activeTasks.filter(t => t.timeSlot === 'morning'),
                afternoon: activeTasks.filter(t => t.timeSlot === 'afternoon'),
                evening: activeTasks.filter(t => t.timeSlot === 'evening'),
                unscheduled: activeTasks.filter(t => !t.timeSlot),
              };
              result = {
                contents: [
                  {
                    uri: 'schedule',
                    mimeType: 'application/json',
                    text: JSON.stringify(schedule, null, 2),
                  },
                ],
              };
            } else {
              throw new Error(`Unknown resource: ${resourceUri}`);
            }
          } else {
            result = await client!.readResource(requestData);
          }
          
          logMCPInteraction({
            direction: 'response',
            method: 'readResource',
            data: result,
            success: true
          });

          return res.json(result);
        }
      }

      if (action[0] === 'tools') {
        logMCPInteraction({
          direction: 'request',
          method: 'listTools',
          data: {},
          success: true
        });

        let result;
        if (isVercel) {
          // Direct implementation for Vercel
          result = {
            tools: [
              {
                name: 'add_task',
                description: 'Add a new task to today\'s plan',
                inputSchema: {
                  type: 'object',
                  properties: {
                    text: { type: 'string', description: 'Task description' },
                    timeSlot: { 
                      type: 'string', 
                      enum: ['morning', 'afternoon', 'evening'],
                      description: 'Optional time slot assignment'
                    },
                  },
                  required: ['text'],
                },
              },
              {
                name: 'complete_task',
                description: 'Mark a task as completed',
                inputSchema: {
                  type: 'object',
                  properties: {
                    taskId: { type: 'string', description: 'Task ID to complete' },
                  },
                  required: ['taskId'],
                },
              },
              {
                name: 'plan_day',
                description: 'Automatically assign unscheduled tasks to time slots',
                inputSchema: {
                  type: 'object',
                  properties: {},
                  additionalProperties: false,
                },
              },
              {
                name: 'archive_task',
                description: 'Archive a completed task to remove it from active view',
                inputSchema: {
                  type: 'object',
                  properties: {
                    taskId: { type: 'string', description: 'Task ID to archive' },
                  },
                  required: ['taskId'],
                },
              },
              {
                name: 'smart_add_task',
                description: 'Add a task using natural language with automatic time slot categorization',
                inputSchema: {
                  type: 'object',
                  properties: {
                    text: { type: 'string', description: 'Natural language task description' },
                  },
                  required: ['text'],
                },
              },
            ]
          };
        } else {
          result = await client!.listTools();
        }
        
        logMCPInteraction({
          direction: 'response',
          method: 'listTools',
          data: result,
          success: true
        });

        return res.json(result);
      }
    }

    if (req.method === 'POST') {
      if (action[0] === 'tools' && action[1]) {
        const toolName = action[1];
        const requestData = {
          name: toolName,
          arguments: req.body,
        };
        
        logMCPInteraction({
          direction: 'request',
          method: 'callTool',
          data: requestData,
          success: true
        });

        let result;
        if (isVercel) {
          // Direct implementation for Vercel
          const args = req.body;
          
          if (toolName === 'add_task') {
            const plan = await readPlan();
            const newTask: Task = {
              id: Date.now().toString(),
              text: args.text,
              completed: false,
              timeSlot: args.timeSlot,
            };
            plan.tasks.push(newTask);
            await writePlan(plan);
            result = {
              content: [
                {
                  type: 'text',
                  text: `Added task: ${newTask.text}`,
                },
              ],
            };
          } else if (toolName === 'complete_task') {
            const plan = await readPlan();
            const task = plan.tasks.find(t => t.id === args.taskId);
            if (!task) {
              throw new Error(`Task not found: ${args.taskId}`);
            }
            task.completed = true;
            await writePlan(plan);
            result = {
              content: [
                {
                  type: 'text',
                  text: `Completed task: ${task.text}`,
                },
              ],
            };
          } else if (toolName === 'plan_day') {
            const plan = await readPlan();
            const unscheduled = plan.tasks.filter(t => !t.timeSlot && !t.completed);
            const slots = ['morning', 'afternoon', 'evening'] as const;
            
            unscheduled.forEach((task, index) => {
              task.timeSlot = slots[index % slots.length];
            });

            await writePlan(plan);
            result = {
              content: [
                {
                  type: 'text',
                  text: `Assigned ${unscheduled.length} tasks to time slots`,
                },
              ],
            };
          } else if (toolName === 'archive_task') {
            const plan = await readPlan();
            const task = plan.tasks.find(t => t.id === args.taskId);
            if (!task) {
              throw new Error(`Task not found: ${args.taskId}`);
            }
            if (!task.completed) {
              throw new Error(`Task must be completed before archiving: ${task.text}`);
            }
            task.archived = true;
            await writePlan(plan);
            result = {
              content: [
                {
                  type: 'text',
                  text: `Archived task: ${task.text}`,
                },
              ],
            };
          } else if (toolName === 'smart_add_task') {
            const plan = await readPlan();
            const timeSlot = categorizeTask(args.text);
            const newTask: Task = {
              id: Date.now().toString(),
              text: args.text,
              completed: false,
              timeSlot: timeSlot,
            };
            plan.tasks.push(newTask);
            await writePlan(plan);
            
            const timeSlotText = timeSlot ? ` (automatically categorized as ${timeSlot})` : ' (no specific time detected)';
            result = {
              content: [
                {
                  type: 'text',
                  text: `Added task: ${newTask.text}${timeSlotText}`,
                },
              ],
            };
          } else {
            throw new Error(`Unknown tool: ${toolName}`);
          }
        } else {
          result = await client!.callTool(requestData);
        }
        
        logMCPInteraction({
          direction: 'response',
          method: 'callTool',
          data: result,
          success: true
        });

        return res.json(result);
      }
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('MCP API Error:', error);
    
    logMCPInteraction({
      direction: 'response',
      method: 'error',
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return res.status(500).json({ 
      error: 'MCP connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}