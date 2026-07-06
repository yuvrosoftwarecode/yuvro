export type Difficulty = "Beginner" | "Intermediate" | "Advanced";
export type Status = "Not Started" | "In Progress" | "Completed";

export interface Ticket {
  id: string;
  title: string;
  difficulty: Difficulty;
  estMin: number;
  xp: number;
  tag: string;
  status: Status;
  progress?: number;
  score?: number;
  description: string;
}

export interface Lab {
  slug: string;
  name: string;
  icon: string;
  color: "java" | "python" | "ui" | "sql" | "mongo" | "prog" | "ds" | "sysd" | "sec";
  difficulty: Difficulty;
  completed: number;
  total: number;
  hoursLeft: number;
  description: string;
  skills: { name: string; pct: number }[];
}

export const labs: Lab[] = [
  { slug: "java", name: "Java Lab", icon: "☕", color: "java", difficulty: "Intermediate", completed: 8, total: 25, hoursLeft: 14, description: "Master Java fundamentals to advanced OOP.", skills: [
    { name: "Core Syntax", pct: 85 }, { name: "OOP Concepts", pct: 65 }, { name: "Exception Handling", pct: 45 }, { name: "Collections", pct: 30 }
  ]},
  { slug: "python", name: "Python Lab", icon: "🐍", color: "python", difficulty: "Beginner", completed: 12, total: 30, hoursLeft: 10, description: "From scripting to data structures and APIs.", skills: [
    { name: "Syntax", pct: 90 }, { name: "Functions", pct: 72 }, { name: "Modules", pct: 55 }, { name: "Async I/O", pct: 25 }
  ]},
  { slug: "ui", name: "UI Lab", icon: "🎨", color: "ui", difficulty: "Intermediate", completed: 5, total: 20, hoursLeft: 18, description: "Build pixel-perfect interfaces with HTML, CSS, React.", skills: [
    { name: "HTML/CSS", pct: 80 }, { name: "Flex/Grid", pct: 70 }, { name: "React", pct: 50 }, { name: "Accessibility", pct: 35 }
  ]},
  { slug: "sql", name: "MySQL Lab", icon: "🗄️", color: "sql", difficulty: "Advanced", completed: 3, total: 18, hoursLeft: 22, description: "MySQL queries, joins, window functions and tuning.", skills: [
    { name: "SELECT", pct: 95 }, { name: "JOINs", pct: 60 }, { name: "Windows", pct: 30 }, { name: "Tuning", pct: 15 }
  ]},
  { slug: "postgres", name: "PostgreSQL Lab", icon: "🐘", color: "sql", difficulty: "Advanced", completed: 0, total: 14, hoursLeft: 20, description: "Postgres-specific features: CTEs, JSONB, window funcs, EXPLAIN ANALYZE.", skills: [
    { name: "Queries", pct: 0 }, { name: "JSONB", pct: 0 }, { name: "CTEs", pct: 0 }, { name: "Tuning", pct: 0 }
  ]},
  { slug: "pydjango", name: "Python Django Lab", icon: "🌿", color: "python", difficulty: "Intermediate", completed: 0, total: 12, hoursLeft: 18, description: "Build full Django apps: models, views, templates, forms and admin.", skills: [
    { name: "Models", pct: 0 }, { name: "Views", pct: 0 }, { name: "Templates", pct: 0 }, { name: "Admin", pct: 0 }
  ]},
  { slug: "pyflask", name: "Python Flask Lab", icon: "🧪", color: "python", difficulty: "Intermediate", completed: 0, total: 10, hoursLeft: 14, description: "Build REST APIs with Flask: routing, blueprints, SQLAlchemy, auth.", skills: [
    { name: "Routing", pct: 0 }, { name: "SQLAlchemy", pct: 0 }, { name: "Blueprints", pct: 0 }, { name: "Auth", pct: 0 }
  ]},
  { slug: "javaspring", name: "Java Spring Lab", icon: "🌱", color: "java", difficulty: "Advanced", completed: 0, total: 14, hoursLeft: 24, description: "Spring Boot: DI, REST controllers, JPA, security and testing.", skills: [
    { name: "Spring Boot", pct: 0 }, { name: "JPA", pct: 0 }, { name: "REST", pct: 0 }, { name: "Security", pct: 0 }
  ]},
  { slug: "git", name: "Git Lab", icon: "🔀", color: "prog", difficulty: "Beginner", completed: 0, total: 14, hoursLeft: 12, description: "Master git: SSH, clone, push/pull, branches, rebase, merge and pull requests.", skills: [
    { name: "Branching", pct: 0 }, { name: "Rebase/Merge", pct: 0 }, { name: "Remotes/PRs", pct: 0 }, { name: "Conflicts", pct: 0 }
  ]},
  { slug: "mongo", name: "MongoDB Lab", icon: "🍃", color: "mongo", difficulty: "Intermediate", completed: 0, total: 12, hoursLeft: 16, description: "Document modeling, CRUD, aggregation and indexes.", skills: [
    { name: "CRUD", pct: 40 }, { name: "Query Operators", pct: 25 }, { name: "Aggregation", pct: 15 }, { name: "Indexes", pct: 10 }
  ]},
  { slug: "programming", name: "Programming Lab", icon: "💻", color: "prog", difficulty: "Beginner", completed: 0, total: 30, hoursLeft: 20, description: "Programming fundamentals across syntax, logic, functions and OOP.", skills: [
    { name: "Syntax", pct: 30 }, { name: "Control Flow", pct: 20 }, { name: "Functions", pct: 15 }, { name: "OOP", pct: 10 }
  ]},
  { slug: "datastructures", name: "Data Structures Lab", icon: "🧩", color: "ds", difficulty: "Intermediate", completed: 0, total: 30, hoursLeft: 28, description: "Core data structures: arrays, lists, trees, graphs, heaps and more.", skills: [
    { name: "Arrays/Lists", pct: 30 }, { name: "Trees", pct: 15 }, { name: "Graphs", pct: 10 }, { name: "Hashing", pct: 20 }
  ]},
  { slug: "systemdesign", name: "System Design Lab", icon: "🏛️", color: "sysd", difficulty: "Advanced", completed: 0, total: 16, hoursLeft: 32, description: "Design scalable systems: load balancing, caching, sharding, queues and event-driven architectures.", skills: [
    { name: "Scalability", pct: 20 }, { name: "Caching", pct: 15 }, { name: "Databases", pct: 25 }, { name: "Messaging", pct: 10 }
  ]},
  { slug: "cybersecurity", name: "Cyber Security Lab", icon: "🛡️", color: "sec", difficulty: "Advanced", completed: 0, total: 18, hoursLeft: 30, description: "Hands-on offensive and defensive security: OWASP, auth, crypto, network and cloud hardening.", skills: [
    { name: "OWASP Top 10", pct: 20 }, { name: "AuthN/AuthZ", pct: 15 }, { name: "Cryptography", pct: 10 }, { name: "Network Sec", pct: 10 }
  ]},
  { slug: "linux", name: "Linux Lab", icon: "🐧", color: "prog", difficulty: "Beginner", completed: 0, total: 16, hoursLeft: 20, description: "Master the Linux command line: files, permissions, processes, networking and shell scripting.", skills: [
    { name: "CLI", pct: 0 }, { name: "Permissions", pct: 0 }, { name: "Shell", pct: 0 }, { name: "Networking", pct: 0 }
  ]},
  { slug: "qa", name: "QA Lab", icon: "🧪", color: "ui", difficulty: "Intermediate", completed: 0, total: 15, hoursLeft: 22, description: "Manual and automated testing: test cases, API tests, Playwright/Selenium and CI integration.", skills: [
    { name: "Test Cases", pct: 0 }, { name: "API Testing", pct: 0 }, { name: "Automation", pct: 0 }, { name: "CI/CD", pct: 0 }
  ]},
];

const mk = (i: number, title: string, diff: Difficulty, st: Status, tag: string, mins = 45, xp = 150, progress?: number, score?: number): Ticket => ({
  id: `JAVA-${100 + i}`, title, difficulty: diff, estMin: mins, xp, tag, status: st, progress, score,
  description: `Implement and test ${title.toLowerCase()}. Focus on clean idiomatic code and edge cases.`,
});

export const tickets: Ticket[] = [
  mk(1, "Variables & Types", "Beginner", "Completed", "Fundamentals", 30, 100, undefined, 95),
  mk(2, "Control Flow", "Beginner", "Completed", "Fundamentals", 35, 120, undefined, 88),
  mk(3, "Arrays & Loops", "Beginner", "Completed", "Fundamentals", 40, 130, undefined, 92),
  mk(4, "Methods & Scope", "Beginner", "Completed", "Fundamentals", 40, 130, undefined, 80),
  mk(5, "Strings Deep Dive", "Beginner", "Completed", "Fundamentals", 45, 150, undefined, 76),
  mk(6, "Classes & Objects", "Intermediate", "Completed", "OOP", 60, 200, undefined, 84),
  mk(7, "Inheritance", "Intermediate", "Completed", "OOP", 55, 200, undefined, 70),
  mk(8, "Interfaces", "Intermediate", "Completed", "OOP", 60, 220, undefined, 65),
  mk(9, "Generics 101", "Intermediate", "In Progress", "Generics", 70, 250, 60),
  mk(10, "Exception Handling", "Intermediate", "In Progress", "Errors", 50, 200, 30),
  mk(11, "File I/O Basics", "Intermediate", "In Progress", "I/O", 60, 220, 10),
  mk(12, "Collections: List", "Intermediate", "Not Started", "Collections", 50, 200),
  mk(13, "Collections: Map", "Intermediate", "Not Started", "Collections", 55, 220),
  mk(14, "Streams API", "Advanced", "Not Started", "Streams", 80, 300),
  mk(15, "Lambdas", "Advanced", "Not Started", "FP", 70, 280),
  mk(16, "Concurrency Intro", "Advanced", "Not Started", "Threads", 90, 350),
  mk(17, "Executors", "Advanced", "Not Started", "Threads", 90, 350),
  mk(18, "JDBC Basics", "Advanced", "Not Started", "DB", 80, 320),
  mk(19, "JUnit Testing", "Intermediate", "Not Started", "Testing", 60, 220),
  mk(20, "Design Patterns I", "Advanced", "Not Started", "Patterns", 100, 400),
  // ---- Python Django Lab ----
  { id: "PYDJ-201", title: "Bootstrap Django project & app", difficulty: "Beginner", estMin: 40, xp: 150, tag: "Django Bootstrap", status: "Not Started",
    description: "Create a Django project `todoproject` and a `todos` app. Register the app in INSTALLED_APPS and wire urls.py." },
  { id: "PYDJ-202", title: "Models & migrations", difficulty: "Beginner", estMin: 45, xp: 180, tag: "Django Models", status: "Not Started",
    description: "Define a `Todo` model with title, description, completed and created_at. Generate and apply migrations." },
  { id: "PYDJ-203", title: "Views & URL routing", difficulty: "Intermediate", estMin: 60, xp: 240, tag: "Django Views", status: "Not Started",
    description: "Implement list and create views using class-based or function views. Wire URL patterns." },
  { id: "PYDJ-204", title: "Templates & template inheritance", difficulty: "Intermediate", estMin: 50, xp: 220, tag: "Django Templates", status: "Not Started",
    description: "Build base.html with blocks, extend it from todos templates and use template tags." },
  { id: "PYDJ-205", title: "Forms & ModelForm", difficulty: "Intermediate", estMin: 55, xp: 230, tag: "Django Forms", status: "Not Started",
    description: "Create a Django ModelForm, render it in a template and validate input on submit." },
  { id: "PYDJ-206", title: "Django Admin customization", difficulty: "Intermediate", estMin: 45, xp: 200, tag: "Django Admin", status: "Not Started",
    description: "Register models in admin.py with list_display, list_filter and search_fields." },
  { id: "PYDJ-207", title: "Django REST Framework basics", difficulty: "Advanced", estMin: 70, xp: 300, tag: "Django REST", status: "Not Started",
    description: "Add DRF, build serializers and a ViewSet exposing CRUD endpoints for Todo." },

  // ---- Python Flask Lab ----
  { id: "PYFL-101", title: "Hello Flask & routing", difficulty: "Beginner", estMin: 30, xp: 120, tag: "Flask Intro", status: "Not Started",
    description: "Create a Flask app with a few routes returning JSON and HTML." },
  { id: "PYFL-102", title: "Templates with Jinja2", difficulty: "Beginner", estMin: 40, xp: 150, tag: "Flask Templates", status: "Not Started",
    description: "Render HTML templates with Jinja2, pass context and use template inheritance." },
  { id: "PYFL-103", title: "Blueprints & app factory", difficulty: "Intermediate", estMin: 55, xp: 220, tag: "Flask Blueprints", status: "Not Started",
    description: "Split a Flask app into blueprints and use the application factory pattern." },
  { id: "PYFL-104", title: "Flask-SQLAlchemy models", difficulty: "Intermediate", estMin: 60, xp: 240, tag: "Flask DB", status: "Not Started",
    description: "Define models with Flask-SQLAlchemy, run migrations with Flask-Migrate." },
  { id: "PYFL-105", title: "REST API: CRUD endpoints", difficulty: "Intermediate", estMin: 65, xp: 260, tag: "Flask REST", status: "Not Started",
    description: "Build JSON CRUD endpoints with request validation and proper status codes." },
  { id: "PYFL-106", title: "JWT authentication", difficulty: "Advanced", estMin: 70, xp: 300, tag: "Flask Auth", status: "Not Started",
    description: "Add JWT-based auth with Flask-JWT-Extended and protect routes." },

  // ---- Java Spring Lab ----
  { id: "SPR-101", title: "Spring Boot project setup", difficulty: "Beginner", estMin: 35, xp: 140, tag: "Spring Intro", status: "Not Started",
    description: "Bootstrap a Spring Boot app with start.spring.io and run the first endpoint." },
  { id: "SPR-102", title: "Dependency Injection & Beans", difficulty: "Intermediate", estMin: 50, xp: 200, tag: "Spring DI", status: "Not Started",
    description: "Use @Component, @Service and constructor injection. Understand bean scopes." },
  { id: "SPR-103", title: "REST Controllers", difficulty: "Intermediate", estMin: 55, xp: 220, tag: "Spring REST", status: "Not Started",
    description: "Build @RestController with @GetMapping/@PostMapping and request/response DTOs." },
  { id: "SPR-104", title: "Validation & error handling", difficulty: "Intermediate", estMin: 50, xp: 220, tag: "Spring REST", status: "Not Started",
    description: "Validate request bodies with @Valid and centralize errors via @ControllerAdvice." },
  { id: "SPR-105", title: "Spring Data JPA", difficulty: "Intermediate", estMin: 65, xp: 260, tag: "Spring JPA", status: "Not Started",
    description: "Define entities, repositories and derived queries with Spring Data JPA." },
  { id: "SPR-106", title: "Spring Security basics", difficulty: "Advanced", estMin: 80, xp: 320, tag: "Spring Security", status: "Not Started",
    description: "Secure REST endpoints with Spring Security and HTTP basic / JWT." },
  { id: "SPR-107", title: "Testing with @SpringBootTest", difficulty: "Advanced", estMin: 60, xp: 260, tag: "Spring Testing", status: "Not Started",
    description: "Write integration tests with @SpringBootTest and slice tests with @WebMvcTest." },

  // ---- PostgreSQL Lab ----
  { id: "PG-101", title: "Postgres basics: SELECT & WHERE", difficulty: "Beginner", estMin: 30, xp: 120, tag: "PG Querying", status: "Not Started",
    description: "Query a customers table with filters, ordering and LIMIT/OFFSET." },
  { id: "PG-102", title: "Aggregates & GROUP BY", difficulty: "Beginner", estMin: 35, xp: 140, tag: "PG Querying", status: "Not Started",
    description: "Compute totals per group with SUM/COUNT/AVG and HAVING." },
  { id: "PG-103", title: "JOINs in Postgres", difficulty: "Intermediate", estMin: 50, xp: 200, tag: "PG Joins", status: "Not Started",
    description: "INNER, LEFT and FULL joins across orders/customers tables." },
  { id: "PG-104", title: "Common Table Expressions (CTEs)", difficulty: "Intermediate", estMin: 55, xp: 220, tag: "PG Advanced", status: "Not Started",
    description: "Refactor nested subqueries into readable WITH expressions; use recursive CTEs." },
  { id: "PG-105", title: "JSONB queries", difficulty: "Intermediate", estMin: 55, xp: 230, tag: "PG JSONB", status: "Not Started",
    description: "Query and index JSONB columns with ->>, @>, and jsonb_path_ops." },
  { id: "PG-106", title: "Window functions", difficulty: "Advanced", estMin: 65, xp: 280, tag: "PG Windows", status: "Not Started",
    description: "ROW_NUMBER, RANK, LAG/LEAD and running totals with PARTITION BY." },
  { id: "PG-107", title: "EXPLAIN ANALYZE & indexes", difficulty: "Advanced", estMin: 70, xp: 320, tag: "PG Tuning", status: "Not Started",
    description: "Read EXPLAIN ANALYZE output and add B-tree / GIN indexes to remove sequential scans." },

  // ---- Git Lab ----
  { id: "GIT-101", title: "Install Git & set up SSH keys", difficulty: "Beginner", estMin: 25, xp: 100, tag: "Git Setup", status: "Not Started",
    description: "Install git, configure user.name/email and generate an ed25519 SSH key for GitHub." },
  { id: "GIT-102", title: "git init, add, commit", difficulty: "Beginner", estMin: 30, xp: 120, tag: "Git Basics", status: "Not Started",
    description: "Create a repo, stage changes and commit with meaningful messages." },
  { id: "GIT-103", title: "Clone a remote repository", difficulty: "Beginner", estMin: 20, xp: 90, tag: "Git Remotes", status: "Not Started",
    description: "Clone a repo via HTTPS and SSH and inspect remotes with `git remote -v`." },
  { id: "GIT-104", title: "Branching & switching", difficulty: "Beginner", estMin: 30, xp: 130, tag: "Git Branching", status: "Not Started",
    description: "Create branches with `git switch -c`, list with `git branch` and delete merged branches." },
  { id: "GIT-105", title: "Push & pull", difficulty: "Beginner", estMin: 30, xp: 130, tag: "Git Remotes", status: "Not Started",
    description: "Push a branch with `-u origin`, fetch and pull updates from upstream." },
  { id: "GIT-106", title: "Merging branches", difficulty: "Intermediate", estMin: 40, xp: 170, tag: "Git Merging", status: "Not Started",
    description: "Fast-forward and 3-way merges. Resolve a basic merge commit." },
  { id: "GIT-107", title: "Rebase a feature branch", difficulty: "Intermediate", estMin: 45, xp: 190, tag: "Git Rebase", status: "Not Started",
    description: "Rebase a feature branch onto main, understand the difference vs merge." },
  { id: "GIT-108", title: "Interactive rebase: squash & reword", difficulty: "Advanced", estMin: 55, xp: 230, tag: "Git Rebase", status: "Not Started",
    description: "Use `git rebase -i` to squash, reorder and reword commits before pushing." },
  { id: "GIT-109", title: "Resolve merge conflicts", difficulty: "Intermediate", estMin: 50, xp: 210, tag: "Git Conflicts", status: "Not Started",
    description: "Trigger a conflict, resolve manually and finish the merge/rebase." },
  { id: "GIT-110", title: "Stash work in progress", difficulty: "Beginner", estMin: 25, xp: 110, tag: "Git Basics", status: "Not Started",
    description: "Use `git stash push/pop/list` to shelve uncommitted changes." },
  { id: "GIT-111", title: "Tags & releases", difficulty: "Intermediate", estMin: 30, xp: 140, tag: "Git Tags", status: "Not Started",
    description: "Create annotated tags and push them to the remote." },
  { id: "GIT-112", title: "Pull requests workflow", difficulty: "Intermediate", estMin: 45, xp: 200, tag: "Git PRs", status: "Not Started",
    description: "Fork, branch, push and open a pull request. Review and address feedback." },
  { id: "GIT-113", title: "Reset, revert & reflog", difficulty: "Advanced", estMin: 55, xp: 240, tag: "Git Recovery", status: "Not Started",
    description: "Recover from mistakes with `git reset`, `git revert` and the reflog." },
  { id: "GIT-114", title: "Cherry-pick a commit", difficulty: "Intermediate", estMin: 35, xp: 160, tag: "Git Advanced", status: "Not Started",
    description: "Apply a single commit from one branch onto another with `git cherry-pick`." },

  // ---- Python · Core Foundations ----
  { id: "PY-101", title: "Variables, Types & f-strings", difficulty: "Beginner", estMin: 25, xp: 100, tag: "Py Fundamentals", status: "Completed", score: 95,
    description: "Practice int/float/str/bool, type casting, and f-string formatting with width and precision." },
  { id: "PY-102", title: "Lists, Tuples & Dicts", difficulty: "Beginner", estMin: 35, xp: 130, tag: "Py Fundamentals", status: "Completed", score: 88,
    description: "Build and mutate collections. Use slicing, unpacking and dict comprehensions." },
  { id: "PY-103", title: "Control Flow & Loops", difficulty: "Beginner", estMin: 30, xp: 120, tag: "Py Fundamentals", status: "In Progress", progress: 60,
    description: "Use if/elif/else, for/while, break/continue. Implement FizzBuzz and a number guessing game." },
  { id: "PY-104", title: "Functions & *args/**kwargs", difficulty: "Beginner", estMin: 40, xp: 150, tag: "Py Fundamentals", status: "Not Started",
    description: "Write pure functions with default args, *args and **kwargs. Add type hints." },
  { id: "PY-105", title: "List Comprehensions", difficulty: "Intermediate", estMin: 35, xp: 160, tag: "Py Fundamentals", status: "Not Started",
    description: "Refactor for-loops into idiomatic comprehensions including nested and conditional forms." },

  // ---- Python · Data & APIs ----
  { id: "PY-201", title: "File I/O & CSV parsing", difficulty: "Intermediate", estMin: 50, xp: 200, tag: "Py Data", status: "Not Started",
    description: "Read/write text and CSV. Aggregate a sales.csv into totals per category." },
  { id: "PY-202", title: "JSON & requests", difficulty: "Intermediate", estMin: 55, xp: 220, tag: "Py Data", status: "Not Started",
    description: "Fetch JSON from a public API with `requests`, handle status codes and serialize results." },
  { id: "PY-203", title: "Pandas DataFrame basics", difficulty: "Advanced", estMin: 70, xp: 300, tag: "Py Data", status: "Not Started",
    description: "Load a CSV into a DataFrame, filter, group-by and plot a quick chart." },

  // ---- UI Lab · HTML & CSS ----
  { id: "UI-101", title: "Semantic HTML landing page", difficulty: "Beginner", estMin: 35, xp: 120, tag: "HTML/CSS", status: "Completed", score: 91,
    description: "Build a landing page using header, nav, main, section, article and footer with proper headings." },
  { id: "UI-102", title: "CSS Box Model & Specificity", difficulty: "Beginner", estMin: 40, xp: 140, tag: "HTML/CSS", status: "Completed", score: 84,
    description: "Demonstrate margin/padding/border. Resolve a specificity conflict without !important." },
  { id: "UI-103", title: "Flexbox navbar", difficulty: "Intermediate", estMin: 45, xp: 180, tag: "HTML/CSS", status: "In Progress", progress: 40,
    description: "Build a responsive nav with logo left, links center, CTA right using flex utilities." },
  { id: "UI-104", title: "CSS Grid dashboard", difficulty: "Intermediate", estMin: 55, xp: 220, tag: "Layout", status: "In Progress", progress: 15,
    description: "Compose a 12-col grid dashboard with sidebar, header and main content using grid-template-areas." },
  { id: "UI-105", title: "Mobile-first media queries", difficulty: "Intermediate", estMin: 40, xp: 180, tag: "Layout", status: "Not Started",
    description: "Convert a desktop layout to mobile-first with breakpoints at 640/768/1024px." },

  // ---- UI Lab · React ----
  { id: "UI-201", title: "React: Todo with useState", difficulty: "Intermediate", estMin: 60, xp: 240, tag: "React", status: "Not Started",
    description: "Build a todo app with add, toggle, delete and filter All/Active/Done using useState." },
  { id: "UI-202", title: "useEffect & data fetching", difficulty: "Intermediate", estMin: 55, xp: 240, tag: "React", status: "Not Started",
    description: "Fetch posts from an API on mount. Handle loading, error and empty states cleanly." },
  { id: "UI-203", title: "Custom hook: useLocalStorage", difficulty: "Advanced", estMin: 50, xp: 260, tag: "React", status: "Not Started",
    description: "Write a reusable hook that syncs a state value to localStorage with SSR safety." },

  // ---- UI Lab · Accessibility ----
  { id: "UI-301", title: "Keyboard-accessible modal", difficulty: "Advanced", estMin: 60, xp: 280, tag: "Accessibility", status: "Not Started",
    description: "Build a modal with focus trap, ESC to close, and proper aria-* attributes." },
  { id: "UI-302", title: "Color contrast audit", difficulty: "Beginner", estMin: 25, xp: 110, tag: "Accessibility", status: "Not Started",
    description: "Audit a page against WCAG AA contrast. Fix failing pairs without breaking the palette." },

  // ---- SQL Lab · Querying ----
  { id: "SQL-101", title: "SELECT, WHERE & ORDER BY", difficulty: "Beginner", estMin: 25, xp: 100, tag: "Querying", status: "Completed", score: 97,
    description: "Query the `customers` table. Filter by country and sort by signup date desc." },
  { id: "SQL-102", title: "Aggregates & GROUP BY", difficulty: "Beginner", estMin: 35, xp: 140, tag: "Querying", status: "In Progress", progress: 50,
    description: "Compute total revenue per month using SUM, COUNT and GROUP BY with HAVING." },
  { id: "SQL-103", title: "INNER vs LEFT JOIN", difficulty: "Intermediate", estMin: 50, xp: 200, tag: "Joins", status: "In Progress", progress: 20,
    description: "Join `orders` and `customers`. Find customers with no orders using LEFT JOIN." },
  { id: "SQL-104", title: "Multi-table JOIN", difficulty: "Intermediate", estMin: 55, xp: 220, tag: "Joins", status: "Not Started",
    description: "Join orders → order_items → products to produce a line-item revenue report." },
  { id: "SQL-105", title: "Subqueries & CTEs", difficulty: "Intermediate", estMin: 60, xp: 240, tag: "Querying", status: "Not Started",
    description: "Rewrite a correlated subquery as a WITH cte for readability and performance." },

  // ---- SQL Lab · Window functions ----
  { id: "SQL-201", title: "ROW_NUMBER & RANK", difficulty: "Advanced", estMin: 65, xp: 280, tag: "Windows", status: "Not Started",
    description: "Rank top 3 products per category using a window function partitioned by category." },
  { id: "SQL-202", title: "LAG, LEAD & running totals", difficulty: "Advanced", estMin: 70, xp: 300, tag: "Windows", status: "Not Started",
    description: "Compute month-over-month growth and a running revenue total per region." },

  // ---- SQL Lab · Performance ----
  { id: "SQL-301", title: "EXPLAIN & indexes", difficulty: "Advanced", estMin: 70, xp: 320, tag: "Tuning", status: "Not Started",
    description: "Read an EXPLAIN plan. Add a covering index to remove a sequential scan." },
  { id: "SQL-302", title: "Normalize & denormalize", difficulty: "Advanced", estMin: 60, xp: 280, tag: "Tuning", status: "Not Started",
    description: "Take a flat reporting table to 3NF, then design a denormalized read model for a dashboard." },

  // ---- MongoDB Lab · CRUD ----
  { id: "MDB-101", title: "Insert & find documents", difficulty: "Beginner", estMin: 30, xp: 120, tag: "Mongo CRUD", status: "In Progress", progress: 40,
    description: "Insert a few users with insertOne / insertMany, then read them back with find() and findOne()." },
  { id: "MDB-102", title: "Update operators ($set, $inc, $push)", difficulty: "Beginner", estMin: 40, xp: 160, tag: "Mongo CRUD", status: "Not Started",
    description: "Use updateOne / updateMany with $set, $inc, $push to evolve a user profile." },
  { id: "MDB-103", title: "Delete with filters", difficulty: "Beginner", estMin: 25, xp: 110, tag: "Mongo CRUD", status: "Not Started",
    description: "Remove documents using deleteMany with comparison operators." },

  // ---- MongoDB Lab · Query Operators ----
  { id: "MDB-201", title: "Comparison & logical operators", difficulty: "Intermediate", estMin: 45, xp: 200, tag: "Mongo Query", status: "Not Started",
    description: "Build queries with $gt, $in, $and, $or against an orders collection." },
  { id: "MDB-202", title: "Array & nested fields", difficulty: "Intermediate", estMin: 50, xp: 220, tag: "Mongo Query", status: "Not Started",
    description: "Query nested documents and arrays with dot-notation and $elemMatch." },

  // ---- MongoDB Lab · Aggregation ----
  { id: "MDB-301", title: "Aggregation: $match + $group", difficulty: "Advanced", estMin: 60, xp: 260, tag: "Aggregation", status: "Not Started",
    description: "Build a pipeline that totals revenue per category using $match and $group." },
  { id: "MDB-302", title: "Aggregation: $lookup join", difficulty: "Advanced", estMin: 70, xp: 300, tag: "Aggregation", status: "Not Started",
    description: "Use $lookup to join orders with users and project a clean shape." },

  // ---- MongoDB Lab · Indexes ----
  { id: "MDB-401", title: "Single & compound indexes", difficulty: "Advanced", estMin: 55, xp: 260, tag: "Mongo Indexes", status: "Not Started",
    description: "Create indexes and use explain() to confirm an IXSCAN over COLLSCAN." },

  // ---- Programming Lab (topic per sprint) ----
  { id: "PROG-101", title: "Hello, World!", difficulty: "Beginner", estMin: 15, xp: 60, tag: "Prog Intro", status: "Not Started", description: "Write your first program that prints a greeting to the console." },
  { id: "PROG-102", title: "Comments & Style", difficulty: "Beginner", estMin: 15, xp: 60, tag: "Prog Intro", status: "Not Started", description: "Add single-line and block comments. Follow consistent formatting." },
  { id: "PROG-103", title: "Reading input", difficulty: "Beginner", estMin: 20, xp: 80, tag: "Prog Intro", status: "Not Started", description: "Read a name from stdin and greet the user." },

  { id: "PROG-201", title: "Numeric types & casting", difficulty: "Beginner", estMin: 25, xp: 100, tag: "Prog Variables", status: "Not Started", description: "Use int, float, and explicit casting between numeric types." },
  { id: "PROG-202", title: "Arithmetic operators", difficulty: "Beginner", estMin: 25, xp: 100, tag: "Prog Variables", status: "Not Started", description: "Compute area, perimeter and modulo using arithmetic operators." },
  { id: "PROG-203", title: "Boolean & comparison", difficulty: "Beginner", estMin: 25, xp: 110, tag: "Prog Variables", status: "Not Started", description: "Combine boolean and comparison operators in expressions." },

  { id: "PROG-301", title: "if / elif / else", difficulty: "Beginner", estMin: 30, xp: 120, tag: "Prog Control Flow", status: "Not Started", description: "Classify a number as positive, negative or zero using branches." },
  { id: "PROG-302", title: "Nested conditionals", difficulty: "Beginner", estMin: 30, xp: 130, tag: "Prog Control Flow", status: "Not Started", description: "Decide ticket pricing based on age and membership status." },
  { id: "PROG-303", title: "Switch / match", difficulty: "Intermediate", estMin: 35, xp: 150, tag: "Prog Control Flow", status: "Not Started", description: "Use match/case (or switch) to map HTTP codes to messages." },

  { id: "PROG-401", title: "for & while loops", difficulty: "Beginner", estMin: 30, xp: 120, tag: "Prog Loops", status: "Not Started", description: "Iterate from 1 to N and accumulate a sum." },
  { id: "PROG-402", title: "break, continue, else", difficulty: "Beginner", estMin: 30, xp: 130, tag: "Prog Loops", status: "Not Started", description: "Find the first prime above 1000 using break." },
  { id: "PROG-403", title: "Nested loops & patterns", difficulty: "Intermediate", estMin: 40, xp: 160, tag: "Prog Loops", status: "Not Started", description: "Print a multiplication table and a pyramid pattern." },

  { id: "PROG-501", title: "Define & call functions", difficulty: "Beginner", estMin: 30, xp: 130, tag: "Prog Functions", status: "Not Started", description: "Write `add`, `max3`, `is_even` with type hints." },
  { id: "PROG-502", title: "Default & keyword args", difficulty: "Intermediate", estMin: 35, xp: 150, tag: "Prog Functions", status: "Not Started", description: "Use default and keyword arguments to build a greeter." },
  { id: "PROG-503", title: "Recursion: factorial & fib", difficulty: "Intermediate", estMin: 45, xp: 180, tag: "Prog Functions", status: "Not Started", description: "Implement factorial and Fibonacci recursively." },

  { id: "PROG-601", title: "String slicing & methods", difficulty: "Beginner", estMin: 30, xp: 130, tag: "Prog Strings", status: "Not Started", description: "Reverse, capitalize and count vowels in a string." },
  { id: "PROG-602", title: "Palindrome check", difficulty: "Intermediate", estMin: 30, xp: 140, tag: "Prog Strings", status: "Not Started", description: "Check if a sentence is a palindrome ignoring case and spaces." },

  { id: "PROG-701", title: "Read & write a text file", difficulty: "Intermediate", estMin: 40, xp: 160, tag: "Prog File I/O", status: "Not Started", description: "Read a file line by line and write transformed output." },
  { id: "PROG-702", title: "Word count", difficulty: "Intermediate", estMin: 40, xp: 170, tag: "Prog File I/O", status: "Not Started", description: "Count occurrences of each word in a text file." },

  { id: "PROG-801", title: "try / except basics", difficulty: "Intermediate", estMin: 35, xp: 150, tag: "Prog Errors", status: "Not Started", description: "Handle ValueError when parsing user input as int." },
  { id: "PROG-802", title: "Custom exceptions", difficulty: "Intermediate", estMin: 40, xp: 170, tag: "Prog Errors", status: "Not Started", description: "Define and raise a custom exception class for invalid input." },

  { id: "PROG-901", title: "Classes & instances", difficulty: "Intermediate", estMin: 45, xp: 190, tag: "Prog OOP", status: "Not Started", description: "Define a `Point` class with x, y and a distance method." },
  { id: "PROG-902", title: "Inheritance", difficulty: "Intermediate", estMin: 50, xp: 200, tag: "Prog OOP", status: "Not Started", description: "Model `Animal` → `Dog`/`Cat` with overridden `speak`." },
  { id: "PROG-903", title: "Dunder methods", difficulty: "Advanced", estMin: 55, xp: 230, tag: "Prog OOP", status: "Not Started", description: "Implement __str__, __eq__ and __lt__ on a Money class." },

  // ---- Data Structures Lab (topic per sprint) ----
  { id: "DS-101", title: "Array traversal & sum", difficulty: "Beginner", estMin: 25, xp: 110, tag: "DS Arrays", status: "Not Started", description: "Sum elements and find min/max in a single pass." },
  { id: "DS-102", title: "Two-pointer: reverse in place", difficulty: "Intermediate", estMin: 35, xp: 150, tag: "DS Arrays", status: "Not Started", description: "Reverse an array in O(n) using two pointers." },
  { id: "DS-103", title: "Sliding window maximum sum", difficulty: "Intermediate", estMin: 45, xp: 180, tag: "DS Arrays", status: "Not Started", description: "Find the max sum of any contiguous window of size k." },

  { id: "DS-201", title: "Singly linked list", difficulty: "Intermediate", estMin: 50, xp: 200, tag: "DS Linked Lists", status: "Not Started", description: "Implement insert, delete and search on a singly linked list." },
  { id: "DS-202", title: "Reverse a linked list", difficulty: "Intermediate", estMin: 40, xp: 180, tag: "DS Linked Lists", status: "Not Started", description: "Reverse a singly linked list iteratively and recursively." },
  { id: "DS-203", title: "Detect cycle (Floyd's)", difficulty: "Advanced", estMin: 55, xp: 240, tag: "DS Linked Lists", status: "Not Started", description: "Detect a cycle using slow/fast pointers." },

  { id: "DS-301", title: "Stack with array", difficulty: "Beginner", estMin: 30, xp: 120, tag: "DS Stacks", status: "Not Started", description: "Implement push/pop/peek with a dynamic array." },
  { id: "DS-302", title: "Balanced parentheses", difficulty: "Intermediate", estMin: 35, xp: 160, tag: "DS Stacks", status: "Not Started", description: "Validate balanced (), [], {} using a stack." },
  { id: "DS-303", title: "Min stack in O(1)", difficulty: "Advanced", estMin: 45, xp: 200, tag: "DS Stacks", status: "Not Started", description: "Support getMin() in O(1) using an auxiliary stack." },

  { id: "DS-401", title: "Queue with two stacks", difficulty: "Intermediate", estMin: 40, xp: 170, tag: "DS Queues", status: "Not Started", description: "Implement an FIFO queue using two LIFO stacks." },
  { id: "DS-402", title: "Circular queue", difficulty: "Intermediate", estMin: 45, xp: 190, tag: "DS Queues", status: "Not Started", description: "Fixed-capacity circular queue with O(1) enqueue/dequeue." },
  { id: "DS-403", title: "Deque sliding window max", difficulty: "Advanced", estMin: 55, xp: 240, tag: "DS Queues", status: "Not Started", description: "Find sliding window maxima in O(n) using a deque." },

  { id: "DS-501", title: "Hash map from scratch", difficulty: "Intermediate", estMin: 55, xp: 220, tag: "DS Hashing", status: "Not Started", description: "Implement put/get/remove with chaining." },
  { id: "DS-502", title: "Two-sum with hashing", difficulty: "Beginner", estMin: 25, xp: 120, tag: "DS Hashing", status: "Not Started", description: "Find two indices that add up to a target in O(n)." },
  { id: "DS-503", title: "Group anagrams", difficulty: "Intermediate", estMin: 40, xp: 180, tag: "DS Hashing", status: "Not Started", description: "Group strings that are anagrams using a hash map." },

  { id: "DS-601", title: "Binary tree traversals", difficulty: "Intermediate", estMin: 45, xp: 190, tag: "DS Trees", status: "Not Started", description: "Implement in-order, pre-order and post-order traversals." },
  { id: "DS-602", title: "BST insert & search", difficulty: "Intermediate", estMin: 45, xp: 200, tag: "DS Trees", status: "Not Started", description: "Insert and search in a binary search tree." },
  { id: "DS-603", title: "Lowest common ancestor", difficulty: "Advanced", estMin: 60, xp: 260, tag: "DS Trees", status: "Not Started", description: "Find the LCA of two nodes in a binary tree." },

  { id: "DS-701", title: "Heapify an array", difficulty: "Intermediate", estMin: 45, xp: 200, tag: "DS Heaps", status: "Not Started", description: "Build a min-heap from an unsorted array in O(n)." },
  { id: "DS-702", title: "Top K frequent elements", difficulty: "Advanced", estMin: 55, xp: 240, tag: "DS Heaps", status: "Not Started", description: "Return the K most frequent elements using a heap." },

  { id: "DS-801", title: "Graph BFS", difficulty: "Intermediate", estMin: 50, xp: 220, tag: "DS Graphs", status: "Not Started", description: "Implement breadth-first search on an adjacency list." },
  { id: "DS-802", title: "Graph DFS", difficulty: "Intermediate", estMin: 50, xp: 220, tag: "DS Graphs", status: "Not Started", description: "Implement depth-first search iteratively and recursively." },
  { id: "DS-803", title: "Dijkstra's shortest path", difficulty: "Advanced", estMin: 75, xp: 320, tag: "DS Graphs", status: "Not Started", description: "Find shortest paths from a source using a priority queue." },

  { id: "DS-901", title: "Bubble & insertion sort", difficulty: "Beginner", estMin: 35, xp: 140, tag: "DS Sorting", status: "Not Started", description: "Implement two classic O(n²) sorts and compare." },
  { id: "DS-902", title: "Merge sort", difficulty: "Intermediate", estMin: 55, xp: 230, tag: "DS Sorting", status: "Not Started", description: "Implement merge sort in O(n log n)." },
  { id: "DS-903", title: "Quick sort with partition", difficulty: "Advanced", estMin: 60, xp: 260, tag: "DS Sorting", status: "Not Started", description: "Implement quick sort with Lomuto partition." },

  { id: "DS-1001", title: "Binary search", difficulty: "Beginner", estMin: 30, xp: 130, tag: "DS Searching", status: "Not Started", description: "Implement iterative and recursive binary search." },
  { id: "DS-1002", title: "Search in rotated array", difficulty: "Advanced", estMin: 55, xp: 240, tag: "DS Searching", status: "Not Started", description: "Search a target in a rotated sorted array in O(log n)." },

  // ---- Linux Lab ----
  { id: "LNX-101", title: "Navigate the filesystem", difficulty: "Beginner", estMin: 20, xp: 80, tag: "Linux Basics", status: "Not Started", description: "Use pwd, ls, cd, tree and man to move around and inspect the filesystem." },
  { id: "LNX-102", title: "File & directory operations", difficulty: "Beginner", estMin: 25, xp: 100, tag: "Linux Basics", status: "Not Started", description: "Create, copy, move and remove files/directories with touch, mkdir, cp, mv, rm." },
  { id: "LNX-103", title: "View & edit text files", difficulty: "Beginner", estMin: 30, xp: 120, tag: "Linux Files", status: "Not Started", description: "Read files with cat/less/head/tail and edit them in nano or vim." },
  { id: "LNX-104", title: "File permissions with chmod", difficulty: "Beginner", estMin: 30, xp: 130, tag: "Linux Perms", status: "Not Started", description: "Set rwx bits with symbolic and numeric chmod and read ls -l output." },
  { id: "LNX-105", title: "Ownership with chown & chgrp", difficulty: "Intermediate", estMin: 30, xp: 140, tag: "Linux Perms", status: "Not Started", description: "Change file owner and group; understand user vs group vs other." },
  { id: "LNX-106", title: "User & group management", difficulty: "Intermediate", estMin: 35, xp: 150, tag: "Linux Perms", status: "Not Started", description: "Create users and groups with useradd/groupadd and manage /etc/passwd." },
  { id: "LNX-107", title: "Process inspection: ps & top", difficulty: "Intermediate", estMin: 35, xp: 150, tag: "Linux Processes", status: "Not Started", description: "Inspect running processes with ps aux, top and htop. Filter by user and CPU." },
  { id: "LNX-108", title: "Signals & kill", difficulty: "Intermediate", estMin: 30, xp: 140, tag: "Linux Processes", status: "Not Started", description: "Send SIGTERM/SIGKILL/SIGHUP with kill and pkill; understand nohup and disown." },
  { id: "LNX-109", title: "Pipes & I/O redirection", difficulty: "Intermediate", estMin: 30, xp: 140, tag: "Linux Files", status: "Not Started", description: "Chain commands with |, redirect stdout/stderr with >, >>, 2>&1 and tee." },
  { id: "LNX-110", title: "grep, awk & sed", difficulty: "Intermediate", estMin: 45, xp: 200, tag: "Linux Files", status: "Not Started", description: "Search with grep -r, transform text with sed, extract columns with awk." },
  { id: "LNX-111", title: "SSH & scp basics", difficulty: "Intermediate", estMin: 40, xp: 180, tag: "Linux Network", status: "Not Started", description: "Generate an ed25519 key, add it to a remote host and copy files with scp/rsync." },
  { id: "LNX-112", title: "Network tools: curl, ping, ss", difficulty: "Intermediate", estMin: 40, xp: 180, tag: "Linux Network", status: "Not Started", description: "Probe connectivity with ping/traceroute, inspect sockets with ss and fetch URLs with curl." },
  { id: "LNX-113", title: "Shell scripting basics", difficulty: "Intermediate", estMin: 45, xp: 200, tag: "Linux Shell", status: "Not Started", description: "Write a bash script with variables, arguments, exit codes and shebang." },
  { id: "LNX-114", title: "Loops & conditionals in bash", difficulty: "Intermediate", estMin: 45, xp: 210, tag: "Linux Shell", status: "Not Started", description: "Use for/while, if/[[ ]] and case to script a small backup routine." },
  { id: "LNX-115", title: "Package managers (apt/yum/dnf)", difficulty: "Beginner", estMin: 30, xp: 130, tag: "Linux Services", status: "Not Started", description: "Install, update and remove packages; understand repositories." },
  { id: "LNX-116", title: "systemctl & services", difficulty: "Intermediate", estMin: 40, xp: 190, tag: "Linux Services", status: "Not Started", description: "Start, enable and inspect systemd services; write a simple unit file." },

  // ---- QA Lab ----
  { id: "QA-101", title: "Write a test plan", difficulty: "Beginner", estMin: 30, xp: 120, tag: "QA Fundamentals", status: "Not Started", description: "Draft a test plan with scope, entry/exit criteria, risks and deliverables." },
  { id: "QA-102", title: "Positive & negative test cases", difficulty: "Beginner", estMin: 30, xp: 130, tag: "QA Fundamentals", status: "Not Started", description: "Design happy-path and edge-case test cases for a login form." },
  { id: "QA-103", title: "Bug reports that don't suck", difficulty: "Beginner", estMin: 25, xp: 110, tag: "QA Fundamentals", status: "Not Started", description: "File a reproducible bug report with steps, expected/actual results and severity." },
  { id: "QA-104", title: "Manual regression checklist", difficulty: "Intermediate", estMin: 40, xp: 170, tag: "QA Manual", status: "Not Started", description: "Build a smoke/regression checklist for a small e-commerce app." },
  { id: "QA-105", title: "Exploratory testing session", difficulty: "Intermediate", estMin: 45, xp: 180, tag: "QA Manual", status: "Not Started", description: "Run a timeboxed charter-based exploratory session and log findings." },
  { id: "QA-106", title: "REST API testing with Postman", difficulty: "Intermediate", estMin: 45, xp: 190, tag: "QA API", status: "Not Started", description: "Build a Postman collection with environment vars and assertions for a CRUD API." },
  { id: "QA-107", title: "Automate an API test with supertest", difficulty: "Intermediate", estMin: 55, xp: 230, tag: "QA API", status: "Not Started", description: "Write Jest + supertest tests for a Node REST API with auth headers and JSON assertions." },
  { id: "QA-108", title: "JSON Schema validation", difficulty: "Advanced", estMin: 55, xp: 240, tag: "QA API", status: "Not Started", description: "Validate API responses against a JSON schema using ajv." },
  { id: "QA-109", title: "First Playwright test", difficulty: "Intermediate", estMin: 50, xp: 220, tag: "QA UI", status: "Not Started", description: "Set up Playwright and write a test that logs into an app and asserts the dashboard." },
  { id: "QA-110", title: "Page Object Model in Playwright", difficulty: "Advanced", estMin: 65, xp: 280, tag: "QA UI", status: "Not Started", description: "Refactor tests into page objects with reusable actions and selectors." },
  { id: "QA-111", title: "Cross-browser & mobile viewport", difficulty: "Advanced", estMin: 55, xp: 240, tag: "QA UI", status: "Not Started", description: "Run the suite on Chromium, WebKit and a mobile viewport in Playwright." },
  { id: "QA-112", title: "Load test with k6", difficulty: "Advanced", estMin: 60, xp: 270, tag: "QA Perf", status: "Not Started", description: "Model a ramp-up load test with k6 and assert p95 latency thresholds." },
  { id: "QA-113", title: "Analyze a performance report", difficulty: "Advanced", estMin: 45, xp: 210, tag: "QA Perf", status: "Not Started", description: "Interpret a k6/Lighthouse report and identify the top bottleneck." },
  { id: "QA-114", title: "Run tests in GitHub Actions", difficulty: "Intermediate", estMin: 45, xp: 200, tag: "QA CI", status: "Not Started", description: "Configure a GitHub Actions workflow that installs deps and runs the test suite on PRs." },
  { id: "QA-115", title: "Publish HTML report artifact", difficulty: "Intermediate", estMin: 40, xp: 190, tag: "QA CI", status: "Not Started", description: "Upload the Playwright HTML report as a build artifact for reviewers." },

  // ---- System Design Lab ----
  { id: "SD-101", title: "CAP theorem & tradeoffs", difficulty: "Advanced", estMin: 40, xp: 180, tag: "SD Fundamentals", status: "Not Started", description: "Explain consistency vs availability vs partition tolerance with realistic scenarios." },
  { id: "SD-102", title: "Latency, throughput & SLOs", difficulty: "Intermediate", estMin: 35, xp: 160, tag: "SD Fundamentals", status: "Not Started", description: "Define p50/p95/p99 latency, error budgets and pick SLOs for a service." },
  { id: "SD-103", title: "API design & versioning", difficulty: "Intermediate", estMin: 40, xp: 180, tag: "SD Fundamentals", status: "Not Started", description: "Design a REST API for a booking service. Pick a versioning strategy." },
  { id: "SD-104", title: "Horizontal vs vertical scaling", difficulty: "Intermediate", estMin: 35, xp: 160, tag: "SD Scalability", status: "Not Started", description: "Compare scale-up and scale-out with cost, failure and elasticity in mind." },
  { id: "SD-105", title: "Load balancers & health checks", difficulty: "Intermediate", estMin: 40, xp: 180, tag: "SD Scalability", status: "Not Started", description: "Design L4 vs L7 load balancing and add active/passive health checks." },
  { id: "SD-106", title: "Rate limiting strategies", difficulty: "Advanced", estMin: 45, xp: 200, tag: "SD Scalability", status: "Not Started", description: "Compare fixed window, sliding window and token bucket rate limiting." },
  { id: "SD-107", title: "Cache-aside pattern", difficulty: "Intermediate", estMin: 40, xp: 180, tag: "SD Caching", status: "Not Started", description: "Design a read-through cache-aside flow with TTLs and invalidation." },
  { id: "SD-108", title: "CDN & edge caching", difficulty: "Intermediate", estMin: 40, xp: 180, tag: "SD Caching", status: "Not Started", description: "Choose which assets to push to a CDN and how to invalidate them." },
  { id: "SD-109", title: "Redis caching patterns", difficulty: "Advanced", estMin: 45, xp: 210, tag: "SD Caching", status: "Not Started", description: "Compare cache-aside, write-through and write-behind with Redis." },
  { id: "SD-110", title: "SQL vs NoSQL choice", difficulty: "Intermediate", estMin: 40, xp: 190, tag: "SD Databases", status: "Not Started", description: "Pick a datastore for social feed, analytics and order ledger workloads." },
  { id: "SD-111", title: "Sharding & partitioning", difficulty: "Advanced", estMin: 55, xp: 240, tag: "SD Databases", status: "Not Started", description: "Design a shard key for a users table. Handle hotspots and re-sharding." },
  { id: "SD-112", title: "Replication & consistency", difficulty: "Advanced", estMin: 55, xp: 240, tag: "SD Databases", status: "Not Started", description: "Compare sync vs async replication and pick a consistency model." },
  { id: "SD-113", title: "Message queues (Kafka/SQS)", difficulty: "Advanced", estMin: 55, xp: 240, tag: "SD Messaging", status: "Not Started", description: "Model producer/consumer topology, partitioning and consumer groups." },
  { id: "SD-114", title: "Event-driven architecture", difficulty: "Advanced", estMin: 55, xp: 250, tag: "SD Messaging", status: "Not Started", description: "Design an event-driven checkout flow with idempotent consumers." },
  { id: "SD-115", title: "Design a URL shortener", difficulty: "Advanced", estMin: 60, xp: 280, tag: "SD Cases", status: "Not Started", description: "End-to-end design: hashing, storage, cache and redirect analytics at scale." },
  { id: "SD-116", title: "Design a chat system", difficulty: "Advanced", estMin: 70, xp: 320, tag: "SD Cases", status: "Not Started", description: "Design 1:1 and group chat with presence, delivery receipts and offline queues." },

  // ---- Cyber Security Lab ----
  { id: "SEC-101", title: "Threat modeling with STRIDE", difficulty: "Intermediate", estMin: 45, xp: 190, tag: "Sec Foundations", status: "Not Started", description: "Build a STRIDE threat model for a small web app and rank mitigations." },
  { id: "SEC-102", title: "Principle of least privilege", difficulty: "Intermediate", estMin: 30, xp: 140, tag: "Sec Foundations", status: "Not Started", description: "Audit IAM roles for a service and remove unused permissions." },
  { id: "SEC-103", title: "SQL injection lab", difficulty: "Intermediate", estMin: 45, xp: 200, tag: "Sec OWASP", status: "Not Started", description: "Exploit and then patch a vulnerable login endpoint with parameterized queries." },
  { id: "SEC-104", title: "XSS: reflected & stored", difficulty: "Intermediate", estMin: 45, xp: 200, tag: "Sec OWASP", status: "Not Started", description: "Reproduce reflected and stored XSS, then fix with output encoding and CSP." },
  { id: "SEC-105", title: "CSRF protection", difficulty: "Intermediate", estMin: 40, xp: 180, tag: "Sec OWASP", status: "Not Started", description: "Attack a session-cookie form and defend with SameSite cookies and CSRF tokens." },
  { id: "SEC-106", title: "Broken access control", difficulty: "Advanced", estMin: 50, xp: 220, tag: "Sec OWASP", status: "Not Started", description: "Exploit an IDOR and fix it with server-side authorization checks." },
  { id: "SEC-107", title: "SSRF exploitation & defense", difficulty: "Advanced", estMin: 55, xp: 240, tag: "Sec OWASP", status: "Not Started", description: "Trigger SSRF against a metadata endpoint and mitigate with allow-lists." },
  { id: "SEC-108", title: "Password hashing with bcrypt", difficulty: "Intermediate", estMin: 35, xp: 160, tag: "Sec Auth", status: "Not Started", description: "Hash and verify passwords with bcrypt at an appropriate cost factor." },
  { id: "SEC-109", title: "OAuth 2.0 authorization code flow", difficulty: "Advanced", estMin: 60, xp: 260, tag: "Sec Auth", status: "Not Started", description: "Walk through OAuth authorization code + PKCE end to end." },
  { id: "SEC-110", title: "JWT security pitfalls", difficulty: "Advanced", estMin: 45, xp: 210, tag: "Sec Auth", status: "Not Started", description: "Explore alg=none, key confusion and expiration; implement safe verification." },
  { id: "SEC-111", title: "Symmetric encryption with AES", difficulty: "Intermediate", estMin: 45, xp: 200, tag: "Sec Crypto", status: "Not Started", description: "Encrypt data with AES-GCM using a random nonce and authenticated tag." },
  { id: "SEC-112", title: "Asymmetric encryption & signatures", difficulty: "Advanced", estMin: 55, xp: 240, tag: "Sec Crypto", status: "Not Started", description: "Sign and verify a payload with RSA/ed25519 keys." },
  { id: "SEC-113", title: "TLS handshake explained", difficulty: "Intermediate", estMin: 40, xp: 180, tag: "Sec Crypto", status: "Not Started", description: "Trace a TLS 1.3 handshake and explain each message." },
  { id: "SEC-114", title: "nmap port scan lab", difficulty: "Intermediate", estMin: 45, xp: 200, tag: "Sec Network", status: "Not Started", description: "Scan a lab host with nmap; identify open services and versions." },
  { id: "SEC-115", title: "Firewall rules with iptables", difficulty: "Advanced", estMin: 50, xp: 220, tag: "Sec Network", status: "Not Started", description: "Restrict inbound traffic to SSH and HTTPS only with iptables/nftables." },
  { id: "SEC-116", title: "Secrets management & rotation", difficulty: "Advanced", estMin: 45, xp: 210, tag: "Sec Cloud", status: "Not Started", description: "Store secrets in a vault and rotate database credentials without downtime." },
  { id: "SEC-117", title: "Container hardening", difficulty: "Advanced", estMin: 55, xp: 240, tag: "Sec Cloud", status: "Not Started", description: "Run containers as non-root, drop caps and pin image digests." },
  { id: "SEC-118", title: "Incident response basics", difficulty: "Intermediate", estMin: 40, xp: 190, tag: "Sec Cloud", status: "Not Started", description: "Draft an IR runbook covering detect, contain, eradicate and recover." },
];

export const leaderboard = [
  { rank: 1, name: "Aarav S.", xp: 12480, streak: 42, avatar: "AS" },
  { rank: 2, name: "Priya M.", xp: 11820, streak: 30, avatar: "PM" },
  { rank: 3, name: "Liam K.", xp: 10990, streak: 21, avatar: "LK" },
  { rank: 4, name: "Sofia R.", xp: 9870, streak: 14, avatar: "SR" },
  { rank: 5, name: "Noah T.", xp: 9410, streak: 9, avatar: "NT" },
  { rank: 15, name: "You", xp: 4250, streak: 7, avatar: "YO", isYou: true },
];

export const me = {
  name: "Alex Chen",
  handle: "@alexc",
  level: 12,
  xp: 4250,
  nextLevelXp: 5000,
  streak: 7,
  rank: 15,
  totalSolved: 28,
  avatar: "AC",
};

export const forumThreads = [
  { id: 1, title: "Best way to handle null in JAVA-110?", author: "Priya M.", replies: 12, tag: "Java", time: "2h" },
  { id: 2, title: "Python list comprehension vs loop perf", author: "Liam K.", replies: 7, tag: "Python", time: "5h" },
  { id: 3, title: "When should I use INNER vs LEFT join?", author: "Sofia R.", replies: 23, tag: "SQL", time: "1d" },
  { id: 4, title: "Tailwind grid gotchas with auto-fit", author: "Noah T.", replies: 4, tag: "UI", time: "1d" },
];

export const certificates = [
  { id: 1, title: "Java Fundamentals", date: "May 2026", score: 92, color: "java" as const },
  { id: 2, title: "Python Essentials", date: "Apr 2026", score: 88, color: "python" as const },
  { id: 3, title: "SQL Basics", date: "Mar 2026", score: 95, color: "sql" as const },
];
