export type QuestionCategory = "project" | "dsa" | "database";

export interface QuestionTask {
  id: string | number;
  title: string;
  description?: string;
  input?: string;
  expected_output?: string;
  weight?: number;
  is_hidden?: boolean;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: QuestionCategory;
  tag: string;
  file: string;
  startupCommand?: string;
  testCommand?: string;
  tasks?: QuestionTask[];
  files: Record<string, string>;
}

export const VITARKA_PROJECT_TEMPLATES: ProjectTemplate[] = [
  // ==========================================
  // 1. PROJECTS & FULL-STACK
  // ==========================================
  {
    id: "flask",
    name: "Flask Web App",
    description: "Python microframework with REST API routes, HTML templates, and SQLite.",
    category: "project",
    tag: "flask",
    file: "app.py",
    startupCommand: "python app.py",
    testCommand: "pytest test_app.py",
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
      "test_app.py": `import pytest
from app import app

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_homepage(client):
    """Test that homepage renders successfully"""
    res = client.get("/")
    assert res.status_code == 200

def test_get_items(client):
    """Test retrieving list of items via REST API"""
    res = client.get("/api/items")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert isinstance(data["items"], list)
    assert len(data["items"]) >= 2

def test_add_item(client):
    """Test adding a new item via POST request"""
    res = client.post("/api/items", json={"title": "Write comprehensive unit tests"})
    assert res.status_code == 201
    data = res.get_json()
    assert data["success"] is True
    assert data["item"]["title"] == "Write comprehensive unit tests"
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
pytest==9.2.0
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
- **Tests**: \`test_app.py\` (Run with \`pytest test_app.py\`)
- **Templates**: \`templates/\` (Jinja2 HTML templates)
- **Dependencies**: \`requirements.txt\`

## Coding Standards & Best Practices
- Keep route functions lean and focused.
- Return structured JSON from API endpoints using \`jsonify({"success": True, ...})\` with appropriate HTTP status codes.
- Validate request inputs (\`request.get_json()\`, \`request.args\`) before processing.
- Write pytest test functions prefixed with \`test_\`.
`,
      "README.md": `# Flask Starter App

Created in Yuvro Vitarka IDE.
Click **Run** to execute the test suite via \`pytest\` in the backend sandbox.
Use AI Mentor in Plan or Agent mode to add new features!
`,
    },
  },

  {
    id: "django",
    name: "Django Web Framework",
    description: "Full-stack Python framework with ORM, views, and template rendering.",
    category: "project",
    tag: "django",
    file: "manage.py",
    startupCommand: "python manage.py runserver 0.0.0.0:8000",
    testCommand: "python manage.py test",
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
      "todos/tests.py": `from django.test import TestCase, Client

class TodoAppTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_home_page(self):
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)

    def test_health_api(self):
        res = self.client.get("/api/health/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json().get("status"), "ok")
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
- **App Module**: \`todos/\` (\`models.py\`, \`views.py\`, \`urls.py\`, \`tests.py\`, \`templates/\`)
- **CLI Commands**: \`python manage.py runserver\`, \`python manage.py test\`

## Coding Standards & Best Practices
- Follow Django's MTV (Model-Template-View) design pattern.
- Keep business logic in models or services, not inside views.
- Test endpoints with Django \`TestCase\` in \`todos/tests.py\`.
`,
      "README.md": `# Django App Starter
Run \`python manage.py test\` to execute tests.
`,
    },
  },

  {
    id: "fastapi",
    name: "FastAPI Service",
    description: "Modern async Python API with automatic docs and Pydantic validation.",
    category: "project",
    tag: "python",
    file: "main.py",
    startupCommand: "uvicorn main:app --reload --host 0.0.0.0 --port 8000",
    testCommand: "pytest test_main.py",
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
      "test_main.py": `from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["message"] == "Welcome to Yuvro FastAPI"

def test_get_items():
    response = client.get("/items")
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 2
    assert items[0]["name"] == "Mechanical Keyboard"
`,
      "requirements.txt": `fastapi==0.110.0
uvicorn[standard]==0.29.0
pydantic==2.6.4
pytest==9.2.0
httpx==0.27.0
`,
      ".yuvro-developer/skills/fastapi/SKILL.md": `---
name: fastapi-development
description: Guidelines, async best practices, and Pydantic validation for FastAPI in Yuvro Vitarka IDE.
---

# FastAPI Development Skill

## Project Architecture
- **Entrypoint**: \`main.py\`
- **Tests**: \`test_main.py\`
- **Interactive Documentation**: Available at \`/docs\`
`,
      "README.md": `# FastAPI Starter
Explore Swagger docs at \`/docs\` or click **Run** to run \`pytest test_main.py\`.
`,
    },
  },

  {
    id: "express",
    name: "Node.js & Express",
    description: "Minimalist Node.js web server and REST API.",
    category: "project",
    tag: "js",
    file: "index.js",
    startupCommand: "node index.js",
    testCommand: "npm test",
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

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });
}

module.exports = app;
`,
      "test.js": `const assert = require('assert');
const app = require('./index');

console.log("Running Express API tests...");
assert.ok(app, "Express app should export properly");
console.log("✓ App initialization test passed");
`,
      "package.json": `{
  "name": "express-app",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "node test.js"
  },
  "dependencies": {
    "express": "^4.19.2"
  }
}
`,
      "README.md": `# Node.js Express App
Run tests with \`npm test\` or start with \`node index.js\`.
`,
    },
  },

  {
    id: "react",
    name: "React Web App",
    description: "Component-based web frontend with state and Tailwind CSS.",
    category: "project",
    tag: "ui",
    file: "src/App.jsx",
    startupCommand: "npm run dev",
    testCommand: "npm test",
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
      "README.md": `# React UI App
Interactive UI app in Yuvro Vitarka IDE.
`,
    },
  },

  {
    id: "scratch",
    name: "Custom Vibe Coding (Scratch)",
    description: "Start blank or prompt the AI Mentor in Agent mode to scaffold any custom project from scratch.",
    category: "project",
    tag: "python",
    file: "main.py",
    startupCommand: "python main.py",
    testCommand: "pytest test_main.py",
    files: {
      "main.py": `# Yuvro Vitarka IDE · Custom Vibe Coded App
def add(a, b):
    return a + b

def main():
    print("Welcome to your custom Vibe-coded application in Yuvro Vitarka IDE!")

if __name__ == "__main__":
    main()
`,
      "test_main.py": `from main import add

def test_add():
    assert add(2, 3) == 5
    assert add(-1, 1) == 0
`,
      "README.md": `# Custom Vibe Coded App
Build anything from scratch!
`,
    },
  },

  // ==========================================
  // 2. DATA STRUCTURES & ALGORITHMS (DSA)
  // ==========================================
  {
    id: "dsa-two-sum",
    name: "Two Sum",
    description: "Given an array of integers nums and an integer target, return indices of the two numbers that add up to target.",
    category: "dsa",
    tag: "programming",
    file: "solution.py",
    tasks: [
      {
        id: 1,
        title: "Example 1 · Basic Match",
        input: "[2,7,11,15]\n9",
        expected_output: "[0, 1]",
        is_hidden: false,
        weight: 1,
      },
      {
        id: 2,
        title: "Example 2 · Unsorted Match",
        input: "[3,2,4]\n6",
        expected_output: "[1, 2]",
        is_hidden: false,
        weight: 1,
      },
      {
        id: 3,
        title: "Example 3 · Duplicate Elements",
        input: "[3,3]\n6",
        expected_output: "[0, 1]",
        is_hidden: false,
        weight: 1,
      },
      {
        id: 4,
        title: "Hidden Test · Large Input",
        input: "[1,5,8,12,19]\n20",
        expected_output: "[0, 4]",
        is_hidden: true,
        weight: 2,
      },
    ],
    files: {
      "solution.py": `import sys
import json

def two_sum(nums, target):
    """
    Find two indices such that nums[i] + nums[j] == target.
    Time Complexity: O(n)
    Space Complexity: O(n)
    """
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []

if __name__ == "__main__":
    lines = sys.stdin.read().strip().split("\\n")
    if len(lines) >= 2:
        nums = json.loads(lines[0])
        target = int(lines[1])
        print(json.dumps(two_sum(nums, target)))
`,
      "README.md": `# Two Sum

Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.

### Example 1:
\`\`\`
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
\`\`\`

### Example 2:
\`\`\`
Input: nums = [3,2,4], target = 6
Output: [1,2]
\`\`\`
`,
    },
  },

  {
    id: "dsa-valid-palindrome",
    name: "Valid Palindrome",
    description: "Check if a string is a palindrome after converting to lowercase and removing non-alphanumeric characters.",
    category: "dsa",
    tag: "programming",
    file: "solution.py",
    tasks: [
      {
        id: 1,
        title: "Example 1 · Sentence with punctuation",
        input: "A man, a plan, a canal: Panama",
        expected_output: "true",
        is_hidden: false,
        weight: 1,
      },
      {
        id: 2,
        title: "Example 2 · Not a palindrome",
        input: "race a car",
        expected_output: "false",
        is_hidden: false,
        weight: 1,
      },
      {
        id: 3,
        title: "Example 3 · Empty / space string",
        input: " ",
        expected_output: "true",
        is_hidden: false,
        weight: 1,
      },
      {
        id: 4,
        title: "Hidden Test · Mixed alphanumeric",
        input: "0P",
        expected_output: "false",
        is_hidden: true,
        weight: 2,
      },
    ],
    files: {
      "solution.py": `import sys

def is_palindrome(s: str) -> bool:
    """
    Two-pointer check for alphanumeric palindrome.
    Time Complexity: O(n)
    Space Complexity: O(1)
    """
    left, right = 0, len(s) - 1
    while left < right:
        while left < right and not s[left].isalnum():
            left += 1
        while left < right and not s[right].isalnum():
            right -= 1
        if s[left].lower() != s[right].lower():
            return False
        left += 1
        right -= 1
    return True

if __name__ == "__main__":
    line = sys.stdin.read().rstrip("\\r\\n")
    print("true" if is_palindrome(line) else "false")
`,
      "README.md": `# Valid Palindrome

A phrase is a **palindrome** if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.

### Example 1:
\`\`\`
Input: s = "A man, a plan, a canal: Panama"
Output: true
\`\`\`
`,
    },
  },

  {
    id: "dsa-reverse-linked-list",
    name: "Reverse Linked List",
    description: "Reverse a singly linked list and return the reversed list elements.",
    category: "dsa",
    tag: "programming",
    file: "solution.py",
    tasks: [
      {
        id: 1,
        title: "Example 1 · 5 elements",
        input: "[1,2,3,4,5]",
        expected_output: "[5, 4, 3, 2, 1]",
        is_hidden: false,
        weight: 1,
      },
      {
        id: 2,
        title: "Example 2 · 2 elements",
        input: "[1,2]",
        expected_output: "[2, 1]",
        is_hidden: false,
        weight: 1,
      },
      {
        id: 3,
        title: "Example 3 · Empty list",
        input: "[]",
        expected_output: "[]",
        is_hidden: false,
        weight: 1,
      },
    ],
    files: {
      "solution.py": `import sys
import json

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def reverse_list(head: ListNode) -> ListNode:
    prev = None
    curr = head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    return prev

if __name__ == "__main__":
    raw = sys.stdin.read().strip()
    arr = json.loads(raw) if raw else []
    if not arr:
        print("[]")
        sys.exit(0)

    # Build linked list
    head = ListNode(arr[0])
    curr = head
    for v in arr[1:]:
        curr.next = ListNode(v)
        curr = curr.next

    # Reverse
    rev_head = reverse_list(head)

    # Convert back to array
    out = []
    c = rev_head
    while c:
        out.append(c.val)
        c = c.next
    print(json.dumps(out))
`,
      "README.md": `# Reverse Linked List

Given the head of a singly linked list, reverse the list, and return the reversed list.
`,
    },
  },

  {
    id: "dsa-max-subarray",
    name: "Maximum Subarray (Kadane's)",
    description: "Find the contiguous subarray with the largest sum, and return its sum.",
    category: "dsa",
    tag: "programming",
    file: "solution.py",
    tasks: [
      {
        id: 1,
        title: "Example 1 · Mixed values",
        input: "[-2,1,-3,4,-1,2,1,-5,4]",
        expected_output: "6",
        is_hidden: false,
        weight: 1,
      },
      {
        id: 2,
        title: "Example 2 · Single element",
        input: "[1]",
        expected_output: "1",
        is_hidden: false,
        weight: 1,
      },
      {
        id: 3,
        title: "Example 3 · Positive numbers",
        input: "[5,4,-1,7,8]",
        expected_output: "23",
        is_hidden: false,
        weight: 1,
      },
    ],
    files: {
      "solution.py": `import sys
import json

def max_sub_array(nums):
    """
    Kadane's Algorithm
    Time Complexity: O(n)
    Space Complexity: O(1)
    """
    current_max = nums[0]
    global_max = nums[0]
    for x in nums[1:]:
        current_max = max(x, current_max + x)
        global_max = max(global_max, current_max)
    return global_max

if __name__ == "__main__":
    line = sys.stdin.read().strip()
    if line:
        nums = json.loads(line)
        print(max_sub_array(nums))
`,
      "README.md": `# Maximum Subarray

Given an integer array \`nums\`, find the subarray with the largest sum, and return its sum.

### Example 1:
\`\`\`
Input: nums = [-2,1,-3,4,-1,2,1,-5,4]
Output: 6
Explanation: The subarray [4,-1,2,1] has the largest sum 6.
\`\`\`
`,
    },
  },

  // ==========================================
  // 3. DATABASES & SQL
  // ==========================================
  {
    id: "db-employee-analytics",
    name: "Employee & Department Analytics",
    description: "Write SQL queries to analyze employee salaries, department averages, and highest earners.",
    category: "database",
    tag: "sql",
    file: "task1.sql",
    startupCommand: "sqlite3 lab.db < schema.sql",
    files: {
      "task1.sql": `-- Query: Find the highest earning employee in each department.
-- Output columns: department_name, name, salary
SELECT d.department_name, e.name, e.salary
FROM employees e
JOIN departments d ON e.department_id = d.id
WHERE e.salary = (
    SELECT MAX(e2.salary)
    FROM employees e2
    WHERE e2.department_id = e.department_id
)
ORDER BY e.salary DESC;
`,
      "schema.sql": `-- Schema and initial seed data
CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY,
    department_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    department_id INTEGER NOT NULL,
    salary INTEGER NOT NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

INSERT OR IGNORE INTO departments (id, department_name) VALUES
(1, 'Engineering'),
(2, 'Sales'),
(3, 'Marketing');

INSERT OR IGNORE INTO employees (id, name, department_id, salary) VALUES
(1, 'Alice Smith', 1, 120000),
(2, 'Bob Jones', 1, 95000),
(3, 'Charlie Brown', 1, 135000),
(4, 'Diana Prince', 2, 88000),
(5, 'Evan Wright', 2, 92000),
(6, 'Fiona Gallagher', 3, 78000);
`,
      "README.md": `# Employee & Department Analytics

### Problem
Write an SQL query to retrieve the highest earning employee in each department.

### Expected Output Schema
| department_name | name | salary |
| --- | --- | --- |
| Engineering | Charlie Brown | 135000 |
| Sales | Evan Wright | 92000 |
| Marketing | Fiona Gallagher | 78000 |

Click **Run** to execute the query against SQLite in the workspace.
`,
    },
  },

  {
    id: "db-ecommerce-orders",
    name: "E-Commerce Customer Orders",
    description: "Query customer lifetime spending, order counts, and filter top-tier buyers.",
    category: "database",
    tag: "sql",
    file: "task1.sql",
    startupCommand: "sqlite3 lab.db < schema.sql",
    files: {
      "task1.sql": `-- Query: Calculate the total amount spent by each customer across completed orders.
-- Output columns: customer_name, total_spent
SELECT c.name AS customer_name, SUM(o.total_amount) AS total_spent
FROM customers c
JOIN orders o ON c.id = o.customer_id
WHERE o.status = 'COMPLETED'
GROUP BY c.id, c.name
ORDER BY total_spent DESC;
`,
      "schema.sql": `CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    order_date TEXT NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

INSERT OR IGNORE INTO customers (id, name, email) VALUES
(1, 'John Doe', 'john@example.com'),
(2, 'Jane Smith', 'jane@example.com'),
(3, 'Alex Turner', 'alex@example.com');

INSERT OR IGNORE INTO orders (id, customer_id, order_date, total_amount, status) VALUES
(101, 1, '2025-01-15', 250.00, 'COMPLETED'),
(102, 1, '2025-02-10', 120.50, 'COMPLETED'),
(103, 2, '2025-02-14', 450.00, 'COMPLETED'),
(104, 3, '2025-02-20', 80.00, 'PENDING');
`,
      "README.md": `# E-Commerce Orders & Customers

Analyze total customer purchases using SQL grouping and aggregations.
`,
    },
  },

  {
    id: "db-library-management",
    name: "Library Book Management",
    description: "Query overdue book borrowings, member borrowing stats, and book inventory.",
    category: "database",
    tag: "sql",
    file: "task1.sql",
    startupCommand: "sqlite3 lab.db < schema.sql",
    files: {
      "task1.sql": `-- Query: Find all members with currently unreturned / overdue books.
-- Output columns: member_name, book_title, borrowed_date
SELECT m.name AS member_name, b.title AS book_title, l.borrowed_date
FROM loans l
JOIN members m ON l.member_id = m.id
JOIN books b ON l.book_id = b.id
WHERE l.returned = 0
ORDER BY l.borrowed_date ASC;
`,
      "schema.sql": `CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY,
    book_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    borrowed_date TEXT NOT NULL,
    returned INTEGER DEFAULT 0,
    FOREIGN KEY (book_id) REFERENCES books(id),
    FOREIGN KEY (member_id) REFERENCES members(id)
);

INSERT OR IGNORE INTO books (id, title, author) VALUES
(1, 'Designing Data-Intensive Applications', 'Martin Kleppmann'),
(2, 'Clean Code', 'Robert C. Martin'),
(3, 'The Pragmatic Programmer', 'David Thomas');

INSERT OR IGNORE INTO members (id, name) VALUES
(1, 'Devendra'),
(2, 'Priya'),
(3, 'Rahul');

INSERT OR IGNORE INTO loans (id, book_id, member_id, borrowed_date, returned) VALUES
(10, 1, 1, '2025-01-01', 0),
(11, 2, 2, '2025-01-10', 1),
(12, 3, 3, '2025-02-01', 0);
`,
      "README.md": `# Library Book Borrowing
Query overdue loans using multi-table SQL joins.
`,
    },
  },
];
