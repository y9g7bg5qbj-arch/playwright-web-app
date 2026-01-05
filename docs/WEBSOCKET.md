# WebSocket Events Documentation

The application uses Socket.IO for real-time bidirectional communication between clients, server, and agents.

## Connection

**URL:** `ws://localhost:3000` (or your server URL)

**Authentication:** JWT token required in handshake

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token-here'
  }
});
```

---

## Client to Server Events

These events are sent by the web frontend or agent to the server.

### recording:start

Start a new recording session.

**Emitted by:** Client
**Handled by:** Server → Agent

```typescript
socket.emit('recording:start', {
  testFlowId: 'uuid',
  executionId: 'uuid',
  url: 'https://example.com',
  language: 'typescript',
  config: {
    viewport: { width: 1280, height: 720 },
    device: 'Desktop Chrome'
  }
});
```

### recording:cancel

Cancel an active recording session.

**Emitted by:** Client
**Handled by:** Server → Agent

```typescript
socket.emit('recording:cancel', {
  testFlowId: 'uuid',
  executionId: 'uuid'
});
```

### execution:start

Start test execution.

**Emitted by:** Client
**Handled by:** Server → Agent

```typescript
socket.emit('execution:start', {
  executionId: 'uuid',
  target: 'local',
  code: 'import { test } from "@playwright/test";...'
});
```

### execution:cancel

Cancel a running test execution.

**Emitted by:** Client
**Handled by:** Server → Agent

```typescript
socket.emit('execution:cancel', {
  executionId: 'uuid'
});
```

### agent:register

Register an agent with the server.

**Emitted by:** Agent
**Handled by:** Server

```typescript
socket.emit('agent:register', {
  name: 'My Local Agent',
  systemInfo: {
    platform: 'darwin',
    arch: 'arm64',
    nodeVersion: 'v20.0.0',
    playwrightVersion: '1.44.0'
  }
});
```

### agent:heartbeat

Send heartbeat to keep connection alive.

**Emitted by:** Agent
**Handled by:** Server

```typescript
socket.emit('agent:heartbeat');
```

---

## Server to Client Events

These events are sent by the server to clients and agents.

### recording:ready

Recording session is initialized and ready.

**Emitted by:** Agent → Server → Client

```typescript
socket.on('recording:ready', (data) => {
  console.log('Recording ready:', data);
  // data: { testFlowId: 'uuid', executionId: 'uuid' }
});
```

### recording:complete

Recording session has finished.

**Emitted by:** Agent → Server → Client

```typescript
socket.on('recording:complete', (data) => {
  console.log('Recording complete:', data);
  // data: {
  //   testFlowId: 'uuid',
  //   executionId: 'uuid',
  //   success: true,
  //   code: 'import { test } ...',
  //   message: 'Optional error message'
  // }
});
```

### execution:log

Real-time log message from test execution.

**Emitted by:** Agent → Server → Client

```typescript
socket.on('execution:log', (data) => {
  console.log('Execution log:', data);
  // data: {
  //   executionId: 'uuid',
  //   message: 'Test started...',
  //   level: 'info' | 'warn' | 'error'
  // }
});
```

### execution:complete

Test execution has finished.

**Emitted by:** Agent → Server → Client

```typescript
socket.on('execution:complete', (data) => {
  console.log('Execution complete:', data);
  // data: {
  //   executionId: 'uuid',
  //   exitCode: 0,
  //   duration: 2500
  // }
});
```

### agent:status

Agent status has changed.

**Emitted by:** Server → Client

```typescript
socket.on('agent:status', (data) => {
  console.log('Agent status:', data);
  // data: {
  //   agentId: 'uuid',
  //   status: 'online' | 'offline' | 'busy'
  // }
});
```

### error

An error occurred.

**Emitted by:** Server → Client/Agent

```typescript
socket.on('error', (data) => {
  console.error('Error:', data);
  // data: {
  //   message: 'Error message',
  //   executionId?: 'uuid'
  // }
});
```

---

## Event Flow Examples

### Recording Flow

```
Client                   Server                   Agent
  |                        |                        |
  |--recording:start------>|                        |
  |                        |----recording:start---->|
  |                        |                        |
  |                        |<---recording:ready-----|
  |<---recording:ready-----|                        |
  |                        |                        |
  |                        |                    (user records)
  |                        |                        |
  |                        |<--recording:complete---|
  |<--recording:complete---|                        |
```

### Execution Flow

```
Client                   Server                   Agent
  |                        |                        |
  |--execution:start------>|                        |
  |                        |----execution:start---->|
  |                        |                        |
  |                        |<---execution:log-------|
  |<---execution:log-------|                        |
  |                        |<---execution:log-------|
  |<---execution:log-------|                        |
  |                        |                        |
  |                        |<--execution:complete---|
  |<--execution:complete---|                        |
```

---

## Connection Lifecycle

### Connect

```typescript
socket.on('connect', () => {
  console.log('Connected to server');
});
```

### Disconnect

```typescript
socket.on('disconnect', () => {
  console.log('Disconnected from server');
});
```

### Reconnection

Socket.IO automatically handles reconnection with exponential backoff.

```typescript
socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
});

socket.on('reconnect_error', (error) => {
  console.error('Reconnection error:', error);
});
```

---

## Error Handling

Always implement error handlers:

```typescript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
  // Handle authentication errors, network issues, etc.
});

socket.on('error', (data) => {
  console.error('Server error:', data.message);
  // Handle application errors
});
```

---

## Best Practices

1. **Always authenticate:** Include JWT token in handshake auth
2. **Handle disconnections:** Implement reconnection logic
3. **Clean up listeners:** Remove event listeners when unmounting components
4. **Error handling:** Always handle error events
5. **Heartbeat:** Agents should send heartbeats every 30 seconds
6. **State sync:** Update UI state based on server events

### React Example

```typescript
import { useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

function MyComponent() {
  const { socket } = useWebSocket();

  useEffect(() => {
    if (!socket) return;

    const handleExecutionLog = (data) => {
      console.log('Log:', data.message);
    };

    socket.on('execution:log', handleExecutionLog);

    return () => {
      socket.off('execution:log', handleExecutionLog);
    };
  }, [socket]);

  return <div>...</div>;
}
```
