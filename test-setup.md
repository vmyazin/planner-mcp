# Day Planner MCP - Setup & Testing

## Quick Start

### 1. Install Dependencies

```bash
# Install MCP server dependencies
cd mcp-server
npm install

# Install dashboard dependencies
cd ../dashboard  
npm install
```

### 2. Start the Dashboard

```bash
cd dashboard
npm run dev
```

The dashboard will be available at http://localhost:3000

## How it Works

### MCP Server Features:
- **Resources**: 
  - `today-tasks` - Returns current tasks
  - `schedule` - Returns tasks organized by time slots
- **Tools**:
  - `add_task` - Add new task with optional time slot
  - `complete_task` - Mark task as completed
  - `plan_day` - Auto-assign unscheduled tasks to morning/afternoon/evening

### Dashboard Features:
- Add tasks with optional time slot selection
- Mark tasks as complete with checkboxes
- View tasks organized by Morning/Afternoon/Evening
- "Plan My Day" button to auto-schedule unscheduled tasks
- Real-time updates using SWR
- Error handling for MCP connection issues

### Data Storage:
- JSON file at `mcp-server/daily-plan.json`
- Simple structure: `{ date, tasks: [{ id, text, completed, timeSlot }] }`

## Testing the Integration

1. **Add Tasks**: Use the form to add tasks, optionally selecting time slots
2. **Complete Tasks**: Click checkboxes to mark tasks as done
3. **Auto-Planning**: Add tasks without time slots, then click "Plan My Day"
4. **Real-time Updates**: Changes should reflect immediately across all sections

## Architecture Notes

- **MCP Server**: Runs as stdio transport, spawned by Next.js API route
- **API Proxy**: `/api/mcp/[...action].ts` handles all MCP communication
- **Client Connection**: Single reusable MCP client connection
- **Error Handling**: Graceful fallbacks for MCP connection failures

Total meaningful code: ~170 lines