export const UI_TARGETS: Record<string, string> = {
  "BS-101": `<!DOCTYPE html>
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
            <div class="border p-3">Column 1</div>
          </div>
          <div class="col">
            <div class="border p-3">Column 2</div>
          </div>
          <div class="col">
            <div class="border p-3">Column 3</div>
          </div>
        </div>
          </div>
    
      <script src="app.js"></script>
    </body>
    </html>`,
  "BS-102": `<!DOCTYPE html>
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
    </html>`,
  "BS-103": `<!DOCTYPE html>
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
    </html>`,
  "BS-201": `<!DOCTYPE html>
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
    </html>`,
  "BS-202": `<!DOCTYPE html>
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
    </html>`,
  "BS-203": `<!DOCTYPE html>
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
    </html>`,
  "BS-301": `<!DOCTYPE html>
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
                  Are you sure you want to charge \$99.00 to your card?
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
    </html>`,
  "BS-302": `<!DOCTYPE html>
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
    </html>`,
  "BS-401": `<!DOCTYPE html>
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
    </html>`,
  "TW-101": `<!DOCTYPE html>
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
    </html>`,
  "TW-102": `<!DOCTYPE html>
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
    </html>`,
  "TW-201": `<!DOCTYPE html>
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
    </html>`,
  "TW-202": `<!DOCTYPE html>
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
    </html>`,
  "TW-301": `<!DOCTYPE html>
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
    </html>`,
  "TW-302": `<!DOCTYPE html>
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
    </html>`,
  "TW-401": `<!DOCTYPE html>
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
    </html>`,
  "TW-402": `<!DOCTYPE html>
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
    </html>`,
};
