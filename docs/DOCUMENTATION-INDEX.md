# Taskflow Documentation Index

Complete guide to all documentation in the Taskflow project.

## 📦 Package Documentation (For NPM)

These READMEs appear on npm package pages:

- **[/README.md](../README.md)** - Main project overview and quick start
- **[packages/core/README.md](../packages/core/README.md)** - `@krr2020/taskflow` CLI package
- **[packages/mcp-server/README.md](../packages/mcp-server/README.md)** - `@krr2020/taskflow-mcp` MCP server
- **[packages/ui/README.md](../packages/ui/README.md)** - Dashboard UI package

## 📚 User Documentation

Essential guides for using Taskflow:

### Getting Started
- **[GETTING-STARTED.md](./GETTING-STARTED.md)** - Complete tutorial from installation to first commit (10 minutes)

### Daily Usage
- **[USER-GUIDE.md](./USER-GUIDE.md)** - Comprehensive guide for daily workflows, patterns, and best practices
- **[COMMANDS.md](./COMMANDS.md)** - Quick reference for all CLI commands
- **[CONFIG.md](./CONFIG.md)** - Configuration guide including AI/LLM setup

### Help & Support
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues and solutions

## 🏗️ Technical Documentation

For developers and contributors:

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture, module structure, and design decisions
- **[CUSTOM-LLM-AGENT-MODE.md](./CUSTOM-LLM-AGENT-MODE.md)** - Autonomous agent mode documentation
- **[DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md)** - CLI UI components and design consistency
- **[DESIGN-MODE-AWARE-PROMPTING.md](./DESIGN-MODE-AWARE-PROMPTING.md)** - Architecture principle for MCP vs CLI modes

## 📊 Analysis & Audits

- **[LLM-USAGE-AUDIT.md](./LLM-USAGE-AUDIT.md)** - LLM API call audit and optimization analysis

## 📁 Templates & Resources

System prompts and specifications (not meant for end-user reading):

### Core Templates
Located in `packages/core/templates/`:

- **PRD Generator** - `prd/prd-generator.md`
- **Project Setup** - `project/architecture-rules.md`, `project/coding-standards.md`
- **AI Protocols** - `protocols/ai-protocol.md`, `protocols/task-executor.md`, `protocols/task-generator.md`, `protocols/debug-validator.md`
- **Retrospectives** - `retrospective/retrospective.md`
- **Skill Templates** - `skills/backend.md`, `skills/frontend.md`, `skills/fullstack.md`, `skills/devops.md`, `skills/docs.md`, `skills/mobile-app.md`

### MCP Resources
Located in `packages/mcp-server/resources/`:

- **PRD Specifications** - `prd-requirements.md`, `prd-template.md`
- **Task Generation** - `task-generation.md` (canonical format specification)

## 🗄️ Archived Documentation

Historical documents (for reference):

- **[archived/PHASE-1-COMPLETION-REPORT.md](./archived/PHASE-1-COMPLETION-REPORT.md)** - Phase 1 UX fixes completion
- **[archived/PHASE-4-COMPLETION-REPORT.md](./archived/PHASE-4-COMPLETION-REPORT.md)** - Phase 4 optimization completion
- **[archived/PRD-UX-ENHANCEMENT-PLAN.md](./archived/PRD-UX-ENHANCEMENT-PLAN.md)** - Overall UX enhancement initiative
- **[archived/REFACTORING_SUMMARY.md](./archived/REFACTORING_SUMMARY.md)** - Import alias refactoring summary

## 📖 Documentation Standards

### For NPM Package READMEs

- Keep concise but comprehensive
- Include clear installation instructions
- Show practical code examples
- Link to detailed documentation
- Include feature highlights
- Reference related packages

### For User Guides

- Start with prerequisites
- Use step-by-step instructions
- Include code examples
- Add troubleshooting tips
- Link to related guides

### For Technical Documentation

- Explain design decisions
- Include diagrams where helpful
- Reference implementation files
- Document edge cases
- Keep up-to-date with code changes

## 🔄 Maintenance

### When to Update Documentation

- **Immediately**: When adding/removing commands or features
- **Before Release**: For API changes or new capabilities
- **As Needed**: For clarifications and improvements

### Documentation Reviews

- Check for outdated information quarterly
- Validate code examples still work
- Update version numbers and package info
- Archive completed project documents

## 📝 Contributing to Documentation

1. Use clear, concise language
2. Include practical examples
3. Test all code snippets
4. Update table of contents if needed
5. Link between related documents
6. Follow existing formatting style

---

**Last Updated:** 2026-01-03
