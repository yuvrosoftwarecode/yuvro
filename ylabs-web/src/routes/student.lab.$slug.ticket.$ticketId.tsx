import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { getSystemDesignLab } from "@/lib/systemDesign";
import { SystemDesignStudio } from "@/routes/system-design-studio";
import { getLab } from "@/lib/adminLabs";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { EditorView } from "@codemirror/view";
import { useTheme } from "@/hooks/use-theme";
import {
  fetchFileTree,
  fetchFile,
  writeFile as wsWriteFile,
  deleteWorkspaceFile,
  getTerminalWsUrl,
  runCommand,
  runDatabaseQuery,
  type FileTreeNode,
} from "@/services/workspaceService";
import codeExecutorService, { isTaskHidden } from "@/services/codeExecutorService";
import { CustomTestCaseManager } from "@/components/CustomTestCaseManager";
import { ExecutionOutputView } from "@/components/ExecutionOutputView";
import { TopNav } from "@/components/TopNav";
import useAIChat from "@/components/common/ai-buddy/useAIChat";
import { WalletBalanceBadge } from "@/components/credits/WalletBalanceBadge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { evaluationService } from "@/services/evaluationService";
import { DiffBadge, StatusBadge } from "@/components/Badges";
import { tickets, labs, type Status } from "@/lib/dummy";
import { invalidateStudentStats } from "@/lib/studentStats";
import ExamplesPanel from "@/components/ExamplesPanel";
import { runDynamicSqlQuery, runDynamicMongoQuery, getAlasqlSchema, getMongoSchema } from "@/lib/dbEngine";
import { executeExternalDbQuery, fetchExternalDbSchema } from "@/services/codeExecutorService";
import { useAuth } from "@/lib/auth";
import {
  Play, Save, Send, Lightbulb, AlertTriangle, ChevronRight, ChevronDown, ChevronLeft,
  FileCode2, Folder, FolderOpen, Search, GitBranch, Bug, Package, Settings,
  CircleDot, Terminal as TerminalIcon, CheckCircle2, XCircle, Clock, Zap,
  MessageSquare, Lock, Unlock, RotateCcw, Copy, Share2, Flag, HelpCircle,
  Sparkles, Gauge, Wand2, Globe, Check, ArrowLeft, PanelLeftClose, PanelLeftOpen, BookOpen,
  FilePlus, FolderPlus, Pencil, Trash2, X, FlaskConical, Key, Shield, Download,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/student/lab/$slug/ticket/$ticketId")({
  component: TicketEditorRoute,
});

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
  const location = useLocation();
  const isReview = location.pathname.endsWith("/review");

  if (isReview) {
    return <Outlet />;
  }

  return <TicketEditorContent />;
}

function TicketEditorContent() {
  const { slug, ticketId } = useParams({ from: "/student/lab/$slug/ticket/$ticketId" });
  const [previewOverride, setPreviewOverride] = useState<StudentPreviewOverride | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("preview") !== "1") return;
    try {
      const raw = sessionStorage.getItem("__adminPreviewTicket");
      if (raw) setPreviewOverride(JSON.parse(raw));
    } catch {
      /* ignore */
    }
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

type KitName =
  | "java"
  | "django"
  | "python"
  | "sql"
  | "mongo"
  | "ui"
  | "bash"
  | "mysql"
  | "postgresql"
  | "js"
  | "c"
  | "cpp"
  | "git";
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
    name: "python",
    rootLabel: "py-fundamentals",
    primary: "main.py",
    runtime: "Python 3.12",
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
    name: "python",
    rootLabel: "py-data",
    primary: "app.py",
    runtime: "Python 3.12",
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
  name: "sql",
  rootLabel: "sql-lab",
  primary: "query.sql",
  runtime: "PostgreSQL 16",
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

const MYSQL_KIT_DEFAULT: Kit = {
  name: "mysql",
  rootLabel: "mysql-lab",
  primary: "query.sql",
  runtime: "MySQL 8.x",
  fileList: ["query.sql", "schema.sql", "README.md"],
  files: {
    "query.sql": `-- MySQL - write your query here and press Run\n\nSELECT * FROM customers;`,
    "schema.sql": `-- Database Schema\n\nCREATE TABLE customers (\n  id INT PRIMARY KEY,\n  name VARCHAR(255),\n  country VARCHAR(255),\n  signed_up_at DATE\n);\n`,
    "README.md": `# MySQL Lab\n\nWrite SQL queries against the external database.\n`,
  },
};

const POSTGRES_KIT_DEFAULT: Kit = {
  name: "postgresql",
  rootLabel: "postgres-lab",
  primary: "query.sql",
  runtime: "PostgreSQL 16",
  fileList: ["query.sql", "schema.sql", "README.md"],
  files: {
    "query.sql": `-- PostgreSQL - write your query here and press Run\n\nSELECT * FROM customers;`,
    "schema.sql": `-- Database Schema\n\nCREATE TABLE customers (\n  id INT PRIMARY KEY,\n  name VARCHAR(255),\n  country VARCHAR(255),\n  signed_up_at DATE\n);\n`,
    "README.md": `# PostgreSQL Lab\n\nWrite SQL queries against the external database.\n`,
  },
};

const MONGO_KIT_DEFAULT: Kit = {
  name: "mongo",
  rootLabel: "mongo-lab",
  primary: "query.js",
  runtime: "MongoDB 7 · mongosh",
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
  name: "ui",
  rootLabel: "ui-lab",
  primary: "index.html",
  runtime: "Static · HTML/CSS",
  fileList: ["index.html", "styles.css", "README.md"],
  files: {
    "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Portfolio</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <!-- TODO: Build your portfolio here! -->
  <h1>Hello World</h1>
</body>
</html>
`,
    "styles.css": `/* Starter styles — minimal reset */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #ffffff;
  color: #111827;
}
`,
    "README.md": `# Frontend Portfolio Lab

Write your HTML in \`index.html\` and CSS in \`styles.css\`.
Click **Run** to compare your code against the expected target design!
`,
  },
};

const LINUX_KIT_DEFAULT: Kit = {
  name: "bash",
  rootLabel: "linux-lab",
  primary: "script.sh",
  runtime: "Ubuntu 24.04 · Bash",
  fileList: ["script.sh", "README.md"],
  files: {
    "script.sh": `#!/usr/bin/env bash\n\n# Write your solution here\n`,
    "README.md": `# Linux Lab\n\nWrite your bash script in \`script.sh\` and run it.\n`,
  },
};

function getKit(slug: string, tag: string, isAlgo?: boolean): Kit {
  const t = (tag || "").toLowerCase();
  const s = (slug || "").toLowerCase();

  if (
    tag === "Java Spring Todo" ||
    tag === "Spring Todo" ||
    tag === "Java Spring Boot" ||
    tag === "Java Spring" ||
    s.includes("java_spring_todo") ||
    s.includes("java_todo") ||
    s.includes("spring_todo") ||
    t === "spring" ||
    t === "springboot" ||
    ((t === "java") && (s.includes("todo") || tag?.toLowerCase()?.includes("todo")))
  ) {
    return {
      name: "java",
      rootLabel: "todo-app",
      primary: "src/main/java/com/yuvro/todo/TodoApplication.java",
      runtime: "Java 21 · Spring Boot",
      fileList: [
        "src/main/java/com/yuvro/todo/TodoApplication.java",
        "src/main/java/com/yuvro/todo/config/SecurityConfig.java",
        "src/main/java/com/yuvro/todo/config/JwtFilter.java",
        "src/main/java/com/yuvro/todo/config/JwtUtil.java",
        "src/main/java/com/yuvro/todo/controller/HealthController.java",
        "src/main/java/com/yuvro/todo/controller/AuthController.java",
        "src/main/java/com/yuvro/todo/controller/TaskController.java",
        "src/main/java/com/yuvro/todo/entity/User.java",
        "src/main/java/com/yuvro/todo/entity/Task.java",
        "src/main/java/com/yuvro/todo/repository/UserRepository.java",
        "src/main/java/com/yuvro/todo/repository/TaskRepository.java",
        "src/main/resources/application.properties",
        "pom.xml",
        "README.md",
      ],
      files: {
        "src/main/java/com/yuvro/todo/TodoApplication.java": `package com.yuvro.todo;\n\n// TODO: Ticket 1 - Add @SpringBootApplication and implement main method\npublic class TodoApplication {\n    public static void main(String[] args) {\n        // TODO: Launch application with SpringApplication.run\n    }\n}\n`,
        "src/main/resources/application.properties": `# Server configuration\nserver.port=5000\n\n# TODO: Ticket 1 - Configure SQLite database connection\n# spring.datasource.url=jdbc:sqlite:todo.db\n`,
        "pom.xml": `<?xml version="1.0" encoding="UTF-8"?>\n<project xmlns="http://maven.apache.org/POM/4.0.0"\n         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">\n    <modelVersion>4.0.0</modelVersion>\n    <parent>\n        <groupId>org.springframework.boot</groupId>\n        <artifactId>spring-boot-starter-parent</artifactId>\n        <version>3.2.5</version>\n        <relativePath/>\n    </parent>\n    <groupId>com.yuvro</groupId>\n    <artifactId>todo-app</artifactId>\n    <version>1.0.0</version>\n    <name>todo-app</name>\n    <description>Java Spring Boot Todo REST API</description>\n    <properties>\n        <java.version>21</java.version>\n    </properties>\n    <dependencies>\n        <dependency>\n            <groupId>org.springframework.boot</groupId>\n            <artifactId>spring-boot-starter-web</artifactId>\n        </dependency>\n        <dependency>\n            <groupId>org.springframework.boot</groupId>\n            <artifactId>spring-boot-starter-data-jpa</artifactId>\n        </dependency>\n        <dependency>\n            <groupId>org.springframework.boot</groupId>\n            <artifactId>spring-boot-starter-security</artifactId>\n        </dependency>\n        <dependency>\n            <groupId>org.xerial</groupId>\n            <artifactId>sqlite-jdbc</artifactId>\n            <version>3.45.3.0</version>\n        </dependency>\n        <dependency>\n            <groupId>org.hibernate.orm</groupId>\n            <artifactId>hibernate-community-dialects</artifactId>\n        </dependency>\n        <dependency>\n            <groupId>io.jsonwebtoken</groupId>\n            <artifactId>jjwt-api</artifactId>\n            <version>0.12.5</version>\n        </dependency>\n        <dependency>\n            <groupId>io.jsonwebtoken</groupId>\n            <artifactId>jjwt-impl</artifactId>\n            <version>0.12.5</version>\n            <scope>runtime</scope>\n        </dependency>\n        <dependency>\n            <groupId>io.jsonwebtoken</groupId>\n            <artifactId>jjwt-jackson</artifactId>\n            <version>0.12.5</version>\n            <scope>runtime</scope>\n        </dependency>\n    </dependencies>\n</project>\n`,
        "README.md": `# Java Spring Boot Todo REST API Lab\n`,
      },
    };
  }
  if (
    tag === "Node.js Todo" ||
    tag === "Node Todo" ||
    tag === "Express Todo" ||
    s.includes("nodejs_todo") ||
    s.includes("node_todo") ||
    t === "express" ||
    t === "node" ||
    t === "nodejs" ||
    ((t === "javascript" || t === "js") && (s.includes("todo") || tag?.toLowerCase()?.includes("todo")))
  ) {
    return {
      name: "js",
      rootLabel: "todo-app",
      primary: "src/app.js",
      runtime: "Node.js 20 · Express",
      fileList: [
        "src/app.js",
        "src/config.js",
        "src/db.js",
        "src/server.js",
        "src/middleware/auth.js",
        "src/models/task.js",
        "src/models/user.js",
        "src/routes/auth.js",
        "src/routes/tasks.js",
        "package.json",
        "README.md",
      ],
      files: {
        "src/app.js": `const express = require('express');\nconst config = require('./config');\nconst { initDatabase } = require('./db');\n\nfunction createApp(customConfig = {}) {\n  const app = express();\n  const dbPath = customConfig.DB_PATH || config.DB_PATH;\n\n  // TODO: Initialize database and setup routes\n  return app;\n}\n\nmodule.exports = { createApp };\n`,
        "src/config.js": `const path = require('path');\nrequire('dotenv').config();\n\nconst config = {\n  PORT: process.env.PORT || 5000,\n  JWT_SECRET: process.env.JWT_SECRET || 'yuvro-dev-secret-key-987654321',\n  DB_PATH: process.env.DB_PATH || path.resolve(__dirname, '../todo.db'),\n  JWT_EXPIRES_IN: '1d'\n};\n\nmodule.exports = config;\n`,
        "package.json": `{\n  "name": "todo-app",\n  "version": "1.0.0",\n  "main": "src/server.js",\n  "scripts": {\n    "start": "node src/server.js"\n  },\n  "dependencies": {\n    "bcryptjs": "^2.4.3",\n    "dotenv": "^16.4.5",\n    "express": "^4.19.2",\n    "jsonwebtoken": "^9.0.2",\n    "sqlite3": "^5.1.7"\n  }\n}\n`,
        "README.md": `# Node.js & Express Todo REST API Lab\n`,
      },
    };
  }
  if (
    tag === "Flask Todo" ||
    t === "flask" ||
    s.includes("flask_todo") ||
    s.includes("flask")
  ) {
    return {
      name: "python",
      rootLabel: "todo-app",
      primary: "app/__init__.py",
      runtime: "Python 3.12 · Flask",
      fileList: [
        "app/__init__.py",
        "app/models.py",
        "config.py",
        "run.py",
        "requirements.txt",
        "README.md",
      ],
      files: {
        "app/__init__.py": `from flask import Flask, jsonify\nfrom flask_sqlalchemy import SQLAlchemy\nfrom config import Config\n\ndb = SQLAlchemy()\n\ndef create_app(test_config=None):\n    app = Flask(__name__)\n    return app\n`,
        "config.py": `import os\n\nclass Config:\n    SECRET_KEY = os.environ.get('SECRET_KEY', 'yuvro-dev-secret-key-987654321')\n    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///todo.db')\n`,
        "requirements.txt": `Flask>=3.0.0\nFlask-SQLAlchemy>=3.1.1\n`,
        "README.md": `# Flask Todo App\n`,
      },
    };
  }
  if (tag === "Django Todo" || t === "django") {
    return {
      name: "django",
      rootLabel: "todo-app",
      primary: "todos/views.py",
      runtime: "Python 3.12 · Django 5",
      fileList: [...DJANGO_FILES],
      files: { ...DJANGO_STARTERS },
    };
  }
  if (
    tag === "Node.js Todo" ||
    tag === "Node Todo" ||
    tag === "Express Todo" ||
    s.includes("nodejs_todo") ||
    s.includes("node_todo") ||
    t === "express" ||
    t === "node" ||
    t === "nodejs" ||
    ((t === "javascript" || t === "js") && (s.includes("todo") || tag?.toLowerCase()?.includes("todo")))
  ) {
    return {
      name: "js",
      rootLabel: "todo-app",
      primary: "src/app.js",
      runtime: "Node.js 20 · Express",
      fileList: [
        "src/app.js",
        "src/config.js",
        "src/db.js",
        "src/server.js",
        "src/middleware/auth.js",
        "src/models/task.js",
        "src/models/user.js",
        "src/routes/auth.js",
        "src/routes/tasks.js",
        "package.json",
        "README.md",
      ],
      files: {
        "src/app.js": `const express = require('express');\nconst config = require('./config');\nconst { initDatabase } = require('./db');\n\nfunction createApp(customConfig = {}) {\n  const app = express();\n  const dbPath = customConfig.DB_PATH || config.DB_PATH;\n\n  // TODO: Initialize database and setup routes\n  return app;\n}\n\nmodule.exports = { createApp };\n`,
        "src/config.js": `const path = require('path');\nrequire('dotenv').config();\n\nconst config = {\n  PORT: process.env.PORT || 5000,\n  JWT_SECRET: process.env.JWT_SECRET || 'yuvro-dev-secret-key-987654321',\n  DB_PATH: process.env.DB_PATH || path.resolve(__dirname, '../todo.db'),\n  JWT_EXPIRES_IN: '1d'\n};\n\nmodule.exports = config;\n`,
        "package.json": `{\n  "name": "todo-app",\n  "version": "1.0.0",\n  "main": "src/server.js",\n  "scripts": {\n    "start": "node src/server.js"\n  },\n  "dependencies": {\n    "bcryptjs": "^2.4.3",\n    "dotenv": "^16.4.5",\n    "express": "^4.19.2",\n    "jsonwebtoken": "^9.0.2",\n    "sqlite3": "^5.1.7"\n  }\n}\n`,
        "README.md": `# Node.js & Express Todo REST API Lab\n`,
      },
    };
  }
  if (
    tag === "Flask Todo" ||
    t === "flask" ||
    s.includes("flask_todo") ||
    s.includes("flask")
  ) {
    return {
      name: "python",
      rootLabel: "todo-app",
      primary: "app/__init__.py",
      runtime: "Python 3.12 · Flask",
      fileList: [
        "app/__init__.py",
        "app/models.py",
        "config.py",
        "run.py",
        "requirements.txt",
        "README.md",
      ],
      files: {
        "app/__init__.py": `from flask import Flask, jsonify\nfrom flask_sqlalchemy import SQLAlchemy\nfrom config import Config\n\ndb = SQLAlchemy()\n\ndef create_app(test_config=None):\n    app = Flask(__name__)\n    return app\n`,
        "config.py": `import os\n\nclass Config:\n    SECRET_KEY = os.environ.get('SECRET_KEY', 'yuvro-dev-secret-key-987654321')\n    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///todo.db')\n`,
        "requirements.txt": `Flask>=3.0.0\nFlask-SQLAlchemy>=3.1.1\n`,
        "README.md": `# Flask Todo App\n`,
      },
    };
  }
  if (t === "mysql" || s.includes("mysql")) return MYSQL_KIT_DEFAULT;
  if (t === "postgresql" || t === "postgres" || s.includes("postgresql") || s.includes("postgres")) return POSTGRES_KIT_DEFAULT;
  if (t.includes("mongo") || s.includes("mongo")) return MONGO_KIT_DEFAULT;
  if (t === "sql" || t === "sqlite" || s.includes("sql") || s.includes("sqlite")) return SQL_KIT_DEFAULT;
  if (t === "python" || s === "python" || s === "programming" || s === "datastructures" || isAlgo)
    return PY_KITS[tag] ?? PY_KITS["Py Fundamentals"];
  if (t === "ui" || s === "ui") return UI_KIT_DEFAULT;
  if (
    s === "linux" ||
    t === "bash" ||
    t.startsWith("linux") ||
    tag === "Linux Basics" ||
    tag === "Linux Files" ||
    tag === "Linux Perms" ||
    tag === "Linux Processes" ||
    tag === "Linux Network" ||
    tag === "Linux Shell" ||
    tag === "Linux Services"
  )
    return LINUX_KIT_DEFAULT;

  if (t === "javascript" || t === "js" || t === "typescript" || t === "ts" || t === "node" || t === "nodejs") {
    return {
      name: "js",
      rootLabel: "project",
      primary: "main.js",
      runtime: "Node.js 20",
      fileList: ["main.js", "README.md"],
      files: {
        "main.js": `console.log("Hello, World!");\n`,
        "README.md": `# Project\n`,
      },
    };
  }
  if (t === "python" || t === "py") {
    return {
      name: "python",
      rootLabel: "project",
      primary: "main.py",
      runtime: "Python 3.12",
      fileList: ["main.py", "README.md"],
      files: {
        "main.py": `print("Hello, World!")\n`,
        "README.md": `# Project\n`,
      },
    };
  }
  if (t === "c") {
    return {
      name: "c",
      rootLabel: "project",
      primary: "main.c",
      runtime: "C (gcc)",
      fileList: ["main.c", "README.md"],
      files: {
        "main.c": `#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n`,
        "README.md": `# Project\n`,
      },
    };
  }
  if (t === "cpp" || t === "c++") {
    return {
      name: "cpp",
      rootLabel: "project",
      primary: "main.cpp",
      runtime: "C++ (g++)",
      fileList: ["main.cpp", "README.md"],
      files: {
        "main.cpp": `#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}\n`,
        "README.md": `# Project\n`,
      },
    };
  }
  if (t === "java") {
    return {
      name: "java",
      rootLabel: "java-101",
      primary: "Main.java",
      runtime: "Java 17",
      fileList: ["Main.java", "README.md"],
      files: {
        "Main.java": `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n`,
        "README.md": `# Project\n`,
      },
    };
  }

  if (slug === "python" || slug === "programming" || slug === "datastructures" || isAlgo)
    return PY_KITS[tag] ?? PY_KITS["Py Fundamentals"];
  if (slug.includes("mysql")) return MYSQL_KIT_DEFAULT;
  if (slug.includes("postgresql") || slug.includes("postgres")) return POSTGRES_KIT_DEFAULT;
  if (slug.includes("mongo") || tag?.toLowerCase() === "mongosh" || tag?.toLowerCase() === "mongo")
    return MONGO_KIT_DEFAULT;
  if (slug === "sql" || slug === "sqlite" || tag?.toLowerCase() === "sql") return SQL_KIT_DEFAULT;
  if (slug === "ui") return UI_KIT_DEFAULT;
  if (
    slug === "linux" ||
    tag === "bash" ||
    tag === "Linux Basics" ||
    tag === "Linux Files" ||
    tag === "Linux Perms" ||
    tag === "Linux Processes" ||
    tag === "Linux Network" ||
    tag === "Linux Shell" ||
    tag === "Linux Services"
  )
    return LINUX_KIT_DEFAULT;
  return {
    name: "java",
    rootLabel: "java-101",
    primary: "Main.java",
    runtime: "Java 17",
    fileList: [...FILE_LIST],
    files: {
      "Main.java": STARTER_MAIN,
      "MainTest.java": STARTER_TEST,
      "README.md": STARTER_README,
    },
  };
}

type TestResult = { name: string; pass: boolean; time: string; expected?: string; got?: string; is_hidden?: boolean };
type BottomTab = "output" | "errors" | "tests" | "quality" | "preview" | "terminal" | "uidiff" | "testcases";

export function StudentTicketView(props: {
  slug: string;
  ticketId: string;
  previewOverride?: StudentPreviewOverride | null;
}) {
  const [labType, setLabType] = useState<string | null>(null);

  useEffect(() => {
    if (getSystemDesignLab(props.slug)) {
      setLabType("SYSTEM_DESIGN");
      return;
    }
    let active = true;
    getLab(props.slug)
      .then((lab) => {
        if (active && lab?.type) {
          setLabType(lab.type);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [props.slug]);

  if (
    getSystemDesignLab(props.slug) ||
    labType === "SYSTEM_DESIGN" ||
    props.slug.toLowerCase().includes("system-design") ||
    props.slug.toLowerCase().includes("systemdesign")
  ) {
    return (
      <SystemDesignStudio
        key={`${props.slug}:${props.ticketId}`}
        slug={props.slug}
        ticketId={props.ticketId}
        taskOverride={props.previewOverride ?? undefined}
      />
    );
  }

  return <CodeTicketView {...props} />;
}

function CodeTicketView({
  slug,
  ticketId,
  previewOverride,
}: {
  slug: string;
  ticketId: string;
  previewOverride?: StudentPreviewOverride | null;
}) {
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
      api
        .get<any>(`/lab/tickets/${ticketId}/`)
        .then((t) => {
          if (!active) return;
          setResolvedTicket({
            ...t,
            id: t.id,
            ticket_slug: t.ticket_slug,
            title: t.title,
            description: t.description ?? "",
            difficulty:
              t.difficulty === "HARD"
                ? "Advanced"
                : t.difficulty === "MEDIUM"
                  ? "Intermediate"
                  : "Beginner",
            xp: t.yuvro_points ?? 100,
            estMin: t.minutes_max ?? 30,
            tag: t.accepted_programming_languages?.[0] ?? t.tag ?? "bash",
            status: "in_progress",
            startup_command: t.startup_command || t.scoring_rules?.startup_command || "",
            test_command: t.test_command || t.scoring_rules?.test_command || "",
            starter_path: t.starter_path || t.starterPath || t.scoring_rules?.starter_path || t.scoring_rules?.starterPath || "",
            starterPath: t.starter_path || t.starterPath || t.scoring_rules?.starter_path || t.scoring_rules?.starterPath || "",
            connection_url: t.connection_url || t.uri || "",
            uri: t.connection_url || t.uri || "",
            databases: t.databases || [],
            ticket_type: t.ticket_type || t.type,
            type: t.type || t.ticket_type,
            domain: t.domain,
            backend_frameworks: t.backend_frameworks || [],
            programming_languages: t.programming_languages || t.accepted_programming_languages || [],
            sprint_id: t.sprint ?? null,
            sprintOrder: t.sprint_order !== undefined && t.sprint_order !== null ? (t.sprint_order === 0 ? 1 : t.sprint_order) : 1,
            ticketOrder: t.order_index !== undefined && t.order_index !== null ? (t.order_index === 0 ? 1 : t.order_index) : 1,
            tasks: Array.isArray(t.tasks) ? t.tasks.map((task: any) => {
              if (typeof task === "object" && task.title && !task.task_slug) {
                const slugMatch = task.title.match(/Task (\d+\.\d+\.\d+)/i);
                if (slugMatch) task.task_slug = `task-${slugMatch[1].replace(/\./g, "-")}`;
              }
              return task;
            }) : [],
            learning_objectives: Array.isArray(t.learning_objectives) ? t.learning_objectives : [],
            common_mistakes: Array.isArray(t.common_mistakes) ? t.common_mistakes : [],
            hints: Array.isArray(t.hints) ? t.hints : [],
            scoring_rules: t.scoring_rules || {},
            solution: t.solution || {},
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
    return () => {
      active = false;
    };
  }, [ticketId]);

  if (loading || !resolvedTicket) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
        <span className="text-sm">Loading ticket…</span>
      </div>
    );
  }

  if (
    resolvedTicket &&
    (resolvedTicket.type === "SYSTEM_DESIGN" ||
      resolvedTicket.ticket_type === "SYSTEM_DESIGN" ||
      resolvedTicket.tag === "System Design")
  ) {
    return (
      <SystemDesignStudio
        key={`${slug}:${ticketId}`}
        slug={slug}
        ticketId={ticketId}
        taskOverride={{
          title: previewOverride?.title ?? resolvedTicket.title,
          description: previewOverride?.description ?? resolvedTicket.description,
        }}
      />
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

/**
 * Computes a deterministic dynamic port in [10000, 55000) for a given candidate session identifier.
 */
export function getCandidatePort(candidateKey: string, basePort = 10000, range = 45000): number {
  if (!candidateKey) return 8000;
  let hash = 0;
  for (let i = 0; i < candidateKey.length; i++) {
    hash = (hash << 5) - hash + candidateKey.charCodeAt(i);
    hash |= 0;
  }
  return basePort + (Math.abs(hash) % range);
}

/**
 * Injects or replaces the port in a startup command with the dynamic candidate port.
 */
export function adaptStartupCommandPort(cmd: string | undefined | null, port: number): string | undefined {
  if (!cmd) return undefined;
  let res = cmd.trim();

  // 1. If Django runserver is present:
  if (res.includes("runserver")) {
    if (res.includes("0.0.0.0:")) {
      res = res.replace(/0\.0\.0\.0:\d{4,5}/g, `0.0.0.0:${port}`);
    } else if (/127\.0\.0\.1:\d{4,5}/.test(res)) {
      res = res.replace(/127\.0\.0\.1:\d{4,5}/g, `0.0.0.0:${port}`);
    } else if (/:\d{4,5}/.test(res)) {
      res = res.replace(/:\d{4,5}/g, `:${port}`);
    } else {
      res = res + ` 0.0.0.0:${port}`;
    }
    return res;
  }

  // 2. If an explicit host:port or :port is in the command:
  if (/(?:0\.0\.0\.0|127\.0\.0\.1|localhost):(\d{4,5})/.test(res)) {
    return res.replace(/(0\.0\.0\.0|127\.0\.0\.1|localhost):\d{4,5}/g, `$1:${port}`);
  }

  // 3. If --port <number> or -p <number> is in the command:
  if (/(--port|-p)\s+(\d{4,5})/.test(res)) {
    return res.replace(/(--port|-p)\s+\d{4,5}/g, `$1 ${port}`);
  }

  // 4. If trailing port number is present (e.g. "... 8000"):
  if (/\s+(\d{4,5})$/.test(res)) {
    return res.replace(/\s+\d{4,5}$/, ` ${port}`);
  }

  return res;
}

export function findTaskExecutionResult(
  taskMeta: any,
  indexInSelected: number,
  tasksData: Record<string, any>,
  taskKeys: string[]
) {
  if (!tasksData || typeof tasksData !== "object") return undefined;

  // 1. Direct match by ID
  if (taskMeta?.id && tasksData[taskMeta.id] !== undefined) {
    return tasksData[taskMeta.id];
  }
  // 2. Direct match by task_slug
  if (taskMeta?.task_slug && tasksData[taskMeta.task_slug] !== undefined) {
    return tasksData[taskMeta.task_slug];
  }
  // 3. Match by task number from title (e.g. "Task 2: Configure Redis" -> 2)
  const title = taskMeta?.title || "";
  const numMatch = title.match(/Task\s*(\d+)/i);
  if (numMatch) {
    const num = numMatch[1];
    if (tasksData[`task${num}`] !== undefined) return tasksData[`task${num}`];
    if (tasksData[`task_${num}`] !== undefined) return tasksData[`task_${num}`];
    if (tasksData[`Task ${num}`] !== undefined) return tasksData[`Task ${num}`];
    if (tasksData[`Task${num}`] !== undefined) return tasksData[`Task${num}`];
    if (tasksData[`task-${parseInt(num, 10) - 1}`] !== undefined) {
      return tasksData[`task-${parseInt(num, 10) - 1}`];
    }
  }
  // 4. Match by original_index if present
  if (taskMeta?.original_index != null) {
    const origNum = Number(taskMeta.original_index) + 1;
    if (tasksData[`task${origNum}`] !== undefined) return tasksData[`task${origNum}`];
    if (tasksData[`task_${origNum}`] !== undefined) return tasksData[`task_${origNum}`];
    if (tasksData[`task-${taskMeta.original_index}`] !== undefined) return tasksData[`task-${taskMeta.original_index}`];
  }
  // 5. Match by title
  if (title && tasksData[title] !== undefined) {
    return tasksData[title];
  }
  // 6. Match by index in selected tasks
  if (tasksData[`task${indexInSelected + 1}`] !== undefined) {
    return tasksData[`task${indexInSelected + 1}`];
  }
  if (tasksData[`task-${indexInSelected}`] !== undefined) {
    return tasksData[`task-${indexInSelected}`];
  }
  // 7. Fallback to taskKeys[indexInSelected]
  if (taskKeys[indexInSelected] && tasksData[taskKeys[indexInSelected]] !== undefined) {
    return tasksData[taskKeys[indexInSelected]];
  }
  return undefined;
}

export function formatTaskMessage(
  msg: string | undefined,
  taskIndex: number,
  originalIndex?: number | null
): string | undefined {
  if (!msg || typeof msg !== "string") return msg;
  if (originalIndex != null && originalIndex !== taskIndex) {
    const origNum = originalIndex + 1;
    return msg.replace(
      new RegExp(`Task\\s*${origNum}\\s*(failed|passed)?\\s*:?`, "gi"),
      (match) => {
        return match.toLowerCase().includes("failed")
          ? `Task ${taskIndex + 1} failed:`
          : `Task ${taskIndex + 1}:`;
      }
    );
  }
  return msg;
}

export function formatTaskTitle(
  title: string | undefined,
  taskIndex: number,
  originalIndex?: number | null
): string {
  if (!title) return `Task ${taskIndex + 1}`;
  if (originalIndex != null && originalIndex !== taskIndex) {
    const origNum = originalIndex + 1;
    return title.replace(
      new RegExp(`^Task\\s*${origNum}\\b`, "i"),
      `Task ${taskIndex + 1}`
    );
  }
  return title;
}

export function TicketIDE({
  slug,
  ticket,
  previewOverride,
  isEvaluationMode,
  isRecruiterPreview,
  evaluationId,
  onCodeChange,
  headerActions,
  initialFiles,
}: {
  slug: string;
  ticket: any;
  previewOverride: StudentPreviewOverride | null;
  isEvaluationMode?: boolean;
  isRecruiterPreview?: boolean;
  evaluationId?: string;
  onCodeChange?: (files: Record<string, string>) => void;
  headerActions?: React.ReactNode;
  initialFiles?: Record<string, string>;
}) {
  const navigate = useNavigate();
  const isDsaLabMatch = (str?: string) => {
    if (!str) return false;
    const s = str.toLowerCase().replace(/[-_]/g, " ").replace(/\s+/g, " ");
    return (
      s.includes("dsa") ||
      s.includes("data structure") ||
      s.includes("datastructure") ||
      s.includes("ds lab") ||
      s.includes("ds scenario")
    );
  };

  const isAlgo = !ticket.tag?.toLowerCase().includes("sql") && !ticket.tag?.toLowerCase().includes("mysql") && !ticket.tag?.toLowerCase().includes("postgres") && !ticket.tag?.toLowerCase().includes("mongo") && (
    slug === "programming" || slug === "datastructures" || slug === "data_structures_lab" || 
    isDsaLabMatch(slug) || isDsaLabMatch(ticket?.title) ||
    ticket.ticket_type === "algo" || ticket.type === "algo" || ticket.lab_type === "algo" || 
    ticket.ticket_type === "ALGO" || ticket.type === "ALGO" || ticket.lab_type === "ALGO" ||
    (ticket.tasks && ticket.tasks.some((t: any) => t.input !== undefined && t.input !== "" && t.input !== null))
  );
  const kit = useMemo(() => getKit(slug, ticket.tag, isAlgo), [slug, ticket.tag, isAlgo]);
  const isDjango = kit.name === "django" || ticket.backend_frameworks?.includes("DJANGO") || ticket.tag?.toLowerCase().includes("django");
  const isJava = kit.name === "java";
  const isDbTicket = ticket.ticket_type === "database" || ticket.type === "DATABASE" || ticket.domain === "DATABASE" || ticket.editor_type === "sql_editor" || ticket.editor_type === "db_editor" || (ticket.databases && ticket.databases.length > 0) || Boolean(ticket.connection_url) || kit.name === "mysql" || kit.name === "sql" || kit.name === "postgresql" || kit.name === "mongo";
  const isMysql = isDbTicket && (kit.name === "mysql" || ticket.tag?.toLowerCase() === "mysql" || ticket.databases?.some((d: any) => String(d).toLowerCase().includes("mysql")) || ticket.connection_url?.startsWith("mysql://") || Boolean(slug?.toLowerCase().includes("mysql")));
  const isPostgres = isDbTicket && (kit.name === "postgresql" || ticket.tag?.toLowerCase()?.includes("postgres") || ticket.databases?.some((d: any) => String(d).toLowerCase().includes("postgres")) || ticket.connection_url?.startsWith("postgres://") || ticket.connection_url?.startsWith("postgresql://") || Boolean(slug?.toLowerCase().includes("postgres")));
  const isMongo = isDbTicket && (kit.name === "mongo" || ticket.tag?.toLowerCase()?.includes("mongo") || ticket.databases?.some((d: any) => String(d).toLowerCase().includes("mongo")) || ticket.connection_url?.startsWith("mongodb://") || ticket.connection_url?.startsWith("mongodb+srv://") || Boolean(slug?.toLowerCase().includes("mongo")));
  const isSql = isDbTicket && !isMysql && !isPostgres && !isMongo && (kit.name === "sql" || ticket.tag?.toLowerCase() === "sql" || ticket.tag?.toLowerCase() === "sqlite" || Boolean(slug?.toLowerCase().includes("sql")));
  const isAnySql = isSql || isMysql || isPostgres;
  const isExternalDb = isMysql || isPostgres;
  const dbType = isMysql ? "mysql" : "postgresql";
  const isUi = kit.name === "ui";
  const isPython = kit.name === "python" || isDjango;
  const isDbEditor = isDbTicket && (isAnySql || isMongo);
  const isBash = kit.name === "bash";
  const isGit = kit.name === "git";

  const isReal = slug !== "knowledge" && !tickets.some((t) => t.id === ticket.id);

  const isDsa =
    isReal ||
    isDsaLabMatch(slug) ||
    isDsaLabMatch(ticket?.title) ||
    isDsaLabMatch(ticket?.tag) ||
    isDsaLabMatch(ticket?.lab_type) ||
    isDsaLabMatch(ticket?.lab_name);

  if (!isEvaluationMode && !isRecruiterPreview && !isDsa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md rounded-xl border bg-card p-6 text-center shadow-lg space-y-4">
          <span className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
            Upcoming Lab
          </span>
          <h2 className="text-xl font-semibold">Lab Workspace Not Available</h2>
          <p className="text-sm text-muted-foreground">
            This lab is currently upcoming. Sprints and tickets are for preview only.
          </p>
          <Link
            to="/student/lab/$slug"
            params={{ slug }}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Back to Lab Overview
          </Link>
        </div>
      </div>
    );
  }

  const { user, isLoading } = useAuth();
  const userId = useMemo(() => {
    return user?.id?.toString() ?? "";
  }, [user]);
  const effectiveUserId = useMemo(() => {
    if (userId) return userId;
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(`eval_user_${evaluationId}`);
      if (stored) return stored;
      try {
        const cand = JSON.parse(localStorage.getItem("yuvro-eval-candidate") || "{}");
        if (cand?.id) return String(cand.id);
        if (cand?.userId) return String(cand.userId);
      } catch {}
    }
    return "anon";
  }, [userId, evaluationId]);
  const labId = isAlgo ? `${slug}_${ticket.id}` : slug;
  const sprintId = ticket.id?.toString() ?? "0";

  const candidateKey = useMemo(() => {
    if (isRecruiterPreview) return "preview_recruiter";
    const userIdentifier = effectiveUserId;
    const evalIdentifier = evaluationId || "direct";
    const labIdentifier = slug || ticket?.id || "lab";
    return `${userIdentifier}_${evalIdentifier}_${labIdentifier}`;
  }, [effectiveUserId, evaluationId, slug, ticket?.id, isRecruiterPreview]);

  const candidatePort = useMemo(() => getCandidatePort(candidateKey), [candidateKey]);

  const computedStartupCommand = useMemo(() => {
    if (!ticket?.startup_command) return undefined;
    const cmd = ticket.startup_command.trim();
    if (cmd.startsWith("mysql ") || cmd.includes("mysql defaultdb")) {
      return undefined;
    }
    return adaptStartupCommandPort(cmd, candidatePort);
  }, [ticket?.startup_command, candidatePort]);

  const previewPort = candidatePort;
  const [wsLoaded, setWsLoaded] = useState(false);
  const submissionsEndpoint = isEvaluationMode ? "/skill_evaluation/lab-submissions/" : "/lab/submissions/";
  const submissionsIdField = isEvaluationMode ? "lab_question" : "lab_sprint_ticket";
  const submissionsStatusField = isEvaluationMode ? "status" : "ticket_status";

  useEffect(() => {
    if (!(window as any).__labSessionStartTime) {
      (window as any).__labSessionStartTime = Date.now();
    }
    return () => {
      delete (window as any).__labSessionStartTime;
    };
  }, [ticket?.id]);
  const [labTitle, setLabTitle] = useState("");
  const isMultiLang = isAlgo;
  type ProgLang = "python" | "c" | "cpp" | "js" | "java";
  const PROG_EXT: Record<ProgLang, string> = { python: "py", c: "c", cpp: "cpp", js: "js", java: "java" };
  const PROG_LABEL: Record<ProgLang, string> = { python: "Python 3", c: "C (gcc)", cpp: "C++ (g++)", js: "Node.js", java: "Java" };

  const defaultLang: ProgLang = useMemo(() => {
    // 1. If ticket specifies a file or starterPath, infer from extension
    const filePath = ticket.starterPath || (ticket as any).starter_path || ticket.file || "";
    if (filePath) {
      const ext = filePath.split(".").pop()?.toLowerCase();
      if (ext === "py") return "python";
      if (ext === "java") return "java";
      if (ext === "c") return "c";
      if (ext === "cpp" || ext === "cc" || ext === "cxx") return "cpp";
      if (ext === "js" || ext === "ts") return "js";
    }

    // 2. Check ticket.tag
    const rawTag = (ticket.tag || "").toLowerCase();
    if (rawTag === "python" || rawTag.includes("python") || rawTag === "py") return "python";
    if (rawTag === "java" || rawTag.includes("java")) return "java";
    if (rawTag === "cpp" || rawTag === "c++" || rawTag.includes("cpp") || rawTag.includes("c++")) return "cpp";
    if (rawTag === "c") return "c";
    if (rawTag === "javascript" || rawTag === "js" || rawTag === "node") return "js";

    // 3. Check programming_languages in the specified order
    const plangs = (ticket.programming_languages || []).map((l: string) => (l || "").toLowerCase());
    for (const l of plangs) {
      if (l === "python" || l === "py") return "python";
      if (l === "java") return "java";
      if (l === "cpp" || l === "c++") return "cpp";
      if (l === "c") return "c";
      if (l === "javascript" || l === "js" || l === "node") return "js";
    }

    return "python";
  }, [ticket.tag, ticket.programming_languages, ticket.file, ticket.starterPath, (ticket as any).starter_path]);

  const [progLang, setProgLang] = useState<ProgLang>(() => {
    if (initialFiles) {
      const keys = Object.keys(initialFiles).filter(k => k.startsWith('main.'));
      if (keys.length > 0) {
        const ext = keys[0].split('.').pop() || '';
        const extToLang: Record<string, ProgLang> = { py: 'python', c: 'c', cpp: 'cpp', js: 'js', java: 'java' };
        if (extToLang[ext]) return extToLang[ext];
      }
    }
    return defaultLang;
  });

  const defaultPrimaryFile = useMemo(() => {
    if (ticket.starterPath) return ticket.starterPath;
    if ((ticket as any).starter_path) return (ticket as any).starter_path;
    if (ticket.file) return ticket.file;
    if (kit.primary) return kit.primary;
    const ext = PROG_EXT[defaultLang] || "py";
    return defaultLang === "java" ? "Main.java" : `main.${ext}`;
  }, [ticket.starterPath, (ticket as any).starter_path, ticket.file, kit.primary, defaultLang]);

  const defaultStarterCode = useMemo(() => {
    const fileExt = (defaultPrimaryFile || "").split(".").pop()?.toLowerCase();
    const effectiveLang: ProgLang = fileExt === "py" ? "python" 
      : fileExt === "java" ? "java" 
      : fileExt === "c" ? "c" 
      : (fileExt === "cpp" || fileExt === "cc") ? "cpp" 
      : (fileExt === "js" || fileExt === "ts") ? "js" 
      : defaultLang;

    const startersByLang: Record<string, string> = {
      python: "# Write your solution here\n",
      js: "// Write your solution here\n",
      java: "public class Main {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n",
      c: "#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n",
      cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n",
    };

    const customCode = previewOverride?.starterCode || ticket.starterCode || (ticket as any).starter_code || ((ticket as any).code && (ticket as any).code !== "// Code editor initialized." ? (ticket as any).code : undefined);

    if (customCode) {
      const isJavaCode = customCode.includes("public class") || customCode.includes("System.out.println");
      if (effectiveLang === "python" && isJavaCode) {
        return startersByLang["python"];
      }
      return customCode;
    }

    if (isSql || isMysql || isPostgres || fileExt === "sql") return "-- Write your query here\n";
    if (isBash || fileExt === "sh") return "#!/usr/bin/env bash\n\n# Write your solution here\n";
    if (isReal && slug !== "knowledge") {
      if (defaultPrimaryFile && kit.files && kit.files[defaultPrimaryFile]) {
        return kit.files[defaultPrimaryFile];
      }
      if (kit.primary && kit.files && kit.files[kit.primary]) {
        return kit.files[kit.primary];
      }
      return startersByLang[effectiveLang] || "# Write your solution here\n";
    }
    return kit.files[kit.primary] || startersByLang[effectiveLang] || "# Write your solution here\n";
  }, [previewOverride, ticket.starterCode, (ticket as any).starter_code, (ticket as any).code, isReal, slug, isSql, isMysql, isPostgres, isBash, defaultLang, defaultPrimaryFile, kit]);

  const [isExamplesPanelOpen, setIsExamplesPanelOpen] = useState(false);
  const initialFileList: readonly string[] = kit.fileList;
  const starters: Record<string, string> = useMemo(() => {
    if (initialFiles) return initialFiles;
    if (isReal && slug !== "knowledge") {
      const s: Record<string, string> = { ...kit.files };
      if (defaultPrimaryFile) {
        s[defaultPrimaryFile] = defaultStarterCode;
      }
      return s;
    }
    const s = { ...kit.files };
    if (isReal && s["README.md"]) {
      s["README.md"] = `# ${ticket.title}\n\n${ticket.description}`;
    }
    if (previewOverride?.starterCode && kit.primary) {
      s[kit.primary] = previewOverride.starterCode;
    }
    return s;
  }, [initialFiles, isReal, slug, defaultPrimaryFile, defaultStarterCode, kit, ticket.title, ticket.description, previewOverride]);
  const primaryFile = defaultPrimaryFile || kit.primary;
  
  const [files, setFiles] = useState<Record<string, string>>(starters);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});

  const isInternalOrHiddenFile = (p: string): boolean => {
    if (!p) return true;
    const lower = p.toLowerCase();
    return (
      lower.includes("yuvro_scoring_rules") ||
      lower.includes("scoring_rules") ||
      lower.includes("__pycache__") ||
      lower.endsWith(".pyc") ||
      lower.startsWith(".git") ||
      lower.includes("/.git")
    );
  };

  const fileList = useMemo(
    () => Object.keys(files).filter(k => Boolean(k && k.trim()) && !isInternalOrHiddenFile(k)),
    [files]
  );
  
  const [activeFile, setActiveFile] = useState<FileName>(() => {
    if (initialFiles) {
      const keys = Object.keys(initialFiles).filter(k => k !== "README.md");
      if (keys.length > 0) return keys[0];
    }
    return defaultPrimaryFile || (isReal && slug !== "knowledge" ? "" : initialFileList[0]);
  });
  
  const [openTabs, setOpenTabs] = useState<string[]>(() => {
    if (initialFiles) return Object.keys(initialFiles).filter(k => Boolean(k && k.trim()));
    if (defaultPrimaryFile) return [defaultPrimaryFile];
    if (isReal && slug !== "knowledge") return [];
    return [...initialFileList];
  });

  const [ticketStatus, setTicketStatus] = useState<Status>(() => {
    if (ticket.status === "done" || ticket.status === "in_review" || ticket.status === "backlog" || ticket.status === "in_progress") {
      return ticket.status as Status;
    }
    return "in_progress";
  });
  const [inlineAction, setInlineAction] = useState<InlineTreeAction | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  function openFile(path: string) {
    if (!path || !path.trim()) return;
    setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
    setActiveFile(path);
  }

  function closeTab(path: string, e: React.MouseEvent) {
    e.stopPropagation();
    setOpenTabs((prev) => {
      const next = prev.filter((p) => p !== path);
      if (activeFile === path) {
        setActiveFile(next.length > 0 ? next[next.length - 1] : "");
      }
      return next;
    });
  }

  // Load workspace file tree and first file content from executor on mount (real tickets only)
  const loadWorkspaceFiles = useCallback(async (forceUpdate: boolean = false) => {
    if (isLoading) return;
    if (!isReal || (!effectiveUserId && !isEvaluationMode) || slug === "knowledge") {
      setWsLoaded(true);
      return;
    }
    if (!forceUpdate) setWsLoaded(false);
    try {
      let currentTitle = "";
      if (slug === "knowledge") {
        currentTitle = "Knowledge Assessment";
      } else {
        try {
          const labEndpoint = isEvaluationMode
            ? `/skill_evaluation/lab-questions/${labId}/` 
            : `/lab/labs/${labId}/`;
          const { default: api } = await import("@/utils/RestApiAuthUtil");
          const realLab = await api.get<any>(labEndpoint);
          if (realLab?.status === "upcoming") {
            navigate({ to: "/student/dashboard" });
            return;
          }
          currentTitle = (realLab as any)?.title || (realLab as any)?.name || (realLab as any)?.data?.title || "";
        } catch (e) {
          currentTitle = labs.find(l => l.slug === slug)?.name || "";
        }
      }
      setLabTitle(currentTitle);
      const isSqliteLab = currentTitle === "SQLite Lab";

      try {
        const flatten = (node: FileTreeNode, acc: Record<string, string>) => {
          if (!node) return acc;
          if (node.name === ".bash_history" || node.name === "yuvro_scoring_rules" || node.name === "__pycache__" || !node.name) return acc;
          if (node.type === "file") {
            if (node.path && node.path.trim()) acc[node.path] = "";
          } else node.children?.forEach(c => flatten(c, acc));
          return acc;
        };

        let paths: Record<string, string> = {};
        // Poll up to 6 times to allow copying files and Docker sync
        for (let attempt = 0; attempt < 6; attempt++) {
          const res = await fetchFileTree(effectiveUserId, labId, sprintId, starters, isSqliteLab ? "sqlite" : "other", isEvaluationMode ? evaluationId : undefined);
          paths = flatten(res.tree, {});
          if (Object.keys(paths).length > 0 || slug === "knowledge") {
            break;
          }
          if (attempt < 5) {
            await new Promise(r => setTimeout(r, 600));
          }
        }

        // If paths is still empty (lab with no starter repo), seed default primary file
        if (Object.keys(paths).length === 0 && defaultPrimaryFile) {
          paths = { [defaultPrimaryFile]: defaultStarterCode };
          if (isReal) {
            wsWriteFile(effectiveUserId, labId, sprintId, defaultPrimaryFile, defaultStarterCode, evaluationId)
              .then(() => loadedFiles.current.add(defaultPrimaryFile))
              .catch(console.error);
          }
        }

        const fileKeys = Object.keys(paths).filter(k => Boolean(k && k.trim()) && !isInternalOrHiddenFile(k));
        setFiles(prev => {
          const next = { ...paths };
          for (const k of fileKeys) {
            if (prev[k] && prev[k] !== "") next[k] = prev[k];
          }
          return next;
        });

        const { fetchFile } = await import("@/services/workspaceService");
        // Pick preferred active file: defaultPrimaryFile, README.md, manage.py, main.py, or first non-binary file
        const preferredFile = (defaultPrimaryFile && fileKeys.includes(defaultPrimaryFile) ? defaultPrimaryFile : null)
          || fileKeys.find(k => k === "README.md")
          || fileKeys.find(k => k === "manage.py")
          || fileKeys.find(k => k === "main.py")
          || fileKeys.find(k => !isBinaryOrDatabaseFile(k))
          || fileKeys[0]
          || defaultPrimaryFile;

        if (preferredFile) {
          setOpenTabs(prev => {
            const clean = prev.filter(t => Boolean(t && t.trim()) && !isInternalOrHiddenFile(t));
            return clean.includes(preferredFile) ? clean : [...clean, preferredFile];
          });
          setActiveFile(prev => isInternalOrHiddenFile(prev) ? preferredFile : (prev || preferredFile));
          if (paths[preferredFile] && paths[preferredFile] !== "") {
            loadedFiles.current.add(preferredFile);
          } else {
            try {
              let content = await fetchFile(effectiveUserId, labId, sprintId, preferredFile, isEvaluationMode ? evaluationId : undefined);
              if (preferredFile.endsWith(".py") && (content.includes("public class") || content.includes("System.out.println"))) {
                content = "# Write your solution here\n";
                if (isReal) {
                  wsWriteFile(effectiveUserId, labId, sprintId, preferredFile, content, evaluationId).catch(console.error);
                }
              }
              setFiles(f => ({ ...f, [preferredFile]: content }));
              loadedFiles.current.add(preferredFile);
            } catch (err) {
              console.error("Failed to load preferred file content:", err);
            }
          }
        } else if (!forceUpdate) {
          setOpenTabs(defaultPrimaryFile ? [defaultPrimaryFile] : []);
          setActiveFile(defaultPrimaryFile || "");
        }
        setWsLoaded(true);
      } catch (err) {
        console.error("Failed to fetch file tree:", err);
        if (defaultPrimaryFile) {
          setFiles(f => ({ ...starters, ...f, [defaultPrimaryFile]: f[defaultPrimaryFile] ?? defaultStarterCode }));
          setOpenTabs(prev => prev.includes(defaultPrimaryFile) ? prev : [...prev, defaultPrimaryFile]);
          setActiveFile(defaultPrimaryFile);
        }
        setWsLoaded(true); // fall back on error
      }
    } catch {
      if (defaultPrimaryFile) {
        setFiles(f => ({ ...starters, ...f, [defaultPrimaryFile]: f[defaultPrimaryFile] ?? defaultStarterCode }));
        setOpenTabs(prev => prev.includes(defaultPrimaryFile) ? prev : [...prev, defaultPrimaryFile]);
        setActiveFile(defaultPrimaryFile);
      }
      setWsLoaded(true); // fall back to local starters on error
    }
  }, [isLoading, isReal, effectiveUserId, isEvaluationMode, slug, labId, sprintId, starters, defaultPrimaryFile, defaultStarterCode, evaluationId]);

  useEffect(() => {
    if (isLoading) return;
    if (isEvaluationMode && evaluationId && labId) {
      evaluationService.startLab(evaluationId, labId).catch((err) => {
        console.error("Failed to start lab workspace:", err);
      });
    }
    loadWorkspaceFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id, isReal, effectiveUserId, isLoading, evaluationId, labId]);

  // Lazy-load file content when the active file changes (real tickets only)
  const loadedFiles = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!isReal || !wsLoaded || !activeFile) return;
    if (loadedFiles.current.has(activeFile)) return;
    fetchFile(effectiveUserId, labId, sprintId, activeFile, evaluationId)
      .then(content => {
        let cleanContent = content;
        if (activeFile.endsWith(".py") && (cleanContent.includes("public class") || cleanContent.includes("System.out.println"))) {
          cleanContent = "# Write your solution here\n";
          if (isReal) {
            wsWriteFile(effectiveUserId, labId, sprintId, activeFile, cleanContent, evaluationId).catch(console.error);
          }
        }
        setFiles(f => ({ ...f, [activeFile]: cleanContent }));
        loadedFiles.current.add(activeFile);
      })
      .catch(() => {
        loadedFiles.current.add(activeFile);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile, isReal, wsLoaded, effectiveUserId]);

  const [tab, setTab] = useState<"problem" | "hints" | "discuss" | "solution">("problem");
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>("terminal");
  const [uiDiffResult, setUiDiffResult] = useState<any>(null);
  const [hintLevel, setHintLevel] = useState(2);
  const [elapsed, setElapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(`elapsed_${ticket.id}`);
      return stored ? parseInt(stored, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });
  const { theme, toggle: toggleTheme } = useTheme();
  const [showProgress, setShowProgress] = useState(true);
  const [fileTreeOpen, setFileTreeOpen] = useState(true);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const toggleFolder = (k: string) => setOpenFolders((o) => ({ ...o, [k]: !(o[k] ?? true) }));
  const isFolderOpen = (k: string) => openFolders[k] ?? true;
  const [sidePanel, setSidePanel] = useState<null | "preview" | "mentor">(null);
  const [previewDevice, setPreviewDevice] = useState<"Mobile" | "Tablet" | "Desktop">("Desktop");
  const [sideWidth, setSideWidth] = useState<number | null>(null);
  const [leftWidth, setLeftWidth] = useState<number>(360);
  const [explorerWidth, setExplorerWidth] = useState<number>(240);
  const [bottomHeight, setBottomHeight] = useState<number>(240);
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);
  const [quickSearchQuery, setQuickSearchQuery] = useState("");
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const mainIdeRef = useRef<HTMLDivElement>(null);

  function startLeftResize(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftWidth;
    const onMove = (ev: MouseEvent) => {
      const next = startWidth + (ev.clientX - startX);
      setLeftWidth(Math.min(650, Math.max(260, next)));
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

  function startExplorerResize(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = explorerWidth;
    const onMove = (ev: MouseEvent) => {
      const next = startWidth + (ev.clientX - startX);
      setExplorerWidth(Math.min(480, Math.max(160, next)));
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

  function startBottomResize(e: React.MouseEvent) {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = bottomHeight;
    const onMove = (ev: MouseEvent) => {
      const next = startHeight - (ev.clientY - startY);
      setBottomHeight(Math.min(600, Math.max(140, next)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

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

  useEffect(() => {
    setSideWidth(null);
  }, [sidePanel]);

  // Reset file state when switching tickets (esp. between Java and Django sets)
  // For real tickets, workspace files are loaded by loadWorkspaceFiles — don't overwrite them.
  useEffect(() => {
    if (!isReal) {
      setFiles(starters);
      setActiveFile(initialFileList[0]);
    }
    setDirty({});
    setTestsRan(false);
    setOutput("");
    if (isMultiLang) {
      const valid: ProgLang[] = ["python", "c", "cpp", "js", "java"];
      if (valid.includes(ticket.tag as ProgLang)) setProgLang(ticket.tag as ProgLang);
      else setProgLang("python");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [initialRevealedHints, setInitialRevealedHints] = useState<number[]>([]);
  const [initialSolutionRevealed, setInitialSolutionRevealed] = useState(false);
  const creatingSubmissionRef = useRef(false);
  
  useEffect(() => {
    if (previewOverride) return;
    const isDummy = !isReal;
    const RECENT_LAB_KEY = "ylabs-recent-lab";
    if (labId !== "knowledge" && slug !== "knowledge") {
      const labEndpoint = isEvaluationMode
            ? `/skill_evaluation/lab-questions/${labId}/` 
            : `/lab/labs/${labId}/`;
      import("@/utils/RestApiAuthUtil").then(({ default: api }) => {
        api.get<any>(labEndpoint)
          .then((realLab) => {
            try { localStorage.setItem(RECENT_LAB_KEY, JSON.stringify({ id: slug, name: realLab.data?.title || realLab.data?.name })); } catch {}
          })
          .catch(() => {
            const labName = labs.find((l) => l.slug === slug)?.name ?? slug;
            setLabTitle(labName);
            try {
              localStorage.setItem(RECENT_LAB_KEY, JSON.stringify({ id: slug, name: labName }));
            } catch {}
          });
      });
    }

    if (isDummy || slug === "knowledge") return;

    // In evaluation mode the `evaluation` FK is required by the backend.
    // If evaluationId is not yet available, skip — the effect will re-run when it is.
    if (isEvaluationMode && !evaluationId) return;

    import("@/utils/RestApiAuthUtil").then(({ default: api }) => {
      const taskId = ticket.id;
      const evalQuery = isEvaluationMode && evaluationId ? `&evaluation=${evaluationId}` : "";
      api.get<any[]>(`${submissionsEndpoint}?${submissionsIdField}=${taskId}${evalQuery}`)
        .then(async (subs) => {
          if (subs.length === 0) {
            setTicketStatus("in_progress");
            if (creatingSubmissionRef.current) return;
            creatingSubmissionRef.current = true;
            try {
              const created = await api.post<any>(submissionsEndpoint, {
                [submissionsIdField]: taskId,
                ...(isEvaluationMode && evaluationId ? { evaluation: evaluationId } : {}),
                [submissionsStatusField]: "in_progress",
              });
              setSubmissionId(created.id);
            } catch (err) {
              console.error("Failed to create submission, it might already exist.", err);
              // Fallback to fetch it again if it was created in a parallel request
              const subsAgain = await api.get<any[]>(`${submissionsEndpoint}?${submissionsIdField}=${taskId}${evalQuery}`);
              if (subsAgain.length > 0) {
                setSubmissionId(subsAgain[0].id);
              }
            } finally {
              creatingSubmissionRef.current = false;
            }
          } else {
            const sub = subs[0];
            setSubmissionId(sub.id);
            if (sub.ticket_status) {
              setTicketStatus(sub.ticket_status === "backlog" ? "in_progress" : (sub.ticket_status as Status));
            } else {
              setTicketStatus("in_progress");
            }
            if (sub.revealed_hints) {
              setInitialRevealedHints(sub.revealed_hints);
            }
            if (sub.solution_revealed) {
              setInitialSolutionRevealed(true);
            }
            if (sub.ticket_status === "backlog") {
              await api.patch(`${submissionsEndpoint}${ sub.id }/`, {
                [submissionsStatusField]: "in_progress",
              });
            }
            if (!isReal && sub.solution) {
              try {
                const parsed = JSON.parse(sub.solution);
                if (typeof parsed === "object" && parsed !== null) {
                  setFiles((prev) => ({ ...prev, ...parsed }));
                }
              } catch (e) {
                // Legacy fallback: single string
                setFiles((prev) => ({ ...prev, [kit.primary]: sub.solution }));
              }
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
      case "java":
        return `// ${banner}\nimport java.util.*;\n\nclass main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java");\n    }\n}\n`;
    }
  }

  function switchProgLang(next: ProgLang) {
    if (next === progLang) return;
    const ext = PROG_EXT[next];
    const fname = next === "java" ? "Main.java" : `main.${ext}`;
    setProgLang(next);
    setFiles((f) => {
      if (f[fname] !== undefined) return f;
      return { ...f, [fname]: progStarter(next, ticket.title) };
    });
    setOpenTabs((prev) => prev.includes(fname) ? prev : [...prev, fname]);
    setActiveFile(fname);
  }

  // ---- File ops (VS Code-like): create / rename / delete ----
  function createFile(path: string, contents = "") {
    const trimmed = path.trim().replace(/^\/+/, "");
    if (!trimmed) return;
    if (files[trimmed] !== undefined) {
      showToast("File already exists");
      return;
    }
    setFiles((f) => ({ ...f, [trimmed]: contents }));
    setDirty((d) => ({ ...d, [trimmed]: true }));
    setOpenTabs((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setActiveFile(trimmed);
    if (isReal) {
      wsWriteFile(effectiveUserId, labId, sprintId, trimmed, contents, evaluationId)
        .then(() => loadedFiles.current.add(trimmed))
        .catch(() => showToast(`⚠ Could not persist ${trimmed}`));
    }
  }

  function renameFile(oldPath: string, newPath: string) {
    const trimmed = newPath.trim().replace(/^\/+/, "");
    if (!trimmed || trimmed === oldPath) return;
    if (files[trimmed] !== undefined) {
      showToast("Target path already exists");
      return;
    }
    const content = files[oldPath] ?? "";
    setFiles((f) => {
      const { [oldPath]: _, ...rest } = f;
      return { ...rest, [trimmed]: content };
    });
    setDirty((d) => {
      const { [oldPath]: was, ...rest } = d;
      return { ...rest, [trimmed]: true };
    });
    setOpenTabs((tabs) => tabs.map((t) => (t === oldPath ? trimmed : t)));
    if (activeFile === oldPath) setActiveFile(trimmed);
    if (isReal) {
      wsWriteFile(effectiveUserId, labId, sprintId, trimmed, content, evaluationId)
        .then(() => deleteWorkspaceFile(effectiveUserId, labId, sprintId, oldPath, evaluationId))
        .catch(() => showToast(`⚠ Could not rename ${oldPath}`));
    }
  }

  function deleteFile(path: string) {
    setConfirmDialog({
      isOpen: true,
      title: "Delete File",
      description: `Are you sure you want to delete ${path}? This action cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () => {
        setFiles((f) => {
          const { [path]: _drop, ...rest } = f;
          return rest;
        });
        setDirty((d) => {
          const { [path]: _drop, ...rest } = d;
          return rest;
        });
        setOpenTabs((tabs) => {
          const next = tabs.filter((t) => t !== path);
          if (activeFile === path) {
            setActiveFile(next.length > 0 ? next[next.length - 1] : "");
          }
          return next;
        });
        if (isReal) {
          deleteWorkspaceFile(effectiveUserId, labId, sprintId, path, evaluationId)
            .catch(() => showToast(`⚠ Could not delete ${path}`));
        }
      },
    });
  }

  function deleteFolder(prefix: string) {
    const targets = Object.keys(files).filter((p) => p === prefix || p.startsWith(prefix + "/"));
    if (targets.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: "Delete Folder",
      description: `Are you sure you want to delete folder ${prefix}/ and ${targets.length} file(s)?`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () => {
        setFiles((f) => {
          const next = { ...f };
          targets.forEach((p) => {
            delete next[p];
          });
          return next;
        });
        setDirty((d) => {
          const next = { ...d };
          targets.forEach((p) => {
            delete next[p];
          });
          return next;
        });
        setOpenTabs((tabs) => {
          const next = tabs.filter((t) => !targets.includes(t));
          if (targets.includes(activeFile)) {
            setActiveFile(next.length > 0 ? next[next.length - 1] : "");
          }
          return next;
        });
        if (isReal) {
          deleteWorkspaceFile(effectiveUserId, labId, sprintId, prefix, evaluationId)
            .catch(() => showToast(`⚠ Could not delete folder ${prefix}`));
        }
      },
    });
  }
  const [output, setOutput] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [tests, setTests] = useState<TestResult[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [supportedLanguages, setSupportedLanguages] = useState<Record<string, any>>({});
  const [customTestCases, setCustomTestCases] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<any>(null);
  const [executionMetrics, setExecutionMetrics] = useState<any>(null);
  const [executionOutput, setExecutionOutput] = useState<string>("");
  const [taskExecutionData, setTaskExecutionData] = useState<any>(null);

  useEffect(() => {
    codeExecutorService.getSupportedLanguagesAndTemplates()
      .then(res => {
        if (res && res.details) {
          setSupportedLanguages(res.details);
        }
      })
      .catch(err => console.warn("Failed to fetch executor languages", err));
  }, []);
  
  useEffect(() => {
    if (isReal && ticket.tasks?.length) {
      setTests(ticket.tasks.map((t: any, i: number) => ({
        name: `Test ${i+1} · ${t.title || 'Validation'}`,
        pass: false,
        time: "—"
      })));
    } else if (!isReal) {
      setTests([
        { name: "Test 1 · Variables Declaration", pass: false, time: "—" },
        { name: "Test 2 · Type Casting (implicit)", pass: false, time: "—" },
        { name: "Test 3 · Type Casting (explicit)", pass: false, time: "—" },
        { name: "Test 4 · String Operations", pass: false, time: "—" },
        { name: "Test 5 · Output Format", pass: false, time: "—" },
      ]);
    }
  }, [ticket.tasks, isReal]);
  const [testsRan, setTestsRan] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [autoSave, setAutoSave] = useState<boolean>(true);

  // Auto-save logic
  useEffect(() => {
    if (!autoSave) return;
    const dirtyPaths = Object.keys(dirty).filter(k => dirty[k]);
    if (dirtyPaths.length === 0) return;
    
    const timer = setTimeout(() => {
      handleSave(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [files, dirty, autoSave]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed((e) => {
        const next = e + 1;
        try {
          localStorage.setItem(`elapsed_${ticket.id}`, String(next));
        } catch {}
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [ticket.id]);

  const onCodeChangeRef = useRef(onCodeChange);
  useEffect(() => {
    onCodeChangeRef.current = onCodeChange;
  }, [onCodeChange]);

  useEffect(() => {
    if (onCodeChangeRef.current) {
      onCodeChangeRef.current(files);
    }
  }, [files]);

  // Keyboard: Ctrl/Cmd+Enter to run, Ctrl/Cmd+S to save, Ctrl/Cmd+P to quick-open files
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); handleRun(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); handleSave(false); }
      if ((e.metaKey || e.ctrlKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        setQuickSwitcherOpen((prev) => !prev);
      }
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
    if (isMultiLang && !isJava) return "ok";
    const m = files["Main.java"];
    if (!m) return "ok";
    if (!/class\s+\w+/.test(m) || !/public\s+static\s+void\s+main/.test(m)) return "err";
    if (/\bcastedDouble\b/.test(m) && !/println.*castedDouble|System\.out.*castedDouble/.test(m))
      return "warn";
    return "ok";
  }, [files, isMultiLang, isJava, isPython, isDjango, isAnySql, isMongo, isUi, isBash, activeFile]);

  const [dbSchemas, setDbSchemas] = useState<DbSchema[]>([]);
  const [dbSchemasLoading, setDbSchemasLoading] = useState<boolean>(false);
  const [hasDbConnection, setHasDbConnection] = useState<boolean>(false);
  const [runId, setRunId] = useState(0);

  const refreshSchema = useCallback(async () => {
    if (typeof window === "undefined") return;

    if (isMysql) {
      const mysqlUri = ticket.connection_url || ticket.uri || localStorage.getItem("mysqlUri") || "";
      if (!mysqlUri.trim()) {
        setHasDbConnection(false);
        setDbSchemas([]);
        return;
      }
      setHasDbConnection(true);
      setDbSchemasLoading(true);
      try {
        const tables: any = await fetchExternalDbSchema("mysql", mysqlUri, {
          userId: effectiveUserId,
          labId,
          sprintId,
          evaluationId: isEvaluationMode ? evaluationId : undefined,
        });
        const formattedTables = (tables || []).map((t: any) => ({
          name: t.table || t.name,
          columns: (t.columns || []).map((c: any) => ({
            name: c.name,
            type: c.type || "VARCHAR",
            nullable: "YES",
            default: "-",
            key: "-",
          })),
          ddl: `-- Table: ${t.table || t.name}`,
        }));
        setDbSchemas([
          {
            name: "defaultdb",
            type: "MySQL",
            tables: formattedTables,
          },
        ]);
      } catch (err) {
        setDbSchemas([]);
      } finally {
        setDbSchemasLoading(false);
      }
    } else if (isPostgres) {
      const postgresUri = ticket.connection_url || ticket.uri || localStorage.getItem("postgresqlUri") || localStorage.getItem("postgresUri") || "";
      if (!postgresUri.trim()) {
        setHasDbConnection(false);
        setDbSchemas([]);
        return;
      }
      setHasDbConnection(true);
      setDbSchemasLoading(true);
      try {
        const tables: any = await fetchExternalDbSchema("postgresql", postgresUri, {
          userId: effectiveUserId,
          labId,
          sprintId,
          evaluationId: isEvaluationMode ? evaluationId : undefined,
        });
        const formattedTables = (tables || []).map((t: any) => ({
          name: t.table || t.name,
          columns: (t.columns || []).map((c: any) => ({
            name: c.name,
            type: c.type || "VARCHAR",
            nullable: "YES",
            default: "-",
            key: "-",
          })),
          ddl: `-- Table: ${t.table || t.name}`,
        }));
        setDbSchemas([
          {
            name: "public",
            type: "PostgreSQL",
            tables: formattedTables,
          },
        ]);
      } catch (err) {
        setDbSchemas([]);
      } finally {
        setDbSchemasLoading(false);
      }
    } else if (isMongo) {
      const mongoUri = ticket.connection_url || ticket.uri || localStorage.getItem("mongoUri") || "";
      if (!mongoUri.trim()) {
        setHasDbConnection(false);
        setDbSchemas([]);
        return;
      }
      setHasDbConnection(true);
      setDbSchemasLoading(true);
      try {
        const tables: any = await fetchExternalDbSchema("mongodb", mongoUri, {
          userId: effectiveUserId,
          labId,
          sprintId,
          evaluationId: isEvaluationMode ? evaluationId : undefined,
        });
        const formattedTables = (tables || []).map((t: any) => ({
          name: t.table || t.name,
          columns: [],
          ddl: `-- Collection: ${t.table || t.name}`,
        }));
        setDbSchemas([
          {
            name: "default",
            type: "MongoDB",
            tables: formattedTables,
          },
        ]);
      } catch (err) {
        setDbSchemas([]);
      } finally {
        setDbSchemasLoading(false);
      }
    } else if (isSql) {
      setHasDbConnection(true);
      setDbSchemas(getAlasqlSchema());
    }
  }, [isMysql, isPostgres, isMongo, isSql, ticket.connection_url, ticket.uri]);

  useEffect(() => {
    refreshSchema();

    const handleSchemaRefresh = () => {
      refreshSchema();
    };

    window.addEventListener("db-schema-refresh", handleSchemaRefresh);
    window.addEventListener("storage", handleSchemaRefresh);

    return () => {
      window.removeEventListener("db-schema-refresh", handleSchemaRefresh);
      window.removeEventListener("storage", handleSchemaRefresh);
    };
  }, [refreshSchema]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  const evaluateSubmission = async (src: string, output: string) => {
    if (!isReal || !ticket.tasks || ticket.tasks.length === 0) return;
    let passedCount = 0;
    const promises = ticket.tasks.map(async (task: any, idx: number) => {
      const taskSlug = task.task_slug || `task-${idx}`;
      const scoringRules: Record<string, any> = task.scoring_rules ?? {};
      const reqCmd = "git";
      setEvaluating(prev => ({ ...prev, [taskSlug]: true }));
      try {
        const { evaluateTask } = await import("@/services/workspaceService");
        const result = await evaluateTask(effectiveUserId, labId, sprintId, reqCmd, taskSlug, scoringRules, evaluationId);
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
  };

  async function handleRun() {
    if (isReal) {
      const filesToSave = getFilesToSave();
      try {
        await Promise.all(
          Object.keys(filesToSave).map(p => wsWriteFile(effectiveUserId, labId, sprintId, p, filesToSave[p] ?? "", evaluationId))
        );
      } catch (err) {
        console.error("Failed to save files before running tests:", err);
      }
    }
    setRunning(true);
    const src = files[activeFile] ?? "";
    const file = activeFile;

    const effectiveTestCommand = (ticket.test_command || ticket.scoring_rules?.test_command || "").trim();
    if (effectiveTestCommand) {
      try {
        const { runTestCommand } = await import("@/services/workspaceService");
        const res = await runTestCommand(effectiveUserId, labId, sprintId, effectiveTestCommand, evaluationId);

        let outText = res.stdout || "";
        if (res.stderr && res.stderr.trim()) {
          outText += (outText ? "\n" : "") + res.stderr;
        }
        if (!outText && res.exit_code !== 0) {
          outText = `Process exited with code ${res.exit_code}`;
        }
        setOutput(outText);
        setExecutionOutput(outText);

        let parsedData = (res.data && typeof res.data === "object") ? res.data : null;
        if (!parsedData && res.stdout) {
          try {
            const parsed = JSON.parse(res.stdout);
            if (parsed && typeof parsed === "object") {
              parsedData = parsed;
            }
          } catch {}
        }

        if (parsedData && typeof parsedData === "object") {
          setTaskExecutionData(parsedData);
          const tasksData = parsedData.tasks || {};
          const taskKeys = Object.keys(tasksData);
          
          const newEvalResult: Record<string, { passed: boolean; reason: string }> = {};
          const nextTests: TestResult[] = [];
          const ticketTasks: any[] = Array.isArray(ticket?.tasks) && ticket.tasks.length > 0 ? ticket.tasks : [];

          if (ticketTasks.length > 0) {
            let totalPassedScore = 0;
            let totalPossibleScore = 0;
            let passedCount = 0;

            ticketTasks.forEach((tMeta, idx) => {
              const tObj = findTaskExecutionResult(tMeta, idx, tasksData, taskKeys);
              const isPassed = tObj?.result === "passed" || tObj?.status === "passed" || (tObj?.score ?? 0) > 0;
              const taskKey = tMeta.id || tMeta.task_slug || `task-${idx}`;

              const rawReason = tObj?.message || tObj?.reason || (isPassed ? "Passed" : "Failed");
              const formattedReason = formatTaskMessage(rawReason, idx, tMeta?.original_index) || rawReason;

              newEvalResult[taskKey] = {
                passed: isPassed,
                reason: formattedReason,
              };

              const taskLabel = formatTaskTitle(tMeta.title || tObj?.title, idx, tMeta?.original_index);
              const taskMax = Number(tMeta.marks ?? tObj?.max_score ?? 10);
              totalPossibleScore += taskMax;

              let taskScore = 0;
              if (isPassed) {
                passedCount++;
                taskScore = typeof tObj?.score === "number" ? Math.min(tObj.score, taskMax) : taskMax;
                if (taskScore <= 0) taskScore = taskMax;
              }
              totalPassedScore += taskScore;

              const scoreLabel = tObj?.score !== undefined ? ` (${tObj.score} pts)` : (tMeta.marks ? ` (${tMeta.marks} pts)` : "");
              nextTests.push({
                name: `${taskLabel}${scoreLabel}`,
                pass: isPassed,
                time: "—",
                expected: "Task completed successfully",
                got: tObj?.message || tObj?.reason || (isPassed ? "Passed" : "Failed"),
              });
            });

            setEvalResult(prev => ({ ...prev, ...newEvalResult }));
            if (nextTests.length > 0) {
              setTests(nextTests);
              setTestsRan(true);
            }

            const maxScore = totalPossibleScore > 0 ? totalPossibleScore : Number(ticket?.marks ?? ticket?.points ?? 10);
            setTicketScore({ passed: totalPassedScore, total: maxScore });
            showToast(`Score: ${totalPassedScore} / ${maxScore} (${passedCount}/${ticketTasks.length} passed)`);
          } else {
            taskKeys.forEach((key, idx) => {
              const tObj = tasksData[key];
              const isPassed = tObj?.result === "passed" || (tObj?.score ?? 0) > 0;
              newEvalResult[key] = {
                passed: isPassed,
                reason: tObj?.message || (isPassed ? "Passed" : "Failed"),
              };
              const taskLabel = key;
              const scoreLabel = tObj?.score !== undefined ? ` (${tObj.score} pts)` : "";
              nextTests.push({
                name: `${taskLabel}${scoreLabel}`,
                pass: isPassed,
                time: "—",
                expected: "Task completed successfully",
                got: tObj?.message || (isPassed ? "Passed" : "Failed"),
              });
            });

            setEvalResult(prev => ({ ...prev, ...newEvalResult }));
            if (nextTests.length > 0) {
              setTests(nextTests);
              setTestsRan(true);
            }

            const passedScore = parsedData.total_score ?? res.total_score ?? 0;
            const maxScore = parsedData.max_possible_score ?? res.max_possible_score ?? ticket?.marks ?? ticket?.points ?? ticket?.max_score ?? 10;
            setTicketScore({ passed: passedScore, total: maxScore });
            showToast(`Score: ${passedScore} / ${maxScore}`);
          }
        } else {
          const ticketTasks: any[] = Array.isArray(ticket?.tasks) && ticket.tasks.length > 0 ? ticket.tasks : [];
          if (ticketTasks.length > 0 && res.exit_code !== 0) {
            const newEvalResult: Record<string, { passed: boolean; reason: string }> = {};
            const nextTests: TestResult[] = [];
            const rawError = (res.stderr?.trim() || res.stdout?.trim() || `Execution exited with code ${res.exit_code}`).slice(0, 300);
            let totalPossibleScore = 0;

            ticketTasks.forEach((tMeta, idx) => {
              const taskKey = tMeta.id || tMeta.task_slug || `task-${idx}`;
              const taskLabel = formatTaskTitle(tMeta.title, idx, tMeta?.original_index);
              const taskMax = Number(tMeta.marks ?? tMeta.points ?? 10);
              totalPossibleScore += taskMax;

              newEvalResult[taskKey] = {
                passed: false,
                reason: rawError,
              };

              nextTests.push({
                name: `${taskLabel} (0 pts)`,
                pass: false,
                time: "—",
                expected: "Task completed successfully",
                got: rawError,
              });
            });

            setEvalResult(prev => ({ ...prev, ...newEvalResult }));
            if (nextTests.length > 0) {
              setTests(nextTests);
              setTestsRan(true);
            }
            const maxScore = totalPossibleScore > 0 ? totalPossibleScore : Number(ticket?.marks ?? ticket?.points ?? 10);
            setTicketScore({ passed: 0, total: maxScore });
            showToast(`Score: 0 / ${maxScore} (0/${ticketTasks.length} passed)`);
          } else {
            showToast(res.exit_code === 0 ? "Tests ran successfully" : "Execution completed with errors");
          }
        }
        setBottomTab("preview");
      } catch (err: any) {
        setOutput(err.message || "Error executing tests");
        setExecutionOutput(err.message || "Error executing tests");
        showToast("Test execution failed");
        setBottomTab("preview");
      } finally {
        setRunning(false);
      }
      return;
    }

    if (isMultiLang || isPython) {
      let extLang = 'python';
      if (file.endsWith(".c")) extLang = "c";
      else if (file.endsWith(".cpp") || file.endsWith(".cc")) extLang = "cpp";
      else if (file.endsWith(".js") || file.endsWith(".ts")) extLang = "javascript";
      else if (file.endsWith(".java")) extLang = "java";

      const execLang = selectedLanguage || extLang;

      const hasAlgorithmicTests = (ticket.tasks || []).some((tc: any) => tc.input !== undefined || tc.expected_output !== undefined) || (customTestCases && customTestCases.length > 0);
      if (!hasAlgorithmicTests && isReal) {
        setRunning(false);
        showToast("No test command or test cases configured for this ticket.");
        return;
      }

      try {
        const res = await codeExecutorService.executeCode({
          code: src,
          language: execLang,
          test_cases: ticket.tasks || [],
          test_cases_custom: customTestCases || []
        });

        setExecutionOutput(res.output);
        setExecutionMetrics({
          execution_time: res.execution_time,
          memory_usage: res.memory_usage,
          status: res.status
        });
        setTestResults(res.test_results);

        const hasTestResults = Boolean(res.test_results?.results && res.test_results.results.length > 0);
        if (res.status === 'completed' || res.status === 'failed' || hasTestResults) {
          if (res.test_cases_passed === res.total_test_cases && res.total_test_cases > 0) {
            showToast(`All ${res.total_test_cases} tests passed!`);
          } else {
            showToast(`Passed ${res.test_cases_passed} of ${res.total_test_cases} tests`);
          }
          setTestsRan(true);

          const newEvalResult: Record<string, { passed: boolean; reason: string }> = {};
          const tasksToIterate = (ticket.tasks && ticket.tasks.length > 0) ? ticket.tasks : (res.test_results?.results || []);

          tasksToIterate.forEach((taskMeta: any, idx: number) => {
            const tr = res.test_results?.results?.[idx];
            const isPassed = tr ? tr.passed === true : (res.test_cases_passed > 0 && idx < res.test_cases_passed);
            const reasonMsg = tr ? (tr.passed ? "Passed" : (tr.error || (tr.actual_output !== tr.expected_output ? `Expected "${tr.expected_output}", got "${tr.actual_output}"` : "Output mismatch"))) : (isPassed ? "Passed" : "Task failed verification");

            const itemEval = { passed: isPassed, reason: reasonMsg };

            if (taskMeta?.task_slug) newEvalResult[taskMeta.task_slug] = itemEval;
            if (taskMeta?.id) newEvalResult[String(taskMeta.id)] = itemEval;
            newEvalResult[`task-${idx}`] = itemEval;
            newEvalResult[`task${idx + 1}`] = itemEval;
          });

          setEvalResult(prev => ({ ...prev, ...newEvalResult }));
          setTicketScore({ passed: res.test_cases_passed, total: res.total_test_cases });
          setLastExecutionResult(res);

          if (res.test_results?.results && res.test_results.results.length > 0) {
            setTests(tasksToIterate.map((tMeta: any, idx: number) => {
              const tr = res.test_results?.results?.[idx];
              const isHidden = Boolean(tr?.is_hidden || isTaskHidden(tMeta));
              return {
                name: tMeta?.title || `Test Case ${idx + 1}`,
                pass: tr ? tr.passed === true : false,
                time: tr?.execution_time ? `${tr.execution_time.toFixed(2)}s` : "—",
                expected: isHidden ? "" : (tr?.expected_output || ""),
                got: isHidden ? "" : (tr?.actual_output || tr?.error || tr?.console_output || ""),
                is_hidden: isHidden
              };
            }));
          } else {
            setTests([{ name: "All Tests", pass: res.test_cases_passed === res.total_test_cases, time: `${res.execution_time}s` }]);
          }
        } else if (res.status === 'timeout') {
          showToast('Time Limit Exceeded');
        } else {
          showToast(`Execution failed: ${res.reason || res.error_message || "Check output"}`);
        }
      } catch (err: any) {
        setExecutionOutput(err.message || 'Error executing code');
        showToast('Code execution failed');
      } finally {
        setRunning(false);
        setBottomTab("preview");
      }
      return;
    }
    if (isAnySql || isMongo) {
      setExecutedQuery(src);
      setRunId((r) => r + 1);

      const dbFiles = Object.keys(files).filter(path => path.endsWith(".db"));
      const dbFile = dbFiles.length > 0 ? dbFiles[0] : null;
      const targetDbFile = dbFile || "__none__";

      const dbEngine = isMysql ? "mysql" : isPostgres ? "postgresql" : isMongo ? "mongodb" : "sqlite";
      let connectionUrl = ticket.connection_url || ticket.uri || "";
      if (!connectionUrl && typeof window !== "undefined") {
        if (isPostgres) {
          connectionUrl = localStorage.getItem("postgresqlUri") || localStorage.getItem("postgresUri") || "";
        } else if (isMysql) {
          connectionUrl = localStorage.getItem("mysqlUri") || "";
        } else if (isMongo) {
          connectionUrl = localStorage.getItem("mongoUri") || localStorage.getItem("mongodbUri") || "";
        }
      }

      const tTasks = ticket.tasks || [];
      let task = null;
      let activeTaskIndex = 0;
      if (activeFile.startsWith("task")) {
         const numMatch = activeFile.match(/task(\d+)\.(sql|js)/);
         if (numMatch) {
            const idx = parseInt(numMatch[1], 10) - 1;
            activeTaskIndex = Math.max(0, idx);
            if (tTasks[idx]) task = tTasks[idx];
         }
      }
      if (!task && tTasks.length > 0) {
          task = tTasks[0];
      }

      let sRules: any = undefined;
      let sysQ: any = undefined;
      let expR: any = undefined;
      let expQ: any = task?.solution?.["query.js"] ?? task?.solution?.["query.sql"] ?? ticket.solution?.["query.js"] ?? ticket.solution?.["query.sql"];
      let expOut: any = task?.expected_output ?? ticket.expected_output ?? ticket.solution?.["expected_output"];
      let expOutStr = typeof expOut === 'object' ? JSON.stringify(expOut) : expOut;
      if (task && typeof task === "object" && task.scoring_rules) {
        sRules = task.scoring_rules;
        sysQ = sRules?.system_query;
        expR = sRules?.expected_result;
      } else {
        sRules = ticket.scoring_rules || {};
        sysQ = sRules?.system_query;
        expR = sRules?.expected_result;
      }
      
      if (!expQ || expQ.trim() === "") {
        expQ = sysQ;
      }

      setOutput(
        isMongo
          ? (connectionUrl ? `-- Executing MongoDB query on connection URL\n…running…` : `-- Executing MongoDB query\n…running…`)
          : (connectionUrl ? `-- Executing query on ${dbEngine} database\n…running…` : `-- Executing query on ${dbFile || "none"}\n…running…`)
      );
      
      const executeSql = async () => {
        try {
          const { runCommand, runDatabaseQuery } = await import("@/services/workspaceService");
          if (ticket.startup_command && !connectionUrl) {
            await runCommand(userId, labId, sprintId, ticket.startup_command, evaluationId);
          }
          const activeTaskId = task?.id || undefined;
          return await runDatabaseQuery(
            userId,
            labId,
            sprintId,
            src,
            targetDbFile,
            dbEngine,
            expQ,
            expOutStr,
            sRules,
            sysQ,
            expR,
            evaluationId,
            activeFile,
            activeTaskId,
            connectionUrl ? connectionUrl.trim() : undefined
          );
        } catch (err: any) {
          throw err;
        }
      };

      executeSql()
        .then((res) => {
          let outText = `-- Executed Query\n\n`;
          if (res.stdout) outText += `${res.stdout}\n`;
          if (res.stderr) outText += `Error:\n${res.stderr}\n`;
          outText += `\n✓ Process finished with exit code ${res.exit_code}`;
          
          if (res.evaluation) {
            const finalPct = res.evaluation.final_score_pct || 0;
            const points = finalPct * 10;
            const passed = finalPct === 1.0;
            outText += `\n\nEvaluation: ${passed ? "✓ Passed" : "✗ Failed"}`;
            outText += `\nScore Breakdown:`;
            outText += `\n- Query Match: ${res.evaluation.query_matches ? "2.5" : "0"} / 2.5`;
            outText += `\n- Output Match: ${res.evaluation.output_matches ? "2.5" : "0"} / 2.5`;
            if (sysQ) outText += `\n- System Validation: ${res.evaluation.system_matches ? "5.0" : "0"} / 5.0`;
            outText += `\nTotal Points: ${points} / 10`;
            
            if (!passed && sysQ) outText += `\n\nCheck failed. Ensure you followed the instructions exactly.`;
            setTicketScore({ passed: points, total: 10 });
            setTestsRan(true);
            setTests([{ name: "Ticket Check", pass: passed, time: "0ms" }]);
            
            const targetTaskSlug = task && typeof task === "object" && task.task_slug ? task.task_slug : `task-${activeTaskIndex}`;
            const targetFallbackSlug = `task-${activeTaskIndex}`;
            setEvalResult(prev => ({ 
              ...prev, 
              [targetTaskSlug]: { passed, reason: passed ? "" : (sysQ ? "Check failed." : "Failed") },
              [targetFallbackSlug]: { passed, reason: passed ? "" : (sysQ ? "Check failed." : "Failed") } 
            }));
          }
          
          setOutput(outText);
          setExecutionOutput(outText);
          setBottomTab("preview");
        })
        .catch((err) => {
          setOutput(`Error running script: ${err.message}`);
          setExecutionOutput(`Error running script: ${err.message}`);
          setBottomTab("preview");
        })
        .finally(() => setRunning(false));
      return;
    }
    if (isUi) {
      setRunning(true);
      setOutput("Running UI validation...");

      import("@/utils/RestApiAuthUtil").then(({ default: api }) => {
        api.post("/lab/frontend-validate/", {
          ticket_slug: ticket.ticket_slug ?? ticket.id,
          user_html: files["index.html"] ?? "",
          user_css: files["style.css"] ?? files["styles.css"] ?? "",
          user_js: files["script.js"] ?? "",
          lab_id: labId,   // lab UUID — lets executor resolve starter repo path
        }).then((res: any) => {
          setRunning(false);
          
          // Create a clean object to show in the console without flooding it with base64 images
          // The user requested ui_score, js_score, and checks
          const resultJson: any = {
            ui_score: res.ui_score ?? 0,
            js_score: res.js_score ?? 0,
            checks: res.checks ?? []
          };
          
          // Only remove js_score for the first 2 sprints of the HTML/CSS/JS lab
          if (ticket.ticket_slug?.startsWith("s1-") || ticket.ticket_slug?.startsWith("s2-")) {
            delete resultJson.js_score;
          }
          
          setOutput(JSON.stringify(resultJson, null, 2));
          setBottomTab("preview");
          
          if (isReal && submissionId) {
             const uiScore = res.ui_score ?? 0;
             const structScore = res.structural_score ?? 0;
             const isPass = uiScore >= 75 && structScore >= 75;
             const uiPct = isPass ? 100 : 0;
             api.patch(`${submissionsEndpoint}${ submissionId }/`, {
               [submissionsStatusField]: isPass ? "done" : "in_progress",
               solution: JSON.stringify(getFilesToSave()),
               solution_output: JSON.stringify({ percentage: uiPct, total_score: uiPct }),
             }).catch(console.error);
          }
        }).catch((err: any) => {
          console.error(err);
          setOutput(`Error running validation: ${err.message}`);
          setBottomTab("preview");
          setRunning(false);
        });
      });
      return;
    }
    if (isGit) {
      // Git Lab: evaluate every task from ticket.tasks using scoring_rules
      setRunning(true);
      setOutput("⏳ Evaluating Git tasks against your terminal history...");

      const tasks: any[] = ticket.tasks ?? [];
      if (tasks.length === 0) {
        setOutput(JSON.stringify({ error: "No tasks found for this ticket." }, null, 2));
        setRunning(false);
        return;
      }

      const { evaluateTask } = await import("@/services/workspaceService");
      const results: Record<string, any> = {};
      let passedCount = 0;

      for (let idx = 0; idx < tasks.length; idx++) {
        const task = tasks[idx];
        const taskSlug = task.task_slug || `task-${idx}`;
        const scoringRules: Record<string, any> = task.scoring_rules ?? {};
        setEvaluating((prev) => ({ ...prev, [taskSlug]: true }));
        try {
          const result = await evaluateTask(userId, labId, sprintId, "git", taskSlug, scoringRules, evaluationId);
          results[taskSlug] = {
            title: task.title ?? taskSlug,
            passed: result.passed,
            reason: result.reason,
          };
          setEvalResult((prev) => ({ ...prev, [taskSlug]: result }));
          if (result.passed) passedCount++;
        } catch (err: any) {
          results[taskSlug] = { title: task.title ?? taskSlug, passed: false, reason: err.message };
          setEvalResult((prev) => ({
            ...prev,
            [taskSlug]: { passed: false, reason: err.message },
          }));
        } finally {
          setEvaluating((prev) => ({ ...prev, [taskSlug]: false }));
        }
      }

      setTicketScore({ passed: passedCount, total: tasks.length });
      setBottomTab("preview");
      setOutput(
        JSON.stringify(
          {
            ticket: ticket.title ?? ticket.id,
            score: { passed: passedCount, total: tasks.length },
            tasks: results,
          },
          null,
          2,
        ),
      );

      const gitPct = Math.round((passedCount / tasks.length) * 100);
      const gitOutput = JSON.stringify({ percentage: gitPct, total_score: gitPct });
      if (isReal && submissionId) {
        import("@/utils/RestApiAuthUtil").then(({ default: api }) => {
          api.patch(`${submissionsEndpoint}${ submissionId }/`, {
            [submissionsStatusField]: passedCount === tasks.length ? "done" : "in_progress",
            solution: JSON.stringify(getFilesToSave()),
            solution_output: gitOutput,
          }).catch(console.error);
        });
      } else if (isReal && !submissionId) {
        import("@/utils/RestApiAuthUtil").then(({ default: api }) => {
          api.post(submissionsEndpoint, {
            [submissionsIdField]: ticket.id,
            ...(isEvaluationMode && evaluationId ? { evaluation: evaluationId } : {}),
            [submissionsStatusField]: passedCount === tasks.length ? "done" : "in_progress",
            solution: JSON.stringify(getFilesToSave()),
            solution_output: gitOutput,
          }).catch(console.error);
        });
      }

      setRunning(false);
      return;
    }
    if (isDjango) {
      const outText = `$ python manage.py runserver\n…starting Django dev server…\n✓ Running on http://127.0.0.1:8000/`;
      setOutput(outText);
      evaluateSubmission(src, outText);
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
        setOutput(
          "$ javac Main.java\n❌ Main.java:1: error: class or main method missing\n1 error",
        );
        setBottomTab("errors");
      } else {
        const out: string[] = [];
        const re = /System\.out\.println\("([^"]*)"\s*\+\s*([^)]+)\)/g;
        let match;
        const ctx: Record<string, string> = {
          integerValue: "42",
          pi: "3.14",
          isJavaFun: "true",
          greeting: "Hello Java",
        };
        while ((match = re.exec(m))) {
          const label = match[1];
          let val = match[2].trim();
          if (val.endsWith(".length()")) val = String("Hello Java".length);
          else if (val.endsWith(".charAt(0)")) val = "H";
          else val = ctx[val] ?? val;
          out.push(label + val);
        }
        const outText = "$ javac Main.java\n$ java Main\n" + out.join("\n") + "\n\n✓ Program ran successfully (1.2s)";
        setOutput(outText);
        evaluateSubmission(src, outText);
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
        {
          name: "Test 1 · Variables Declaration",
          pass: /int\s+\w+\s*=/.test(m) && /double\s+\w+\s*=/.test(m),
          time: "12ms",
        },
        {
          name: "Test 2 · Type Casting (implicit)",
          pass: /double\s+\w+\s*=\s*\w+\s*;/.test(m),
          time: "8ms",
        },
        { name: "Test 3 · Type Casting (explicit)", pass: /\(int\)\s*\w/.test(m), time: "9ms" },
        {
          name: "Test 4 · String Operations",
          pass: /\.length\(\)/.test(m) && /\.charAt\(/.test(m),
          time: "7ms",
        },
        {
          name: "Test 5 · Output Format",
          pass: /printf\(/.test(m),
          time: "11ms",
          expected: '"Result: 42"',
          got: '"Result42"',
        },
      ];
      setTests(next);
      setTestsRan(true);
    }, 600);
  }

  const [evaluating, setEvaluating] = useState<Record<string, boolean>>({});
  const [executedQuery, setExecutedQuery] = useState("");
  const [evalResult, setEvalResult] = useState<Record<string, { passed: boolean; reason: string }>>(
    {},
  );
  const [ticketScore, setTicketScore] = useState<{ passed: number; total: number } | null>(null);
  const [lastExecutionResult, setLastExecutionResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleEvaluate = async (
    taskSlug: string,
    requiredCommand: string,
    scoringRules?: Record<string, any>,
  ) => {
    setEvaluating((prev) => ({ ...prev, [taskSlug]: true }));
    try {
      const { evaluateTask } = await import("@/services/workspaceService");
      const result = await evaluateTask(userId, labId, sprintId, requiredCommand, taskSlug, scoringRules, evaluationId);
      setEvalResult(prev => ({ ...prev, [taskSlug]: result }));
    } catch (err: any) {
      setEvalResult((prev) => ({ ...prev, [taskSlug]: { passed: false, reason: err.message } }));
    } finally {
      setEvaluating((prev) => ({ ...prev, [taskSlug]: false }));
    }
  };

  async function handleSubmit() {
    function notifyTicketSubmitted(status = "done") {
      try {
        const localKanbanStr = localStorage.getItem(`kanban_${slug}`);
        const kanban = localKanbanStr ? JSON.parse(localKanbanStr) : {};
        kanban[ticket.id] = status;
        localStorage.setItem(`kanban_${slug}`, JSON.stringify(kanban));
      } catch (e) {}
      invalidateStudentStats();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("yuvro:ticket_submission_updated", {
          detail: { ticketId: ticket.id, status }
        }));
        window.dispatchEvent(new CustomEvent("yuvro-submission-updated"));
      }
    }

    const sessionStartMs = (window as any).__labSessionStartTime || Date.now();
    const elapsedSessionSecs = Math.max(1, Math.round((Date.now() - sessionStartMs) / 1000));
    const elapsedSessionMins = Math.max(1, Math.round(elapsedSessionSecs / 60));
    const startedAtIso = new Date(sessionStartMs).toISOString();
    const submittedAtIso = new Date().toISOString();

    if (isReal) {
      const filesToSave = getFilesToSave();
      try {
        await Promise.all(
          Object.keys(filesToSave).map(p => wsWriteFile(effectiveUserId, labId, sprintId, p, filesToSave[p] ?? "", evaluationId))
        );
      } catch (err) {
        console.error(err);
      }
    }

    if (isAnySql) {
      setSubmitting(true);
      const tTasks: any[] = ticket.tasks || [];
      let passedTaskCount = 0;
      const tasksMap: Record<string, any> = {};

      if (tTasks.length > 0) {
        tTasks.forEach((tMeta: any, idx: number) => {
          const slug1 = tMeta?.task_slug || `task-${idx}`;
          const slug2 = `task-${idx}`;
          const isPassed = Boolean(evalResult[slug1]?.passed || evalResult[slug2]?.passed);
          if (isPassed) passedTaskCount++;
          const taskMarks = typeof tMeta?.marks === "number" ? tMeta.marks : 10;
          tasksMap[`task_${idx + 1}`] = {
            task_file: `task${idx + 1}.sql`,
            name: tMeta?.title || `Task ${idx + 1}`,
            passed: isPassed,
            result: isPassed ? "passed" : "failed",
            score: isPassed ? taskMarks : 0,
            max_score: taskMarks,
            message: isPassed ? "Test passed successfully" : (evalResult[slug1]?.reason || "Check failed"),
          };
        });
      }

      let computedSqlScore = 0;
      if (tTasks.length > 0) {
        computedSqlScore = Math.round((passedTaskCount / tTasks.length) * 100);
      } else if (ticketScore) {
        computedSqlScore = ticketScore.total > 0 ? Math.round((ticketScore.passed / ticketScore.total) * 100) : ticketScore.passed;
      }

      const sqlSolutionOutput = tTasks.length > 0 ? JSON.stringify({
        tasks: Object.values(tasksMap),
        percentage: computedSqlScore,
        total_score: computedSqlScore,
      }) : JSON.stringify({ percentage: computedSqlScore, total_score: computedSqlScore });

      if (isReal && slug !== "knowledge") {
        import("@/utils/RestApiAuthUtil").then(({ default: api }) => {
          const payload: any = {
            [submissionsStatusField]: "in_review",
            solution: JSON.stringify(getFilesToSave()),
            score: computedSqlScore,
            seconds_solved: elapsedSessionSecs,
            minutes_solved: elapsedSessionMins,
            started_at: startedAtIso,
            submitted_at: submittedAtIso,
            ...(sqlSolutionOutput ? { solution_output: sqlSolutionOutput } : {}),
          };
          if (submissionId) {
            api.patch(`${submissionsEndpoint}${submissionId}/`, {
              ...payload,
              [submissionsStatusField]: "done"
            }).catch(console.error).finally(() => setSubmitting(false));
          } else {
            api.post(submissionsEndpoint, {
              [submissionsIdField]: ticket.id,
              ...(isEvaluationMode && evaluationId ? { evaluation: evaluationId } : {}),
              ...payload,
              [submissionsStatusField]: "done"
            }).catch(console.error).finally(() => setSubmitting(false));
          }
          if (isEvaluationMode) {
            window.parent.postMessage({
              type: "LAB_SUBMITTED",
              labId: ticket.id,
              score: computedSqlScore,
              seconds_solved: elapsedSessionSecs,
              minutes_solved: elapsedSessionMins,
              started_at: startedAtIso,
              submitted_at: submittedAtIso
            }, "*");
          } else {
            notifyTicketSubmitted(computedSqlScore > 0 ? "done" : "in_progress");
            navigate({ to: "/student/lab/$slug/ticket/$ticketId/review", params: { slug, ticketId: ticket.id } });
          }
        });
      } else {
        if (isEvaluationMode) {
          window.parent.postMessage({
            type: "LAB_SUBMITTED",
            labId: ticket.id,
            score: computedSqlScore,
            seconds_solved: elapsedSessionSecs,
            minutes_solved: elapsedSessionMins,
            started_at: startedAtIso,
            submitted_at: submittedAtIso
          }, "*");
        } else {
          notifyTicketSubmitted(computedSqlScore > 0 ? "done" : "in_progress");
          navigate({ to: "/student/lab/$slug/ticket/$ticketId/review", params: { slug, ticketId: ticket.id } });
        }
      }
      return;
    }

    if (isUi && uiDiffResult) {
      setSubmitting(true);
      const computedUiScore = ticketScore ? ticketScore.passed : 0;
      if (isReal && slug !== "knowledge") {
        import("@/utils/RestApiAuthUtil").then(({ default: api }) => {
          const uiSolutionOutput = JSON.stringify({ percentage: computedUiScore, total_score: computedUiScore });
          if (submissionId) {
            api.patch(`${submissionsEndpoint}${submissionId}/`, {
              [submissionsStatusField]: computedUiScore > 0 ? "done" : "in_progress",
              solution: JSON.stringify(getFilesToSave()),
              score: computedUiScore,
              seconds_solved: elapsedSessionSecs,
              minutes_solved: elapsedSessionMins,
              started_at: startedAtIso,
              submitted_at: submittedAtIso,
              solution_output: uiSolutionOutput
            }).catch(console.error).finally(() => setSubmitting(false));
          } else {
            api.post(submissionsEndpoint, {
              [submissionsIdField]: ticket.id,
              ...(isEvaluationMode && evaluationId ? { evaluation: evaluationId } : {}),
              [submissionsStatusField]: computedUiScore > 0 ? "done" : "in_progress",
              solution: JSON.stringify(getFilesToSave()),
              score: computedUiScore,
              seconds_solved: elapsedSessionSecs,
              minutes_solved: elapsedSessionMins,
              started_at: startedAtIso,
              submitted_at: submittedAtIso,
              solution_output: uiSolutionOutput
            }).catch(console.error).finally(() => setSubmitting(false));
          }
          if (isEvaluationMode) {
            window.parent.postMessage({
              type: "LAB_SUBMITTED",
              labId: ticket.id,
              score: computedUiScore,
              seconds_solved: elapsedSessionSecs,
              minutes_solved: elapsedSessionMins,
              started_at: startedAtIso,
              submitted_at: submittedAtIso
            }, "*");
          } else {
            notifyTicketSubmitted(computedUiScore > 0 ? "done" : "in_progress");
            navigate({ to: "/student/lab/$slug/ticket/$ticketId/review", params: { slug, ticketId: ticket.id } });
          }
        });
      } else {
        if (isEvaluationMode) {
          window.parent.postMessage({
            type: "LAB_SUBMITTED",
            labId: ticket.id,
            score: computedUiScore,
            seconds_solved: elapsedSessionSecs,
            minutes_solved: elapsedSessionMins,
            started_at: startedAtIso,
            submitted_at: submittedAtIso
          }, "*");
        } else {
          notifyTicketSubmitted(computedUiScore > 0 ? "done" : "in_progress");
          navigate({ to: "/student/lab/$slug/ticket/$ticketId/review", params: { slug, ticketId: ticket.id } });
        }
      }
      return;
    }

    if (isReal && ticket.tasks && ticket.tasks.length > 0) {
      setSubmitting(true);

      // Compute score as a percentage (0–100) so the recruiter report
      // can scale it correctly (it treats score > 10 && <= 100 as percent).
      const totalTasks = Math.max(1, ticketScore?.total ?? ticket.tasks.length);
      const passedTasks = ticketScore?.passed ?? 0;
      const computedScore = Math.round((passedTasks / totalTasks) * 100);

      // Build solution_output JSON from the last execution result so the
      // recruiter report can show per-task pass/fail breakdown accurately.
      let solutionOutput = JSON.stringify({ tasks: {}, total_score: computedScore, max_possible_score: 100, percentage: computedScore });
      if (taskExecutionData && typeof taskExecutionData === "object") {
        solutionOutput = JSON.stringify(taskExecutionData);
      } else if (lastExecutionResult) {
        const tasksMap: Record<string, any> = {};
        (ticket.tasks || []).forEach((tMeta: any, idx: number) => {
          const tr = lastExecutionResult.test_results?.results?.[idx];
          const taskKey = tMeta?.task_slug || `task${idx + 1}`;
          const isPassed = tr ? tr.passed === true : false;
          const taskMarks = typeof tMeta?.marks === "number" ? tMeta.marks : 20;
          tasksMap[taskKey] = {
            result: isPassed ? "passed" : "failed",
            score: isPassed ? taskMarks : 0,
            max_score: taskMarks,
            message: isPassed ? "Test passed" : (tr?.error || "Output mismatch"),
            actual_output: tr?.actual_output || "",
            expected_output: tr?.expected_output || "",
          };
        });
        solutionOutput = JSON.stringify({
          test_cases_passed: lastExecutionResult.test_cases_passed,
          total_test_cases: lastExecutionResult.total_test_cases,
          tasks: tasksMap,
          total_score: computedScore,
          max_possible_score: 100,
          percentage: computedScore,
        });
      }

      if (slug !== "knowledge") {
        import("@/utils/RestApiAuthUtil").then(({ default: api }) => {
          const payload: any = {
            [submissionsStatusField]: computedScore > 0 ? "done" : "in_progress",
            solution: JSON.stringify(getFilesToSave()),
            score: computedScore,
            seconds_solved: elapsedSessionSecs,
            minutes_solved: elapsedSessionMins,
            started_at: startedAtIso,
            submitted_at: submittedAtIso,
            ...(solutionOutput ? { solution_output: solutionOutput } : {}),
          };
          if (submissionId) {
            api.patch(`${submissionsEndpoint}${submissionId}/`, payload)
              .catch(console.error).finally(() => setSubmitting(false));
          } else {
            api.post(submissionsEndpoint, {
              [submissionsIdField]: ticket.id,
              ...(isEvaluationMode && evaluationId ? { evaluation: evaluationId } : {}),
              ...payload,
            }).catch(console.error).finally(() => setSubmitting(false));
          }
          if (isEvaluationMode) {
            window.parent.postMessage({
              type: "LAB_SUBMITTED",
              labId: ticket.id,
              score: computedScore,
              seconds_solved: elapsedSessionSecs,
              minutes_solved: elapsedSessionMins,
              started_at: startedAtIso,
              submitted_at: submittedAtIso
            }, "*");
          } else {
            notifyTicketSubmitted(computedScore > 0 ? "done" : "in_progress");
            navigate({ to: "/student/lab/$slug/ticket/$ticketId/review", params: { slug, ticketId: ticket.id } });
          }
        });
      } else {
        setSubmitting(false);
        if (isEvaluationMode) {
          window.parent.postMessage({
            type: "LAB_SUBMITTED",
            labId: ticket.id,
            score: computedScore,
            seconds_solved: elapsedSessionSecs,
            minutes_solved: elapsedSessionMins,
            started_at: startedAtIso,
            submitted_at: submittedAtIso
          }, "*");
        } else {
          notifyTicketSubmitted(computedScore > 0 ? "done" : "in_progress");
          navigate({ to: "/student/lab/$slug/ticket/$ticketId/review", params: { slug, ticketId: ticket.id } });
        }
      }
      return;
    }

    setBottomTab("tests");
    setTests((ts) => ts.map((t) => ({ ...t, time: "…", pass: false })));
    setTimeout(() => {
      const m = files["Main.java"];
      const next: TestResult[] = [
        {
          name: "Test 1 · Variables Declaration",
          pass: /int\s+\w+\s*=/.test(m) && /double\s+\w+\s*=/.test(m),
          time: "12ms",
        },
        {
          name: "Test 2 · Type Casting (implicit)",
          pass: /double\s+\w+\s*=\s*\w+\s*;/.test(m),
          time: "8ms",
        },
        { name: "Test 3 · Type Casting (explicit)", pass: /\(int\)\s*\w/.test(m), time: "9ms" },
        {
          name: "Test 4 · String Operations",
          pass: /\.length\(\)/.test(m) && /\.charAt\(/.test(m),
          time: "7ms",
        },
        {
          name: "Test 5 · Output Format",
          pass: /System\.out\.println/.test(m) || /printf\(/.test(m),
          time: "11ms",
        },
      ];
      setTests(next);
      setTestsRan(true);
      if (isReal && slug !== "knowledge") {
        import("@/utils/RestApiAuthUtil").then(({ default: api }) => {
          const legacyScore = next.filter(t => t.pass).length * 20;
          const legacyOutput = JSON.stringify({ percentage: legacyScore, total_score: legacyScore });
          const legacyStatus = legacyScore > 0 ? "done" : "in_progress";
          if (submissionId) {
            api.patch(`${submissionsEndpoint}${submissionId}/`, {
              [submissionsStatusField]: legacyStatus,
              solution: JSON.stringify(getFilesToSave()),
              score: legacyScore,
              seconds_solved: elapsedSessionSecs,
              minutes_solved: elapsedSessionMins,
              started_at: startedAtIso,
              submitted_at: submittedAtIso,
              solution_output: legacyOutput
            }).catch(console.error);
          } else {
            api.post(submissionsEndpoint, {
              [submissionsIdField]: ticket.id,
              ...(isEvaluationMode && evaluationId ? { evaluation: evaluationId } : {}),
              [submissionsStatusField]: legacyStatus,
              solution: JSON.stringify(getFilesToSave()),
              score: legacyScore,
              seconds_solved: elapsedSessionSecs,
              minutes_solved: elapsedSessionMins,
              started_at: startedAtIso,
              submitted_at: submittedAtIso,
              solution_output: legacyOutput
            }).catch(console.error);
          }
          if (isEvaluationMode) {
            window.parent.postMessage({
              type: "LAB_SUBMITTED",
              labId: ticket.id,
              score: legacyScore,
              seconds_solved: elapsedSessionSecs,
              minutes_solved: elapsedSessionMins,
              started_at: startedAtIso,
              submitted_at: submittedAtIso
            }, "*");
          } else {
            notifyTicketSubmitted(legacyScore > 0 ? "done" : "in_progress");
            navigate({ to: "/student/lab/$slug/ticket/$ticketId/review", params: { slug, ticketId: ticket.id } });
          }
        });
      } else {
        if (isEvaluationMode) {
          window.parent.postMessage({
            type: "LAB_SUBMITTED",
            labId: ticket.id,
            seconds_solved: elapsedSessionSecs,
            minutes_solved: elapsedSessionMins,
            started_at: startedAtIso,
            submitted_at: submittedAtIso
          }, "*");
        } else {
          invalidateStudentStats();
          if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("yuvro-submission-updated"));
          navigate({ to: "/student/lab/$slug/ticket/$ticketId/review", params: { slug, ticketId: ticket.id } });
        }
      }
    }, 600);
  }

  const [isCommitDialogOpen, setIsCommitDialogOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const sprintNo = ticket.sprintOrder ?? 1;
  const ticketNo = ticket.ticketOrder ?? 1;

  async function handleCommitSubmit() {
    if (!commitMessage.trim()) return;
    setIsCommitting(true);
    try {
      const formattedMessage = `feat(S${sprintNo}-T${ticketNo}) : ${commitMessage}`;
      const gitName = user?.github_username || user?.username || "Student";
      const gitEmail = user?.github_username
        ? `${user.github_username}@users.noreply.github.com`
        : (user?.email || `${gitName}@users.noreply.github.com`);

      // 1. Try backend GitHub commit endpoint first (for all enrolled lab tickets)
      if (isReal && ticket.id) {
        try {
          const { default: api } = await import("@/utils/RestApiAuthUtil");
          const commitRes: any = await api.post(`/lab/tickets/${ticket.id}/github-commit/`, {
            commit_message: formattedMessage,
            files,
            code: files[activeFile] ?? "",
            design: ticket.system_design,
            sprint_no: sprintNo,
            ticket_no: ticketNo,
          });
          if (commitRes && (commitRes.status === "success" || commitRes.message)) {
            showToast(commitRes.message || "Changes committed and pushed successfully");
            setIsCommitDialogOpen(false);
            setCommitMessage("");
            return;
          }
        } catch (backendErr: any) {
          const errMsg = backendErr?.response?.data?.error || backendErr?.message || "";
          if (errMsg.includes("GitHub account not connected") || errMsg.includes("connect your GitHub")) {
            showToast("Please connect your GitHub account in Profile Settings before committing.");
            return;
          }
          console.warn("Backend ticket commit endpoint failed, falling back to workspace git:", backendErr);
        }
      }

      // 2. Fallback: runCommand in workspace
      const safeName = gitName.replace(/"/g, '\\"');
      const safeEmail = gitEmail.replace(/"/g, '\\"');
      const cmd = `git config user.name "${safeName}" && git config user.email "${safeEmail}" && git add . && git commit -m "${formattedMessage.replace(/"/g, '\\"')}" --author="${safeName} <${safeEmail}>" && git push`;
      
      const { runCommand } = await import("@/services/workspaceService");
      const res = await runCommand(effectiveUserId, labId, sprintId, cmd, evaluationId);
      if (res.exit_code === 0) {
        showToast("Changes committed and pushed successfully");
        setIsCommitDialogOpen(false);
        setCommitMessage("");
      } else {
        showToast(`Commit failed: ${res.stderr || res.stdout}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsCommitting(false);
    }
  }

  function isBinaryOrDatabaseFile(p: string): boolean {
    if (!p) return false;
    const lower = p.toLowerCase();
    return (
      lower.endsWith(".db") ||
      lower.endsWith(".sqlite") ||
      lower.endsWith(".sqlite3") ||
      lower.endsWith(".db3") ||
      lower.endsWith("-journal") ||
      lower.endsWith(".pyc") ||
      lower.endsWith(".so") ||
      lower.endsWith(".dll") ||
      lower.endsWith(".dylib") ||
      lower.endsWith(".png") ||
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".gif") ||
      lower.endsWith(".ico") ||
      lower.endsWith(".woff") ||
      lower.endsWith(".woff2") ||
      lower.endsWith(".ttf") ||
      lower.endsWith(".pdf") ||
      lower.endsWith(".zip") ||
      lower.endsWith(".tar") ||
      lower.endsWith(".gz")
    );
  }

  function getFilesToSave() {
    return Object.fromEntries(
      Object.entries(files).filter(([p, content]) => {
        if (isBinaryOrDatabaseFile(p)) return false;
        if (
          p.includes("yuvro_scoring_rules") ||
          p.includes("scoring_rules") ||
          p.startsWith(".") ||
          p.includes("__pycache__") ||
          p.includes("node_modules")
        ) {
          return false;
        }
        if (isReal) {
          return loadedFiles.current.has(p) || Boolean(dirty[p]);
        }
        return content !== "" || loadedFiles.current.has(p);
      })
    );
  }

  function handleSave(silent?: boolean) {
    setDirty(Object.fromEntries(Object.keys(files).map((k) => [k, false])));
    if (!silent) {
      const now = new Date();
      setSavedAt(`${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`);
    }
    if (isReal) {
      const filesToSave = getFilesToSave();
      // Persist loaded files to the workspace so disk is always in sync
      Promise.all(
        Object.keys(filesToSave).map(p => wsWriteFile(effectiveUserId, labId, sprintId, p, filesToSave[p] ?? "", evaluationId))
      ).catch(() => showToast("⚠ Some files could not be saved to workspace"));

      // Also save to database so the IDE loads it perfectly on refresh
      if (slug !== "knowledge") {
        if (submissionId) {
          import("@/utils/RestApiAuthUtil").then(({ default: api }) => {
            api.patch(`${submissionsEndpoint}${ submissionId }/`, {
              solution: JSON.stringify(getFilesToSave()),
            }).catch(console.error);
          });
        } else {
          import("@/utils/RestApiAuthUtil").then(({ default: api }) => {
            api.post(submissionsEndpoint, {
              [submissionsIdField]: ticket.id,
              ...(isEvaluationMode && evaluationId ? { evaluation: evaluationId } : {}),
              [submissionsStatusField]: "in_progress",
              solution: JSON.stringify(getFilesToSave()),
            }).then((res: any) => {
               setSubmissionId(res.data.id);
            }).catch(console.error);
          });
        }
      }
    }
    if (!silent) showToast("Saved");
  }

  function handleReset() {
    setConfirmDialog({
      isOpen: true,
      title: "Reset Code",
      description: "Reset code to starter template? All unsaved edits will be lost.",
      confirmLabel: "Reset",
      destructive: true,
      onConfirm: () => {
        setFiles({ ...starters });
        setDirty({});
        const target = defaultPrimaryFile || initialFileList[0] || "";
        if (target) {
          setActiveFile(target);
          setOpenTabs([target]);
        }
        setTestsRan(false);
        setOutput("");
        showToast("Code reset");
      },
    });
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
      await navigator.clipboard.writeText(
        `${ticket.id} solution by @alex\n\n\`\`\`java\n${files["Main.java"]}\n\`\`\``,
      );
      showToast("Share link copied");
    } catch {
      showToast("Copy failed");
    }
  }

  function updateCode(v: string) {
    let target = activeFile;
    if (!target) {
      target = defaultPrimaryFile || "main.py";
      setActiveFile(target);
      setOpenTabs((prev) => (prev.includes(target) ? prev : [...prev, target]));
    }
    setFiles((f) => ({ ...f, [target]: v }));
    setDirty((d) => ({ ...d, [target]: true }));
  }

  const handleResetProgress = async () => {
    setConfirmDialog({
      isOpen: true,
      title: "Reset Progress",
      description: "Are you sure you want to reset your progress? This will delete all your files and restart the ticket.",
      confirmLabel: "Reset Progress",
      destructive: true,
      onConfirm: async () => {
        try {
          const { deleteWorkspaceFile } = await import("@/services/workspaceService");
          await deleteWorkspaceFile(effectiveUserId, labId, sprintId, "", evaluationId);
          if (submissionId) {
            const { default: api } = await import("@/utils/RestApiAuthUtil");
            await api.patch(`${submissionsEndpoint}${submissionId}/`, {
              solution: "",
              solution_revealed: false,
              solution_output: "",
              yuvro_points: 0,
              [submissionsStatusField]: "backlog",
            }).catch(console.error);
          }
          setTicketStatus("backlog");
          setTicketScore(null);
          setEvalResult({});
          try {
            localStorage.removeItem(`elapsed_${ticket.id}`);
          } catch {}
          window.location.reload();
        } catch (e: any) {
          showToast("Failed to reset progress: " + e.message);
        }
      },
    });
  };

  if (!wsLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
        <span className="text-sm">Lab loading...</span>
      </div>
    );
  }

  return (
    <div className="h-screen flex-1 min-h-0 flex flex-col bg-background overflow-hidden">
      {/* Top sub-bar (no global nav — full-page editor) */}
      <div className="flex flex-wrap items-center gap-3 border-b bg-card/60 px-3 py-2 text-xs">
        {!previewOverride && !isEvaluationMode && (
          <Link
            to="/student/lab/$slug"
            params={{ slug }}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-accent"
          >
            <ArrowLeft className="h-3 w-3" />
            Exit
          </Link>
        )}
        <button
          onClick={() => setLeftCollapsed((v) => !v)}
          title="Toggle panel"
          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-accent"
        >
          {leftCollapsed ? (
            <PanelLeftOpen className="h-3 w-3" />
          ) : (
            <PanelLeftClose className="h-3 w-3" />
          )}
        </button>

        <StatusBadge value={ticketStatus} />
        <DiffBadge value={ticket.difficulty} />
        {!isEvaluationMode && (
          <span className="text-muted-foreground inline-flex items-center gap-1">
            <Zap className="h-3 w-3 text-primary" />+{ticket.xp} YP
          </span>
        )}
        <span className="text-muted-foreground inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Elapsed{" "}
          <span className="font-mono text-foreground">{timeStr}</span>
        </span>
        {savedAt && (
          <span className="text-success inline-flex items-center gap-1">
            <Check className="h-3 w-3" />
            Saved {savedAt}
          </span>
        )}
        <button
          onClick={handleResetProgress}
          title="Reset Progress"
          className="text-destructive inline-flex items-center gap-1 rounded-md border border-destructive/20 bg-destructive/10 px-2 py-1 hover:bg-destructive/20 font-medium ml-1"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => {
              if (sidePanel !== "preview") {
                setSidePanel("preview");
                setLeftCollapsed(true);
              } else {
                setSidePanel(null);
              }
            }}
            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 hover:bg-accent ${sidePanel === "preview" ? "bg-accent text-foreground border-primary/40" : ""}`}
          >
            <Globe className="h-3 w-3" />
            Preview
          </button>
          {!isEvaluationMode && (
            <button
              onClick={() => setSidePanel((p) => (p === "mentor" ? null : "mentor"))}
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 hover:bg-accent ${sidePanel === "mentor" ? "bg-accent text-foreground border-primary/40" : ""}`}
            >
              <Sparkles className="h-3 w-3" />
              AI Mentor
            </button>
          )}
          {/* {ticket.ticket_type !== 'database' && ticket.ticket_type !== 'web' && (
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="h-7 rounded-md border bg-background px-2 text-xs text-foreground focus:ring-1"
              title="Execution Language"
            >
              <option value="">Auto-detect</option>
              {Object.keys(supportedLanguages).map((lang) => (
                <option key={lang} value={lang}>
                  {supportedLanguages[lang].name || lang.toUpperCase()}
                </option>
              ))}
            </select>
          )} */}
          <button onClick={handleRun} disabled={running} className="inline-flex items-center gap-1 rounded-md bg-success/20 text-success border border-success/40 px-3 py-1 hover:bg-success/30 font-medium disabled:opacity-60">
            <Play className="h-3 w-3" />{running ? "Running…" : "Run"} <kbd className="hidden md:inline rounded bg-success/20 px-1 text-[10px]">⌘↵</kbd>
          </button>
          {!isEvaluationMode && (
            <button onClick={() => setIsCommitDialogOpen(true)}
              className="inline-flex items-center gap-1 rounded-md px-3 py-1 font-medium border border-border hover:bg-accent disabled:opacity-50">
              <GitBranch className="h-3 w-3" />Commit
            </button>
          )}
          {isEvaluationMode && slug !== "knowledge" && (
            <button
              onClick={() => {
                handleSave(false);
                window.parent.postMessage({ type: "LAB_SAVED", labId: ticket.id }, "*");
              }}
              disabled={submitting}
              className="inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 transition"
              title="Save progress and return to lab selection"
            >
              <Save className="h-3 w-3" />
              Save
            </button>
          )}
          {(!isEvaluationMode || slug !== "knowledge") && (
            <button onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
              title="Submit lab solution permanently"
            >
              <Send className="h-3 w-3" />
              {submitting ? "Submitting..." : "Submit"}
            </button>
          )}
          {headerActions}
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
          >
            <FileCode2 className="h-4 w-4" />
          </button>
          {[Search, GitBranch, Bug, Package].map((I, i) => (
            <button
              key={i}
              className="grid h-9 w-9 place-items-center rounded hover:text-foreground"
            >
              <I className="h-4 w-4" />
            </button>
          ))}
          <Settings className="mt-auto h-4 w-4" />
        </div>

        {/* Left panel (collapsible & resizable) */}
        {leftCollapsed ? (
          <aside className="hidden md:flex w-10 flex-col items-center gap-1 border-r bg-editor-panel py-2 text-muted-foreground">
            {[
              { k: "problem", I: BookOpen, label: "Problem" },
                ...(!isEvaluationMode || isRecruiterPreview ? [
                  { k: "hints", I: Lightbulb, label: "Hints" },
                  // { k: "discuss", I: MessageSquare, label: "Discuss" },
                  { k: "solution", I: Key, label: "Solution" },
                ] : []),
              ].map(({ k, I, label }) => (
              <button
                key={k}
                title={label}
                onClick={() => {
                  setLeftCollapsed(false);
                  setTab(k as typeof tab);
                }}
                className="grid h-9 w-9 place-items-center rounded hover:text-foreground hover:bg-accent"
              >
                <I className="h-4 w-4" />
              </button>
            ))}
            <button
              onClick={() => setLeftCollapsed(false)}
              title="Expand panel"
              className="mt-auto grid h-9 w-9 place-items-center rounded hover:text-foreground hover:bg-accent"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </aside>
        ) : (
          <>
            <aside
              style={{ width: `${leftWidth}px`, flexShrink: 0 }}
              className="hidden md:flex flex-col border-r bg-editor-panel max-w-[55vw] min-w-[260px]"
            >
              <div className="flex items-center border-b text-xs">
                {[
                  { k: "problem", label: "Problem" },
                  ...(!isEvaluationMode || isRecruiterPreview ? [
                    { k: "hints", label: "Hints" },
                    // { k: "discuss", label: "Discuss" },
                    { k: "solution", label: "Solution" },
                  ] : []),
                ].map((t) => (
                  <button
                    key={t.k}
                    onClick={() => setTab(t.k as typeof tab)}
                    className={`px-3 py-2 ${tab === t.k ? "bg-editor-bg text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {t.label}
                  </button>
                ))}
                <button
                  onClick={() => setLeftCollapsed(true)}
                  title="Collapse panel"
                  className="ml-auto mr-2 grid h-7 w-7 place-items-center rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                >
                  <PanelLeftClose className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-auto scrollbar-thin p-4 text-sm space-y-3">
                {tab === "problem" && (
                  <ProblemPanel 
                    ticket={ticket} 
                    slug={slug} 
                    labName={labTitle}
                    isAlgo={isMultiLang}
                    isReal={!tickets.some(t => t.id === ticket.id)} 
                    evaluating={evaluating}
                    evalResult={evalResult}
                    ticketScore={ticketScore}
                    onEvaluate={handleEvaluate}
                  />
                )}
                {tab === "solution" && (
                  <SolutionPanel
                    ticket={ticket}
                    isPreview={isRecruiterPreview}
                    initialSolutionRevealed={initialSolutionRevealed}
                    onLoadIntoEditor={(code, language, targetFilePath) => {
                      const langMap: Record<string, string> = { python: "py", cpp: "cpp", "c++": "cpp", c: "c", java: "java", javascript: "js" };
                      const ext = langMap[language?.toLowerCase() || ""] || "py";
                      const fallbackFile = (ticket as any).starter_path || (ticket as any).starterPath || ticket.scoring_rules?.starter_path || ticket.target_file || ticket.targeted_file || activeFile || `solution.${ext}`;
                      const targetFile = targetFilePath || fallbackFile;
                      setFiles(prev => ({ ...prev, [targetFile]: code }));
                      setDirty(prev => ({ ...prev, [targetFile]: true }));
                      loadedFiles.current.add(targetFile);
                      setOpenTabs(prev => prev.includes(targetFile) ? prev : [...prev, targetFile]);
                      setActiveFile(targetFile);
                      if (isReal) {
                        wsWriteFile(effectiveUserId, labId, sprintId, targetFile, code, evaluationId)
                          .catch(() => showToast(`⚠️ Could not write ${targetFile}`));
                      }
                      showToast(`Loaded ${targetFile} into editor`);
                    }}
                    onLoadAllIntoEditor={(fileMap) => {
                      setFiles(prev => ({ ...prev, ...fileMap }));
                      setDirty(prev => {
                        const next = { ...prev };
                        Object.keys(fileMap).forEach(k => { next[k] = true; });
                        return next;
                      });
                      const fileKeys = Object.keys(fileMap);
                      fileKeys.forEach(k => loadedFiles.current.add(k));
                      setOpenTabs(prev => {
                        const set = new Set(prev);
                        fileKeys.forEach(k => set.add(k));
                        return Array.from(set);
                      });
                      if (fileKeys.length > 0) {
                        setActiveFile(fileKeys[0]);
                      }
                      if (isReal) {
                        Promise.all(fileKeys.map(k => wsWriteFile(effectiveUserId, labId, sprintId, k, fileMap[k], evaluationId)))
                          .catch(() => showToast(`⚠️ Could not write all files`));
                      }
                      showToast(`Loaded ${fileKeys.length} solution file(s) into editor`);
                    }}
                  />
                )}
                {tab === "hints" && (
                  <HintsPanel
                    ticket={ticket}
                    elapsed={elapsed}
                    initialRevealedHints={initialRevealedHints}
                    isPreview={isRecruiterPreview}
                    onUnlock={(n, c) => showToast(`Hint ${n} revealed`)}
                  />
                )}
                {/* {tab === "discuss" && <DiscussPanel />} */}
              </div>
            </aside>
            <div
              role="separator"
              onMouseDown={startLeftResize}
              className="hidden md:block w-1 cursor-col-resize bg-border hover:bg-primary transition-colors shrink-0 z-10"
              title="Drag to resize problem panel"
            />
          </>
        )}

        {/* Center editor */}
        <section className="flex flex-1 min-w-0 flex-col relative">
          <div ref={splitContainerRef} className="flex flex-1 min-h-0">
            {/* File tree */}
            {fileTreeOpen && (
              <>
                <div
                  style={{ width: `${explorerWidth}px`, flexShrink: 0 }}
                  className={`flex flex-col border-r bg-editor-panel text-xs ${isAnySql || isMongo ? "font-mono text-[13px]" : ""}`}
                >
                <div className="flex items-center justify-between px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <span>Explorer</span>
                  <div className="flex items-center gap-1 normal-case">
                    <button
                      title="New File"
                      onClick={() => {
                        setInlineAction({ type: "new-file", folderPath: "" });
                        setOpenFolders(o => ({ ...o, [""]: true, ["__root__"]: true }));
                      }}
                      className="grid h-5 w-5 place-items-center rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                    >
                      <FilePlus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      title="New Folder"
                      onClick={() => {
                        setInlineAction({ type: "new-folder", folderPath: "" });
                        setOpenFolders(o => ({ ...o, [""]: true, ["__root__"]: true }));
                      }}
                      className="grid h-5 w-5 place-items-center rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                    >
                      <FolderPlus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      title="Refresh Workspace"
                      onClick={() => loadWorkspaceFiles(true)}
                      className="grid h-5 w-5 place-items-center rounded hover:bg-accent text-muted-foreground hover:text-foreground ml-1"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto px-1 pb-2 min-h-0">
                  <FileTree
                    rootLabel={isAlgo ? (ticket.title || kit.rootLabel || "Project") : (kit.rootLabel || "todo-app")}
                    paths={fileList}
                    activeFile={activeFile}
                    dirty={dirty}
                    inlineAction={inlineAction}
                    setInlineAction={setInlineAction}
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
                      <button
                        onClick={() => refreshSchema()}
                        title="Refresh Live Schema"
                        className="p-0.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <RotateCcw className={`h-3 w-3 ${dbSchemasLoading ? "animate-spin text-primary" : ""}`} />
                      </button>
                    </div>
                    {dbSchemasLoading && (
                      <div className="px-3 py-2 text-xs text-muted-foreground italic animate-pulse">
                        Inspecting live database...
                      </div>
                    )}
                    {!dbSchemasLoading && !hasDbConnection && (
                      <div className="px-3 py-3 text-xs text-muted-foreground">
                        <div className="font-medium text-foreground/80 mb-1">No Connection Configured</div>
                        <p className="text-[11px] leading-relaxed opacity-70">
                          Add a connection URI in the Results tab to view live tables and schema.
                        </p>
                      </div>
                    )}
                    {!dbSchemasLoading && hasDbConnection && dbSchemas.length === 0 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground italic">
                        No tables found in database
                      </div>
                    )}
                    {!dbSchemasLoading && dbSchemas.map((schema) => (
                      <React.Fragment key={schema.name}>
                        <div className="px-3 py-1 flex items-center gap-1.5 text-xs text-foreground font-medium mt-2 first:mt-0">
                          <svg
                            className="h-3.5 w-3.5 text-primary"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                          </svg>
                          {schema.name}
                        </div>
                        {(schema.tables || []).length > 0 ? (
                          <>
                            <div className="px-5 py-1 text-[11px] text-muted-foreground uppercase mt-1">
                              Tables
                            </div>
                            {(schema.tables || []).map((t) => (
                              <button
                                key={t.name}
                                onClick={() => {
                                  if (!openTabs.includes(`schema:${schema.name}.${t.name}`))
                                    setOpenTabs([...openTabs, `schema:${schema.name}.${t.name}`]);
                                  setActiveFile(`schema:${schema.name}.${t.name}`);
                                }}
                                className={`w-full flex items-center gap-2 px-5 py-1 text-xs text-left ${activeFile === `schema:${schema.name}.${t.name}` ? "bg-accent/50 text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                              >
                                <svg
                                  className="h-3 w-3"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                  <line x1="3" y1="9" x2="21" y2="9"></line>
                                  <line x1="9" y1="21" x2="9" y2="9"></line>
                                </svg>
                                {t.name}
                                <span className="ml-auto text-[10px] opacity-50">
                                  {(t.columns || []).length} cols
                                </span>
                              </button>
                            ))}
                          </>
                        ) : (
                          <div className="px-5 py-1 text-[11px] text-muted-foreground italic">
                            0 tables
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                    {(isMysql || isPostgres) && !isEvaluationMode && !ticket.connection_url && (
                      <div className="px-4 py-3 mt-4 border-t border-border">
                        <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-2">
                          Need a free database?
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-1.5 pl-3 list-disc">
                          {isPostgres && (
                            <li>
                              <a
                                href="https://supabase.com"
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline font-medium"
                              >
                                Supabase
                              </a>{" "}
                              (Postgres)
                            </li>
                          )}
                          {isPostgres && (
                            <li>
                              <a
                                href="https://neon.tech"
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline font-medium"
                              >
                                Neon
                              </a>{" "}
                              (Postgres)
                            </li>
                          )}
                          {isPostgres && (
                            <li>
                              <a
                                href="https://render.com"
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline font-medium"
                              >
                                Render
                              </a>{" "}
                              (Postgres)
                            </li>
                          )}
                          {isMysql && (
                            <li>
                              <a
                                href="https://planetscale.com"
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline font-medium"
                              >
                                PlanetScale
                              </a>{" "}
                              (MySQL)
                            </li>
                          )}
                          {isMysql && (
                            <li>
                              <a
                                href="https://aiven.io/mysql"
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline font-medium"
                              >
                                Aiven
                              </a>{" "}
                              (MySQL)
                            </li>
                          )}
                          {isMysql && (
                            <li>
                              <a
                                href="https://tidbcloud.com"
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline font-medium"
                              >
                                TiDB Cloud
                              </a>{" "}
                              (MySQL)
                            </li>
                          )}
                          <li>
                            <a
                              href="https://railway.app"
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline font-medium"
                            >
                              Railway
                            </a>{" "}
                            (Both)
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-auto border-t px-3 py-2 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <GitBranch className="h-3 w-3" /> main
                  </div>
                </div>
              </div>
              <div
                role="separator"
                onMouseDown={startExplorerResize}
                className="w-1 cursor-col-resize bg-border hover:bg-primary transition-colors shrink-0 z-10"
                title="Drag to resize explorer"
              />
            </>
          )}

            <div className="flex flex-1 min-w-0 flex-col">
              {/* Tabs row */}
              <div className="flex items-center border-b bg-editor-panel text-xs overflow-x-auto">
                {openTabs.map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFile(f)}
                    className={`flex items-center gap-2 border-r pl-3 pr-2 py-2 whitespace-nowrap group ${activeFile === f ? "bg-editor-bg text-foreground" : "text-muted-foreground hover:bg-editor-bg/50 hover:text-foreground"}`}
                  >
                    <FileCode2 className="h-3 w-3" />
                    {f.split("/").pop()}
                    {dirty[f] && <CircleDot className="h-2.5 w-2.5 text-warning" />}
                    <div
                      onClick={(e) => closeTab(f, e)}
                      className="ml-1 opacity-0 group-hover:opacity-100 hover:text-destructive p-0.5 rounded-sm hover:bg-muted/50"
                    >
                      <X className="h-3 w-3" />
                    </div>
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-2 pr-3 text-[11px] text-muted-foreground whitespace-nowrap">
                  {isMultiLang && (
                    <button
                      onClick={() => setIsExamplesPanelOpen(true)}
                      className="flex items-center gap-1.5 rounded border border-border bg-background px-2 py-0.5 font-medium hover:bg-accent text-foreground transition-colors"
                    >
                      <BookOpen className="h-3 w-3 text-primary" />
                      Examples
                    </button>
                  )}
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
                        <option value="java">Java</option>
                      </select>
                    </label>
                  )}
                  <button
                    title="Quick Open File (Ctrl+P)"
                    onClick={() => setQuickSwitcherOpen(true)}
                    className="flex items-center gap-1.5 rounded border border-border bg-background px-2 py-0.5 font-medium hover:bg-accent text-foreground transition-colors"
                  >
                    <Search className="h-3 w-3 text-muted-foreground" />
                    <span>Find File</span>
                    <kbd className="hidden sm:inline-block rounded bg-muted px-1 py-0.2 text-[9px] font-mono text-muted-foreground border">
                      Ctrl+P
                    </kbd>
                  </button>
                  {isJava && <CompileBadge state={compileState} />}
                  {!isEvaluationMode && (
                    <button
                      onClick={toggleTheme}
                      className="rounded border px-2 py-0.5 hover:bg-accent"
                    >
                      {theme === "dark" ? "☀ Light" : "🌙 Dark"}
                    </button>
                  )}
                  <button
                    title="Format"
                    onClick={() => showToast("Code formatted")}
                    className="rounded border px-2 py-0.5 hover:bg-accent"
                  >
                    <Wand2 className="h-3 w-3" />
                  </button>
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
                  <SchemaViewer
                    tablePath={activeFile.replace("schema:", "")}
                    dbSchemas={dbSchemas}
                  />
                ) : (
                  <CodeEditor
                    code={code}
                    onChange={updateCode}
                    language={editorLanguage(activeFile)}
                    theme={theme}
                  />
                )}
              </div>

              {/* Bottom panel (resizable) */}
              <div
                role="separator"
                onMouseDown={startBottomResize}
                className="h-1 cursor-row-resize bg-border hover:bg-primary transition-colors shrink-0 z-10"
                title="Drag to resize console / terminal height"
              />
              <div
                style={{ height: `${bottomHeight}px`, flexShrink: 0 }}
                className="border-t bg-editor-panel flex flex-col min-h-0"
              >
                <div className="flex items-center border-b text-xs overflow-x-auto">
                  {[
                    { k: "terminal", label: "Terminal", icon: TerminalIcon },
                    ...(isAlgo ? [{ k: "testcases", label: "Test Cases", icon: FlaskConical }] : []),
                    { k: "preview", label: "Results", icon: Globe },
                    { k: "output", label: "Console", icon: TerminalIcon },
                    { k: "errors", label: "Errors", icon: AlertTriangle },
                  ].map((t) => (
                    <button
                      key={t.k}
                      onClick={() => setBottomTab(t.k as BottomTab)}
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 uppercase tracking-wide ${bottomTab === t.k ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <t.icon className="h-3 w-3" />
                      {t.label}
                    </button>
                  ))}
                  {ticketScore !== null && ticketScore.total > 0 && (
                    <div className="ml-auto flex items-center px-4 text-[11px] font-semibold tracking-wider text-success">
                      SCORE: {isMultiLang ? `${Math.round((ticketScore.passed / ticketScore.total) * 100)}%` : `${ticketScore.passed} / ${ticketScore.total}`}
                    </div>
                  )}
                </div>
                <div className={`flex-1 min-h-0 ${bottomTab === "terminal" ? "p-0 overflow-hidden flex flex-col" : "overflow-auto scrollbar-thin p-3 text-xs"}`}>
                  {bottomTab === "output" && (
                    <ExecutionOutputView
                      output={output}
                      executionMetrics={executionMetrics}
                      testResults={testResults}
                      executionOutput={executionOutput}
                    />
                  )}
                  {bottomTab === "errors" && <ErrorsView state={compileState} file={activeFile} />}
                  {bottomTab === "testcases" && <CustomTestCaseManager customTestCases={customTestCases} onTestCasesChange={setCustomTestCases} />}
                  {bottomTab === "preview" && (
                    <FormattedResultsView
                      ticket={ticket}
                      taskExecutionData={taskExecutionData}
                      testResults={testResults}
                      executionMetrics={executionMetrics}
                      tests={tests}
                      testsRan={testsRan}
                      ticketScore={ticketScore}
                      evalResult={evalResult}
                      output={output}
                      executionOutput={executionOutput}
                      onRun={handleRun}
                      running={running}
                      isSql={isSql}
                      isMongo={isMongo}
                      isExternalDb={isExternalDb}
                      executedQuery={executedQuery}
                      runId={runId}
                      refreshSchema={refreshSchema}
                      dbType={dbType}
                      isUi={isUi}
                      files={files}
                      isDjango={isDjango}
                      previewPort={previewPort}
                      computedStartupCommand={computedStartupCommand}
                      isPython={isPython}
                      isEvaluationMode={isEvaluationMode}
                      effectiveUserId={effectiveUserId}
                      labId={labId}
                      sprintId={sprintId}
                      evaluationId={isEvaluationMode ? evaluationId : undefined}
                    />
                  )}
                  <div style={{ display: bottomTab === "terminal" ? "flex" : "none" }} className="min-h-0 flex-1 flex-col h-full w-full">
                      <TerminalView
                        theme={theme}
                        isVisible={bottomTab === "terminal"}
                        wsUrl={isReal && !isLoading && effectiveUserId ? getTerminalWsUrl(effectiveUserId, labId, sprintId, labTitle === "SQLite Lab" ? "sqlite" : "other", evaluationId) : null}
                        onCommandRun={() => loadWorkspaceFiles(true)}
                        startupCommand={(isExternalDb || ticket.connection_url) ? undefined : computedStartupCommand}
                        onStartupCommandRun={() => {
                          setTimeout(() => setBottomTab("preview"), 2000);
                        }}
                      />
                  </div>
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
                className="flex flex-col bg-editor-panel min-w-0 min-h-0 overflow-hidden"
                style={{
                  flex:
                    sideWidth != null
                      ? `0 0 ${sideWidth}px`
                      : `0 0 ${sidePanel === "preview" ? "clamp(360px, 44%, 680px)" : "clamp(320px, 36%, 540px)"}`,
                }}
              >
                <div className="flex items-center gap-2 border-b px-3 py-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-medium whitespace-nowrap">
                    {sidePanel === "preview" ? (
                      <>
                        <Globe className="h-3 w-3" />
                        Live Preview
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 text-primary" />
                        AI Mentor
                      </>
                    )}
                  </span>
                  {sidePanel === "preview" && (
                    <div className="flex items-center gap-1">
                      {(["Mobile", "Tablet", "Desktop"] as const).map((d) => (
                        <button
                          key={d}
                          onClick={() => setPreviewDevice(d)}
                          className={`rounded border px-2 py-0.5 text-[10px] ${previewDevice === d ? "bg-accent text-foreground border-primary/40" : "text-muted-foreground hover:bg-accent"}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setSidePanel(null)}
                    className="ml-auto text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-hidden p-0 min-w-0 min-h-0 flex flex-col">
                  {sidePanel === "preview"
                    ? <div className="p-3 h-full"><SidePreview device={previewDevice} kit={kit} files={files} activeFile={activeFile} startupCommand={computedStartupCommand} previewPort={previewPort} ticket={ticket} isEvaluationMode={isEvaluationMode} effectiveUserId={effectiveUserId} labId={labId} sprintId={sprintId} evaluationId={evaluationId} isMysql={isMysql} isPostgres={isPostgres} isSql={isSql} /></div>
                    : <SideMentor
                        chatTitle={`${labTitle} - Sprint ${sprintNo} - Ticket ${ticketNo}`}
                        persistenceKey={`ticket-${ticket.id}`}
                        contextGetter={() => `Lab Ticket: ${ticket.title}\nDescription: ${ticket.description}\n\nCurrent Code:\n${Object.entries(files).map(([name, content]) => `File: ${name}\n${content}`).join('\n\n')}`}
                        activeFile={activeFile}
                        onApplyCode={(code) => {
                          updateCode(code);
                          showToast(`Applied code to ${activeFile}`);
                        }}
                      />}
                </div>
              </aside>
            )}
          </div>
        </section>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 border-t bg-primary/90 px-3 py-1 text-[11px] text-primary-foreground">
        <span className="inline-flex items-center gap-1">
          <GitBranch className="h-3 w-3" /> main
        </span>
        <span>{kit.runtime}</span>
        <span>UTF-8</span>
        <span>LF</span>
        {isJava && (
          <span className="inline-flex items-center gap-1">
            {compileState === "ok" && (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Compiled
              </>
            )}
            {compileState === "warn" && (
              <>
                <AlertTriangle className="h-3 w-3" />1 warning
              </>
            )}
            {compileState === "err" && (
              <>
                <XCircle className="h-3 w-3" />
                Compile error
              </>
            )}
          </span>
        )}
        <span className="ml-auto">
          {activeFile} · {code.split("\n").length} lines
        </span>
      </div>

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md border bg-card px-4 py-2 text-sm shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}

      {/* Commit Dialog */}
      <Dialog open={isCommitDialogOpen} onOpenChange={setIsCommitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Commit Changes</DialogTitle>
            <DialogDescription>
              Enter a commit message. Your changes will be committed and pushed to the linked repository.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex w-full items-center rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring">
              <span className="text-muted-foreground mr-1 whitespace-nowrap">feat(S{sprintNo}-T{ticketNo}) : </span>
              <input
                type="text"
                placeholder="Added new feature..."
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="flex-1 bg-transparent file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCommitSubmit();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setIsCommitDialogOpen(false)}
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </button>
            <button
              onClick={handleCommitSubmit}
              disabled={!commitMessage.trim() || isCommitting}
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {isCommitting ? "Committing..." : "Commit"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* In-app Confirmation Dialog (Never exits full-screen) */}
      <AlertDialog
        open={confirmDialog.isOpen}
        onOpenChange={(open) => !open && setConfirmDialog((d) => ({ ...d, isOpen: false }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDialog((d) => ({ ...d, isOpen: false }))}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={confirmDialog.destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              onClick={() => {
                confirmDialog.onConfirm();
                setConfirmDialog((d) => ({ ...d, isOpen: false }));
              }}
            >
              {confirmDialog.confirmLabel || "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Quick Open File Switcher Modal (Ctrl+P / Command+P) */}
      <Dialog open={quickSwitcherOpen} onOpenChange={setQuickSwitcherOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden border border-border shadow-2xl bg-card">
          <div className="flex items-center gap-2 border-b px-4 py-3 bg-muted/30">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              autoFocus
              value={quickSearchQuery}
              onChange={(e) => setQuickSearchQuery(e.target.value)}
              placeholder="Search files by name (e.g. tests.py, views.py, main.py)..."
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const filtered = fileList.filter((f) =>
                    f.toLowerCase().includes(quickSearchQuery.toLowerCase())
                  );
                  if (filtered.length > 0) {
                    openFile(filtered[0]);
                    setQuickSwitcherOpen(false);
                    setQuickSearchQuery("");
                  }
                }
              }}
            />
            <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground border">
              ESC
            </kbd>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {(() => {
              const matches = fileList.filter((f) =>
                f.toLowerCase().includes(quickSearchQuery.toLowerCase())
              );
              if (matches.length === 0) {
                return (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No files found matching "{quickSearchQuery}"
                  </div>
                );
              }
              return matches.map((f) => {
                const parts = f.split("/");
                const fileName = parts.pop() || f;
                const dirPath = parts.join("/");
                const isCurrent = activeFile === f;
                return (
                  <button
                    key={f}
                    onClick={() => {
                      openFile(f);
                      setQuickSwitcherOpen(false);
                      setQuickSearchQuery("");
                    }}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs transition-colors ${
                      isCurrent
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-accent"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCode2 className="h-3.5 w-3.5 shrink-0 text-info" />
                      <span className="font-mono text-sm">{fileName}</span>
                      {dirPath && (
                        <span className="text-[11px] text-muted-foreground truncate">
                          ({dirPath})
                        </span>
                      )}
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] text-primary shrink-0 uppercase tracking-wide">
                        Active
                      </span>
                    )}
                  </button>
                );
              });
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      {isExamplesPanelOpen && (
        <ExamplesPanel
          onClose={() => setIsExamplesPanelOpen(false)}
          currentLanguage={selectedLanguage || progLang}
        />
      )}
    </div>
  );
}

/* ---------- Editor ---------- */

type EditorLang =
  "java" | "py" | "html" | "md" | "txt" | "sql" | "js" | "css" | "json" | "cpp" | "c";
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

function CodeEditor({
  code,
  onChange,
  language,
  theme,
}: {
  code: string;
  onChange: (v: string) => void;
  language: EditorLang;
  theme: "dark" | "light";
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const extensions = useMemo(() => {
    switch (language) {
      case "py":
        return [python()];
      case "java":
        return [java()];
      case "html":
        return [cmHtml()];
      case "md":
        return [cmMarkdown()];
      case "sql":
        return [sql()];
      case "js":
        return [javascript({ typescript: true })];
      case "css":
        return [css()];
      case "json":
        return [jsonLang()];
      case "cpp":
      case "c":
        return [cpp()];
      default:
        return [];
    }
  }, [language]);

  const transparentTheme = useMemo(() => {
    return EditorView.theme({
      "&": { backgroundColor: "transparent !important" },
      ".cm-gutters": {
        backgroundColor: "transparent !important",
        borderRight: "1px solid var(--color-border) !important",
        color: "var(--color-muted-foreground)",
      },
      ".cm-activeLine": { backgroundColor: "var(--color-muted) !important" },
      ".cm-activeLineGutter": { backgroundColor: "var(--color-muted) !important" },
    });
  }, []);

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
        extensions={[transparentTheme, ...extensions]}
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
    warn: {
      txt: "Warnings",
      cls: "text-warning border-warning/40 bg-warning/10",
      I: AlertTriangle,
    },
    err: {
      txt: "Errors",
      cls: "text-destructive border-destructive/40 bg-destructive/10",
      I: XCircle,
    },
  } as const;
  const { txt, cls, I } = map[state];
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 ${cls}`}>
      <I className="h-3 w-3" />
      {txt}
    </span>
  );
}

function extractTasksReport(
  ticket: any,
  taskExecutionData: any,
  rawOutput: string,
  evalResult: Record<string, { passed: boolean; reason: string }>,
  ticketScore: { passed: number; total: number } | null
) {
  let parsedJson: any = taskExecutionData;

  if (!parsedJson || !parsedJson.tasks) {
    if (rawOutput && typeof rawOutput === "string") {
      try {
        parsedJson = JSON.parse(rawOutput.trim());
      } catch {
        const jsonMatch = rawOutput.match(/\{[\s\S]*"tasks"[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedJson = JSON.parse(jsonMatch[0]);
          } catch {}
        }
      }
    }
  }

  const tasksJson = (parsedJson && typeof parsedJson === "object" && parsedJson.tasks) ? parsedJson.tasks : {};
  const taskKeys = Object.keys(tasksJson);
  const ticketTasks: any[] = Array.isArray(ticket?.tasks) ? ticket.tasks : [];

  const items: Array<{
    key: string;
    index: number;
    title: string;
    description?: string;
    passed: boolean | null;
    score: number | null;
    message?: string;
  }> = [];

  // When ticketTasks is present, ONLY evaluate the required tasks!
  const count = ticketTasks.length > 0 ? ticketTasks.length : taskKeys.length;

  for (let i = 0; i < count; i++) {
    const tMeta = ticketTasks[i];
    const tObj = findTaskExecutionResult(tMeta, i, tasksJson, taskKeys);
    const key = tMeta?.id || tMeta?.task_slug || (tObj ? (taskKeys.find(k => tasksJson[k] === tObj) || `task${i + 1}`) : `task${i + 1}`);

    const rawTitle = tMeta?.title || tObj?.title || `Task ${i + 1}`;
    const title = formatTaskTitle(rawTitle, i, tMeta?.original_index);
    const description = tMeta?.description;

    let passed: boolean | null = null;
    let score: number | null = null;
    let message: string | undefined = undefined;

    const taskMaxMarks = Number(tMeta?.marks ?? tObj?.max_score ?? 10);

    if (tObj) {
      passed = tObj.result === "passed" || tObj.status === "passed" || (typeof tObj.score === "number" && tObj.score > 0);
      score = typeof tObj.score === "number" ? Math.min(tObj.score, taskMaxMarks) : (passed ? taskMaxMarks : 0);
      const rawMsg = tObj.message || tObj.reason || (passed ? "Task requirements satisfied" : "Task failed verification");
      message = formatTaskMessage(rawMsg, i, tMeta?.original_index) || rawMsg;
    } else {
      const slug = tMeta?.task_slug || `task-${i}`;
      const altSlug = `task-${i}`;
      const numKey = `task${i + 1}`;
      const idKey = tMeta?.id ? String(tMeta.id) : undefined;

      const evalItem = evalResult && (evalResult[slug] || evalResult[altSlug] || evalResult[numKey] || (idKey ? evalResult[idKey] : undefined));

      if (evalItem) {
        passed = evalItem.passed;
        message = formatTaskMessage(evalItem.reason, i, tMeta?.original_index) || evalItem.reason;
        score = passed ? taskMaxMarks : 0;
      }
    }

    items.push({
      key,
      index: i + 1,
      title,
      description,
      passed,
      score,
      message,
    });
  }

  const evaluatedItems = items.filter((it) => it.passed !== null);
  const hasRan = evaluatedItems.length > 0;
  const passedCount = items.filter((it) => it.passed === true).length;
  const calculatedMax = items.reduce((acc, _, idx) => acc + Number(ticketTasks[idx]?.marks || 10), 0) || Number(ticket?.marks ?? ticket?.points ?? ticket?.max_score ?? ticket?.total_marks ?? 10);
  const maxScore = ticketScore ? ticketScore.total : calculatedMax;
  const totalScore = ticketScore ? ticketScore.passed : (hasRan ? items.reduce((acc, it) => acc + (it.score || 0), 0) : 0);

  return {
    hasRan,
    items,
    passedCount,
    totalCount: items.length,
    totalScore,
    maxScore,
  };
}

function FormattedResultsView({
  ticket,
  taskExecutionData,
  testResults,
  executionMetrics,
  tests,
  testsRan,
  ticketScore,
  evalResult,
  output,
  executionOutput,
  onRun,
  running,
  isSql,
  isMongo,
  isExternalDb,
  executedQuery,
  runId,
  refreshSchema,
  dbType,
  isUi,
  files,
  isDjango,
  previewPort,
  computedStartupCommand,
  isPython,
  isEvaluationMode,
  effectiveUserId,
  labId,
  sprintId,
  evaluationId,
}: {
  ticket: any;
  taskExecutionData: any;
  testResults: any;
  executionMetrics: any;
  tests: TestResult[];
  testsRan: boolean;
  ticketScore: { passed: number; total: number } | null;
  evalResult: Record<string, { passed: boolean; reason: string }>;
  output: string;
  executionOutput: string;
  onRun: () => void;
  running: boolean;
  isSql: boolean;
  isMongo: boolean;
  isExternalDb: boolean;
  executedQuery: string;
  runId: number;
  refreshSchema: () => void;
  dbType?: string;
  isUi: boolean;
  files: Record<string, string>;
  isDjango: boolean;
  previewPort: number;
  computedStartupCommand?: string;
  isPython: boolean;
  isEvaluationMode?: boolean;
  effectiveUserId?: string;
  labId?: string;
  sprintId?: string;
  evaluationId?: string;
}) {
  // 1. Algo test cases (if testResults from code executor exists)
  if (testResults && testResults.results && testResults.results.length > 0) {
    const passedCount = testResults.passed ?? testResults.results.filter((r: any) => r.passed).length;
    const totalCount = testResults.total ?? testResults.results.length;
    const isAllPassed = passedCount === totalCount && totalCount > 0;

    return (
      <div className="space-y-4 max-w-4xl pb-4">
        {/* Metrics Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border bg-card text-xs">
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${isAllPassed ? "text-success" : "text-foreground"}`}>
              {passedCount} / {totalCount} Test Cases Passed
            </span>
          </div>
          {executionMetrics && (
            <div className="flex items-center gap-3 text-muted-foreground font-mono text-[11px]">
              {executionMetrics.execution_time !== undefined && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{executionMetrics.execution_time.toFixed(3)}s</span>
                </div>
              )}
              {executionMetrics.memory_usage !== undefined && (
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  <span>{executionMetrics.memory_usage.toFixed(2)}MB</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Test Cases List */}
        <div className="space-y-2">
          {testResults.results.map((tr: any, idx: number) => {
            const taskMeta = ticket?.tasks?.[idx];
            const isHidden = Boolean(tr.is_hidden || isTaskHidden(taskMeta) || isTaskHidden(tr));
            const testNum = tr.test_case_id !== undefined ? tr.test_case_id + 1 : idx + 1;

            return (
              <div
                key={idx}
                className={`rounded-lg border p-3 font-mono text-xs ${tr.passed ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {tr.passed ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-destructive" />}
                  <span className={`font-semibold ${tr.passed ? "text-success" : "text-destructive"}`}>
                    Test Case #{testNum} {isHidden ? "(Hidden) " : ""}{tr.passed ? "Passed" : "Failed"}
                  </span>
                  {tr.execution_time !== undefined && (
                    <span className="text-muted-foreground ml-auto text-[10px]">{tr.execution_time.toFixed(3)}s</span>
                  )}
                </div>

                {!tr.passed && !isHidden && (
                  <div className="space-y-2 mt-2 text-[11px]">
                    {tr.input !== undefined && (
                      <div className="grid grid-cols-[80px_1fr] gap-2">
                        <span className="text-muted-foreground font-semibold">Input:</span>
                        <span className="font-mono text-foreground whitespace-pre-wrap break-all bg-muted/40 p-2 rounded">{tr.input || "(empty)"}</span>
                      </div>
                    )}
                    {tr.expected_output !== undefined && (
                      <div className="grid grid-cols-[80px_1fr] gap-2">
                        <span className="text-muted-foreground font-semibold">Expected:</span>
                        <span className="font-mono text-success whitespace-pre-wrap break-all bg-success/10 p-2 rounded">{tr.expected_output}</span>
                      </div>
                    )}
                    {tr.actual_output !== undefined && (
                      <div className="grid grid-cols-[80px_1fr] gap-2">
                        <span className="text-muted-foreground font-semibold">Output:</span>
                        <span className="font-mono text-destructive whitespace-pre-wrap break-all bg-destructive/10 p-2 rounded">{tr.actual_output || "(no output)"}</span>
                      </div>
                    )}
                    {(tr.error || tr.console_output) && (
                      <div className="mt-2 text-destructive font-semibold text-[11px] whitespace-pre-wrap break-all bg-destructive/10 p-2 rounded">
                        Error: {tr.error || tr.console_output}
                      </div>
                    )}
                  </div>
                )}

                {!tr.passed && isHidden && (
                  <div className="mt-1.5 text-muted-foreground italic text-[11px] flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-muted-foreground/70" />
                    <span>Hidden test case — inputs and outputs are hidden.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. Task-based evaluation (Django, REST API, Backend labs, or any lab with test_command or tasks or taskExecutionData)
  const report = extractTasksReport(ticket, taskExecutionData, executionOutput || output, evalResult, ticketScore);

  if (taskExecutionData || ticket?.test_command || (!isSql && !isMongo && !isExternalDb && !isUi && report.items.length > 0)) {
    if (report.items.length > 0) {
      const isAllPassed = report.hasRan && report.passedCount === report.totalCount && report.totalCount > 0;
      const scorePct = report.maxScore > 0 ? Math.round((report.totalScore / report.maxScore) * 100) : 0;

      const bannerBorder = isAllPassed
        ? "bg-success/5 border-success/30"
        : "bg-card border-border";

      let iconBg = "bg-muted/30 text-muted-foreground border-border";
      let statusText = "Not Run Yet";
      let statusCls = "bg-muted text-muted-foreground border border-border";
      let headerText = "Test Evaluation Pending";

      if (report.hasRan) {
        if (isAllPassed) {
          iconBg = "bg-success/10 text-success border-success/30";
          statusText = "Passed";
          statusCls = "bg-success/15 text-success border border-success/30";
          headerText = "All Tasks Passed Successfully";
        } else if (report.totalScore > 0) {
          iconBg = "bg-amber-500/10 text-amber-500 border-amber-500/30";
          statusText = "In Progress";
          statusCls = "bg-amber-500/15 text-amber-500 border-amber-500/30";
          headerText = `${report.passedCount} of ${report.totalCount} Tasks Passed`;
        } else {
          iconBg = "bg-destructive/10 text-destructive border-destructive/30";
          statusText = "Failed";
          statusCls = "bg-destructive/15 text-destructive border border-destructive/30";
          headerText = `${report.passedCount} of ${report.totalCount} Tasks Passed`;
        }
      }

      return (
        <div className="space-y-4 max-w-4xl pb-4">
          {/* Score & Summary Banner */}
          <div className={`rounded-lg border p-4 transition-all ${bannerBorder}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${iconBg}`}>
                  {isAllPassed ? <CheckCircle2 className="h-5 w-5" /> : report.hasRan ? <XCircle className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">
                      {headerText}
                    </span>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${statusCls}`}>
                      {statusText}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {!report.hasRan
                      ? "Click Run to execute automated evaluation against all tasks"
                      : "Automated test evaluation results"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Score</div>
                  <div className="font-mono text-base font-bold text-foreground">
                    <span className={isAllPassed ? "text-success" : report.totalScore > 0 ? "text-amber-500" : "text-foreground"}>{report.totalScore}</span>
                    <span className="text-muted-foreground text-xs font-normal"> / {report.maxScore}</span>
                  </div>
                </div>
                {/* {!report.hasRan && (
                  <button
                    onClick={onRun}
                    disabled={running}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 shadow-sm"
                  >
                    <Play className="h-3.5 w-3.5" />
                    {running ? "Running..." : "Run"}
                  </button>
                )} */}
              </div>
            </div>

            {/* Progress Bar */}
            {report.hasRan && (
              <div className="mt-3 w-full bg-muted/40 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${isAllPassed ? "bg-success" : report.totalScore > 0 ? "bg-amber-500" : "bg-destructive/60"}`}
                  style={{ width: `${Math.max(scorePct, isAllPassed ? 100 : 2)}%` }}
                />
              </div>
            )}
          </div>

          {/* Tasks List */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-0.5">
              Tasks ({report.items.length})
            </h4>
            {report.items.map((it) => {
              const isEvaluated = it.passed !== null;
              const isPassed = it.passed === true;

              const cardBorder = !isEvaluated
                ? "border-border bg-card/60"
                : isPassed
                ? "border-success/30 bg-success/5"
                : "border-destructive/30 bg-destructive/5";

              const badgeCls = !isEvaluated
                ? "bg-muted text-muted-foreground border border-border"
                : isPassed
                ? "bg-success/20 text-success border border-success/30"
                : "bg-destructive/20 text-destructive border border-destructive/30";

              const badgeText = !isEvaluated ? "PENDING" : isPassed ? "PASSED" : "FAILED";

              const scoreBadgeCls = isPassed
                ? "bg-success/10 text-success border-success/30"
                : "bg-muted/60 text-muted-foreground border-border";

              const msgBoxCls = isPassed
                ? "bg-success/10 text-success border-success/20"
                : "bg-background/90 text-destructive border-destructive/25 shadow-sm";

              return (
                <div
                  key={it.key}
                  className={`rounded-lg border p-3.5 transition-all ${cardBorder}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {!isEvaluated ? (
                        <div className="h-4 w-4 rounded-full border border-muted-foreground/40 flex items-center justify-center text-[10px] text-muted-foreground shrink-0 mt-0.5 font-mono">
                          {it.index}
                        </div>
                      ) : isPassed ? (
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-xs text-foreground">{it.title}</span>
                          <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${badgeCls}`}>
                            {badgeText}
                          </span>
                        </div>
                      </div>
                    </div>

                    {it.score !== null && (
                      <span className={`shrink-0 font-mono text-[11px] font-semibold px-2 py-0.5 rounded border ${scoreBadgeCls}`}>
                        {it.score} pts
                      </span>
                    )}
                  </div>

                  {it.message && (
                    <div className={`mt-2.5 rounded-md p-2.5 text-[11px] font-mono leading-relaxed border ${msgBoxCls}`}>
                      {it.message}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  }

  // 2. Database / SQL results (only for pure DB editor without task report)
  if (isSql) {
    return <SqlResultsView query={executedQuery} runId={runId} onQueryExecuted={refreshSchema} executionOutput={executionOutput || output} />;
  }
  if (isMongo) {
    return (
      <MongoResultsView
        query={executedQuery}
        runId={runId}
        onQueryExecuted={refreshSchema}
        configuredUri={ticket.connection_url || ticket.uri}
        isEvaluationMode={isEvaluationMode}
        userId={effectiveUserId}
        labId={labId}
        sprintId={sprintId}
        evaluationId={isEvaluationMode ? evaluationId : undefined}
      />
    );
  }
  if (isExternalDb) {
    return (
      <ExternalSqlResultsView
        query={executedQuery}
        dbType={(dbType as "mysql" | "postgresql") || "postgresql"}
        configuredUri={ticket.connection_url || ticket.uri}
        isEvaluationMode={isEvaluationMode}
        userId={effectiveUserId}
        labId={labId}
        sprintId={sprintId}
        evaluationId={isEvaluationMode ? evaluationId : undefined}
      />
    );
  }

  // 3. UI preview
  if (isUi) {
    return <UiPreview files={files} />;
  }

  // 4. Empty State fallback
  return (
    <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2.5 text-center p-4">
      <div className="h-10 w-10 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground mb-1">
        <FlaskConical className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-xs font-semibold text-foreground">No Results Yet</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
          Click <span className="font-semibold text-foreground">Run</span> to execute your solution and evaluate against the requirements.
        </p>
      </div>
      <button
        onClick={onRun}
        disabled={running}
        className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        <Play className="h-3 w-3" />
        {running ? "Running tests..." : "Run Tests"}
      </button>
    </div>
  );
}

function TestsView({
  tests,
  ran,
  onRun,
}: {
  tests: TestResult[];
  ran: boolean;
  onRun: () => void;
}) {
  const passed = tests.filter((t) => t.pass).length;
  if (!ran) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <CheckCircle2 className="h-6 w-6" />
        <div>No test results yet</div>
        <button
          onClick={onRun}
          className="rounded border bg-primary px-3 py-1 text-xs text-primary-foreground hover:opacity-90"
        >
          Run tests
        </button>
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
            {t.pass ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-destructive" />
            )}
            <span className={t.pass ? "" : "text-destructive"}>{t.name}</span>
            <span className="ml-auto text-muted-foreground">{t.time}</span>
          </div>
          {!t.pass && !t.is_hidden && t.expected && (
            <div className="ml-5 mt-1 rounded border border-destructive/30 bg-destructive/5 p-1.5 text-[11px] text-destructive/90">
              <div>
                Expected: <span className="text-success">{t.expected}</span>
              </div>
              <div>
                Got: <span className="text-destructive">{t.got}</span>
              </div>
            </div>
          )}
        </div>
      ))}
      <div className="mt-2 border-t pt-2">
        Score:{" "}
        <span className="text-foreground font-semibold">
          {passed}/{tests.length}
        </span>{" "}
        ({Math.round((passed / tests.length) * 100)}%)
        {passed < tests.length && (
          <span className="ml-2 text-destructive">Submit when all tests pass.</span>
        )}
      </div>
    </div>
  );
}

function OutputView({ output }: { output: string }) {
  if (!output)
    return (
      <div className="text-muted-foreground">
        Click <span className="text-foreground font-medium">Run</span> to execute your code.
      </div>
    );
  return <pre className="font-mono text-muted-foreground whitespace-pre-wrap">{output}</pre>;
}

function ErrorsView({ state, file }: { state: "ok" | "warn" | "err"; file?: string }) {
  const items = state === "err" ? [
    { sev: "err" as const, line: 0, msg: "Tests failed or errors occurred during execution", fix: "Check your code output for details" },
  ] : state === "warn" ? [
    { sev: "warn" as const, line: 0, msg: "Warnings generated during execution", fix: "Review warnings" },
  ] : [];
  if (!items.length) return <div className="text-muted-foreground inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" />No errors or warnings.</div>;
  return (
    <div className="space-y-1.5 font-mono">
      {items.map((e, i) => (
        <div
          key={i}
          className={`rounded border p-2 ${e.sev === "err" ? "border-destructive/30 bg-destructive/5" : "border-warning/30 bg-warning/5"}`}
        >
          <div className="flex items-center gap-2">
            {e.sev === "err" ? (
              <XCircle className="h-3 w-3 text-destructive" />
            ) : (
              <AlertTriangle className="h-3 w-3 text-warning" />
            )}
            <span className="underline-offset-2">{file || "Main.java"}:{e.line}</span>
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
    {
      ok: todos === 0,
      sev: "warn" as const,
      t: `Resolve ${todos} TODO comment${todos === 1 ? "" : "s"}`,
    },
    {
      ok: code.includes("/**") || code.includes("//"),
      sev: "warn" as const,
      t: "Add comments to explain logic",
    },
    {
      ok: code.split("\n").length < 40,
      sev: "err" as const,
      t: "Method too long — consider refactoring",
    },
  ];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="text-2xl font-semibold">
          {score}
          <span className="text-muted-foreground text-sm">/10</span>
        </div>
        <div className="flex-1 h-2 rounded-full bg-accent overflow-hidden">
          <div className="h-full bg-success transition-all" style={{ width: `${score * 10}%` }} />
        </div>
      </div>
      <ul className="space-y-1 font-mono">
        {items.map((i, k) => (
          <li key={k} className="flex items-center gap-2">
            {i.ok ? (
              <CheckCircle2 className="h-3 w-3 text-success" />
            ) : i.sev === "warn" ? (
              <AlertTriangle className="h-3 w-3 text-warning" />
            ) : (
              <XCircle className="h-3 w-3 text-destructive" />
            )}
            <span className={i.ok ? "" : i.sev === "warn" ? "text-warning" : "text-destructive"}>
              {i.t}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WebPreview({ port = 8000 }: { port?: number }) {
  const executorBase = (import.meta.env.VITE_CODE_EXECUTOR_BASE_URL || "http://localhost:8009").replace(/\/$/, "");
  const [iframeKey, setIframeKey] = useState(0);
  const url = `${executorBase}/workspace/preview?port=${port}`;
  return (
    <div className="flex h-full w-full bg-white flex-col rounded border">
      <div className="flex items-center justify-between border-b p-2 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono text-neutral-800 font-medium">http://localhost:{port}</span>
        </div>
        <button
          onClick={() => setIframeKey((k) => k + 1)}
          className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] text-gray-600 hover:bg-gray-100"
          title="Refresh preview"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Reload</span>
        </button>
      </div>
      <iframe key={iframeKey} src={url} className="w-full flex-1" title={`Preview on port ${port}`} />
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
        <button className="mt-2 rounded bg-blue-600 px-3 py-1 text-xs text-white">
          Run sample
        </button>
      </div>
      <div className="w-40 space-y-1 text-[11px] text-muted-foreground">
        <div className="font-semibold text-foreground">Responsive</div>
        {["Mobile 375", "Tablet 768", "Desktop 1280"].map((d) => (
          <button
            key={d}
            className="block w-full rounded border px-2 py-1 text-left hover:bg-accent"
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}

function SidePreview({
  device,
  kit,
  files,
  activeFile,
  startupCommand,
  previewPort: directPreviewPort,
  ticket,
  isEvaluationMode,
  effectiveUserId,
  labId,
  sprintId,
  evaluationId,
  isMysql,
  isPostgres,
  isSql,
}: {
  device: "Mobile" | "Tablet" | "Desktop";
  kit: Kit;
  files: Record<string, string>;
  activeFile: string;
  startupCommand?: string;
  previewPort?: number;
  ticket?: any;
  isEvaluationMode?: boolean;
  effectiveUserId?: string;
  labId?: string;
  sprintId?: string;
  evaluationId?: string;
  isMysql?: boolean;
  isPostgres?: boolean;
  isSql?: boolean;
}) {
  const w = device === "Mobile" ? 375 : device === "Tablet" ? 768 : "100%";

  // Extract port from startup command or direct previewPort
  const previewPort = directPreviewPort ?? (startupCommand
    ? parseInt(startupCommand.match(/(\d{4,5})\s*$/)?.[1] ?? "8000", 10)
    : 8000);

  const isMysqlActive = Boolean(isMysql || kit.name === "mysql");
  const isPostgresActive = Boolean(isPostgres || kit.name === "postgresql");
  const isSqlActive = Boolean(isSql || kit.name === "sql");

  // If startup_command exists, show web preview (for Django, Flask, Node, etc.)
  const body = startupCommand ? <WebPreview port={previewPort} /> :
    kit.name === "django" ? <DjangoTodoApp /> :
      kit.name === "ui" ? <UiPreview files={files} fullHeight /> :
        isMysqlActive ? <ExternalSqlResultsView query={files[activeFile] ?? ""} dbType="mysql" configuredUri={ticket?.connection_url || ticket?.uri} isEvaluationMode={isEvaluationMode} userId={effectiveUserId} labId={labId} sprintId={sprintId} evaluationId={isEvaluationMode ? evaluationId : undefined} /> :
          isPostgresActive ? <ExternalSqlResultsView query={files[activeFile] ?? ""} dbType="postgresql" configuredUri={ticket?.connection_url || ticket?.uri} isEvaluationMode={isEvaluationMode} userId={effectiveUserId} labId={labId} sprintId={sprintId} evaluationId={isEvaluationMode ? evaluationId : undefined} /> :
            isSqlActive ? <SqlResultsView query={files[activeFile] ?? ""} /> :
              kit.name === "mongo" ? <MongoResultsView query={files[activeFile] ?? ""} /> :
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
        <div
          className="mx-auto h-full w-full overflow-auto rounded bg-white text-black shadow"
          style={{ width: w, maxWidth: "100%" }}
        >
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
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
          {remaining} left
        </span>
      </div>
      <p className="mb-4 text-xs text-gray-500">
        Django 5 · SQLite · {todos.length} item{todos.length === 1 ? "" : "s"}
      </p>

      <form onSubmit={add} className="mb-4 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add
        </button>
      </form>

      <ul className="divide-y divide-gray-200 rounded border border-gray-200">
        {todos.length === 0 && (
          <li className="p-4 text-center text-sm text-gray-500">No todos yet — add one above.</li>
        )}
        {todos.map((t) => (
          <li key={t.id} className="flex items-center gap-3 px-3 py-2">
            <button
              onClick={() => toggle(t.id)}
              aria-label="toggle"
              className={`grid h-5 w-5 place-items-center rounded border ${t.completed ? "border-green-600 bg-green-600 text-white" : "border-gray-400 bg-white text-transparent"}`}
            >
              ✓
            </button>
            <span
              className={`flex-1 text-sm ${t.completed ? "text-gray-400 line-through" : "text-gray-900"}`}
            >
              {t.title}
            </span>
            <button
              onClick={() => remove(t.id)}
              className="text-xs text-gray-400 hover:text-red-600"
              aria-label="delete"
            >
              🗑
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[10px] uppercase tracking-wider text-gray-400">
        POST /todos/ · CSRF protected
      </p>
    </div>
  );
}

function TerminalView({ wsUrl, theme, onCommandRun, startupCommand, onStartupCommandRun, isVisible }: { wsUrl: string | null; theme: "dark" | "light" | "system"; onCommandRun?: () => void; startupCommand?: string; onStartupCommandRun?: () => void; isVisible?: boolean; }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startupCommandRunRef = useRef(false);
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
    ])
      .then(([xterm, fit]) => {
        setLibs({ Terminal: xterm.Terminal, FitAddon: fit.FitAddon });
      })
      .catch(() => setError("Failed to load terminal library"));
  }, []);
  const onCommandRunRef = useRef(onCommandRun);
  useEffect(() => {
    onCommandRunRef.current = onCommandRun;
  }, [onCommandRun]);

  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const getThemeConfig = useCallback(() => {
    return {
      background: isDark ? "#0d1117" : "#fafaf7",
      foreground: isDark ? "#e6edf3" : "#24292f",
      cursor: isDark ? "#58a6ff" : "#0969da",
      cursorAccent: isDark ? "#0d1117" : "#fafaf7",
      selectionBackground: isDark ? "rgba(56, 139, 253, 0.4)" : "rgba(9, 105, 218, 0.2)",
      black: isDark ? "#0d1117" : "#fafaf7",
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
      brightWhite: "#f0f6fc",
    };
  }, [isDark]);

  // Mount xterm when libs are ready and container is available
  useEffect(() => {
    if (!libs || !containerRef.current) return;
    if (termRef.current) return; // already mounted

    const term = new libs.Terminal({
      cursorBlink: true,
      cursorStyle: "bar",
      fontSize: 12,
      lineHeight: 1.25,
      letterSpacing: 0,
      fontFamily: '"JetBrains Mono", Menlo, Monaco, Consolas, "Courier New", monospace',
      theme: getThemeConfig(),
      scrollback: 5000,
      convertEol: true,
      allowProposedApi: true,
    });

    const fitAddon = new libs.FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);

    termRef.current = term;
    fitRef.current = fitAddon;

    const doFit = () => {
      const container = containerRef.current;
      if (!container || container.clientWidth === 0 || container.clientHeight === 0) return;
      try {
        const core = (term as any)._core;
        if (core?._charSizeService?.measure) {
          core._charSizeService.measure();
        }
        if (core?._renderService?.dimensions) {
          core._renderService.dimensions.reset?.();
        }
      } catch {}
      try {
        fitAddon.fit();
      } catch {}
    };

    // Initial fit
    requestAnimationFrame(() => {
      doFit();
    });

    // Resize observer
    const ro = new ResizeObserver(() => {
      doFit();
    });
    ro.observe(containerRef.current);

    const dataListener = term.onData((data: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(data);
      }
      if (data === '\r' && onCommandRunRef.current) {
        setTimeout(onCommandRunRef.current, 500);
      }
    });

    return () => {
      ro.disconnect();
      dataListener.dispose();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, [libs, getThemeConfig]);

  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = getThemeConfig();
    }
  }, [getThemeConfig]);

  // Fit terminal when it becomes visible
  useEffect(() => {
    if (isVisible && fitRef.current && containerRef.current) {
      const runFit = () => {
        const container = containerRef.current;
        if (!container || container.clientWidth === 0 || container.clientHeight === 0) return;
        try {
          const core = (termRef.current as any)?._core;
          if (core?._charSizeService?.measure) {
            core._charSizeService.measure();
          }
          if (core?._renderService?.dimensions) {
            core._renderService.dimensions.reset?.();
          }
        } catch {}
        try {
          fitRef.current?.fit();
        } catch {}
      };

      runFit();
      const rAf = requestAnimationFrame(runFit);
      const timer50 = setTimeout(runFit, 50);
      const timer200 = setTimeout(runFit, 200);

      return () => {
        cancelAnimationFrame(rAf);
        clearTimeout(timer50);
        clearTimeout(timer200);
      };
    }
  }, [isVisible]);

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
      try { fitRef.current?.fit(); } catch { /* ignore */ }
      
      if (startupCommand && !startupCommandRunRef.current) {
        startupCommandRunRef.current = true;
        setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(startupCommand + "\r");
            if (onStartupCommandRun) onStartupCommandRun();
          }
        }, 500);
      }
    };

    ws.onmessage = (ev) => {
      if (!termRef.current) return;
      if (typeof ev.data === "string") {
        termRef.current.write(ev.data);
      } else {
        if (ev.data instanceof Blob) {
          ev.data.text().then((t) => termRef.current?.write(t));
        }
      }
    };

    ws.onerror = () => {
      setError("Terminal connection error — check code executor");
      setConnected(false);
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      termRef.current?.writeln("\r\n\x1b[31m[disconnected]\x1b[0m");
    };
  }, [wsUrl, startupCommand, onStartupCommandRun]);

  useEffect(() => {
    if (!termRef.current || !wsUrl) return;
    startupCommandRunRef.current = false;
    connect();
    return () => {
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsUrl, libs]);

  // If no wsUrl (dummy ticket), show static mock
  if (!wsUrl) {
    return (
      <div className="font-mono text-muted-foreground space-y-0.5 p-3">
        <div>
          <span className="text-success">student@labs</span>:
          <span className="text-info">~/workspace</span>$ ls
        </div>
        <div className="text-foreground">script.sh README.md</div>
        <div>
          <span className="text-success">student@labs</span>:
          <span className="text-info">~/workspace</span>$ <span className="animate-pulse">▌</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col h-full w-full overflow-hidden ${
        isDark ? "bg-[#0d1117] text-white" : "bg-[#fafaf7] text-neutral-800"
      }`}
    >
      {/* Sleek Terminal Header */}
      <div
        className={`flex items-center justify-between h-7 px-3 border-b text-[11px] font-mono select-none flex-shrink-0 ${
          isDark
            ? "bg-[#161b22] border-white/10 text-neutral-400"
            : "bg-neutral-100 border-neutral-200 text-neutral-600"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full flex-shrink-0 transition-colors ${
              connected ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-rose-500"
            }`}
          />
          <span className="font-semibold tracking-wider text-[10px] uppercase text-foreground">
            Terminal
          </span>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            {connected ? "• Connected" : `• ${error ?? "Disconnected"}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              termRef.current?.clear();
            }}
            title="Clear terminal"
            className="hover:text-foreground text-muted-foreground transition-colors px-1.5 py-0.5 rounded text-[10px]"
          >
            Clear
          </button>
          {!connected && (
            <button
              onClick={connect}
              className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              Reconnect
            </button>
          )}
        </div>
      </div>

      {/* Terminal Canvas Container */}
      <div className="flex-1 w-full h-full min-h-0 relative p-2">
        <div ref={containerRef} className="absolute inset-2 overflow-hidden" />
      </div>
    </div>
  );
}

function ProgressTile({
  icon: Icon,
  label,
  value,
  tone,
  pct,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
  tone: "success" | "warning" | "info" | "primary" | "muted";
  pct: number;
}) {
  const color = {
    success: "text-success",
    warning: "text-warning",
    info: "text-info",
    primary: "text-primary",
    muted: "text-muted-foreground",
  }[tone];
  const bar = {
    success: "bg-success",
    warning: "bg-warning",
    info: "bg-info",
    primary: "bg-primary",
    muted: "bg-muted-foreground",
  }[tone];
  return (
    <div className="rounded-md border bg-editor-bg p-2">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Icon className={`h-3 w-3 ${color}`} />
          {label}
        </span>
        <span className={`font-semibold ${color}`}>{value}</span>
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-accent overflow-hidden">
        <div className={`h-full ${bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function parseDPMarkdown(text: string) {
  if (!text) return "";

  // Remove duplicate 'Examples' section at the bottom
  const redundantExamplesIndex = text.search(/\n#{1,3}\s+Examples?\b/i);
  if (redundantExamplesIndex !== -1) {
    text = text.substring(0, redundantExamplesIndex);
  }

  const codeBlocks: string[] = [];
  let processed = text.replace(/```([\s\S]*?)```/g, (match, p1) => {
    codeBlocks.push(p1);
    return `___CODE_BLOCK_${codeBlocks.length - 1}___`;
  });

  processed = processed
    .replace(/###\s+([^\n]+)/g, '<h3 class="text-base font-bold mt-5 mb-2 text-foreground">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-accent px-1.5 py-0.5 rounded text-[11px] font-mono text-foreground">$1</code>')
    .replace(/\n/g, '<br/>');

  processed = processed.replace(/___CODE_BLOCK_(\d+)___/g, (match, idx) => {
    let block = codeBlocks[Number(idx)].trim();
    block = block.replace(/Input:\s*/gi, 'Input:\n')
                 .replace(/Output:\s*/gi, '\nOutput:\n')
                 .replace(/\n{2,}/g, '\n')
                 .trim();
    return `<div class="bg-editor-bg border border-border rounded-md p-3 my-3 font-mono text-xs overflow-x-auto text-foreground"><div class="whitespace-pre-wrap">${block}</div></div>`;
  });

  return processed;
}

function Minimap({ code }: { code: string }) {
  const lines = code.split("\n");
  return (
    <div className="hidden xl:block w-16 border-l bg-editor-bg/60 p-1 overflow-hidden">
      {lines.map((l, i) => (
        <div
          key={i}
          className="h-[3px] mb-[1px] rounded-sm"
          style={{
            width: `${Math.min(100, l.trim().length * 2.2)}%`,
            background: "color-mix(in oklab, var(--muted-foreground) 35%, transparent)",
          }}
        />
      ))}
    </div>
  );
}

function ProblemPanel({ 
  ticket, 
  isReal, 
  slug, 
  labName,
  isAlgo,
  evaluating, 
  evalResult, 
  ticketScore, 
  onEvaluate 
}: { 
  ticket: any; 
  isReal?: boolean; 
  slug: string;
  labName?: string;
  isAlgo?: boolean;
  evaluating: Record<string, boolean>;
  evalResult: Record<string, { passed: boolean; reason: string }>;
  ticketScore: { passed: number; total: number } | null;
  onEvaluate: (taskSlug: string, requiredCommand: string) => void;
}) {
  const tasks: any[] = Array.isArray(ticket.tasks) ? ticket.tasks : [];
  const objectives: any[] = Array.isArray(ticket.learning_objectives)
    ? ticket.learning_objectives
    : [];
  const mistakes: any[] = Array.isArray(ticket.common_mistakes) ? ticket.common_mistakes : [];

  return (
    <>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
          {ticket.tag}
        </div>
        <h2 className="text-lg font-semibold mt-0.5">{ticket.title}</h2>
        {isAlgo && isReal ? (
          <div className="mt-3 text-sm text-muted-foreground leading-relaxed DS-Markdown"
               dangerouslySetInnerHTML={{ __html: parseDPMarkdown(ticket.description) }} />
        ) : (
          <div className="mt-3 text-sm text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none [&>h3]:text-foreground [&>h3]:font-semibold [&>h3]:text-base [&>h3]:mt-4 [&>h3]:mb-2 [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-3 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-3 [&_code]:bg-accent/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_li]:my-0.5">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {isReal ? (ticket.description || "") : "📋 Create a program demonstrating Java variables and data types."}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {isReal ? (
        <>
          {/* Tasks from DB */}
          {tasks.length > 0 && (
            <Section title={isAlgo ? "✅ Test Cases" : "✅ Tasks"}>
              <div className="space-y-2 text-muted-foreground">
                {tasks.map((task: any, originalIdx: number) => ({ task, originalIdx })).filter(({ task }) => {
                  const title = typeof task === "string" ? task : (task.title ?? "");
                  return !(typeof task === "object" && (title.toLowerCase().includes("hidden") || title.toLowerCase().includes("advanced") || task.is_hidden === true));
                }).map(({ task, originalIdx }: { task: any, originalIdx: number }, idx: number) => {
                  const rawTitle =
                    typeof task === "string" ? task : (task.title ?? `Task ${idx + 1}`);
                  const taskTitle = formatTaskTitle(rawTitle, idx, task?.original_index ?? originalIdx);
                  const taskDesc = typeof task === "object" ? task.description : null;
                  const taskMethod = typeof task === "object" ? task.method : null;
                  const isDS = isAlgo;
                  const isHidden = typeof task === "object" && (taskTitle.toLowerCase().includes("hidden") || task.is_hidden === true);
                  
                  return (
                    <div
                      key={idx}
                      className="rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors p-3.5"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 border border-primary/20 text-[11px] text-primary font-bold">
                          {idx + 1}
                        </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-foreground text-sm">{taskTitle}</div>
                            {taskDesc && <p className="mt-1 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">{taskDesc}</p>}
                          {(task.input !== undefined || (task.expected_output !== undefined && ((typeof task.expected_output === 'object' && Object.keys(task.expected_output || {}).length > 0) || (typeof task.expected_output === 'string' && task.expected_output.trim().length > 0)))) && (
                            <div className="mt-2.5 text-xs bg-muted/40 rounded-md p-2.5">
                              {task.input !== undefined && (
                                <>
                                  <div className="font-semibold text-muted-foreground mb-1 uppercase tracking-wide text-[10px]">Input:</div>
                                  <div className="mb-3 whitespace-pre-wrap font-mono text-foreground">{task.input || "No input"}</div>
                                </>
                              )}
                              {task.expected_output !== undefined && ((typeof task.expected_output === 'object' && Object.keys(task.expected_output || {}).length > 0) || (typeof task.expected_output === 'string' && task.expected_output.trim().length > 0)) && (
                                <>
                                  <div className="font-semibold text-muted-foreground mb-1 uppercase tracking-wide text-[10px]">Expected Output:</div>
                                  <div className="whitespace-pre-wrap font-mono text-foreground">{typeof task.expected_output === 'object' ? JSON.stringify(task.expected_output, null, 2) : (task.expected_output || "No output")}</div>
                                </>
                              )}
                            </div>
                          )}
                          {taskMethod && (
                            <div className="mt-3 flex items-center flex-wrap gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded bg-info/10 px-2 py-1 text-[11px] font-medium text-info">
                                {taskMethod}
                              </span>
                            </div>
                          )}
                          {(() => {
                            const item = evalResult[task.task_slug] || evalResult[`task-${originalIdx}`] || evalResult[`task-${idx}`] || (task.id ? evalResult[String(task.id)] : undefined);
                            if (!item) return null;
                            return (
                              <div className={`mt-3 rounded-md border px-3 py-2 text-xs font-medium ${
                                item.passed 
                                  ? "border-success/20 bg-success/10 text-success" 
                                  : "border-destructive/20 bg-destructive/10 text-destructive"
                              }`}>
                                {item.passed ? "✅ Passed: " : "❌ Failed: "}
                                {item.reason}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {ticketScore && (
                <div className="mt-4 flex flex-col items-end border-t border-border pt-3">
                  <div className="text-xs font-medium">
                    Score: <span className={ticketScore.passed === ticketScore.total ? "text-success" : "text-warning"}>{ticketScore.passed}/{ticketScore.total}</span> {ticketScore.total === 10 && ticket.tasks?.length !== 10 ? "points" : "tasks completed"}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* Learning Objectives from DB */}
          {objectives.length > 0 && (
            <Section title="🎯 Learning Objectives">
              <ul className="space-y-1 text-muted-foreground">
                {objectives.map((obj: any, i: number) => (
                  <li key={i} className="flex items-start gap-1.5 text-[12px]">
                    <span className="mt-0.5 text-success shrink-0">✓</span>
                    <span>
                      {typeof obj === "string" ? obj : (obj.title ?? JSON.stringify(obj))}
                    </span>
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
                    <span>
                      {typeof m === "string" ? m : (m.description ?? m.title ?? JSON.stringify(m))}
                    </span>
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
                <div className="text-foreground">
                  Task 1 · Create variables for all primitive types
                </div>
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
        </>
      )}
    </>
  );
}

function ScorePenaltyWarningDialog({
  open,
  onOpenChange,
  title = "Score Penalty Warning",
  description,
  onAcknowledge,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description: React.ReactNode;
  onAcknowledge: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-600">
            <AlertTriangle className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-gray-700 py-4 text-base">
          {description}
        </DialogDescription>
        <DialogFooter>
          <button 
            className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-accent" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button 
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium" 
            onClick={() => { onOpenChange(false); onAcknowledge(); }}
          >
            Acknowledge & Reveal
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function HintsPanel({
  ticket,
  elapsed,
  initialRevealedHints = [],
  onUnlock,
  isPreview = false,
}: {
  ticket: any;
  elapsed: number;
  initialRevealedHints?: number[];
  onUnlock: (n: number, cost: string) => void;
  isPreview?: boolean;
}) {
  const hints = Array.isArray(ticket?.hints) ? ticket.hints : [];
  // In preview mode all hints are revealed immediately, no API needed
  const [revealedHints, setRevealedHints] = useState<number[]>(
    isPreview ? hints.map((_: any, i: number) => i) : initialRevealedHints
  );
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [targetHintIndex, setTargetHintIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isPreview) {
      setRevealedHints(hints.map((_: any, i: number) => i));
    } else {
      setRevealedHints(initialRevealedHints);
    }
  }, [initialRevealedHints, isPreview]);

  if (hints.length === 0) {
    return (
      <div className="text-center py-8 w-full border rounded-md mt-4 border-editor-border bg-editor-panel">
        <Lightbulb className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <h4 className="text-sm font-medium text-foreground mb-1">No Hints Available</h4>
        <p className="text-xs text-muted-foreground max-w-[250px] mx-auto">
          No hints have been added to this question yet.
        </p>
      </div>
    );
  }

  const handleReveal = async (index: number) => {
    if (isPreview) {
      setRevealedHints(prev => [...prev, index]);
      return;
    }
    if (!revealedHints.includes(index)) {
      setLoading(true);
      try {
        const { default: api } = await import("@/utils/RestApiAuthUtil");
        const res = await api.post(`/lab/submissions/reveal-hint/`, {
          ticket_id: ticket.id,
          hint_index: index,
        });
        if (res?.revealed_hints) {
          setRevealedHints(res.revealed_hints);
        } else {
          setRevealedHints([...revealedHints, index]);
        }
        onUnlock(index + 1, "50% Penalty");
      } catch (err) {
        console.error("Failed to reveal hint", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const attemptReveal = (index: number) => {
    if (isPreview) {
      handleReveal(index);
      return;
    }
    setTargetHintIndex(index);
    setShowWarningDialog(true);
  };

  return (
    <div className="space-y-3">
      {isPreview ? (
        <div className="rounded-md border border-border bg-muted/30 p-2 text-xs text-muted-foreground">
          <Lightbulb className="inline h-3 w-3 mr-1" /> Recruiter preview — hints are shown without penalty.
        </div>
      ) : (
        <div className="rounded-md border border-border bg-muted/30 p-2 text-xs text-muted-foreground">
          <Lightbulb className="inline h-3 w-3 mr-1" /> Use hints if you get stuck. Note: Revealing any hints will result in a 50% score penalty for this ticket.
        </div>
      )}

      {!isPreview && (
        <ScorePenaltyWarningDialog
          open={showWarningDialog}
          onOpenChange={setShowWarningDialog}
          title="Hint Penalty Warning"
          description={
            <>
              Are you sure you want to reveal this hint?<br /><br />
              Revealing hints will result in a <strong>50% score penalty</strong> for this problem. This penalty applies once, no matter how many hints you reveal.
            </>
          }
          onAcknowledge={() => {
            if (targetHintIndex !== null) {
              handleReveal(targetHintIndex);
            }
          }}
        />
      )}
      
      {hints.map((hint: string, index: number) => {
        const isRevealed = revealedHints.includes(index);
        
        return (
          <div key={index} className="rounded-md border bg-editor-bg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-foreground inline-flex items-center gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
                Hint {index + 1}
              </div>
              <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                {isRevealed ? (
                  <Unlock className="h-3 w-3 text-success" />
                ) : (
                  <Lock className="h-3 w-3" />
                )}
                {isRevealed ? "Revealed" : "Locked"}
              </span>
            </div>
            
            {isRevealed ? (
              <pre className="mt-2 whitespace-pre-wrap text-xs text-foreground font-mono bg-background/50 p-3 rounded border border-border/50">
                {hint}
              </pre>
            ) : (
              <div className="mt-2">
                <button
                  onClick={() => attemptReveal(index)}
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground transition-colors disabled:opacity-50"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {loading && targetHintIndex === index ? "Revealing..." : "Reveal Hint"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// function DiscussPanel() {
//   return (
//     <div className="space-y-3 text-xs">
//       {[
//         { u: "Priya M.", t: "Why does (int)3.99 give 3 and not 4?", r: 12 },
//         { u: "Liam K.", t: "Tip: use Integer.MIN_VALUE for edge testing.", r: 4 },
//         { u: "Sofia R.", t: "Got 100% — used String.format for clean output.", r: 7 },
//       ].map((d, i) => (
//         <div key={i} className="rounded-md border p-2 bg-editor-bg">
//           <div className="flex items-center gap-2">
//             <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[10px]">
//               {d.u[0]}
//             </span>
//             <span className="font-medium">{d.u}</span>
//           </div>
//           <div className="mt-1 text-muted-foreground">{d.t}</div>
//           <div className="mt-1 text-[10px] text-muted-foreground">{d.r} replies</div>
//         </div>
//       ))}
//     </div>
//   );
// }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-lg border border-border/50 bg-card/20">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-medium"
      >
        <span>{title}</span>
        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      {open && <div className="px-3.5 pb-3.5 text-xs">{children}</div>}
    </div>
  );
}

function TreeFolder({
  label,
  open: openProp,
  onToggle,
  children,
}: {
  label: string;
  open?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(openProp ?? false);
  const isControlled = onToggle !== undefined;
  const open = isControlled ? (openProp ?? false) : internalOpen;
  const handleClick = () => (isControlled ? onToggle!() : setInternalOpen((o) => !o));
  return (
    <div>
      <button
        onClick={handleClick}
        className="flex w-full items-center gap-1 rounded px-1.5 py-0.5 hover:bg-accent/60"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {open ? (
          <FolderOpen className="h-3 w-3 text-info" />
        ) : (
          <Folder className="h-3 w-3 text-info" />
        )}
        <span>{label}</span>
      </button>
      {open && <div className="pl-4">{children}</div>}
    </div>
  );
}
function TreeFile({
  name,
  active,
  modified,
  onClick,
}: {
  name: string;
  active?: boolean;
  modified?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-1.5 rounded px-1.5 py-0.5 text-left ${active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60"}`}
    >
      <FileCode2 className="h-3 w-3" />
      <span className="flex-1 truncate">{name}</span>
      {modified && <span className="h-1.5 w-1.5 rounded-full bg-warning" />}
    </button>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
}

function highlight(line: string): string {
  let h = escapeHtml(line);
  h = h.replace(/(\/\/.*$)/g, '<span style="color:var(--syntax-comment)">$1</span>');
  h = h.replace(/(&quot;.*?&quot;|".*?")/g, '<span style="color:var(--syntax-string)">$1</span>');
  h = h.replace(
    /\b(public|class|static|void|int|double|boolean|String|char|long|float|byte|short|return|if|else|for|while|new|true|false|null|import)\b/g,
    '<span style="color:var(--syntax-keyword)">$1</span>',
  );
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
    if (!full || !full.trim()) continue;
    if (full.startsWith("yuvro_scoring_rules") || full.includes("/yuvro_scoring_rules") || full.startsWith("__pycache__") || full.includes("/__pycache__")) continue;
    const parts = full.split("/");
    let cursor = root;
    for (let i = 0; i < parts.length; i++) {
      const seg = parts[i];
      if (!seg) continue;
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
    n.children.sort((a, b) =>
      a.isFile === b.isFile ? a.name.localeCompare(b.name) : a.isFile ? 1 : -1,
    );
    n.children.forEach(sort);
  };
  sort(root);
  return root;
}

export type InlineTreeAction =
  | { type: "new-file"; folderPath: string }
  | { type: "new-folder"; folderPath: string }
  | { type: "rename-file"; path: string; currentName: string }
  | { type: "rename-folder"; path: string; currentName: string };

function InlineInput({
  initialValue = "",
  placeholder = "",
  icon,
  onCommit,
  onCancel,
  paddingLeft,
}: {
  initialValue?: string;
  placeholder?: string;
  icon: React.ReactNode;
  onCommit: (val: string) => void;
  onCancel: () => void;
  paddingLeft: number;
}) {
  const [val, setVal] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      if (initialValue) {
        const dot = initialValue.lastIndexOf(".");
        if (dot > 0) {
          inputRef.current.setSelectionRange(0, dot);
        } else {
          inputRef.current.select();
        }
      }
    }
  }, [initialValue]);

  return (
    <div
      style={{ paddingLeft }}
      className="flex items-center gap-1.5 py-0.5 pr-2 bg-accent/40 rounded my-0.5"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="w-3" />
      {icon}
      <input
        ref={inputRef}
        type="text"
        value={val}
        placeholder={placeholder}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            onCommit(val);
          } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          }
        }}
        onBlur={() => {
          onCommit(val);
        }}
        className="flex-1 bg-background border border-primary text-foreground text-xs px-1.5 py-0.5 rounded outline-none h-6 min-w-0"
      />
    </div>
  );
}

type FileTreeProps = {
  rootLabel: string;
  paths: readonly string[];
  activeFile: string;
  dirty: Record<string, boolean>;
  inlineAction: InlineTreeAction | null;
  setInlineAction: (action: InlineTreeAction | null) => void;
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
  node,
  depth,
  isRoot,
  activeFile,
  dirty,
  inlineAction,
  setInlineAction,
  onOpenFile,
  onCreateFile,
  onRenameFile,
  onDeleteFile,
  onDeleteFolder,
  isFolderOpen,
  toggleFolder,
}: { node: TreeNode; depth: number; isRoot?: boolean } & Omit<
  FileTreeProps,
  "paths" | "rootLabel"
>) {
  const key = node.path || "__root__";
  const open = isFolderOpen(key);
  const pad = { paddingLeft: depth * 10 + 4 };

  const isRenamingThis = inlineAction?.type === "rename-folder" && inlineAction.path === node.path;
  const isCreatingInside = inlineAction && (inlineAction.type === "new-file" || inlineAction.type === "new-folder") && inlineAction.folderPath === node.path;

  const handleNewFile = () => {
    if (!open) toggleFolder(key);
    setInlineAction({ type: "new-file", folderPath: node.path });
  };
  const handleNewFolder = () => {
    if (!open) toggleFolder(key);
    setInlineAction({ type: "new-folder", folderPath: node.path });
  };

  return (
    <div>
      {isRenamingThis ? (
        <InlineInput
          initialValue={node.name}
          icon={<FolderOpen className="h-3 w-3 shrink-0 text-info" />}
          paddingLeft={depth * 10 + 4}
          onCommit={(nextName) => {
            const trimmed = nextName.trim().replace(/\/+$/, "");
            if (trimmed && trimmed !== node.name) {
              const parts = node.path.split("/");
              parts[parts.length - 1] = trimmed;
              const newPath = parts.join("/");
              const prefix = node.path + "/";
              const newPrefix = newPath + "/";
              const affected = props_get_paths_under(node, prefix);
              affected.forEach((p) => onRenameFile(p, p.replace(prefix, newPrefix)));
            }
            setInlineAction(null);
          }}
          onCancel={() => setInlineAction(null)}
        />
      ) : (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <button
              onClick={() => toggleFolder(key)}
              style={pad}
              className="group flex w-full items-center gap-1 rounded py-0.5 pr-1 text-left hover:bg-accent/60"
            >
              {open ? (
                <ChevronDown className="h-3 w-3 shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 shrink-0" />
              )}
              {open ? (
                <FolderOpen className="h-3 w-3 shrink-0 text-info" />
              ) : (
                <Folder className="h-3 w-3 shrink-0 text-info" />
              )}
              <span className="truncate">{node.name}</span>
            </button>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-44">
            <ContextMenuItem onSelect={handleNewFile}>
              <FilePlus className="mr-2 h-3.5 w-3.5" />
              New File
            </ContextMenuItem>
            <ContextMenuItem onSelect={handleNewFolder}>
              <FolderPlus className="mr-2 h-3.5 w-3.5" />
              New Folder
            </ContextMenuItem>
            {!isRoot && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onSelect={() => {
                    setInlineAction({ type: "rename-folder", path: node.path, currentName: node.name });
                  }}
                >
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Rename Folder
                </ContextMenuItem>
                <ContextMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => onDeleteFolder(node.path)}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete Folder
                </ContextMenuItem>
              </>
            )}
          </ContextMenuContent>
        </ContextMenu>
      )}

      {open && (
        <div>
          {isCreatingInside && (
            inlineAction?.type === "new-file" ? (
              <InlineInput
                placeholder="filename.py"
                icon={<FileCode2 className="h-3 w-3 shrink-0 text-muted-foreground" />}
                paddingLeft={(depth + 1) * 10 + 4}
                onCommit={(name) => {
                  const trimmed = name.trim();
                  if (trimmed) {
                    const fullPath = node.path ? `${node.path}/${trimmed}` : trimmed;
                    onCreateFile(fullPath);
                  }
                  setInlineAction(null);
                }}
                onCancel={() => setInlineAction(null)}
              />
            ) : (
              <InlineInput
                placeholder="folder-name"
                icon={<Folder className="h-3 w-3 shrink-0 text-info" />}
                paddingLeft={(depth + 1) * 10 + 4}
                onCommit={(name) => {
                  const trimmed = name.trim().replace(/\/+$/, "");
                  if (trimmed) {
                    const fullPath = node.path ? `${node.path}/${trimmed}` : trimmed;
                    onCreateFile(`${fullPath}/.gitkeep`, "");
                  }
                  setInlineAction(null);
                }}
                onCancel={() => setInlineAction(null)}
              />
            )
          )}

          {node.children.map((child) =>
            child.isFile ? (
              <TreeFileNode
                key={child.path}
                node={child}
                depth={depth + 1}
                active={activeFile === child.path}
                modified={dirty[child.path]}
                inlineAction={inlineAction}
                setInlineAction={setInlineAction}
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
                inlineAction={inlineAction}
                setInlineAction={setInlineAction}
                onOpenFile={onOpenFile}
                onCreateFile={onCreateFile}
                onRenameFile={onRenameFile}
                onDeleteFile={onDeleteFile}
                onDeleteFolder={onDeleteFolder}
                isFolderOpen={isFolderOpen}
                toggleFolder={toggleFolder}
              />
            ),
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
  node,
  depth,
  active,
  modified,
  inlineAction,
  setInlineAction,
  onOpenFile,
  onRenameFile,
  onDeleteFile,
}: {
  node: TreeNode;
  depth: number;
  active: boolean;
  modified?: boolean;
  inlineAction: InlineTreeAction | null;
  setInlineAction: (action: InlineTreeAction | null) => void;
  onOpenFile: (path: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
  onDeleteFile: (path: string) => void;
}) {
  const pad = { paddingLeft: depth * 10 + 4 };
  const isRenaming = inlineAction?.type === "rename-file" && inlineAction.path === node.path;

  if (isRenaming) {
    return (
      <InlineInput
        initialValue={node.name}
        icon={<FileCode2 className="h-3 w-3 shrink-0 text-info" />}
        paddingLeft={depth * 10 + 4}
        onCommit={(nextName) => {
          const trimmed = nextName.trim();
          if (trimmed && trimmed !== node.name) {
            const parts = node.path.split("/");
            parts[parts.length - 1] = trimmed;
            onRenameFile(node.path, parts.join("/"));
          }
          setInlineAction(null);
        }}
        onCancel={() => setInlineAction(null)}
      />
    );
  }

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
            setInlineAction({ type: "rename-file", path: node.path, currentName: node.name });
          }}
        >
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={() => onDeleteFile(node.path)}
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

/* ---------- SQL Mock DB Schema ---------- */

export type DbColumn = {
  name: string;
  type: string;
  nullable: "YES" | "NO";
  default: string;
  key: "PK" | "FK" | "-";
};
export type DbTable = { name: string; columns: DbColumn[]; ddl: string };
export type DbSchema = {
  name: string;
  type: "PostgreSQL" | "MySQL" | "SQLite" | "MongoDB";
  tables: DbTable[];
};

export const MOCK_DB_SCHEMA: DbSchema = {
  name: "yuvro_sql_lab",
  type: "SQLite",
  tables: [],
};

function SchemaViewer({ tablePath, dbSchemas }: { tablePath: string; dbSchemas: DbSchema[] }) {
  const [dbName, tableName] = tablePath.split(".");
  const schema = dbSchemas.find((s) => s.name === dbName);
  const table = schema?.tables.find((t) => t.name === tableName);
  if (!table) return <div className="p-4 text-muted-foreground text-sm">Table not found</div>;

  return (
    <div className="flex flex-col h-full bg-background overflow-auto p-4 text-sm">
      <div className="flex items-center gap-2 mb-4">
        <Package className="h-5 w-5 text-primary" />
        <h2 className="font-semibold text-lg uppercase tracking-wider text-muted-foreground">
          Schema Viewer
        </h2>
        <span className="text-foreground">
          {dbName}.{table.name}
        </span>
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
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c.key === "PK" ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : "bg-blue-500/20 text-blue-600 dark:text-blue-400"}`}
                      >
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
/* ---------- External SQL query results viewer ---------- */

function ExternalSqlResultsView({
  query,
  dbType,
  configuredUri,
  isEvaluationMode,
  userId,
  labId,
  sprintId,
  evaluationId,
}: {
  query: string;
  dbType: "mysql" | "postgresql";
  configuredUri?: string;
  isEvaluationMode?: boolean;
  userId?: string;
  labId?: string;
  sprintId?: string;
  evaluationId?: string;
}) {
  const [viewMode, setViewMode] = useState<"TABLE" | "JSON">("TABLE");
  const [res, setRes] = useState<{
    columns: string[];
    rows: any[];
    note: string;
    ms: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isPreconfigured = Boolean(configuredUri?.trim()) || Boolean(isEvaluationMode);
  const [uri, setUri] = useState<string>(() => {
    if (configuredUri?.trim()) return configuredUri.trim();
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem(`${dbType}Uri`) ||
        (dbType === "postgresql" ? localStorage.getItem("postgresUri") : "") ||
        ""
      );
    }
    return "";
  });
  const [editingUri, setEditingUri] = useState(false);
  const [tempUri, setTempUri] = useState(uri);

  useEffect(() => {
    if (configuredUri?.trim()) {
      setUri(configuredUri.trim());
      setTempUri(configuredUri.trim());
    }
  }, [configuredUri]);

  const saveUri = () => {
    const trimmed = tempUri.trim();
    setUri(trimmed);
    if (typeof window !== "undefined") {
      localStorage.setItem(`${dbType}Uri`, trimmed);
      if (dbType === "postgresql") {
        localStorage.setItem("postgresUri", trimmed);
      }
      window.dispatchEvent(new Event("db-schema-refresh"));
    }
    setEditingUri(false);
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      const activeUri = configuredUri?.trim() || uri;
      if (!activeUri) return;
      setLoading(true);
      setError(null);
      try {
        const engine = dbType === "mysql" ? "mysql" : "postgresql";
        const result: any = await executeExternalDbQuery(engine, activeUri, query, {
          userId,
          labId,
          sprintId,
          evaluationId,
        });
        if (active) {
          if (result && result.error) {
            setError(result.error);
          } else {
            setRes(result);
            setError(null);
            // Only trigger schema sidebar reload if the query modifies tables/schema (DDL)
            const isDdl = /\b(create|drop|alter|truncate|rename)\b/i.test(query || "");
            if (isDdl) {
              window.dispatchEvent(new Event("db-schema-refresh"));
            }
          }
        }
      } catch (e: any) {
        if (active) setError(e.message || "Failed to execute query");
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [query, uri, configuredUri, dbType]);

  const handleDownloadCsv = () => {
    if (!res || res.rows.length === 0) return;
    const header = res.columns.join(",");
    const csvRows = res.rows.map((r) =>
      res.columns.map((c) => JSON.stringify(r[c] ?? "")).join(","),
    );
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
    <div className="text-[12px] flex flex-col h-full gap-2">
      <div className="flex flex-col gap-2 p-2 rounded-md border bg-accent/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">Database Connection</span>
          </div>
          {isPreconfigured ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium">Connected to Assessment Database ({dbType.toUpperCase()})</span>
            </div>
          ) : (
            <button
              onClick={() => {
                setEditingUri(true);
                setTempUri(uri);
              }}
              className="text-muted-foreground hover:text-foreground underline decoration-dashed"
            >
              {uri ? `Connected (${dbType})` : "Click to configure URI"}
            </button>
          )}
        </div>
        {editingUri && !isPreconfigured && (
          <div className="flex items-center gap-2 mt-1">
            <input
              type="text"
              value={tempUri}
              onChange={(e) => setTempUri(e.target.value)}
              placeholder={
                dbType === "mysql"
                  ? "mysql://user:pass@host:3306/db"
                  : "postgresql://user:pass@host:5432/db"
              }
              className="flex-1 rounded border bg-background px-2 py-1 outline-none text-foreground"
            />
            <button
              onClick={saveUri}
              className="bg-primary text-primary-foreground px-2 py-1 rounded"
            >
              Save
            </button>
            <button
              onClick={() => setEditingUri(false)}
              className="text-muted-foreground hover:text-foreground px-2"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {loading && !res && (
          <div className="text-muted-foreground p-2 animate-pulse">Executing query...</div>
        )}
        {error && (
          <div className="text-destructive bg-destructive/10 border border-destructive p-2 rounded whitespace-pre-wrap">
            {error}
          </div>
        )}

        {res && (
          <>
            <div className="mb-2 flex items-center justify-between text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className={loading ? "animate-pulse text-primary font-medium" : ""}>
                  {loading ? "Executing query…" : res.note}
                </span>
                <div className="flex items-center border rounded overflow-hidden text-[10px] font-medium">
                  <button
                    onClick={() => setViewMode("TABLE")}
                    className={`px-2 py-0.5 ${viewMode === "TABLE" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                  >
                    TABLE
                  </button>
                  <button
                    onClick={() => setViewMode("JSON")}
                    className={`px-2 py-0.5 border-l ${viewMode === "JSON" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                  >
                    JSON
                  </button>
                </div>
                <button
                  onClick={handleDownloadCsv}
                  className="hover:text-foreground text-[11px] underline"
                >
                  Download CSV
                </button>
              </div>
              <span>executed in {res.ms}ms</span>
            </div>

            {res.rows.length === 0 ? (
              <div className="text-muted-foreground p-2">0 rows returned.</div>
            ) : viewMode === "TABLE" ? (
              <div className="overflow-auto rounded border flex-1">
                <table className="w-full font-mono">
                  <thead className="bg-accent/40 text-muted-foreground">
                    <tr>
                      {res.columns.map((c) => (
                        <th key={c} className="px-2 py-1 text-left font-medium">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {res.rows.map((r, i) => (
                      <tr key={i} className="border-t hover:bg-accent/30">
                        {res.columns.map((c) => (
                          <td key={c} className="px-2 py-1 whitespace-nowrap">
                            {String(r[c])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded overflow-auto border flex-1 text-[11px]">
                <pre className="p-2 text-foreground/90 font-mono">
                  {JSON.stringify(res.rows, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SqlResultsView({ query, runId, onQueryExecuted, executionOutput }: { query: string, runId?: number, onQueryExecuted?: () => void, executionOutput?: string }) {
  const [viewMode, setViewMode] = useState<"TABLE" | "JSON">("TABLE");
  const [res, setRes] = useState<{
    columns: string[];
    rows: SqlRow[];
    note: string;
    ms: number;
  } | null>(null);

  useEffect(() => {
    if (executionOutput && (executionOutput.includes("-- Executed Query") || executionOutput.includes("Process finished"))) {
      const cleanOut = executionOutput.replace(/^-- Executed Query\s*/, "").split(/✓ Process finished/)[0].trim();
      if (cleanOut.startsWith("Error:")) {
        setRes({ columns: [], rows: [], note: cleanOut, ms: 0 });
      } else {
        const lines = cleanOut.split("\n").map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) {
          setRes({ columns: [], rows: [], note: "Query executed successfully. 0 row(s) returned.", ms: 0 });
        } else {
          const hasPipes = lines.some(l => l.includes("|"));
          if (hasPipes) {
            const rows = lines.map(l => {
              const parts = l.split("|");
              const rowObj: SqlRow = {};
              parts.forEach((p, idx) => {
                rowObj[`col_${idx + 1}`] = p.trim();
              });
              return rowObj;
            });
            const cols = Object.keys(rows[0] || {});
            setRes({ columns: cols, rows, note: `${rows.length} row(s) returned`, ms: 0 });
          } else {
            setRes({ columns: [], rows: [], note: cleanOut, ms: 0 });
          }
        }
      }
      if (onQueryExecuted) onQueryExecuted();
      return;
    }

    if (!query) return;
    try {
      const result = runSqlQuery(query);
      setRes(result);
    } catch (e: any) {
      setRes({ columns: [], rows: [], note: `Error: ${e.message}`, ms: 0 });
    }
    // Refresh schema after query has executed and mutated db state
    if (onQueryExecuted) onQueryExecuted();
  }, [query, runId, onQueryExecuted, executionOutput]);

  if (!res) return null;

  if (res.columns.length === 0) {
    return <div className="text-muted-foreground p-2">{res.note}</div>;
  }

  const handleDownloadCsv = () => {
    if (res.rows.length === 0) return;
    const header = res.columns.join(",");
    const csvRows = res.rows.map((r) =>
      res.columns.map((c) => JSON.stringify(r[c] ?? "")).join(","),
    );
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
            <button
              onClick={() => setViewMode("TABLE")}
              className={`px-2 py-0.5 ${viewMode === "TABLE" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
            >
              TABLE
            </button>
            <button
              onClick={() => setViewMode("JSON")}
              className={`px-2 py-0.5 border-l ${viewMode === "JSON" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
            >
              JSON
            </button>
          </div>
          <button
            onClick={handleDownloadCsv}
            className="hover:text-foreground text-[11px] underline"
          >
            Download CSV
          </button>
        </div>
        <span>executed in {res.ms}ms</span>
      </div>

      {viewMode === "TABLE" ? (
        <div className="overflow-auto rounded border flex-1">
          <table className="w-full font-mono">
            <thead className="bg-accent/40 text-muted-foreground">
              <tr>
                {res.columns.map((c) => (
                  <th key={c} className="px-2 py-1 text-left font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {res.rows.map((r, i) => (
                <tr key={i} className="border-t hover:bg-accent/30">
                  {res.columns.map((c) => (
                    <td key={c} className="px-2 py-1 whitespace-nowrap">
                      {String(r[c])}
                    </td>
                  ))}
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

function runMongoQuery(q: string): { rows: unknown[]; note: string; ms: number } {
  return runDynamicMongoQuery(q);
}

function MongoResultsView({
  query,
  runId,
  onQueryExecuted,
  configuredUri,
  isEvaluationMode,
  userId,
  labId,
  sprintId,
  evaluationId,
}: {
  query: string;
  runId?: number;
  onQueryExecuted?: () => void;
  configuredUri?: string;
  isEvaluationMode?: boolean;
  userId?: string;
  labId?: string;
  sprintId?: string;
  evaluationId?: string;
}) {
  const [res, setRes] = useState<{ rows: unknown[]; note: string; ms: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [mongoUri, setMongoUri] = useState<string>(() => {
    if (configuredUri?.trim()) return configuredUri.trim();
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("mongoUri") ||
        localStorage.getItem("mongodbUri") ||
        localStorage.getItem("externalMongoUri") ||
        ""
      );
    }
    return "";
  });
  const [editingUri, setEditingUri] = useState(false);
  const [tempUri, setTempUri] = useState(mongoUri);

  const saveUri = () => {
    const trimmed = tempUri.trim();
    setMongoUri(trimmed);
    if (typeof window !== "undefined") {
      localStorage.setItem("mongoUri", trimmed);
      localStorage.setItem("mongodbUri", trimmed);
      localStorage.setItem("externalMongoUri", trimmed);
      window.dispatchEvent(new Event("db-schema-refresh"));
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
          const remoteRes: any = await executeExternalDbQuery("mongodb", mongoUri, query, {
            userId,
            labId,
            sprintId,
            evaluationId: isEvaluationMode ? evaluationId : undefined,
          });
          if (active) {
            if (remoteRes && remoteRes.error) {
              setError(remoteRes.error);
              setRes(null);
            } else {
              setRes(remoteRes);
              setError(null);
              window.dispatchEvent(new Event("db-schema-refresh"));
            }
          }
        } else {
          // fallback to local in-memory engine
          const localRes = runDynamicMongoQuery(query);
          if (active) setRes(localRes);
        }
      } catch (e: any) {
        if (active) setError(e.message || "Failed to execute query");
      } finally {
        if (active) setLoading(false);
        if (onQueryExecuted) onQueryExecuted();
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [query, mongoUri, runId, configuredUri, isEvaluationMode, userId, labId, sprintId, evaluationId]);

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
            onClick={() => {
              setEditingUri(true);
              setTempUri(mongoUri);
            }}
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
              onChange={(e) => setTempUri(e.target.value)}
              placeholder="mongodb+srv://..."
              className="flex-1 rounded border bg-background px-2 py-1 outline-none text-foreground"
            />
            <button
              onClick={saveUri}
              className="bg-primary text-primary-foreground px-2 py-1 rounded"
            >
              Save
            </button>
            <button
              onClick={() => setEditingUri(false)}
              className="text-muted-foreground hover:text-foreground px-2"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Query Results */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {loading && (
          <div className="text-muted-foreground p-2 animate-pulse">Executing query...</div>
        )}
        {error && (
          <div className="text-destructive bg-destructive/10 border border-destructive p-2 rounded whitespace-pre-wrap">
            {error}
          </div>
        )}

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
    
    // Dynamically find any CSS or JS file instead of hardcoding names
    const cssFileName = Object.keys(files).find(f => f.endsWith('.css'));
    const jsFileName = Object.keys(files).find(f => f.endsWith('.js'));
    
    const cssText = cssFileName ? files[cssFileName] : "";
    const jsText = jsFileName ? files[jsFileName] : "";
    
    const cssTag = `<style>${cssText}</style>`;
    const jsTag = `<script>\ntry { ${jsText} } catch (e) { document.body.insertAdjacentHTML('beforeend', '<pre style="color:#b00">'+(e && e.message || e)+'</pre>'); }\n<\/script>`;
    
    // Strip any external <link rel=stylesheet> and <script src="..."> then inject inline.
    let out = html
      .replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/i, cssTag)
      .replace(/<script[^>]*src=[^>]*><\/script>/i, jsTag);
      
    if (!out.includes("<style>")) out = out.replace(/<\/head>/i, `${cssTag}</head>`);
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

/* ---------- UI Diff View ---------- */

function UiDiffView({ result }: { result: any }) {
  if (!result)
    return (
      <div className="text-muted-foreground p-3">
        Click Run to validate UI against the design target.
      </div>
    );
  if (result.error)
    return <div className="text-destructive p-3">Validation failed: {result.error}</div>;

  return (
    <div className="flex h-full gap-4 overflow-auto">
      <div className="flex-1 space-y-4 pr-2">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              UI Match
            </div>
            <div
              className={`text-2xl font-bold ${result.ui_score >= 75 ? "text-success" : "text-warning"}`}
            >
              {result.ui_score.toFixed(1)}%
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Structure
            </div>
            <div
              className={`text-2xl font-bold ${result.structural_score >= 75 ? "text-success" : "text-warning"}`}
            >
              {result.structural_score.toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Structural Checks</h3>
          <div className="space-y-1">
            {result.checks?.map((check: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2 text-xs font-mono">
                {check.passed ? (
                  <CheckCircle2 className="h-3 w-3 text-success" />
                ) : (
                  <XCircle className="h-3 w-3 text-destructive" />
                )}
                <span className={check.passed ? "text-foreground" : "text-destructive"}>
                  {check.name}
                </span>
                <span className="text-muted-foreground ml-auto">{check.reason}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-[2] flex gap-4 min-h-0 bg-background/50 p-2 rounded border">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="text-xs font-medium text-center mb-1 text-muted-foreground">
            Target Design
          </div>
          <div className="flex-1 overflow-auto border border-border/50 bg-white">
            {result.base_img_b64 ? (
              <img
                src={`data:image/png;base64,${result.base_img_b64}`}
                alt="Target Design"
                className="max-w-full"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
                No image
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <div className="text-xs font-medium text-center mb-1 text-muted-foreground">Your UI</div>
          <div className="flex-1 overflow-auto border border-border/50 bg-white">
            {result.user_img_b64 ? (
              <img
                src={`data:image/png;base64,${result.user_img_b64}`}
                alt="Your UI"
                className="max-w-full"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
                No image
              </div>
            )}
          </div>
        </div>
        {result.diff_img_b64 && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="text-xs font-medium text-center mb-1 text-muted-foreground">
              Diff Overlay
            </div>
            <div className="flex-1 overflow-auto border border-border/50 bg-white">
              <img
                src={`data:image/png;base64,${result.diff_img_b64}`}
                alt="Diff Overlay"
                className="max-w-full"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


export function getSolutionsFromTicket(ticket: any): any[] {
  if (!ticket) return [];

  const results: any[] = [];
  const langMap: Record<string, string> = {
    py: "python", js: "javascript", ts: "typescript", jsx: "javascript", tsx: "typescript",
    html: "html", css: "css", json: "json", sql: "sql", cpp: "cpp", c: "c", java: "java",
    go: "go", rs: "rust", sh: "bash"
  };

  // 1. ticket.solution_files (Array of { path, code } or strings)
  if (Array.isArray(ticket.solution_files) && ticket.solution_files.length > 0) {
    ticket.solution_files.forEach((sf: any, idx: number) => {
      const filePath = typeof sf === "string" ? sf : (sf.path || sf.file || sf.filePath || sf.file_path || `file_${idx + 1}`);
      const code = typeof sf === "string" ? "" : (sf.code || sf.content || "");
      const ext = filePath.includes(".") ? filePath.split(".").pop()?.toLowerCase() || "txt" : "txt";
      const language = sf.language || langMap[ext] || "python";
      results.push({
        id: sf.id || `sol-${idx}`,
        approach: sf.approach || filePath,
        title: sf.title || filePath,
        filePath,
        file_path: filePath,
        language,
        code,
        complexity_analysis: sf.complexity_analysis || "",
      });
    });
  }
  // 2. ticket.solution (Dict or String)
  else if (ticket.solution) {
    if (typeof ticket.solution === "object" && !Array.isArray(ticket.solution)) {
      // Check if ticket.solution is { solutions: [...] }
      if (Array.isArray(ticket.solution.solutions)) {
        ticket.solution.solutions.forEach((s: any, idx: number) => {
          const filePath = s.filePath || s.file_path || ticket.target_file || ticket.starter_path || "";
          const ext = filePath.includes(".") ? filePath.split(".").pop()?.toLowerCase() || "txt" : "txt";
          const language = s.language || langMap[ext] || "python";
          results.push({
            id: s.id || `sol-${idx}`,
            approach: s.approach || "optimal",
            title: s.title || (filePath ? filePath : (s.language ? s.language.toUpperCase() : `Solution ${idx + 1}`)),
            filePath,
            file_path: filePath,
            language,
            code: s.code || "",
            complexity_analysis: s.complexity_analysis || "",
          });
        });
      } else {
        Object.entries(ticket.solution).forEach(([filePath, code]: [string, any], idx: number) => {
          if (typeof code === "string") {
            const ext = filePath.includes(".") ? filePath.split(".").pop()?.toLowerCase() || "txt" : "txt";
            const language = langMap[ext] || "python";
            results.push({
              id: `sol-${idx}`,
              approach: filePath,
              title: filePath,
              filePath,
              file_path: filePath,
              language,
              code,
              complexity_analysis: "",
            });
          } else if (typeof code === "object" && code !== null && (code as any).code) {
            const ext = filePath.includes(".") ? filePath.split(".").pop()?.toLowerCase() || "txt" : "txt";
            const language = (code as any).language || langMap[ext] || "python";
            results.push({
              id: (code as any).id || `sol-${idx}`,
              approach: (code as any).approach || filePath,
              title: (code as any).title || filePath,
              filePath: (code as any).filePath || (code as any).file_path || filePath,
              file_path: (code as any).filePath || (code as any).file_path || filePath,
              language,
              code: (code as any).code || "",
              complexity_analysis: (code as any).complexity_analysis || "",
            });
          }
        });
      }
    } else if (typeof ticket.solution === "string" && ticket.solution.trim()) {
      const targetFile = ticket.target_file || ticket.targeted_file || ticket.starter_path || ticket.starterPath || ticket.scoring_rules?.starter_path || "";
      const ext = targetFile.includes(".") ? targetFile.split(".").pop()?.toLowerCase() || "txt" : "py";
      results.push({
        id: "sol-0",
        approach: targetFile || "solution",
        title: targetFile || "Solution",
        filePath: targetFile,
        file_path: targetFile,
        language: langMap[ext] || "python",
        code: ticket.solution,
        complexity_analysis: "",
      });
    }
  }

  // 3. ticket.solutions (DSA-style array)
  if (results.length === 0 && Array.isArray(ticket.solutions) && ticket.solutions.length > 0) {
    ticket.solutions.forEach((s: any, idx: number) => {
      const filePath = s.filePath || s.file_path || ticket.target_file || ticket.starter_path || "";
      const ext = filePath.includes(".") ? filePath.split(".").pop()?.toLowerCase() || "txt" : "txt";
      const language = s.language || langMap[ext] || "python";
      const isFile = filePath && (filePath.includes(".") || filePath.includes("/"));
      results.push({
        id: s.id || `sol-${idx}`,
        approach: isFile && (s.approach === "optimal" || !s.approach) ? filePath : (s.approach || "optimal"),
        title: s.title || s.approach || (filePath ? filePath : (s.language ? s.language.toUpperCase() : `Solution ${idx + 1}`)),
        filePath,
        file_path: filePath,
        language,
        code: s.code || "",
        complexity_analysis: s.complexity_analysis || "",
      });
    });
  }

  // 4. ticket.tasks with solutions
  if (results.length === 0 && Array.isArray(ticket.tasks)) {
    ticket.tasks.forEach((task: any, idx: number) => {
      if (task.solution) {
        const title = task.title ? `Task ${idx + 1}: ${task.title}` : `Task ${idx + 1}`;
        const filePath = task.filePath || task.file_path || task.target_file || "";
        const ext = filePath.includes(".") ? filePath.split(".").pop()?.toLowerCase() || "txt" : "py";
        results.push({
          id: task.id || `task-${idx + 1}`,
          approach: `task_${idx + 1}`,
          title,
          filePath,
          file_path: filePath,
          language: langMap[ext] || "python",
          code: typeof task.solution === "string" ? task.solution : JSON.stringify(task.solution, null, 2),
          complexity_analysis: "",
        });
      }
    });
  }

  return results;
}

export function normalizeSolutions(raw: any, starterPath?: string): any[] {
  if (!raw) return [];
  return getSolutionsFromTicket({ solution: raw, starter_path: starterPath });
}

export function SolutionPanel({
  ticket,
  onLoadIntoEditor,
  onLoadAllIntoEditor,
  isPreview = false,
  initialSolutionRevealed = false,
}: {
  ticket: any;
  onLoadIntoEditor?: (code: string, language: string, filePath?: string) => void;
  onLoadAllIntoEditor?: (fileMap: Record<string, string>) => void;
  isPreview?: boolean;
  initialSolutionRevealed?: boolean;
}) {
  const normalizeSolutionItem = (s: any) => {
    const filePath = s.filePath || s.file_path || (s.title && s.title.includes(".") ? s.title : "");
    const isFile = filePath && (filePath.includes(".") || filePath.includes("/"));
    return {
      ...s,
      filePath: filePath || s.filePath || "",
      file_path: filePath || s.file_path || "",
      title: s.title || filePath || "Solution",
      approach: isFile && (s.approach === "optimal" || !s.approach) ? filePath : (s.approach || "optimal"),
    };
  };

  const previewSols: any[] = useMemo(() => {
    return getSolutionsFromTicket(ticket).map(normalizeSolutionItem);
  }, [ticket]);

  const [revealedSolution, setRevealedSolution] = useState(isPreview || initialSolutionRevealed);
  const [fetchedSolutions, setFetchedSolutions] = useState<any[]>(
    (isPreview || initialSolutionRevealed) ? previewSols : []
  );
  const [loading, setLoading] = useState(false);
  const [selectedApproach, setSelectedApproach] = useState<string>(previewSols[0]?.approach || "optimal");
  const [selectedId, setSelectedId] = useState<string>(previewSols[0]?.id || "");
  const [selectedLanguage, setSelectedLanguage] = useState<string>(previewSols[0]?.language || "");
  const [showWarningDialog, setShowWarningDialog] = useState(false);

  useEffect(() => {
    if (isPreview || initialSolutionRevealed) {
      const sols = getSolutionsFromTicket(ticket).map(normalizeSolutionItem);
      setRevealedSolution(true);
      if (sols.length > 0 && fetchedSolutions.length === 0) {
        setFetchedSolutions(sols);
        setSelectedApproach(sols[0].approach || "optimal");
        setSelectedId(sols[0].id || "");
        setSelectedLanguage(sols[0].language || "python");
      }
    }
  }, [ticket, isPreview, initialSolutionRevealed, fetchedSolutions.length]);

  useEffect(() => {
    if (fetchedSolutions.length > 0) {
      const firstApproach = fetchedSolutions[0]?.approach || "optimal";
      setSelectedApproach(prev => prev || firstApproach);
      const match = fetchedSolutions.find((s: any) => (s.approach || "optimal") === (selectedApproach || firstApproach));
      if (match) {
        setSelectedId(prev => prev || match.id);
        setSelectedLanguage(prev => prev || match.language);
      }
    }
  }, [fetchedSolutions, selectedApproach]);

  const handleRevealSolution = async () => {
    setLoading(true);
    try {
      const { default: api } = await import("@/utils/RestApiAuthUtil");
      const data: any = await api.post(`/lab/submissions/reveal-solution/`, { ticket_id: ticket.id });
      let sols: any[] = [];
      if (Array.isArray(data?.solutions) && data.solutions.length > 0) {
        sols = data.solutions.map((s: any, idx: number) => {
          const filePath = s.filePath || s.file_path || "";
          return {
            ...s,
            id: s.id || `sol-${idx}`,
            filePath,
            file_path: filePath,
            approach: (s.approach && s.approach !== "optimal") ? s.approach : (filePath || s.title || s.approach || `solution_${idx + 1}`),
          };
        });
      } else if (data?.solution || data?.raw_solution) {
        sols = getSolutionsFromTicket({ ...ticket, solution: data.solution || data.raw_solution });
      } else if (data) {
        sols = getSolutionsFromTicket({ ...ticket, solution: data });
      }
      let effectiveSols = sols;
      if (effectiveSols.length === 0) {
        effectiveSols = getSolutionsFromTicket(ticket);
      }
      const normalizedSols = effectiveSols.map(normalizeSolutionItem);
      setFetchedSolutions(normalizedSols);

      if (normalizedSols.length > 0) {
        const firstApproach = normalizedSols[0].approach || "optimal";
        setSelectedApproach(firstApproach);
        const match = normalizedSols.find((s: any) => (s.approach || "optimal") === firstApproach);
        if (match) {
          setSelectedId(match.id || "");
          setSelectedLanguage(match.language || "python");
        }
      }
      setRevealedSolution(true);
    } catch (err) {
      console.error("Failed to reveal solution", err);
      const fallback = getSolutionsFromTicket(ticket);
      if (fallback.length > 0) {
        setFetchedSolutions(fallback);
        setRevealedSolution(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const rawSolutions = isPreview ? (fetchedSolutions.length > 0 ? fetchedSolutions : previewSols) : fetchedSolutions;
  const effectiveSolutions = rawSolutions.map(normalizeSolutionItem);

  // Preview mode with no solutions on the ticket
  if (isPreview && effectiveSolutions.length === 0) {
    return (
      <div className="text-center py-8 w-full border rounded-md mt-4 border-editor-border bg-editor-panel">
        <Key className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <h4 className="text-sm font-medium text-foreground mb-1">No Solutions Added</h4>
        <p className="text-xs text-muted-foreground max-w-[250px] mx-auto">
          No solutions have been added to this question yet.
        </p>
      </div>
    );
  }

  if (!revealedSolution) {
    return (
      <div className="text-center py-8 w-full border rounded-md mt-4 border-editor-border bg-editor-panel">
        <Shield className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
        <h4 className="text-sm font-medium text-emerald-800 dark:text-emerald-400 mb-1">Need the answer?</h4>
        <p className="text-xs text-muted-foreground max-w-[250px] mx-auto mb-4">
          Viewing the solution will set your score for this ticket to 0.
        </p>
        <button
          onClick={() => setShowWarningDialog(true)}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-4 py-2 disabled:opacity-50"
        >
          <Key className="w-3.5 h-3.5 mr-1.5" />
          {loading ? "Revealing..." : "Reveal Solution"}
        </button>

        <ScorePenaltyWarningDialog
          open={showWarningDialog}
          onOpenChange={setShowWarningDialog}
          description={
            <>
              Are you sure you want to reveal the official solution?<br /><br />
              Viewing the solution will permanently result in a <strong>score of 0</strong> for this problem.
            </>
          }
          onAcknowledge={handleRevealSolution}
        />
      </div>
    );
  }

  if (effectiveSolutions.length === 0) {
    return <div className="text-sm text-muted-foreground mt-4">No predefined solutions available for this question.</div>;
  }

  const approaches = Array.from(new Set(effectiveSolutions.map((s: any) => s.approach || "optimal")));

  const getApproachLabel = (a: string) => {
    if (!a) return "Solution";
    if (a.includes("/") || a.includes(".")) return a;
    return a.split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  const solutionsForApproach = effectiveSolutions.filter((s: any) => (s.approach || "optimal") === selectedApproach);

  if (solutionsForApproach.length > 0 && !solutionsForApproach.find((s: any) => (selectedId && s.id === selectedId) || s.language === selectedLanguage)) {
    setSelectedId(solutionsForApproach[0].id || "");
    setSelectedLanguage(solutionsForApproach[0].language || "python");
  }

  const sol = solutionsForApproach.find((s: any) => (selectedId && s.id === selectedId)) ||
              solutionsForApproach.find((s: any) => s.language === selectedLanguage) ||
              solutionsForApproach[0];

  const fileMap: Record<string, string> = {};
  effectiveSolutions.forEach((s: any) => {
    const p = s.filePath || s.file_path || (s.title && s.title.includes(".") ? s.title : "");
    if (p && s.code) {
      fileMap[p] = s.code;
    }
  });
  const hasMultipleFiles = Object.keys(fileMap).length > 1;

  const distinctLanguages = Array.from(new Set(solutionsForApproach.map((s: any) => s.language).filter(Boolean)));
  const currentFilePath = sol?.filePath || sol?.file_path || (sol?.title && sol.title.includes(".") ? sol.title : "");

  return (
    <div className="w-full space-y-4 text-xs">
      {approaches.length > 1 && (
        <div className="flex border-b border-border overflow-x-auto hide-scrollbar">
          {approaches.map((approach: any) => (
            <button
              key={approach}
              onClick={() => {
                setSelectedApproach(approach);
                const nextMatch = effectiveSolutions.find((s: any) => (s.approach || "optimal") === approach);
                if (nextMatch) {
                  setSelectedId(nextMatch.id || "");
                  setSelectedLanguage(nextMatch.language || "python");
                }
              }}
              className={`px-4 py-2 font-medium whitespace-nowrap border-b-2 transition-colors ${
                selectedApproach === approach
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {getApproachLabel(approach)}
            </button>
          ))}
        </div>
      )}

      {solutionsForApproach.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {solutionsForApproach.map((s: any) => (
            <button
              key={s.id || s.filePath || s.file_path || s.language}
              onClick={() => {
                if (s.id) setSelectedId(s.id);
                if (s.language) setSelectedLanguage(s.language);
              }}
              className={`px-3 py-1.5 rounded-full font-medium transition-colors border ${
                (sol && (sol.id === s.id || (sol.filePath && sol.filePath === s.filePath) || sol.language === s.language))
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-editor-bg text-muted-foreground border-border hover:border-muted-foreground/30"
              }`}
            >
              {s.title || (s.filePath || s.file_path) || s.language?.toUpperCase() || "SOLUTION"}
            </button>
          ))}
        </div>
      )}

      {sol && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-semibold text-muted-foreground font-mono text-[12px] truncate max-w-[280px]" title={currentFilePath || sol.title}>
              {currentFilePath || sol.title}
            </span>
            <div className="flex items-center gap-2">
              {hasMultipleFiles && onLoadAllIntoEditor && (
                <button
                  onClick={() => onLoadAllIntoEditor(fileMap)}
                  className="inline-flex h-7 items-center justify-center rounded px-2.5 text-[11px] font-medium border border-border bg-background hover:bg-accent text-foreground transition-colors"
                  title="Load all solution files into the editor"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Load All Files
                </button>
              )}
              {onLoadIntoEditor && (
                <button
                  onClick={() => onLoadIntoEditor(sol.code, sol.language, currentFilePath)}
                  className="inline-flex h-7 items-center justify-center rounded px-3 text-[11px] font-medium bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
                  title={`Load ${currentFilePath || "this solution"} into editor`}
                >
                  <Download className="w-3 h-3 mr-1.5" />
                  Load into Editor
                </button>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden bg-editor-bg">
            <div className="p-3 overflow-auto max-h-80 custom-scrollbar">
              <pre className="font-mono text-[11px] text-foreground whitespace-pre-wrap"><code>{sol.code}</code></pre>
            </div>
          </div>

          {sol.complexity_analysis && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/20 px-4 py-3">
              <p className="font-bold text-amber-700 dark:text-amber-400 mb-1.5">Complexity Analysis</p>
              <p className="text-amber-900 dark:text-amber-300 leading-relaxed">{sol.complexity_analysis}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function parseAgentResponse(content: string, activeFile?: string) {
  const codeBlockRegex = /```(?:[a-zA-Z0-9_-]+)?\s*([\s\S]*?)```/g;
  const matches = [...content.matchAll(codeBlockRegex)];

  // Filter out code blocks that are just the file name (e.g. ```text\nmain.py\n```)
  const validBlocks = matches
    .map((m) => m[1]?.trim())
    .filter((c) => c && c !== activeFile && !c.endsWith(".py") && c.length > 5);

  const mainCode =
    validBlocks.length > 0
      ? validBlocks[validBlocks.length - 1]
      : matches.length > 0
      ? matches[matches.length - 1][1]?.trim()
      : "";

  let explanation = content.replace(codeBlockRegex, "").trim();
  
  // Clean up greetings, conversational fluff, and markdown headers
  explanation = explanation
    .replace(/^#+\s+.*$/gm, "")
    .replace(/^Hello\s+[^,!\n]+[,!]\s*/i, "")
    .replace(/^Hi\s+[^,!\n]+[,!]\s*/i, "")
    .replace(/^Okay,?\s+[^,!\n]+[,!]\s*/i, "")
    .replace(/^Sure,?\s+[^,!\n]+[,!]\s*/i, "")
    .replace(/^Certainly,?\s+[^,!\n]+[,!]\s*/i, "")
    .replace(/Here'?s the code you'?ll need for.*$/im, "")
    .replace(/Here is the (?:solution|code).*$/im, "")
    .trim();

  if (!explanation) {
    explanation = `Updated ${activeFile || "file"} with the required code.`;
  }

  return { mainCode, explanation, hasCode: !!mainCode };
}

function AgentChangeCard({
  fileName,
  explanation,
  code,
  onReapply,
}: {
  fileName: string;
  explanation: string;
  code: string;
  onReapply?: () => void;
}) {
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card/70 backdrop-blur-xs p-3 text-left space-y-2.5 my-1.5 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
            <Check className="w-3 h-3" />
          </div>
          <span className="text-[12px] font-semibold text-foreground flex items-center gap-1.5 font-mono">
            <FileCode2 className="w-3.5 h-3.5 text-muted-foreground" />
            {fileName}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          Updated
        </span>
      </div>

      <div className="text-[12px] text-muted-foreground leading-relaxed pl-0.5">
        {explanation}
      </div>

      {code && (
        <div className="pt-0.5 border-t border-border/40">
          <div className="flex items-center justify-between text-[11px] pt-1.5">
            <button
              type="button"
              onClick={() => setShowCode(!showCode)}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium transition-colors"
            >
              <ChevronRight className={`w-3 h-3 transition-transform duration-150 ${showCode ? "rotate-90" : ""}`} />
              {showCode ? "Hide code" : "View code"}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>

          {showCode && (
            <div className="mt-2 rounded-lg border border-border/50 bg-[#18181b] p-2.5 overflow-x-auto custom-scrollbar max-h-56">
              <pre className="font-mono text-[11px] leading-relaxed text-zinc-200 whitespace-pre">
                <code>{code}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MentorCodeBlock({
  code,
  language,
  activeFile,
  onApplyCode,
  isAgentMode,
}: {
  code: string;
  language: string;
  activeFile?: string;
  onApplyCode?: (code: string) => void;
  isAgentMode?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  // If it's just the filename or tiny snippet, render as clean inline code
  if (!code.trim() || code.trim() === activeFile || (code.trim().endsWith(".py") && code.trim().length < 20)) {
    return (
      <code className="bg-muted/80 px-1.5 py-0.5 rounded font-mono text-[11px] text-primary">
        {code}
      </code>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (onApplyCode) {
      onApplyCode(code);
      setApplied(true);
      setTimeout(() => setApplied(false), 2000);
    }
  };

  const targetLabel = activeFile ? `Apply to ${activeFile}` : "Apply";

  return (
    <div className="relative group/code rounded-lg overflow-hidden my-2 border border-border/70 bg-[#18181b] dark:bg-[#121214] shadow-xs text-left font-sans">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#222226] dark:bg-[#1a1a1e] border-b border-border/40 text-[11px] select-none">
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
            {language || "code"}
          </span>
          {isAgentMode && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Zap className="w-2.5 h-2.5" /> Auto-Applied
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            type="button"
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 text-[10px]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span className="text-[10px]">Copy</span>
              </>
            )}
          </button>
          {onApplyCode && !isAgentMode && (
            <button
              onClick={handleApply}
              type="button"
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[10.5px] font-medium transition-all shadow-xs ${
                applied
                  ? "bg-emerald-600 text-white"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }`}
              title={targetLabel}
            >
              {applied ? (
                <>
                  <Check className="w-3 h-3" />
                  <span className="text-[10px]">Applied ✓</span>
                </>
              ) : (
                <>
                  <Download className="w-3 h-3" />
                  <span className="text-[10px]">{targetLabel}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
      <div className="p-3 overflow-x-auto custom-scrollbar max-h-[300px]">
        <pre className="font-mono text-[11.5px] leading-relaxed text-zinc-100 whitespace-pre">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

function SideMentor({
  contextGetter,
  chatTitle,
  persistenceKey,
  activeFile,
  onApplyCode,
}: {
  contextGetter: () => string;
  chatTitle?: string;
  persistenceKey?: string;
  activeFile?: string;
  onApplyCode?: (code: string) => void;
}) {
  const [mentorMode, setMentorMode] = useState<"chat" | "agent">("chat");
  const autoAppliedRef = useRef<Set<string>>(new Set());

  const dynamicContextGetter = useCallback(() => {
    const baseContext = contextGetter ? contextGetter() : "";
    if (mentorMode === "agent") {
      return `${baseContext}\n\n[MODE: AGENT]\nYou are operating in AGENT mode. When writing or editing code for ${activeFile || 'the active file'}:
1. Start with a very concise 1-2 sentence description of what was changed.
2. Provide the complete updated code inside a single code block (\`\`\`<language> ... \`\`\`).
Do NOT output extra code blocks for file names or extra boilerplate. The code will be directly applied to ${activeFile || 'the active file'}.`;
    }
    return `${baseContext}\n\n[MODE: CHAT]\nYou are operating in CHAT mentor mode. Give Socratic hints, explanations, and guidance step-by-step.`;
  }, [contextGetter, mentorMode, activeFile]);

  const { messages, isLoading, sendMessage, suggestedPrompts, activeStream, startNewChat, sessionHistory, fetchHistory, loadSession } = useAIChat({
    getContext: dynamicContextGetter,
    chatTitle,
    persistenceKey,
  });
  const [input, setInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeStream]);

  // In Agent mode, automatically apply code from the latest assistant message
  useEffect(() => {
    if (mentorMode !== "agent" || !onApplyCode || isLoading) return;

    const assistantMessages = messages.filter((m) => m.message_type === "assistant");
    const latestAssistant = assistantMessages[assistantMessages.length - 1];
    if (!latestAssistant || !latestAssistant.content) return;
    if (autoAppliedRef.current.has(latestAssistant.id)) return;

    const { mainCode, hasCode } = parseAgentResponse(latestAssistant.content, activeFile);
    if (hasCode && mainCode) {
      autoAppliedRef.current.add(latestAssistant.id);
      onApplyCode(mainCode);
    }
  }, [messages, isLoading, mentorMode, onApplyCode, activeFile]);

  const send = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-2 p-3 bg-editor-panel text-foreground w-full overflow-hidden">
      <div className="flex justify-between items-center shrink-0 pb-1.5 border-b border-border/40 gap-2">
        {/* Mode switcher: Chat vs Agent */}
        <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-lg border border-border/50">
          <button
            type="button"
            onClick={() => setMentorMode("chat")}
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all ${
              mentorMode === "chat"
                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="w-3 h-3" />
            Chat
          </button>
          <button
            type="button"
            onClick={() => setMentorMode("agent")}
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all ${
              mentorMode === "agent"
                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Agent mode: Automatically updates the active file when code is generated"
          >
            <Zap className={`w-3 h-3 ${mentorMode === "agent" ? "text-amber-300" : ""}`} />
            Agent
          </button>
        </div>

        <div className="flex items-center gap-2">
          <WalletBalanceBadge />
          <button
            onClick={() => {
              if (!showHistory) fetchHistory();
              setShowHistory(!showHistory);
            }}
            className={`text-[11px] flex items-center transition-colors ${showHistory ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Clock className="w-3 h-3 mr-1" /> History
          </button>
          <button
            onClick={() => {
              setShowHistory(false);
              startNewChat();
            }}
            className="text-[11px] flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-3 h-3 mr-1" /> New Chat
          </button>
        </div>
      </div>

      {showHistory ? (
        <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin mt-2">
          <div className="text-xs font-semibold text-muted-foreground mb-3">Previous Chats</div>
          {sessionHistory.length === 0 ? (
            <div className="text-xs text-muted-foreground italic">No past chats found.</div>
          ) : (
            sessionHistory.map((session: any) => (
              <button
                key={session.id}
                onClick={() => {
                  loadSession(session.id);
                  setShowHistory(false);
                }}
                className="w-full text-left p-2.5 rounded-md border border-border/50 hover:bg-accent hover:border-border transition-colors group"
              >
                <div className="text-[12px] font-medium text-foreground truncate">{session.title || 'AI Mentor Chat'}</div>
                <div className="text-[10px] text-muted-foreground mt-1.5 flex justify-between items-center">
                  <span>{new Date(session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="bg-background px-1.5 py-0.5 rounded border border-border/50">{session.message_count || 0} msgs</span>
                </div>
              </button>
            ))
          )}
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden pr-2 scrollbar-thin">
            {messages.length === 0 && !activeStream && (
              <div className="flex">
                <div className="max-w-[90%] rounded-md px-3 py-2 text-[13px] bg-accent text-foreground">
                  {mentorMode === "agent"
                    ? `⚡ Agent Mode active. Tell me what changes or code to write for ${activeFile || 'your file'}, and I will directly update it!`
                    : "Hi! I'm your AI mentor. I can give Socratic hints — what are you stuck on?"}
                </div>
              </div>
            )}
            {messages.map((m, i) => {
              const isStreaming = !!(activeStream && activeStream.id === m.id);
              const displayContent = isStreaming ? `${activeStream!.content}` : m.content;

              if (m.message_type === "assistant" && mentorMode === "agent" && !isStreaming) {
                const { mainCode, explanation, hasCode } = parseAgentResponse(displayContent, activeFile);
                if (hasCode) {
                  return (
                    <div key={i} className="flex">
                      <div className="w-full">
                        <AgentChangeCard
                          fileName={activeFile || "main.py"}
                          explanation={explanation}
                          code={mainCode}
                          onReapply={() => onApplyCode && onApplyCode(mainCode)}
                        />
                      </div>
                    </div>
                  );
                }
              }

              return (
                <div key={i} className={`flex ${m.message_type === "user" ? "justify-end" : ""}`}>
                  <div
                    className={`max-w-[95%] rounded-md px-3 py-2 text-[13px] ${m.message_type === "user" ? "bg-primary text-primary-foreground" : "bg-accent text-foreground"} overflow-hidden`}
                  >
                    {m.message_type === "user" ? (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-full break-words [&>p]:mb-2 [&>p]:last:mb-0 [&>ul]:my-2 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:my-2 [&>ol]:list-decimal [&>ol]:pl-4">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({ node, inline, className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || "");
                              const codeString = String(children).replace(/\n$/, "");
                              if (inline) {
                                return (
                                  <code className="bg-background/80 px-1.5 py-0.5 rounded font-mono text-[11px] text-primary" {...props}>
                                    {children}
                                  </code>
                                );
                              }
                              return (
                                <MentorCodeBlock
                                  code={codeString}
                                  language={match?.[1] || "text"}
                                  activeFile={activeFile}
                                  onApplyCode={onApplyCode}
                                  isAgentMode={mentorMode === "agent"}
                                />
                              );
                            },
                          }}
                        >
                          {displayContent}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {isLoading && (!messages.length || messages[messages.length - 1].message_type !== "assistant") && (
              <div className="flex">
                <div className="max-w-[90%] rounded-md px-3 py-2 text-[13px] bg-accent text-foreground animate-pulse">
                  {mentorMode === "agent" ? "Agent is coding..." : "Thinking..."}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {suggestedPrompts.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {suggestedPrompts.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    if (!isLoading) {
                      sendMessage(s);
                    }
                  }}
                  disabled={isLoading}
                  className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent disabled:opacity-50 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          
          <div className="flex gap-2 pt-1 shrink-0">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              disabled={isLoading}
              placeholder={
                mentorMode === "agent"
                  ? `Instruct Agent to update ${activeFile || 'file'}...`
                  : "Ask AI mentor..."
              }
              className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary disabled:opacity-50 transition-colors min-w-0"
            />
            <button 
              onClick={send} 
              disabled={isLoading || !input.trim()} 
              className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors shrink-0 flex items-center gap-1 ${
                mentorMode === "agent"
                  ? "bg-amber-600 hover:bg-amber-500 text-white"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              } disabled:opacity-50`}
            >
              {mentorMode === "agent" ? (
                <>
                  <Zap className="w-3 h-3" />
                  Run
                </>
              ) : (
                "Ask"
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
