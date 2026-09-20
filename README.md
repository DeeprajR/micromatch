# MicroMatch

## Overview

MicroMatch is a micro-volunteer matching platform that connects nonprofits with volunteers who have 15 to 90 minutes to contribute. The app supports separate volunteer and nonprofit experiences, with task discovery, sign-up/application flows, nonprofit approval, completion confirmation, impact tracking, and lightweight recognition.

## Problem Statement

Many people want to volunteer but cannot commit to long shifts, recurring schedules, or complex onboarding. At the same time, nonprofits often have small, high-impact tasks that are hard to staff through traditional volunteer programs. This creates a mismatch between available volunteer time and nonprofit operational needs.

## Solution

MicroMatch breaks volunteer work into short, specific tasks and matches them to people based on skills, causes, time availability, and format preference. Volunteers can quickly discover, save, apply for, or sign up for tasks, while nonprofits can publish opportunities, review applicants, manage volunteer progress, confirm completed work, and track impact.

## Features

- Volunteer and nonprofit sign-up/sign-in flows with separate role-based interfaces
- Micro-task catalog with skill tags, causes, time estimates, deadlines, and location format
- Volunteer matching, filtering, saved tasks, one-click sign-up, and approval-required applications
- Nonprofit task posting with volunteer-slot limits and separate application caps
- Applicant review, approval/decline flow, volunteer records, and messaging notifications
- Task lifecycle dashboard for recruiting, in-progress, and completed work
- Volunteer completion submission with actual minutes and nonprofit confirmation
- Impact tracking, recognition badges, status reports, and Google Calendar event links

## Tech Stack

- *Frontend:* HTML, CSS, vanilla JavaScript ES modules
- *Backend:* Node.js HTTP server with route controllers and service-layer business logic
- *Database:* Local JSON persistence in `backend/data/database.json`
- *APIs / Services:* Role-based REST-style API routes, Google Calendar event link generation, in-app notifications
- *Hosting / Deployment:* Runs locally with Node.js; can be deployed to any Node-compatible host
- *Other Tools:* Node `crypto` for password hashing and session token hashing

## Codex / OpenAI Usage

Codex was used throughout the hackathon build to turn the idea into a working full-stack MVP. It helped expand the product concept, plan the volunteer and nonprofit user flows, separate frontend and backend responsibilities, generate the interface modules, implement authentication and role-based APIs, debug functional issues, review logical edge cases, add validation, and document the final flow.

AI assistance also helped refine the UX toward a minimal interface, identify workflow gaps such as application caps versus confirmed volunteer slots, and verify behavior with syntax checks and targeted smoke tests.

## Demo Screenshots

Add screenshots of your project here.

Suggested screenshots:

### Sign in / sign up screen
![Volunteer Sign Up screen](/assets/1.png)

![Non Profit Sign Up screen](/assets/2.png)

![Sign In screen](/assets/3.png)

### Nonprofit Dashboard
![Nonprofit Organization Dashboard](/assets/9.png)

### Nonprofit Add Work Page
![Nonprofit Add Work Page](/assets/4.png)
![Nonprofit Add Work Page](/assets/5.png)

### Volunteer My tasks page
![Volunteer My tasks page](/assets/6.png)
![Volunteer My tasks page](/assets/7.png)

### Nonprofit Confirm work page
![Nonprofit Confirm work page](/assets/8.png)

## How to Run Locally

```bash
git clone <repo-url>
cd <project-folder>
npm install
npm start
```

Then open:

```text
http://localhost:4173
```

To run on a different port:

```bash
PORT=4174 npm start
```

On Windows PowerShell:

```powershell
$env:PORT=4174; npm start
```

Demo accounts:

- Volunteer: `volunteer@example.com` / `password`
- Nonprofit: `nonprofit@example.com` / `password`

Useful check command:

```bash
npm run check
```

## Additional Notes

The root `index.html` is only a launcher note. The real app is served from `frontend/` by the backend.

Runtime data is stored locally in `backend/data/database.json`, which is ignored by git. This keeps local testing data separate from the seed data in `backend/data/seed.js`.

Current limitations and future plans:

- Calendar sync is currently implemented as generated Google Calendar links, not full OAuth calendar write access.
- Notifications are in-app only; Slack and email delivery are planned future integrations.
- The database is local JSON for hackathon simplicity; production deployment should use a managed database.
- Nonprofit verification is represented in the data model but not connected to an external verification service.
