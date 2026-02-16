# Getting Started

This guide will help you set up and run the Playwright Test Recorder web application.

## Prerequisites

- Node.js 20 or higher
- PostgreSQL (or SQLite for development)
- Modern web browser (Chrome, Firefox, or Edge)

## Installation

### 1. Clone the Repository

```bash
cd playwright-web-app
```

### 2. Install Dependencies

Install dependencies for all packages:

```bash
# Install shared package
cd shared
npm install
npm run build
cd ..

# Install backend
cd backend
npm install
cd ..

# Install frontend
cd frontend
npm install
cd ..

# Install agent
cd agent
npm install
cd ..
```

### 3. Configure Environment Variables

#### Backend Configuration

Create a `.env` file in the `backend` directory:

```bash
cd backend
cp .env.example .env
```

Edit `.env` and configure:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL="file:./dev.db"
JWT_SECRET=your-super-secret-key-change-this
CORS_ORIGIN=http://localhost:5173
```

#### Agent Configuration

Create a `.env` file in the `agent` directory:

```bash
cd agent
cp .env.example .env
```

You'll need to generate an agent token first (see step 5).

### 4. Initialize Database

```bash
cd backend
npm run db:migrate
```

This will:
- Create the database
- Run migrations
- Set up all tables

### 5. Create Your First User and Agent

Start the backend server:

```bash
cd backend
npm run dev
```

In another terminal, register a user via API:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "yourpassword",
    "name": "Your Name"
  }'
```

Save the token from the response. Then create an agent:

```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "My Local Agent"
  }'
```

Save the agent token and add it to `agent/.env`:

```env
AGENT_TOKEN=your-agent-token-here
```

### 6. Start All Services

Open three terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - Agent:**
```bash
cd agent
npm run dev
```

### 7. Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

Log in with the credentials you created in step 5.

## Quick Start Guide

### Creating Your First Workflow

1. Click "New Workflow" on the dashboard
2. Enter a name (e.g., "Login Tests")
3. Click "Create"

### Recording a Test

1. Open your workflow
2. Click "New Test Flow"
3. Enter a name (e.g., "Valid Login")
4. Click "Record"
5. Enter the starting URL (e.g., "https://example.com")
6. Interact with the website in the browser that opens
7. Close the browser when done
8. The recorded code will appear in the editor

### Running a Test

1. Open a test flow
2. Click "Run Test"
3. Select execution target (Local Agent)
4. Click "Execute"
5. View real-time logs and results

## Next Steps

- [API Documentation](./API.md)
- [WebSocket Events](./WEBSOCKET.md)
- [Database Schema](./DATABASE.md)
- [Deployment Guide](./DEPLOYMENT.md)

## Troubleshooting

### Agent Won't Connect

- Check that the backend server is running
- Verify the agent token in `agent/.env`
- Check the agent logs in `agent/agent.log`

### Database Errors

- Ensure the database file/server is accessible
- Run migrations: `cd backend && npm run db:migrate`
- Check `backend/logs/` for error details

### Frontend Build Errors

- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Ensure the shared package is built: `cd ../shared && npm run build`

## Development Tips

### Hot Reload

All three services support hot reload during development:
- Backend: Uses `tsx watch`
- Frontend: Uses Vite's HMR
- Agent: Uses `tsx watch`

### Backend Runtime Mode (Important)

Use a single backend runtime in local development: `cd backend && npm run dev` (`tsx watch src/index.ts`).
Do not run PM2 (`npm run start:pm2`) at the same time as the watcher, because mixed runtimes can cause inconsistent Vero execution behavior.

### Database Management

View and edit database records:
```bash
cd backend
npm run db:studio
```

### Logs

- Backend logs: `backend/logs/`
- Agent logs: `agent/agent.log`
- Frontend: Browser console

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment instructions.
