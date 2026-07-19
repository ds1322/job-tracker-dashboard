# Job Tracker Dashboard

A responsive job-application tracker built with **HTML, Tailwind CSS, and vanilla JavaScript**. All data is persisted in the browser via `localStorage` — no backend required.

## Features

- **Frontend-only login screen** — gates access to the dashboard using a `localStorage` flag (no real auth server; explained below).
- **CRUD** — add, edit, and delete job applications through a modal form.
- **Search** — live search across company and role, debounced for performance.
- **Filter** — narrow the list by application status (Applied / Interview / Offer / Rejected).
- **Sort** — newest/oldest first, or alphabetically by company.
- **Statistics cards** — live counts per status, recalculated on every change.
- **Dark mode** — class-based Tailwind dark mode, persisted across reloads, defaults to the OS preference on first visit.
- **Toast notifications** — non-blocking feedback for add/update/delete/login actions.
- **Empty state** — friendly message + call-to-action when search/filter yields no results.
- **Fully responsive** — grid layout collapses from 3 columns → 1 column on small screens.

## Project structure

```
project1-job-tracker/
├── index.html   # markup: login screen, dashboard, modals
├── style.css    # small set of custom animations + status accent colors
└── script.js    # all app logic, organized into numbered sections
```

## How it works (for interview explanation)

**Single source of truth.** The `jobs` array in `script.js` is the only place job data lives in memory. Every mutation (add/edit/delete) follows the same three-step loop:
1. Update the `jobs` array.
2. Persist it with `saveJobs()` → `localStorage.setItem(...)`.
3. Re-render with `renderAll()`.

This is deliberately similar to how a React/Redux app manages state — update state, then re-render from state — just done manually with `innerHTML`.

**Derived, not stored, view.** The visible list (after search/filter/sort) is computed fresh in `getVisibleJobs()` on every render. It is *never* saved back to `jobs` or `localStorage` — only the underlying records are persisted. This avoids bugs where a filtered view could accidentally overwrite the full dataset.

**Event delegation.** Rather than attaching a click listener to every job card (which would need to be redone on every re-render), a single listener sits on the parent grid and inspects `event.target` to figure out which card's Edit/Delete button was clicked (via `data-edit` / `data-delete` attributes). This is more efficient and survives re-renders automatically.

**Auth is intentionally minimal.** There's no backend, so "login" simply validates the form client-side and stores `{ email }` under a `localStorage` key. In a real product this would be replaced by an API call that returns a session token/JWT, which would then be attached to authenticated requests and validated server-side. It's worth being upfront about this distinction in an interview — it shows you understand the difference between UI gating and real authentication.

**XSS safety.** User-entered text (company, notes, etc.) is passed through `escapeHtml()` before being inserted into the DOM via `innerHTML`, which prevents stored values from being interpreted as HTML/script.

## Possible extensions

- Replace `localStorage` with a real backend (Node/Express + MongoDB or Firebase) and swap the auth stub for JWT-based sessions.
- Add pagination or virtualization if the job list grows large.
- Export applications to CSV.
- Drag-and-drop status changes (Kanban-style board).
