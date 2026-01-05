# Use official Playwright image with all browsers pre-installed
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy test files and config
COPY . .

# Default command - will be overridden by docker-compose
# The SHARD environment variable is set by docker-compose (e.g., "1/4")
CMD npx playwright test --shard=${SHARD:-1/1} --reporter=blob
