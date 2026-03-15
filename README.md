# Yuvro Code - Comprehensive Learning & Recruitment Platform

A full-stack learning management system (LMS) and coding education platform designed for technical education and recruitment. The platform runs two parallel instances: **YCode** (main learning platform) and **YCampus** (campus management system).

## 🎯 Core Features

- **Learning Management**: Course creation, topic/subtopic organization, video content, quizzes, and coding exercises
- **Code Practice**: Interactive coding environment with AI-powered assistance and problem-solving
- **Assessments**: Skill tests, mock interviews, contests, and certification exams
- **Job Platform**: Job postings, applications, candidate search, and company management
- **Code Execution**: Secure, isolated code execution service supporting Python, JavaScript, Java, C++, and C
- **AI Assistant**: Integrated AI chat for learning support and code help
- **Gamification**: Points, streaks, and progress tracking for student engagement

## 👥 User Roles

- **Student**: Learn courses, practice coding, take assessments, apply for jobs
- **Instructor/Admin**: Create and manage courses, assessments, view analytics
- **Recruiter**: Post jobs, review candidates, manage companies
- **College Admin**: Manage campus-specific settings and student batches (YCampus)

## 🏗️ Architecture

### Platform Instances

Two separate instances run in parallel with isolated databases and networks:

| Platform | Frontend | Backend | Database | Purpose |
|----------|----------|---------|----------|---------|
| **YCode** | http://localhost:3000 | http://localhost:8000 | ycode_backend_db | Main learning & job platform |
| **YCampus** | http://localhost:3001 | http://localhost:8001 | ycampus_backend_db | Campus management system |
| **Executor** | - | http://localhost:8002 | - | Shared code execution service |

### Technology Stack

**Backend**
- Framework: Django 4.2.7 + Django REST Framework 3.14.0
- Language: Python 3.x
- Database: PostgreSQL 15
- Authentication: JWT (djangorestframework-simplejwt)
- API Documentation: drf-spectacular (OpenAPI 3.0)

**Frontend**
- Framework: React 19.2.0 with TypeScript
- Build Tool: Vite 7.2.2
- Router: React Router DOM 7.9.5
- State Management: React Context API + TanStack Query 5.90.7
- UI Library: Radix UI + Tailwind CSS 4.1.17
- Code Editor: Monaco Editor

**Code Executor**
- Framework: FastAPI
- Language: Python 3.x
- Supported Languages: Python, JavaScript, Java, C++, C

**Observability** (Optional)
- Tracing: OpenTelemetry + Jaeger
- Metrics: Prometheus
- Logs: Loki
- Dashboards: Grafana

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Make (for command shortcuts)
- Git

### Setup All Platforms

```bash
# Clone the repository
git clone <repository-url>
cd yuvro

# Setup all platforms (YCode, YCampus, and Code Executor)
make setup

# This will:
# 1. Create executor network
# 2. Setup YCode (frontend, backend, database)
# 3. Setup YCampus (frontend, backend, database)
# 4. Load test data for both platforms
```

### Setup Individual Platforms

```bash
# Setup YCode only
make setup-ycode

# Setup YCampus only
make setup-ycampus

# Setup Code Executor only
make setup-common
```

## 📋 Available Commands

### Development

```bash
# Start all services
make dev

# Start specific platform
make dev-ycode
make dev-ycampus

# Stop all services
make stop

# View logs
make logs
make logs-ycode
make logs-ycampus

# Clean up containers and volumes
make clean
make clean-ycode
make clean-ycampus
```

### Database Operations

```bash
# YCode database commands
make -f Makefile.ycode db-shell              # Access database shell
make -f Makefile.ycode db-migrate            # Run migrations
make -f Makefile.ycode db-makemigrations     # Create migrations
make -f Makefile.ycode db-reset              # Reset database

# YCampus database commands
make -f Makefile.ycampus db-shell
make -f Makefile.ycampus db-migrate
make -f Makefile.ycampus db-makemigrations
make -f Makefile.ycampus db-reset
```

### Backend Operations

```bash
# YCode backend
make -f Makefile.ycode backend-shell         # Django shell
make -f Makefile.ycode backend-test          # Run tests
make -f Makefile.ycode backend-format-fix    # Format with Black
make -f Makefile.ycode backend-lint          # Lint with Flake8
make -f Makefile.ycode backend-install PKG=<name>  # Install package

# YCampus backend
make -f Makefile.ycampus backend-shell
make -f Makefile.ycampus backend-test
make -f Makefile.ycampus backend-format-fix
make -f Makefile.ycampus backend-lint
make -f Makefile.ycampus backend-install PKG=<name>
```

### Frontend Operations

```bash
# YCode frontend
make -f Makefile.ycode frontend-shell        # Node.js shell
make -f Makefile.ycode frontend-test         # Run tests
make -f Makefile.ycode frontend-format-fix   # Format with Prettier
make -f Makefile.ycode frontend-lint         # Lint with ESLint
make -f Makefile.ycode frontend-install PKG=<name>  # Install package

# YCampus frontend
make -f Makefile.ycampus frontend-shell
make -f Makefile.ycampus frontend-test
make -f Makefile.ycampus frontend-format-fix
make -f Makefile.ycampus frontend-lint
make -f Makefile.ycampus frontend-install PKG=<name>
```

### Code Executor

```bash
make executor-shell                          # Access executor shell
make executor-test                           # Test code executor
make executor-logs                           # View executor logs
```

### Combined Operations

```bash
make test-all                                # Run all tests
make format-all                              # Format all code
make lint-all                                # Lint all code
make check-all                               # Run all checks
```

## 🔐 Test Credentials

After setup, test accounts are automatically created:

### YCode Platform

**Admin**
- Email: `admin@yuvro.com`
- Password: (check setup output)

**Instructors**
- `instructor_ds@yuvro.com` (Data Structures)
- `instructor_python@yuvro.com` (Python)
- `instructor_java@yuvro.com` (Java)
- `instructor_mysql@yuvro.com` (MySQL)
- `instructor_mongodb@yuvro.com` (MongoDB)
- `instructor_ai@yuvro.com` (AI/ML)

**Recruiters**
- `recruiter_admin@yuvro.com`
- `recruiter@yuvro.com`

**Students**
- `shilpa@gmail.com`
- `devendra@gmail.com`
- `rohith@gmail.com`
- `manikanta@gmail.com`
- `harsha@gmail.com`
- `vinod@gmail.com`

### YCampus Platform

**Admin**
- Email: `admin@yuvro.com`

**College Admins**
- `college_admin1@yuvro.com`
- `college_admin2@yuvro.com`
- `college_admin3@yuvro.com`

**Principals**
- `principal1@yuvro.com`
- `principal2@yuvro.com`
- `principal3@yuvro.com`

**HODs**
- `hod1@yuvro.com`
- `hod2@yuvro.com`
- `hod3@yuvro.com`

**Faculty**
- `faculty1@yuvro.com`
- `faculty2@yuvro.com`
- `faculty3@yuvro.com`

**Students** (Same as YCode)


### Port Allocation

| Service | Port | Purpose |
|---------|------|---------|
| YCode Frontend | 3000 | React development server |
| YCampus Frontend | 3001 | React development server |
| YCode Backend | 8000 | Django REST API |
| YCampus Backend | 8001 | Django REST API |
| Code Executor | 8002 | FastAPI service |
| YCode Database | 5432 | PostgreSQL |
| YCampus Database | 5433 | PostgreSQL |
| Grafana | 3001 | Monitoring dashboards |
| Prometheus | 9090 | Metrics collection |
| Jaeger | 16686 | Distributed tracing |
| Loki | 3100 | Log aggregation |


## 🧪 Testing

### Run All Tests

```bash
make test-all
```

### Platform-Specific Tests

```bash
# YCode tests
make -f Makefile.ycode backend-test
make -f Makefile.ycode frontend-test

# YCampus tests
make -f Makefile.ycampus backend-test
make -f Makefile.ycampus frontend-test

# Code Executor tests
make executor-test
```

## 📊 Observability (Optional)

To enable monitoring with Grafana, Prometheus, Jaeger, and Loki:

```bash
# Start with observability stack
make observability-dev

# View dashboards
make observability-dashboards

# Stop observability
make observability-stop

# Clean observability data
make observability-clean
```

**Dashboard URLs:**
- Grafana: http://localhost:3001 (admin/admin)
- Jaeger: http://localhost:16686
- Prometheus: http://localhost:9090
- Loki: http://localhost:3100

## 🐛 Troubleshooting

### Services Not Starting

```bash
# Check service status
docker compose ps
docker compose -f docker-compose.ycampus.yml ps

# View logs
make logs
make logs-ycode
make logs-ycampus

# Restart services
make stop
make dev
```

### Database Connection Issues

```bash
# Reset database
make -f Makefile.ycode db-reset
make -f Makefile.ycampus db-reset

# Check database status
docker compose exec db psql -U postgres -d ycode_backend_db
docker compose -f docker-compose.ycampus.yml exec db psql -U postgres -d ycampus_backend_db
```

### Port Already in Use

If ports are already in use, modify the port mappings in:
- `docker-compose.yml` (YCode)
- `docker-compose.ycampus.yml` (YCampus)
- `docker-compose.common.yml` (Executor)

### Migrations Not Applied

```bash
# Regenerate migrations
make -f Makefile.ycode db-makemigrations
make -f Makefile.ycampus db-makemigrations

# Apply migrations
make -f Makefile.ycode db-migrate
make -f Makefile.ycampus db-migrate
```

## 📚 API Documentation

### YCode API

- Swagger UI: http://localhost:8000/api/schema/swagger-ui/
- ReDoc: http://localhost:8000/api/schema/redoc/
- OpenAPI Schema: http://localhost:8000/api/schema/

### YCampus API

- Swagger UI: http://localhost:8001/api/schema/swagger-ui/
- ReDoc: http://localhost:8001/api/schema/redoc/
- OpenAPI Schema: http://localhost:8001/api/schema/

## 🔄 Development Workflow

### Making Changes

1. **Backend Changes**
   ```bash
   # Edit files in ycode-backend-api/ or ycampus-backend-api/
   # Changes auto-reload in development mode
   make logs-ycode  # Monitor for errors
   ```

2. **Frontend Changes**
   ```bash
   # Edit files in ycode-web/ or ycampus-web/
   # Vite hot-reload will update automatically
   make logs-ycode  # Monitor for errors
   ```

3. **Database Schema Changes**
   ```bash
   # After model changes, create migrations
   make -f Makefile.ycode db-makemigrations
   make -f Makefile.ycode db-migrate
   ```

### Code Quality

```bash
# Format code
make format-all

# Lint code
make lint-all

# Run all checks
make check-all
```

## 🚢 Production Deployment

For production deployment, use the production docker-compose files:

```bash
# Build production images
make prod-build

# Start production services
make prod-up

# Stop production services
make prod-down
```

## 📝 Common Tasks

### Load Test Data

```bash
# Reload test data for YCode
make -f Makefile.ycode reload-data

# Reload test data for YCampus
make -f Makefile.ycampus reload-data
```

### Access Database Shell

```bash
# YCode database
make -f Makefile.ycode db-shell

# YCampus database
make -f Makefile.ycampus db-shell
```

### Access Django Shell

```bash
# YCode Django shell
make -f Makefile.ycode backend-shell

# YCampus Django shell
make -f Makefile.ycampus backend-shell
```

### Install Dependencies

```bash
# Backend package
make -f Makefile.ycode backend-install PKG=package-name

# Frontend package
make -f Makefile.ycode frontend-install PKG=package-name
```

## 🤝 Contributing

We welcome contributions! Please follow these guidelines to ensure a smooth collaboration.

### Getting Started

1. **Clone the repository with SSH**
   ```bash
   git clone git@github.com:yuvrosoftwarecode/yuvro.git
   cd yuvro
   ```

2. **Checkout main and pull latest changes**
   ```bash
   git checkout main
   git pull origin main
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature-name
   ```

4. **Rebase if main has new changes** (optional but recommended)
   ```bash
   git rebase main
   ```

5. **Start development**
   ```bash
   make dev
   ```

6. **Make your code changes**

7. **Format your code**
   ```bash
   make backend-format-fix    # For backend changes
   make frontend-format-fix   # For frontend changes
   make format-all            # For all changes
   ```

8. **Commit your changes** (see Conventional Commits section below)
   ```bash
   git commit -m "<type>(<scope>): <short summary>"
   ```

9. **Push to your branch**
   ```bash
   git push origin feature-name
   ```

10. **Create a Pull Request**
    - Go to GitHub and create a PR from your feature branch to `main`
    - Fill in the PR template with a clear description
    - Link any related issues

### Code Standards

#### Backend (Python/Django)

- **Formatting**: Black 23.12.1
  ```bash
  make -f Makefile.ycode backend-format-fix
  make -f Makefile.ycampus backend-format-fix
  ```

- **Linting**: Flake8 7.0.0
  ```bash
  make -f Makefile.ycode backend-lint
  make -f Makefile.ycampus backend-lint
  ```

- **Best Practices**:
  - Follow PEP 8 style guide
  - Use type hints where possible
  - Write docstrings for functions and classes
  - Keep functions small and focused
  - Use Django ORM best practices (select_related, prefetch_related)
  - Write tests for new features

#### Frontend (React/TypeScript)

- **Formatting**: Prettier 3.6.2
  ```bash
  make -f Makefile.ycode frontend-format-fix
  make -f Makefile.ycampus frontend-format-fix
  ```

- **Linting**: ESLint 9.39.1
  ```bash
  make -f Makefile.ycode frontend-lint
  make -f Makefile.ycampus frontend-lint
  ```

- **Best Practices**:
  - Use TypeScript strict mode
  - Use functional components with hooks
  - Keep components small and reusable
  - Use proper prop typing
  - Avoid prop drilling (use Context API or TanStack Query)
  - Write tests for components and utilities

#### Testing

- **Maintain test coverage above 80%**
  ```bash
  make test-all
  ```

- **Write tests for**:
  - New features
  - Bug fixes
  - API endpoints
  - React components
  - Utility functions

### Conventional Commits

We follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.

#### Format

```
<type>(<scope>): <short summary>

<optional body>

<optional footer>
```

#### Rules

- **Type** (required): Describes the kind of change
- **Scope** (optional but recommended): Specifies what part of the codebase is affected
- **Summary** (required): Short description (≤ 72 characters), imperative mood
- **Body** (optional): Detailed explanation separated by blank line
- **Footer** (optional): Metadata like `BREAKING CHANGE:` or issue references
- **Breaking Changes**: Use `BREAKING CHANGE:` in footer or append `!` after type/scope

#### Common Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(auth): add Google OAuth login` |
| `fix` | Bug fix | `fix(api): correct user serialization` |
| `docs` | Documentation changes | `docs(readme): update setup instructions` |
| `style` | Code style changes (no logic) | `style(ui): adjust button padding` |
| `refactor` | Code restructuring | `refactor(auth): extract token helpers` |
| `perf` | Performance improvements | `perf(api): reduce DB queries` |
| `test` | Test additions/changes | `test(auth): add refresh token tests` |
| `build` | Build system changes | `build(docker): update Node base image` |
| `ci` | CI/CD changes | `ci(github): add frontend linting step` |
| `chore` | Maintenance tasks | `chore(deps): bump django to 4.2.3` |
| `revert` | Revert previous commit | `revert: Revert "feat(auth): add OAuth"` |

#### Examples

**Simple feature**
```
feat(auth): add Google OAuth login

Adds support for signing in with Google and links new users to existing accounts.
```

**Bug fix with issue reference**
```
fix(api): correct user serialization in GET /api/auth/user/

Fixes bug where is_active flag wasn't returned for some users.

Closes #42
```

**Refactoring**
```
refactor(db): split user model helpers

Restructure helpers into `yc-backend-api/auth/utils.py`.
```

**Breaking change**
```
feat!: drop support for Python 3.8

BREAKING CHANGE: minimum Python version is now 3.9
```

**Breaking change with scope**
```
feat(auth)!: change password hashing algorithm

BREAKING CHANGE: existing passwords must be rehashed on next login
```

#### Tips

- Keep the subject line short and use imperative mood ("add" not "added")
- Use the body for detailed explanations
- Reference issues using `Closes #123` or `Fixes #123`
- For cross-repository references: `Closes mentorxindia/yuvro-code#101`
- Revert commits should reference the original commit being reverted
- Use scope to indicate which part of the system is affected

### Pull Request Process

1. **Before submitting**:
   ```bash
   make check-all  # Runs format, lint, and tests
   ```

2. **PR Title**: Follow Conventional Commits format
   ```
   feat(auth): add Google OAuth login
   fix(api): correct user serialization
   ```

3. **PR Description**: Include
   - What changes were made
   - Why the changes were made
   - How to test the changes
   - Any breaking changes
   - Related issues (use `Closes #123`)

4. **Code Review**:
   - Address all review comments
   - Push additional commits (don't force push during review)
   - Request re-review after making changes

5. **Merge**:
   - Ensure all checks pass
   - Squash commits if requested
   - Delete feature branch after merge

### Development Tips

**Working on both platforms**
```bash
# If changes affect both YCode and YCampus
make format-all
make lint-all
make test-all
```

**Database changes**
```bash
# After modifying models
make -f Makefile.ycode db-makemigrations
make -f Makefile.ycode db-migrate

make -f Makefile.ycampus db-makemigrations
make -f Makefile.ycampus db-migrate
```

**Testing specific changes**
```bash
# Test only backend
make -f Makefile.ycode backend-test

# Test only frontend
make -f Makefile.ycode frontend-test

# Test code executor
make executor-test
```

**Debugging**
```bash
# View logs in real-time
make logs-ycode
make logs-ycampus

# Access Django shell
make -f Makefile.ycode backend-shell

# Access database
make -f Makefile.ycode db-shell
```

### Common Issues

**Merge conflicts**
```bash
# Rebase your branch on main
git fetch origin
git rebase origin/main

# Resolve conflicts in your editor
git add .
git rebase --continue
git push origin feature-name --force-with-lease
```

**Tests failing**
```bash
# Run tests locally before pushing
make test-all

# Run specific test
make -f Makefile.ycode backend-test
```

**Code style issues**
```bash
# Auto-fix formatting
make format-all

# Check linting
make lint-all
```

### Questions?

- Check existing issues and PRs
- Review the API documentation
- Ask in the PR comments
- Check the Troubleshooting section in README

## 📄 License

[Add your license information here]

## 📞 Support

For issues and questions:
- Check the Troubleshooting section
- Review API documentation
- Check service logs with `make logs`

## 🎓 Learning Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [React Documentation](https://react.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Docker Documentation](https://docs.docker.com/)

---

**Last Updated**: March 2026
**Version**: 1.0.0
