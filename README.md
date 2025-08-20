# Day Planner MCP

A simple personal day planner built with MCP (Model Context Protocol) for learning purposes.

## Features

- **MCP Server** (Node.js/TypeScript): JSON storage, 2 resources, 3 tools
- **Next.js Dashboard**: API proxy, real-time UI with SWR
- Auto-scheduling tasks to morning/afternoon/evening slots
- Task completion tracking with persistent storage

## Quick Start

```bash
# Install dependencies
cd mcp-server && npm install
cd ../dashboard && npm install

# Run dashboard (auto-starts MCP server)
cd dashboard && npm run dev
```

Visit http://localhost:3000

See [test-setup.md](./test-setup.md) for detailed setup and testing instructions.

