# MCP Day Planner - Visual Learning Tool

A **visual MCP learning tool** that teaches the Model Context Protocol through interactive examples. Experience MCP in action while managing your daily tasks!

## 🎯 Educational Goals

- **Understand MCP concepts**: Resources vs Tools vs Prompts
- **See protocol in action**: Real-time JSON message inspection  
- **Learn by doing**: Every button click shows underlying MCP communication
- **Distinguish from REST**: Understand why MCP is powerful for AI integrations

## ✨ Features

### Split-Screen Learning Interface
- **Left**: Functional day planner (tasks, time slots, scheduling)
- **Right**: Educational panels showing MCP protocol internals

### Educational Components
- **🔍 Protocol Inspector**: Real-time MCP message logs with color-coded requests/responses
- **📚 Interactive Concepts**: Tabbed explanations of Resources, Tools, and Prompts with live examples
- **🖥️ Server Status**: Connection health, capabilities discovery, message count
- **🎯 Live Highlighting**: See exactly when each MCP concept is being used

### MCP Implementation
- **Server**: Node.js with 2 resources (`today-tasks`, `schedule`) and 3 tools (`add_task`, `complete_task`, `plan_day`)
- **Client**: Next.js dashboard with intelligent API proxy and detailed logging
- **Protocol**: Full MCP compliance with error handling and connection monitoring

## 🚀 Quick Start

```bash
# Install dependencies
cd mcp-server && npm install && npm run build
cd ../dashboard && npm install

# Run the learning tool
cd dashboard && npm run dev
```

Visit http://localhost:3000 and start learning MCP by:
1. Adding tasks (watch `callTool` messages)
2. Viewing schedules (watch `readResource` messages) 
3. Exploring the educational panels
4. Observing real-time protocol logs

## 📚 What You'll Learn

- **Resources**: Read-only data sources (like task lists)
- **Tools**: State-changing operations (like adding tasks)
- **MCP vs REST**: Protocol differences and AI integration benefits
- **Error Handling**: How MCP deals with connection issues
- **Real-time Communication**: Bidirectional protocol patterns

Perfect for developers new to MCP who want hands-on learning!

## 🌐 Deploy to Vercel

```bash
# Deploy to production
vercel env add ANTHROPIC_API_KEY  # Add your API key
vercel --prod
```

The project is configured for one-click deployment with both MCP server and dashboard.
