# Claude Code Guidelines

## Commit Message Requirement

**Every coding solution must be followed by a brief commit message.**

When providing code changes, fixes, or implementations, always conclude with a concise commit message that:

- Summarizes the changes made
- Uses conventional commit format when applicable (feat:, fix:, chore:, etc.)
- Is ready to use with `git commit -m "message"`
- Focuses on the "what" and "why" of the changes

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