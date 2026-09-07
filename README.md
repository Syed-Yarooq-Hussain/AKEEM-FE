# AKEEM Agentic Frontend

React, TypeScript, Vite, and Tailwind frontend for the AKEEM multi-agent business workspace.

## Local setup

```bash
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`. Copy `.env.example` to `.env` when the API is not available at the default URL.

```env
VITE_API_URL=http://localhost:3000/api
```

## Verification

```bash
npx tsc --noEmit
npm run build
```

## Implemented areas

- Email authentication, token refresh, logout, forgot password, and reset password.
- Live organization identity, project-aware dashboard, notifications, and module search.
- Projects create, list, edit, select, filter, and archive flows.
- Global contextual AI drawer and direct CEO/department assistant chats.
- Assistant directory, unified history, execution modes, delegations, action results, and retry states.
- AI task create, run, cancel, and retry controls.
- Approvals, automations, CRM, finance, files, reports, settings, and administration integrations.
- Responsive navigation and role-aware administration visibility.

Backend issues found during integration are tracked in `BACKEND_HANDOFF.md`.
