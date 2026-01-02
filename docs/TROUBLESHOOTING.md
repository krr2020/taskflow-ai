# Taskflow Troubleshooting

Common issues and solutions for Taskflow.

---

## Installation Issues

### Command not found: taskflow

**Problem**: After installation, the `taskflow` command isn't recognized.

**Solutions**:

1. **Check npm global bin path**:
   ```bash
   npm config get prefix
   # Add to PATH if needed
   export PATH="/usr/local/bin:$PATH"
   source ~/.bashrc  # or ~/.zshrc
   ```

2. **Use npx instead**:
   ```bash
   npx @krr2020/taskflow <command>
   ```

3. **Reinstall globally**:
   ```bash
   npm uninstall -g @krr2020/taskflow
   npm cache clean --force
   npm install -g @krr2020/taskflow
   ```

---

### Permission errors during installation

**Problem**: Getting EACCES or permission denied errors.

**Solutions**:

1. **Fix npm permissions (recommended)**:
   ```bash
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
   source ~/.bashrc
   npm install -g @krr2020/taskflow
   ```

2. **Use nvm**:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc
   nvm install node
   npm install -g @krr2020/taskflow
   ```

3. **Use sudo (not recommended)**:
   ```bash
   sudo npm install -g @krr2020/taskflow
   ```

---

### New version not working after upgrade

**Problem**: Updated Taskflow but still seeing old version or errors.

**Solution**:

```bash
# Uninstall old version
npm uninstall -g @krr2020/taskflow
npm uninstall -g @krr2020/taskflow-mcp

# Clear cache
npm cache clean --force

# Install new version
npm install -g @krr2020/taskflow
npm install -g @krr2020/taskflow-mcp

# Verify version
taskflow --version

# Update project reference files
cd your-project
taskflow upgrade
```

---

## Project Initialization Issues

### No .taskflow directory found

**Problem**: Commands fail with "No .taskflow directory" error.

**Solution**:

```bash
# Initialize the project first
taskflow init

# If already initialized, verify you're in the correct directory
ls -la | grep taskflow
pwd  # Verify you're in the project root
```

---

### Cannot find taskflow.config.json

**Problem**: Commands can't find the configuration file.

**Solution**:

```bash
# Ensure you're in the project root
cd /path/to/your/project

# Verify config exists
ls taskflow.config.json

# If missing, reinitialize
taskflow init
```

---

## Workflow Issues

### Active session exists

**Problem**: Can't start a new task because another task is active.

**Solution**:

```bash
# Check current status
taskflow status

# Option 1: Complete the current task
taskflow check     # Advance through states
taskflow commit "- Your changes"

# Option 2: Block the current task
taskflow skip --reason "Switching to higher priority task"

# Then start the new task
taskflow start <new-task-id>
```

---

### Dependencies not met

**Problem**: Can't start a task because dependencies aren't complete.

**Solution**:

```bash
# Check task dependencies
taskflow status <task-id>

# Complete dependencies first
taskflow start <dependency-task-id>
# ... complete the task ...

# Then start your original task
taskflow start <task-id>
```

---

### Wrong branch error

**Problem**: Not on the correct story branch.

**Solution**:

Taskflow automatically creates and switches branches. If you get this error:

```bash
# Let Taskflow manage branches
taskflow start <task-id>  # Auto-switches to correct branch

# Or manually switch
git checkout story/S1.1-story-name
```

---

## Validation Issues

### Validation failed

**Problem**: Automated checks (lint, type-check, tests) are failing.

**Solution**:

```bash
# Read the error message
taskflow check

# Check the detailed log
cat .taskflow/logs/T<task-id>-<validation>-<date>.log

# Fix the issues in your code

# Re-run validation
taskflow check
```

---

### Validation command not found

**Problem**: Configured validation command doesn't exist in your project.

**Solution**:

Edit `taskflow.config.json` to match your tech stack:

```json
{
  "validation": {
    "commands": {
      "format": "prettier --write .",     // Your formatter
      "lint": "eslint .",                  // Your linter
      "typeCheck": "tsc --noEmit",         // Your type checker
      "test": "jest",                      // Your test runner
      "build": "npm run build"             // Your build command
    }
  }
}
```

Use empty string to disable a validation:

```json
{
  "validation": {
    "commands": {
      "format": "",  // Disabled
      "lint": "eslint ."
    }
  }
}
```

---

### Cannot commit: subtasks not completed

**Problem**: Trying to commit but no subtasks are marked complete.

**Solution**:

```bash
# Mark subtasks as completed
taskflow subtask complete 1
taskflow subtask complete 2

# Or if subtasks are tracked in the task JSON, update the file

# Then commit
taskflow commit "- Your changes"
```

---

## AI/LLM Issues

### AI features not configured

**Problem**: AI commands fail with "AI not configured" error.

**Solution**:

```bash
# Set environment variable
export ANTHROPIC_API_KEY=your-key-here

# Configure Taskflow
taskflow configure ai --provider anthropic --model claude-3-5-sonnet-20241022

# Verify configuration
taskflow configure ai --show
```

---

### API key not found

**Problem**: "API key not found for provider" error.

**Solution**:

```bash
# Option 1: Set environment variable (recommended)
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...

# Option 2: Add to shell profile
echo 'export ANTHROPIC_API_KEY=sk-ant-...' >> ~/.bashrc
source ~/.bashrc

# Option 3: Configure with key directly (less secure)
taskflow configure ai --provider anthropic --apiKey sk-ant-...
```

---

### API request failed: 401 Unauthorized

**Problem**: Invalid API key or insufficient permissions.

**Solution**:

```bash
# Verify API key is correct
echo $ANTHROPIC_API_KEY

# Regenerate key from provider dashboard:
# - Anthropic: https://console.anthropic.com/
# - OpenAI: https://platform.openai.com/api-keys

# Update and reconfigure
export ANTHROPIC_API_KEY=new-key-here
taskflow configure ai --provider anthropic --model claude-3-5-sonnet-20241022
```

---

### API request failed: 429 Rate limit exceeded

**Problem**: Too many API requests in short time.

**Solutions**:

1. **Wait and retry**: Wait a few minutes before retrying

2. **Use different model**:
   ```bash
   taskflow configure ai --provider anthropic --model claude-3-5-sonnet-20241022
   ```

3. **Switch provider**:
   ```bash
   taskflow configure ai --provider openai-compatible --model gpt-4o-mini
   ```

---

### Connection timeout

**Problem**: API requests timing out.

**Solutions**:

```bash
# Check internet connection
ping api.anthropic.com

# Increase timeout in taskflow.config.json
{
  "ai": {
    "timeout": 60000  // 60 seconds
  }
}

# Try different provider
taskflow configure ai --provider ollama --model llama3.1  // Local
```

---

## Git Issues

### Git push failed

**Problem**: Cannot push to remote.

**Solutions**:

```bash
# Check remote is configured
git remote -v

# Add remote if missing
git remote add origin https://github.com/user/repo.git

# Pull first if needed
git pull origin main --rebase

# Then commit again
taskflow commit "- Your changes"
```

---

### Merge conflicts

**Problem**: Story branch has merge conflicts with main.

**Solution**:

```bash
# On your story branch
git fetch origin
git rebase origin/main

# Resolve conflicts manually
git add .
git rebase --continue

# Continue with Taskflow workflow
taskflow check
```

---

## MCP Server Issues (Claude Desktop)

### Tools not showing in Claude Desktop

**Problem**: Claude doesn't see Taskflow tools.

**Solutions**:

1. **Verify configuration file location**:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. **Check configuration format**:
   ```json
   {
     "mcpServers": {
       "taskflow": {
         "command": "npx",
         "args": ["-y", "@krr2020/taskflow-mcp"]
       }
     }
   }
   ```

3. **Restart Claude Desktop completely** (not just reload)

4. **Check logs**:
   ```bash
   # macOS
   tail -f ~/Library/Logs/Claude/mcp*.log
   ```

5. **Test MCP server manually**:
   ```bash
   npx @krr2020/taskflow-mcp
   ```

---

### MCP server connection failed

**Problem**: Claude shows MCP server as disconnected.

**Solutions**:

```bash
# Reinstall MCP server
npm uninstall -g @krr2020/taskflow-mcp
npm cache clean --force
npm install -g @krr2020/taskflow-mcp

# Verify it runs
npx @krr2020/taskflow-mcp

# Restart Claude Desktop
```

---

## Performance Issues

### Slow task generation

**Problem**: `taskflow tasks generate` takes too long.

**Solutions**:

1. **Use faster model for planning**:
   ```bash
   taskflow configure ai --setPlanning gpt-4o-mini  // Faster than opus
   ```

2. **Simplify PRD**: Break large PRDs into smaller features

3. **Use local model for development**:
   ```bash
   taskflow configure ai --provider ollama --model llama3.1
   ```

---

### Large log files

**Problem**: `.taskflow/logs/` directory growing too large.

**Solution**:

```bash
# Clean up old logs (older than 30 days)
find .taskflow/logs -type f -mtime +30 -delete

# Or manually delete
rm .taskflow/logs/*

# Logs are recreated as needed
```

---

## Configuration Issues

### Invalid JSON in config file

**Problem**: `taskflow.config.json` has syntax errors.

**Solution**:

```bash
# Validate JSON
cat taskflow.config.json | jq .

# If invalid, fix manually or regenerate
mv taskflow.config.json taskflow.config.json.backup
taskflow init
# Then re-apply your custom settings
```

---

### Lost customizations after upgrade

**Problem**: `taskflow upgrade` overwrote custom files.

**Solution**:

```bash
# Restore from backup
ls .taskflow/backups/
cp .taskflow/backups/v<version>-<date>/* .taskflow/ref/

# In future, use --diff first
taskflow upgrade --diff  # Preview changes
```

---

## Common Patterns

### Working on intermittent/urgent tasks

**Problem**: Need to fix an urgent bug but already have an active task.

**Solution**:

```bash
# Option 1: Complete current task first
taskflow commit "- Partial work (WIP)"

# Option 2: Block current task
taskflow skip --reason "Paused for urgent bugfix"

# Work on urgent task (create as needed)
# When done, resume original task
taskflow start <original-task-id>
```

---

### Switching between features

**Problem**: Want to work on tasks from different features.

**Solution**:

Complete all tasks in a story before switching features. If you must switch:

```bash
# Block current task
taskflow skip --reason "Switching to Feature 2"

# Work on other feature
taskflow start <other-feature-task-id>

# Resume later
taskflow start <original-task-id>
```

---

### Regenerating tasks after PRD changes

**Problem**: Updated PRD but tasks are outdated.

**Solution**:

```bash
# Back up existing tasks
cp -r tasks tasks.backup

# Regenerate
taskflow tasks generate tasks/prds/your-prd.md

# Manually merge changes or keep new structure
```

---

## Getting More Help

**Documentation**:
- [Getting Started](./GETTING-STARTED.md) - Complete tutorial
- [User Guide](./USER-GUIDE.md) - Common workflows
- [Commands Reference](./COMMANDS.md) - All commands
- [Configuration Guide](./CONFIG.md) - Setup options

**Support**:
- GitHub Issues: https://github.com/krr2020/taskflow/issues
- GitHub Discussions: https://github.com/krr2020/taskflow/discussions

**Debugging**:
- Check logs: `.taskflow/logs/`
- Check config: `cat taskflow.config.json`
- Check status: `taskflow status`
- Check version: `taskflow --version`
