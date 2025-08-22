# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**MCP Day Planner** is a visual learning tool that teaches the Model Context Protocol (MCP) through interactive examples. It consists of two main components:

- **MCP Server** (`mcp-server/`): Node.js/TypeScript server implementing MCP protocol with resources, tools, and prompts
- **Dashboard** (`dashboard/`): Next.js React application providing split-screen interface for learning MCP

The project demonstrates MCP concepts in action while providing a functional day planner interface.

## Development Commands

### Initial Setup
```bash
# Install MCP server dependencies and build
cd mcp-server && npm install && npm run build

# Install dashboard dependencies
cd ../dashboard && npm install
```

### Running the Application
```bash
# Start the development server (from dashboard directory)
cd dashboard && npm run dev
```

Visit http://localhost:3000 to access the learning interface.

### Development Workflows

#### MCP Server Development
```bash
cd mcp-server

# Build TypeScript
npm run build

# Run directly for testing (stdio transport)
npm start

# Development with auto-reload
npm run dev
```

#### Dashboard Development
```bash
cd dashboard

# Development server with hot reload
npm run dev

# Production build
npm run build

# Start production server
npm start
```

### Testing MCP Integration
```bash
# Check if MCP server can be built and started
cd mcp-server && npm run build && node dist/index.js

# Test dashboard connection to MCP server
cd dashboard && npm run dev
# Then visit http://localhost:3000 and observe protocol logs
```

## Architecture

### MCP Server (`mcp-server/src/index.ts`)
- **Transport**: StdioServerTransport for MCP communication
- **Resources**: 
  - `today-tasks`: Current day's active tasks
  - `schedule`: Tasks organized by time slots (morning/afternoon/evening)
- **Tools**: 
  - `add_task`: Create new tasks with optional time slots
  - `complete_task`: Mark tasks as completed
  - `plan_day`: Auto-assign unscheduled tasks to time slots
  - `archive_task`: Remove completed tasks from active view
- **Prompts**: AI-powered assistance using Anthropic API
  - `custom_assistant`: General AI helper
  - `suggest_tasks`: AI task suggestions
  - `optimize_schedule`: Schedule optimization advice
  - `productivity_tips`: Personalized productivity guidance
- **Data Storage**: Simple JSON file (`daily-plan.json`)

### Dashboard Architecture
- **API Proxy** (`src/pages/api/mcp/[...action].ts`): Handles all MCP communication
- **MCP Client**: Single reusable connection to MCP server via stdio transport
- **Protocol Logging**: Real-time MCP message inspection for educational purposes
- **Components**: 
  - Split-screen layout (functional planner + educational panels)
  - Real-time protocol inspector
  - Interactive concept explanations
  - Server status monitoring
  - Tour system for guided learning

### Key Technical Details
- **MCP Communication**: Server spawned as child process, communication via stdio
- **Real-time Updates**: SWR for data fetching with 2-second refresh intervals
- **Error Handling**: Graceful fallbacks for MCP connection failures
- **Environment**: Anthropic API key required for prompt functionality

## Data Flow
1. Dashboard makes HTTP requests to `/api/mcp/[...action]`
2. API route spawns MCP server as child process
3. Client sends MCP requests via stdio transport
4. Server processes requests and responds with MCP-compliant messages
5. Responses logged for educational display
6. UI updates via SWR mutations

## Common Issues

### MCP Server Connection
- Ensure MCP server is built (`npm run build` in mcp-server/)
- Check server path in API route matches actual build location
- Verify working directory is set correctly for child process

### Missing Anthropic API Key
- Prompts require `ANTHROPIC_API_KEY` environment variable
- Set in dashboard's `.env.local` or mcp-server's `.env`
- Server will log API key status on startup

### Protocol Logging
- All MCP interactions are logged in memory (max 100 entries)
- Access logs via `/api/mcp/logs` endpoint
- Logs reset when server restarts

## File Structure
```
mcp-server/
├── src/index.ts          # Main MCP server implementation
├── dist/                 # Built JavaScript output
├── daily-plan.json       # Task data storage
└── package.json

dashboard/
├── src/pages/
│   ├── index.tsx         # Main dashboard interface
│   └── api/mcp/          # MCP API proxy
├── src/components/       # UI components (12 files)
├── src/contexts/         # React contexts for tour system
└── package.json
```

## Educational Focus
This is a learning tool designed to demonstrate MCP concepts through hands-on interaction. The code prioritizes clarity and educational value over production optimizations.
