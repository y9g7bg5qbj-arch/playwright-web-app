# Deployment Guide

This guide covers deploying the Playwright Test Recorder application to production.

## Architecture Overview

The application consists of three components:
1. **Backend** - Node.js API server with WebSocket support
2. **Frontend** - React SPA (static files)
3. **Agent** - Desktop application (runs on user machines)

---

## Backend Deployment

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Process manager (PM2, systemd, or Docker)

### Option 1: Traditional Server (PM2)

#### 1. Prepare Server

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib
```

#### 2. Set Up Database

```bash
sudo -u postgres psql

CREATE DATABASE playwright_web_app;
CREATE USER playwright WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE playwright_web_app TO playwright;
\q
```

#### 3. Deploy Backend

```bash
# Clone repository
git clone <your-repo>
cd playwright-web-app/backend

# Install dependencies
npm install --production

# Build TypeScript
npm run build

# Set up environment
cp .env.example .env
nano .env
```

Edit `.env`:
```env
PORT=3000
NODE_ENV=production
DATABASE_URL="postgresql://playwright:password@localhost:5432/playwright_web_app"
JWT_SECRET=<generate-strong-secret>
CORS_ORIGIN=https://yourdomain.com
```

```bash
# Run migrations
npm run db:migrate

# Start with PM2
pm2 start dist/index.js --name playwright-backend
pm2 save
pm2 startup
```

#### 4. Configure Nginx

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
# Install certbot for SSL
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

### Option 2: Docker

#### Dockerfile (backend/Dockerfile)

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: playwright_web_app
      POSTGRES_USER: playwright
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://playwright:${DB_PASSWORD}@postgres:5432/playwright_web_app
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: ${CORS_ORIGIN}
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  postgres_data:
```

```bash
# Deploy
docker-compose up -d

# Run migrations
docker-compose exec backend npm run db:migrate
```

---

## Frontend Deployment

### Build Frontend

```bash
cd frontend
npm install
npm run build
```

This creates a `dist/` directory with static files.

### Option 1: Static Hosting (Netlify/Vercel)

#### Netlify

1. Connect your Git repository
2. Configure build settings:
   - Build command: `cd frontend && npm run build`
   - Publish directory: `frontend/dist`
3. Add environment variables:
   ```
   VITE_API_URL=https://api.yourdomain.com
   VITE_WS_URL=https://api.yourdomain.com
   ```

#### Vercel

```json
// vercel.json
{
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/dist",
  "env": {
    "VITE_API_URL": "https://api.yourdomain.com",
    "VITE_WS_URL": "https://api.yourdomain.com"
  }
}
```

### Option 2: Nginx

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/playwright-web-app;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Copy build files
sudo cp -r frontend/dist/* /var/www/playwright-web-app/

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com
```

---

## Agent Deployment

The agent runs on user machines and connects to your backend server.

### Distribution Methods

#### Option 1: NPM Package

```bash
# Publish to npm
cd agent
npm run build
npm publish
```

Users install via:
```bash
npm install -g @yourorg/playwright-agent
playwright-agent --token <token>
```

#### Option 2: Standalone Executable

Use `pkg` to create standalone executables:

```bash
npm install -g pkg

# Add to package.json
{
  "bin": "dist/index.js",
  "pkg": {
    "targets": ["node20-macos-x64", "node20-linux-x64", "node20-win-x64"],
    "outputPath": "releases"
  }
}

# Build
pkg . --out-path releases
```

#### Option 3: Docker

```dockerfile
FROM node:20

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build

# Install Playwright browsers
RUN npx playwright install --with-deps chromium

CMD ["node", "dist/index.js"]
```

```bash
docker build -t playwright-agent .
docker run -d \
  --name agent \
  -e AGENT_TOKEN=<token> \
  -e SERVER_URL=https://api.yourdomain.com \
  playwright-agent
```

### Agent Configuration

Users need to:

1. Obtain agent token from web UI
2. Configure `.env`:
   ```env
   AGENT_NAME=My Agent
   SERVER_URL=https://api.yourdomain.com
   AGENT_TOKEN=<from-web-ui>
   ```
3. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

---

## Environment Variables

### Backend Production Variables

```env
PORT=3000
NODE_ENV=production

# Database
DATABASE_URL="postgresql://user:password@host:5432/db"

# Security
JWT_SECRET=<use-strong-random-secret>
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://yourdomain.com

# Storage
STORAGE_PATH=/var/lib/playwright-web-app/storage
MAX_FILE_SIZE=10485760

# Logging
LOG_LEVEL=info
```

### Frontend Production Variables

```env
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=https://api.yourdomain.com
```

---

## Security Considerations

### 1. Environment Variables

- Never commit `.env` files
- Use strong random secrets
- Rotate JWT secrets periodically

### 2. Database

- Use strong passwords
- Enable SSL connections
- Regular backups
- Limit database user permissions

### 3. API Security

- Rate limiting (use `express-rate-limit`)
- Input validation (already implemented)
- SQL injection prevention (Prisma handles this)
- HTTPS only in production

### 4. CORS

- Set specific origins, avoid wildcards
- Update CORS_ORIGIN in backend .env

### 5. Agent Security

- Agent tokens should be unique per agent
- Implement token expiration
- Allow token revocation from UI

---

## Monitoring & Logging

### Backend Logging

Logs are written to:
- Console (stdout/stderr)
- `logs/error.log`
- `logs/combined.log`

Production setup with PM2:
```bash
pm2 logs playwright-backend
pm2 monit
```

### Database Backups

```bash
# Automated daily backup
0 2 * * * pg_dump playwright_web_app | gzip > /backups/db-$(date +\%Y\%m\%d).sql.gz
```

### Uptime Monitoring

Use services like:
- UptimeRobot
- Pingdom
- StatusCake

Monitor:
- Backend API: `https://api.yourdomain.com/health`
- Frontend: `https://yourdomain.com`

---

## Scaling Considerations

### Horizontal Scaling

For multiple backend instances:

1. **Use a load balancer** (nginx, HAProxy, AWS ELB)

2. **Sticky sessions for WebSocket:**
   ```nginx
   upstream backend {
       ip_hash;  # Sticky sessions
       server backend1:3000;
       server backend2:3000;
   }
   ```

3. **Shared session storage:**
   - Use Redis for WebSocket state
   - Share file storage (S3, NFS)

4. **Database:**
   - PostgreSQL read replicas
   - Connection pooling

### Agent Scaling

- Each user can run multiple agents
- Agents connect directly to backend
- No special scaling needed

---

## Troubleshooting

### Backend won't start

```bash
# Check logs
pm2 logs playwright-backend

# Check database connection
psql -U playwright -d playwright_web_app -h localhost

# Check port availability
sudo netstat -tlnp | grep 3000
```

### WebSocket issues

- Ensure nginx is configured for WebSocket upgrade
- Check firewall allows WebSocket connections
- Verify CORS settings

### Agent connection issues

- Check agent token is valid
- Verify SERVER_URL is accessible
- Check firewall/network settings

---

## Rollback Procedure

```bash
# Backend
pm2 stop playwright-backend
git checkout <previous-commit>
npm install
npm run build
npm run db:migrate
pm2 restart playwright-backend

# Frontend
# Simply redeploy previous build or revert Git commit
```

---

## Performance Optimization

### Database

```sql
-- Add indexes for common queries
CREATE INDEX idx_executions_created ON executions(created_at DESC);
CREATE INDEX idx_workflows_user_updated ON workflows(user_id, updated_at DESC);
```

### Caching

Add Redis for caching:
```typescript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// Cache workflow list
app.get('/api/workflows', async (req, res) => {
  const cacheKey = `workflows:${req.userId}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return res.json(JSON.parse(cached));
  }

  const workflows = await workflowService.findAll(req.userId);
  await redis.setex(cacheKey, 300, JSON.stringify(workflows));
  res.json(workflows);
});
```

### CDN

Serve frontend static assets via CDN (CloudFlare, AWS CloudFront)
