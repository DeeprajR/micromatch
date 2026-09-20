# MicroMatch User Flow

This document maps the complete MVP flow to the screens that exist in the app.

## Volunteer Flow

### 1. Sign up or sign in

Entry: auth screen

- New volunteers create an account with skills, causes, availability, qualifications, preferred task length, and format.
- Existing volunteers sign in with email and password.

Result:

- Volunteer lands on `Discover`.

### 2. Discover tasks

Screen: `Discover`

Volunteer can:

- Search tasks
- Filter by skill, cause, time, and format
- Save a task for later
- Sign up for auto-approval tasks
- Apply for approval-required tasks
- See application caps on approval-required tasks

Task request paths:

```text
Auto sign-up: scheduled
Approval-required: applied
```

### 3. Saved tasks

Screen: `Saved`

Volunteer can:

- Review saved opportunities
- Unsave tasks
- Sign up or apply when ready
- See saved closed tasks with a `Closed` status

### 4. Manage tasks

Screen: `My tasks`

Statuses:

- `applied`: waiting for nonprofit approval
- `scheduled`: volunteer can complete and submit minutes/note
- `pending_confirmation`: nonprofit must confirm
- `confirmed`: impact counted
- `cancelled` or `declined`: no action needed

Volunteer actions:

- Cancel active task
- Add actual minutes
- Add completion note
- Mark task complete
- Add task to calendar

### 5. Track impact

Screen: `Impact`

Volunteer sees:

- Completed tasks
- Confirmed minutes
- Causes helped
- Recognition badges
- Impact notes

### 6. Maintain profile

Screen: `Profile`

Volunteer can update:

- Name
- Skills
- Causes
- Availability
- Qualifications
- Phone
- Preferred task length
- Remote/in-person preference

## Nonprofit Flow

### 1. Sign up or sign in

Entry: auth screen

- Nonprofits create an account with organization details.
- Existing nonprofits sign in with email and password.

Result:

- Nonprofit lands on `Dashboard`.

### 2. Post task

Screen: `Post task`

Nonprofit defines:

- Title and description
- Cause
- Required skills
- Time estimate
- Deadline
- Remote/in-person format
- Volunteers needed
- Approval mode
- Application cap
- Location
- Impact statement
- Instructions

Approval paths:

```text
Auto sign-up: volunteer becomes scheduled
Approval required: volunteer becomes applied until the application cap is reached
```

### 3. Dashboard phases

Screen: `Dashboard`

The dashboard groups tasks by operational phase.

#### Recruiting

Task is open and has no active volunteer work.

Next actions:

- Wait for direct sign-ups
- Review applicants if approval is required
- Close task if no longer needed

#### In Progress

Task has active volunteer movement.

Statuses included:

- `applied`
- `scheduled`
- `pending_confirmation`

Next actions:

- Review applicants
- Wait for volunteer completion
- Confirm submitted work directly from the dashboard or from `Confirm`
- Message volunteers

#### Completed

Task has enough confirmed volunteer work.

Next actions:

- Review impact in reports
- Reopen or post a new task if more help is needed

### 4. Review applicants

Screen: `Applicants`

Nonprofit can:

- See applicant skills, availability, and qualifications
- Message applicant
- Approve applicant
- Decline applicant

Application path:

```text
applied -> scheduled
applied -> declined
```

Approvals stop when volunteer slots are full, even if more applications are still visible.

### 5. Confirm work

Screen: `Confirm`

Nonprofit reviews completion submissions.

Confirmation path:

```text
pending_confirmation -> confirmed
```

After confirmation:

- Volunteer impact minutes update
- Nonprofit reports update
- Task may move to `Completed`

### 6. Manage volunteers

Screen: `Volunteers`

Nonprofit can:

- See volunteer records
- Review task history
- View skills, causes, availability, and qualifications
- Message volunteers

### 7. Review reports

Screen: `Reports`

Nonprofit sees:

- Volunteer count
- Confirmed minutes
- Open slots
- Signup status breakdown
- Tasks by cause
- Export-style record preview

### 8. Maintain organization

Screen: `Organization`

Nonprofit can update:

- Organization name
- Mission
- Website
- Location

## End-to-End State Machine

```text
Recruiting
  -> volunteer signs up
  -> scheduled
  -> volunteer submits work
  -> pending_confirmation
  -> nonprofit confirms
  -> confirmed
  -> Completed
```

```text
Recruiting
  -> volunteer applies
  -> applied
  -> nonprofit approves
  -> scheduled
  -> volunteer submits work
  -> pending_confirmation
  -> nonprofit confirms
  -> confirmed
  -> Completed
```

```text
applied -> declined
scheduled -> cancelled
pending_confirmation -> cancelled
```
