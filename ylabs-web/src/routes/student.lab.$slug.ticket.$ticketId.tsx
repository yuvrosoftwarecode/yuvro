import { createFileRoute, Link, Outlet, useMatch, useNavigate, useParams } from "@tanstack/react-router";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  fetchFileTree,
  fetchFile,
  writeFile as wsWriteFile,
  deleteWorkspaceFile,
  getTerminalWsUrl,
  type FileTreeNode,
} from "@/services/workspaceService";
import { TopNav } from "@/components/TopNav";
import { DiffBadge, StatusBadge } from "@/components/Badges";
import { tickets, labs } from "@/lib/dummy";
import { runDynamicSqlQuery, runDynamicMongoQuery } from "@/lib/dbEngine";
import { executeRemoteMongoQuery } from "@/server/mongoProxy";
import { useAuth } from "@/lib/auth";
import {
  Play, Save, Send, Lightbulb, AlertTriangle, ChevronRight, ChevronDown, ChevronLeft,
  FileCode2, Folder, FolderOpen, Search, GitBranch, Bug, Package, Settings,
  CircleDot, Terminal as TerminalIcon, CheckCircle2, XCircle, Clock, Zap,
  MessageSquare, Lock, Unlock, RotateCcw, Copy, Share2, Flag, HelpCircle,
  Sparkles, Gauge, Wand2, Globe, Check, ArrowLeft, PanelLeftClose, PanelLeftOpen, BookOpen,
  FilePlus, FolderPlus, Pencil, Trash2, X,
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

export const Route = createFileRoute("/student/lab/$slug/ticket/$ticketId")({ component: TicketEditorRoute });

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
  const { slug, ticketId } = useParams({ from: "/student/lab/$slug/ticket/$ticketId" });
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

type KitName = "java" | "django" | "python" | "sql" | "mongo" | "ui" | "bash";
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

const LINUX_KIT_DEFAULT: Kit = {
  name: "bash", rootLabel: "linux-lab", primary: "script.sh", runtime: "Ubuntu 24.04 · Bash",
  fileList: ["script.sh", "README.md"],
  files: {
    "script.sh": `#!/usr/bin/env bash\n\n# Write your solution here\n`,
    "README.md": `# Linux Lab\n\nWrite your bash script in \`script.sh\` and run it.\n`,
  },
};

function getKit(slug: string, tag: string): Kit {
  if (tag === "Django Todo") {
    return {
      name: "django", rootLabel: "todo-app", primary: "todos/views.py", runtime: "Python 3.12 · Django 5",
      fileList: [...DJANGO_FILES], files: { ...DJANGO_STARTERS },
    };
  }
  if (slug === "python" || slug === "programming" || slug === "datastructures")
    return PY_KITS[tag] ?? PY_KITS["Py Fundamentals"];
  if (slug === "sql" || slug === "sqlite" || tag?.toLowerCase() === "sql") return SQL_KIT_DEFAULT;
  if (slug === "mongo" || slug === "mongodb" || tag?.toLowerCase() === "mongosh" || tag?.toLowerCase() === "mongo") return MONGO_KIT_DEFAULT;
  if (slug === "ui") return UI_KIT_DEFAULT;
  if (slug === "linux" || tag === "bash" || tag === "Linux Basics" || tag === "Linux Files" || tag === "Linux Perms" || tag === "Linux Processes" || tag === "Linux Network" || tag === "Linux Shell" || tag === "Linux Services") return LINUX_KIT_DEFAULT;
  return {
    name: "java", rootLabel: "java-101", primary: "Main.java", runtime: "Java 17",
    fileList: [...FILE_LIST],
    files: { "Main.java": STARTER_MAIN, "MainTest.java": STARTER_TEST, "README.md": STARTER_README },
  };
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
  const reviewMatch = useMatch({ from: "/student/lab/$slug/ticket/$ticketId/review", shouldThrow: false });

  const [resolvedTicket, setResolvedTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setResolvedTicket(null);

    const dummyTicket = tickets.find((t) => t.id === ticketId);
    if (dummyTicket) {
      setResolvedTicket(dummyTicket);
      setLoading(false);
      return;
    }

    let active = true;
    import("@/utils/RestApiAuthUtil").then(({ default: api }) => {
      api.get<any>(`/lab/tickets/${ticketId}/`)
        .then(t => {
          if (!active) return;
          setResolvedTicket({
            id: t.id,
            title: t.title,
            description: t.description ?? "",
            difficulty: t.difficulty === "HARD" ? "Advanced" : t.difficulty === "MEDIUM" ? "Intermediate" : "Beginner",
            xp: t.yuvro_points ?? 100,
            estMin: t.minutes_max ?? 30,
            tag: t.accepted_programming_languages?.[0] ?? "bash",
            status: "Not Started",
            tasks: Array.isArray(t.tasks) ? t.tasks.map((task: any) => {
              if (typeof task === "object" && task.title && !task.task_slug) {
                const slugMatch = task.title.match(/Task (\d+\.\d+\.\d+)/i);
                if (slugMatch) task.task_slug = `task-${slugMatch[1].replace(/\./g, "-")}`;
              }
              return task;
            }) : [],
            learning_objectives: Array.isArray(t.learning_objectives) ? t.learning_objectives : [],
            common_mistakes: Array.isArray(t.common_mistakes) ? t.common_mistakes : [],
          });
          setLoading(false);
        })
        .catch(() => {
          if (active) {
            // show first dummy ticket as safe fallback (shouldn't normally reach here)
            setResolvedTicket(tickets[0]);
            setLoading(false);
          }
        });
    });
    return () => { active = false; };
  }, [ticketId]);

  if (reviewMatch) return <Outlet />;

  if (loading || !resolvedTicket) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
        <span className="text-sm">Loading ticket…</span>
      </div>
    );
  }

  const ticket = previewOverride
    ? {
        ...resolvedTicket,
        title: previewOverride.title ?? resolvedTicket.title,
        description: previewOverride.description ?? resolvedTicket.description,
        difficulty: (previewOverride.difficulty as any) ?? resolvedTicket.difficulty,
        xp: previewOverride.xp ?? resolvedTicket.xp,
        estMin: previewOverride.estMin ?? resolvedTicket.estMin,
        tag: previewOverride.tag ?? resolvedTicket.tag,
      }
    : resolvedTicket;

  return <TicketIDE slug={slug} ticket={ticket} previewOverride={previewOverride ?? null} />;
}

function TicketIDE({
  slug,
  ticket,
  previewOverride,
}: {
  slug: string;
  ticket: any;
  previewOverride: StudentPreviewOverride | null;
}) {
  const navigate = useNavigate();
  const reviewMatch = useMatch({ from: "/student/lab/$slug/ticket/$ticketId/review", shouldThrow: false });
  const lab = labs.find((l) => l.slug === slug) ?? labs[0];

  const kit = useMemo(() => getKit(slug, ticket.tag), [slug, ticket.tag]);
  const isDjango = kit.name === "django";
  const isJava = kit.name === "java";
  const isSql = kit.name === "sql";
  const isMongo = kit.name === "mongo";
  const isUi = kit.name === "ui";
  const isPython = kit.name === "python";
  const isDbEditor = ticket.editor_type === "sql_editor" || ticket.editor_type === "db_editor" || isSql || isMongo;
  const isBash = kit.name === "bash";

  const isReal = !tickets.some(t => t.id === ticket.id);

  const { user } = useAuth();
  const userId = useMemo(() => {
    return user?.id?.toString() ?? "guest";
  }, [user]);
  const labId = slug;
  const sprintId = ticket.id?.toString() ?? "0";
  const [wsLoaded, setWsLoaded] = useState(false);
  const isMultiLang = slug === "programming" || slug === "datastructures";
  type ProgLang = "python" | "c" | "cpp" | "js";
  const PROG_EXT: Record<ProgLang, string> = { python: "py", c: "c", cpp: "cpp", js: "js" };
  const PROG_LABEL: Record<ProgLang, string> = { python: "Python 3", c: "C (gcc)", cpp: "C++ (g++)", js: "Node.js" };
  const [progLang, setProgLang] = useState<ProgLang>("python");
  const initialFileList: readonly string[] = kit.fileList;
  const starters: Record<string, string> = useMemo(() => {
    if (isReal) return {};
    const s = { ...kit.files };
    if (isReal && s["README.md"]) {
      s["README.md"] = `# ${ticket.title}\n\n${ticket.description}`;
    }
    if (previewOverride?.starterCode && kit.primary) {
      s[kit.primary] = previewOverride.starterCode;
    }
    return s;
  }, [kit, isReal, previewOverride, ticket.title, ticket.description]);
  const primaryFile = kit.primary;

  const [files, setFiles] = useState<Record<string, string>>(starters);
  const [activeFile, setActiveFile] = useState<FileName>(initialFileList[0]);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const fileList = useMemo(() => Object.keys(files), [files]);
  const [openTabs, setOpenTabs] = useState<string[]>(isReal ? [] : [...initialFileList]);

  function openFile(path: string) {
    setOpenTabs(prev => prev.includes(path) ? prev : [...prev, path]);
    setActiveFile(path);
  }

  function closeTab(path: string, e: React.MouseEvent) {
    e.stopPropagation();
    setOpenTabs(prev => {
      const next = prev.filter(p => p !== path);
      if (activeFile === path) {
        setActiveFile(next.length > 0 ? next[next.length - 1] : "");
      }
      return next;
    });
  }

  // Load workspace file tree and first file content from executor on mount (real tickets only)
  const loadWorkspaceFiles = useCallback(async (preserveActive = false) => {
    if (!isReal) return;
    setWsLoaded(false);
    try {
      const res = await fetchFileTree(userId, labId, sprintId, starters);
      const flatten = (node: FileTreeNode, acc: Record<string, string>) => {
        if (node.name === ".bash_history") return acc;
        if (node.type === "file") { acc[node.path] = ""; }
        else node.children?.forEach(c => flatten(c, acc));
        return acc;
      };
      const paths = flatten(res.tree, {});
      if (Object.keys(paths).length > 0) {
        setFiles(prev => {
          // preserve contents of already loaded files if possible
          const next = { ...paths };
          for (const p of Object.keys(next)) {
            if (prev[p]) next[p] = prev[p];
          }
          return next;
        });
        const firstPath = Object.keys(paths)[0];
        if (!preserveActive && firstPath) {
          setOpenTabs(prev => prev.includes(firstPath) ? prev : [...prev, firstPath]);
          setActiveFile(firstPath);
          try {
            const content = await fetchFile(userId, labId, sprintId, firstPath);
            setFiles(f => ({ ...f, [firstPath]: content }));
          } catch { /* ignore */ }
        }
      }
      setWsLoaded(true);
    } catch {
      setWsLoaded(true); // fall back to local starters on error
    }
  }, [isReal, userId, labId, sprintId, starters]);

  useEffect(() => {
    loadWorkspaceFiles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id, isReal, userId]);

  // Lazy-load file content when the active file changes (real tickets only)
  const loadedFiles = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!isReal || !wsLoaded) return;
    if (loadedFiles.current.has(activeFile)) return;
    if (files[activeFile] !== "") { loadedFiles.current.add(activeFile); return; }
    fetchFile(userId, labId, sprintId, activeFile)
      .then(content => {
        setFiles(f => ({ ...f, [activeFile]: content }));
        loadedFiles.current.add(activeFile);
      })
      .catch(() => { loadedFiles.current.add(activeFile); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile, isReal, wsLoaded]);


  const [tab, setTab] = useState<"problem" | "hints" | "discuss">("problem");
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>(isDbEditor ? "preview" : "output");
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

  const [submissionId, setSubmissionId] = useState<string | null>(null);
  useEffect(() => {
    if (previewOverride) return;
    const isDummy = !isReal;

    const RECENT_LAB_KEY = "ylabs-recent-lab";
    import("@/utils/RestApiAuthUtil").then(({ default: api }) => {
      api.get<any>(`/lab/labs/${slug}/`)
        .then((realLab) => {
          try { localStorage.setItem(RECENT_LAB_KEY, JSON.stringify({ id: slug, name: realLab.title })); } catch {}
        })
        .catch(() => {
          const labName = labs.find(l => l.slug === slug)?.name ?? slug;
          try { localStorage.setItem(RECENT_LAB_KEY, JSON.stringify({ id: slug, name: labName })); } catch {}
        });
    });

    if (isDummy) return;

    import("@/utils/RestApiAuthUtil").then(({ default: api }) => {
      api.get<any[]>(`/lab/submissions/?lab_sprint_ticket=${ticket.id}`)
        .then(async (subs) => {
          if (subs.length === 0) {
            const created = await api.post<any>("/lab/submissions/", {
              lab_sprint_ticket: ticket.id,
              ticket_status: "in_progress",
            });
            setSubmissionId(created.id);
          } else {
            const sub = subs[0];
            setSubmissionId(sub.id);
            if (sub.ticket_status === "backlog") {
              await api.patch<any>(`/lab/submissions/${sub.id}/`, {
                ticket_status: "in_progress",
              });
            }
          }
        })
        .catch(console.error);
    });
  }, [ticket.id, slug]);


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
    setOpenTabs(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
    setActiveFile(trimmed);
    if (isReal) {
      wsWriteFile(userId, labId, sprintId, trimmed, contents)
        .then(() => loadedFiles.current.add(trimmed))
        .catch(() => showToast(`⚠ Could not persist ${trimmed}`));
    }
  }
  function renameFile(oldPath: string, newPath: string) {
    const trimmed = newPath.trim().replace(/^\/+/, "");
    if (!trimmed || trimmed === oldPath) return;
    if (files[trimmed] !== undefined) { showToast("Target path already exists"); return; }
    const content = files[oldPath] ?? "";
    setFiles((f) => {
      const { [oldPath]: _, ...rest } = f;
      return { ...rest, [trimmed]: content };
    });
    setDirty((d) => {
      const { [oldPath]: was, ...rest } = d;
      return { ...rest, [trimmed]: true };
    });
    if (activeFile === oldPath) setActiveFile(trimmed);
    if (isReal) {
      wsWriteFile(userId, labId, sprintId, trimmed, content)
        .then(() => deleteWorkspaceFile(userId, labId, sprintId, oldPath))
        .catch(() => showToast(`⚠ Could not rename ${oldPath}`));
    }
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
    if (isReal) {
      deleteWorkspaceFile(userId, labId, sprintId, path)
        .catch(() => showToast(`⚠ Could not delete ${path}`));
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
    if (isReal) {
      deleteWorkspaceFile(userId, labId, sprintId, prefix)
        .catch(() => showToast(`⚠ Could not delete folder ${prefix}`));
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

  const code = files[activeFile] ?? "";

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
        const out: string[] = [];
        const re = /print\(\s*(?:f?["'])([^"']*)["']\s*\)/g;
        let m; while ((m = re.exec(src))) out.push(m[1]);
        setOutput(`$ python ${file}\n${out.join("\n")}\n\n✓ Process finished (0.3s)`);
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
    if (isDjango) {
      setOutput(`$ python manage.py runserver\n…starting Django dev server…\n✓ Running on http://127.0.0.1:8000/`);
      setRunning(false);
      return;
    }
    if (isBash) {
      setOutput(`$ bash ${file}\n…running…`);
      setTimeout(() => {
        const echoRe = /echo\s+["']?([^"'\n]+)["']?/g;
        const out: string[] = [];
        let m;
        while ((m = echoRe.exec(src))) out.push(m[1]);
        setOutput(`$ bash ${file}\n${out.join("\n")}\n\n✓ Script finished (0.2s)`);
        setRunning(false);
      }, 400);
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


  function handleRunTests() {
    setBottomTab("tests");
    setTests((ts) => ts.map((t) => ({ ...t, time: "…", pass: false })));
    setTimeout(() => {
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

  const [evaluating, setEvaluating] = useState<Record<string, boolean>>({});
  const [evalResult, setEvalResult] = useState<Record<string, { passed: boolean; reason: string }>>({});
  const [ticketScore, setTicketScore] = useState<{ passed: number; total: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleEvaluate = async (taskSlug: string, requiredCommand: string, scoringRules?: Record<string, any>) => {
    setEvaluating(prev => ({ ...prev, [taskSlug]: true }));
    try {
      const { evaluateTask } = await import("@/services/workspaceService");
      const result = await evaluateTask(userId, labId, sprintId, requiredCommand, taskSlug, scoringRules);
      setEvalResult(prev => ({ ...prev, [taskSlug]: result }));
    } catch (err: any) {
      setEvalResult(prev => ({ ...prev, [taskSlug]: { passed: false, reason: err.message } }));
    } finally {
      setEvaluating(prev => ({ ...prev, [taskSlug]: false }));
    }
  };

  async function handleSubmit() {
    if (isReal && ticket.tasks && ticket.tasks.length > 0) {
      setTab("problem");
      setLeftCollapsed(false);
      setSubmitting(true);
      let passedCount = 0;
      const promises = ticket.tasks.map(async (task: any, idx: number) => {
        const taskSlug = task.task_slug || `task-${idx}`;
        // scoring_rules come directly from the task object (stored in the backend JSON field)
        const scoringRules: Record<string, any> = task.scoring_rules ?? {};
        // required_command is only a fallback for tasks without scoring_rules
        const reqCmd = "git";
        
        setEvaluating(prev => ({ ...prev, [taskSlug]: true }));
        try {
          const { evaluateTask } = await import("@/services/workspaceService");
          const result = await evaluateTask(userId, labId, sprintId, reqCmd, taskSlug, scoringRules);
          setEvalResult(prev => ({ ...prev, [taskSlug]: result }));
          if (result.passed) passedCount++;
        } catch (err: any) {
          setEvalResult(prev => ({ ...prev, [taskSlug]: { passed: false, reason: err.message } }));
        } finally {
          setEvaluating(prev => ({ ...prev, [taskSlug]: false }));
        }
      });
      await Promise.all(promises);
      setTicketScore({ passed: passedCount, total: ticket.tasks.length });
      setSubmitting(false);
      return;
    }

    setBottomTab("tests");
    setTests((ts) => ts.map((t) => ({ ...t, time: "…", pass: false })));
    setTimeout(() => {
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
        if (isReal && submissionId) {
          import("@/utils/RestApiAuthUtil").then(({ default: api }) => {
            api.patch(`/lab/submissions/${submissionId}/`, {
              ticket_status: "in_review",
              solution: files[Object.keys(files)[0]] ?? "",
            }).catch(console.error);
          });
        } else if (isReal && !submissionId) {
          import("@/utils/RestApiAuthUtil").then(({ default: api }) => {
            api.post("/lab/submissions/", {
              lab_sprint_ticket: ticket.id,
              ticket_status: "in_review",
              solution: files[Object.keys(files)[0]] ?? "",
            }).catch(console.error);
          });
        }
        navigate({ to: "/student/lab/$slug/ticket/$ticketId/review", params: { slug, ticketId: ticket.id } });
      } else {
        showToast("Fix failing tests before submitting");
      }
    }, 600);
  }


  function handleSave() {
    setDirty(Object.fromEntries(Object.keys(files).map((k) => [k, false])));
    const now = new Date();
    setSavedAt(`${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`);
    if (isReal) {
      // Persist all dirty files to the workspace
      const dirtyPaths = Object.keys(dirty).filter(k => dirty[k]);
      Promise.all(
        dirtyPaths.map(p => wsWriteFile(userId, labId, sprintId, p, files[p] ?? ""))
      ).catch(() => showToast("⚠ Some files could not be saved to workspace"));
    }
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
  }

  function toggleTheme() {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  }

  const handleResetProgress = async () => {
    if (!confirm("Are you sure you want to reset your progress? This will delete all your files and restart the ticket.")) return;
    try {
      const { deleteWorkspaceFile } = await import("@/services/workspaceService");
      await deleteWorkspaceFile(userId, labId, sprintId, "");
      setTicketScore(null);
      setEvalResult({});
      window.location.reload();
    } catch (e: any) {
      showToast("Failed to reset progress: " + e.message);
    }
  };

  if (reviewMatch) return <Outlet />;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top sub-bar (no global nav — full-page editor) */}
      <div className="flex flex-wrap items-center gap-3 border-b bg-card/60 px-3 py-2 text-xs">
        {!previewOverride && (
          <Link to="/student/lab/$slug" params={{ slug }} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-accent">
            <ArrowLeft className="h-3 w-3" />Exit
          </Link>
        )}
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
        <button onClick={handleResetProgress} title="Reset Progress" className="text-destructive inline-flex items-center gap-1 rounded-md border border-destructive/20 bg-destructive/10 px-2 py-1 hover:bg-destructive/20 font-medium ml-1">
          <RotateCcw className="h-3 w-3" />Reset
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => setSidePanel((p) => p === "preview" ? null : "preview")}
            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 hover:bg-accent ${sidePanel === "preview" ? "bg-accent text-foreground border-primary/40" : ""}`}>
            <Globe className="h-3 w-3" />Preview
          </button>
          <button onClick={() => setSidePanel((p) => p === "mentor" ? null : "mentor")}
            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 hover:bg-accent ${sidePanel === "mentor" ? "bg-accent text-foreground border-primary/40" : ""}`}>
            <Sparkles className="h-3 w-3" />AI Mentor
          </button>
          <button onClick={handleRun} disabled={running} className="inline-flex items-center gap-1 rounded-md bg-success/20 text-success border border-success/40 px-3 py-1 hover:bg-success/30 font-medium disabled:opacity-60">
            <Play className="h-3 w-3" />{running ? "Running…" : "Run"} <kbd className="hidden md:inline rounded bg-success/20 px-1 text-[10px]">⌘↵</kbd>
          </button>
          <button onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-1 rounded-md px-3 py-1 font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
            <Send className="h-3 w-3" />{submitting ? "Submitting..." : "Submit"}
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
              {tab === "problem" && (
                <ProblemPanel 
                  ticket={ticket} 
                  slug={slug} 
                  isReal={!tickets.some(t => t.id === ticket.id)} 
                  evaluating={evaluating}
                  evalResult={evalResult}
                  ticketScore={ticketScore}
                  onEvaluate={handleEvaluate}
                />
              )}
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
                    <button
                      title="Refresh Workspace"
                      onClick={() => loadWorkspaceFiles(true)}
                      className="grid h-5 w-5 place-items-center rounded hover:bg-accent text-muted-foreground hover:text-foreground ml-1"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto px-1 pb-2 min-h-0">
                  <FileTree
                    rootLabel={isReal ? (ticket.title || "Project") : kit.rootLabel}
                    paths={fileList}
                    activeFile={activeFile}
                    dirty={dirty}
                    onOpenFile={openFile}
                    onCreateFile={createFile}
                    onRenameFile={renameFile}
                    onDeleteFile={deleteFile}
                    onDeleteFolder={deleteFolder}
                    isFolderOpen={isFolderOpen}
                    toggleFolder={toggleFolder}
                  />
                </div>
                {isDbEditor && (
                  <div className="flex-1 overflow-auto border-t flex flex-col min-h-0 bg-editor-panel">
                    <div className="flex items-center justify-between px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                      <span>DB Explorer</span>
                    </div>
                    <div className="px-3 py-1 flex items-center gap-1.5 text-xs text-foreground font-medium">
                      <svg className="h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
                      {MOCK_DB_SCHEMA.name}
                    </div>
                    <div className="px-5 py-1 text-[11px] text-muted-foreground uppercase mt-1">Tables</div>
                    {MOCK_DB_SCHEMA.tables.map(t => (
                      <button key={t.name} onClick={() => { if (!openTabs.includes(`schema:${t.name}`)) setOpenTabs([...openTabs, `schema:${t.name}`]); setActiveFile(`schema:${t.name}`); }}
                        className={`w-full flex items-center gap-2 px-5 py-1 text-xs text-left ${activeFile === `schema:${t.name}` ? "bg-accent/50 text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                        {t.name}
                        <span className="ml-auto text-[10px] opacity-50">{t.columns.length} cols</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-auto border-t px-3 py-2 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1"><GitBranch className="h-3 w-3" /> main</div>
                </div>
              </div>
            )}


            <div className="flex flex-1 min-w-0 flex-col">

              {/* Tabs row */}
              <div className="flex items-center border-b bg-editor-panel text-xs overflow-x-auto">
                {openTabs.map((f) => (
                  <button key={f} onClick={() => setActiveFile(f)}
                    className={`flex items-center gap-2 border-r pl-3 pr-2 py-2 whitespace-nowrap group ${activeFile === f ? "bg-editor-bg text-foreground" : "text-muted-foreground hover:bg-editor-bg/50 hover:text-foreground"}`}>
                    <FileCode2 className="h-3 w-3" />{f.split("/").pop()}
                    {dirty[f] && <CircleDot className="h-2.5 w-2.5 text-warning" />}
                    <div onClick={(e) => closeTab(f, e)} className="ml-1 opacity-0 group-hover:opacity-100 hover:text-destructive p-0.5 rounded-sm hover:bg-muted/50">
                      <X className="h-3 w-3" />
                    </div>
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
                {(activeFile || "").split("/").map((seg, i, arr) => {
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
                {activeFile.startsWith("schema:") ? (
                  <SchemaViewer tableName={activeFile.replace("schema:", "")} />
                ) : (
                  <CodeEditor code={code} onChange={updateCode} language={editorLanguage(activeFile)} theme={theme} />
                )}
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
                    isPython ? <PythonOutputView code={files[activeFile] ?? ""} /> :
                               <PreviewView />
                  )}
                  {bottomTab === "terminal" && (
                    <TerminalView
                      wsUrl={isReal ? getTerminalWsUrl(userId, labId, sprintId) : null}
                    />
                  )}
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
                    ? <SidePreview device={previewDevice} kit={kit} files={files} activeFile={activeFile} />
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

function SidePreview({ device, kit, files, activeFile }: { device: "Mobile" | "Tablet" | "Desktop"; kit: Kit; files: Record<string, string>; activeFile: string }) {
  const w = device === "Mobile" ? 375 : device === "Tablet" ? 768 : "100%";
  const body =
    kit.name === "django" ? <DjangoTodoApp /> :
    kit.name === "ui"     ? <UiPreview files={files} fullHeight /> :
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

function TerminalView({ wsUrl }: { wsUrl: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<any>(null);
  const fitRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [libs, setLibs] = useState<{ Terminal: any; FitAddon: any } | null>(null);

  // Lazy-load xterm to avoid SSR issues
  useEffect(() => {
    Promise.all([
      // @ts-ignore
      import("@xterm/xterm"),
      // @ts-ignore
      import("@xterm/addon-fit"),
    ]).then(([xterm, fit]) => {
      setLibs({ Terminal: xterm.Terminal, FitAddon: fit.FitAddon });
    }).catch(() => setError("Failed to load terminal library"));
  }, []);

  // Mount xterm when libs are ready and container is available
  useEffect(() => {
    if (!libs || !containerRef.current) return;
    if (termRef.current) return; // already mounted

    const term = new libs.Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "\"JetBrains Mono\", \"Fira Code\", monospace",
      theme: {
        background: "#0d1117",
        foreground: "#e6edf3",
        cursor: "#58a6ff",
        black: "#0d1117",
        brightBlack: "#484f58",
        red: "#ff7b72",
        brightRed: "#ffa198",
        green: "#3fb950",
        brightGreen: "#56d364",
        yellow: "#d29922",
        brightYellow: "#e3b341",
        blue: "#58a6ff",
        brightBlue: "#79c0ff",
        magenta: "#bc8cff",
        brightMagenta: "#d2a8ff",
        cyan: "#39c5cf",
        brightCyan: "#56d4dd",
        white: "#b1bac4",
        brightWhite: "#e6edf3",
      },
      scrollback: 5000,
      allowProposedApi: true,
    });

    const fitAddon = new libs.FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitRef.current = fitAddon;

    // Resize observer
    const ro = new ResizeObserver(() => {
      try { fitAddon.fit(); } catch { /* ignore */ }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, [libs]);

  // Connect WebSocket
  const connect = useCallback(() => {
    if (!wsUrl || !termRef.current) return;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setError(null);
    setConnected(false);
    termRef.current.clear();
    termRef.current.writeln("\x1b[33mConnecting to workspace terminal...\x1b[0m");

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setError(null);
      termRef.current?.writeln("\x1b[32m✓ Connected\x1b[0m\r\n");
      // Resize hint
      try { fitRef.current?.fit(); } catch { /* ignore */ }
    };

    ws.onmessage = (ev) => {
      if (!termRef.current) return;
      if (typeof ev.data === "string") {
        termRef.current.write(ev.data);
      } else {
        // Fallback for blobs if any
        if (ev.data instanceof Blob) {
          ev.data.text().then(t => termRef.current?.write(t));
        }
      }
    };

    ws.onerror = () => {
      setError("Terminal connection error — check that the code executor is running");
      setConnected(false);
    };

    // Forward keystrokes from xterm → websocket
    const dataListener = termRef.current?.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      dataListener?.dispose();
      termRef.current?.writeln("\r\n\x1b[31m[disconnected]\x1b[0m");
    };
  }, [wsUrl]);

  useEffect(() => {
    if (!termRef.current || !wsUrl) return;
    connect();
    return () => { wsRef.current?.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsUrl, libs]);

  // If no wsUrl (dummy ticket), show static mock
  if (!wsUrl) {
    return (
      <div className="font-mono text-muted-foreground space-y-0.5">
        <div><span className="text-success">student@labs</span>:<span className="text-info">~/workspace</span>$ ls</div>
        <div className="text-foreground">script.sh  README.md</div>
        <div><span className="text-success">student@labs</span>:<span className="text-info">~/workspace</span>$ <span className="animate-pulse">▌</span></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-black text-white p-1 rounded">
      {/* Status bar */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${connected ? "bg-success" : "bg-destructive"}`} />
        <span className="text-muted-foreground text-[10px] font-mono">
          {connected ? "Connected to workspace terminal" : error ?? "Disconnected"}
        </span>
        {!connected && (
          <button
            onClick={connect}
            className="ml-auto rounded border px-2 py-0.5 text-[10px] hover:bg-accent text-muted-foreground hover:text-foreground"
          >
            Reconnect
          </button>
        )}
      </div>
      {/* xterm container */}
      <div className="flex-1 w-full relative">
        <div
          ref={containerRef}
          className="absolute inset-0"
        />
      </div>
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

function ProblemPanel({ 
  ticket, 
  isReal, 
  slug, 
  evaluating, 
  evalResult, 
  ticketScore, 
  onEvaluate 
}: { 
  ticket: any; 
  isReal?: boolean; 
  slug: string;
  evaluating: Record<string, boolean>;
  evalResult: Record<string, { passed: boolean; reason: string }>;
  ticketScore: { passed: number; total: number } | null;
  onEvaluate: (taskSlug: string, requiredCommand: string) => void;
}) {
  const tasks: any[] = Array.isArray(ticket.tasks) ? ticket.tasks : [];
  const objectives: any[] = Array.isArray(ticket.learning_objectives) ? ticket.learning_objectives : [];
  const mistakes: any[] = Array.isArray(ticket.common_mistakes) ? ticket.common_mistakes : [];

  return (
    <>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{ticket.id} · {ticket.tag}</div>
        <h2 className="text-lg font-semibold mt-0.5">{ticket.title}</h2>
        <p className="mt-2 text-muted-foreground">
          {isReal ? ticket.description : "📋 Create a program demonstrating Java variables and data types."}
        </p>
      </div>

      {isReal ? (
        <>
          {/* Tasks from DB */}
          {tasks.length > 0 && (
            <Section title="✅ Tasks">
              <div className="space-y-2 text-muted-foreground">
                {tasks.map((task: any, idx: number) => {
                  const taskTitle = typeof task === "string" ? task : (task.title ?? `Task ${idx + 1}`);
                  const taskDesc = typeof task === "object" ? task.description : null;
                  const taskMethod = typeof task === "object" ? task.method : null;
                  return (
                    <div key={idx} className="rounded-md border border-border bg-card/40 p-3.5 hover:bg-card/60 transition-colors">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 border border-primary/20 text-[11px] text-primary font-bold">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <div className="font-semibold text-foreground text-sm">{taskTitle}</div>
                          {taskDesc && <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{taskDesc}</p>}
                          {taskMethod && (
                            <div className="mt-3 flex items-center flex-wrap gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded bg-info/10 px-2 py-1 text-[11px] font-medium text-info">
                                {taskMethod}
                              </span>
                            </div>
                          )}
                          {evalResult[task.task_slug || `task-${idx}`] && (
                            <div className={`mt-3 rounded-md border px-3 py-2 text-xs font-medium ${
                              evalResult[task.task_slug || `task-${idx}`].passed 
                                ? "border-success/20 bg-success/10 text-success" 
                                : "border-destructive/20 bg-destructive/10 text-destructive"
                            }`}>
                              {evalResult[task.task_slug || `task-${idx}`].passed ? "✅ Passed: " : "❌ Failed: "}
                              {evalResult[task.task_slug || `task-${idx}`].reason}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 flex flex-col items-end border-t border-border pt-4">
                {ticketScore && (
                  <div className="mb-3 text-sm font-medium">
                    Score: <span className={ticketScore.passed === ticketScore.total ? "text-success" : "text-warning"}>{ticketScore.passed}/{ticketScore.total}</span> tasks completed
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Learning Objectives from DB */}
          {objectives.length > 0 && (
            <Section title="🎯 Learning Objectives">
              <ul className="space-y-1 text-muted-foreground">
                {objectives.map((obj: any, i: number) => (
                  <li key={i} className="flex items-start gap-1.5 text-[12px]">
                    <span className="mt-0.5 text-success shrink-0">✓</span>
                    <span>{typeof obj === "string" ? obj : obj.title ?? JSON.stringify(obj)}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Common Mistakes from DB */}
          {mistakes.length > 0 && (
            <Section title="⚠️ Common Mistakes">
              <ul className="space-y-1 text-muted-foreground">
                {mistakes.map((m: any, i: number) => (
                  <li key={i} className="flex items-start gap-1.5 text-[12px]">
                    <span className="text-warning shrink-0 mt-0.5">•</span>
                    <span>{typeof m === "string" ? m : m.description ?? m.title ?? JSON.stringify(m)}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Fallback: full description */}
          {tasks.length === 0 && (
            <Section title="🎯 Details">
              <div className="text-muted-foreground whitespace-pre-wrap">{ticket.description}</div>
            </Section>
          )}
        </>
      ) : (
        <>
          <Section title="🎯 Learning objectives">
            <ul className="space-y-1 text-muted-foreground">
              <li>✓ Understand primitive data types</li>
              <li>✓ Declare and initialize variables</li>
              <li>✓ Perform type casting</li>
              <li>✓ Work with String operations</li>
            </ul>
          </Section>

      <Section title="✅ Tasks">
        <div className="space-y-2 text-muted-foreground">
          <div>
            <div className="text-foreground">Task 1 · Create variables for all primitive types</div>
            <ul className="ml-3 mt-0.5 list-['└─_'] text-[12px]">
              <li>int, double, boolean, char, long, float, byte, short</li>
              <li>Initialize with appropriate values</li>
              <li>Print them to console</li>
            </ul>
          </div>
          <div>
            <div className="text-foreground">Task 2 · Perform type casting</div>
            <ul className="ml-3 mt-0.5 list-['└─_'] text-[12px]">
              <li>Implicit: int → double</li>
              <li>Explicit: double → int</li>
              <li>Show before and after values</li>
            </ul>
          </div>
          <div>
            <div className="text-foreground">Task 3 · Work with Strings</div>
            <ul className="ml-3 mt-0.5 list-['└─_'] text-[12px]">
              <li>Create a String variable</li>
              <li>Use length(), charAt(), substring()</li>
              <li>Print the results</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section title="📥 Expected output">
        <pre className="rounded-md bg-editor-bg border p-2 text-[12px] font-mono text-muted-foreground">{`Integer: 42
Double: 3.14
Boolean: true
String: Hello Java
Length: 10
Character at index 0: H`}</pre>
      </Section>

      <Section title="🔗 Related concepts">
        <ul className="space-y-1 text-info">
          <li>→ JAVA-102 · Control Flow & Loops</li>
          <li>→ JAVA-105 · Strings Deep Dive</li>
          <li>→ Docs: Primitive vs reference types</li>
        </ul>
      </Section>

        <Section title="⚠️ Common mistakes">
          <ul className="space-y-1 text-muted-foreground">
            <li>• Type mismatch: <code>double → int</code> requires explicit cast</li>
            <li>• Forgetting <code>(int)</code> when narrowing</li>
            <li>• <code>charAt</code> out-of-bounds on empty strings</li>
          </ul>
        </Section>
      </>
      )}
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

/* ---------- SQL Mock DB Schema ---------- */

export type DbColumn = { name: string; type: string; nullable: "YES" | "NO"; default: string; key: "PK" | "FK" | "-" };
export type DbTable = { name: string; columns: DbColumn[]; ddl: string };
export type DbSchema = { name: string; type: "PostgreSQL" | "MySQL" | "SQLite" | "MongoDB"; tables: DbTable[] };

export const MOCK_DB_SCHEMA: DbSchema = {
  name: "yuvro_sql_lab",
  type: "PostgreSQL",
  tables: [
    {
      name: "customers",
      columns: [
        { name: "id", type: "SERIAL", nullable: "NO", default: "-", key: "PK" },
        { name: "name", type: "TEXT", nullable: "NO", default: "-", key: "-" },
        { name: "country", type: "VARCHAR(2)", nullable: "YES", default: "-", key: "-" },
        { name: "signed_up_at", type: "DATE", nullable: "NO", default: "CURRENT_DATE", key: "-" },
      ],
      ddl: `CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  country VARCHAR(2),
  signed_up_at DATE NOT NULL DEFAULT CURRENT_DATE
);`
    },
    {
      name: "orders",
      columns: [
        { name: "id", type: "SERIAL", nullable: "NO", default: "-", key: "PK" },
        { name: "customer_id", type: "INTEGER", nullable: "NO", default: "-", key: "FK" },
        { name: "amount", type: "NUMERIC(10,2)", nullable: "NO", default: "-", key: "-" },
        { name: "created_at", type: "TIMESTAMP", nullable: "NO", default: "CURRENT_TIMESTAMP", key: "-" },
      ],
      ddl: `CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);`
    }
  ]
};

function SchemaViewer({ tableName }: { tableName: string }) {
  const table = MOCK_DB_SCHEMA.tables.find(t => t.name === tableName);
  if (!table) return <div className="p-4 text-muted-foreground text-sm">Table not found</div>;

  return (
    <div className="flex flex-col h-full bg-background overflow-auto p-4 text-sm">
      <div className="flex items-center gap-2 mb-4">
        <Package className="h-5 w-5 text-primary" />
        <h2 className="font-semibold text-lg uppercase tracking-wider text-muted-foreground">Schema Viewer</h2>
        <span className="text-foreground">{MOCK_DB_SCHEMA.name}.{table.name}</span>
      </div>
      
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Columns</h3>
        <div className="border rounded bg-card overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-accent/50 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="px-3 py-2 font-medium">Column</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Nullable</th>
                <th className="px-3 py-2 font-medium">Default</th>
                <th className="px-3 py-2 font-medium">Key</th>
              </tr>
            </thead>
            <tbody className="text-[13px] divide-y">
              {table.columns.map((c, i) => (
                <tr key={i} className="hover:bg-accent/30 transition-colors">
                  <td className="px-3 py-2 font-mono font-medium text-foreground">{c.name}</td>
                  <td className="px-3 py-2 font-mono text-primary/80">{c.type}</td>
                  <td className="px-3 py-2">{c.nullable}</td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">{c.default}</td>
                  <td className="px-3 py-2">
                    {c.key !== "-" && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c.key === "PK" ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : "bg-blue-500/20 text-blue-600 dark:text-blue-400"}`}>
                        {c.key}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">DDL</h3>
        <div className="rounded overflow-hidden border">
          <CodeMirror
            value={table.ddl}
            editable={false}
            extensions={[sql()]}
            theme={vscodeDark}
            basicSetup={{ lineNumbers: false, foldGutter: false }}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------- SQL query results viewer ---------- */

type SqlRow = Record<string, string | number>;
function runSqlQuery(q: string): { columns: string[]; rows: SqlRow[]; note: string; ms: number } {
  return runDynamicSqlQuery(q) as any;
}
function SqlResultsView({ query }: { query: string }) {
  const [viewMode, setViewMode] = useState<"TABLE" | "JSON">("TABLE");
  const res = useMemo(() => runSqlQuery(query), [query]);
  if (res.columns.length === 0) {
    return <div className="text-muted-foreground p-2">{res.note}</div>;
  }

  const handleDownloadCsv = () => {
    if (res.rows.length === 0) return;
    const header = res.columns.join(",");
    const csvRows = res.rows.map(r => res.columns.map(c => JSON.stringify(r[c] ?? "")).join(","));
    const csvStr = [header, ...csvRows].join("\n");
    const blob = new Blob([csvStr], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "results.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="text-[12px] flex flex-col h-full">
      <div className="mb-2 flex items-center justify-between text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>{res.note}</span>
          <div className="flex items-center border rounded overflow-hidden text-[10px] font-medium">
            <button onClick={() => setViewMode("TABLE")} className={`px-2 py-0.5 ${viewMode === "TABLE" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>TABLE</button>
            <button onClick={() => setViewMode("JSON")} className={`px-2 py-0.5 border-l ${viewMode === "JSON" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>JSON</button>
          </div>
          <button onClick={handleDownloadCsv} className="hover:text-foreground text-[11px] underline">Download CSV</button>
        </div>
        <span>executed in {res.ms}ms</span>
      </div>
      
      {viewMode === "TABLE" ? (
        <div className="overflow-auto rounded border flex-1">
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
      ) : (
        <div className="rounded overflow-auto border flex-1 text-[11px]">
          <CodeMirror
            value={JSON.stringify(res.rows, null, 2)}
            editable={false}
            extensions={[jsonLang()]}
            theme={vscodeDark}
            basicSetup={{ lineNumbers: false, foldGutter: true }}
          />
        </div>
      )}
    </div>
  );
}

/* ---------- Mongo query results viewer ---------- */

function MongoResultsView({ query }: { query: string }) {
  const [res, setRes] = useState<{ rows: unknown[]; note: string; ms: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mongoUri, setMongoUri] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("externalMongoUri") || "";
    return "";
  });
  const [editingUri, setEditingUri] = useState(false);
  const [tempUri, setTempUri] = useState(mongoUri);

  const saveUri = () => {
    setMongoUri(tempUri.trim());
    if (typeof window !== "undefined") {
      localStorage.setItem("externalMongoUri", tempUri.trim());
    }
    setEditingUri(false);
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      setRes(null);
      try {
        if (mongoUri) {
          const remoteRes = await executeRemoteMongoQuery({ data: { uri: mongoUri, query } });
          if (active) setRes(remoteRes);
        } else {
          // fallback to local in-memory engine
          const localRes = runDynamicMongoQuery(query);
          if (active) setRes(localRes);
        }
      } catch (e: any) {
        if (active) setError(e.message || "Failed to execute query");
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => { active = false; };
  }, [query, mongoUri]);

  return (
    <div className="text-[12px] flex flex-col h-full gap-2">
      {/* DB Connection Header */}
      <div className="flex flex-col gap-2 p-2 rounded-md border bg-accent/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">Database Connection</span>
          </div>
          <button 
            onClick={() => { setEditingUri(true); setTempUri(mongoUri); }}
            className="text-muted-foreground hover:text-foreground underline decoration-dashed"
          >
            {mongoUri ? "Connected (External Atlas)" : "Local In-Memory (Mock)"}
          </button>
        </div>
        {editingUri && (
          <div className="flex items-center gap-2 mt-1">
            <input 
              type="text"
              value={tempUri}
              onChange={e => setTempUri(e.target.value)}
              placeholder="mongodb+srv://..."
              className="flex-1 rounded border bg-background px-2 py-1 outline-none text-foreground"
            />
            <button onClick={saveUri} className="bg-primary text-primary-foreground px-2 py-1 rounded">Save</button>
            <button onClick={() => setEditingUri(false)} className="text-muted-foreground hover:text-foreground px-2">Cancel</button>
          </div>
        )}
      </div>

      {/* Query Results */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {loading && <div className="text-muted-foreground p-2 animate-pulse">Executing query...</div>}
        {error && <div className="text-destructive bg-destructive/10 border border-destructive p-2 rounded whitespace-pre-wrap">{error}</div>}
        
        {res && (
          <>
            <div className="mb-2 flex items-center justify-between text-muted-foreground">
              <span>{res.note}</span>
              <span>executed in {res.ms}ms</span>
            </div>
            {res.rows.length === 0 ? (
              <div className="text-muted-foreground p-2">0 documents matched.</div>
            ) : (
              <pre className="overflow-auto flex-1 rounded border bg-editor-bg p-2 font-mono text-foreground/90">
                {JSON.stringify(res.rows, null, 2)}
              </pre>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- UI iframe preview (HTML/CSS/JS) ---------- */

function UiPreview({ files, fullHeight }: { files: Record<string, string>; fullHeight?: boolean }) {
  const srcDoc = useMemo(() => {
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
      sandbox="allow-scripts"
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
