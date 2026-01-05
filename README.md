# Playwright Test Recorder - Web Application

A full-featured web application for recording, managing, and executing Playwright browser automation tests.

## Project Structure

```
playwright-web-app/
├── frontend/          # React web application
├── backend/           # Node.js API server
├── agent/             # Local desktop agent
├── shared/            # Shared types and utilities
└── docs/              # Documentation
```

## Features

- **Web-based Dashboard**: Manage workflows and test flows from a centralized interface
- **Test Recording**: Record browser interactions using Playwright codegen
- **Test Execution**: Run tests locally or on remote servers
- **Real-time Updates**: Live status updates via WebSocket
- **Monaco Editor**: Full-featured code editor with Playwright syntax support
- **Execution History**: View logs, screenshots, and traces

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL (or SQLite for development)
- Modern web browser

### Installation

1. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   npm run db:migrate
   npm run dev
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Agent Setup**
   ```bash
   cd agent
   npm install
   cp .env.example .env
   npm run dev
   ```

### Development

- Backend: http://localhost:3000
- Frontend: http://localhost:5173
- WebSocket: ws://localhost:3000

## Architecture

The application consists of three main components:

### Frontend (React)
- Dashboard for workflow management
- Monaco-based code editor
- Real-time execution monitoring
- Results viewer

### Backend (Node.js)
- REST API for CRUD operations
- WebSocket server for real-time communication
- Agent registry and orchestration
- Execution management

### Agent (Desktop Application)
- Playwright codegen integration
- Local test execution
- File synchronization
- Status reporting

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Zustand
- **Backend**: Node.js, Express, Socket.io, Prisma, PostgreSQL
- **Agent**: Node.js, Playwright
- **Authentication**: JWT

## Documentation

See the `/docs` directory for detailed documentation:
- [API Documentation](./docs/api.md)
- [Database Schema](./docs/database.md)
- [WebSocket Events](./docs/websocket.md)
- [Agent Protocol](./docs/agent.md)

## License

MIT
