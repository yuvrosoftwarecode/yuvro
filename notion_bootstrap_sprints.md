# 🟪 YLabs Bootstrap 5 Curriculum & Evaluation Guide

This document serves as the master guide for the YLabs Bootstrap 5 Learning Track. It details exactly what students will build in each sprint, what specific concepts they will learn, and precisely how our proprietary grading engine evaluates their work.

---

## 📋 Notion Copy-Paste Instructions
To import this planning page into Notion:
1. Click the raw contents of this file and copy it (`Ctrl + A`, then `Ctrl + C`).
2. Open your Notion workspace and create a new page.
3. Paste the contents directly (`Ctrl + V`). Notion will automatically parse headers, tables, code blocks, lists, and check-boxes!

---

## 🎯 Hybrid Grading Engine: The Inner Workings

To ensure students are not just building functional apps, but building them using best practices, our engine employs a dual-channel grading system for every ticket:

### 1. Visual Score (SSIM Algorithm)
The platform natively renders the student's HTML code in an isolated iframe. It then takes a headless screenshot of this iframe and compares it against our hidden **Target Design**.
- **Algorithm**: We use the Structural Similarity Index (SSIM) algorithm via a Python OpenCV backend.
- **Goal**: This forces students to pay close attention to colors, padding, margins, and typography. A mismatch in layout reduces the visual score.

### 2. Logic Score (Regex AST Pattern Matching)
Visuals aren't enough—students must use the correct Bootstrap classes. We use Regex pattern matching on their raw `.html` source files to detect the presence of required utility and component classes.
- **Example**: If a ticket asks for a grid, the grading engine scans the code specifically for `/row/` and `/col-/`. If missing, the Logic Score drops drastically.
- **Combined Output**: The Final Grade is a composite of `(Visual Score + Logic Score) / 2`.

---

## 🪙 Scoring System
Every task is scored across 3 dimensions (total = 100 pts per task):
* **[A] Visual Accuracy Score (40 pts)**: SSIM match percentage with the target design.
* **[B] Logic & Class Score (40 pts)**: Presence of required Bootstrap classes in the HTML structure.
* **[C] Accessibility & Semantic Quality (10 pts)**: Proper use of `aria-` labels, alt tags, and semantic tags.
* **[D] Speed Bonus (10 pts)**: Completed before the sprint deadline.

---

# 🏁 Bootstrap 5 Sprint Tracks

## 🏃‍♂️ Sprint 1: Grid System & Typography
**Duration**: 1 week | **XP Pool**: 450 XP
**Goal**: Master the core 12-column grid and standard text utilities.

### Ticket 1.1 — Basic 12-Column Grid [150 XP]

#### Task 1.1.1 — Equal Width Columns
* **Points**: 70 | **Method**: Visual & Logic Grader
* **Context**: `index.html` starter file.
* **What the user does**:
  - Builds a 3-column layout where each column takes up exactly one-third of the container space on all screen sizes.
  - **Solution Code**:
    ```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>UI Lab</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
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
    
      <div class="container mt-5">
                        <div class="row g-4">
              <div class="col">
                <div class="border p-3 text-center">Column 1</div>
              </div>
              <div class="col">
                <div class="border p-3 text-center">Column 2</div>
              </div>
              <div class="col">
                <div class="border p-3 text-center">Column 3</div>
              </div>
            </div>
          </div>
    
      <script src="app.js"></script>
    </body>
    </html>
    ```
  * **Learning Objectives**: Master the 12-column grid system., Implement responsive layout breakpoints.
  * **Difficulty**: EASY
  * **Time Limit**: 30 minutes
  * **Hints**: Remember that Bootstrap uses a 12-column grid system., Make sure columns are wrapped inside a .row class.
  * **Common Mistakes**: Forgetting to wrap .col elements in a .container and .row., Using col-12 on desktop instead of a specific breakpoint like col-md-4.
* **How the system evaluates**:
  - `check_class_used("container")`
  - `check_class_used("row")`
  - `check_class_used("col")`
* **Auto-scoring**:
  - **[A] Visual (40 pts)**: 40 pts if layout splits into 3 equal parts.
  - **[B] Logic (40 pts)**: 40 pts for using exactly three `.col` classes inside a `.row`.
  - **[C] Quality (10 pts)**: 10 pts for clean semantic div nesting.

#### Task 1.1.2 — Responsive Grid Breakpoints
* **Points**: 80 | **Method**: Visual & Logic Grader
* **Context**: `index.html` starter file.
* **What the user does**:
  - Creates a product gallery that displays 1 item per row on mobile, 2 on tablets, and 4 on desktops.
  - **Solution Code**:
    ```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>UI Lab</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
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
    
      <div class="container">
            <div class="row">
              <div class="col-12 col-md-6 col-lg-3 mb-4">Product 1</div>
              <div class="col-12 col-md-6 col-lg-3 mb-4">Product 2</div>
              <div class="col-12 col-md-6 col-lg-3 mb-4">Product 3</div>
              <div class="col-12 col-md-6 col-lg-3 mb-4">Product 4</div>
            </div>
          </div>
    
      <script src="app.js"></script>
    </body>
    </html>
    ```
  * **Learning Objectives**: Apply Bootstrap utility classes correctly., Build components without relying on custom CSS.
  * **Difficulty**: EASY
  * **Time Limit**: 30 minutes
  * **Hints**: Make sure you are using exact Bootstrap utility classes instead of inline styles., Use browser developer tools to inspect elements.
  * **Common Mistakes**: Writing custom CSS for things Bootstrap utilities can already do (e.g. margin, padding).
* **How the system evaluates**:
  - `check_class_used("col-12")`
  - `check_class_used("col-md-6")`
  - `check_class_used("col-lg-3")`
* **Auto-scoring**:
  - **[A] Visual (40 pts)**: 40 pts if headless browser resizing triggers correct stacking.
  - **[B] Logic (40 pts)**: 40 pts for correct breakpoint syntax.
  - **[C] Quality (10 pts)**: 10 pts for consistent margin bottoms (`mb-4`).

---

#### Task 1.1.3 — Typography & Buttons
* **Points**: 70 | **Method**: Visual & Logic Grader
* **Context**: `index.html` starter file.
* **What the user does**:
  - Builds a simple hero section using Bootstrap typography classes (`display-4`, `lead`) and styled buttons (`btn`, `btn-primary`).
  - **Solution Code**:
    ```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>UI Lab</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
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
    
      <div class="container mt-5 text-center">
            <h1 class="display-4">Welcome to Acme</h1>
            <p class="lead text-muted">The best way to build your UI fast.</p>
            <button class="btn btn-primary btn-lg mt-3">Get Started</button>
            <button class="btn btn-outline-secondary btn-lg mt-3 ms-2">Learn More</button>
          </div>
    
      <script src="app.js"></script>
    </body>
    </html>
    ```
  * **Learning Objectives**: Apply Bootstrap utility classes correctly., Build components without relying on custom CSS.
  * **Difficulty**: EASY
  * **Time Limit**: 30 minutes
  * **Hints**: Make sure you are using exact Bootstrap utility classes instead of inline styles., Use browser developer tools to inspect elements.
  * **Common Mistakes**: Writing custom CSS for things Bootstrap utilities can already do (e.g. margin, padding).
* **How the system evaluates**:
  - `check_class_used("display-4")`
  - `check_class_used("lead")`
  - `check_class_used("btn-primary")`
* **Auto-scoring**:
  - **[A] Visual (40 pts)**: 40 pts if text sizing and button colors match perfectly.
  - **[B] Logic (40 pts)**: 40 pts for using standard typography and button classes.
  - **[C] Quality (10 pts)**: 10 pts for correct margin/padding utilities.

---

## 🏃‍♂️ Sprint 2: Components & Forms
**Duration**: 1 week | **XP Pool**: 500 XP
**Goal**: Build complex interactive UIs using pre-styled Bootstrap components.

### Ticket 2.1 — Navigation & Cards [250 XP]

#### Task 2.1.1 — Responsive Navbar
* **Points**: 100 | **Method**: Visual & Logic Grader
* **Context**: `header.html` file.
* **What the user does**:
  - Builds a dark-themed responsive navbar with a hamburger menu for mobile screens and a dropdown menu item.
  - **Solution Code**:
    ```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>UI Lab</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
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
    
      <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
            <div class="container-fluid">
              <a class="navbar-brand" href="#">ApexBank</a>
              <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
              </button>
              <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav">
                  <li class="nav-item">
                    <a class="nav-link active" href="#">Home</a>
                  </li>
                  <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                      Services
                    </a>
                    <ul class="dropdown-menu">
                      <li><a class="dropdown-item" href="#">Loans</a></li>
                      <li><a class="dropdown-item" href="#">Credit Cards</a></li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>
          </nav>
    
      <script src="app.js"></script>
    </body>
    </html>
    ```
  * **Learning Objectives**: Apply Bootstrap utility classes correctly., Build components without relying on custom CSS.
  * **Difficulty**: MEDIUM
  * **Time Limit**: 30 minutes
  * **Hints**: Check the Bootstrap documentation for navbar-expand classes to handle mobile collapsing.
  * **Common Mistakes**: Forgetting the data-bs-toggle attributes for the hamburger menu.
* **How the system evaluates**:
  - `check_class_used("navbar-expand-lg")`
  - `check_attribute_used("data-bs-toggle", "collapse")`
  - `check_class_used("dropdown-menu")`
* **Auto-scoring**:
  - **[A] Visual (40 pts)**: 40 pts if mobile menu collapses correctly.
  - **[B] Logic (40 pts)**: 40 pts for correct `data-bs-*` attributes linking toggler to collapse div.
  - **[C] Quality (10 pts)**: 10 pts for aria roles on dropdowns.

#### Task 2.1.2 — Profile Cards
* **Points**: 80 | **Method**: Visual & Logic Grader
* **Context**: User profile dashboard.
* **What the user does**:
  - Uses the `card` component to build a user profile display with a header image, body text, and a footer with a primary button.
  - **Solution Code**:
    ```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>UI Lab</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
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
    
      <div class="card" style="width: 18rem;">
            <img src="..." class="card-img-top" alt="User Avatar">
            <div class="card-body">
              <h5 class="card-title">Jane Doe</h5>
              <p class="card-text">Senior Software Engineer</p>
            </div>
            <div class="card-footer text-muted text-center">
              <a href="#" class="btn btn-primary w-100">View Profile</a>
            </div>
          </div>
    
      <script src="app.js"></script>
    </body>
    </html>
    ```
  * **Learning Objectives**: Apply Bootstrap utility classes correctly., Build components without relying on custom CSS.
  * **Difficulty**: MEDIUM
  * **Time Limit**: 30 minutes
  * **Hints**: Make sure you are using exact Bootstrap utility classes instead of inline styles., Use browser developer tools to inspect elements.
  * **Common Mistakes**: Writing custom CSS for things Bootstrap utilities can already do (e.g. margin, padding).
* **How the system evaluates**:
  - `check_class_used("card-body")`
  - `check_class_used("btn-primary")`
  - `check_class_used("w-100")`
* **Auto-scoring**:
  - **[A] Visual (40 pts)**: 40 pts for exact border radius and padding matching.
  - **[B] Logic (40 pts)**: 40 pts for `card-img-top`, `card-body`, and `card-footer` usage.
  - **[C] Quality (10 pts)**: 10 pts for `alt` tags on images.

---

#### Task 2.1.3 — Forms & Validation
* **Points**: 90 | **Method**: Visual & Logic Grader
* **Context**: `index.html` starter file.
* **What the user does**:
  - Builds a login form with a floating label for email, a password field, and a submit button.
  - **Solution Code**:
    ```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>UI Lab</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
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
    
      <div class="container mt-5" style="max-width: 400px;">
            <form>
              <div class="form-floating mb-3">
                <input type="email" class="form-control" id="floatingInput" placeholder="name@example.com">
                <label for="floatingInput">Email address</label>
              </div>
              <div class="form-floating mb-3">
                <input type="password" class="form-control" id="floatingPassword" placeholder="Password">
                <label for="floatingPassword">Password</label>
              </div>
              <button type="submit" class="btn btn-primary w-100">Sign In</button>
            </form>
          </div>
    
      <script src="app.js"></script>
    </body>
    </html>
    ```
  * **Learning Objectives**: Apply Bootstrap utility classes correctly., Build components without relying on custom CSS.
  * **Difficulty**: MEDIUM
  * **Time Limit**: 30 minutes
  * **Hints**: Make sure you are using exact Bootstrap utility classes instead of inline styles., Use browser developer tools to inspect elements.
  * **Common Mistakes**: Writing custom CSS for things Bootstrap utilities can already do (e.g. margin, padding).
* **How the system evaluates**:
  - `check_class_used("form-floating")`
  - `check_class_used("form-control")`
  - `check_class_used("w-100")`
* **Auto-scoring**:
  - **[A] Visual (40 pts)**: 40 pts if form inputs match Bootstrap's floating style.
  - **[B] Logic (40 pts)**: 40 pts for using `form-control` and `form-floating`.
  - **[C] Quality (10 pts)**: 10 pts for valid semantic `<label>` elements linked to inputs.

---

## 🏃‍♂️ Sprint 3: Interactive JavaScript Components
**Duration**: 1 week | **XP Pool**: 450 XP
**Goal**: Utilize Bootstrap's JavaScript plugins without writing custom JS.

### Ticket 3.1 — Overlays & Notifications [250 XP]

#### Task 3.1.1 — Triggering Modals
* **Points**: 100 | **Method**: Logic Grader (Attribute scanning)
* **Context**: `checkout.html`.
* **What the user does**:
  - Wires up a "Confirm Purchase" button to open a centered Modal dialog via data attributes.
  - **Solution Code**:
    ```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>UI Lab</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
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
    
      <!-- Trigger Button -->
          <button type="button" class="btn btn-success" data-bs-toggle="modal" data-bs-target="#confirmModal">
            Checkout
          </button>
    
          <!-- Modal -->
          <div class="modal fade" id="confirmModal" tabindex="-1" aria-labelledby="modalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title" id="modalLabel">Confirm Purchase</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                  Are you sure you want to charge $99.00 to your card?
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                  <button type="button" class="btn btn-primary">Confirm</button>
                </div>
              </div>
            </div>
          </div>
    
      <script src="app.js"></script>
    </body>
    </html>
    ```
  * **Learning Objectives**: Apply Bootstrap utility classes correctly., Build components without relying on custom CSS.
  * **Difficulty**: MEDIUM
  * **Time Limit**: 30 minutes
  * **Hints**: Make sure you are using exact Bootstrap utility classes instead of inline styles., Use browser developer tools to inspect elements.
  * **Common Mistakes**: Writing custom CSS for things Bootstrap utilities can already do (e.g. margin, padding).
* **How the system evaluates**:
  - `check_attribute_used("data-bs-toggle", "modal")`
  - `check_attribute_match("data-bs-target", "#confirmModal")`
  - `check_class_used("modal-dialog-centered")`
* **Auto-scoring**:
  - **[A] Visual (40 pts)**: 40 pts if modal centering class is applied.
  - **[B] Logic (40 pts)**: 40 pts if target ID matches the modal ID exactly.
  - **[C] Quality (10 pts)**: 10 pts for `aria-labelledby` and `tabindex="-1"` accessibility tags.

#### Task 3.1.2 — Accordion FAQs
* **Points**: 80 | **Method**: Logic Grader
* **Context**: FAQ Section.
* **What the user does**:
  - Builds an accordion where only one item can be open at a time (using `data-bs-parent`).
  - **Solution Code**:
    ```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>UI Lab</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
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
    
      <div class="accordion" id="faqAccordion">
            <div class="accordion-item">
              <h2 class="accordion-header" id="headingOne">
                <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne" aria-expanded="true">
                  What is YLabs?
                </button>
              </h2>
              <div id="collapseOne" class="accordion-collapse collapse show" data-bs-parent="#faqAccordion">
                <div class="accordion-body">YLabs is an interactive learning platform.</div>
              </div>
            </div>
            <div class="accordion-item">
              <h2 class="accordion-header" id="headingTwo">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo" aria-expanded="false">
                  How do I get graded?
                </button>
              </h2>
              <div id="collapseTwo" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                <div class="accordion-body">Automatically via our grading engine.</div>
              </div>
            </div>
          </div>
    
      <script src="app.js"></script>
    </body>
    </html>
    ```
  * **Learning Objectives**: Apply Bootstrap utility classes correctly., Build components without relying on custom CSS.
  * **Difficulty**: MEDIUM
  * **Time Limit**: 30 minutes
  * **Hints**: Make sure you are using exact Bootstrap utility classes instead of inline styles., Use browser developer tools to inspect elements.
  * **Common Mistakes**: Writing custom CSS for things Bootstrap utilities can already do (e.g. margin, padding).
* **How the system evaluates**:
  - `check_attribute_used("data-bs-parent", "#faqAccordion")`
* **Auto-scoring**:
  - **[B] Logic (80 pts)**: 80 pts for properly linking `data-bs-parent` to ensure only one panel stays open.

---

## 🏃‍♂️ Sprint 4: Advanced Layouts & Customization
**Duration**: 1 week | **XP Pool**: 500 XP
**Goal**: Move beyond default Bootstrap styles by customizing variables and integrating with standard layouts.

### Ticket 4.1 — Admin Dashboard Architecture [250 XP]

#### Task 4.1.1 — Fixed Sidebar Layout
* **Points**: 120 | **Method**: Visual & Logic Grader
* **Context**: Admin Panel.
* **What the user does**:
  - Uses CSS flexbox utility classes (`d-flex`, `flex-column`, `vh-100`) to build a fixed sidebar next to a scrolling main content area.
  - **Solution Code**:
    ```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>UI Lab</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
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
    
      <div class="d-flex vh-100">
            <!-- Sidebar -->
            <div class="bg-dark text-white p-3 flex-shrink-0" style="width: 250px;">
              <h4>Admin Panel</h4>
              <ul class="nav nav-pills flex-column mb-auto mt-4">
                <li class="nav-item">
                  <a href="#" class="nav-link active">Dashboard</a>
                </li>
                <li>
                  <a href="#" class="nav-link text-white">Users</a>
                </li>
              </ul>
            </div>
            <!-- Main Content -->
            <div class="flex-grow-1 p-4 bg-light overflow-auto">
              <h1>Welcome Back</h1>
              <div class="row mt-4">
                 <!-- Cards go here -->
              </div>
            </div>
          </div>
    
      <script src="app.js"></script>
    </body>
    </html>
    ```
  * **Learning Objectives**: Master the 12-column grid system., Implement responsive layout breakpoints.
  * **Difficulty**: MEDIUM
  * **Time Limit**: 30 minutes
  * **Hints**: Remember that Bootstrap uses a 12-column grid system., Make sure columns are wrapped inside a .row class.
  * **Common Mistakes**: Forgetting to wrap .col elements in a .container and .row., Using col-12 on desktop instead of a specific breakpoint like col-md-4.
* **How the system evaluates**:
  - `check_class_used("vh-100")`
  - `check_class_used("flex-shrink-0")`
  - `check_class_used("flex-grow-1")`
* **Auto-scoring**:
  - **[A] Visual (40 pts)**: 40 pts if the sidebar spans 100% of the viewport height without scrolling the body.
  - **[B] Logic (40 pts)**: 40 pts for utilizing Bootstrap flex-grow/shrink utilities instead of custom CSS.
  - **[C] Quality (10 pts)**: 10 pts for `nav-pills` usage for sidebar links.

#### Task 4.1.2 — Sass Variable Override Simulation
* **Points**: 80 | **Method**: Logic Grader
* **Context**: `custom.scss` file.
* **What the user does**:
  - Writes Sass code to override the default primary color and border-radius before importing Bootstrap.
  - **Solution Code**:
    ```scss
    // 1. Override default variables
    $primary: #ff5722; // Deep Orange
    $border-radius: 0.75rem;

    // 2. Import Bootstrap
    @import "~bootstrap/scss/bootstrap";
    ```
  * **Learning Objectives**: Master the 12-column grid system., Implement responsive layout breakpoints.
  * **Difficulty**: MEDIUM
  * **Time Limit**: 30 minutes
  * **Hints**: Remember that Bootstrap uses a 12-column grid system., Make sure columns are wrapped inside a .row class.
  * **Common Mistakes**: Forgetting to wrap .col elements in a .container and .row., Using col-12 on desktop instead of a specific breakpoint like col-md-4.
* **How the system evaluates**:
  - `check_regex_match(r"\$primary:\s*#[0-9a-fA-F]{3,6}")`
  - `check_regex_order(["$primary", "@import"])`
* **Auto-scoring**:
  - **[B] Logic (80 pts)**: 80 pts for declaring the override variables *before* the `@import` statement.
