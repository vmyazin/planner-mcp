#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

// Load .env from the mcp-server directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

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

const DATA_FILE = path.join(__dirname, '..', 'daily-plan.json');

class PlannerServer {
  private server: Server;
  private anthropic: Anthropic | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'planner-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      }
    );

    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      console.log('✅ Anthropic API key loaded successfully');
    } else {
      console.log('❌ No Anthropic API key found in environment variables');
      console.log('Environment variables:', Object.keys(process.env).filter(key => key.includes('ANTHROP')));
    }

    this.setupHandlers();
  }

  private async ensureDataFile(): Promise<void> {
    try {
      await fs.access(DATA_FILE);
    } catch {
      const today = new Date().toISOString().split('T')[0];
      const initialData: DailyPlan = { date: today, tasks: [] };
      await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2));
    }
  }

  private async readPlan(): Promise<DailyPlan> {
    await this.ensureDataFile();
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  }

  private async writePlan(plan: DailyPlan): Promise<void> {
    await fs.writeFile(DATA_FILE, JSON.stringify(plan, null, 2));
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
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
      ],
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const plan = await this.readPlan();

      if (request.params.uri === 'today-tasks') {
        const activeTasks = plan.tasks.filter(t => !t.archived);
        return {
          contents: [
            {
              uri: 'today-tasks',
              mimeType: 'application/json',
              text: JSON.stringify(activeTasks, null, 2),
            },
          ],
        };
      }

      if (request.params.uri === 'schedule') {
        const activeTasks = plan.tasks.filter(t => !t.archived);
        const schedule = {
          morning: activeTasks.filter(t => t.timeSlot === 'morning'),
          afternoon: activeTasks.filter(t => t.timeSlot === 'afternoon'),
          evening: activeTasks.filter(t => t.timeSlot === 'evening'),
          unscheduled: activeTasks.filter(t => !t.timeSlot),
        };
        return {
          contents: [
            {
              uri: 'schedule',
              mimeType: 'application/json',
              text: JSON.stringify(schedule, null, 2),
            },
          ],
        };
      }

      throw new Error(`Unknown resource: ${request.params.uri}`);
    });

    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
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
          description: 'Toggle task completion status (mark as completed or uncompleted)',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: { type: 'string', description: 'Task ID to toggle completion' },
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
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === 'add_task') {
        const plan = await this.readPlan();
        const newTask: Task = {
          id: Date.now().toString(),
          text: (args as any).text,
          completed: false,
          timeSlot: (args as any).timeSlot,
        };
        plan.tasks.push(newTask);
        await this.writePlan(plan);
        return {
          content: [
            {
              type: 'text',
              text: `Added task: ${newTask.text}`,
            },
          ],
        };
      }

      if (name === 'complete_task') {
        const plan = await this.readPlan();
        const task = plan.tasks.find(t => t.id === (args as any).taskId);
        if (!task) {
          throw new Error(`Task not found: ${(args as any).taskId}`);
        }
        task.completed = !task.completed;
        await this.writePlan(plan);
        return {
          content: [
            {
              type: 'text',
              text: task.completed ? `Completed task: ${task.text}` : `Uncompleted task: ${task.text}`,
            },
          ],
        };
      }

      if (name === 'plan_day') {
        const plan = await this.readPlan();
        const unscheduled = plan.tasks.filter(t => !t.timeSlot && !t.completed);
        const slots = ['morning', 'afternoon', 'evening'] as const;
        
        unscheduled.forEach((task, index) => {
          task.timeSlot = slots[index % slots.length];
        });

        await this.writePlan(plan);
        return {
          content: [
            {
              type: 'text',
              text: `Assigned ${unscheduled.length} tasks to time slots`,
            },
          ],
        };
      }

      if (name === 'archive_task') {
        const plan = await this.readPlan();
        const task = plan.tasks.find(t => t.id === (args as any).taskId);
        if (!task) {
          throw new Error(`Task not found: ${(args as any).taskId}`);
        }
        if (!task.completed) {
          throw new Error(`Task must be completed before archiving: ${task.text}`);
        }
        task.archived = true;
        await this.writePlan(plan);
        return {
          content: [
            {
              type: 'text',
              text: `Archived task: ${task.text}`,
            },
          ],
        };
      }

      throw new Error(`Unknown tool: ${name}`);
    });

    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
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
        {
          name: 'optimize_schedule',
          description: 'Get suggestions to optimize your daily schedule',
          arguments: [
            {
              name: 'current_tasks',
              description: 'Your current task list in JSON format',
              required: true,
            },
            {
              name: 'preferences',
              description: 'Your scheduling preferences (e.g., when you work best)',
              required: false,
            },
          ],
        },
        {
          name: 'productivity_tips',
          description: 'Get personalized productivity tips based on your tasks',
          arguments: [
            {
              name: 'task_types',
              description: 'Types of tasks you typically work on',
              required: false,
            },
          ],
        },
      ],
    }));

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!this.anthropic) {
        throw new Error('Anthropic API key not configured. Please set ANTHROPIC_API_KEY in your environment.');
      }

      if (name === 'custom_assistant') {
        const message = (args as any)?.message || '';
        const context = (args as any)?.context || '';
        const role = (args as any)?.role || 'helpful assistant';

        if (!message) {
          throw new Error('Message is required for custom_assistant prompt');
        }

        const systemPrompt = `You are a ${role} helping with productivity and task management. 

${context ? `Previous conversation and current context: ${context}` : ''}

When the user mentions "my tasks", "my day", "current tasks", or similar references, use the task information provided in the context above. Be specific about their actual tasks when giving advice.

Provide helpful, practical, and actionable responses. Be conversational and engaging while staying focused on productivity and planning topics. When you can see their actual tasks, reference them specifically in your advice.`;

        const response = await this.anthropic.messages.create({
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

        return {
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
      }

      if (name === 'suggest_tasks') {
        const context = (args as any)?.context || '';
        const focusArea = (args as any)?.focus_area || '';
        
        const systemPrompt = `You are a helpful productivity assistant. Generate 3-5 practical, actionable task suggestions for today.

${context ? `Context: ${context}` : ''}
${focusArea ? `Focus area: ${focusArea}` : ''}

Provide tasks that are:
- Specific and actionable
- Achievable in a day
- Relevant to the context/focus area
- Varied in scope (mix of quick wins and deeper work)

Format as a simple numbered list.`;

        const response = await this.anthropic.messages.create({
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

        return {
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
      }

      if (name === 'optimize_schedule') {
        const currentTasks = (args as any)?.current_tasks || '[]';
        const preferences = (args as any)?.preferences || '';

        const systemPrompt = `You are a productivity expert specializing in schedule optimization. 

Current tasks: ${currentTasks}
${preferences ? `Preferences: ${preferences}` : ''}

Analyze the current tasks and provide specific suggestions to optimize the schedule:
- Best time slots for different types of tasks
- Task sequencing recommendations
- Energy management tips
- Potential time blocks or groupings

Be concise and practical.`;

        const response = await this.anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 400,
          messages: [
            {
              role: 'user',
              content: 'Please analyze my schedule and suggest optimizations.',
            },
          ],
          system: systemPrompt,
        });

        return {
          description: 'Schedule optimization suggestions',
          messages: [
            {
              role: 'assistant',
              content: {
                type: 'text',
                text: response.content[0].type === 'text' ? response.content[0].text : 'Error generating optimization suggestions',
              },
            },
          ],
        };
      }

      if (name === 'productivity_tips') {
        const taskTypes = (args as any)?.task_types || '';

        const systemPrompt = `You are a productivity coach. Provide 3-4 specific, actionable productivity tips.

${taskTypes ? `Focus on tasks related to: ${taskTypes}` : ''}

Tips should be:
- Immediately applicable
- Evidence-based
- Practical for daily use
- Specific rather than generic

Format as a clear, numbered list.`;

        const response = await this.anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 300,
          messages: [
            {
              role: 'user',
              content: 'Please give me some productivity tips.',
            },
          ],
          system: systemPrompt,
        });

        return {
          description: 'Personalized productivity tips',
          messages: [
            {
              role: 'assistant',
              content: {
                type: 'text',
                text: response.content[0].type === 'text' ? response.content[0].text : 'Error generating productivity tips',
              },
            },
          ],
        };
      }

      throw new Error(`Unknown prompt: ${name}`);
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new PlannerServer();
server.run().catch(console.error);