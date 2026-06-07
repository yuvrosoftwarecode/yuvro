# Yuvro Code - Comprehensive Learning & Recruitment Platform

# Setup

```bash
# Clone the repository
git clone <repository-url>
cd yuvro

# Builds and run services (first time or when new libraries are added)
make install
make install-ycode
make install-ycampus
make install-ylabs

# Only Run ( no build)
make run
make run-ycode
make run-ycampus
make run-ylabs

# Setup initial fixtures data like users, courses etc
make setup-fixtures-data
make setup-fixtures-data-ycampus
make setup-fixtures-data-ycode 


# Stop services
make stop
make stop-ycode 
make stop-ycampus
make stop-ylabs


# Only delete db volumes
make db-reset

# Deletes all data
make clean

```

# urls


YCode frontend: http://localhost:3000/
YCampus frontend: http://localhost:3001/
YLabs frontend: http://localhost:3002/

YCode backend health: http://localhost:8000/api/health/
YCampus backend health: http://localhost:8001/api/health/
YLabs backend health: http://localhost:8002/api/health/
Code executor: http://localhost:8009/

YCode Frontend:    https://code-dev.yuvro.ai
YCampus Frontend:  https://campus-dev.yuvro.ai
YCode Backend:     https://backend-code-dev.yuvro.ai
YCampus Backend:   https://backend-campus-dev.yuvro.ai
Code Executor:     https://code-executer-dev.yuvro.ai



### Object Storage (S3 / MinIO)

Camera snapshots, profile pictures, cover images, ID cards, and resumes are
uploaded to S3-compatible object storage. In `DEPLOY_ENV=local` the project
runs a shared `yuvro-minio` container (S3-compatible); in `dev` / `staging` /
`prod` the backends talk to real AWS S3.

- **MinIO API (S3)**:      http://localhost:9100
- **MinIO Web Console**:   http://localhost:9101  (login: `minioadmin` / `minioadmin`)
- **Buckets (local)**:     `ycode-uploads`, `ycampus-uploads`

Object keys (local + prod) follow the layout:

```
ycode-uploads/                              # or ycampus-uploads
└── profile/
    └── {user-uuid}/
        ├── profile_image.png              # avatar
        ├── cover_image.jpg                # cover photo (ycode)
        └── id_card_image.pdf              # student ID card
```

The `STORAGE_BACKEND` env var switches between `s3` (default) and `local`
(legacy filesystem under `MEDIA_ROOT`). In `DEPLOY_ENV=local` the backends
point at the local `yuvro-minio` container; in `dev`/`staging`/`prod` the
endpoint is empty and they use real AWS S3. See each backend's
`.env.<env>` file for the relevant keys (`AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`, `AWS_STORAGE_BUCKET_NAME`, `AWS_S3_REGION_NAME`,
optional `AWS_S3_ENDPOINT_URL` for S3-compatible stores).


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
| **Executor** | - | http://localhost:8009 | - | Shared code execution service |

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


**Dashboard URLs:**
- Grafana: http://localhost:3001 (admin/admin)
- Jaeger: http://localhost:16686
- Prometheus: http://localhost:9090
- Loki: http://localhost:3100


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
