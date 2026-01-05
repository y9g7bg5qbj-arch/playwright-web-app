# Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites

- Node.js 20 or higher
- npm or yarn

## Installation

### 1. Install All Dependencies

Run this from the project root:

```bash
# Install shared package
cd shared && npm install && npm run build && cd ..

# Install backend
cd backend && npm install && cd ..

# Install frontend
cd frontend && npm install && cd ..

# Install agent
cd agent && npm install && cd ..
```

Or use this one-liner:
```bash
(cd shared && npm install && npm run build) && (cd backend && npm install) && (cd frontend && npm install) && (cd agent && npm install)
```

### 2. Set Up Backend

```bash
cd backend

# Copy environment file
cp .env.example .env

# The default .env uses SQLite - no setup needed!
# DATABASE_URL="file:./dev.db"

# Initialize database
npm run db:migrate
```

### 3. Start the Backend

```bash
# Still in backend directory
npm run dev
```

You should see:
```
Server started on port 3000
Database connected successfully
WebSocket server initialized
```

### 4. Create Your User (In a New Terminal)

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

Save the token from the response!

### 5. Set Up the Agent

```bash
cd agent

# Copy environment file
cp .env.example .env

# Edit .env and add:
# AGENT_TOKEN=<paste-your-token-from-step-4>
nano .env
```

### 6. Start the Agent

```bash
# Still in agent directory
npm run dev
```

You should see:
```
Starting Playwright Agent...
Connected to server
```

### 7. Start the Frontend (New Terminal)

```bash
cd frontend
npm run dev
```

You should see:
```
VITE ready in XXX ms
Local: http://localhost:5173
```

## Access the Application

Open your browser to:
```
http://localhost:5173
```

Login with:
- Email: `test@example.com`
- Password: `password123`

## Quick Test

1. Click **"New Workflow"**
2. Name it "My First Workflow"
3. Click into the workflow
4. Click **"New Test"** (when UI is complete)
5. Click **"Record"** (when UI is complete)
6. Start recording your test!

## Troubleshooting

### Port Already in Use

If port 3000 or 5173 is already in use:

**Backend (port 3000):**
```bash
# Edit backend/.env
PORT=3001
```

**Frontend (port 5173):**
Frontend will auto-increment to 5174, 5175, etc.

### Database Connection Error

Make sure you ran migrations:
```bash
cd backend
npm run db:migrate
```

### Agent Won't Connect

1. Make sure backend is running
2. Check agent token in `agent/.env`
3. Verify SERVER_URL is correct (default: http://localhost:3000)

### Cannot Login

Make sure you:
1. Created a user via the register endpoint (step 4)
2. Used the same credentials to login

## What's Running

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | Web UI |
| Backend API | http://localhost:3000 | REST API |
| Backend Health | http://localhost:3000/health | Health check |
| WebSocket | ws://localhost:3000 | Real-time events |
| Agent | N/A | Local recording/execution |

## Next Steps

- Read [GETTING_STARTED.md](./docs/GETTING_STARTED.md) for detailed setup
- Check [API.md](./docs/API.md) for API documentation
- See [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) for architecture overview

## Development Tips

### View Database

```bash
cd backend
npm run db:studio
```

Opens Prisma Studio at http://localhost:5555

### View Logs

- Backend: `backend/logs/combined.log`
- Agent: `agent/agent.log`
- Frontend: Browser console

### Stop All Services

Press `Ctrl+C` in each terminal running the services.

## Need Help?

1. Check the logs for errors
2. Read the full documentation in `/docs`
3. Verify all environment variables are set correctly
4. Make sure all dependencies are installed

Happy testing! 🎭
