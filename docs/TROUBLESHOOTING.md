# Taskflow Troubleshooting Guide

Common issues and solutions for Taskflow, including AI/LLM integration problems.

## Table of Contents

- [General Issues](#general-issues)
- [AI/LLM Issues](#aillm-issues)
- [Validation Issues](#validation-issues)
- [Git Issues](#git-issues)
- [Configuration Issues](#configuration-issues)
- [Performance Issues](#performance-issues)
- [Getting Help](#getting-help)

---

## General Issues

### "Command not found: taskflow"

**Cause:** Taskflow is not installed or not in PATH

**Solution:**
```bash
# If installed as dev dependency
npx @krr2020/taskflow <command>

# Or install globally
npm install -g @krr2020/taskflow
taskflow <command>

# Or add script to package.json
# Then use: pnpm task <command>
```

### "No .taskflow directory"

**Cause:** Project not initialized

**Solution:**
```bash
# Initialize project
taskflow init
```

### "Active session exists"

**Cause:** Another task is already active

**Solution:**
```bash
# Complete current task
taskflow commit "- Changes"

# Or block it
taskflow skip --reason "Reason"

# Check status
taskflow status
```

### "Cannot find taskflow.config.json"

**Cause:** Not in Taskflow project directory

**Solution:**
```bash
# Navigate to project directory
cd your-project

# Check if config exists
ls taskflow.config.json

# If missing, reinitialize
taskflow init
```

---

## AI/LLM Issues

### "AI features not configured"

**Cause:** No AI configuration in `taskflow.config.json` or `ai.enabled` is `false`

**Solution:**
```bash
# Configure AI
taskflow configure ai \
  --provider anthropic \
  --model claude-sonnet-4-20250514 \
  --apiKey ${ANTHROPIC_API_KEY}

# Or use environment variable
export ANTHROPIC_API_KEY=your-key-here
taskflow configure ai --provider anthropic --model claude-sonnet-4-20250514
```

### "API key not found for provider"

**Cause:** API key not configured in config or environment

**Solution:**
```bash
# Set environment variable (recommended)
export ANTHROPIC_API_KEY=your-key-here
export OPENAI_API_KEY=your-key-here

# Or configure with key
taskflow configure ai \
  --provider anthropic \
  --apiKey sk-ant-your-key-here
```

### "Invalid provider: xyz"

**Cause:** Provider name is misspelled or not supported

**Solution:**
```bash
# Use valid provider name
taskflow configure ai --provider anthropic --model claude-sonnet-4-20250514

# Valid providers:
# - openai
# - azure
# - anthropic
# - ollama
# - together
# - groq
# - deepseek
# - custom
```

### "Invalid model for provider: xyz"

**Cause:** Model name is incorrect for the provider

**Solution:**
```bash
# Use correct model name for provider

# Anthropic models
taskflow configure ai --provider anthropic --model claude-sonnet-4-20250514

# OpenAI models
taskflow configure ai --provider openai --model gpt-4o

# Check provider documentation for available models
```

### "API request failed: 401 Unauthorized"

**Cause:** Invalid API key or key doesn't have access to the model

**Solution:**
```bash
# Verify API key is correct
echo $ANTHROPIC_API_KEY

# Regenerate API key from provider dashboard
# Anthropic: https://console.anthropic.com/
# OpenAI: https://platform.openai.com/api-keys

# Update and reconfigure
export ANTHROPIC_API_KEY=new-key-here
taskflow configure ai --provider anthropic --model claude-sonnet-4-20250514
```

### "API request failed: 429 Rate Limit Exceeded"

**Cause:** Too many API requests, rate limit reached

**Solution:**
```bash
# Wait a few minutes and retry

# Or use a different model with higher rate limits
taskflow configure ai \
  --provider anthropic \
  --model claude-sonnet-4-20250514  # Higher limits than opus

# Or switch providers
taskflow configure ai --provider together --model meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo
```

### "API request failed: Connection timeout"

**Cause:** Network issue or API endpoint is unreachable

**Solution:**
```bash
# Check internet connection
ping api.anthropic.com

# Increase timeout in config
# taskflow.config.json
{
  "ai": {
    "timeout": 60000  // 60 seconds
  }
}

# Check if using proxy that blocks the API
# Or try different provider
```

### "API request failed: Connection refused" (Ollama)

**Cause:** Ollama server is not running

**Solution:**
```bash
# Start Ollama
ollama serve

# In another terminal, pull model if needed
ollama pull llama3.1

# Configure Taskflow
taskflow configure ai --provider ollama --model llama3.1

# Test Ollama directly
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.1",
  "prompt": "Hello"
}'
```

### "Ollama model not found: xyz"

**Cause:** Model not pulled in Ollama

**Solution:**
```bash
# List available models
ollama list

# Pull the model
ollama pull llama3.1

# Or use a different model that's already pulled
taskflow configure ai --provider ollama --model mistral
```

### "LLM generated invalid output"

**Cause:** Model output doesn't match expected format

**Solution:**
```bash
# Try a different model
taskflow configure ai --provider openai --model gpt-4o

# Or adjust temperature for more deterministic output
# taskflow.config.json
{
  "ai": {
    "temperature": 0.0
  }
}
```

### "LLM output too long/truncated"

**Cause:** Output exceeds token limit

**Solution:**
```bash
# Increase max tokens in config
{
  "ai": {
    "maxTokens": 8192
  }
}

# Or use model with larger context window
taskflow configure ai --provider anthropic --model claude-opus-4
```

### "Per-phase model not configured"

**Cause:** Trying to use a phase-specific model without configuring it

**Solution:**
```bash
# Configure all phases or use default model
taskflow configure ai \
  --provider anthropic \
  --model claude-sonnet-4-20250514

# Or configure each phase
taskflow configure ai \
  --planning claude-opus-4 \
  --execution claude-sonnet-4-20250514 \
  --analysis claude-sonnet-4-20250514
```

### "AI features are slow"

**Cause:** Model is slow or network is slow

**Solution:**
```bash
# Use faster model
taskflow configure ai --provider groq --model llama-3.1-70b-versatile

# Or use local Ollama (no network latency)
taskflow configure ai --provider ollama --model llama3.1

# Or reduce work AI needs to do
# - Use manual mode: ai.enabled: false
# - Skip AI for simple tasks
```

### "AI suggestions are poor quality"

**Cause:** Model not suitable for task, or insufficient context

**Solution:**
```bash
# Use higher-quality model
taskflow configure ai --provider anthropic --model claude-opus-4

# Ensure retrospective has error patterns
taskflow retro list

# Add patterns manually
taskflow retro add

# Check that config has proper context files
```

### "Environment variable not expanded: ${VAR_NAME}"

**Cause:** Environment variable not set or shell doesn't expand variables

**Solution:**
```bash
# Set environment variable
export ANTHROPIC_API_KEY=your-key-here

# Verify it's set
echo $ANTHROPIC_API_KEY

# Restart your shell/terminal
# Then run command
taskflow configure ai --provider anthropic --model claude-sonnet-4-20250514
```

### "Azure OpenAI deployment not found"

**Cause:** Incorrect Azure deployment name or resource

**Solution:**
```bash
# Verify Azure configuration
echo $AZURE_OPENAI_ENDPOINT
echo $AZURE_OPENAI_API_KEY

# Configure with correct deployment name
taskflow configure ai \
  --provider azure \
  --model gpt-4o \
  --apiEndpoint https://your-resource.openai.azure.com \
  --apiVersion 2024-02-15-preview
```

### "Custom provider not responding"

**Cause:** Custom API endpoint is down or incorrect

**Solution:**
```bash
# Test endpoint directly
curl https://api.example.com/v1/chat/completions \
  -H "Authorization: Bearer $CUSTOM_API_KEY"

# Check endpoint URL
# Ensure it's OpenAI-compatible

# Configure with correct endpoint
taskflow configure ai \
  --provider custom \
  --apiEndpoint https://api.example.com/v1 \
  --model your-model
```

### "AI quota exceeded"

**Cause:** Reached API usage limits

**Solution:**
```bash
# Check provider dashboard for usage
# Anthropic: https://console.anthropic.com/
# OpenAI: https://platform.openai.com/usage

# Wait for quota reset (usually monthly)
# Or upgrade plan

# Or switch providers
taskflow configure ai --provider groq --model llama-3.1-70b-versatile
```

---

## Validation Issues

### "Validation failed"

**Cause:** Automated checks (lint, tests, type-check) didn't pass

**Solution:**
```bash
# 1. Check what failed
taskflow check

# 2. Read detailed logs
ls .taskflow/logs/
cat .taskflow/logs/T1-1-0-typeCheck-2024-01-15.log

# 3. Fix the errors manually
# Or use AI if configured (LLM will suggest fixes)

# 4. Re-run validation
taskflow check
```

### "TypeScript errors: Property does not exist"

**Cause:** Type mismatch or missing type definition

**Solution:**
```bash
# Without AI: Fix manually
# Read error, check types, fix code

# With AI:
taskflow check  # LLM will suggest fixes

# Add to retrospective to prevent future issues
taskflow retro add
```

### "Linting errors"

**Cause:** Code style violations

**Solution:**
```bash
# Auto-fix if supported
biome check --write .

# Or manually fix linting errors
taskflow check  # AI will help if configured

# Configure linting rules in biome.json
```

### "Test failures"

**Cause:** Tests are failing

**Solution:**
```bash
# Run tests with verbose output
vitest run --verbose

# Read test file and implementation
# Fix the bug or update test (whichever is wrong)

# With AI: LLM can analyze test failures
taskflow check
```

### "Validation keeps failing after fixes"

**Cause:** Error persists or new errors introduced

**Solution:**
```bash
# Check logs for all errors
cat .taskflow/logs/*.log

# Fix one file at a time
# Re-validate after each fix

# With AI: LLM does file-by-file fixing
taskflow check

# Check retrospective for similar patterns
taskflow retro list
```

---

## Git Issues

### "Git: command not found"

**Cause:** Git is not installed

**Solution:**
```bash
# macOS (with Homebrew)
brew install git

# Ubuntu/Debian
sudo apt-get install git

# Windows
# Download from: https://git-scm.com/
```

### "Git: not a git repository"

**Cause:** Not in a git repository

**Solution:**
```bash
# Initialize git repository
git init

# Or clone existing repository
git clone https://github.com/user/repo.git
```

### "Git: branch already exists"

**Cause:** Branch with same name already exists

**Solution:**
```bash
# Switch to existing branch
git checkout story/S1.1-feature-name

# Or delete and recreate
git branch -D story/S1.1-feature-name
taskflow start 1.1.0  # Will recreate branch
```

### "Git: cannot push"

**Cause:** No remote configured or authentication issue

**Solution:**
```bash
# Add remote
git remote add origin https://github.com/user/repo.git

# Push with authentication
git push -u origin story/S1.1-feature-name

# Configure credentials
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

### "Git: merge conflict"

**Cause:** Branch has conflicts with base branch

**Solution:**
```bash
# Resolve conflicts manually
git status  # See conflicted files
# Edit files to resolve conflicts
git add .
git commit

# Or use merge tool
git mergetool

# Then continue
taskflow check
```

---

## Configuration Issues

### "Invalid config file format"

**Cause:** JSON syntax error in `taskflow.config.json`

**Solution:**
```bash
# Validate JSON
cat taskflow.config.json | jq .

# Fix syntax errors
# - Missing commas
# - Trailing commas
# - Unquoted keys
# - Comments (not allowed in JSON)

# Reinitialize if needed
taskflow init
```

### "Configuration field not recognized"

**Cause:** Field name is misspelled or from wrong version

**Solution:**
```bash
# Check config version
cat taskflow.config.json | jq '.version'

# Update to v2.0 if needed
# See CONFIG.md for valid fields

# Reinitialize to get correct format
taskflow init
```

### "Validation command not found"

**Cause:** Command in config doesn't exist or not in PATH

**Solution:**
```bash
# Install missing tool
npm install -g biome

# Or update config with correct command
# taskflow.config.json
{
  "validation": {
    "commands": {
      "format": "biome check --write .",
      "lint": "biome lint .",
      "test": "vitest run",
      "type-check": "tsc --noEmit"
    }
  }
}
```

### "Node_modules not found"

**Cause:** Project dependencies not installed

**Solution:**
```bash
# Install dependencies
npm install
# or
pnpm install
# or
yarn install

# Then try again
taskflow check
```

---

## Performance Issues

### "Taskflow is slow"

**Cause:** System or tool performance issues

**Solution:**
```bash
# Check system resources
top  # or htop on macOS

# Disable AI if not needed
taskflow configure ai --disable

# Use faster validation tools
# - Biome instead of ESLint + Prettier
# - Vitest instead of Jest

# Cache dependencies
npm ci  # instead of npm install
```

### "Large log files"

**Cause:** Validation logs accumulating

**Solution:**
```bash
# Clean old logs
rm .taskflow/logs/*.log

# Or archive logs
mkdir .taskflow/logs/archive
mv .taskflow/logs/*.log .taskflow/logs/archive/

# Configure log rotation (future feature)
```

---

## Getting Help

### Debug Mode

Enable debug logging for more information:

```bash
# Set environment variable
export TASKFLOW_DEBUG=true

# Run command
taskflow start 1.1.0
```

### Check Logs

Always check logs when something fails:

```bash
# List all logs
ls -la .taskflow/logs/

# Read specific log
cat .taskflow/logs/T1-1-0-typeCheck-2024-01-15.log

# Search for errors
grep -i error .taskflow/logs/*.log
```

### Report Issues

If you can't resolve an issue:

1. **Gather information:**
   ```bash
   # System info
   taskflow --version
   node --version
   npm --version

   # Config
   cat taskflow.config.json

   # Logs
   tar -czf taskflow-logs.tar.gz .taskflow/logs/
   ```

2. **Check documentation:**
   - [README.md](../README.md) - Quick start
   - [CONFIG.md](./CONFIG.md) - Configuration guide
   - [COMMANDS.md](./COMMANDS.md) - Command reference
   - [FAQ.md](./FAQ.md) - Common questions

3. **Report issue:**
   - Create GitHub issue
   - Include system info
   - Attach relevant logs
   - Describe expected vs actual behavior

### Community

- **GitHub Issues:** Report bugs and request features
- **GitHub Discussions:** Ask questions and share ideas
- **Documentation:** Check `/docs` folder for guides

---

## Quick Fixes Reference

| Issue | Quick Fix |
|-------|-----------|
| Command not found | Use `npx @krr2020/taskflow <cmd>` |
| No .taskflow directory | Run `taskflow init` |
| Active session exists | Run `taskflow commit "- done"` |
| Validation failed | Fix errors, run `taskflow check` |
| AI not configured | Run `taskflow configure ai --provider <name> --model <name>` |
| API key missing | Set environment variable or use `--apiKey` |
| Ollama not running | Run `ollama serve` |
| Config syntax error | Run `jq . taskflow.config.json` to validate |
| Git merge conflict | Resolve conflicts, `git add .`, `git commit` |
| Validation slow | Use faster tools, disable AI |

---

## Prevention

### Best Practices

1. **Keep dependencies updated:**
   ```bash
   npm update @krr2020/taskflow
   ```

2. **Use version control:**
   ```bash
   git add taskflow.config.json
   git commit "Add Taskflow config"
   ```

3. **Use environment variables for keys:**
   ```bash
   export ANTHROPIC_API_KEY=sk-ant-...
   # Never commit keys to git
   ```

4. **Regular maintenance:**
   ```bash
   # Clean old logs
   rm .taskflow/logs/*.log

   # Update retrospective
   taskflow retro list
   ```

5. **Test configuration:**
   ```bash
   # Validate config
   taskflow configure ai --show

   # Test AI
   taskflow tasks generate your-prd.md
   ```

---

## See Also

- [README.md](../README.md) - Quick start guide
- [CONFIG.md](./CONFIG.md) - Configuration reference
- [COMMANDS.md](./COMMANDS.md) - Complete command reference
- [FAQ.md](./FAQ.md) - Frequently asked questions
- [MIGRATION.md](./MIGRATION.md) - Migration guide
