export const STARTER_MAIN = `public class Main {
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
export type FileName = string;

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

export type KitName =
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
export interface Kit {
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

export function getKit(slug: string, tag: string, isAlgo?: boolean): Kit {
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

export type TestResult = { name: string; pass: boolean; time: string; expected?: string; got?: string; is_hidden?: boolean };
export type BottomTab = "output" | "errors" | "tests" | "quality" | "preview" | "terminal" | "uidiff" | "testcases";

