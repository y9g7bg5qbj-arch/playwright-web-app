# API Documentation

Base URL: `http://localhost:3000/api`

## Authentication

All API requests (except `/auth/register` and `/auth/login`) require authentication via JWT token.

Include the token in the `Authorization` header:
```
Authorization: Bearer <token>
```

---

## Auth Endpoints

### Register User

```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt-token-here"
  }
}
```

### Login

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** Same as register

### Get Current User

```http
GET /api/auth/me
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Workflow Endpoints

### Get All Workflows

```http
GET /api/workflows
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "name": "Login Tests",
      "description": "Tests for login functionality",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "testFlows": [...]
    }
  ]
}
```

### Get Single Workflow

```http
GET /api/workflows/:id
```

### Create Workflow

```http
POST /api/workflows
```

**Request Body:**
```json
{
  "name": "Login Tests",
  "description": "Tests for login functionality"
}
```

### Update Workflow

```http
PUT /api/workflows/:id
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

### Delete Workflow

```http
DELETE /api/workflows/:id
```

---

## Test Flow Endpoints

### Get All Test Flows for Workflow

```http
GET /api/test-flows/workflow/:workflowId
```

### Get Single Test Flow

```http
GET /api/test-flows/:id
```

### Create Test Flow

```http
POST /api/test-flows/workflow/:workflowId
```

**Request Body:**
```json
{
  "name": "Valid Login Test",
  "code": "import { test, expect } from '@playwright/test';...",
  "language": "typescript"
}
```

### Update Test Flow

```http
PUT /api/test-flows/:id
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "code": "updated code...",
  "language": "typescript"
}
```

### Clone Test Flow

```http
POST /api/test-flows/:id/clone
```

### Delete Test Flow

```http
DELETE /api/test-flows/:id
```

---

## Execution Endpoints

### Get All Executions for Test Flow

```http
GET /api/executions/test-flow/:testFlowId
```

### Get Single Execution

```http
GET /api/executions/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "testFlowId": "uuid",
    "status": "passed",
    "exitCode": 0,
    "target": "local",
    "agentId": "uuid",
    "startedAt": "2024-01-01T00:00:00.000Z",
    "finishedAt": "2024-01-01T00:00:05.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "logs": [
      {
        "id": "uuid",
        "executionId": "uuid",
        "message": "Starting test execution...",
        "level": "info",
        "timestamp": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### Create Execution

```http
POST /api/executions/test-flow/:testFlowId
```

**Request Body:**
```json
{
  "target": "local",
  "agentId": "uuid"
}
```

### Delete Execution

```http
DELETE /api/executions/:id
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common HTTP status codes:
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (access denied)
- `404` - Not Found
- `409` - Conflict (e.g., email already exists)
- `422` - Validation Error
- `500` - Internal Server Error
