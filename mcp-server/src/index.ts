#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  timeSlot?: 'morning' | 'afternoon' | 'evening';
}

interface DailyPlan {
  date: string;
  tasks: Task[];
}

const DATA_FILE = path.join(__dirname, '..', 'daily-plan.json');

class PlannerServer {
  private server: Server;

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
        },
      }
    );

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
        return {
          contents: [
            {
              uri: 'today-tasks',
              mimeType: 'application/json',
              text: JSON.stringify(plan.tasks, null, 2),
            },
          ],
        };
      }

      if (request.params.uri === 'schedule') {
        const schedule = {
          morning: plan.tasks.filter(t => t.timeSlot === 'morning'),
          afternoon: plan.tasks.filter(t => t.timeSlot === 'afternoon'),
          evening: plan.tasks.filter(t => t.timeSlot === 'evening'),
          unscheduled: plan.tasks.filter(t => !t.timeSlot),
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
        task.completed = true;
        await this.writePlan(plan);
        return {
          content: [
            {
              type: 'text',
              text: `Completed task: ${task.text}`,
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

      throw new Error(`Unknown tool: ${name}`);
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new PlannerServer();
server.run().catch(console.error);