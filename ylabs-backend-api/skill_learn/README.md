# Labs App

The `lab` app manages the core learning resources for the Yuvro platform, encompassing interactive labs, sprints, and individual tasks (tickets).

## Data Model

- **Lab**: Represents a complete learning module (e.g., "Linux Lab"). Includes type, difficulty, prerequisites, and skills.
- **LabSprint**: Sub-sections of a Lab. Sprints break down a lab into focused milestones (e.g., "Sprint 1 — Getting Comfortable with Linux").
- **LabSprintTicket**: Individual tasks within a sprint. Contains the brief, difficulty, points (XP), and programming language configurations.
- **UserLabEnrollment**: Tracks a user's enrollment in a particular lab.
- **UserLabSprintTicketSubmission**: Tracks a user's progress and submission on a specific ticket.

## API Endpoints

The app exposes standard RESTful endpoints for CRUD operations. 

**Note**: All mutation endpoints (`POST`, `PUT`, `PATCH`, `DELETE`) require the user to have Admin privileges (`IsAdminUser`). Read operations (`GET`) are accessible as configured per view.

### Labs
- `GET /api/lab/labs/` - List all labs
- `POST /api/lab/labs/` - Create a new lab (Admin only)
- `GET /api/lab/labs/<id>/` - Retrieve a specific lab
- `PUT/PATCH /api/lab/labs/<id>/` - Update a specific lab (Admin only)
- `DELETE /api/lab/labs/<id>/` - Delete a specific lab (Admin only)

### Sprints
- `GET /api/lab/sprints/` - List all sprints. Use `?lab=<lab_id>` to filter by lab.
- `POST /api/lab/sprints/` - Create a new sprint (Admin only)
- `GET /api/lab/sprints/<id>/` - Retrieve a specific sprint
- `PUT/PATCH /api/lab/sprints/<id>/` - Update a sprint (Admin only)
- `DELETE /api/lab/sprints/<id>/` - Delete a sprint (Admin only)

### Tickets (Tasks)
- `GET /api/lab/tickets/` - List all tickets. Use `?sprint=<sprint_id>` to filter by sprint.
- `POST /api/lab/tickets/` - Create a new ticket (Admin only)
- `GET /api/lab/tickets/<id>/` - Retrieve a specific ticket
- `PUT/PATCH /api/lab/tickets/<id>/` - Update a ticket (Admin only)
- `DELETE /api/lab/tickets/<id>/` - Delete a ticket (Admin only)

## Management Commands

- `python manage.py load_labs`: Seeds the database with pre-configured lab JSON files from `fixtures/dev/`.
