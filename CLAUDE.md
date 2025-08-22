# Claude Code Guidelines

## Commit Message Requirement

**Every coding solution must be followed by a brief commit message.**

When providing code changes, fixes, or implementations, always conclude with a concise commit message that:

- Summarizes the changes made
- Uses conventional commit format when applicable (feat:, fix:, chore:, etc.)
- Is ready to use with `git commit -m "message"`
- Focuses on the "what" and "why" of the changes

If you detect that there was a follow-up question or a request to improve the previously provided requirement, amend the commit with updates.

### Examples:

```
fix: resolve MCP connection issues in Vercel deployment

- Improve code that controls MCP
- Fix incorrect file references
```

```
feat: add task archiving functionality to dashboard
```

```
chore: update dependencies and fix TypeScript errors
```

This ensures that all development work is properly documented and ready for version control.

## Natural Language and MCP Architecture Guidelines

**Prefer LLM-based natural language understanding over pattern-matching and rigid APIs.**

When building user interfaces and command processing systems, prioritize these approaches:

### Natural Language Processing
- **Use LLM intent analysis** instead of regex patterns or keyword matching
- **Delegate language understanding to AI models** rather than hardcoding patterns
- **Design for conversational interfaces** that understand user intent contextually
- **Avoid brittle pattern-matching** that requires constant maintenance for new phrasings

### MCP (Model Context Protocol) Integration
- **Leverage MCP tools** for structured operations rather than traditional REST APIs
- **Use MCP resources** for dynamic data access and real-time updates
- **Design MCP prompts** for complex AI-assisted operations
- **Build composable tool chains** through MCP rather than monolithic endpoints

### Implementation Principles
1. **LLM-First**: Let AI models handle ambiguous or complex user input interpretation
2. **MCP-Native**: Design operations as MCP tools/resources/prompts from the start
3. **Conversational UX**: Build interfaces that feel like talking to an assistant
4. **Graceful Fallbacks**: Handle edge cases through AI reasoning rather than error states

### Examples
```typescript
// ❌ Avoid: Pattern-matching approach
const taskPatterns = [
  /^(buy|get|pick up|purchase)\\s+(.+)$/i,
  /^add\\s+(.+)$/i,
  // ...dozens more patterns
];

// ✅ Prefer: LLM intent analysis
const intent = await callTool('analyze_intent', { 
  message: userInput 
});
```
