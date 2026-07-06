# 🌊 YLabs Tailwind CSS Curriculum & Evaluation Guide

This document serves as the master guide for the YLabs Tailwind CSS Learning Track. It details exactly what students will build in each sprint, what specific concepts they will learn, and precisely how our proprietary grading engine evaluates their work.

---

## 📋 Notion Copy-Paste Instructions
To import this planning page into Notion:
1. Click the raw contents of this file and copy it (`Ctrl + A`, then `Ctrl + C`).
2. Open your Notion workspace and create a new page.
3. Paste the contents directly (`Ctrl + V`). Notion will automatically parse headers, tables, code blocks, lists, and check-boxes!

---

## 🎯 Hybrid Grading Engine: The Inner Workings

To ensure students are mastering the utility-first methodology, our engine employs a dual-channel grading system:

### 1. Visual Score (SSIM Algorithm)
The platform natively renders the student's output in an isolated iframe. It takes a headless screenshot of this iframe and compares it against our hidden **Target Design**.
- **Algorithm**: Structural Similarity Index (SSIM) algorithm via Python OpenCV.
- **Goal**: Forces precise adherence to spacing scales, font sizes, and color palettes. A mismatch in layout reduces the visual score.

### 2. Logic Score (Regex AST Pattern Matching)
Visuals aren't enough—students must use the correct Tailwind utilities instead of inline styles or custom CSS classes. We use Regex pattern matching on their HTML `class` attributes to detect the required utility classes.
- **Example**: If a ticket asks for Flexbox centering, the engine scans for `/flex/`, `/items-center/`, and `/justify-center/`.
- **Combined Output**: The Final Grade is a composite of `(Visual Score + Logic Score) / 2`.

---

## 🪙 Scoring System
Every task is scored across 3 dimensions (total = 100 pts per task):
* **[A] Visual Accuracy Score (40 pts)**: SSIM match percentage with the target design.
* **[B] Utility Usage Score (40 pts)**: Presence of required Tailwind classes and absence of `<style>` tags.
* **[C] Clean Code Quality (10 pts)**: Logical ordering of classes (e.g., standard Tailwind sorter order).
* **[D] Speed Bonus (10 pts)**: Completed before the sprint deadline.

---

# 🏁 Tailwind CSS Sprint Tracks

## 🏃‍♂️ Sprint 1: Utility-First Fundamentals & Layouts
**Duration**: 1 week | **XP Pool**: 450 XP
**Goal**: Break the habit of writing custom CSS by mastering Tailwind's core utility classes.

### Ticket 1.1 — The Box Model & Colors [150 XP]

#### Task 1.1.1 — Styling a Basic Card
* **Points**: 70 | **Method**: Visual & Logic Grader
* **Context**: `index.html` starter file.
* **What the user does**:
  - Builds a simple card with padding, rounded corners, a subtle shadow, and slate/blue colors.
  - **Solution Code**:
    ```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>UI Lab</title>
      <script src="https://cdn.tailwindcss.com"></script>
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
    
      <div class="max-w-sm rounded-lg overflow-hidden shadow-md bg-white p-6 m-4 border border-slate-200">
            <h2 class="text-xl font-bold text-slate-800 mb-2">Welcome to Tailwind</h2>
            <p class="text-slate-600 text-base">
              Utility-first CSS framework packed with classes like flex, pt-4, text-center and rotate-90 that can be composed to build any design, directly in your markup.
            </p>
          </div>
    
      <script src="app.js"></script>
    </body>
    </html>
    ```
  * **Learning Objectives**: Apply utility-first CSS styling concepts., Build pixel-perfect UI without custom CSS.
  * **Difficulty**: EASY
  * **Time Limit**: 30 minutes
  * **Hints**: Tailwind's grid system uses 'grid' and 'grid-cols-*' utilities., Use 'gap-*' to add spacing between grid items.
  * **Common Mistakes**: Using inline styles or a custom stylesheet instead of composing utility classes.
* **How the system evaluates**:
  - `check_class_used("rounded-lg")`
  - `check_class_used("shadow-md")`
  - `check_class_used("p-6")`
  - `check_no_inline_styles()`
* **Auto-scoring**:
  - **[A] Visual (40 pts)**: 40 pts if exact padding, border-radius, and font sizes match.
  - **[B] Logic (40 pts)**: 40 pts for strictly using Tailwind utility classes.
  - **[C] Quality (10 pts)**: 10 pts for avoiding the `style` attribute entirely.

#### Task 1.1.2 — Responsive Flexbox Navigation
* **Points**: 80 | **Method**: Visual & Logic Grader
* **Context**: `nav.html`.
* **What the user does**:
  - Creates a navigation bar that stacks links vertically on mobile, but uses flexbox to align them horizontally on medium (`md:`) screens and above.
  - **Solution Code**:
    ```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>UI Lab</title>
      <script src="https://cdn.tailwindcss.com"></script>
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
    
      <nav class="bg-indigo-600 p-4">
            <div class="flex flex-col md:flex-row md:justify-between md:items-center">
              <a href="#" class="text-white font-bold text-2xl mb-4 md:mb-0">BrandLogo</a>
              <div class="flex flex-col md:flex-row md:space-x-4 space-y-2 md:space-y-0">
                <a href="#" class="text-indigo-100 hover:text-white">Home</a>
                <a href="#" class="text-indigo-100 hover:text-white">Features</a>
                <a href="#" class="text-indigo-100 hover:text-white">Pricing</a>
              </div>
            </div>
          </nav>
    
      <script src="app.js"></script>
    </body>
    </html>
    ```
  * **Learning Objectives**: Understand Flexbox layout with Tailwind utilities.
  * **Difficulty**: EASY
  * **Time Limit**: 30 minutes
  * **Hints**: Use 'flex', 'justify-center', and 'items-center' to quickly center content.
  * **Common Mistakes**: Using inline styles or a custom stylesheet instead of composing utility classes.
* **How the system evaluates**:
  - `check_class_used("flex-col")`
  - `check_class_used("md:flex-row")`
  - `check_class_used("md:space-x-4")`
* **Auto-scoring**:
  - **[A] Visual (40 pts)**: 40 pts if navigation links flow horizontally above 768px.
  - **[B] Logic (40 pts)**: 40 pts for correctly utilizing responsive prefix `md:`.
  - **[C] Quality (10 pts)**: 10 pts for using `space-x/y` utilities instead of individual margins on items.

---

## 🏃‍♂️ Sprint 2: Interactivity, States & Dark Mode
**Duration**: 1 week | **XP Pool**: 450 XP
**Goal**: Manage component states (hover, focus, dark mode) using variant modifiers.

### Ticket 2.1 — Pseudo-classes & Theming [250 XP]

#### Task 2.1.1 — Interactive Form Controls
* **Points**: 120 | **Method**: Visual & Logic Grader
* **Context**: `login.html`.
* **What the user does**:
  - Styles an input field and button that react smoothly to user focus and hover interactions.
  - **Solution Code**:
    ```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>UI Lab</title>
      <script src="https://cdn.tailwindcss.com"></script>
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
    
      <form class="space-y-4 max-w-sm">
            <input 
              type="email" 
              placeholder="Email address" 
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
            >
            <button class="w-full bg-indigo-600 text-white font-semibold py-2 rounded-md hover:bg-indigo-700 active:bg-indigo-800 transition-colors duration-200">
              Sign In
            </button>
          </form>
    
      <script src="app.js"></script>
    </body>
    </html>
    ```
  * **Learning Objectives**: Apply utility-first CSS styling concepts., Build pixel-perfect UI without custom CSS.
  * **Difficulty**: MEDIUM
  * **Time Limit**: 30 minutes
  * **Hints**: Don't write custom CSS. Check the Tailwind documentation for the correct utility class.
  * **Common Mistakes**: Using inline styles or a custom stylesheet instead of composing utility classes.
* **How the system evaluates**:
  - `check_class_used("focus:ring-2")`
  - `check_class_used("hover:bg-indigo-700")`
  - `check_class_used("transition-colors")`
* **Auto-scoring**:
  - **[A] Visual (40 pts)**: 40 pts if the focus ring activates cleanly without layout shift.
  - **[B] Logic (40 pts)**: 40 pts for implementing `focus:`, `hover:`, and `active:` variants.
  - **[C] Quality (10 pts)**: 10 pts for adding `transition` classes for smooth state changes.

#### Task 2.1.2 — Dark Mode Toggle
* **Points**: 130 | **Method**: Logic Grader
* **Context**: Application Dashboard.
* **What the user does**:
  - Implements the `dark:` variant across typography and backgrounds, assuming dark mode is toggled via a `.dark` class on the `<html>` tag.
  - **Solution Code**:
    ```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>UI Lab</title>
      <script src="https://cdn.tailwindcss.com"></script>
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
    
      <div class="bg-white dark:bg-slate-900 min-h-screen p-8 transition-colors duration-300">
            <h1 class="text-slate-900 dark:text-white text-3xl font-bold">Dashboard</h1>
            <div class="mt-6 bg-slate-100 dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
              <p class="text-slate-600 dark:text-slate-300">
                Your analytics are looking great today.
              </p>
            </div>
          </div>
    
      <script src="app.js"></script>
    </body>
    </html>
    ```
  * **Learning Objectives**: Apply utility-first CSS styling concepts., Build pixel-perfect UI without custom CSS.
  * **Difficulty**: MEDIUM
  * **Time Limit**: 30 minutes
  * **Hints**: Don't write custom CSS. Check the Tailwind documentation for the correct utility class.
  * **Common Mistakes**: Using inline styles or a custom stylesheet instead of composing utility classes.
* **How the system evaluates**:
  - `check_class_used("dark:bg-slate-900")`
  - `check_class_used("dark:text-white")`
* **Auto-scoring**:
  - **[B] Logic (80 pts)**: 80 pts for comprehensive inclusion of `dark:` variants on text, borders, and backgrounds.

---

## 🏃‍♂️ Sprint 3: Advanced Layouts & Animations
**Duration**: 1 week | **XP Pool**: 500 XP
**Goal**: Build complex grid architectures and implement fluid animations.

### Ticket 3.1 — Complex UI Architecture [250 XP]

#### Task 3.1.1 — Bento Box Grid Layout
* **Points**: 130 | **Method**: Visual & Logic Grader
* **Context**: Feature Highlight Section.
* **What the user does**:
  - Constructs an asymmetrical "Bento Box" grid layout utilizing column and row spans.
  - **Solution Code**:
    ```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>UI Lab</title>
      <script src="https://cdn.tailwindcss.com"></script>
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
    
      <div class="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4 max-w-6xl mx-auto p-4 h-[600px]">
            <div class="bg-blue-500 rounded-2xl md:col-span-2 md:row-span-2 p-6 flex flex-col justify-end">
              <h3 class="text-white text-2xl font-bold">Main Feature (Large)</h3>
            </div>
            <div class="bg-emerald-500 rounded-2xl md:col-span-2 p-6">
              <h3 class="text-white text-xl font-bold">Secondary Feature (Wide)</h3>
            </div>
            <div class="bg-purple-500 rounded-2xl p-6">
              <h3 class="text-white text-lg font-bold">Small Metric</h3>
            </div>
            <div class="bg-amber-500 rounded-2xl p-6">
              <h3 class="text-white text-lg font-bold">Small Tool</h3>
            </div>
          </div>
    
      <script src="app.js"></script>
    </body>
    </html>
    ```
  * **Learning Objectives**: Master Tailwind's CSS Grid utility classes.
  * **Difficulty**: MEDIUM
  * **Time Limit**: 30 minutes
  * **Hints**: Tailwind's grid system uses 'grid' and 'grid-cols-*' utilities., Use 'gap-*' to add spacing between grid items.
  * **Common Mistakes**: Forgetting to add 'grid' before using 'grid-cols-*'.
* **How the system evaluates**:
  - `check_class_used("grid-cols-4")`
  - `check_class_used("col-span-2")`
  - `check_class_used("row-span-2")`
* **Auto-scoring**:
  - **[A] Visual (40 pts)**: 40 pts if the grid correctly forms the asymmetrical 2x4 bento layout on desktop.
  - **[B] Logic (40 pts)**: 40 pts for CSS grid span utilities.
  - **[C] Quality (10 pts)**: 10 pts for arbitrary value fallback `h-[600px]` if exact sizing isn't in scale.

#### Task 3.1.2 — Custom Keyframe Animations
* **Points**: 120 | **Method**: Logic Grader
* **Context**: `tailwind.config.js` and `loading.html`.
* **What the user does**:
  - Extends the Tailwind config to define a custom `wiggle` keyframe animation and applies it to an icon.
  - Code (`tailwind.config.js`):
    ```javascript
    module.exports = {
      theme: {
        extend: {
          keyframes: {
            wiggle: {
              '0%, 100%': { transform: 'rotate(-3deg)' },
              '50%': { transform: 'rotate(3deg)' },
            }
          },
          animation: {
            wiggle: 'wiggle 1s ease-in-out infinite',
          }
        }
      }
    }
    ```
  - Code (`loading.html`):
    ```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>UI Lab</title>
      <script src="https://cdn.tailwindcss.com"></script>
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
    
      <div class="flex justify-center items-center h-screen">
            <svg class="animate-wiggle w-16 h-16 text-indigo-500" ...></svg>
          </div>
    
      <script src="app.js"></script>
    </body>
    </html>
    ```
  * **Learning Objectives**: Apply utility-first CSS styling concepts., Build pixel-perfect UI without custom CSS.
  * **Difficulty**: MEDIUM
  * **Time Limit**: 30 minutes
  * **Hints**: Don't write custom CSS. Check the Tailwind documentation for the correct utility class.
  * **Common Mistakes**: Using inline styles or a custom stylesheet instead of composing utility classes.
* **How the system evaluates**:
  - `check_config_extension("keyframes.wiggle")`
  - `check_class_used("animate-wiggle")`
* **Auto-scoring**:
  - **[B] Logic (80 pts)**: 80 pts for correctly modifying the `extend` object in the configuration file and applying the resulting utility class.

---

## 🏃‍♂️ Sprint 4: Component Extraction & Plugins
**Duration**: 1 week | **XP Pool**: 450 XP
**Goal**: Keep HTML clean by extracting repeated utilities and leveraging official plugins.

### Ticket 4.1 — Maintainability [250 XP]

#### Task 4.1.1 — Reusability with @apply
* **Points**: 100 | **Method**: Logic Grader
* **Context**: `styles.css` and `buttons.html`.
* **What the user does**:
  - Extracts a long string of utility classes for a button into a custom CSS class using the `@apply` directive to DRY up the HTML.
  - Code (`styles.css`):
    ```css
    @tailwind base;
    @tailwind components;
    @tailwind utilities;

    @layer components {
      .btn-primary {
        @apply py-2 px-4 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75;
      }
    }
    ```
  - Code (`buttons.html`):
    ```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>UI Lab</title>
      <script src="https://cdn.tailwindcss.com"></script>
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
    
      <button class="btn-primary">Save Changes</button>
    
      <script src="app.js"></script>
    </body>
    </html>
    ```
  * **Learning Objectives**: Apply utility-first CSS styling concepts., Build pixel-perfect UI without custom CSS.
  * **Difficulty**: MEDIUM
  * **Time Limit**: 30 minutes
  * **Hints**: Don't write custom CSS. Check the Tailwind documentation for the correct utility class.
  * **Common Mistakes**: Using inline styles or a custom stylesheet instead of composing utility classes.
* **How the system evaluates**:
  - `check_css_directive("@apply")`
  - `check_css_directive("@layer components")`
  - `check_class_used("btn-primary")`
* **Auto-scoring**:
  - **[B] Logic (80 pts)**: 80 pts for correct usage of `@layer` and `@apply` to build a custom component class.

#### Task 4.1.2 — Typography Plugin (Prose)
* **Points**: 150 | **Method**: Visual & Logic Grader
* **Context**: Blog Post rendered from Markdown.
* **What the user does**:
  - Installs `@tailwindcss/typography` and uses the `prose` class to beautifully format raw, un-classed HTML (like from a CMS).
  - **Solution Code**:
    ```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>UI Lab</title>
      <script src="https://cdn.tailwindcss.com"></script>
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
    
      <!-- Assume this inner HTML comes from a database/markdown parser -->
          <article class="prose prose-slate prose-lg lg:prose-xl mx-auto dark:prose-invert">
            <h1>Garlic bread with cheese: What the science tells us</h1>
            <p>For years parents have espoused the health benefits of eating garlic bread with cheese to their children, with the food earning such an iconic status in our culture that kids will often dress up as warm, cheesy loaf for Halloween.</p>
            <ul>
              <li>It tastes good</li>
              <li>It is warm</li>
            </ul>
          </article>
    
      <script src="app.js"></script>
    </body>
    </html>
    ```
  * **Learning Objectives**: Apply utility-first CSS styling concepts., Build pixel-perfect UI without custom CSS.
  * **Difficulty**: MEDIUM
  * **Time Limit**: 30 minutes
  * **Hints**: Don't write custom CSS. Check the Tailwind documentation for the correct utility class.
  * **Common Mistakes**: Using inline styles or a custom stylesheet instead of composing utility classes.
* **How the system evaluates**:
  - `check_plugin_installed("@tailwindcss/typography")`
  - `check_class_used("prose")`
  - `check_class_used("dark:prose-invert")`
* **Auto-scoring**:
  - **[A] Visual (40 pts)**: 40 pts if the unclassed `<h1>` and `<ul>` elements are correctly styled with proper vertical rhythm.
  - **[B] Logic (40 pts)**: 40 pts for modifying the prose theme and size (`prose-lg`, `prose-slate`).

---

## 🏃‍♂️ Sprint 5: Capstone Project
**Duration**: 1 week | **XP Pool**: 600 XP
**Goal**: Combine all skills to build a production-ready SaaS landing page.

### Ticket 5.1 — ApexBank Landing Page [600 XP]

#### Task 5.1.1 — Full Page Architecture
* **Points**: 600 | **Method**: Visual & Logic Grader (Comprehensive)
* **Context**: `index.html`.
* **What the user does**:
  - Builds a complete landing page featuring a hero section with gradient text, a feature bento-grid, a pricing table, and a footer. Must be fully responsive and support dark mode.
  - **Solution Code**:
    *(Extensive HTML structure expected. The grader checks for composite mastery.)*
  * **Learning Objectives**: Master Tailwind's CSS Grid utility classes.
  * **Difficulty**: MEDIUM
  * **Time Limit**: 30 minutes
  * **Hints**: Tailwind's grid system uses 'grid' and 'grid-cols-*' utilities., Use 'gap-*' to add spacing between grid items.
  * **Common Mistakes**: Applying 'md:' to mobile styles instead of desktop styles.
* **How the system evaluates**:
  - **Hero Section**: Checks for `bg-gradient-to-r`, `text-transparent`, `bg-clip-text`.
  - **Responsiveness**: Checks for a minimum of 15 responsive prefixes (`md:`, `lg:`).
  - **Dark Mode**: Checks for a minimum of 10 `dark:` variants.
* **Auto-scoring**:
  - **[A] Visual (250 pts)**: High-fidelity SSIM match across Mobile, Tablet, and Desktop viewport tests.
  - **[B] Logic (250 pts)**: Exhaustive AST scan for component structure, gradient utilities, and state variants.
  - **[C] Quality (100 pts)**: 100 pts for clean semantic HTML5 landmarks (`<header>`, `<main>`, `<section>`, `<footer>`).
