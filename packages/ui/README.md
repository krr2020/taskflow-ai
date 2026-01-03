# Taskflow Dashboard

Visual dashboard for monitoring and managing Taskflow tasks, features, and stories.

## Overview

The Taskflow Dashboard provides a web-based interface for visualizing your project's task hierarchy, tracking progress, and managing your development workflow.

## Features

- **Project Overview** - View all features and their completion status
- **Feature Detail** - Drill down into individual features with story breakdowns
- **Story View** - See all tasks within a story and their current state
- **Task Detail** - View comprehensive task information including:
  - Current state in the workflow
  - Dependencies and blockers
  - Test/validation results
  - Git branch information
  - Related files and commits

- **Dark Mode** - Elegant dark theme optimized for long coding sessions
- **Real-time Updates** - Automatically refreshes when task files change
- **Responsive Design** - Works on desktop and tablet devices

## Installation

The dashboard is included with the core Taskflow package. No separate installation needed.

## Usage

### Start the Dashboard

From your project directory (where `taskflow.config.json` exists):

```bash
taskflow ui
```

This will:
1. Start the dashboard server (default: `http://localhost:3001`)
2. Open your browser automatically
3. Watch for task file changes

### Environment Variables

- `PORT` - Server port (default: 3001)
- `VITE_API_PORT` - API port for development (default: 3000)

### Development

```bash
# From packages/ui directory
pnpm install
pnpm dev
```

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool and dev server
- **Hono** - Backend server for file watching

## Project Structure

```
packages/ui/
├── src/
│   ├── components/        # Reusable UI components
│   │   └── Layout.tsx     # Main layout with navigation
│   ├── pages/             # Route components
│   │   ├── FeatureListPage.tsx
│   │   ├── FeatureDetailPage.tsx
│   │   ├── StoryDetailPage.tsx
│   │   └── TaskDetailPage.tsx
│   ├── hooks/             # Custom React hooks
│   │   ├── useProjectData.ts
│   │   ├── useFeatureData.ts
│   │   └── useTaskData.ts
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/             # Utility functions
│   │   └── api.ts
│   ├── App.tsx            # Root component with routing
│   └── index.css          # Global styles and Tailwind
└── index.html             # HTML entry point
```

## Data Flow

The dashboard reads directly from the `tasks/` directory structure:

```
tasks/
├── project-index.json              # Project metadata
└── F[N]-[feature-name]/
    ├── F[N]-[feature-name].json    # Feature metadata
    └── S[N].[M]-[story-name]/
        └── T[N].[M].[K]-[task].json # Task data
```

## API Endpoints

The dashboard server provides:

- `GET /api/project` - Project index and overview
- `GET /api/features/:id` - Feature details
- `GET /api/stories/:id` - Story details
- `GET /api/tasks/:id` - Task details

## Task State Colors

The dashboard uses color coding for task states:

- **Gray** - `not-started`
- **Blue** - `setup`, `planning`
- **Yellow** - `implementing`, `verifying`
- **Orange** - `validating`, `committing`
- **Green** - `completed`
- **Red** - `blocked`

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Related Packages

- **[@krr2020/taskflow](../core)** - Core CLI and task management
- **[@krr2020/taskflow-mcp](../mcp-server)** - MCP server for Claude integration

## License

MIT
