import { createFileRoute, Link, Outlet, useMatch, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { TopNav } from "@/components/TopNav";
import { DiffBadge, StatusBadge } from "@/components/Badges";
import { tickets, labs, saveTicketState } from "@/lib/dummy";
import { getTargetUI } from "@/lib/targetUIs";
import {
  Play, Save, Send, Lightbulb, AlertTriangle, ChevronRight, ChevronDown, ChevronLeft,
  FileCode2, Folder, FolderOpen, Search, GitBranch, Bug, Package, Settings,
  CircleDot, Terminal as TerminalIcon, CheckCircle2, XCircle, Clock, Zap,
  MessageSquare, Lock, Unlock, RotateCcw, Copy, Share2, Flag, HelpCircle,
  Sparkles, Gauge, Wand2, Globe, Check, ArrowLeft, PanelLeftClose, PanelLeftOpen, BookOpen,
  FilePlus, FolderPlus, Pencil, Trash2,
} from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { html as cmHtml } from "@codemirror/lang-html";
import { markdown as cmMarkdown } from "@codemirror/lang-markdown";
import { sql } from "@codemirror/lang-sql";
import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";
import { json as jsonLang } from "@codemirror/lang-json";
import { cpp } from "@codemirror/lang-cpp";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export const Route = createFileRoute("/lab/$slug/ticket/$ticketId")({ component: TicketEditorRoute });

export type StudentPreviewOverride = {
  title?: string;
  description?: string;
  difficulty?: "Beginner" | "Intermediate" | "Advanced";
  xp?: number;
  estMin?: number;
  tag?: string;
  starterCode?: string;
  hints?: string;
  solution?: string;
};

function TicketEditorRoute() {
  const { slug, ticketId } = useParams({ from: "/lab/$slug/ticket/$ticketId" });
  const [previewOverride, setPreviewOverride] = useState<StudentPreviewOverride | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("preview") !== "1") return;
    try {
      const raw = sessionStorage.getItem("__adminPreviewTicket");
      if (raw) setPreviewOverride(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [ticketId]);
  return <StudentTicketView slug={slug} ticketId={ticketId} previewOverride={previewOverride} />;
}

const STARTER_MAIN = `public class Main {
    public static void main(String[] args) {
        // TODO: declare primitive types and print them
        int integerValue = 42;
        double pi = 3.14;
        boolean isJavaFun = true;
        String greeting = "Hello Java";

        System.out.println("Integer: " + integerValue);
        System.out.println("Double: " + pi);
        System.out.println("Boolean: " + isJavaFun);
        System.out.println("String: " + greeting);

        // TODO: type casting
        double castedDouble = integerValue; // implicit
        int castedInt = (int) pi;           // explicit

        // TODO: string ops
        System.out.println("Length: " + greeting.length());
        System.out.println("Char[0]: " + greeting.charAt(0));
    }
}`;

const STARTER_TEST = `import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class MainTest {
    @Test void variablesDeclared() { assertTrue(true); }
    @Test void implicitCast()      { assertEquals(42.0, (double) 42); }
    @Test void explicitCast()      { assertEquals(3, (int) 3.99); }
    @Test void stringLength()      { assertEquals(10, "Hello Java".length()); }
    @Test void outputFormat()      { assertEquals("Result: 42", "Result: " + 42); }
}`;

const STARTER_README = `# JAVA-101 · Variables & Types

Demonstrate the 8 Java primitive types, perform implicit and explicit
casts, and use String methods (length, charAt, substring).

Run with: \`javac Main.java && java Main\``;

const FILE_LIST = ["Main.java", "MainTest.java", "README.md"] as const;
type FileName = string;

/* ---------- Django Todo App (Python) starters ---------- */
const DJANGO_FILES = [
  "todoproject/settings.py",
  "todoproject/urls.py",
  "todos/models.py",
  "todos/views.py",
  "todos/urls.py",
  "todos/forms.py",
  "todos/admin.py",
  "todos/templates/todos/base.html",
  "todos/templates/todos/todo_list.html",
  "manage.py",
  "requirements.txt",
  "README.md",
] as const;

const DJANGO_STARTERS: Record<string, string> = {
  "manage.py": `#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "todoproject.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
`,
  "requirements.txt": `Django>=5.0,<6.0
`,
  "todoproject/settings.py": `from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = "dev-secret-change-me"
DEBUG = True
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "todos",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
]

ROOT_URLCONF = "todoproject.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
`,
  "todoproject/urls.py": `from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("todos.urls")),
]
`,
  "todos/models.py": `from django.db import models


class Todo(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["completed", "-created_at"]

    def __str__(self) -> str:
        return self.title
`,
  "todos/views.py": `from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from .forms import TodoForm
from .models import Todo


def todo_list(request):
    if request.method == "POST":
        form = TodoForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect("todo_list")
    else:
        form = TodoForm()

    todos = Todo.objects.all()
    return render(
        request,
        "todos/todo_list.html",
        {"todos": todos, "form": form},
    )


@require_POST
def toggle_todo(request, pk: int):
    todo = get_object_or_404(Todo, pk=pk)
    todo.completed = not todo.completed
    todo.save(update_fields=["completed"])
    return redirect("todo_list")


@require_POST
def delete_todo(request, pk: int):
    todo = get_object_or_404(Todo, pk=pk)
    todo.delete()
    return redirect("todo_list")
`,
  "todos/urls.py": `from django.urls import path

from . import views

urlpatterns = [
    path("", views.todo_list, name="todo_list"),
    path("<int:pk>/toggle/", views.toggle_todo, name="toggle_todo"),
    path("<int:pk>/delete/", views.delete_todo, name="delete_todo"),
]
`,
  "todos/forms.py": `from django import forms

from .models import Todo


class TodoForm(forms.ModelForm):
    class Meta:
        model = Todo
        fields = ["title", "description"]
        widgets = {
            "title": forms.TextInput(attrs={"placeholder": "What needs doing?"}),
            "description": forms.Textarea(attrs={"rows": 2}),
        }
`,
  "todos/admin.py": `from django.contrib import admin

from .models import Todo


@admin.register(Todo)
class TodoAdmin(admin.ModelAdmin):
    list_display = ("title", "completed", "created_at")
    list_filter = ("completed",)
    search_fields = ("title", "description")
`,
  "todos/templates/todos/base.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>{% block title %}Todos{% endblock %}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; padding: 0 1rem; }
    h1 { margin-bottom: .25rem; }
    ul { list-style: none; padding: 0; }
    li { display: flex; gap: .5rem; align-items: center; padding: .5rem 0; border-bottom: 1px solid #eee; }
    .done { text-decoration: line-through; color: #888; }
    form.inline { display: inline; }
    input[type=text], textarea { width: 100%; padding: .5rem; }
    button { cursor: pointer; }
  </style>
</head>
<body>
  {% block content %}{% endblock %}
</body>
</html>
`,
  "todos/templates/todos/todo_list.html": `{% extends "todos/base.html" %}

{% block title %}My Todos{% endblock %}

{% block content %}
  <h1>Todos</h1>
  <p>{{ todos|length }} item{{ todos|length|pluralize }}</p>

  <form method="post">
    {% csrf_token %}
    {{ form.title }}
    {{ form.description }}
    <button type="submit">Add</button>
  </form>

  <ul>
    {% for todo in todos %}
      <li>
        <form class="inline" method="post" action="{% url 'toggle_todo' todo.pk %}">
          {% csrf_token %}
          <button type="submit">{% if todo.completed %}↩{% else %}✓{% endif %}</button>
        </form>
        <span class="{% if todo.completed %}done{% endif %}">{{ todo.title }}</span>
        <form class="inline" method="post" action="{% url 'delete_todo' todo.pk %}" style="margin-left:auto">
          {% csrf_token %}
          <button type="submit">🗑</button>
        </form>
      </li>
    {% empty %}
      <li>No todos yet — add one above.</li>
    {% endfor %}
  </ul>
{% endblock %}
`,
  "README.md": `# Django Todo App

A small Django project that stores todos in SQLite and renders them with HTML templates.

## Run

\`\`\`bash
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
\`\`\`

Open http://127.0.0.1:8000/ to use the app.
`,
};

/* ---------- Per-lab starter kits ---------- */

type KitName = "java" | "django" | "python" | "sql" | "mongo" | "ui" | "react";
interface Kit {
  name: KitName;
  files: Record<string, string>;
  fileList: string[];
  primary: string;
  rootLabel: string;
  runtime: string; // for status bar
}

const PY_KITS: Record<string, Kit> = {
  "Py Fundamentals": {
    name: "python", rootLabel: "py-fundamentals", primary: "main.py", runtime: "Python 3.12",
    fileList: ["main.py", "test_main.py", "README.md"],
    files: {
      "main.py": `"""Variables, types and f-strings."""


def describe(name: str, age: int, height: float) -> str:
    """Return a one-line summary using an f-string."""
    return f"{name} is {age}y, {height:.2f}m"


def fizzbuzz(n: int) -> list[str]:
    out: list[str] = []
    for i in range(1, n + 1):
        if i % 15 == 0:
            out.append("FizzBuzz")
        elif i % 3 == 0:
            out.append("Fizz")
        elif i % 5 == 0:
            out.append("Buzz")
        else:
            out.append(str(i))
    return out


if __name__ == "__main__":
    print(describe("Ada", 36, 1.7))
    print(fizzbuzz(15))
`,
      "test_main.py": `from main import describe, fizzbuzz


def test_describe():
    assert describe("Ada", 36, 1.7) == "Ada is 36y, 1.70m"


def test_fizzbuzz_small():
    assert fizzbuzz(5) == ["1", "2", "Fizz", "4", "Buzz"]


def test_fizzbuzz_fifteen():
    assert fizzbuzz(15)[-1] == "FizzBuzz"
`,
      "README.md": `# Python Fundamentals

Implement \`describe\` and \`fizzbuzz\` in \`main.py\` and make the tests pass.

\`\`\`bash
python -m pytest -q
\`\`\`
`,
    },
  },
  "Py Data": {
    name: "python", rootLabel: "py-data", primary: "app.py", runtime: "Python 3.12",
    fileList: ["app.py", "data/sales.csv", "requirements.txt", "README.md"],
    files: {
      "app.py": `"""Read sales.csv, group by category and print totals."""
import csv
from collections import defaultdict
from pathlib import Path


def totals_by_category(path: str) -> dict[str, float]:
    totals: dict[str, float] = defaultdict(float)
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            totals[row["category"]] += float(row["amount"])
    return dict(totals)


if __name__ == "__main__":
    here = Path(__file__).parent
    for cat, total in totals_by_category(here / "data" / "sales.csv").items():
        print(f"{cat:<12} {total:>8.2f}")
`,
      "data/sales.csv": `id,category,amount
1,Books,12.50
2,Music,9.99
3,Books,4.20
4,Games,29.00
5,Music,14.50
6,Games,19.99
`,
      "requirements.txt": `# stdlib only
`,
      "README.md": `# CSV aggregation

Aggregate \`data/sales.csv\` by category. Run with \`python app.py\`.
`,
    },
  },
};

const SQL_KIT_DEFAULT: Kit = {
  name: "sql", rootLabel: "sql-lab", primary: "query.sql", runtime: "PostgreSQL 16",
  fileList: ["query.sql", "schema.sql", "seed.sql", "README.md"],
  files: {
    "query.sql": `-- Write a query that returns:
--   country, customers, total_revenue
-- for customers who signed up in 2024, ordered by revenue desc.

SELECT
  c.country,
  COUNT(*)                       AS customers,
  COALESCE(SUM(o.amount), 0)::numeric(10,2) AS total_revenue
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE c.signed_up_at >= DATE '2024-01-01'
GROUP BY c.country
ORDER BY total_revenue DESC;
`,
    "schema.sql": `CREATE TABLE customers (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  country       TEXT NOT NULL,
  signed_up_at  DATE NOT NULL
);

CREATE TABLE orders (
  id           SERIAL PRIMARY KEY,
  customer_id  INT REFERENCES customers(id),
  amount       NUMERIC(10,2) NOT NULL,
  created_at   DATE NOT NULL
);

CREATE INDEX orders_customer_idx ON orders(customer_id);
`,
    "seed.sql": `INSERT INTO customers (name, country, signed_up_at) VALUES
  ('Ada Lovelace',   'UK', '2024-02-11'),
  ('Linus Torvalds', 'FI', '2024-05-04'),
  ('Grace Hopper',   'US', '2023-09-30'),
  ('Hedy Lamarr',    'AT', '2024-07-12'),
  ('Alan Turing',    'UK', '2024-11-01');

INSERT INTO orders (customer_id, amount, created_at) VALUES
  (1, 120.00, '2024-03-01'),
  (1,  45.50, '2024-04-12'),
  (2, 300.00, '2024-06-20'),
  (4,  80.25, '2024-08-09'),
  (5,  19.99, '2024-11-15');
`,
    "README.md": `# SQL Query Lab

Edit \`query.sql\` and press **Run** to execute against the seeded schema.
Results appear in the bottom **Results** panel.
`,
  },
};

const MONGO_KIT_DEFAULT: Kit = {
  name: "mongo", rootLabel: "mongo-lab", primary: "query.js", runtime: "MongoDB 7 · mongosh",
  fileList: ["query.js", "seed.js", "README.md"],
  files: {
    "query.js": `// Mongo shell — write a query and press Run.
// The bottom "Results" panel shows the returned documents.

// 1) All active users from the UK, newest first
db.users.find(
  { country: "UK", active: true },
  { _id: 0, name: 1, email: 1, country: 1 }
).sort({ createdAt: -1 });

// 2) Aggregate revenue per category (uncomment to try)
// db.orders.aggregate([
//   { $match: { status: "paid" } },
//   { $group: { _id: "$category", total: { $sum: "$amount" }, n: { $sum: 1 } } },
//   { $sort: { total: -1 } }
// ]);
`,
    "seed.js": `db.users.insertMany([
  { name: "Ada",   email: "ada@example.com",   country: "UK", active: true,  createdAt: new Date("2024-02-11") },
  { name: "Linus", email: "linus@example.com", country: "FI", active: true,  createdAt: new Date("2024-05-04") },
  { name: "Grace", email: "grace@example.com", country: "US", active: false, createdAt: new Date("2023-09-30") },
  { name: "Alan",  email: "alan@example.com",  country: "UK", active: true,  createdAt: new Date("2024-11-01") }
]);

db.orders.insertMany([
  { userId: 1, category: "Books", amount: 12.5,  status: "paid" },
  { userId: 2, category: "Music", amount: 9.99,  status: "paid" },
  { userId: 1, category: "Books", amount: 4.2,   status: "refunded" },
  { userId: 4, category: "Games", amount: 29.0,  status: "paid" }
]);
`,
    "README.md": `# MongoDB Lab

Mongo shell-style queries. Edit \`query.js\` and press **Run** to see results.
`,
  },
};

const UI_KIT_DEFAULT: Kit = {
  name: "ui", rootLabel: "ui-lab", primary: "index.html", runtime: "Static · HTML/CSS/JS",
  fileList: ["index.html", "styles.css", "app.js", "README.md"],
  files: {
    "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>UI Lab</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="site-header">
    <a class="logo" href="#">◆ Acme</a>
    <nav>
      <a href="#">Product</a>
      <a href="#">Pricing</a>
      <a href="#">Docs</a>
    </nav>
    <button id="cta" class="cta">Get started</button>
  </header>

  <main>
    <section class="hero">
      <h1>Build pixel-perfect UI</h1>
      <p>Compose components with Flexbox, Grid and modern CSS.</p>
      <p>Clicks: <output id="count">0</output></p>
    </section>
  </main>

  <script src="app.js"></script>
</body>
</html>
`,
    "styles.css": `:root { --brand: #4f46e5; --ink: #111827; --muted: #6b7280; }
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; color: var(--ink); }

.site-header {
  display: flex; align-items: center; gap: 1rem;
  padding: 1rem 1.25rem; border-bottom: 1px solid #e5e7eb;
}
.site-header nav { display: flex; gap: 1rem; margin-left: 1rem; }
.site-header nav a { color: var(--muted); text-decoration: none; }
.site-header nav a:hover { color: var(--ink); }
.logo { font-weight: 700; color: var(--brand); text-decoration: none; }
.cta {
  margin-left: auto; background: var(--brand); color: #fff;
  border: 0; padding: .55rem 1rem; border-radius: .5rem; cursor: pointer;
}

.hero { max-width: 720px; margin: 4rem auto; padding: 0 1.25rem; text-align: center; }
.hero h1 { font-size: 2.25rem; margin-bottom: .5rem; }
.hero p  { color: var(--muted); margin: .25rem 0; }
`,
    "app.js": `const cta = document.getElementById("cta");
const count = document.getElementById("count");
let n = 0;
cta.addEventListener("click", () => {
  n += 1;
  count.textContent = String(n);
});
`,
    "README.md": `# UI Lab

Edit \`index.html\`, \`styles.css\` and \`app.js\`. The **Preview** panel renders
your code live (it re-runs whenever you save).
`,
  },
};

const REACT_KITS: Record<string, Kit> = {
  "REACT-101": {
    name: "react", rootLabel: "todo-app", primary: "TaskItem.jsx", runtime: "React 18 · Babel",
    fileList: ["App.jsx", "TaskItem.jsx", "App.css", "README.md"],
    files: {
      "App.jsx": `import TaskItem from "./TaskItem";\nimport "./App.css";\n\nexport default function App() {\n  const sampleTask = { id: 1, text: "Learn React basics", completed: false };\n  return (\n    <div className="app-container">\n      <h1>To-Do List</h1>\n      <ul className="task-list">\n        <TaskItem task={sampleTask} />\n      </ul>\n    </div>\n  );\n}`,
      "TaskItem.jsx": `// Write your TaskItem component here\n// It should accept a 'task' prop (an object with 'text' and 'completed').\n\nexport default function TaskItem({ task }) {\n  return (\n    <li className="task-item">\n      {/* TODO: Add a checkbox input (checked if task is completed) */}\n      {/* TODO: Add a span containing the task text */}\n      {/* TODO: Add a delete button (🗑) */}\n    </li>\n  );\n}`,
      "App.css": `.app-container { max-width: 400px; margin: 2rem auto; font-family: sans-serif; }\n.task-list { list-style: none; padding: 0; }\n.task-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border-bottom: 1px solid #eee; }\n.task-text { flex: 1; }\n.del-btn { background: none; border: none; cursor: pointer; color: #dc2626; }`,
      "README.md": `# REACT-101 · Task Item Component\n\nCreate a reusable \`TaskItem\` component for our To-Do list.\n\n## Requirements:\n- It must accept a \`task\` object via props.\n- Render an \`<input type="checkbox">\` (checked if \`task.completed\`).\n- Render a \`<span className="task-text">\` with the \`task.text\`.\n- Render a \`<button className="del-btn">\` for deleting the task.\n`
    }
  },
  "REACT-102": {
    name: "react", rootLabel: "todo-app", primary: "App.jsx", runtime: "React 18 · Babel",
    fileList: ["App.jsx", "TaskItem.jsx", "App.css", "README.md"],
    files: {
      "App.jsx": `import { useState } from "react";\nimport TaskItem from "./TaskItem";\nimport "./App.css";\n\nexport default function App() {\n  // TODO: Initialize 'tasks' state as an empty array []\n  // TODO: Initialize 'newTaskText' state as an empty string ""\n\n  const addTask = (e) => {\n    e.preventDefault();\n    // TODO: Add the new task to the 'tasks' array and clear the input\n  };\n\n  return (\n    <div className="app-container">\n      <h1>To-Do List</h1>\n      <form onSubmit={addTask} className="add-form">\n        {/* TODO: Create a controlled input field bound to 'newTaskText' */}\n        <button type="submit">Add Task</button>\n      </form>\n      <ul className="task-list">\n        {/* TODO: map over 'tasks' and render a TaskItem for each */}\n      </ul>\n    </div>\n  );\n}`,
      "TaskItem.jsx": `export default function TaskItem({ task }) {\n  return (\n    <li className="task-item">\n      <input type="checkbox" checked={task.completed} readOnly />\n      <span className="task-text">{task.text}</span>\n      <button className="del-btn">🗑</button>\n    </li>\n  );\n}`,
      "App.css": `.app-container { max-width: 400px; margin: 2rem auto; font-family: sans-serif; }\n.add-form { display: flex; gap: 0.5rem; margin-bottom: 1rem; }\n.add-form input { flex: 1; padding: 0.5rem; }\n.task-list { list-style: none; padding: 0; }\n.task-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border-bottom: 1px solid #eee; }\n.task-text { flex: 1; }\n.del-btn { background: none; border: none; cursor: pointer; color: #dc2626; }`,
      "README.md": `# REACT-102 · Task List State\n\nManage the list of tasks using React state.\n\n## Requirements:\n- Initialize a \`tasks\` state variable (array).\n- Initialize a \`newTaskText\` state variable for the input.\n- Create a form with a controlled text input.\n- Map over the \`tasks\` array and render a \`TaskItem\` for each.\n`
    }
  },
  "REACT-103": {
    name: "react", rootLabel: "todo-app", primary: "App.jsx", runtime: "React 18 · Babel",
    fileList: ["App.jsx", "TaskItem.jsx", "App.css", "README.md"],
    files: {
      "App.jsx": `import { useState } from "react";\nimport TaskItem from "./TaskItem";\nimport "./App.css";\n\nexport default function App() {\n  const [tasks, setTasks] = useState([\n    { id: 1, text: "Learn React Hooks", completed: false },\n    { id: 2, text: "Build a To-Do App", completed: false }\n  ]);\n  const [newTaskText, setNewTaskText] = useState("");\n\n  const addTask = (e) => {\n    e.preventDefault();\n    if (!newTaskText.trim()) return;\n    setTasks([...tasks, { id: Date.now(), text: newTaskText.trim(), completed: false }]);\n    setNewTaskText("");\n  };\n\n  // TODO: Create toggleTask(id) function to flip completed status\n  // TODO: Create deleteTask(id) function to remove task from array\n\n  return (\n    <div className="app-container">\n      <h1>To-Do List</h1>\n      <form onSubmit={addTask} className="add-form">\n        <input value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} placeholder="Add a task" />\n        <button type="submit">Add Task</button>\n      </form>\n      <ul className="task-list">\n        {tasks.map(task => (\n          <TaskItem key={task.id} task={task} />\n          // TODO: Pass toggleTask and deleteTask as props to TaskItem\n        ))}\n      </ul>\n    </div>\n  );\n}`,
      "TaskItem.jsx": `// TODO: Accept onToggle and onDelete props and wire them up to the elements\n\nexport default function TaskItem({ task }) {\n  return (\n    <li className={\`task-item \${task.completed ? 'completed' : ''}\`}>\n      <input type="checkbox" checked={task.completed} />\n      <span className="task-text">{task.text}</span>\n      <button className="del-btn">🗑</button>\n    </li>\n  );\n}`,
      "App.css": `.app-container { max-width: 400px; margin: 2rem auto; font-family: sans-serif; }\n.add-form { display: flex; gap: 0.5rem; margin-bottom: 1rem; }\n.add-form input { flex: 1; padding: 0.5rem; }\n.task-list { list-style: none; padding: 0; }\n.task-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border-bottom: 1px solid #eee; }\n.task-item.completed .task-text { text-decoration: line-through; color: #888; }\n.task-text { flex: 1; }\n.del-btn { background: none; border: none; cursor: pointer; color: #dc2626; }`,
      "README.md": `# REACT-103 · Task Actions\n\nImplement the ability to toggle and delete tasks.\n\n## Requirements:\n- Write \`toggleTask(id)\` and \`deleteTask(id)\` functions in App.\n- Pass these functions down to \`TaskItem\` as props (\`onToggle\` and \`onDelete\`).\n- Update \`TaskItem.jsx\` to fire these functions on \`onChange\` (checkbox) and \`onClick\` (delete button).\n`
    }
  },
  "REACT-104": {
    name: "react", rootLabel: "todo-app", primary: "App.jsx", runtime: "React 18 · Babel",
    fileList: ["App.jsx", "TaskItem.jsx", "App.css", "README.md"],
    files: {
      "App.jsx": `import { useState, useEffect } from "react";\nimport TaskItem from "./TaskItem";\nimport "./App.css";\n\nexport default function App() {\n  // TODO: Initialize 'tasks' by loading from localStorage, or default to an empty array\n  const [tasks, setTasks] = useState([]);\n  const [newTaskText, setNewTaskText] = useState("");\n\n  // TODO: Add a useEffect to save 'tasks' to localStorage whenever the array changes\n\n  const addTask = (e) => {\n    e.preventDefault();\n    if (!newTaskText.trim()) return;\n    setTasks([...tasks, { id: Date.now(), text: newTaskText.trim(), completed: false }]);\n    setNewTaskText("");\n  };\n\n  const toggleTask = (id) => setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));\n  const deleteTask = (id) => setTasks(tasks.filter(t => t.id !== id));\n\n  return (\n    <div className="app-container">\n      <h1>To-Do List</h1>\n      <form onSubmit={addTask} className="add-form">\n        <input value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} placeholder="Add a task" />\n        <button type="submit">Add Task</button>\n      </form>\n      <ul className="task-list">\n        {tasks.map(task => (\n          <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />\n        ))}\n      </ul>\n    </div>\n  );\n}`,
      "TaskItem.jsx": `export default function TaskItem({ task, onToggle, onDelete }) {\n  return (\n    <li className={\`task-item \${task.completed ? 'completed' : ''}\`}>\n      <input type="checkbox" checked={task.completed} onChange={() => onToggle(task.id)} />\n      <span className="task-text">{task.text}</span>\n      <button className="del-btn" onClick={() => onDelete(task.id)}>🗑</button>\n    </li>\n  );\n}`,
      "App.css": `.app-container { max-width: 400px; margin: 2rem auto; font-family: sans-serif; }\n.add-form { display: flex; gap: 0.5rem; margin-bottom: 1rem; }\n.add-form input { flex: 1; padding: 0.5rem; }\n.task-list { list-style: none; padding: 0; }\n.task-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border-bottom: 1px solid #eee; }\n.task-item.completed .task-text { text-decoration: line-through; color: #888; }\n.task-text { flex: 1; }\n.del-btn { background: none; border: none; cursor: pointer; color: #dc2626; }`,
      "README.md": `# REACT-104 · Persisting Tasks\n\nUse React Effects to save and load data.\n\n## Requirements:\n- Initialize the \`tasks\` state by reading from \`localStorage.getItem('todo_tasks')\`. Parse it as JSON, or use \`[]\` if null.\n- Write a \`useEffect\` hook that runs whenever \`tasks\` changes, and saves the array to \`localStorage.setItem('todo_tasks')\`.\n`
    }
  },
  "REACT-105": {
    name: "react", rootLabel: "todo-app", primary: "App.jsx", runtime: "React 18 · Babel",
    fileList: ["App.jsx", "Dashboard.jsx", "TaskItem.jsx", "App.css", "README.md"],
    files: {
      "App.jsx": `import { useState } from "react";\nimport Dashboard from "./Dashboard";\nimport TaskItem from "./TaskItem";\nimport "./App.css";\n\nexport default function App() {\n  const [tasks, setTasks] = useState([\n    { id: 1, text: "Learn React", completed: true },\n    { id: 2, text: "Build Router", completed: false }\n  ]);\n  // TODO: Add 'currentView' state (\"list\" or \"dashboard\")\n\n  return (\n    <div className="app-container">\n      <nav className="nav-bar">\n        {/* TODO: Add buttons to switch between \"list\" and \"dashboard\" views */}\n      </nav>\n      \n      {/* TODO: Conditionally render the Dashboard component or the Task List */}\n      <ul className="task-list">\n        {tasks.map(task => <TaskItem key={task.id} task={task} onToggle={()=>{}} onDelete={()=>{}} />)}\n      </ul>\n    </div>\n  );\n}`,
      "Dashboard.jsx": `// TODO: Create a Dashboard component that takes 'tasks' as a prop and displays Total Tasks and Completed Tasks.\nexport default function Dashboard({ tasks }) {\n  return (\n    <div className="dashboard">\n      <h2>Dashboard</h2>\n      {/* Add stats here */}\n    </div>\n  );\n}`,
      "TaskItem.jsx": `export default function TaskItem({ task, onToggle, onDelete }) {\n  return (\n    <li className={\`task-item \${task.completed ? 'completed' : ''}\`}>\n      <input type="checkbox" checked={task.completed} onChange={() => onToggle(task.id)} />\n      <span className="task-text">{task.text}</span>\n      <button className="del-btn" onClick={() => onDelete(task.id)}>🗑</button>\n    </li>\n  );\n}`,
      "App.css": `.app-container { max-width: 400px; margin: 2rem auto; font-family: sans-serif; }\n.nav-bar { display: flex; gap: 1rem; margin-bottom: 1rem; border-bottom: 2px solid #eee; padding-bottom: 0.5rem; }\n.nav-bar button { background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0.5rem; }\n.task-list { list-style: none; padding: 0; }\n.task-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border-bottom: 1px solid #eee; }\n.task-text { flex: 1; }\n.dashboard { padding: 1rem; background: #f9fafb; border-radius: 8px; }`,
      "README.md": `# REACT-105 · Dashboard Routing\n\nAdd conditional rendering to switch views.\n\n## Requirements:\n- Create a \`currentView\` state in \`App.jsx\`.\n- Create a \`Dashboard.jsx\` component that displays the total number of tasks and completed tasks.\n- In \`App.jsx\`, add navigation buttons to switch views.\n- Conditionally render either the \`<Dashboard>\` or the task list \`<ul>\` based on \`currentView\`.\n`
    }
  },
  "REACT-106": {
    name: "react", rootLabel: "todo-app", primary: "App.jsx", runtime: "React 18 · Babel",
    fileList: ["App.jsx", "ThemeContext.jsx", "App.css", "README.md"],
    files: {
      "App.jsx": `import { useContext } from "react";\nimport { ThemeProvider, ThemeContext } from "./ThemeContext";\nimport "./App.css";\n\nfunction MainApp() {\n  // TODO: Consume ThemeContext here to get 'theme' and 'toggleTheme'\n\n  return (\n    // TODO: Apply \`theme-\${theme}\` class to this container\n    <div className="app-container">\n      <div className="header">\n        <h1>To-Do List</h1>\n        {/* TODO: Add a button that calls toggleTheme */}\n      </div>\n      <p>Tasks would go here...</p>\n    </div>\n  );\n}\n\nexport default function App() {\n  return (\n    // TODO: Wrap MainApp in ThemeProvider\n    <MainApp />\n  );\n}`,
      "ThemeContext.jsx": `import React, { createContext, useState } from "react";\n\n// TODO: Create and export ThemeContext\n\nexport function ThemeProvider({ children }) {\n  // TODO: Manage 'theme' state (\"light\" or \"dark\")\n  // TODO: Return ThemeContext.Provider wrapping children\n  return <>{children}</>;\n}`,
      "App.css": `.app-container { min-height: 100vh; padding: 2rem; font-family: sans-serif; transition: all 0.3s; }\n.header { display: flex; justify-content: space-between; align-items: center; }\n.theme-light { background: #ffffff; color: #111827; }\n.theme-dark { background: #111827; color: #f9fafb; }\n.theme-toggle { padding: 0.5rem 1rem; border-radius: 4px; border: 1px solid #888; background: transparent; color: inherit; cursor: pointer; }`,
      "README.md": `# REACT-106 · Theme Context\n\nUse React Context to manage a global Dark Mode theme.\n\n## Requirements:\n- Implement \`ThemeContext.jsx\` with a \`ThemeProvider\` that manages a \`theme\` state ("light" or "dark").\n- Wrap your app in \`ThemeProvider\`.\n- Consume the context in \`MainApp\` to apply a CSS class (\`theme-light\` or \`theme-dark\`).\n- Add a button to toggle the theme.\n`
    }
  },
  "REACT-201": {
    name: "react", rootLabel: "kanban-board", primary: "App.jsx", runtime: "React 18 · Babel",
    fileList: ["App.jsx", "App.css", "README.md"],
    files: {
      "App.jsx": `import { useState } from "react";\nimport "./App.css";\n\nexport default function App() {\n  const [columns, setColumns] = useState([\n    { id: "todo", title: "To Do", tasks: [{ id: 1, text: "Design Schema" }, { id: 2, text: "Create API" }] },\n    { id: "doing", title: "In Progress", tasks: [{ id: 3, text: "Setup React" }] },\n    { id: "done", title: "Done", tasks: [] }\n  ]);\n\n  return (\n    <div className="board-container">\n      <h1>Kanban Board</h1>\n      <div className="board">\n        {/* TODO: Map over columns array to render a .column div for each */}\n        {/* TODO: Inside each column, map over its tasks array to render a .task div */}\n      </div>\n    </div>\n  );\n}`,
      "App.css": `.board-container { padding: 3rem 2rem; font-family: 'Inter', sans-serif; min-height: 100vh; background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%); }\n.board-container h1 { font-size: 2.5rem; color: #2563eb; margin-bottom: 2rem; text-align: center; font-weight: 800; letter-spacing: -0.025em; margin-top: 0; }\n.board { display: flex; gap: 1.5rem; align-items: flex-start; max-width: 1200px; margin: 0 auto; }\n.column { flex: 1; background: rgba(239, 246, 255, 0.8); backdrop-filter: blur(10px); border: 2px solid #bfdbfe; border-radius: 12px; padding: 1.25rem; min-height: 300px; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.1); }\n.column h3 { margin-top: 0; margin-bottom: 1rem; font-size: 1.1rem; color: #1d4ed8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #bfdbfe; padding-bottom: 0.5rem; }\n.task { background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 0.75rem; border-left: 4px solid #3b82f6; color: #4b5563; font-weight: 600; }`,
      "README.md": `# REACT-201 · Board & Columns Layout\n\nWelcome to Sprint 2! You're building a real Kanban Board.\n\n## Requirements:\n- Map over the \`columns\` state to render a \`<div className="column">\` for each column.\n- Render the column's \`title\` inside an \`<h3>\`.\n- Inside each column, map over its \`tasks\` array and render a \`<div className="task">\` for each task.\n`,
    }
  },
  "REACT-202": {
    name: "react", rootLabel: "kanban-board", primary: "App.jsx", runtime: "React 18 · Babel",
    fileList: ["App.jsx", "App.css", "README.md"],
    files: {
      "App.jsx": `import { useState } from "react";\nimport "./App.css";\n\nexport default function App() {\n  const [columns, setColumns] = useState([\n    { id: "todo", title: "To Do", tasks: [{ id: 1, text: "Design Schema" }] },\n    { id: "done", title: "Done", tasks: [] }\n  ]);\n\n  // TODO: Create handleDragStart(e, taskId, sourceColumnId)\n  // TODO: Create handleDragOver(e) { e.preventDefault(); }\n  // TODO: Create handleDrop(e, targetColumnId)\n\n  return (\n    <div className="board-container">\n      <h1>Kanban Board</h1>\n      <div className="board">\n        {columns.map(col => (\n          <div key={col.id} className="column">\n            {/* TODO: Add onDragOver and onDrop to this column */}\n            <h3>{col.title}</h3>\n            {col.tasks.map(task => (\n              <div key={task.id} className="task">\n                {/* TODO: Add draggable={true} and onDragStart to this task */}\n                {task.text}\n              </div>\n            ))}\n          </div>\n        ))}\n      </div>\n    </div>\n  );\n}`,
      "App.css": `.board-container { padding: 3rem 2rem; font-family: 'Inter', sans-serif; min-height: 100vh; background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%); }\n.board-container h1 { font-size: 2.5rem; color: #2563eb; margin-bottom: 2rem; text-align: center; font-weight: 800; letter-spacing: -0.025em; margin-top: 0; }\n.board { display: flex; gap: 1.5rem; align-items: flex-start; max-width: 1200px; margin: 0 auto; }\n.column { flex: 1; background: rgba(239, 246, 255, 0.8); backdrop-filter: blur(10px); border: 2px solid #bfdbfe; border-radius: 12px; padding: 1.25rem; min-height: 300px; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.1); }\n.column h3 { margin-top: 0; margin-bottom: 1rem; font-size: 1.1rem; color: #1d4ed8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #bfdbfe; padding-bottom: 0.5rem; }\n.task { background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 0.75rem; cursor: grab; transition: transform 0.2s, box-shadow 0.2s; border-left: 4px solid #3b82f6; color: #4b5563; font-weight: 600; }\n.task:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.1); border-left-color: #2563eb; }\n.task:active { cursor: grabbing; transform: translateY(0); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }`,
      "README.md": `# REACT-202 · HTML5 Drag & Drop\n\nLet's make our tasks draggable using the native HTML5 Drag and Drop API.\n\n## Requirements:\n- Add \`draggable={true}\` to each task \`<div>\`.\n- Implement \`onDragStart\` on tasks to save the dragged \`taskId\` to the dataTransfer object.\n- Add \`onDragOver\` to the column \`<div>\` and call \`e.preventDefault()\` to allow dropping.\n- Add \`onDrop\` to the column \`<div>\` to handle moving the task to the new column.\n`,
    }
  },
  "REACT-203": {
    name: "react", rootLabel: "kanban-board", primary: "App.jsx", runtime: "React 18 · Babel",
    fileList: ["App.jsx", "BoardContext.jsx", "App.css", "README.md"],
    files: {
      "App.jsx": `import { BoardProvider } from "./BoardContext";\nimport "./App.css";\n\nexport default function App() {\n  return (\n    <BoardProvider>\n      <div className="board-container">\n        <h1>Kanban Board</h1>\n        {/* TODO: Consume BoardContext here to render the columns instead of local state */}\n      </div>\n    </BoardProvider>\n  );\n}`,
      "BoardContext.jsx": `import { createContext, useReducer } from "react";\n\nconst initialState = [\n  { id: "todo", title: "To Do", tasks: [{ id: 1, text: "Design Schema" }] },\n  { id: "done", title: "Done", tasks: [] }\n];\n\n// TODO: Create boardReducer to handle 'MOVE_TASK' action\nfunction boardReducer(state, action) {\n  return state;\n}\n\nexport const BoardContext = createContext();\n\nexport function BoardProvider({ children }) {\n  // TODO: Use useReducer instead of useState\n  return <BoardContext.Provider value={{}}>{children}</BoardContext.Provider>;\n}`,
      "App.css": `.board-container { padding: 3rem 2rem; font-family: 'Inter', sans-serif; min-height: 100vh; background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%); }\n.board-container h1 { font-size: 2.5rem; color: #2563eb; margin-bottom: 2rem; text-align: center; font-weight: 800; letter-spacing: -0.025em; margin-top: 0; }\n.board { display: flex; gap: 1.5rem; align-items: flex-start; max-width: 1200px; margin: 0 auto; }\n.column { flex: 1; background: rgba(239, 246, 255, 0.8); backdrop-filter: blur(10px); border: 2px solid #bfdbfe; border-radius: 12px; padding: 1.25rem; min-height: 300px; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.1); }\n.column h3 { margin-top: 0; margin-bottom: 1rem; font-size: 1.1rem; color: #1d4ed8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #bfdbfe; padding-bottom: 0.5rem; }\n.task { background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 0.75rem; cursor: grab; transition: transform 0.2s, box-shadow 0.2s; border-left: 4px solid #3b82f6; color: #4b5563; font-weight: 600; }\n.task:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.1); border-left-color: #2563eb; }\n.task:active { cursor: grabbing; transform: translateY(0); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }`,
      "README.md": `# REACT-203 · Context & Reducers\n\nThe drag-and-drop state logic is getting messy. Let's refactor it out of the component and into a global reducer.\n\n## Requirements:\n- Implement \`boardReducer\` to handle the \`MOVE_TASK\` action.\n- Use \`useReducer\` in \`BoardProvider\` instead of \`useState\`.\n- Provide the state and the \`dispatch\` function via Context.\n- Refactor \`App.jsx\` to consume the Context and dispatch actions.\n`,
    }
  },

  "REACT-301": {
    name: "react", rootLabel: "kanban-board", primary: "App.jsx", runtime: "React 18 · Babel",
    fileList: ["App.jsx", "BoardContext.jsx", "App.css", "README.md"],
    files: {
      "App.jsx": `import { BoardProvider } from "./BoardContext";\nimport "./App.css";\n\nexport default function App() {\n  return (\n    <BoardProvider>\n      <div className="board-container">\n        <h1>Kanban Board</h1>\n        {/* columns rendered here */}\n      </div>\n    </BoardProvider>\n  );\n}`,
      "BoardContext.jsx": `import { createContext, useReducer, useEffect } from "react";\n\n// TODO: Add useEffect to listen for 'storage' event on window\n// TODO: When 'storage' event fires with key 'kanban-state', dispatch an action to sync state.\n\nfunction boardReducer(state, action) {\n  return state;\n}\n\nexport const BoardContext = createContext();\n\nexport function BoardProvider({ children }) {\n  return <BoardContext.Provider value={{}}>{children}</BoardContext.Provider>;\n}`,
      "App.css": `.board-container { padding: 3rem 2rem; font-family: 'Inter', sans-serif; min-height: 100vh; background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%); }\n.board-container h1 { font-size: 2.5rem; color: #2563eb; margin-bottom: 2rem; text-align: center; font-weight: 800; letter-spacing: -0.025em; margin-top: 0; }\n.board { display: flex; gap: 1.5rem; align-items: flex-start; max-width: 1200px; margin: 0 auto; }\n.column { flex: 1; background: rgba(239, 246, 255, 0.8); backdrop-filter: blur(10px); border: 2px solid #bfdbfe; border-radius: 12px; padding: 1.25rem; min-height: 300px; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.1); }\n.column h3 { margin-top: 0; margin-bottom: 1rem; font-size: 1.1rem; color: #1d4ed8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #bfdbfe; padding-bottom: 0.5rem; }\n.task { background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 0.75rem; cursor: grab; transition: transform 0.2s, box-shadow 0.2s; border-left: 4px solid #3b82f6; color: #4b5563; font-weight: 600; }\n.task:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.1); border-left-color: #2563eb; }\n.task:active { cursor: grabbing; transform: translateY(0); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }`,
      "README.md": `# REACT-301 · Cross-Tab Storage Sync\n\nLet's simulate a real-time multiplayer backend using the browser's Storage event!\n\n## Requirements:\n- In \`BoardContext.jsx\`, add a \`useEffect\` that adds an event listener for the \`storage\` event on \`window\`.\n- When a task is moved, stringify the state and save it to \`localStorage\`.\n- When the \`storage\` event fires (because another tab changed the data), dispatch a sync action to update the local reducer state.\n`,
    }
  },
  "REACT-302": {
    name: "react", rootLabel: "kanban-board", primary: "App.jsx", runtime: "React 18 · Babel",
    fileList: ["App.jsx", "BoardContext.jsx", "App.css", "README.md"],
    files: {
      "App.jsx": `export default function App() { return <div>REACT-302 Workspace</div>; }`,
      "BoardContext.jsx": `// TODO: Implement Optimistic UI API simulation`,
      "App.css": `.board-container { padding: 3rem 2rem; font-family: 'Inter', sans-serif; min-height: 100vh; background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%); }\n.board-container h1 { font-size: 2.5rem; color: #2563eb; margin-bottom: 2rem; text-align: center; font-weight: 800; letter-spacing: -0.025em; margin-top: 0; }\n.board { display: flex; gap: 1.5rem; align-items: flex-start; max-width: 1200px; margin: 0 auto; }\n.column { flex: 1; background: rgba(239, 246, 255, 0.8); backdrop-filter: blur(10px); border: 2px solid #bfdbfe; border-radius: 12px; padding: 1.25rem; min-height: 300px; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.1); }\n.column h3 { margin-top: 0; margin-bottom: 1rem; font-size: 1.1rem; color: #1d4ed8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #bfdbfe; padding-bottom: 0.5rem; }\n.task { background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 0.75rem; cursor: grab; transition: transform 0.2s, box-shadow 0.2s; border-left: 4px solid #3b82f6; color: #4b5563; font-weight: 600; }\n.task:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.1); border-left-color: #2563eb; }\n.task:active { cursor: grabbing; transform: translateY(0); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }`,
      "README.md": `# REACT-302 · Optimistic UI Updates\n\n## Requirements:\n- Simulate a slow backend API call with \`setTimeout\` when moving a task.\n- Update the UI instantly before the API call finishes.\n- Roll back the UI to its previous state if the API fails.\n`,
    }
  },
  "REACT-303": {
    name: "react", rootLabel: "kanban-board", primary: "App.jsx", runtime: "React 18 · Babel",
    fileList: ["App.jsx", "BoardContext.jsx", "App.css", "README.md"],
    files: {
      "App.jsx": `export default function App() { return <div>REACT-303 Workspace</div>; }`,
      "BoardContext.jsx": `// TODO: Implement conflict resolution logic`,
      "App.css": `.board-container { padding: 3rem 2rem; font-family: 'Inter', sans-serif; min-height: 100vh; background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%); }\n.board-container h1 { font-size: 2.5rem; color: #2563eb; margin-bottom: 2rem; text-align: center; font-weight: 800; letter-spacing: -0.025em; margin-top: 0; }\n.board { display: flex; gap: 1.5rem; align-items: flex-start; max-width: 1200px; margin: 0 auto; }\n.column { flex: 1; background: rgba(239, 246, 255, 0.8); backdrop-filter: blur(10px); border: 2px solid #bfdbfe; border-radius: 12px; padding: 1.25rem; min-height: 300px; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.1); }\n.column h3 { margin-top: 0; margin-bottom: 1rem; font-size: 1.1rem; color: #1d4ed8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #bfdbfe; padding-bottom: 0.5rem; }\n.task { background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 0.75rem; cursor: grab; transition: transform 0.2s, box-shadow 0.2s; border-left: 4px solid #3b82f6; color: #4b5563; font-weight: 600; }\n.task:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.1); border-left-color: #2563eb; }\n.task:active { cursor: grabbing; transform: translateY(0); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }`,
      "README.md": `# REACT-303 · Conflicting State Resolution\n\n## Requirements:\n- Add a version number or lock to the tasks.\n- If two tabs try to edit the same task, prevent the second edit and show a conflict error.\n`,
    }
  },

  "REACT-401": {
    name: "react", rootLabel: "kanban-board", primary: "App.jsx", runtime: "React 18 · Babel",
    fileList: ["App.jsx", "BoardContext.jsx", "Task.jsx", "App.css", "README.md"],
    files: {
      "App.jsx": `export default function App() { return <div>REACT-401 Workspace</div>; }`,
      "BoardContext.jsx": `// TODO: Memoize components`,
      "Task.jsx": `// TODO: Create a Task component and wrap it in React.memo`,
      "App.css": `.board-container { padding: 3rem 2rem; font-family: 'Inter', sans-serif; min-height: 100vh; background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%); }\n.board-container h1 { font-size: 2.5rem; color: #2563eb; margin-bottom: 2rem; text-align: center; font-weight: 800; letter-spacing: -0.025em; margin-top: 0; }\n.board { display: flex; gap: 1.5rem; align-items: flex-start; max-width: 1200px; margin: 0 auto; }\n.column { flex: 1; background: rgba(239, 246, 255, 0.8); backdrop-filter: blur(10px); border: 2px solid #bfdbfe; border-radius: 12px; padding: 1.25rem; min-height: 300px; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.1); }\n.column h3 { margin-top: 0; margin-bottom: 1rem; font-size: 1.1rem; color: #1d4ed8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #bfdbfe; padding-bottom: 0.5rem; }\n.task { background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 0.75rem; cursor: grab; transition: transform 0.2s, box-shadow 0.2s; border-left: 4px solid #3b82f6; color: #4b5563; font-weight: 600; }\n.task:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.1); border-left-color: #2563eb; }\n.task:active { cursor: grabbing; transform: translateY(0); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }`,
      "README.md": `# REACT-401 · Memoization\n\n## Requirements:\n- Wrap the Column component in \`React.memo\`.\n- Wrap the Task component in \`React.memo\`.\n- Use \`useMemo\` and \`useCallback\` in the BoardContext to prevent unnecessary re-renders.\n`,
    }
  },
  "REACT-402": {
    name: "react", rootLabel: "kanban-board", primary: "App.jsx", runtime: "React 18 · Babel",
    fileList: ["App.jsx", "BoardContext.jsx", "Task.jsx", "App.css", "README.md"],
    files: {
      "App.jsx": `export default function App() { return <div>REACT-402 Workspace</div>; }`,
      "BoardContext.jsx": `// TODO: Carry over from previous sprint`,
      "Task.jsx": `// TODO: Task Component`,
      "App.css": `.board-container { padding: 3rem 2rem; font-family: 'Inter', sans-serif; min-height: 100vh; background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%); }\n.board-container h1 { font-size: 2.5rem; color: #2563eb; margin-bottom: 2rem; text-align: center; font-weight: 800; letter-spacing: -0.025em; margin-top: 0; }\n.board { display: flex; gap: 1.5rem; align-items: flex-start; max-width: 1200px; margin: 0 auto; }\n.column { flex: 1; background: rgba(239, 246, 255, 0.8); backdrop-filter: blur(10px); border: 2px solid #bfdbfe; border-radius: 12px; padding: 1.25rem; min-height: 300px; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.1); }\n.column h3 { margin-top: 0; margin-bottom: 1rem; font-size: 1.1rem; color: #1d4ed8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #bfdbfe; padding-bottom: 0.5rem; }\n.task { background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 0.75rem; cursor: grab; transition: transform 0.2s, box-shadow 0.2s; border-left: 4px solid #3b82f6; color: #4b5563; font-weight: 600; }\n.task:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.1); border-left-color: #2563eb; }\n.task:active { cursor: grabbing; transform: translateY(0); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }`,
      "README.md": `# REACT-402 · Virtualized Lists\n\n## Requirements:\n- Implement a virtualized scrolling window inside each column.\n- Only render the tasks that are currently visible on the screen.\n`,
    }
  },
  "REACT-403": {
    name: "react", rootLabel: "kanban-board", primary: "App.jsx", runtime: "React 18 · Babel",
    fileList: ["App.jsx", "ThemeContext.jsx", "Task.jsx", "App.css", "README.md"],
    files: {
      "App.jsx": `export default function App() { return <div>REACT-403 Workspace</div>; }`,
      "ThemeContext.jsx": `// TODO: Paste your ThemeContext from REACT-106`,
      "Task.jsx": `// TODO: Task Component`,
      "App.css": `.board-container { padding: 3rem 2rem; font-family: 'Inter', sans-serif; min-height: 100vh; background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%); }\n.board-container h1 { font-size: 2.5rem; color: #2563eb; margin-bottom: 2rem; text-align: center; font-weight: 800; letter-spacing: -0.025em; margin-top: 0; }\n.board { display: flex; gap: 1.5rem; align-items: flex-start; max-width: 1200px; margin: 0 auto; }\n.column { flex: 1; background: rgba(239, 246, 255, 0.8); backdrop-filter: blur(10px); border: 2px solid #bfdbfe; border-radius: 12px; padding: 1.25rem; min-height: 300px; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.1); }\n.column h3 { margin-top: 0; margin-bottom: 1rem; font-size: 1.1rem; color: #1d4ed8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #bfdbfe; padding-bottom: 0.5rem; }\n.task { background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 0.75rem; cursor: grab; transition: transform 0.2s, box-shadow 0.2s; border-left: 4px solid #3b82f6; color: #4b5563; font-weight: 600; }\n.task:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.1); border-left-color: #2563eb; }\n.task:active { cursor: grabbing; transform: translateY(0); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }`,
      "README.md": `# REACT-403 · Dark Mode Polish\n\n## Requirements:\n- Wrap the App in the \`ThemeProvider\` you built in Sprint 1.\n- Toggle a \`theme-dark\` class on the board based on the global state.\n`,
    }
  },
  "REACT-404": {
    name: "react", rootLabel: "kanban-board", primary: "App.jsx", runtime: "React 18 · Babel",
    fileList: ["App.jsx", "BoardContext.jsx", "ThemeContext.jsx", "Task.jsx", "App.css", "README.md"],
    files: {
      "App.jsx": `export default function App() { return <div>REACT-404 Workspace</div>; }`,
      "BoardContext.jsx": `// TODO: Carry over from previous sprint`,
      "ThemeContext.jsx": `// TODO: Carry over from previous sprint`,
      "Task.jsx": `// TODO: Task Component`,
      "App.css": `.board-container { padding: 3rem 2rem; font-family: 'Inter', sans-serif; min-height: 100vh; background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%); }\n.board-container h1 { font-size: 2.5rem; color: #2563eb; margin-bottom: 2rem; text-align: center; font-weight: 800; letter-spacing: -0.025em; margin-top: 0; }\n.board { display: flex; gap: 1.5rem; align-items: flex-start; max-width: 1200px; margin: 0 auto; }\n.column { flex: 1; background: rgba(239, 246, 255, 0.8); backdrop-filter: blur(10px); border: 2px solid #bfdbfe; border-radius: 12px; padding: 1.25rem; min-height: 300px; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.1); }\n.column h3 { margin-top: 0; margin-bottom: 1rem; font-size: 1.1rem; color: #1d4ed8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #bfdbfe; padding-bottom: 0.5rem; }\n.task { background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 0.75rem; cursor: grab; transition: transform 0.2s, box-shadow 0.2s; border-left: 4px solid #3b82f6; color: #4b5563; font-weight: 600; }\n.task:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.1); border-left-color: #2563eb; }\n.task:active { cursor: grabbing; transform: translateY(0); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }`,
      "README.md": `# REACT-404 · Confetti on Complete\n\n## Requirements:\n- Detect when all tasks are moved to the "Done" column.\n- Trigger a canvas confetti animation!\n`,
    }
  },
  "REACT-501": {
    name: "react", rootLabel: "chat-app", primary: "App.jsx", runtime: "React 18 · Babel",
    fileList: ["App.jsx", "App.css", "README.md"],
    files: {
      "App.jsx": `import { useState } from "react";\nimport "./App.css";\n\nexport default function App() {\n  const [messages, setMessages] = useState([\n    { id: 1, user: "Alice", text: "Hello!" },\n    { id: 2, user: "Bob", text: "Hi Alice!" }\n  ]);\n  const [input, setInput] = useState("");\n\n  return (\n    <div className="chat-container">\n      <div className="chat-header">General Chat</div>\n      <div className="chat-feed">\n        {/* TODO: Map over messages here */}\n      </div>\n      <div className="chat-input-area">\n        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." />\n        <button>Send</button>\n      </div>\n    </div>\n  );\n}`,
      "App.css": `.chat-container { display: flex; flex-direction: column; height: 100vh; font-family: 'Inter', sans-serif; background: #f9fafb; }\n.chat-header { padding: 1.5rem; background: #ffffff; border-bottom: 1px solid #e5e7eb; font-size: 1.25rem; font-weight: 600; }\n.chat-feed { flex: 1; padding: 1.5rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; }\n.chat-input-area { padding: 1.5rem; background: #ffffff; border-top: 1px solid #e5e7eb; display: flex; gap: 1rem; }\n.chat-input-area input { flex: 1; padding: 0.75rem 1rem; border: 1px solid #d1d5db; border-radius: 8px; outline: none; }\n.chat-input-area button { padding: 0.75rem 1.5rem; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }`,
      "README.md": `# REACT-501 · Message Feed UI\n\nWelcome to Sprint 5! Let's build a real-time chat app.\n\n## Requirements:\n- Map over the \`messages\` state to render the chat messages inside \`.chat-feed\`.\n- Build out a simple flex layout so the input is sticky at the bottom.\n`,
    }
  },
  "REACT-502": {
    name: "react", rootLabel: "chat-app", primary: "App.jsx", runtime: "React 18 · Babel",
    fileList: ["App.jsx", "App.css", "README.md"],
    files: {
      "App.jsx": `import { useEffect } from "react";\n\nexport default function App() {\n  // TODO: Implement WebSocket connection inside useEffect\n  return <div>REACT-502 Workspace</div>;\n}`,
      "App.css": `.chat-container { display: flex; flex-direction: column; height: 100vh; }`,
      "README.md": `# REACT-502 · WebSocket Integration\n\n## Requirements:\n- Use \`useEffect\` to create a new \`WebSocket('wss://...')\` connection.\n- Listen for \`onmessage\` and append incoming messages to the feed.\n- Cleanup the WebSocket connection on component unmount.\n`,
    }
  },
  "REACT-503": {
    name: "react", rootLabel: "chat-app", primary: "App.jsx", runtime: "React 18 · Babel",
    fileList: ["App.jsx", "App.css", "README.md"],
    files: {
      "App.jsx": `import { useRef } from "react";\n\nexport default function App() {\n  // TODO: Use useRef to scroll to the bottom of the feed automatically\n  return <div>REACT-503 Workspace</div>;\n}`,
      "App.css": `.chat-container { display: flex; flex-direction: column; height: 100vh; }`,
      "README.md": `# REACT-503 · Auto-Scroll to Bottom\n\n## Requirements:\n- Use a \`useRef\` hook attached to the bottom of the chat feed.\n- When a new message arrives, call \`scrollIntoView()\` on the ref.\n`,
    }
  },
  "REACT-504": {
    name: "react", rootLabel: "chat-app", primary: "App.jsx", runtime: "React 18 · Babel",
    fileList: ["App.jsx", "App.css", "README.md"],
    files: {
      "App.jsx": `import { useEffect } from "react";\n\nexport default function App() {\n  // TODO: Implement Intersection Observer for infinite scrolling\n  return <div>REACT-504 Workspace</div>;\n}`,
      "App.css": `.chat-container { display: flex; flex-direction: column; height: 100vh; }`,
      "README.md": `# REACT-504 · Infinite Scroll Pagination\n\n## Requirements:\n- Attach an IntersectionObserver to a sentinel \`div\` at the top of the feed.\n- When the sentinel becomes visible, fetch older messages and prepend them to the array.\n`,
    }
  }
};


const CYBERSECURITY_KITS: Record<string, Kit> = {
  "SEC-101": {
    name: "python", rootLabel: "sqli-patch", primary: "app.py", runtime: "Python 3.10 · Flask",
    fileList: ["app.py", "README.md"],
    files: {
      "app.py": `import sqlite3
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/login', methods=['POST'])
def login():
    username = request.json.get('username')
    password = request.json.get('password')
    
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    # TODO: SECURE this query using parameterized queries instead of f-strings
    query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
    cursor.execute(query)
    
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return jsonify({"status": "success", "message": "Logged in!"})
    return jsonify({"status": "error", "message": "Invalid credentials"}), 401`,
      "README.md": `# SEC-101 | SQL Injection (SQLi) Patch

Fix a vulnerable Python Flask login endpoint that concatenates raw user input into an SQL query.

## Tasks
1. Identify the vulnerability in \`app.py\` where user input is concatenated.
2. Fix the query by using parameterized queries (\`?\` placeholders).
3. Ensure the login function still works correctly for valid credentials.

## Hints
- Never use Python's \`+\` operator or f-strings for SQL variables.
- Use the \`?\` placeholders provided by the \`sqlite3\` driver.
- The \`execute\` method takes a tuple of parameters as its second argument.
`
    }
  },
  "SEC-102": {
    name: "python", rootLabel: "xss-patch", primary: "comments.py", runtime: "Python 3.10",
    fileList: ["comments.py", "README.md"],
    files: {
      "comments.py": `import bleach

def sanitize_comment(raw_html):
    # TODO: Allow only safe tags (e.g., 'b', 'i', 'strong', 'em')
    # Clean the input using bleach.clean()
    return raw_html

# Example usage:
# malicious_input = "<script>alert(1)</script><b>Hello</b>"
# print(sanitize_comment(malicious_input))
`,
      "README.md": `# SEC-102 | Cross-Site Scripting (XSS) Sanitization

Implement a function to sanitize user-submitted blog comments before rendering them.

## Tasks
1. Use the \`bleach\` library to clean the \`raw_html\` input.
2. Allow only safe tags: \`b\`, \`i\`, \`strong\`, \`em\`.
3. Return the sanitized HTML string.

## Hints
- Use \`bleach.clean(raw_html, tags=allowed_tags, strip=True)\`.
- Don't write your own regex to strip tags, as it's prone to bypasses.
`
    }
  },
  "SEC-103": {
    name: "python", rootLabel: "csrf-patch", primary: "csrf.py", runtime: "Python 3.10 · Flask",
    fileList: ["csrf.py", "README.md"],
    files: {
      "csrf.py": `import os
import binascii
from flask import session, abort, request

def generate_csrf_token():
    if 'csrf_token' not in session:
        # TODO: Generate a cryptographically secure random token and store it in the session
        pass
    return session.get('csrf_token')

def validate_csrf_token():
    # Require CSRF token for state-changing methods
    if request.method in ['POST', 'PUT', 'DELETE']:
        # TODO: Retrieve the token from request.form or request.headers
        # TODO: Abort with 403 if the token is missing or invalid
        pass
`,
      "README.md": `# SEC-103 | Cross-Site Request Forgery (CSRF) Tokens

Add CSRF token generation and validation to a state-changing POST endpoint.

## Tasks
1. Implement \`generate_csrf_token\` to generate a secure random 32-byte token and store it in the session.
2. Implement \`validate_csrf_token\` to check if the incoming POST request has a valid CSRF token.
3. If invalid, abort with a 403 Forbidden status.

## Hints
- Use \`os.urandom(32)\` and \`binascii.hexlify()\` to generate the token.
- Check \`request.form.get('csrf_token')\` or \`request.headers.get('X-CSRF-Token')\`.
`
    }
  }
};

function getKit(slug: string, tag: string, ticketId: string): Kit {
  if (slug === "react") {
    return REACT_KITS[ticketId] ?? REACT_KITS["REACT-101"];
  }
  if (slug === "cybersecurity") {
    return CYBERSECURITY_KITS[ticketId] ?? CYBERSECURITY_KITS["SEC-101"];
  }
  if (tag === "Django Todo") {
    return {
      name: "django", rootLabel: "todo-app", primary: "todos/views.py", runtime: "Python 3.12 · Django 5",
      fileList: [...DJANGO_FILES], files: { ...DJANGO_STARTERS },
    };
  }
  if (slug === "python" || slug === "programming" || slug === "datastructures")
    return PY_KITS[tag] ?? PY_KITS["Py Fundamentals"];
  if (slug === "sql") return SQL_KIT_DEFAULT;
  if (slug === "mongo") return MONGO_KIT_DEFAULT;
  if (slug === "ui" || slug === "bootstrap" || slug === "tailwind") return UI_KIT_DEFAULT;
  return {
    name: "java", rootLabel: "java-101", primary: "Main.java", runtime: "Java 17",
    fileList: [...FILE_LIST],
    files: { "Main.java": STARTER_MAIN, "MainTest.java": STARTER_TEST, "README.md": STARTER_README },
  };
}

function getReactSrcDoc(files: Record<string, string>) {
  const virtualFiles: Record<string, string> = {};
  let cssText = "";
  for (const [name, content] of Object.entries(files)) {
    if (name.endsWith(".jsx") || name.endsWith(".js")) {
      virtualFiles[name] = content;
    } else if (name.endsWith(".css")) {
      cssText += content + "\n";
    }
  }
  // Use the current dev server origin so srcdoc iframe can resolve local public/ files
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <script src="${origin}/react.production.min.js"><\/script>
  <script src="${origin}/react-dom.production.min.js"><\/script>
  <script src="${origin}/babel.min.js"><\/script>
  <script src="https://unpkg.com/react-window/dist/index.umd.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"><\/script>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; }
    ${cssText}
  </style>
</head>
<body>
  <div id="root"><div style="padding:8px;color:#888;font-family:monospace;font-size:12px">Loading…</div></div>
  <script>
    window.onerror = function(msg, src, line, col, err) {
      var root = document.getElementById('root');
      if (root) root.innerHTML = '<div style="color:#b00;padding:1rem;font-family:monospace;white-space:pre-wrap"><b>Script Error</b><br>' + msg + '</div>';
    };

    window.__files = ${JSON.stringify(virtualFiles)};
    window.__modules = {
      "react-window": {
        exports: {
          FixedSizeList: function(props) {
            var items = [];
            var limit = Math.min(props.itemCount, 50);
            for (var i = 0; i < limit; i++) {
              items.push(props.children({ index: i, style: { height: props.itemSize, boxSizing: "border-box" } }));
            }
            return React.createElement('div', { style: { height: props.height, width: props.width, overflow: 'auto', position: 'relative' } }, items);
          }
        }
      },
      "canvas-confetti": {
        exports: function() { if (window.confetti) window.confetti.apply(this, arguments); }
      }
    };
    
    window.require = function(path) {
      var cleanPath = path.replace(/^\\.\\//, "");
      
      // CSS is already inlined via <style> tag — return empty module
      if (cleanPath.endsWith(".css") || path.endsWith(".css")) return {};
      
      if (!cleanPath.endsWith(".jsx") && !cleanPath.endsWith(".js")) {
        if (window.__files[cleanPath + ".jsx"]) cleanPath = cleanPath + ".jsx";
        else if (window.__files[cleanPath + ".js"]) cleanPath = cleanPath + ".js";
      }
      
      if (cleanPath === "react") return window.React;
      if (cleanPath === "react-dom" || cleanPath === "react-dom/client") return window.ReactDOM;
      if (window.__modules[cleanPath]) return window.__modules[cleanPath].exports;
      
      var code = window.__files[cleanPath];
      if (code === undefined) {
        console.warn("Module not found: " + path + " — returning empty module");
        return {};
      }
      
      try {
        window.__loading = window.__loading || {};
        if (window.__loading[cleanPath]) {
          throw new Error("Circular dependency detected: " + cleanPath + " is importing itself or part of a require loop.");
        }
        window.__loading[cleanPath] = true;

        var compiled = Babel.transform(code, { 
          presets: [
            ["react", { runtime: "classic" }], 
            ["env", { modules: "commonjs" }]
          ] 
        }).code;
        var mod = { exports: {} };
        window.__modules[cleanPath] = mod; // cache before execution to prevent loop
        
        var fn = new Function("exports", "module", "require", compiled);
        fn(mod.exports, mod, window.require);
        
        delete window.__loading[cleanPath];
        return mod.exports;
      } catch (err) {
        var root = document.getElementById('root');
        if (root) root.innerHTML = '<div style="color:#b00;padding:1rem;font-family:monospace;white-space:pre-wrap"><b>Compile Error in ' + cleanPath + '</b><br>' + (err && err.message || err) + '</div>';
        throw err;
      }
    };
    
    function mountApp() {
      try {
        if (!window.React || !window.ReactDOM || !window.Babel) {
          document.getElementById('root').innerHTML = '<div style="color:#b00;padding:1rem;font-family:monospace">Loading React runtime... If this persists, check your internet connection.</div>';
          return;
        }
        window.__modules = {};
        var App = window.require("App.jsx").default;
        if (!App) throw new Error('App.jsx did not export a default component');
        var rootEl = document.getElementById("root");
        if (rootEl._reactRoot) {
          rootEl._reactRoot.render(React.createElement(App));
        } else {
          rootEl._reactRoot = ReactDOM.createRoot(rootEl);
          rootEl._reactRoot.render(React.createElement(App));
        }
      } catch (e) {
        document.getElementById("root").innerHTML = 
          '<div style="color:#b00; padding:1rem; font-family:monospace; white-space:pre-wrap;">' +
          '<b>Render Error</b><br>' + (e && (e.stack || e.message) || e) +
          '</div>';
      }
    }

    // Poll until all three CDN scripts are ready (handles async loading order)
    var _poll = setInterval(function() {
      if (window.React && window.ReactDOM && window.Babel) {
        clearInterval(_poll);
        mountApp();
      }
    }, 50);

    // Fallback: also try on load event
    window.addEventListener('load', function() {
      clearInterval(_poll);
      mountApp();
    });
  <\/script>
</body>
</html>`;
}

function getUITests(ticketId: string, files: Record<string, string>): TestResult[] {
  const html = files["index.html"] ?? "";
  
  if (ticketId.startsWith("BS-")) {
    return [
      { name: "Test 1 · Bootstrap CDN Included", pass: /bootstrap(\.min)?\.css/.test(html) || /bootstrap@5/.test(html), time: "3ms" },
      { name: "Test 2 · Container & Row Usage", pass: /class=(['"])[^'"]*\b(container|container-fluid)\b/.test(html) && /class=(['"])[^'"]*\brow\b/.test(html), time: "2ms" },
      { name: "Test 3 · Bootstrap Components/Grid", pass: /class=(['"])[^'"]*\b(col\b|col-|navbar|card|btn\b|alert|modal)\b/.test(html), time: "1ms" },
    ];
  }
  if (ticketId.startsWith("TW-")) {
    return [
      { name: "Test 1 · Tailwind Script Included", pass: /cdn\.tailwindcss\.com/.test(html), time: "3ms" },
      { name: "Test 2 · Layout Utilities Applied", pass: /class=(['"])[^'"]*\b(flex|grid|block)\b/.test(html), time: "4ms" },
      { name: "Test 3 · Styling Utilities Applied", pass: /class=(['"])[^'"]*\b(p-\d+|m-\d+|text-|bg-|rounded)\b/.test(html), time: "2ms" },
    ];
  }
  
  return [
    { name: "Test 1 · HTML Structure", pass: /<!DOCTYPE html>/.test(html), time: "5ms" },
    { name: "Test 2 · Custom Code Added", pass: html.length > 300 && !html.includes("Build pixel-perfect UI"), time: "2ms" },
  ];
}

function calculateUIMatchScore(ticketId: string, files: Record<string, string>): number {
  const tests = getUITests(ticketId, files);
  if (tests.length === 0) return 0;
  const passed = tests.filter(t => t.pass).length;
  return Math.round((passed / tests.length) * 100);
}

function calculateReactMatchScore(ticketId: string, files: Record<string, string>): number {
  const jsx = ticketId === "REACT-101" ? (files["TaskItem.jsx"] ?? "") : (files["App.jsx"] ?? "");
  const css = files["App.css"] ?? "";
  
  let score = 0;
  
  if (ticketId === "REACT-101") {
    const cardBody = jsx.replace(/function TaskItem[^{]*\{/, "");
    if (/props\.task|task\s*\}/.test(jsx)) score += 20;
    if (/<input[^>]*type\s*=\s*(['"])checkbox\1/.test(cardBody)) score += 30;
    if (/task\.text/.test(cardBody)) score += 30;
    if (/<button[^>]*>/.test(cardBody)) score += 20;
  } else if (ticketId === "REACT-102") {
    if (/useState/.test(jsx)) score += 25;
    if (/<form[^>]*onSubmit/.test(jsx)) score += 25;
    if (/<input[^>]*onChange/.test(jsx)) score += 25;
    if (/\.map/.test(jsx)) score += 25;
  } else if (ticketId === "REACT-103") {
    if (/\.map/.test(jsx) && /!.*completed/.test(jsx)) score += 35; // toggle logic
    if (/\.filter/.test(jsx) && /!==/.test(jsx)) score += 35; // delete logic
    if (/onToggle/.test(jsx) || /onDelete/.test(jsx)) score += 30;
  } else if (ticketId === "REACT-104") {
    if (/useEffect/.test(jsx)) score += 30;
    if (/localStorage\.getItem/.test(jsx)) score += 35;
    if (/localStorage\.setItem/.test(jsx)) score += 35;
  } else if (ticketId === "REACT-105") {
    if (/useState/.test(jsx)) score += 25;
    if (/<Dashboard/.test(jsx)) score += 30;
    if (/===/.test(jsx) && /\?/.test(jsx)) score += 25; // conditional rendering
    if (/onClick/.test(jsx)) score += 20;
  } else if (ticketId === "REACT-106") {
    if (/createContext/.test(jsx) || /createContext/.test(files["ThemeContext.jsx"] ?? "")) score += 30;
    if (/useContext/.test(jsx) || /ThemeContext/.test(jsx)) score += 30;
    if (/Provider/.test(jsx) || /Provider/.test(files["ThemeContext.jsx"] ?? "")) score += 40;
  } else if (ticketId === "REACT-201") {
    if (/\.map/.test(jsx)) score += 50;
    if (/className=["']column/.test(jsx)) score += 25;
    if (/className=["']task/.test(jsx)) score += 25;
  } else if (ticketId === "REACT-202") {
    if (/draggable=/.test(jsx)) score += 25;
    if (/onDragStart=/.test(jsx)) score += 25;
    if (/onDragOver=/.test(jsx) || /preventDefault/.test(jsx)) score += 25;
    if (/onDrop=/.test(jsx)) score += 25;
  } else if (ticketId === "REACT-203") {
    if (/useReducer/.test(files["BoardContext.jsx"] ?? "")) score += 40;
    if (/createContext/.test(files["BoardContext.jsx"] ?? "")) score += 30;
    if (/useContext/.test(jsx)) score += 30;
  } else if (ticketId === "REACT-301") {
    if (/useEffect/.test(files["BoardContext.jsx"] ?? "")) score += 50;
    if (/addEventListener\(['"]storage['"]/.test(files["BoardContext.jsx"] ?? "")) score += 50;
  } else if (ticketId === "REACT-302") {
    if (/setTimeout/.test(files["BoardContext.jsx"] ?? "")) score += 100;
  } else if (ticketId === "REACT-303") {
    if (/version/.test(files["BoardContext.jsx"] ?? "") || /lock/.test(files["BoardContext.jsx"] ?? "")) score += 100;
  } else if (ticketId === "REACT-401") {
    if (/memo/.test(jsx) || /useMemo/.test(jsx) || /useCallback/.test(jsx)) score += 100;
  } else if (ticketId === "REACT-402") {
    if (/FixedSizeList/.test(jsx) || /List/.test(jsx) || /window/.test(jsx)) score += 100;
  } else if (ticketId === "REACT-403") {
    if (/ThemeProvider/.test(jsx) || /theme-dark/.test(jsx)) score += 100;
  } else if (ticketId === "REACT-404") {
    if (/confetti/.test(jsx) || /canvas/.test(jsx)) score += 100;
  } else if (ticketId === "REACT-501") {
    if (/\.map/.test(jsx)) score += 50;
    if (/className=["']chat-feed/.test(jsx)) score += 25;
    if (/className=["']chat-input-area/.test(jsx)) score += 25;
  } else if (ticketId === "REACT-502") {
    if (/useEffect/.test(jsx)) score += 40;
    if (/WebSocket/.test(jsx)) score += 60;
  } else if (ticketId === "REACT-503") {
    if (/useRef/.test(jsx)) score += 50;
    if (/scrollIntoView/.test(jsx)) score += 50;
  } else if (ticketId === "REACT-504") {
    if (/IntersectionObserver/.test(jsx)) score += 100;
  } else {
    score = 100;
  }
  
  return Math.min(100, score);
}

function getReactTests(ticketId: string, files: Record<string, string>): TestResult[] {
  const jsx = ticketId === "REACT-101" ? (files["TaskItem.jsx"] ?? "") : (files["App.jsx"] ?? "");
  const css = files["App.css"] ?? "";
  
  if (ticketId === "REACT-101") {
    return [
      { name: "Verify TaskItem Component Definition", pass: /function TaskItem/.test(jsx) || /const TaskItem/.test(jsx), time: "10ms" },
      { name: "Verify Component Accepts Props", pass: /TaskItem\s*\(\s*\{\s*task|TaskItem\s*\(\s*props/.test(jsx), time: "5ms" },
      { name: "Verify Checkbox Input Rendered", pass: /<input[^>]*type\s*=\s*(['"])checkbox\1/.test(jsx), time: "8ms" },
      { name: "Verify Task Text Rendered", pass: /\{\s*task\.text\s*\}/.test(jsx) || /task\.text/.test(jsx), time: "11ms" },
      { name: "Verify Delete Button Rendered", pass: /<button[^>]*>/.test(jsx), time: "6ms" },
    ];
  }
  if (ticketId === "REACT-102") {
    return [
      { name: "Verify useState Tasks Array Initialization", pass: /useState\(\s*\[\s*\]\s*\)/.test(jsx) || /useState/.test(jsx), time: "9ms" },
      { name: "Verify Controlled Input Form Event Handler", pass: /<form[^>]*onSubmit/.test(jsx), time: "7ms" },
      { name: "Verify Input Value and onChange Handler", pass: /<input[^>]*onChange/.test(jsx), time: "12ms" },
      { name: "Verify Mapping Task Array Elements", pass: /tasks\.map/.test(jsx), time: "8ms" },
    ];
  }
  if (ticketId === "REACT-103") {
    return [
      { name: "Verify Toggle Complete Mutator Function", pass: /!.*completed/.test(jsx) || /completed/.test(jsx), time: "10ms" },
      { name: "Verify Delete Task Array Filter Logic", pass: /\.filter/.test(jsx), time: "9ms" },
      { name: "Verify onToggle Prop Passed Down", pass: /onToggle=/.test(jsx), time: "11ms" },
      { name: "Verify onDelete Prop Passed Down", pass: /onDelete=/.test(jsx), time: "14ms" },
    ];
  }
  if (ticketId === "REACT-104") {
    return [
      { name: "Verify useEffect Hook for Persistence", pass: /useEffect/.test(jsx), time: "15ms" },
      { name: "Verify localStorage.getItem Read Operation", pass: /localStorage\.getItem/.test(jsx), time: "6ms" },
      { name: "Verify localStorage.setItem Write Operation", pass: /localStorage\.setItem/.test(jsx), time: "9ms" },
    ];
  }
  if (ticketId === "REACT-105") {
    return [
      { name: "Verify currentView Router State", pass: /useState/.test(jsx), time: "8ms" },
      { name: "Verify Navigation Button Event Handlers", pass: /onClick/.test(jsx) || /setView/.test(jsx), time: "10ms" },
      { name: "Verify Conditional Dashboard Render View", pass: /<Dashboard/.test(jsx) || /===/.test(jsx), time: "12ms" },
    ];
  }
  if (ticketId === "REACT-106") {
    return [
      { name: "Verify ThemeContext React API Creation", pass: /createContext/.test(jsx) || /createContext/.test(files["ThemeContext.jsx"] ?? ""), time: "14ms" },
      { name: "Verify Context Consumer useContext Hook", pass: /useContext/.test(jsx), time: "8ms" },
      { name: "Verify ThemeProvider Wrapper Context Provider", pass: /Provider/.test(jsx) || /Provider/.test(files["ThemeContext.jsx"] ?? ""), time: "10ms" },
    ];
  }
  if (ticketId === "REACT-201") {
    return [
      { name: "Verify array mapping for columns and tasks", pass: /\.map/.test(jsx), time: "10ms" },
      { name: "Verify column structural div classes", pass: /className=["']column/.test(jsx), time: "5ms" },
      { name: "Verify task card div classes", pass: /className=["']task/.test(jsx), time: "8ms" },
    ];
  }
  if (ticketId === "REACT-202") {
    return [
      { name: "Verify draggable attribute", pass: /draggable=/.test(jsx), time: "4ms" },
      { name: "Verify onDragStart event handler", pass: /onDragStart=/.test(jsx), time: "5ms" },
      { name: "Verify onDragOver preventDefault", pass: /onDragOver=/.test(jsx) || /preventDefault/.test(jsx), time: "6ms" },
      { name: "Verify onDrop target zone handler", pass: /onDrop=/.test(jsx), time: "5ms" },
    ];
  }
  if (ticketId === "REACT-203") {
    return [
      { name: "Verify Global Reducer Architecture", pass: /useReducer/.test(files["BoardContext.jsx"] ?? ""), time: "12ms" },
      { name: "Verify BoardContext setup", pass: /createContext/.test(files["BoardContext.jsx"] ?? ""), time: "8ms" },
    ];
  }
  if (ticketId === "REACT-301") {
    return [
      { name: "Verify useEffect side effect", pass: /useEffect/.test(files["BoardContext.jsx"] ?? ""), time: "10ms" },
      { name: "Verify Cross-Tab Window Storage Listener", pass: /addEventListener\(['"]storage['"]/.test(files["BoardContext.jsx"] ?? ""), time: "12ms" },
    ];
  }
  if (ticketId === "REACT-302") {
    return [{ name: "Verify Optimistic API Timer Simulation", pass: /setTimeout/.test(files["BoardContext.jsx"] ?? ""), time: "9ms" }];
  }
  if (ticketId === "REACT-303") {
    return [{ name: "Verify Concurrency Locking Model", pass: /version/.test(files["BoardContext.jsx"] ?? "") || /lock/.test(files["BoardContext.jsx"] ?? ""), time: "14ms" }];
  }
  if (ticketId === "REACT-401") {
    return [{ name: "Verify React Profiler Memoization", pass: /memo/.test(jsx) || /useMemo/.test(jsx) || /useCallback/.test(jsx), time: "18ms" }];
  }
  if (ticketId === "REACT-402") {
    return [{ name: "Verify Virtualized FixedList Rendering", pass: /FixedSizeList/.test(jsx) || /List/.test(jsx) || /window/.test(jsx), time: "22ms" }];
  }
  if (ticketId === "REACT-403") {
    return [{ name: "Verify Dynamic CSS Theme Properties", pass: /ThemeProvider/.test(jsx) || /theme-dark/.test(jsx), time: "11ms" }];
  }
  if (ticketId === "REACT-404") {
    return [{ name: "Verify HTML5 Canvas Confetti Drop", pass: /confetti/.test(jsx) || /canvas/.test(jsx), time: "30ms" }];
  }
  if (ticketId === "REACT-501") {
    return [
      { name: "Verify message array mapping", pass: /\.map/.test(jsx), time: "10ms" },
      { name: "Verify sticky input flexbox wrapper", pass: /chat-input-area/.test(jsx), time: "8ms" },
    ];
  }
  if (ticketId === "REACT-502") {
    return [
      { name: "Verify WebSocket initialization hook", pass: /WebSocket/.test(jsx), time: "15ms" },
      { name: "Verify useEffect side effect", pass: /useEffect/.test(jsx), time: "12ms" },
    ];
  }
  if (ticketId === "REACT-503") {
    return [
      { name: "Verify useRef DOM reference", pass: /useRef/.test(jsx), time: "8ms" },
      { name: "Verify scrollIntoView invocation", pass: /scrollIntoView/.test(jsx), time: "10ms" },
    ];
  }
  if (ticketId === "REACT-504") {
    return [{ name: "Verify IntersectionObserver Pagination", pass: /IntersectionObserver/.test(jsx), time: "14ms" }];
  }
  
  return [];
}

function ReactReferenceView({ ticketId }: { ticketId: string }) {
  switch (ticketId) {
    case "REACT-101":
      return (
        <div style={{ padding: "2rem", fontFamily: "sans-serif", display: "flex", justifyContent: "center", color: "#111827" }}>
          <ul style={{ listStyle: "none", padding: 0, width: "100%", maxWidth: "400px" }}>
            <li style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem", borderBottom: "1px solid #eee" }}>
              <input type="checkbox" readOnly />
              <span style={{ flex: 1 }}>Learn React basics</span>
              <button style={{ background: "none", border: "none", color: "#dc2626" }}>🗑</button>
            </li>
          </ul>
        </div>
      );
    case "REACT-102":
    case "REACT-103":
    case "REACT-104":
      return (
        <div style={{ padding: "2rem", fontFamily: "sans-serif", display: "flex", justifyContent: "center", color: "#111827", textAlign: "left" }}>
          <div style={{ width: "100%", maxWidth: "400px" }}>
            <h1 style={{ marginTop: 0, fontSize: "2em", fontWeight: "bold" }}>To-Do List</h1>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <input placeholder="Add a task" disabled style={{ flex: 1, padding: "0.5rem", border: "1px solid #ccc", borderRadius: "2px" }} />
              <button style={{ padding: "0.5rem", border: "1px solid #888", background: "#efefef", color: "#000", borderRadius: "2px", whiteSpace: "nowrap" }}>Add Task</button>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "1em 0" }}>
              <li style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                <input type="checkbox" readOnly style={{ margin: "3px 3px 3px 4px", WebkitAppearance: "checkbox", appearance: "auto" }} />
                <span style={{ flex: 1 }}>Learn React Hooks</span>
                <button style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer" }}>🗑</button>
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                <input type="checkbox" readOnly style={{ margin: "3px 3px 3px 4px", WebkitAppearance: "checkbox", appearance: "auto" }} />
                <span style={{ flex: 1 }}>Build a To-Do App</span>
                <button style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer" }}>🗑</button>
              </li>
            </ul>
          </div>
        </div>
      );
    case "REACT-105":
      return (
        <div style={{ padding: "2rem", fontFamily: "sans-serif", display: "flex", justifyContent: "center", color: "#111827" }}>
          <div style={{ width: "100%", maxWidth: "400px" }}>
            <nav style={{ display: "flex", gap: "1rem", marginBottom: "1rem", borderBottom: "2px solid #eee", paddingBottom: "0.5rem" }}>
              <button style={{ background: "none", border: "none", fontSize: "1rem", fontWeight: "bold" }}>List</button>
              <button style={{ background: "none", border: "none", fontSize: "1rem", color: "#666" }}>Dashboard</button>
            </nav>
            <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
              <h2 style={{ marginTop: 0 }}>Dashboard</h2>
              <p>Total Tasks: 2</p>
              <p>Completed: 1</p>
            </div>
          </div>
        </div>
      );
    case "REACT-106":
      return (
        <div style={{ padding: "2rem", fontFamily: "sans-serif", display: "flex", justifyContent: "center", background: "#111827", color: "#f9fafb", minHeight: "100%" }}>
          <div style={{ width: "100%", maxWidth: "400px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h1 style={{ marginTop: 0 }}>To-Do List</h1>
              <button style={{ padding: "0.5rem 1rem", borderRadius: "4px", border: "1px solid #888", background: "transparent", color: "inherit" }}>Toggle Theme</button>
            </div>
            <p>Tasks would go here...</p>
          </div>
        </div>
      );
    case "REACT-201":
    case "REACT-202":
    case "REACT-203":
    case "REACT-301":
    case "REACT-302":
    case "REACT-303":
    case "REACT-401":
    case "REACT-402":
    case "REACT-404":
      return (
        <div style={{ padding: "3rem 2rem", fontFamily: "'Inter', sans-serif", background: "linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)", color: "#1f2937", minHeight: "100%" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "800", letterSpacing: "-0.025em", margin: "0 0 2rem 0", textAlign: "center", color: "#2563eb" }}>Kanban Board</h1>
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ flex: 1, background: "rgba(239, 246, 255, 0.8)", backdropFilter: "blur(10px)", border: "2px solid #bfdbfe", borderRadius: "12px", padding: "1.25rem", minHeight: "300px", boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.1)" }}>
              <h3 style={{ marginTop: 0, marginBottom: "1rem", fontSize: "1.1rem", color: "#1d4ed8", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #bfdbfe", paddingBottom: "0.5rem" }}>To Do 🔵</h3>
              <div style={{ background: "white", padding: "1rem", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", marginBottom: "0.75rem", borderLeft: "4px solid #3b82f6", color: "#4b5563", fontWeight: "600" }}>Design Schema</div>
              <div style={{ background: "white", padding: "1rem", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", marginBottom: "0.75rem", borderLeft: "4px solid #3b82f6", color: "#4b5563", fontWeight: "600" }}>Create API</div>
            </div>
            <div style={{ flex: 1, background: "rgba(254, 252, 232, 0.8)", backdropFilter: "blur(10px)", border: "2px solid #fef08a", borderRadius: "12px", padding: "1.25rem", minHeight: "300px", boxShadow: "0 4px 6px -1px rgba(234, 179, 8, 0.1)" }}>
              <h3 style={{ marginTop: 0, marginBottom: "1rem", fontSize: "1.1rem", color: "#a16207", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #fef08a", paddingBottom: "0.5rem" }}>In Progress 🟡</h3>
              <div style={{ background: "white", padding: "1rem", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", marginBottom: "0.75rem", borderLeft: "4px solid #eab308", color: "#4b5563", fontWeight: "600" }}>Setup React</div>
            </div>
            <div style={{ flex: 1, background: "rgba(240, 253, 244, 0.8)", backdropFilter: "blur(10px)", border: "2px solid #bbf7d0", borderRadius: "12px", padding: "1.25rem", minHeight: "300px", boxShadow: "0 4px 6px -1px rgba(34, 197, 94, 0.1)" }}>
              <h3 style={{ marginTop: 0, marginBottom: "1rem", fontSize: "1.1rem", color: "#15803d", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #bbf7d0", paddingBottom: "0.5rem" }}>Done 🟢</h3>
            </div>
          </div>
        </div>
      );
    case "REACT-403":
      return (
        <div style={{ padding: "3rem 2rem", fontFamily: "'Inter', sans-serif", background: "#111827", color: "#f9fafb", minHeight: "100%" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "800", letterSpacing: "-0.025em", margin: "0 0 2rem 0", textAlign: "center" }}>Kanban Board</h1>
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ flex: 1, background: "#1f2937", border: "1px solid #374151", borderRadius: "12px", padding: "1.25rem", minHeight: "300px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.2)" }}>
              <h3 style={{ marginTop: 0, marginBottom: "1rem", fontSize: "1.1rem", color: "#e5e7eb", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>To Do</h3>
              <div style={{ background: "#374151", padding: "1rem", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.2)", marginBottom: "0.75rem", border: "1px solid #4b5563", color: "#f3f4f6", fontWeight: "500" }}>Design Schema</div>
              <div style={{ background: "#374151", padding: "1rem", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.2)", marginBottom: "0.75rem", border: "1px solid #4b5563", color: "#f3f4f6", fontWeight: "500" }}>Create API</div>
            </div>
            <div style={{ flex: 1, background: "#1f2937", border: "1px solid #374151", borderRadius: "12px", padding: "1.25rem", minHeight: "300px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.2)" }}>
              <h3 style={{ marginTop: 0, marginBottom: "1rem", fontSize: "1.1rem", color: "#e5e7eb", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>In Progress</h3>
              <div style={{ background: "#374151", padding: "1rem", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.2)", marginBottom: "0.75rem", border: "1px solid #4b5563", color: "#f3f4f6", fontWeight: "500" }}>Setup React</div>
            </div>
            <div style={{ flex: 1, background: "#1f2937", border: "1px solid #374151", borderRadius: "12px", padding: "1.25rem", minHeight: "300px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.2)" }}>
              <h3 style={{ marginTop: 0, marginBottom: "1rem", fontSize: "1.1rem", color: "#e5e7eb", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>Done</h3>
            </div>
          </div>
        </div>
      );
    case "REACT-501":
    case "REACT-502":
    case "REACT-503":
    case "REACT-504":
      return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "'Inter', sans-serif", background: "#f9fafb" }}>
          <div style={{ padding: "1.5rem", background: "#ffffff", borderBottom: "1px solid #e5e7eb", fontSize: "1.25rem", fontWeight: "600", color: "#1f2937" }}>General Chat</div>
          <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <span style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem", fontWeight: "600" }}>Alice</span>
              <div style={{ padding: "0.75rem 1rem", background: "#e5e7eb", borderRadius: "12px 12px 12px 0", color: "#1f2937", maxWidth: "80%" }}>Hello!</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <span style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem", fontWeight: "600" }}>Bob</span>
              <div style={{ padding: "0.75rem 1rem", background: "#3b82f6", borderRadius: "12px 12px 12px 0", color: "white", maxWidth: "80%" }}>Hi Alice!</div>
            </div>
          </div>
          <div style={{ padding: "1.5rem", background: "#ffffff", borderTop: "1px solid #e5e7eb", display: "flex", gap: "1rem" }}>
            <input placeholder="Type a message..." disabled style={{ flex: 1, padding: "0.75rem 1rem", border: "1px solid #d1d5db", borderRadius: "8px", outline: "none", background: "#f3f4f6" }} />
            <button style={{ padding: "0.75rem 1.5rem", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontWeight: "600" }}>Send</button>
          </div>
        </div>
      );
    default:
      return <div>No Target Design preview available.</div>;
  }
}

function UiReferenceView({ ticketId }: { ticketId: string }) {
  let htmlContent = getTargetUI(ticketId);

  if (!htmlContent) {
    htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f3f4f6; color: #374151; text-align: center; }
    .card { background: white; padding: 2rem; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); max-width: 400px; }
    h1 { margin-top: 0; font-size: 1.25rem; }
    p { color: #6b7280; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Target Design: ${ticketId}</h1>
    <p>Construct the layout and components as described in the ticket specification.</p>
  </div>
</body>
</html>`;
  }

  return (
    <iframe
      title="UI Target Preview"
      srcDoc={htmlContent}
      className="w-full h-full border-0 bg-white"
      sandbox="allow-scripts allow-same-origin"
    />
  );
}

type TestResult = { name: string; pass: boolean; time: string; expected?: string; got?: string };
type BottomTab = "output" | "errors" | "tests" | "quality" | "preview" | "terminal";

export function StudentTicketView({
  slug,
  ticketId,
  previewOverride,
}: {
  slug: string;
  ticketId: string;
  previewOverride?: StudentPreviewOverride | null;
}) {
  const navigate = useNavigate();
  const reviewMatch = useMatch({ from: "/lab/$slug/ticket/$ticketId/review", shouldThrow: false });
  const lab = labs.find((l) => l.slug === slug) ?? labs[0];
  const baseTicket = tickets.find((t) => t.id === ticketId) ?? tickets[0];

  const ticket = useMemo(() => {
    if (!previewOverride) return baseTicket;
    return {
      ...baseTicket,
      title: previewOverride.title ?? baseTicket.title,
      description: previewOverride.description ?? baseTicket.description,
      difficulty: (previewOverride.difficulty as typeof baseTicket.difficulty) ?? baseTicket.difficulty,
      xp: previewOverride.xp ?? baseTicket.xp,
      estMin: previewOverride.estMin ?? baseTicket.estMin,
      tag: previewOverride.tag ?? baseTicket.tag,
    };
  }, [baseTicket, previewOverride]);

  const kit = useMemo(() => getKit(slug, ticket.tag, ticket.id), [slug, ticket.tag, ticket.id]);
  const isDjango = kit.name === "django";
  const isJava = kit.name === "java";
  const isSql = kit.name === "sql";
  const isMongo = kit.name === "mongo";
  const isUi = kit.name === "ui";
  const isReact = kit.name === "react";
  const isPython = kit.name === "python";
  const isMultiLang = slug === "programming" || slug === "datastructures";
  type ProgLang = "python" | "c" | "cpp" | "js";
  const PROG_EXT: Record<ProgLang, string> = { python: "py", c: "c", cpp: "cpp", js: "js" };
  const PROG_LABEL: Record<ProgLang, string> = { python: "Python 3", c: "C (gcc)", cpp: "C++ (g++)", js: "Node.js" };
  const [progLang, setProgLang] = useState<ProgLang>("python");
  const initialFileList: readonly string[] = kit.fileList;
  const starters: Record<string, string> = useMemo(() => {
    if (previewOverride?.starterCode && kit.primary) {
      return { ...kit.files, [kit.primary]: previewOverride.starterCode };
    }
    return kit.files;
  }, [kit, previewOverride]);
  const primaryFile = kit.primary;


  const [tab, setTab] = useState<"problem" | "hints" | "discuss">("problem");
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [activeFile, setActiveFile] = useState<FileName>(initialFileList[0]);
  const [bottomTab, setBottomTab] = useState<BottomTab>("tests");
  const [hintLevel, setHintLevel] = useState(2);
  const [elapsed, setElapsed] = useState(0);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [showProgress, setShowProgress] = useState(true);
  const [fileTreeOpen, setFileTreeOpen] = useState(true);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const toggleFolder = (k: string) => setOpenFolders((o) => ({ ...o, [k]: !(o[k] ?? true) }));
  const isFolderOpen = (k: string) => openFolders[k] ?? true;
  const [sidePanel, setSidePanel] = useState<null | "preview" | "mentor">(null);
  const [previewDevice, setPreviewDevice] = useState<"Mobile" | "Tablet" | "Desktop">("Desktop");
  const [sideWidth, setSideWidth] = useState<number | null>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    const container = splitContainerRef.current;
    if (!container) return;
    const onMove = (ev: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const next = rect.right - ev.clientX;
      const min = 260;
      const max = Math.max(min + 100, rect.width - 320);
      setSideWidth(Math.min(max, Math.max(min, next)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  useEffect(() => { setSideWidth(null); }, [sidePanel]);
  const [files, setFiles] = useState<Record<string, string>>(starters);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const fileList = useMemo(() => Object.keys(files), [files]);

  // Reset file state when switching tickets (esp. between Java and Django sets)
  useEffect(() => {
    setFiles(starters);
    setDirty({});
    setActiveFile(initialFileList[0]);
    setTestsRan(false);
    setOutput("");
    if (isMultiLang) setProgLang("python");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

  function progStarter(lang: ProgLang, title: string): string {
    const banner = `${title}`;
    switch (lang) {
      case "python":
        return `"""${banner}"""\n\ndef solve():\n    # TODO: implement\n    pass\n\n\nif __name__ == "__main__":\n    print("Hello from Python")\n    solve()\n`;
      case "c":
        return `/* ${banner} */\n#include <stdio.h>\n\nint main(void) {\n    printf("Hello from C\\n");\n    return 0;\n}\n`;
      case "cpp":
        return `// ${banner}\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello from C++" << endl;\n    return 0;\n}\n`;
      case "js":
        return `// ${banner}\nfunction solve() {\n  // TODO: implement\n}\n\nconsole.log("Hello from JavaScript");\nsolve();\n`;
    }
  }

  function switchProgLang(next: ProgLang) {
    if (next === progLang) return;
    const ext = PROG_EXT[next];
    const fname = `main.${ext}`;
    setProgLang(next);
    setFiles((f) => {
      if (f[fname] !== undefined) return f;
      return { ...f, [fname]: progStarter(next, ticket.title) };
    });
    setActiveFile(fname);
  }


  // ---- File ops (VS Code-like): create / rename / delete ----
  function createFile(path: string, contents = "") {
    const trimmed = path.trim().replace(/^\/+/, "");
    if (!trimmed) return;
    if (files[trimmed] !== undefined) { showToast("File already exists"); return; }
    setFiles((f) => ({ ...f, [trimmed]: contents }));
    setDirty((d) => ({ ...d, [trimmed]: true }));
    setActiveFile(trimmed);
  }
  function renameFile(oldPath: string, newPath: string) {
    const trimmed = newPath.trim().replace(/^\/+/, "");
    if (!trimmed || trimmed === oldPath) return;
    if (files[trimmed] !== undefined) { showToast("Target path already exists"); return; }
    setFiles((f) => {
      const { [oldPath]: content, ...rest } = f;
      return { ...rest, [trimmed]: content ?? "" };
    });
    setDirty((d) => {
      const { [oldPath]: was, ...rest } = d;
      return { ...rest, [trimmed]: true };
    });
    if (activeFile === oldPath) setActiveFile(trimmed);
  }
  function deleteFile(path: string) {
    if (!confirm(`Delete ${path}?`)) return;
    setFiles((f) => {
      const { [path]: _drop, ...rest } = f;
      return rest;
    });
    setDirty((d) => {
      const { [path]: _drop, ...rest } = d;
      return rest;
    });
    if (activeFile === path) {
      const next = Object.keys(files).filter((p) => p !== path)[0];
      if (next) setActiveFile(next);
    }
  }
  function deleteFolder(prefix: string) {
    const targets = Object.keys(files).filter((p) => p === prefix || p.startsWith(prefix + "/"));
    if (targets.length === 0) return;
    if (!confirm(`Delete folder ${prefix}/ and ${targets.length} file(s)?`)) return;
    setFiles((f) => {
      const next = { ...f };
      targets.forEach((p) => { delete next[p]; });
      return next;
    });
    setDirty((d) => {
      const next = { ...d };
      targets.forEach((p) => { delete next[p]; });
      return next;
    });
    if (targets.includes(activeFile)) {
      const remaining = Object.keys(files).filter((p) => !targets.includes(p));
      if (remaining[0]) setActiveFile(remaining[0]);
    }
  }
  const [output, setOutput] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [tests, setTests] = useState<TestResult[]>([
    { name: "Test 1 · Variables Declaration", pass: false, time: "—" },
    { name: "Test 2 · Type Casting (implicit)", pass: false, time: "—" },
    { name: "Test 3 · Type Casting (explicit)", pass: false, time: "—" },
    { name: "Test 4 · String Operations", pass: false, time: "—" },
    { name: "Test 5 · Output Format", pass: false, time: "—" },
  ]);
  const [testsRan, setTestsRan] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Keyboard: Ctrl/Cmd+Enter to run
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); handleRun(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  });

  const passed = tests.filter((t) => t.pass).length;
  const allPass = testsRan && passed === tests.length;
  const timeStr = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  const code = files[activeFile];

  // Simple compile-state heuristic based on Main.java code
  const compileState: "ok" | "warn" | "err" = useMemo(() => {
    const m = files["Main.java"];
    if (!/class\s+\w+/.test(m) || !/public\s+static\s+void\s+main/.test(m)) return "err";
    if (/\bcastedDouble\b/.test(m) && !/println.*castedDouble|System\.out.*castedDouble/.test(m)) return "warn";
    return "ok";
  }, [files]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function handleRun() {
    setRunning(true);
    setBottomTab("output");
    const src = files[activeFile] ?? "";
    const file = activeFile;

    if (isMultiLang) {
      const lang: ProgLang =
        file.endsWith(".c")   ? "c"   :
        file.endsWith(".cpp") || file.endsWith(".cc") ? "cpp" :
        file.endsWith(".js")  || file.endsWith(".ts") ? "js"  :
        "python";
      const cmd =
        lang === "python" ? `$ python ${file}` :
        lang === "c"      ? `$ gcc ${file} -o a.out && ./a.out` :
        lang === "cpp"    ? `$ g++ ${file} -std=c++17 -o a.out && ./a.out` :
                            `$ node ${file}`;
      setOutput(`${cmd}\n…running…\n`);
      setTimeout(() => {
        const out: string[] = [];
        if (lang === "python") {
          const re = /print\(\s*(?:f?["'])([^"']*)["']\s*\)/g;
          let m; while ((m = re.exec(src))) out.push(m[1]);
        } else if (lang === "js") {
          const re = /console\.log\(\s*["'`]([^"'`]*)["'`]\s*\)/g;
          let m; while ((m = re.exec(src))) out.push(m[1]);
        } else if (lang === "c") {
          const re = /printf\(\s*"([^"]*)"/g;
          let m; while ((m = re.exec(src))) out.push(m[1].replace(/\\n/g, ""));
        } else {
          const re = /cout\s*<<\s*"([^"]*)"/g;
          let m; while ((m = re.exec(src))) out.push(m[1]);
        }
        setOutput(`${cmd}\n${out.join("\n")}\n\n✓ Process finished (0.3s) · ${PROG_LABEL[lang]}`);
        setRunning(false);
      }, 500);
      return;
    }
    if (isPython) {
      setOutput(`$ python ${file}\n…running…\n`);
      setTimeout(() => {
        if (/from flask import Flask/.test(src) || /import Flask/.test(src)) {
            setOutput(`$ python ${file}\n * Serving Flask app '${file}'\n * Debug mode: on\n * Running on http://127.0.0.1:5000\n✓ Server started successfully`);
        } else {
            const out: string[] = [];
            const re = /print\(\s*(?:f?["'])([^"']*)["']\s*\)/g;
            let m; while ((m = re.exec(src))) out.push(m[1]);
            if (out.length > 0) {
                setOutput(`$ python ${file}\n${out.join("\n")}\n\n✓ Process finished (0.3s)`);
            } else {
                setOutput(`$ python ${file}\n\n✓ Process finished with exit code 0`);
            }
        }
        setRunning(false);
      }, 500);
      return;
    }
    if (isSql) {
      setOutput(`-- Executing ${file} on PostgreSQL 16\n…running…`);
      setTimeout(() => {
        setOutput(`-- Executed ${file}\n✓ Query ran successfully. See Results tab in the preview panel.`);
        setRunning(false);
      }, 500);
      return;
    }
    if (isMongo) {
      setOutput(`> load("${file}")\n…running…`);
      setTimeout(() => {
        setOutput(`> load("${file}")\n✓ mongosh executed. See Results tab in the preview panel.`);
        setRunning(false);
      }, 500);
      return;
    }
    if (isUi) {
      setOutput(`▶ Served ${file} in preview iframe.\n✓ Hot reload OK.`);
      setRunning(false);
      return;
    }
    if (isReact) {
      setOutput(`▶ Compiled virtual components using Babel Standalone.\n▶ Mounted React tree inside preview frame.\n✓ Hot reload OK.`);
      setRunning(false);
      return;
    }
    if (isDjango) {
      setOutput(`$ python manage.py runserver\n…starting Django dev server…\n✓ Running on http://127.0.0.1:8000/`);
      setRunning(false);
      return;
    }
    // Java fallback
    setOutput("$ javac Main.java\n$ java Main\n…running…\n");
    setTimeout(() => {
      const m = files["Main.java"] ?? "";
      if (compileState === "err") {
        setOutput("$ javac Main.java\n❌ Main.java:1: error: class or main method missing\n1 error");
        setBottomTab("errors");
      } else {
        const out: string[] = [];
        const re = /System\.out\.println\("([^"]*)"\s*\+\s*([^)]+)\)/g;
        let match;
        const ctx: Record<string, string> = {
          integerValue: "42", pi: "3.14", isJavaFun: "true", greeting: "Hello Java",
        };
        while ((match = re.exec(m))) {
          const label = match[1];
          let val = match[2].trim();
          if (val.endsWith(".length()")) val = String(("Hello Java").length);
          else if (val.endsWith(".charAt(0)")) val = "H";
          else val = ctx[val] ?? val;
          out.push(label + val);
        }
        setOutput("$ javac Main.java\n$ java Main\n" + out.join("\n") + "\n\n✓ Program ran successfully (1.2s)");
      }
      setRunning(false);
    }, 700);
  }



function getPythonTests(ticketId: string, files: Record<string, string>): TestResult[] {
  const src = files["app.py"] || files["comments.py"] || files["csrf.py"] || Object.values(files)[0] || "";
  if (ticketId === "SEC-101") {
    return [
      { name: "Test 1 · Parameterized Query Used", pass: /\?/.test(src) && !/f"/.test(src) && /cursor\.execute\(.*?,.*?\)/.test(src), time: "8ms" },
      { name: "Test 2 · Prevents SQL Injection (admin' OR 1=1 --)", pass: /\?/.test(src), time: "11ms" },
      { name: "Test 3 · Valid Login Succeeds", pass: true, time: "9ms" }
    ];
  } else if (ticketId === "SEC-102") {
    return [
      { name: "Test 1 · Imports bleach", pass: /import bleach/.test(src), time: "4ms" },
      { name: "Test 2 · Allows safe tags", pass: /bleach\.clean\(.*?(tags=.*?)?\)/.test(src), time: "8ms" },
      { name: "Test 3 · Strips <script> tags", pass: /bleach\.clean\(.*?(strip=True.*?)?\)/.test(src), time: "9ms" }
    ];
  } else if (ticketId === "SEC-103") {
    return [
      { name: "Test 1 · Generates secure random token", pass: /os\.urandom\(32\)/.test(src), time: "5ms" },
      { name: "Test 2 · Enforces token on state-changing methods", pass: /request\.method\s*in\s*\[.*'POST'.*\]/.test(src), time: "7ms" },
      { name: "Test 3 · Aborts if token invalid", pass: /abort\(403/.test(src), time: "6ms" }
    ];
  }
  return [
    { name: "Test 1 · Syntax Check", pass: true, time: "10ms" },
    { name: "Test 2 · Execution Successful", pass: true, time: "15ms" }
  ];
}

  function handleRunTests() {
    setBottomTab("tests");
    setTests((ts) => ts.map((t) => ({ ...t, time: "…", pass: false })));
    setTimeout(() => {
      if (isReact) {
        const next = getReactTests(ticket.id, files);
        setTests(next);
        setTestsRan(true);
        return;
      }
      if (isUi) {
        const next = getUITests(ticket.id, files);
        setTests(next);
        setTestsRan(true);
        return;
      }
      if (isPython) {
        const next = getPythonTests(ticket.id, files);
        setTests(next);
        setTestsRan(true);
        return;
      }
      const m = files["Main.java"];
      const next: TestResult[] = [
        { name: "Test 1 · Variables Declaration", pass: /int\s+\w+\s*=/.test(m) && /double\s+\w+\s*=/.test(m), time: "12ms" },
        { name: "Test 2 · Type Casting (implicit)", pass: /double\s+\w+\s*=\s*\w+\s*;/.test(m), time: "8ms" },
        { name: "Test 3 · Type Casting (explicit)", pass: /\(int\)\s*\w/.test(m), time: "9ms" },
        { name: "Test 4 · String Operations", pass: /\.length\(\)/.test(m) && /\.charAt\(/.test(m), time: "7ms" },
        { name: "Test 5 · Output Format", pass: /printf\(/.test(m), time: "11ms", expected: '"Result: 42"', got: '"Result42"' },
      ];
      setTests(next);
      setTestsRan(true);
    }, 600);
  }

  function handleSubmit() {
    setBottomTab("tests");
    setTests((ts) => ts.map((t) => ({ ...t, time: "…", pass: false })));
    setTimeout(() => {
      if (isReact) {
        const next = getReactTests(ticket.id, files);
        setTests(next);
        setTestsRan(true);
        if (next.every((t) => t.pass)) {
          const finalScore = calculateReactMatchScore(ticket.id, files);
          saveTicketState(ticket.id, { status: "Completed", score: finalScore });
          ticket.status = "Completed";
          ticket.score = finalScore;
          navigate({ to: "/lab/$slug/ticket/$ticketId/review", params: { slug, ticketId } });
        } else {
          showToast("Fix failing tests before submitting");
        }
        return;
      }
      if (isUi) {
        const next = getUITests(ticket.id, files);
        setTests(next);
        setTestsRan(true);
        if (next.every((t) => t.pass)) {
          saveTicketState(ticket.id, { status: "Completed", score: 100 });
          ticket.status = "Completed";
          ticket.score = 100;
          navigate({ to: "/lab/$slug/ticket/$ticketId/review", params: { slug, ticketId } });
        } else {
          showToast("Fix failing tests before submitting");
        }
        return;
      }
      if (isPython) {
        const next = getPythonTests(ticket.id, files);
        setTests(next);
        setTestsRan(true);
        if (next.every((t) => t.pass)) {
          saveTicketState(ticket.id, { status: "Completed", score: 100 });
          ticket.status = "Completed";
          ticket.score = 100;
          navigate({ to: "/lab/$slug/ticket/$ticketId/review", params: { slug, ticketId } });
        } else {
          showToast("Fix failing tests before submitting");
        }
        return;
      }
      const m = files["Main.java"];
      const next: TestResult[] = [
        { name: "Test 1 · Variables Declaration", pass: /int\s+\w+\s*=/.test(m) && /double\s+\w+\s*=/.test(m), time: "12ms" },
        { name: "Test 2 · Type Casting (implicit)", pass: /double\s+\w+\s*=\s*\w+\s*;/.test(m), time: "8ms" },
        { name: "Test 3 · Type Casting (explicit)", pass: /\(int\)\s*\w/.test(m), time: "9ms" },
        { name: "Test 4 · String Operations", pass: /\.length\(\)/.test(m) && /\.charAt\(/.test(m), time: "7ms" },
        { name: "Test 5 · Output Format", pass: /System\.out\.println/.test(m) || /printf\(/.test(m), time: "11ms" },
      ];
      setTests(next);
      setTestsRan(true);
      if (next.every((t) => t.pass)) {
        navigate({ to: "/lab/$slug/ticket/$ticketId/review", params: { slug, ticketId } });
      } else {
        showToast("Fix failing tests before submitting");
      }
    }, 600);
  }

  function handleSave() {
    setDirty(Object.fromEntries(Object.keys(files).map((k) => [k, false])));
    const now = new Date();
    setSavedAt(`${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`);
    showToast("Saved");
  }

  function handleReset() {
    if (!confirm("Reset code to starter template?")) return;
    setFiles({ ...starters });
    setDirty({});
    setActiveFile(initialFileList[0]);
    setTestsRan(false);
    setOutput("");
    showToast("Code reset");
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(files["Main.java"]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      showToast("Template copied");
    } catch {
      showToast("Copy failed");
    }
  }

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(`${ticket.id} solution by @alex\n\n\`\`\`java\n${files["Main.java"]}\n\`\`\``);
      showToast("Share link copied");
    } catch { showToast("Copy failed"); }
  }

  function updateCode(v: string) {
    setFiles((f) => ({ ...f, [activeFile]: v }));
    setDirty((d) => ({ ...d, [activeFile]: true }));
    if (ticket.status === "Not Started") {
      saveTicketState(ticket.id, { status: "In Progress" });
      ticket.status = "In Progress";
    }
  }

  function toggleTheme() {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  }

  if (reviewMatch) return <Outlet />;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top sub-bar (no global nav — full-page editor) */}
      <div className="flex flex-wrap items-center gap-3 border-b bg-card/60 px-3 py-2 text-xs">
        <Link to="/lab/$slug" params={{ slug }} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-accent">
          <ArrowLeft className="h-3 w-3" />Exit
        </Link>
        <button onClick={() => setLeftCollapsed((v) => !v)} title="Toggle panel"
          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-accent">
          {leftCollapsed ? <PanelLeftOpen className="h-3 w-3" /> : <PanelLeftClose className="h-3 w-3" />}
          <span className="hidden md:inline">{leftCollapsed ? "Show" : "Hide"} panel</span>
        </button>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span className="text-foreground font-mono">{ticket.id}</span>
        </div>
        <StatusBadge value={ticket.status} />
        <DiffBadge value={ticket.difficulty} />
        <span className="text-muted-foreground inline-flex items-center gap-1"><Zap className="h-3 w-3 text-primary" />+{ticket.xp} XP</span>
        <span className="text-muted-foreground inline-flex items-center gap-1"><Clock className="h-3 w-3" />Est. {ticket.estMin}m · Elapsed <span className="font-mono text-foreground">{timeStr}</span></span>
        {savedAt && <span className="text-success inline-flex items-center gap-1"><Check className="h-3 w-3" />Saved {savedAt}</span>}

        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => setSidePanel((p) => p === "preview" ? null : "preview")}
            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 hover:bg-accent ${sidePanel === "preview" ? "bg-accent text-foreground border-primary/40" : ""}`}>
            <Globe className="h-3 w-3" />Preview
          </button>
          <button onClick={() => setSidePanel((p) => p === "mentor" ? null : "mentor")}
            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 hover:bg-accent ${sidePanel === "mentor" ? "bg-accent text-foreground border-primary/40" : ""}`}>
            <Sparkles className="h-3 w-3" />AI Mentor
          </button>
          <button onClick={handleReset} title="Reset to starter template"
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 hover:bg-accent text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-3 w-3" />
            <span className="hidden md:inline">Reset</span>
          </button>
          <button onClick={handleRun} disabled={running} className="inline-flex items-center gap-1 rounded-md bg-success/20 text-success border border-success/40 px-3 py-1 hover:bg-success/30 font-medium disabled:opacity-60">
            <Play className="h-3 w-3" />{running ? "Running…" : "Run"} <kbd className="hidden md:inline rounded bg-success/20 px-1 text-[10px]">⌘↵</kbd>
          </button>
          <button onClick={handleSubmit}
            className="inline-flex items-center gap-1 rounded-md px-3 py-1 font-medium bg-primary text-primary-foreground hover:opacity-90">
            <Send className="h-3 w-3" />Submit
          </button>
        </div>
      </div>

      {/* MAIN IDE */}
      <div className="flex flex-1 min-h-0">
        {/* Activity bar */}
        <div className="flex w-11 flex-col items-center gap-1 border-r bg-editor-panel py-2 text-muted-foreground">
          <button
            onClick={() => setFileTreeOpen((v) => !v)}
            title={fileTreeOpen ? "Hide Explorer" : "Show Explorer"}
            className={`grid h-9 w-9 place-items-center rounded ${fileTreeOpen ? "text-foreground bg-accent" : "hover:text-foreground"}`}
          ><FileCode2 className="h-4 w-4" /></button>
          {[Search, GitBranch, Bug, Package].map((I, i) => (
            <button key={i} className="grid h-9 w-9 place-items-center rounded hover:text-foreground"><I className="h-4 w-4" /></button>
          ))}
          <Settings className="mt-auto h-4 w-4" />
        </div>

        {/* Left panel (collapsible) */}
        {leftCollapsed ? (
          <aside className="hidden md:flex w-10 flex-col items-center gap-1 border-r bg-editor-panel py-2 text-muted-foreground">
            {[
              { k: "problem", I: BookOpen, label: "Problem" },
              { k: "hints", I: Lightbulb, label: "Hints" },
              { k: "discuss", I: MessageSquare, label: "Discuss" },
            ].map(({ k, I, label }) => (
              <button key={k} title={label} onClick={() => { setLeftCollapsed(false); setTab(k as typeof tab); }}
                className="grid h-9 w-9 place-items-center rounded hover:text-foreground hover:bg-accent">
                <I className="h-4 w-4" />
              </button>
            ))}
            <button onClick={() => setLeftCollapsed(false)} title="Expand panel"
              className="mt-auto grid h-9 w-9 place-items-center rounded hover:text-foreground hover:bg-accent">
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </aside>
        ) : (
          <aside className="hidden md:flex w-[30%] min-w-[300px] max-w-[460px] flex-col border-r bg-editor-panel">
            <div className="flex items-center border-b text-xs">
              {[
                { k: "problem", label: "Problem" },
                { k: "hints", label: "Hints" },
                { k: "discuss", label: "Discuss" },
              ].map((t) => (
                <button key={t.k} onClick={() => setTab(t.k as typeof tab)}
                  className={`px-3 py-2 ${tab === t.k ? "bg-editor-bg text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>{t.label}</button>
              ))}
              <button onClick={() => setLeftCollapsed(true)} title="Collapse panel"
                className="ml-auto mr-2 grid h-7 w-7 place-items-center rounded hover:bg-accent text-muted-foreground hover:text-foreground">
                <PanelLeftClose className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto scrollbar-thin p-4 text-sm space-y-3">
              {tab === "problem" && <ProblemPanel ticket={ticket} />}
              {tab === "hints" && <HintsPanel level={hintLevel} setLevel={setHintLevel} elapsed={elapsed} onUnlock={(n, c) => showToast(`Hint ${n} unlocked${c ? ` (${c})` : ""}`)} />}
              {tab === "discuss" && <DiscussPanel />}
            </div>
          </aside>
        )}

        {/* Center editor */}
        <section className="flex flex-1 min-w-0 flex-col relative">
          <div ref={splitContainerRef} className="flex flex-1 min-h-0">
            {/* File tree */}
            {fileTreeOpen && (
              <div className="flex w-60 shrink-0 flex-col border-r bg-editor-panel text-xs">
                <div className="flex items-center justify-between px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <span>Explorer</span>
                  <div className="flex items-center gap-1 normal-case">
                    <button
                      title="New File"
                      onClick={() => {
                        const name = prompt("New file path (e.g. todos/utils.py)");
                        if (name) createFile(name);
                      }}
                      className="grid h-5 w-5 place-items-center rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                    ><FilePlus className="h-3.5 w-3.5" /></button>
                    <button
                      title="New Folder"
                      onClick={() => {
                        const name = prompt("New folder path (e.g. todos/api)");
                        if (name) {
                          const folder = name.replace(/\/+$/, "");
                          createFile(`${folder}/.gitkeep`, "");
                        }
                      }}
                      className="grid h-5 w-5 place-items-center rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                    ><FolderPlus className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto px-1 pb-2">
                  <FileTree
                    rootLabel={kit.rootLabel}
                    paths={fileList}
                    activeFile={activeFile}
                    dirty={dirty}
                    onOpenFile={setActiveFile}
                    onCreateFile={createFile}
                    onRenameFile={renameFile}
                    onDeleteFile={deleteFile}
                    onDeleteFolder={deleteFolder}
                    isFolderOpen={isFolderOpen}
                    toggleFolder={toggleFolder}
                  />
                </div>
                <div className="mt-auto border-t px-3 py-2 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1"><GitBranch className="h-3 w-3" /> main</div>
                </div>
              </div>
            )}


            <div className="flex flex-1 min-w-0 flex-col">

              {/* Tabs row */}
              <div className="flex items-center border-b bg-editor-panel text-xs overflow-x-auto">
                {fileList.map((f) => (
                  <button key={f} onClick={() => setActiveFile(f)}
                    className={`flex items-center gap-2 border-r px-3 py-2 whitespace-nowrap ${activeFile === f ? "bg-editor-bg text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    <FileCode2 className="h-3 w-3" />{f.split("/").pop()}
                    {dirty[f] && <CircleDot className="h-2.5 w-2.5 text-warning" />}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-2 pr-3 text-[11px] text-muted-foreground whitespace-nowrap">
                  {isMultiLang && (
                    <label className="flex items-center gap-1">
                      <span className="opacity-70">Lang</span>
                      <select
                        value={progLang}
                        onChange={(e) => switchProgLang(e.target.value as ProgLang)}
                        className="rounded border bg-background px-1.5 py-0.5 text-[11px] text-foreground"
                      >
                        <option value="python">Python</option>
                        <option value="c">C</option>
                        <option value="cpp">C++</option>
                        <option value="js">JavaScript</option>
                      </select>
                    </label>
                  )}
                  {isJava && <CompileBadge state={compileState} />}
                  <button onClick={toggleTheme} className="rounded border px-2 py-0.5 hover:bg-accent">
                    {theme === "dark" ? "☀ Light" : "🌙 Dark"}
                  </button>
                  <button title="Format" onClick={() => showToast("Code formatted")} className="rounded border px-2 py-0.5 hover:bg-accent"><Wand2 className="h-3 w-3" /></button>
                </div>
              </div>

              {/* Breadcrumb path (VS Code style) */}
              <div className="flex items-center gap-1 border-b bg-editor-bg/60 px-3 py-1 text-[11px] text-muted-foreground overflow-x-auto whitespace-nowrap">
                <Folder className="h-3 w-3 text-info shrink-0" />
                {activeFile.split("/").map((seg, i, arr) => {
                  const isLast = i === arr.length - 1;
                  return (
                    <span key={i} className="inline-flex items-center gap-1">
                      {i > 0 && <ChevronRight className="h-3 w-3 opacity-60" />}
                      <span className={isLast ? "text-foreground" : ""}>
                        {isLast ? <FileCode2 className="inline h-3 w-3 mr-1 text-info" /> : null}
                        {seg}
                      </span>
                    </span>
                  );
                })}
                <span className="ml-auto pl-3 text-[10px] uppercase tracking-wider">
                  {editorLanguage(activeFile)}
                </span>
              </div>

              {/* Editor */}
              <div className="flex flex-1 min-h-0">
                <CodeEditor code={code} onChange={updateCode} language={editorLanguage(activeFile)} theme={theme} />
              </div>


              {/* Bottom panel */}
              <div className="border-t bg-editor-panel">
                <div className="flex items-center border-b text-xs overflow-x-auto">
                  {[
                    { k: "output", label: "Console", icon: TerminalIcon },
                    { k: "errors", label: "Errors", icon: AlertTriangle },
                    { k: "preview", label: isSql || isMongo ? "Results" : "Preview", icon: Globe },
                    { k: "terminal", label: "Terminal", icon: TerminalIcon },
                  ].map((t) => (
                    <button key={t.k} onClick={() => setBottomTab(t.k as BottomTab)}
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 uppercase tracking-wide ${bottomTab === t.k ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                      <t.icon className="h-3 w-3" />{t.label}
                    </button>
                  ))}
                </div>
                <div className="h-52 overflow-auto scrollbar-thin p-3 text-xs">
                  {bottomTab === "output" && <OutputView output={output} />}
                  {bottomTab === "errors" && <ErrorsView state={compileState} />}
                  {bottomTab === "preview" && (
                    isDjango ? <DjangoTodoPreview /> :
                    isSql    ? <SqlResultsView query={files[activeFile] ?? ""} /> :
                    isMongo  ? <MongoResultsView query={files[activeFile] ?? ""} /> :
                    isUi     ? <UiPreview files={files} /> :
                    isReact  ? <UiPreview files={files} /> :
                    isPython ? <PythonOutputView code={files[activeFile] ?? ""} /> :
                               <PreviewView />
                  )}
                  {bottomTab === "terminal" && <TerminalView />}
                </div>
              </div>
            </div>

            {sidePanel && (
              <div
                role="separator"
                onMouseDown={startResize}
                className="w-1 cursor-col-resize bg-border hover:bg-primary/50 transition-colors"
                title="Drag to resize"
              />
            )}
            {sidePanel && (
              <aside
                className="flex flex-col bg-editor-panel min-w-0"
                style={{ flex: sideWidth != null
                  ? `0 0 ${sideWidth}px`
                  : `0 0 ${sidePanel === "preview" ? "clamp(360px, 44%, 680px)" : "clamp(320px, 36%, 540px)"}` }}
              >
                <div className="flex items-center gap-2 border-b px-3 py-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-medium whitespace-nowrap">
                    {sidePanel === "preview" ? <><Globe className="h-3 w-3" />Live Preview</> : <><Sparkles className="h-3 w-3 text-primary" />AI Mentor</>}
                  </span>
                  {sidePanel === "preview" && (
                    <div className="flex items-center gap-1">
                      {(["Mobile", "Tablet", "Desktop"] as const).map((d) => (
                        <button key={d} onClick={() => setPreviewDevice(d)}
                          className={`rounded border px-2 py-0.5 text-[10px] ${previewDevice === d ? "bg-accent text-foreground border-primary/40" : "text-muted-foreground hover:bg-accent"}`}>
                          {d}
                        </button>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setSidePanel(null)} className="ml-auto text-muted-foreground hover:text-foreground">✕</button>
                </div>
                <div className="flex-1 overflow-auto scrollbar-thin p-3 text-xs min-w-0">
                  {sidePanel === "preview"
                    ? <SidePreview device={previewDevice} kit={kit} files={files} activeFile={activeFile} ticketId={ticket.id} />
                    : <SideMentor onAsk={(q) => showToast(`Mentor: ${q}`)} />}
                </div>
              </aside>
            )}

          </div>

        </section>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 border-t bg-primary/90 px-3 py-1 text-[11px] text-primary-foreground">
        <span className="inline-flex items-center gap-1"><GitBranch className="h-3 w-3" /> main</span>
        <span>{kit.runtime}</span>
        <span>UTF-8</span>
        <span>LF</span>
        {isJava && (
          <span className="inline-flex items-center gap-1">
            {compileState === "ok" && <><CheckCircle2 className="h-3 w-3" />Compiled</>}
            {compileState === "warn" && <><AlertTriangle className="h-3 w-3" />1 warning</>}
            {compileState === "err" && <><XCircle className="h-3 w-3" />Compile error</>}
          </span>
        )}
        <span className="ml-auto">{activeFile} · {code.split("\n").length} lines</span>
      </div>

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md border bg-card px-4 py-2 text-sm shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ---------- Editor ---------- */

type EditorLang = "java" | "py" | "html" | "md" | "txt" | "sql" | "js" | "css" | "json" | "cpp" | "c";
function editorLanguage(file: string): EditorLang {
  if (file.endsWith(".py")) return "py";
  if (file.endsWith(".html")) return "html";
  if (file.endsWith(".md")) return "md";
  if (file.endsWith(".java")) return "java";
  if (file.endsWith(".sql")) return "sql";
  if (file.endsWith(".cpp") || file.endsWith(".cc") || file.endsWith(".hpp")) return "cpp";
  if (file.endsWith(".c") || file.endsWith(".h")) return "c";
  if (file.endsWith(".js") || file.endsWith(".ts")) return "js";
  if (file.endsWith(".css")) return "css";
  if (file.endsWith(".json")) return "json";
  return "txt";
}

function CodeEditor({ code, onChange, language, theme }: { code: string; onChange: (v: string) => void; language: EditorLang; theme: "dark" | "light" }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const extensions = useMemo(() => {
    switch (language) {
      case "py": return [python()];
      case "java": return [java()];
      case "html": return [cmHtml()];
      case "md": return [cmMarkdown()];
      case "sql": return [sql()];
      case "js": return [javascript({ typescript: true })];
      case "css": return [css()];
      case "json": return [jsonLang()];
      case "cpp":
      case "c": return [cpp()];
      default: return [];
    }
  }, [language]);

  if (!mounted) {
    return (
      <div className="flex flex-1 min-w-0 overflow-hidden bg-editor-bg font-mono text-[13px] leading-6">
        <pre className="flex-1 overflow-auto p-3 text-muted-foreground whitespace-pre">{code}</pre>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden bg-editor-bg">
      <CodeMirror
        value={code}
        onChange={(v) => onChange(v)}
        theme={theme === "dark" ? vscodeDark : vscodeLight}
        extensions={extensions}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          foldGutter: true,
          autocompletion: true,
          bracketMatching: true,
          closeBrackets: true,
          indentOnInput: true,
        }}
        height="100%"
        style={{ flex: 1, fontSize: 13, height: "100%" }}
      />
    </div>
  );
}

/* ---------- Subviews ---------- */

function CompileBadge({ state }: { state: "ok" | "warn" | "err" }) {
  const map = {
    ok: { txt: "Compiled", cls: "text-success border-success/40 bg-success/10", I: CheckCircle2 },
    warn: { txt: "Warnings", cls: "text-warning border-warning/40 bg-warning/10", I: AlertTriangle },
    err: { txt: "Errors", cls: "text-destructive border-destructive/40 bg-destructive/10", I: XCircle },
  } as const;
  const { txt, cls, I } = map[state];
  return <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 ${cls}`}><I className="h-3 w-3" />{txt}</span>;
}

function TestsView({ tests, ran, onRun }: { tests: TestResult[]; ran: boolean; onRun: () => void }) {
  const passed = tests.filter((t) => t.pass).length;
  if (!ran) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <CheckCircle2 className="h-6 w-6" />
        <div>No test results yet</div>
        <button onClick={onRun} className="rounded border bg-primary px-3 py-1 text-xs text-primary-foreground hover:opacity-90">Run tests</button>
      </div>
    );
  }
  return (
    <div className="font-mono space-y-1.5">
      <div className="text-muted-foreground">Running tests… completed in 0.12s</div>
      <div className="border-b border-dashed my-1" />
      {tests.map((t) => (
        <div key={t.name}>
          <div className="flex items-center gap-2">
            {t.pass ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
            <span className={t.pass ? "" : "text-destructive"}>{t.name}</span>
            <span className="ml-auto text-muted-foreground">{t.time}</span>
          </div>
          {!t.pass && t.expected && (
            <div className="ml-5 mt-1 rounded border border-destructive/30 bg-destructive/5 p-1.5 text-[11px] text-destructive/90">
              <div>Expected: <span className="text-success">{t.expected}</span></div>
              <div>Got:      <span className="text-destructive">{t.got}</span></div>
            </div>
          )}
        </div>
      ))}
      <div className="mt-2 border-t pt-2">
        Score: <span className="text-foreground font-semibold">{passed}/{tests.length}</span> ({Math.round((passed / tests.length) * 100)}%)
        {passed < tests.length && <span className="ml-2 text-destructive">Submit when all tests pass.</span>}
      </div>
    </div>
  );
}

function OutputView({ output }: { output: string }) {
  if (!output) return <div className="text-muted-foreground">Click <span className="text-foreground font-medium">Run</span> to execute your code.</div>;
  return <pre className="font-mono text-muted-foreground whitespace-pre-wrap">{output}</pre>;
}

function ErrorsView({ state }: { state: "ok" | "warn" | "err" }) {
  const items = state === "err" ? [
    { sev: "err" as const, line: 1, msg: "Missing class or main method", fix: "Ensure 'public class Main { public static void main(String[] args) {} }'" },
  ] : state === "warn" ? [
    { sev: "warn" as const, line: 18, msg: "Unused variable 'castedDouble'", fix: "Remove the declaration or print it" },
  ] : [];
  if (!items.length) return <div className="text-muted-foreground inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" />No errors or warnings.</div>;
  return (
    <div className="space-y-1.5 font-mono">
      {items.map((e, i) => (
        <div key={i} className={`rounded border p-2 ${e.sev === "err" ? "border-destructive/30 bg-destructive/5" : "border-warning/30 bg-warning/5"}`}>
          <div className="flex items-center gap-2">
            {e.sev === "err" ? <XCircle className="h-3 w-3 text-destructive" /> : <AlertTriangle className="h-3 w-3 text-warning" />}
            <span className="underline-offset-2">Main.java:{e.line}</span>
            <span className={e.sev === "err" ? "text-destructive" : "text-warning"}>{e.msg}</span>
          </div>
          <div className="mt-1 ml-5 text-[11px] text-muted-foreground">💡 {e.fix}</div>
        </div>
      ))}
    </div>
  );
}

function QualityView({ code }: { code: string }) {
  const todos = (code.match(/TODO/g) ?? []).length;
  const score = Math.max(4, 10 - todos);
  const items = [
    { ok: true, t: "Naming conventions followed" },
    { ok: true, t: "No unused imports" },
    { ok: todos === 0, sev: "warn" as const, t: `Resolve ${todos} TODO comment${todos === 1 ? "" : "s"}` },
    { ok: code.includes("/**") || code.includes("//"), sev: "warn" as const, t: "Add comments to explain logic" },
    { ok: code.split("\n").length < 40, sev: "err" as const, t: "Method too long — consider refactoring" },
  ];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="text-2xl font-semibold">{score}<span className="text-muted-foreground text-sm">/10</span></div>
        <div className="flex-1 h-2 rounded-full bg-accent overflow-hidden">
          <div className="h-full bg-success transition-all" style={{ width: `${score * 10}%` }} />
        </div>
      </div>
      <ul className="space-y-1 font-mono">
        {items.map((i, k) => (
          <li key={k} className="flex items-center gap-2">
            {i.ok
              ? <CheckCircle2 className="h-3 w-3 text-success" />
              : i.sev === "warn" ? <AlertTriangle className="h-3 w-3 text-warning" /> : <XCircle className="h-3 w-3 text-destructive" />}
            <span className={i.ok ? "" : i.sev === "warn" ? "text-warning" : "text-destructive"}>{i.t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PreviewView() {
  return (
    <div className="flex h-full gap-2">
      <div className="flex-1 rounded border bg-white text-black p-3">
        <div className="text-[10px] uppercase tracking-wider text-gray-500">Live preview</div>
        <h2 className="mt-1 text-lg font-semibold">Hello Java</h2>
        <p className="text-sm text-gray-600">Length: 10 · Char[0]: H</p>
        <button className="mt-2 rounded bg-blue-600 px-3 py-1 text-xs text-white">Run sample</button>
      </div>
      <div className="w-40 space-y-1 text-[11px] text-muted-foreground">
        <div className="font-semibold text-foreground">Responsive</div>
        {["Mobile 375", "Tablet 768", "Desktop 1280"].map((d) => (
          <button key={d} className="block w-full rounded border px-2 py-1 text-left hover:bg-accent">{d}</button>
        ))}
      </div>
    </div>
  );
}

function SidePreview({ device, kit, files, activeFile, ticketId }: { device: "Mobile" | "Tablet" | "Desktop"; kit: Kit; files: Record<string, string>; activeFile: string; ticketId: string }) {
  const isReact = kit.name === "react";
  const isUi = kit.name === "ui";
  const w = device === "Mobile" ? 375 : device === "Tablet" ? 768 : "100%";
  
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [visualScore, setVisualScore] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculateScore = async (codeScore: number) => {
    setIsCalculating(true);
    try {
      const uiAContainer = document.getElementById("ui-a-capture");
      const uiB = document.getElementById("ui-b-capture");
      
      const uiAIframe = uiAContainer?.querySelector("iframe");
      const uiA = uiAIframe?.contentDocument?.body;
      
      if (!uiA || !uiB) {
        alert("Missing UI elements to capture. Could not access iframe content.");
        return;
      }
      
      // Pass { logging: false, useCORS: true } if needed, though srcDoc should be fine
      const blobA = await toBlob(uiA, { cacheBust: true, backgroundColor: '#ffffff' });
      const blobB = await toBlob(uiB, { cacheBust: true, backgroundColor: '#ffffff' });
      
      if (!blobA || !blobB) return;
      
      const formData = new FormData();
      formData.append("image2", blobA); // Student UI
      formData.append("image1", blobB); // Target UI
      
      const res = await fetch("http://localhost:5000/api/compare", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (data.score !== undefined) {
        setVisualScore(data.score);
        // Average the Regex Code score and the Visual SSIM score (50/50 weighting)
        const combined = (codeScore * 0.5) + (data.score * 0.5);
        setFinalScore(combined);
      }
    } catch (e: any) {
      console.error(e);
      alert("Error capturing screenshot: " + (e.message || String(e)));
    } finally {
      setIsCalculating(false);
    }
  };
  
  if (isReact || isUi) {
    const score = isReact ? calculateReactMatchScore(ticketId, files) : calculateUIMatchScore(ticketId, files);
    return (
      <div className="flex flex-col h-full gap-2 text-xs">
        <div className="flex items-center justify-between border-b pb-1.5 font-medium">
          <span className="inline-flex items-center gap-2">
            <Gauge className="h-3.5 w-3.5 text-primary" /> Visual Similarity Score
            <button 
              onClick={() => handleCalculateScore(score)}
              disabled={isCalculating}
              className="ml-2 px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] hover:bg-blue-700 disabled:opacity-50"
            >
              {isCalculating ? "Calculating..." : "Calculate Final Score"}
            </button>
          </span>
          <div className="text-right">
            <span className="text-sm font-semibold text-success">
              {finalScore !== null ? `${finalScore.toFixed(1)}% Match` : `${score}% Match (Code)`}
            </span>
            {visualScore !== null && (
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {score}% Code + {visualScore.toFixed(1)}% Visual
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
          <div className="flex flex-col min-h-0 border rounded overflow-hidden">
            <div className="bg-accent/40 px-2 py-1 border-b font-medium text-[9px] uppercase tracking-wide">UI A: Your Component</div>
            <div id="ui-a-capture" className="flex-1 min-h-0 relative bg-white">
              <UiPreview files={files} fullHeight />
            </div>
          </div>
          <div className="flex flex-col min-h-0 border rounded overflow-hidden">
            <div className="bg-accent/40 px-2 py-1 border-b font-medium text-[9px] uppercase tracking-wide">UI B: Target Design</div>
            <div id="ui-b-capture" className="flex-1 min-h-0 overflow-auto bg-white">
              {isReact ? <ReactReferenceView ticketId={ticketId} /> : <UiReferenceView ticketId={ticketId} />}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const body =
    kit.name === "django" ? <DjangoTodoApp /> :
    kit.name === "sql"    ? <SqlResultsView query={files[activeFile] ?? ""} /> :
    kit.name === "mongo"  ? <MongoResultsView query={files[activeFile] ?? ""} /> :
    kit.name === "python" ? <PythonOutputView code={files[activeFile] ?? ""} /> :
    (
      <div className="p-4 space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-gray-500">Live preview</div>
        <h2 className="text-xl font-semibold">Hello Java</h2>
        <p className="text-sm text-gray-600">Integer: 42 · Double: 3.14</p>
        <p className="text-sm text-gray-600">Length: 10 · Char[0]: H</p>
        <button className="rounded bg-blue-600 px-3 py-1 text-xs text-white">Run sample</button>
      </div>
    );
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex-1 grid place-items-center overflow-auto rounded border bg-accent/30 p-2">
        <div className="mx-auto h-full w-full overflow-auto rounded bg-white text-black shadow" style={{ width: w, maxWidth: "100%" }}>
          {body}
        </div>
      </div>
    </div>
  );
}

function DjangoTodoPreview() {
  return (
    <div className="h-full overflow-auto rounded border bg-white text-black">
      <DjangoTodoApp />
    </div>
  );
}

type TodoItem = { id: number; title: string; completed: boolean };

function DjangoTodoApp() {
  const [todos, setTodos] = useState<TodoItem[]>([
    { id: 1, title: "Ship Django todo MVP", completed: false },
    { id: 2, title: "Write models.py", completed: true },
    { id: 3, title: "Render templates with template inheritance", completed: false },
  ]);
  const [title, setTitle] = useState("");
  const nextId = useRef(4);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setTodos((ts) => [{ id: nextId.current++, title: t, completed: false }, ...ts]);
    setTitle("");
  };
  const toggle = (id: number) =>
    setTodos((ts) => ts.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  const remove = (id: number) => setTodos((ts) => ts.filter((t) => t.id !== id));

  const remaining = todos.filter((t) => !t.completed).length;

  return (
    <div className="mx-auto max-w-[560px] p-5 font-sans">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Todos</h1>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">{remaining} left</span>
      </div>
      <p className="mb-4 text-xs text-gray-500">Django 5 · SQLite · {todos.length} item{todos.length === 1 ? "" : "s"}</p>

      <form onSubmit={add} className="mb-4 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <button type="submit" className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Add
        </button>
      </form>

      <ul className="divide-y divide-gray-200 rounded border border-gray-200">
        {todos.length === 0 && <li className="p-4 text-center text-sm text-gray-500">No todos yet — add one above.</li>}
        {todos.map((t) => (
          <li key={t.id} className="flex items-center gap-3 px-3 py-2">
            <button
              onClick={() => toggle(t.id)}
              aria-label="toggle"
              className={`grid h-5 w-5 place-items-center rounded border ${t.completed ? "border-green-600 bg-green-600 text-white" : "border-gray-400 bg-white text-transparent"}`}
            >
              ✓
            </button>
            <span className={`flex-1 text-sm ${t.completed ? "text-gray-400 line-through" : "text-gray-900"}`}>{t.title}</span>
            <button onClick={() => remove(t.id)} className="text-xs text-gray-400 hover:text-red-600" aria-label="delete">
              🗑
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[10px] uppercase tracking-wider text-gray-400">POST /todos/ · CSRF protected</p>
    </div>
  );
}

function SideMentor({ onAsk }: { onAsk: (q: string) => void }) {
  const [msgs, setMsgs] = useState<{ role: "ai" | "me"; text: string }[]>([
    { role: "ai", text: "Hi! I'm your AI mentor. I can give Socratic hints — what are you stuck on?" },
  ]);
  const [input, setInput] = useState("");
  const send = () => {
    if (!input.trim()) return;
    const q = input.trim();
    setMsgs((m) => [...m, { role: "me", text: q }, { role: "ai", text: `Think about what type each value should be. Try declaring an \`int\` and a \`double\`, then cast between them. What happens when you narrow \`3.99\` to \`int\`?` }]);
    onAsk(q);
    setInput("");
  };
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex-1 space-y-2 overflow-auto pr-1">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "me" ? "justify-end" : ""}`}>
            <div className={`max-w-[85%] rounded-md px-2.5 py-1.5 text-[12px] ${m.role === "me" ? "bg-primary text-primary-foreground" : "bg-accent text-foreground"}`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {["Explain this error", "Give a hint", "Review my code", "Why is my test failing?"].map((s) => (
          <button key={s} onClick={() => { setInput(s); }} className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent">{s}</button>
        ))}
      </div>
      <div className="flex gap-1">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask AI mentor…" className="flex-1 rounded border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary" />
        <button onClick={send} className="rounded bg-primary px-3 text-xs text-primary-foreground">Ask</button>
      </div>
    </div>
  );
}

function TerminalView() {
  return (
    <div className="font-mono text-muted-foreground space-y-0.5">
      <div><span className="text-success">alex@labs</span>:<span className="text-info">~/java-101</span>$ javac Main.java</div>
      <div><span className="text-success">alex@labs</span>:<span className="text-info">~/java-101</span>$ java Main</div>
      <div className="text-foreground">{"> Build successful in 1.2s"}</div>
      <div><span className="text-success">alex@labs</span>:<span className="text-info">~/java-101</span>$ <span className="animate-pulse">▌</span></div>
    </div>
  );
}

function ProgressTile({ icon: Icon, label, value, tone, pct }: { icon: typeof Zap; label: string; value: string; tone: "success" | "warning" | "info" | "primary" | "muted"; pct: number }) {
  const color = { success: "text-success", warning: "text-warning", info: "text-info", primary: "text-primary", muted: "text-muted-foreground" }[tone];
  const bar = { success: "bg-success", warning: "bg-warning", info: "bg-info", primary: "bg-primary", muted: "bg-muted-foreground" }[tone];
  return (
    <div className="rounded-md border bg-editor-bg p-2">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-muted-foreground"><Icon className={`h-3 w-3 ${color}`} />{label}</span>
        <span className={`font-semibold ${color}`}>{value}</span>
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-accent overflow-hidden">
        <div className={`h-full ${bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Minimap({ code }: { code: string }) {
  const lines = code.split("\n");
  return (
    <div className="hidden xl:block w-16 border-l bg-editor-bg/60 p-1 overflow-hidden">
      {lines.map((l, i) => (
        <div key={i} className="h-[3px] mb-[1px] rounded-sm" style={{ width: `${Math.min(100, l.trim().length * 2.2)}%`, background: "color-mix(in oklab, var(--muted-foreground) 35%, transparent)" }} />
      ))}
    </div>
  );
}

function ProblemPanel({ ticket }: { ticket: typeof tickets[number] }) {
  const isJava = ticket.id.startsWith("JAVA-");
  const isReact = ticket.id.startsWith("REACT-");

  // Default fallback details
  let descriptionText = ticket.description;
  let learningObjectives = [
    "Understand the core features of this task",
    "Implement the solutions matching instructions",
    "Test edge-cases and handle errors cleanly",
    "Verify performance and correct layout"
  ];
  let tasks = [
    { title: "Understand requirements", items: ["Read the files and comments in the editor", "Identify core functions and variables to implement"] },
    { title: "Implement functionality", items: ["Write clean, well-documented code", "Follow language-specific guidelines"] },
    { title: "Verify output", items: ["Run program and match expected results", "Execute test cases to ensure correct logic"] }
  ];
  let expectedOutput = "See target specification or runs tab for detail.";
  let commonMistakes = [
    "Forgetting to save changes before running tests",
    "Failing to handle null or undefined input bounds",
    "Syntax errors in type casting or function parameters"
  ];

  if (isReact) {
    if (ticket.id === "REACT-101") {
      learningObjectives = [
        "Create reusable React components using functional syntax",
        "Pass and destructure custom props dynamically",
        "Render JSX elements based on props data"
      ];
      tasks = [
        { title: "Task 1 · Create TaskItem Component", items: ["Accept a 'task' prop containing text and completed status", "Render an input checkbox bound to completed status", "Render the task text and a delete button", "Export component as default"] }
      ];
      expectedOutput = `TaskItem renders:
- Checkbox input
- Task text label
- Delete button`;
      commonMistakes = [
        "Incorrect props naming (case-sensitivity)",
        "Forgot default export statement in TaskItem",
        "Not wrapping the component return in a single parent element (e.g., <li>)"
      ];
    } else if (ticket.id === "REACT-102") {
      learningObjectives = [
        "Manage local state with the useState hook",
        "Implement controlled form inputs",
        "Render arrays dynamically using the .map() function"
      ];
      tasks = [
        { title: "Task 1 · State Initialization", items: ["Declare tasks state initialized to an empty array", "Declare newTaskText state for the input"] },
        { title: "Task 2 · Add Task Form", items: ["Create a controlled input bound to newTaskText", "Handle form submit to append a new task to the tasks array"] },
        { title: "Task 3 · Render Task List", items: ["Map over the tasks array", "Render a TaskItem component for each task"] }
      ];
      expectedOutput = `To-Do UI:
- Form to type and submit new tasks
- List of tasks updating dynamically
- Clear input field after submission`;
      commonMistakes = [
        "Mutating the tasks array directly (e.g. tasks.push) instead of using the setter",
        "Forgetting to prevent default on form submit",
        "Missing the 'key' prop on mapped TaskItem elements"
      ];
    } else if (ticket.id === "REACT-103") {
      learningObjectives = [
        "Pass callback functions down to child components as props",
        "Update specific array objects immutably",
        "Filter elements out of arrays in React state"
      ];
      tasks = [
        { title: "Task 1 · Action Functions", items: ["Implement toggleTask to flip completed status", "Implement deleteTask to filter a task out of the array"] },
        { title: "Task 2 · Pass Props", items: ["Pass toggleTask and deleteTask as props to TaskItem"] },
        { title: "Task 3 · Trigger Callbacks", items: ["Trigger onToggle when the checkbox changes", "Trigger onDelete when the trash button is clicked"] }
      ];
      expectedOutput = `Interactive Task List:
- Clicking a checkbox toggles its state (and strikethrough styling)
- Clicking the delete button removes the task instantly`;
      commonMistakes = [
        "Mutating the task object directly instead of returning a new object in .map()",
        "Calling the delete function immediately during render instead of wrapping it in an arrow function (onClick={() => onDelete(id)})"
      ];
    } else if (ticket.id === "REACT-104") {
      learningObjectives = [
        "Execute side effects using the useEffect hook",
        "Read from and write to browser localStorage",
        "Synchronize React state with external persistence"
      ];
      tasks = [
        { title: "Task 1 · Initial Load", items: ["Initialize tasks state by reading from localStorage", "Parse the JSON string, or default to an empty array"] },
        { title: "Task 2 · Save Changes", items: ["Add a useEffect hook that triggers whenever 'tasks' changes", "Stringify and save the 'tasks' array to localStorage"] }
      ];
      expectedOutput = `Persistent To-Do App:
- Added tasks survive a page reload
- Deleted or toggled tasks retain their new state after a reload`;
      commonMistakes = [
        "Missing or incorrect dependency array in useEffect",
        "Failing to handle null returns from localStorage.getItem",
        "Not using JSON.stringify() when saving to localStorage"
      ];
    } else if (ticket.id === "REACT-105") {
      learningObjectives = [
        "Understand conditional rendering",
        "Implement view switching states in a Single Page Application",
        "Render complex UI conditionally based on state"
      ];
      tasks = [
        { title: "Task 1 · View Switcher State", items: ["Create a currentView state variable initialized to 'list'", "Add navigation buttons to set currentView to 'list' or 'dashboard'"] },
        { title: "Task 2 · Dashboard Component", items: ["Create a Dashboard component that takes tasks as a prop", "Display total number of tasks and total completed tasks"] },
        { title: "Task 3 · Conditional Render", items: ["Render either the Dashboard or the Task List conditionally based on currentView"] }
      ];
      expectedOutput = `Router UI:
- Navigation bar switches between List and Dashboard views
- Dashboard calculates and displays live task statistics`;
      commonMistakes = [
        "Using anchor <a> tags that trigger a full page refresh instead of buttons",
        "Not passing the tasks array as a prop to the Dashboard component"
      ];
    } else if (ticket.id === "REACT-106") {
      learningObjectives = [
        "Understand global state sharing with React Context",
        "Create React context using createContext API",
        "Provide context values using Provider wrapper",
        "Consume context values in components with useContext"
      ];
      tasks = [
        { title: "Task 1 · Context Creation", items: ["Define ThemeContext and ThemeProvider", "Manage a 'theme' state ('light' or 'dark') inside the provider", "Provide current theme and toggleTheme function"] },
        { title: "Task 2 · App Integration", items: ["Wrap root App with ThemeProvider", "Consume context in MainApp to apply 'theme-light' or 'theme-dark' class"] },
        { title: "Task 3 · Theme Toggle", items: ["Add a button that calls toggleTheme on click"] }
      ];
      expectedOutput = `Theme Context UI:
- Light / Dark theme toggle button
- Background and text colors change globally across the entire app
- Deeply nested components can access the theme context`;
      commonMistakes = [
        "Forgetting to export/import the created ThemeContext",
        "Not wrapping children in the ThemeProvider return statement",
        "Failing to wrap the root application component with the Provider"
      ];
    }
  } else if (isJava) {
    learningObjectives = [
      "Understand primitive data types",
      "Declare and initialize variables",
      "Perform type casting",
      "Work with String operations"
    ];
    tasks = [
      { title: "Task 1 · Create variables for all primitive types", items: ["int, double, boolean, char, long, float, byte, short", "Initialize with appropriate values", "Print them to console"] },
      { title: "Task 2 · Perform type casting", items: ["Implicit: int → double", "Explicit: double → int", "Show before and after values"] },
      { title: "Task 3 · Work with Strings", items: ["Create a String variable", "Use length(), charAt(), substring()", "Print the results"] }
    ];
    expectedOutput = `Integer: 42
Double: 3.14
Boolean: true
String: Hello Java
Length: 10
Character at index 0: H`;
    commonMistakes = [
      "Type mismatch: double → int requires explicit cast",
      "Forgetting (int) when narrowing",
      "charAt out-of-bounds on empty strings"
    ];
  }

  return (
    <>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{ticket.id} · {ticket.tag}</div>
        <h2 className="text-lg font-semibold mt-0.5">{ticket.title}</h2>
        <p className="mt-2 text-muted-foreground">📋 {descriptionText}</p>
      </div>

      <Section title="🎯 Learning objectives">
        <ul className="space-y-1 text-muted-foreground">
          {learningObjectives.map((o, idx) => <li key={idx}>✓ {o}</li>)}
        </ul>
      </Section>

      <Section title="✅ Tasks">
        <div className="space-y-2 text-muted-foreground">
          {tasks.map((t, idx) => (
            <div key={idx}>
              <div className="text-foreground">{t.title}</div>
              <ul className="ml-3 mt-0.5 list-['└─_'] text-[12px]">
                {t.items.map((item, itemIdx) => <li key={itemIdx}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section title="📥 Expected output">
        <pre className="rounded-md bg-editor-bg border p-2 text-[12px] font-mono text-muted-foreground whitespace-pre-wrap">{expectedOutput}</pre>
      </Section>

      <Section title="🔗 Related concepts">
        <ul className="space-y-1 text-info">
          <li>→ {ticket.id.split("-")[0]}-102 · Advanced Concepts</li>
          <li>→ Docs: Best practices and pattern syntax</li>
        </ul>
      </Section>

      <Section title="⚠️ Common mistakes">
        <ul className="space-y-1 text-muted-foreground">
          {commonMistakes.map((m, idx) => <li key={idx}>• {m}</li>)}
        </ul>
      </Section>
    </>
  );
}

function HintsPanel({ level, setLevel, elapsed, onUnlock }: { level: number; setLevel: (n: number) => void; elapsed: number; onUnlock: (n: number, cost: string) => void }) {
  const mins = elapsed / 60;
  const hints = [
    { n: 1, cost: "Free", title: "Think about it", body: "Think about what data type each variable needs. List the 8 Java primitives.", unlockMin: 0 },
    { n: 2, cost: mins >= 5 ? "Free" : `Free in ${Math.ceil(5 - mins)}m`, title: "Approach", body: "First declare all 8 primitive types with sensible defaults. Then print each, then attempt one cast in each direction.", unlockMin: 5 },
    { n: 3, cost: mins >= 15 ? "Free" : "10 XP", title: "Code template", body: "int a = 42;\ndouble b = a;        // implicit\nint c = (int) 3.99;  // explicit", unlockMin: 15 },
    { n: 4, cost: mins >= 25 ? "Free" : "20 XP", title: "Partial solution (50%)", body: "Use greeting.length() + greeting.charAt(0). Now complete the casting part…", unlockMin: 25 },
  ];
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-warning/40 bg-warning/10 p-2 text-xs text-warning">
        <Lightbulb className="inline h-3 w-3 mr-1" /> Progressive hints — unlocking deeper hints costs XP unless you wait.
      </div>
      {hints.map((h) => {
        const unlocked = level >= h.n || mins >= h.unlockMin;
        return (
          <div key={h.n} className="rounded-md border bg-editor-bg p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Level {h.n} · {h.title}</div>
              <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                {unlocked ? <Unlock className="h-3 w-3 text-success" /> : <Lock className="h-3 w-3" />}{h.cost}
              </span>
            </div>
            {unlocked ? (
              <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground font-mono">{h.body}</pre>
            ) : (
              <div className="mt-2 space-y-1">
                <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1"><Clock className="h-3 w-3" />Auto-unlocks at {h.unlockMin}m elapsed</div>
                <button onClick={() => { setLevel(h.n); onUnlock(h.n, h.cost); }} className="w-full rounded border border-dashed py-1.5 text-xs hover:bg-accent">Unlock now for {h.cost}</button>
              </div>
            )}
          </div>
        );
      })}
      <div className="rounded-md border bg-editor-bg p-3 text-xs">
        <div className="font-medium inline-flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" /> Full solution review</div>
        <div className="mt-1 text-muted-foreground">Unlocked after submission — includes annotated solution, alternatives, and best practices.</div>
      </div>
    </div>
  );
}

function DiscussPanel() {
  return (
    <div className="space-y-3 text-xs">
      {[
        { u: "Priya M.", t: "Why does (int)3.99 give 3 and not 4?", r: 12 },
        { u: "Liam K.", t: "Tip: use Integer.MIN_VALUE for edge testing.", r: 4 },
        { u: "Sofia R.", t: "Got 100% — used String.format for clean output.", r: 7 },
      ].map((d, i) => (
        <div key={i} className="rounded-md border p-2 bg-editor-bg">
          <div className="flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[10px]">{d.u[0]}</span><span className="font-medium">{d.u}</span></div>
          <div className="mt-1 text-muted-foreground">{d.t}</div>
          <div className="mt-1 text-[10px] text-muted-foreground">{d.r} replies</div>
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-md border bg-editor-bg/60">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium">
        <span>{title}</span>{open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open && <div className="px-3 pb-3 text-xs">{children}</div>}
    </div>
  );
}

function TreeFolder({ label, open: openProp, onToggle, children }: { label: string; open?: boolean; onToggle?: () => void; children: React.ReactNode }) {
  const [internalOpen, setInternalOpen] = useState(openProp ?? false);
  const isControlled = onToggle !== undefined;
  const open = isControlled ? (openProp ?? false) : internalOpen;
  const handleClick = () => (isControlled ? onToggle!() : setInternalOpen((o) => !o));
  return (
    <div>
      <button onClick={handleClick} className="flex w-full items-center gap-1 rounded px-1.5 py-0.5 hover:bg-accent/60">
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {open ? <FolderOpen className="h-3 w-3 text-info" /> : <Folder className="h-3 w-3 text-info" />}
        <span>{label}</span>
      </button>
      {open && <div className="pl-4">{children}</div>}
    </div>
  );
}
function TreeFile({ name, active, modified, onClick }: { name: string; active?: boolean; modified?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-1.5 rounded px-1.5 py-0.5 text-left ${active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60"}`}>
      <FileCode2 className="h-3 w-3" /><span className="flex-1 truncate">{name}</span>
      {modified && <span className="h-1.5 w-1.5 rounded-full bg-warning" />}
    </button>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
}

function highlight(line: string): string {
  let h = escapeHtml(line);
  h = h.replace(/(\/\/.*$)/g, '<span style="color:var(--syntax-comment)">$1</span>');
  h = h.replace(/(&quot;.*?&quot;|".*?")/g, '<span style="color:var(--syntax-string)">$1</span>');
  h = h.replace(/\b(public|class|static|void|int|double|boolean|String|char|long|float|byte|short|return|if|else|for|while|new|true|false|null|import)\b/g,
    '<span style="color:var(--syntax-keyword)">$1</span>');
  h = h.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:var(--syntax-number)">$1</span>');
  h = h.replace(/\b([a-zA-Z_][\w]*)(?=\()/g, '<span style="color:var(--syntax-fn)">$1</span>');
  return h;
}

/* ---------- VS Code-like File Tree ---------- */

type TreeNode = {
  name: string;
  path: string; // full path from root
  isFile: boolean;
  children: TreeNode[];
};

function buildTree(paths: readonly string[]): TreeNode {
  const root: TreeNode = { name: "", path: "", isFile: false, children: [] };
  for (const full of paths) {
    const parts = full.split("/");
    let cursor = root;
    for (let i = 0; i < parts.length; i++) {
      const seg = parts[i];
      const isLast = i === parts.length - 1;
      const segPath = parts.slice(0, i + 1).join("/");
      let next = cursor.children.find((c) => c.name === seg && c.isFile === isLast);
      if (!next) {
        next = { name: seg, path: segPath, isFile: isLast, children: [] };
        cursor.children.push(next);
      }
      cursor = next;
    }
  }
  // sort: folders first, then alpha
  const sort = (n: TreeNode) => {
    n.children.sort((a, b) => (a.isFile === b.isFile ? a.name.localeCompare(b.name) : a.isFile ? 1 : -1));
    n.children.forEach(sort);
  };
  sort(root);
  return root;
}

type FileTreeProps = {
  rootLabel: string;
  paths: readonly string[];
  activeFile: string;
  dirty: Record<string, boolean>;
  onOpenFile: (path: string) => void;
  onCreateFile: (path: string, contents?: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
  onDeleteFile: (path: string) => void;
  onDeleteFolder: (prefix: string) => void;
  isFolderOpen: (key: string) => boolean;
  toggleFolder: (key: string) => void;
};

function FileTree(props: FileTreeProps) {
  const tree = useMemo(() => buildTree(props.paths), [props.paths]);
  return (
    <div className="space-y-0.5">
      <TreeFolderNode
        node={{ ...tree, name: props.rootLabel, path: "" }}
        depth={0}
        isRoot
        {...props}
      />
    </div>
  );
}

function TreeFolderNode({
  node, depth, isRoot,
  activeFile, dirty,
  onOpenFile, onCreateFile, onRenameFile, onDeleteFile, onDeleteFolder,
  isFolderOpen, toggleFolder,
}: { node: TreeNode; depth: number; isRoot?: boolean } & Omit<FileTreeProps, "paths" | "rootLabel">) {
  const key = node.path || "__root__";
  const open = isFolderOpen(key);
  const pad = { paddingLeft: depth * 10 + 4 };

  const handleNewFile = () => {
    const seed = node.path ? `${node.path}/new-file.py` : "new-file.py";
    const v = prompt("New file path", seed);
    if (v) onCreateFile(v);
  };
  const handleNewFolder = () => {
    const seed = node.path ? `${node.path}/new-folder` : "new-folder";
    const v = prompt("New folder path", seed);
    if (v) onCreateFile(`${v.replace(/\/+$/, "")}/.gitkeep`, "");
  };

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            onClick={() => toggleFolder(key)}
            style={pad}
            className="group flex w-full items-center gap-1 rounded py-0.5 pr-1 text-left hover:bg-accent/60"
          >
            {open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
            {open ? <FolderOpen className="h-3 w-3 shrink-0 text-info" /> : <Folder className="h-3 w-3 shrink-0 text-info" />}
            <span className="truncate">{node.name}</span>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-44">
          <ContextMenuItem onSelect={handleNewFile}><FilePlus className="mr-2 h-3.5 w-3.5" />New File</ContextMenuItem>
          <ContextMenuItem onSelect={handleNewFolder}><FolderPlus className="mr-2 h-3.5 w-3.5" />New Folder</ContextMenuItem>
          {!isRoot && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                onSelect={() => {
                  const next = prompt("Rename folder", node.path);
                  if (next && next !== node.path) {
                    // rename every file under prefix
                    const prefix = node.path + "/";
                    const newPrefix = next.replace(/\/+$/, "") + "/";
                    // gather then rename one-by-one
                    const affected = props_get_paths_under(node, prefix);
                    affected.forEach((p) => onRenameFile(p, p.replace(prefix, newPrefix)));
                  }
                }}
              ><Pencil className="mr-2 h-3.5 w-3.5" />Rename Folder</ContextMenuItem>
              <ContextMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => onDeleteFolder(node.path)}
              ><Trash2 className="mr-2 h-3.5 w-3.5" />Delete Folder</ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
      {open && (
        <div>
          {node.children.map((child) =>
            child.isFile ? (
              <TreeFileNode
                key={child.path}
                node={child}
                depth={depth + 1}
                active={activeFile === child.path}
                modified={dirty[child.path]}
                onOpenFile={onOpenFile}
                onRenameFile={onRenameFile}
                onDeleteFile={onDeleteFile}
              />
            ) : (
              <TreeFolderNode
                key={child.path}
                node={child}
                depth={depth + 1}
                activeFile={activeFile}
                dirty={dirty}
                onOpenFile={onOpenFile}
                onCreateFile={onCreateFile}
                onRenameFile={onRenameFile}
                onDeleteFile={onDeleteFile}
                onDeleteFolder={onDeleteFolder}
                isFolderOpen={isFolderOpen}
                toggleFolder={toggleFolder}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

// helper: collect file paths under a folder node
function props_get_paths_under(node: TreeNode, _prefix: string): string[] {
  const out: string[] = [];
  const walk = (n: TreeNode) => {
    if (n.isFile) out.push(n.path);
    else n.children.forEach(walk);
  };
  walk(node);
  return out;
}

function TreeFileNode({
  node, depth, active, modified, onOpenFile, onRenameFile, onDeleteFile,
}: {
  node: TreeNode;
  depth: number;
  active: boolean;
  modified?: boolean;
  onOpenFile: (path: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
  onDeleteFile: (path: string) => void;
}) {
  const pad = { paddingLeft: depth * 10 + 4 };
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          onClick={() => onOpenFile(node.path)}
          style={pad}
          className={`flex w-full items-center gap-1.5 rounded py-0.5 pr-1 text-left ${
            active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60"
          }`}
        >
          <span className="w-3" />
          <FileCode2 className="h-3 w-3 shrink-0" />
          <span className="flex-1 truncate">{node.name}</span>
          {modified && <span className="h-1.5 w-1.5 rounded-full bg-warning" />}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-44">
        <ContextMenuItem onSelect={() => onOpenFile(node.path)}>Open</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onSelect={() => {
            const next = prompt("Rename file", node.path);
            if (next && next !== node.path) onRenameFile(node.path, next);
          }}
        ><Pencil className="mr-2 h-3.5 w-3.5" />Rename</ContextMenuItem>
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={() => onDeleteFile(node.path)}
        ><Trash2 className="mr-2 h-3.5 w-3.5" />Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

/* ---------- SQL query results viewer ---------- */

type SqlRow = Record<string, string | number>;
function runSqlQuery(q: string): { columns: string[]; rows: SqlRow[]; note: string; ms: number } {
  const lower = q.toLowerCase();
  // Tiny pretend engine: pattern-match a few shapes against seed.sql data.
  const customers = [
    { id: 1, name: "Ada Lovelace",   country: "UK", signed_up_at: "2024-02-11" },
    { id: 2, name: "Linus Torvalds", country: "FI", signed_up_at: "2024-05-04" },
    { id: 3, name: "Grace Hopper",   country: "US", signed_up_at: "2023-09-30" },
    { id: 4, name: "Hedy Lamarr",    country: "AT", signed_up_at: "2024-07-12" },
    { id: 5, name: "Alan Turing",    country: "UK", signed_up_at: "2024-11-01" },
  ];
  const orders = [
    { id: 1, customer_id: 1, amount: 120.0, created_at: "2024-03-01" },
    { id: 2, customer_id: 1, amount: 45.5,  created_at: "2024-04-12" },
    { id: 3, customer_id: 2, amount: 300.0, created_at: "2024-06-20" },
    { id: 4, customer_id: 4, amount: 80.25, created_at: "2024-08-09" },
    { id: 5, customer_id: 5, amount: 19.99, created_at: "2024-11-15" },
  ];

  if (lower.includes("group by") && lower.includes("country")) {
    const byC: Record<string, { customers: number; total: number }> = {};
    for (const c of customers) {
      if (lower.includes("2024") && c.signed_up_at < "2024-01-01") continue;
      byC[c.country] ??= { customers: 0, total: 0 };
      byC[c.country].customers += 1;
      byC[c.country].total += orders.filter((o) => o.customer_id === c.id).reduce((a, o) => a + o.amount, 0);
    }
    const rows: SqlRow[] = Object.entries(byC)
      .map(([country, v]) => ({ country, customers: v.customers, total_revenue: v.total.toFixed(2) }))
      .sort((a, b) => Number(b.total_revenue) - Number(a.total_revenue));
    return { columns: ["country", "customers", "total_revenue"], rows, note: `${rows.length} row(s)`, ms: 7 };
  }
  if (lower.includes("from customers")) {
    return { columns: ["id", "name", "country", "signed_up_at"], rows: customers, note: `${customers.length} row(s)`, ms: 3 };
  }
  if (lower.includes("from orders")) {
    return { columns: ["id", "customer_id", "amount", "created_at"], rows: orders, note: `${orders.length} row(s)`, ms: 2 };
  }
  return { columns: [], rows: [], note: "No matching mock data. Try a SELECT against customers or orders.", ms: 1 };
}

function SqlResultsView({ query }: { query: string }) {
  const res = useMemo(() => runSqlQuery(query), [query]);
  if (res.columns.length === 0) {
    return <div className="text-muted-foreground p-2">{res.note}</div>;
  }
  return (
    <div className="text-[12px]">
      <div className="mb-2 flex items-center justify-between text-muted-foreground">
        <span>{res.note}</span>
        <span>executed in {res.ms}ms</span>
      </div>
      <div className="overflow-auto rounded border">
        <table className="w-full font-mono">
          <thead className="bg-accent/40 text-muted-foreground">
            <tr>{res.columns.map((c) => <th key={c} className="px-2 py-1 text-left font-medium">{c}</th>)}</tr>
          </thead>
          <tbody>
            {res.rows.map((r, i) => (
              <tr key={i} className="border-t hover:bg-accent/30">
                {res.columns.map((c) => <td key={c} className="px-2 py-1 whitespace-nowrap">{String(r[c])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Mongo query results viewer ---------- */

function runMongoQuery(q: string): { rows: unknown[]; note: string; ms: number } {
  const lower = q.toLowerCase();
  const users = [
    { name: "Ada",   email: "ada@example.com",   country: "UK", active: true,  createdAt: "2024-02-11" },
    { name: "Linus", email: "linus@example.com", country: "FI", active: true,  createdAt: "2024-05-04" },
    { name: "Grace", email: "grace@example.com", country: "US", active: false, createdAt: "2023-09-30" },
    { name: "Alan",  email: "alan@example.com",  country: "UK", active: true,  createdAt: "2024-11-01" },
  ];
  const orders = [
    { userId: 1, category: "Books", amount: 12.5, status: "paid" },
    { userId: 2, category: "Music", amount: 9.99, status: "paid" },
    { userId: 1, category: "Books", amount: 4.2,  status: "refunded" },
    { userId: 4, category: "Games", amount: 29.0, status: "paid" },
  ];

  if (lower.includes("db.orders.aggregate")) {
    const byCat: Record<string, { total: number; n: number }> = {};
    for (const o of orders.filter((x) => x.status === "paid")) {
      byCat[o.category] ??= { total: 0, n: 0 };
      byCat[o.category].total += o.amount;
      byCat[o.category].n += 1;
    }
    const rows = Object.entries(byCat).map(([_id, v]) => ({ _id, total: v.total, n: v.n })).sort((a, b) => b.total - a.total);
    return { rows, note: `${rows.length} document(s)`, ms: 6 };
  }
  if (lower.includes("db.users.find")) {
    let rows = users.slice();
    if (lower.includes('country: "uk"') || lower.includes("country: 'uk'")) rows = rows.filter((u) => u.country === "UK");
    if (lower.includes("active: true")) rows = rows.filter((u) => u.active);
    return { rows: rows.map(({ name, email, country }) => ({ name, email, country })), note: `${rows.length} document(s)`, ms: 3 };
  }
  if (lower.includes("db.orders.find")) {
    return { rows: orders, note: `${orders.length} document(s)`, ms: 2 };
  }
  return { rows: [], note: "No matching mock data. Try db.users.find(...) or db.orders.aggregate([...]).", ms: 1 };
}

function MongoResultsView({ query }: { query: string }) {
  const res = useMemo(() => runMongoQuery(query), [query]);
  if (res.rows.length === 0) {
    return <div className="text-muted-foreground p-2">{res.note}</div>;
  }
  return (
    <div className="text-[12px]">
      <div className="mb-2 flex items-center justify-between text-muted-foreground">
        <span>{res.note}</span>
        <span>executed in {res.ms}ms</span>
      </div>
      <pre className="overflow-auto rounded border bg-editor-bg p-2 font-mono text-foreground/90">{JSON.stringify(res.rows, null, 2)}</pre>
    </div>
  );
}

/* ---------- UI iframe preview (HTML/CSS/JS) ---------- */

function UiPreview({ files, fullHeight }: { files: Record<string, string>; fullHeight?: boolean }) {
  const isReact = files["App.jsx"] !== undefined;
  const srcDoc = useMemo(() => {
    if (isReact) {
      return getReactSrcDoc(files);
    }
    const html = files["index.html"] ?? "<!doctype html><html><body><p>No index.html</p></body></html>";
    const cssText = files["styles.css"] ?? "";
    const jsText = files["app.js"] ?? "";
    const cssTag = `<style>${cssText}</style>`;
    const jsTag = `<script>\ntry { ${jsText} } catch (e) { document.body.insertAdjacentHTML('beforeend', '<pre style="color:#b00">'+(e && e.message || e)+'</pre>'); }\n<\/script>`;
    // Strip external <link rel=stylesheet href="styles.css"> and <script src="app.js"> then inject inline.
    let out = html
      .replace(/<link[^>]*href=["']styles\.css["'][^>]*>/i, cssTag)
      .replace(/<script[^>]*src=["']app\.js["'][^>]*><\/script>/i, jsTag);
    if (!/<style>/i.test(out)) out = out.replace(/<\/head>/i, `${cssTag}</head>`);
    if (!out.includes("<script>")) out = out.replace(/<\/body>/i, `${jsTag}</body>`);
    return out;
  }, [files]);
  return (
    <iframe
      title="UI preview"
      sandbox="allow-scripts allow-same-origin allow-forms"
      srcDoc={srcDoc}
      className={`w-full rounded border bg-white ${fullHeight ? "h-full" : "h-48"}`}
    />
  );
}

/* ---------- Python "output" view (heuristic) ---------- */

function PythonOutputView({ code }: { code: string }) {
  const lines = useMemo(() => {
    const out: string[] = [];
    const re = /print\(([^)]*)\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(code))) {
      const arg = m[1].trim();
      // strip wrapping quotes / f-string prefix for a quick visible result
      const stripped = arg.replace(/^f?["']/, "").replace(/["']$/, "");
      out.push(stripped);
    }
    if (out.length === 0) out.push("(no print() statements found)");
    return out;
  }, [code]);
  return (
    <pre className="font-mono text-foreground/90 whitespace-pre-wrap">
{"$ python " + (Object.keys({}).length ? "" : "main.py") + "\n" + lines.join("\n")}
    </pre>
  );
}
