# AKEEM Frontend — Backend API Requirements

## Common contract

- Base URL: `http://localhost:3000/api`
- Swagger/OpenAPI URL required.
- Protected endpoints must accept `Authorization: Bearer ACCESS_TOKEN`.
- Dates must use ISO 8601.
- IDs must be numbers.

Success response:

```json
{ "success": true, "data": {} }
```

Error response:

```json
{
  "success": false,
  "message": "Human-readable error",
  "code": "ERROR_CODE",
  "errors": []
}
```

Paginated data:

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
  }
}
```

## P0 APIs (frontend integration in progress)

### Authentication

```text
POST /auth/signup
POST /auth/login
GET  /auth/me
POST /auth/refresh
POST /auth/logout
POST /auth/forgot-password
POST /auth/reset-password
```

Login/signup response data:

```json
{
  "accessToken": "jwt",
  "refreshToken": "refresh-token",
  "user": {
    "id": 1,
    "firstName": "Ali",
    "lastName": "Khan",
    "email": "ali@example.com",
    "role": "owner",
    "organizationId": 1
  },
  "organization": {
    "id": 1,
    "name": "Ali Technologies",
    "timezone": "Asia/Karachi",
    "currency": "PKR"
  }
}
```

### Projects

```text
GET    /projects?page=1&limit=20&search=&status=
POST   /projects
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id
```

Project fields:

```json
{
  "id": 1,
  "name": "AI Business Platform",
  "description": "Project description",
  "status": "active",
  "startDate": "2026-08-31",
  "dueDate": "2026-12-31",
  "budget": 50000,
  "currency": "PKR",
  "progress": 42
}
```

### Dashboard

```text
GET /dashboard/overview?projectId=1&period=6m
```

Response data must contain `metrics`, `chart`, and `aiActivity`.

### AI assistants

```text
POST   /ai/:assistant/chat
GET    /ai/:assistant/conversations?projectId=1&page=1&limit=20
GET    /ai/:assistant/conversations/:id/messages
DELETE /ai/:assistant/conversations/:id
```

Valid assistants:

```text
ceo, executive, sales, finance, marketing, legal, operations, customer-success
```

Chat request:

```json
{ "projectId": 1, "conversationId": 1, "message": "Question" }
```

`conversationId` must be omitted on the first message.

Chat response data:

```json
{
  "conversationId": 1,
  "messageId": 2,
  "projectId": 1,
  "answer": "AI answer",
  "model": "gpt-4.1-mini",
  "usage": { "inputTokens": 850, "outputTokens": 190 },
  "createdAt": "2026-09-02T10:00:00.000Z"
}
```

Messages response data:

```json
{
  "conversation": { "id": 1, "projectId": 1, "title": "Conversation title" },
  "messages": [
    { "id": 1, "role": "user", "content": "Question", "createdAt": "2026-09-02T10:00:00.000Z" },
    { "id": 2, "role": "assistant", "content": "Answer", "createdAt": "2026-09-02T10:00:05.000Z" }
  ]
}
```

CEO-specific endpoint:

```text
GET /ai/ceo/briefing?projectId=1
```

### AI tasks

```text
GET   /ai/tasks?projectId=1&status=&assistant=
POST  /ai/tasks
GET   /ai/tasks/:id
PATCH /ai/tasks/:id
POST  /ai/tasks/:id/cancel
POST  /ai/tasks/:id/retry
```

Task fields: `id`, `projectId`, `title`, `description`, `assistant`, `status`, `priority`, `progress`, `dueDate`, `createdAt`.

### Notifications

```text
GET   /notifications?page=1&limit=20
PATCH /notifications/:id/read
POST  /notifications/read-all
```

Notification fields: `id`, `type`, `title`, `message`, `read`, `resourceType`, `resourceId`, `createdAt`.

## P1 APIs still required

### Approvals

```text
GET  /approvals?projectId=1&status=
POST /approvals
GET  /approvals/:id
POST /approvals/:id/approve
POST /approvals/:id/reject
```

Fields: `id`, `projectId`, `title`, `type`, `amount`, `currency`, `status`, `requestedBy`, `createdAt`.

### Automations

```text
GET    /automations?projectId=1
POST   /automations
GET    /automations/:id
PATCH  /automations/:id
DELETE /automations/:id
POST   /automations/:id/run
GET    /automations/:id/runs
```

Fields: `id`, `name`, `projectId`, `trigger`, `actions`, `enabled`, `lastRunAt`, `nextRunAt`.

### CRM

```text
GET  /crm/overview
CRUD /crm/contacts
CRUD /crm/companies
CRUD /crm/deals
PATCH /crm/deals/:id/stage
```

Deal fields: `id`, `name`, `companyId`, `value`, `currency`, `stage`, `probability`, `ownerId`, `expectedCloseDate`.

### Finance

```text
GET  /finance/overview?projectId=1&period=month
GET  /finance/transactions
POST /finance/transactions
GET  /finance/invoices
POST /finance/invoices
PATCH /finance/invoices/:id
GET  /finance/budgets
POST /finance/budgets
GET  /finance/cash-flow
GET  /finance/reports
```

### Files and reports

```text
POST   /files/upload
GET    /files?projectId=1
GET    /files/:id
DELETE /files/:id
GET    /reports?projectId=1&assistant=
POST   /reports/generate
GET    /reports/:id
GET    /reports/:id/download
```

### User and organization settings

```text
GET   /organization
PATCH /organization
GET   /organization/members
POST  /organization/invitations
PATCH /organization/members/:id/role
DELETE /organization/members/:id
GET   /users/me
PATCH /users/me
PATCH /users/me/password
PATCH /users/me/preferences
POST  /users/me/avatar
```

### Administration

```text
GET    /admin/users
GET    /admin/usage
GET    /admin/audit-logs
GET    /admin/integrations
POST   /admin/integrations
PATCH  /admin/integrations/:id
DELETE /admin/integrations/:id
```

## Backend must also provide

1. Correct Swagger/OpenAPI URL.
2. Test-user credentials or permission to create one through signup.
3. CORS access for `http://localhost:5173`.
4. Reset-password redirect format, recommended: `http://localhost:5173/reset-password?token=...`.
5. Confirmation whether dashboard data is organization-wide or project-specific.
