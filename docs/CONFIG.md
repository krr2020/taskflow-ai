# Taskflow Configuration Guide

Complete reference for configuring Taskflow, including optional AI/LLM integration.

## Table of Contents

- [Basic Configuration](#basic-configuration)
- [AI/LLM Configuration](#aillm-configuration)
- [Environment Variables](#environment-variables)
- [Provider-Specific Setup](#provider-specific-setup)
- [Per-Phase Model Selection](#per-phase-model-selection)
- [Retrospective-Driven Workflow](#retrospective-driven-workflow)
- [Configuration Examples](#configuration-examples)
- [Advanced Options](#advanced-options)

---

## Basic Configuration

The `taskflow.config.json` file is created when you run `taskflow init`. Here's a basic configuration:

```json
{
  "version": "2.0",
  "project": {
    "name": "my-project"
  },
  "branching": {
    "strategy": "per-story",
    "base": "main",
    "prefix": "story/"
  },
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

### Configuration Fields

#### `version` (required)
Current configuration schema version. Always `"2.0"`.

#### `project` (required)
- `name`: Project name (auto-detected from package.json or directory name)

#### `branching` (required)
- `strategy`: Branch strategy (`"per-story"` or `"per-feature"`)
- `base`: Base branch name (default: `"main"`)
- `prefix`: Branch prefix (default: `"story/"`)

#### `validation` (required)
- `commands`: Validation commands to run
  - `format`: Code formatting
  - `lint`: Linting
  - `test`: Test execution
  - `type-check`: Type checking

---

## AI/LLM Configuration

The `ai` section is **optional**. Taskflow works perfectly without it.

### Configuration Structure

Taskflow supports two configuration approaches:

1. **Legacy Format** (single provider, per-phase model names)
2. **New Format** (multiple named model definitions with usage mapping) - **Recommended**

---

### New Configuration Format (Recommended)

The new format allows you to define multiple models with different providers and API keys, then map them to specific phases.

```json
{
  "ai": {
    "enabled": true,
    "models": {
      "claude-sonnet": {
        "provider": "anthropic",
        "model": "claude-3-5-sonnet-20241022",
        "apiKey": "${ANTHROPIC_API_KEY}"
      },
      "openai-gpt4": {
        "provider": "openai-compatible",
        "model": "gpt-4o-mini",
        "apiKey": "${OPENAI_API_KEY}",
        "baseUrl": "https://api.openai.com/v1"
      },
      "ollama-local": {
        "provider": "ollama",
        "model": "llama2",
        "baseUrl": "http://localhost:11434"
      }
    },
    "usage": {
      "default": "claude-sonnet",
      "planning": "claude-sonnet",
      "execution": "openai-gpt4",
      "analysis": "claude-sonnet"
    }
  }
}
```

### AI Configuration Fields

#### `enabled` (optional)
Enable or disable AI features. Default: `false`

#### `models` (recommended)
Dictionary of named model definitions. Each model has:

- `provider` (required): Provider type
  - `"anthropic"` - Anthropic Claude API
  - `"openai-compatible"` - OpenAI, Azure, Together, Groq, DeepSeek, or any OpenAI-compatible API
  - `"ollama"` - Local Ollama

- `model` (required): Model name for the provider

- `apiKey` (optional, required for most providers): API key for the provider. Can use environment variables with `${VAR_NAME}` syntax.

- `baseUrl` (optional): Custom base URL for the provider
  - Anthropic: Not configurable (uses `https://api.anthropic.com/v1/`)
  - OpenAI-compatible: Customizable (default: `https://api.openai.com/v1`)
  - Ollama: Customizable (default: `http://localhost:11434`)

#### `usage` (optional, recommended when using `models`)
Maps phases to model definitions. Each phase can use a different model:

- `default` (required): Fallback model for any phase not explicitly specified
- `planning` (optional): Model for `tasks generate` and `prd generate-arch`
- `execution` (optional): Model for error analysis and code suggestions
- `analysis` (optional): Model for validation fixing and retrospective updates

**Note:** If a phase is not specified, it falls back to the `default` model.

---

### Legacy Configuration Format

The legacy format is still supported for backward compatibility:

```json
{
  "ai": {
    "enabled": true,
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514",
    "apiKey": "${ANTHROPIC_API_KEY}"
  }
}
```

### Legacy AI Configuration Fields

#### `provider` (required in legacy format)
LLM provider to use. Options:
- `"anthropic"` - Anthropic Claude
- `"openai-compatible"` - OpenAI-compatible API

#### `apiKey` (required in legacy format)
API key for the provider. Can use environment variables with `${VAR_NAME}` syntax.

#### `model` (optional, default varies by provider)
Model to use. If not specified, uses provider's default model.

#### Legacy per-phase model selection
Configure different models for different phases:
```json
{
  "models": {
    "default": "claude-sonnet-4-20250514",
    "planning": "claude-opus-4",
    "execution": "gemini-pro-2.0",
    "analysis": "claude-sonnet-4-20250514"
  }
}
```

#### `apiEndpoint` (optional, for custom provider)
Custom API endpoint for custom provider.

#### `apiVersion` (optional, for Azure OpenAI)
API version for Azure OpenAI (e.g., `"2024-02-15-preview"`).

---

## Environment Variables

Using environment variables for API keys is **recommended**:

```bash
# Set environment variables
export ANTHROPIC_API_KEY=your-key-here
export OPENAI_API_KEY=your-key-here

# Use in config
{
  "ai": {
    "provider": "anthropic",
    "apiKey": "${ANTHROPIC_API_KEY}"
  }
}
```

### Supported Environment Variables

| Variable | Used By | Example |
|----------|---------|---------|
| `ANTHROPIC_API_KEY` | Anthropic provider | `sk-ant-...` |
| `OPENAI_API_KEY` | OpenAI provider | `sk-...` |
| `AZURE_OPENAI_API_KEY` | Azure provider | `...` |
| `TOGETHER_API_KEY` | Together AI | `...` |
| `GROQ_API_KEY` | Groq | `gsk_...` |
| `DEEPSEEK_API_KEY` | DeepSeek | `...` |
| `CUSTOM_API_KEY` | Custom provider | `...` |

### Local `.env` Files

Taskflow supports loading from `.env` files:

```bash
# Create .env file
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Taskflow will automatically load it
taskflow configure ai --provider anthropic --model claude-sonnet-4-20250514
```

---

## Provider-Specific Setup

### Anthropic Claude

```bash
# Install key
export ANTHROPIC_API_KEY=sk-ant-your-key-here

# Configure
taskflow configure ai \
  --provider anthropic \
  --model claude-sonnet-4-20250514
```

**Available models:**
- `claude-opus-4` - Highest quality, slowest
- `claude-sonnet-4-20250514` - Balanced, recommended
- `claude-haiku-4` - Fastest, good for simple tasks

### OpenAI

```bash
# Install key
export OPENAI_API_KEY=sk-your-key-here

# Configure
taskflow configure ai \
  --provider openai \
  --model gpt-4o
```

**Available models:**
- `gpt-4o` - Best overall
- `gpt-4o-mini` - Fast and affordable
- `gpt-4-turbo` - Previous generation

### Azure OpenAI

```bash
# Install keys
export AZURE_OPENAI_API_KEY=your-key-here
export AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com

# Configure
taskflow configure ai \
  --provider azure \
  --model gpt-4o \
  --apiVersion 2024-02-15-preview
```

**Config format:**
```json
{
  "ai": {
    "provider": "azure",
    "apiKey": "${AZURE_OPENAI_API_KEY}",
    "apiEndpoint": "${AZURE_OPENAI_ENDPOINT}",
    "apiVersion": "2024-02-15-preview",
    "model": "gpt-4o"
  }
}
```

### Ollama (Local, Free)

```bash
# Install Ollama (https://ollama.ai)
# Pull a model
ollama pull llama3.1

# Configure
taskflow configure ai \
  --provider ollama \
  --model llama3.1
```

**Ollama specifics:**
- No API key required
- Runs locally (offline capable)
- Slower but free and private
- Default endpoint: `http://localhost:11434`

**Custom endpoint:**
```json
{
  "ai": {
    "provider": "ollama",
    "model": "llama3.1",
    "apiEndpoint": "http://localhost:11434"
  }
}
```

### Together AI

```bash
# Install key
export TOGETHER_API_KEY=your-key-here

# Configure
taskflow configure ai \
  --provider together \
  --model meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo
```

### Groq

```bash
# Install key
export GROQ_API_KEY=gsk-your-key-here

# Configure
taskflow configure ai \
  --provider groq \
  --model llama-3.1-70b-versatile
```

### DeepSeek

```bash
# Install key
export DEEPSEEK_API_KEY=your-key-here

# Configure
taskflow configure ai \
  --provider deepseek \
  --model deepseek-chat
```

### Custom Provider

Any OpenAI-compatible endpoint:

```bash
# Install key
export CUSTOM_API_KEY=your-key-here

# Configure
taskflow configure ai \
  --provider custom \
  --apiEndpoint https://api.example.com/v1 \
  --model your-model-name
```

---

## Per-Phase Model Selection

You can optimize costs and quality by using different models for different phases:

### Phase Definitions

| Phase | When Used | Model Requirements |
|-------|-----------|-------------------|
| **planning** | `tasks generate`, `prd generate-arch` | High reasoning, long context |
| **execution** | Error analysis, code suggestions | Fast, good understanding |
| **analysis** | Validation fixing, retrospective updates | Analytical, pattern matching |

### Configuration Example

```json
{
  "ai": {
    "enabled": true,
    "provider": "anthropic",
    "apiKey": "${ANTHROPIC_API_KEY}",
    "models": {
      "default": "claude-sonnet-4-20250514",
      "planning": "claude-opus-4",
      "execution": "gemini-pro-2.0",
      "analysis": "claude-sonnet-4-20250514"
    }
  }
}
```

### Model Selection Strategy

**Budget-conscious:**
```json
{
  "models": {
    "planning": "gpt-4o-mini",
    "execution": "claude-haiku-4",
    "analysis": "gpt-4o-mini"
  }
}
```

**Quality-first:**
```json
{
  "models": {
    "planning": "claude-opus-4",
    "execution": "claude-sonnet-4-20250514",
    "analysis": "claude-opus-4"
  }
}
```

**Mixed providers:**
```json
{
  "ai": {
    "provider": "anthropic",
    "apiKey": "${ANTHROPIC_API_KEY}",
    "executionApiKey": "${GOOGLE_API_KEY}",
    "models": {
      "planning": "claude-opus-4",
      "execution": "gemini-pro-2.0",
      "analysis": "claude-sonnet-4-20250514"
    }
  }
}
```

### Configure Command Examples

```bash
# Set one model for all phases
taskflow configure ai --model claude-sonnet-4-20250514

# Set different models per phase
taskflow configure ai \
  --planning claude-opus-4 \
  --execution gemini-pro-2.0 \
  --analysis claude-sonnet-4-20250514

# Use different providers per phase
taskflow configure ai \
  --provider anthropic \
  --planning claude-opus-4 \
  --execution gemini-pro-2.0 \
  --executionApiKey ${GOOGLE_API_KEY}
```

---

## Retrospective-Driven Workflow

When LLM is configured, Taskflow uses a retrospective-driven workflow to prevent repeated mistakes:

### How It Works

1. **Before Work Starts**
   - LLM reads `.taskflow/ref/protocols/retrospective.md`
   - Learns from past error patterns
   - Avoids repeating documented mistakes

2. **During Work**
   - LLM provides context-aware guidance
   - Suggests fixes based on retrospective patterns
   - Analyzes errors systematically

3. **After Errors**
   - LLM identifies new error patterns
   - Updates retrospective with solutions
   - Prevents future occurrences

### Retrospective File Structure

`.taskflow/ref/protocols/retrospective.md` contains:

```markdown
# Retrospective

## TypeScript Errors

### Pattern: Property does not exist on type
**Files**: src/auth.ts, src/models/User.ts
**Solution**: Check type definitions, add proper interfaces
**Criticality**: medium

## ESLint Errors

### Pattern: Missing trailing comma
**Files**: Various
**Solution**: Enable auto-formatting with Prettier/Biome
**Criticality**: low
```

### Manual Retrospective Management

```bash
# Add a new error pattern
taskflow retro add

# List existing patterns
taskflow retro list

# List by category
taskflow retro list type_error
```

### Debug Validator Template

When validation fails with LLM configured, Taskflow uses `debug-validator.ts`:

- **Location**: `.taskflow/ref/protocols/debug-validator.md`
- **Purpose**: Systematic debugging instructions for AI
- **Usage**: LLM reads this template to guide error analysis

---

## Configuration Examples

### Minimal Configuration (No AI)

```json
{
  "version": "2.0",
  "project": {
    "name": "my-project"
  },
  "branching": {
    "strategy": "per-story",
    "base": "main"
  },
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

### Basic AI Configuration

```json
{
  "version": "2.0",
  "project": {
    "name": "my-project"
  },
  "branching": {
    "strategy": "per-story",
    "base": "main"
  },
  "validation": {
    "commands": {
      "format": "biome check --write .",
      "lint": "biome lint .",
      "test": "vitest run",
      "type-check": "tsc --noEmit"
    }
  },
  "ai": {
    "enabled": true,
    "provider": "anthropic",
    "apiKey": "${ANTHROPIC_API_KEY}",
    "model": "claude-sonnet-4-20250514"
  }
}
```

### Advanced AI Configuration (Per-Phase)

```json
{
  "version": "2.0",
  "project": {
    "name": "my-project"
  },
  "branching": {
    "strategy": "per-story",
    "base": "main"
  },
  "validation": {
    "commands": {
      "format": "biome check --write .",
      "lint": "biome lint .",
      "test": "vitest run",
      "type-check": "tsc --noEmit"
    }
  },
  "ai": {
    "enabled": true,
    "provider": "anthropic",
    "apiKey": "${ANTHROPIC_API_KEY}",
    "models": {
      "default": "claude-sonnet-4-20250514",
      "planning": "claude-opus-4",
      "execution": "gemini-pro-2.0",
      "analysis": "claude-sonnet-4-20250514"
    }
  }
}
```

### Multi-Provider Configuration

```json
{
  "version": "2.0",
  "ai": {
    "enabled": true,
    "provider": "anthropic",
    "apiKey": "${ANTHROPIC_API_KEY}",
    "executionApiKey": "${GOOGLE_API_KEY}",
    "models": {
      "planning": "claude-opus-4",
      "execution": "gemini-pro-2.0",
      "analysis": "claude-sonnet-4-20250514"
    }
  }
}
```

### Ollama Local Configuration

```json
{
  "version": "2.0",
  "ai": {
    "enabled": true,
    "provider": "ollama",
    "model": "llama3.1",
    "apiEndpoint": "http://localhost:11434"
  }
}
```

### Azure OpenAI Configuration

```json
{
  "version": "2.0",
  "ai": {
    "enabled": true,
    "provider": "azure",
    "apiKey": "${AZURE_OPENAI_API_KEY}",
    "apiEndpoint": "${AZURE_OPENAI_ENDPOINT}",
    "apiVersion": "2024-02-15-preview",
    "model": "gpt-4o"
  }
}
```

---

## Advanced Options

### Disabling AI While Keeping Config

```json
{
  "ai": {
    "enabled": false,
    "provider": "anthropic",
    "apiKey": "${ANTHROPIC_API_KEY}"
  }
}
```

Set `enabled: false` to temporarily disable AI without removing configuration.

### Custom API Timeout

```json
{
  "ai": {
    "enabled": true,
    "provider": "anthropic",
    "apiKey": "${ANTHROPIC_API_KEY}",
    "timeout": 60000
  }
}
```

Default timeout is 30 seconds (30000ms). Increase for slower models.

### LLM Temperature (Creativity)

```json
{
  "ai": {
    "enabled": true,
    "provider": "anthropic",
    "apiKey": "${ANTHROPIC_API_KEY}",
    "temperature": 0.7
  }
}
```

- `0.0` - More deterministic, focused
- `0.7` - Balanced (recommended)
- `1.0` - More creative, varied

### Max Tokens (Output Length)

```json
{
  "ai": {
    "enabled": true,
    "provider": "anthropic",
    "apiKey": "${ANTHROPIC_API_KEY}",
    "maxTokens": 4096
  }
}
```

Default varies by model. Increase for longer outputs.

---

## Configuration Validation

Taskflow validates configuration on startup:

```bash
# Test configuration
taskflow configure ai --provider anthropic --model claude-sonnet-4-20250514

# Check current configuration
taskflow configure ai --show
```

### Common Validation Errors

**Invalid provider:**
```
✗ Invalid provider: unknown-provider

Valid providers: openai, azure, anthropic, ollama, together, groq, deepseek, custom
```

**Missing API key:**
```
✗ API key not configured for provider: anthropic

Set environment variable: ANTHROPIC_API_KEY
Or configure: taskflow configure ai --apiKey your-key-here
```

**Invalid model:**
```
✗ Invalid model for provider anthropropic: unknown-model

Available models: claude-opus-4, claude-sonnet-4-20250514, claude-haiku-4
```

---

## Configuration Migration

### From v1.x to v2.0

If upgrading from Taskflow v1.x:

**Before (v1.x):**
```json
{
  "version": "1.0",
  "projectName": "my-project",
  "branching": { ... }
}
```

**After (v2.0):**
```json
{
  "version": "2.0",
  "project": {
    "name": "my-project"
  },
  "branching": { ... },
  "ai": {
    "enabled": true,
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514",
    "apiKey": "${ANTHROPIC_API_KEY}"
  }
}
```

**Changes:**
- `projectName` → `project.name`
- Added optional `ai` section
- All other fields remain compatible

---

## See Also

- [COMMANDS.md](./COMMANDS.md) - Complete command reference
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues and solutions
- [README.md](../README.md) - Quick start guide
- [MIGRATION.md](./MIGRATION.md) - AI enhancement migration guide
