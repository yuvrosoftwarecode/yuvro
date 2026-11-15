export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  tag: string;
  file: string;
  startupCommand: string;
  files: Record<string, string>;
}

export const VITARKA_PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "flask",
    name: "Flask Web App",
    description: "Python microframework with REST API routes, HTML templates, and SQLite.",
    tag: "flask",
    file: "app.py",
    startupCommand: "python app.py",
    files: {
      "app.py": `from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

# Sample in-memory store
items = [
    {"id": 1, "title": "Setup Yuvro Vitarka IDE", "done": True},
    {"id": 2, "title": "Build app with AI Mentor", "done": False},
]

@app.route("/")
def index():
    return render_template("index.html", items=items)

@app.route("/api/items", methods=["GET"])
def get_items():
    return jsonify({"success": True, "items": items})

@app.route("/api/items", methods=["POST"])
def add_item():
    data = request.get_json() or {}
    title = data.get("title", "").strip()
    if not title:
        return jsonify({"success": False, "error": "Title required"}), 400
    new_item = {"id": len(items) + 1, "title": title, "done": False}
    items.append(new_item)
    return jsonify({"success": True, "item": new_item}), 201

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
`,
      "templates/index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flask App · Yuvro Vitarka</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen flex items-center justify-center p-6 font-sans">
  <div class="max-w-md w-full bg-slate-800/90 border border-slate-700 rounded-2xl p-6 shadow-2xl">
    <div class="flex items-center gap-3 mb-6">
      <div class="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-lg border border-orange-500/30">
        ⚡
      </div>
      <div>
        <h1 class="text-xl font-bold text-white">Flask Web Service</h1>
        <p class="text-xs text-slate-400">Powered by Yuvro Vitarka IDE</p>
      </div>
    </div>

    <div class="space-y-3 mb-6">
      <h2 class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Items</h2>
      <ul class="space-y-2">
        {% for item in items %}
        <li class="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-700/50 border border-slate-700">
          <input type="checkbox" {% if item.done %}checked{% endif %} class="rounded text-orange-500" disabled>
          <span class="text-sm {% if item.done %}line-through text-slate-500{% else %}text-slate-200{% endif %}">
            {{ item.title }}
          </span>
        </li>
        {% endfor %}
      </ul>
    </div>

    <div class="pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
      <span>Status: <span class="text-emerald-400 font-semibold">Ready</span></span>
      <span>Port: <span class="font-mono text-orange-300">5000</span></span>
    </div>
  </div>
</body>
</html>
`,
      "requirements.txt": `Flask==3.0.0
gunicorn==21.2.0
werkzeug==3.0.1
`,
      ".yuvro-developer/skills/flask/SKILL.md": `---
name: flask-development
description: Guidelines, project architecture, and coding standards for Flask development in Yuvro Vitarka IDE.
---

# Flask Development Skill

## Project Architecture
- **Entrypoint**: \`app.py\`
- **Templates**: \`templates/\` (Jinja2 HTML templates)
- **Static Assets**: \`static/\` (CSS, JS, images)
- **Dependencies**: \`requirements.txt\`

## Coding Standards & Best Practices
- Keep route functions lean and focused.
- Return structured JSON from API endpoints using \`jsonify({"success": True, ...})\` with appropriate HTTP status codes.
- Validate request inputs (\`request.get_json()\`, \`request.args\`) before processing.
- Handle exceptions gracefully with clean error payloads.
`,
      "README.md": `# Flask Starter App

Created in Yuvro Vitarka IDE.
Use AI Mentor in Plan or Agent mode to add new features!
`,
    },
  },

  {
    id: "django",
    name: "Django Web Framework",
    description: "Full-stack Python framework with ORM, views, and template rendering.",
    tag: "django",
    file: "manage.py",
    startupCommand: "python manage.py runserver 0.0.0.0:8000",
    files: {
      "manage.py": `#!/usr/bin/env python
import os
import sys

def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "todoproject.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError("Couldn't import Django.") from exc
    execute_from_command_line(sys.argv)

if __name__ == "__main__":
    main()
`,
      "todoproject/settings.py": `from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = "yuvro-vitarka-django-secret-key"
DEBUG = True
ALLOWED_HOSTS = ["*"]
INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "todos",
]
ROOT_URLCONF = "todoproject.urls"
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}
STATIC_URL = "static/"
`,
      "todoproject/urls.py": `from django.urls import path, include
urlpatterns = [
    path("", include("todos.urls")),
]
`,
      "todos/urls.py": `from django.urls import path
from todos import views
urlpatterns = [
    path("", views.home, name="home"),
    path("api/health/", views.health, name="health"),
]
`,
      "todos/views.py": `from django.shortcuts import render
from django.http import JsonResponse

def home(request):
    return render(request, "todos/index.html", {"title": "Yuvro Django App"})

def health(request):
    return JsonResponse({"status": "ok", "app": "Django Vitarka"})
`,
      "todos/templates/todos/index.html": `<!DOCTYPE html>
<html>
<head><title>{{ title }}</title><script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-zinc-950 text-white min-h-screen flex items-center justify-center p-6">
  <div class="max-w-md w-full bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl text-center">
    <div class="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center font-bold text-xl mb-4">dj</div>
    <h1 class="text-xl font-bold mb-2">{{ title }}</h1>
    <p class="text-zinc-400 text-xs">Django app ready in Yuvro Vitarka IDE</p>
  </div>
</body>
</html>
`,
      "requirements.txt": `Django==5.0.3
asgiref==3.8.1
sqlparse==0.4.4
`,
      ".yuvro-developer/skills/django/SKILL.md": `---
name: django-development
description: Guidelines, project architecture, and conventions for Django full-stack apps in Yuvro Vitarka IDE.
---

# Django Development Skill

## Project Architecture
- **Project Configuration**: \`todoproject/settings.py\`, \`todoproject/urls.py\`
- **App Module**: \`todos/\` (\`models.py\`, \`views.py\`, \`urls.py\`, \`templates/\`)
- **CLI Commands**: \`python manage.py runserver\`, \`python manage.py migrate\`

## Coding Standards & Best Practices
- Follow Django's MTV (Model-Template-View) design pattern.
- Keep business logic in models or services, not inside views.
- Use Django ORM queries efficiently and define clean URL patterns with named routes.
- Return \`JsonResponse\` for API endpoints and \`render(request, ...)\` for HTML views.
`,
      "README.md": `# Django App Starter
Run \`python manage.py runserver\` to start.
`,
    },
  },

  {
    id: "fastapi",
    name: "FastAPI Service",
    description: "Modern async Python API with automatic docs and Pydantic validation.",
    tag: "python",
    file: "main.py",
    startupCommand: "uvicorn main:app --reload --host 0.0.0.0 --port 8000",
    files: {
      "main.py": `from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI(title="Yuvro FastAPI", version="1.0.0")

class Item(BaseModel):
    id: int
    name: str
    price: float

items_db = [
    Item(id=1, name="Mechanical Keyboard", price=89.99),
    Item(id=2, name="Wireless Mouse", price=49.99),
]

@app.get("/")
def root():
    return {"message": "Welcome to Yuvro FastAPI", "docs": "/docs", "items_count": len(items_db)}

@app.get("/items", response_model=List[Item])
def get_items():
    return items_db
`,
      "requirements.txt": `fastapi==0.110.0
uvicorn[standard]==0.29.0
pydantic==2.6.4
`,
      ".yuvro-developer/skills/fastapi/SKILL.md": `---
name: fastapi-development
description: Guidelines, async best practices, and Pydantic validation for FastAPI in Yuvro Vitarka IDE.
---

# FastAPI Development Skill

## Project Architecture
- **Entrypoint**: \`main.py\`
- **Schemas**: Pydantic models for request bodies and response validation
- **Interactive Documentation**: Available at \`/docs\` (Swagger UI) and \`/redoc\`

## Coding Standards & Best Practices
- Use type hints on all endpoints and function signatures.
- Leverage Pydantic \`BaseModel\` and \`response_model\` for strict data validation and serialization.
- Use \`async def\` for I/O-bound operations and \`def\` for CPU-bound computations.
- Centralize error handling using \`HTTPException\` with clear error details.
`,
      "README.md": `# FastAPI Starter
Explore Swagger docs at \`/docs\`.
`,
    },
  },

  {
    id: "express",
    name: "Node.js & Express",
    description: "Minimalist Node.js web server and REST API.",
    tag: "js",
    file: "index.js",
    startupCommand: "node index.js",
    files: {
      "index.js": `const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

let todos = [
  { id: 1, title: 'Learn Yuvro Vitarka IDE', completed: true },
  { id: 2, title: 'Build Express microservice', completed: false }
];

app.get('/', (req, res) => {
  res.send('<h1>Yuvro Express API</h1><p>Visit <a href="/api/todos">/api/todos</a></p>');
});

app.get('/api/todos', (req, res) => {
  res.json({ success: true, count: todos.length, data: todos });
});

app.listen(PORT, () => {
  console.log(\`Server running on http://localhost:\${PORT}\`);
});
`,
      "package.json": `{
  "name": "express-app",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.19.2"
  }
}
`,
      ".yuvro-developer/skills/express/SKILL.md": `---
name: express-development
description: Guidelines, middleware conventions, and routing for Node.js Express in Yuvro Vitarka IDE.
---

# Express.js Development Skill

## Project Architecture
- **Entrypoint**: \`index.js\`
- **Package Manifest**: \`package.json\`
- **Routing**: Modular route handlers with \`express.Router()\`

## Coding Standards & Best Practices
- Use \`express.json()\` middleware for JSON body parsing.
- Always include error-handling middleware \`(err, req, res, next)\`.
- Use async/await for asynchronous operations with \`try/catch\` blocks.
- Follow consistent RESTful URL design (\`/api/items\`, \`/api/items/:id\`).
`,
      "README.md": `# Node.js Express App
Run with \`node index.js\`.
`,
    },
  },

  {
    id: "react",
    name: "React Web App",
    description: "Component-based web frontend with state and Tailwind CSS.",
    tag: "ui",
    file: "src/App.jsx",
    startupCommand: "npm run dev",
    files: {
      "src/App.jsx": `import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
        <h1 className="text-2xl font-bold mb-2">Yuvro React App</h1>
        <p className="text-sm text-slate-400 mb-6">Built in Yuvro Vitarka IDE</p>
        <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/60 mb-6">
          <span className="text-4xl font-extrabold text-indigo-400 font-mono">{count}</span>
        </div>
        <div className="flex justify-center gap-3">
          <button onClick={() => setCount(c => c - 1)} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition">- Dec</button>
          <button onClick={() => setCount(c => c + 1)} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition">+ Inc</button>
        </div>
      </div>
    </div>
  );
}
`,
      "index.html": `<!DOCTYPE html>
<html>
<head><title>React App</title><script src="https://cdn.tailwindcss.com"></script></head>
<body><div id="root"></div></body>
</html>
`,
      "package.json": `{
  "name": "react-app",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
`,
      ".yuvro-developer/skills/react/SKILL.md": `---
name: react-development
description: Component architecture, hooks, and modern frontend conventions for React in Yuvro Vitarka IDE.
---

# React Development Skill

## Project Architecture
- **Entrypoint**: \`src/App.jsx\`
- **HTML Container**: \`index.html\`
- **Styling**: Tailwind CSS utility classes

## Coding Standards & Best Practices
- Build functional components using React hooks (\`useState\`, \`useEffect\`, \`useMemo\`).
- Keep components atomic, reusable, and single-purpose.
- Prefer controlled form components and clear state lifting.
- Use Tailwind CSS classes for responsive and accessible UI.
`,
      "README.md": `# React UI App
Interactive UI app in Yuvro Vitarka IDE.
`,
    },
  },

  {
    id: "scratch",
    name: "Custom Vibe Coding (Scratch)",
    description: "Start blank or prompt the AI Mentor in Agent mode to scaffold any custom project from scratch.",
    tag: "python",
    file: "main.py",
    startupCommand: "python main.py",
    files: {
      "main.py": `# Yuvro Vitarka IDE · Custom Vibe Coded App
# Use AI Mentor (Plan or Agent mode) to generate your architecture and files!

def main():
    print("Welcome to your custom Vibe-coded application in Yuvro Vitarka IDE!")

if __name__ == "__main__":
    main()
`,
      ".yuvro-developer/skills/vibe-coding/SKILL.md": `---
name: vibe-coding
description: Architecture, planning, and rapid vibe coding guidelines for Yuvro Vitarka IDE.
---

# Vibe Coding Skill

## Principles & Guidelines
- **Start with Plan Mode**: Generate 2-4 concise, minimal tasks before implementing.
- **Incremental Implementation**: Run tasks one-by-one or in parallel using Agent mode.
- **Review Changes**: Verify multi-file diffs before applying.
- **Keep it Minimal**: Avoid premature complexity, focus on working functionality first.
`,
      "README.md": `# Custom Vibe Coded App

Build anything from scratch!
1. Use AI Mentor **Plan Mode** to create a numbered checklist (saved automatically in \`.yuvro-developer/plan/\`).
2. Run each task using the **Run** button on the plan checklist.
3. Review multi-file changes with the **Review** button and apply.
`,
    },
  },
];
