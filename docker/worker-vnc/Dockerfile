# Playwright Worker with VNC for Live Browser Viewing
# 
# This image enables live browser viewing via noVNC during test execution.
# Access the browser at: http://localhost:6080/vnc.html
#
FROM mcr.microsoft.com/playwright:v1.52.0-noble

# Prevent interactive prompts during apt-get install
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Install VNC stack (Xvfb for virtual display, x11vnc for VNC server, websockify for WebSocket bridge)
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb \
    x11vnc \
    novnc \
    websockify \
    fluxbox \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY docker/sharding-demo/package*.json ./
RUN npm install

# Copy test files
COPY docker/sharding-demo/playwright.config.ts ./
COPY docker/sharding-demo/tests ./tests

# Environment variables for VNC
ENV DISPLAY=:99
ENV SCREEN_WIDTH=1280
ENV SCREEN_HEIGHT=720
ENV SCREEN_DEPTH=24
ENV VNC_PORT=5900
ENV NOVNC_PORT=6080

# Copy and make start script executable
COPY docker/worker-vnc/start.sh /start.sh
RUN chmod +x /start.sh

# Expose ports: 6080 = noVNC web, 3001 = worker API (future)
EXPOSE 6080 3001

# Health check - verify noVNC is responding
HEALTHCHECK --interval=30s --timeout=10s \
    CMD curl -f http://localhost:6080/ || exit 1

CMD ["/start.sh"]
