export function getTargetUI(ticketId: string): string | null {
  const brandStyles = `
    :root { --brand: #4f46e5; --ink: #111827; --muted: #6b7280; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; color: var(--ink); }
    .site-header { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; border-bottom: 1px solid #e5e7eb; }
    .site-header nav { display: flex; gap: 1rem; margin-left: 1rem; }
    .site-header nav a { color: var(--muted); text-decoration: none; }
    .site-header nav a:hover { color: var(--ink); }
    .logo { font-weight: 700; color: var(--brand); text-decoration: none; }
    .cta { margin-left: auto; background: var(--brand); color: #fff; border: 0; padding: .55rem 1rem; border-radius: .5rem; cursor: pointer; }
    .hero { max-width: 720px; margin: 4rem auto; padding: 0 1.25rem; text-align: center; }
    .hero h1 { font-size: 2.25rem; margin-bottom: .5rem; }
    .hero p  { color: var(--muted); margin: .25rem 0; }
  `;

  const bsHead = `
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
    <style>${brandStyles}</style>
  `;

  const twHead = `
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://cdn.tailwindcss.com"></script>
    <style>${brandStyles}</style>
  `;

  const headerHtml = `
    <header class="site-header">
      <a class="logo" href="#">◆ Acme</a>
      <nav>
        <a href="#">Product</a>
        <a href="#">Pricing</a>
        <a href="#">Docs</a>
      </nav>
      <button class="cta">Get started</button>
    </header>
  `;

  const heroHtml = `
    <section class="hero">
      <h1>Build pixel-perfect UI</h1>
      <p>Compose components with Flexbox, Grid and modern CSS.</p>
      <p>Clicks: <output id="count">0</output></p>
    </section>
  `;

  switch (ticketId) {
    // ==========================================
    // BOOTSTRAP LABS
    // ==========================================
    case "BS-101":
      return `<!DOCTYPE html><html lang="en"><head>${bsHead}</head><body>${headerHtml}<main>${heroHtml}
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
      </main></body></html>`;
      
    case "BS-102":
      return `<!DOCTYPE html><html lang="en"><head>${bsHead}</head><body>${headerHtml}<main>${heroHtml}
      <div class="container">
        <div class="row">
          <div class="col-12 col-md-6 col-lg-3 mb-4">Product 1</div>
          <div class="col-12 col-md-6 col-lg-3 mb-4">Product 2</div>
          <div class="col-12 col-md-6 col-lg-3 mb-4">Product 3</div>
          <div class="col-12 col-md-6 col-lg-3 mb-4">Product 4</div>
        </div>
      </div>
      </main></body></html>`;
      
    case "BS-103":
      return `<!DOCTYPE html><html lang="en"><head>${bsHead}</head><body>${headerHtml}<main>${heroHtml}
      <div class="container mt-5 text-center">
        <h1 class="display-4">Welcome to Acme</h1>
        <p class="lead text-muted">The best way to build your UI fast.</p>
        <button class="btn btn-primary btn-lg mt-3">Get Started</button>
        <button class="btn btn-outline-secondary btn-lg mt-3 ms-2">Learn More</button>
      </div>
      </main></body></html>`;

    case "BS-201":
      return `<!DOCTYPE html><html lang="en"><head>${bsHead}</head><body>${headerHtml}<main>${heroHtml}</main>
      <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container-fluid">
          <a class="navbar-brand" href="#">ApexBank</a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse show" id="navbarNav">
            <ul class="navbar-nav">
              <li class="nav-item">
                <a class="nav-link active" href="#">Home</a>
              </li>
              <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="true">
                  Services
                </a>
                <ul class="dropdown-menu show" style="position: absolute;">
                  <li><a class="dropdown-item" href="#">Loans</a></li>
                  <li><a class="dropdown-item" href="#">Credit Cards</a></li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      </body></html>`;

    case "BS-202":
      return `<!DOCTYPE html><html lang="en"><head>${bsHead}</head><body>${headerHtml}<main>${heroHtml}
      <div class="card" style="width: 18rem;">
        <div style="height: 150px; background: #e9ecef; display: flex; align-items: center; justify-content: center; color: #adb5bd;">User Avatar</div>
        <div class="card-body">
          <h5 class="card-title">Jane Doe</h5>
          <p class="card-text">Senior Software Engineer</p>
        </div>
        <div class="card-footer text-muted text-center">
          <a href="#" class="btn btn-primary w-100">View Profile</a>
        </div>
      </div>
      </main></body></html>`;

    case "BS-203":
      return `<!DOCTYPE html><html lang="en"><head>${bsHead}</head><body>${headerHtml}<main>${heroHtml}
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
      </main></body></html>`;

    case "BS-301":
      return `<!DOCTYPE html><html lang="en"><head>${bsHead}</head><body>${headerHtml}<main>${heroHtml}
      <!-- Trigger Button -->
      <button type="button" class="btn btn-success" data-bs-toggle="modal" data-bs-target="#confirmModal">
        Checkout
      </button>

      <!-- Modal (forced visible for preview) -->
      <div class="modal fade show d-block mt-5" tabindex="-1" style="position: static; padding: 2rem;">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="modalLabel">Confirm Purchase</h5>
              <button type="button" class="btn-close" aria-label="Close"></button>
            </div>
            <div class="modal-body text-start">
              Are you sure you want to charge $99.00 to your card?
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary">Cancel</button>
              <button type="button" class="btn btn-primary">Confirm</button>
            </div>
          </div>
        </div>
      </div>
      </main></body></html>`;

    case "BS-302":
      return `<!DOCTYPE html><html lang="en"><head>${bsHead}</head><body>${headerHtml}<main>${heroHtml}
      <div class="accordion" id="faqAccordion">
        <div class="accordion-item">
          <h2 class="accordion-header" id="headingOne">
            <button class="accordion-button" type="button" aria-expanded="true">
              What is YLabs?
            </button>
          </h2>
          <div id="collapseOne" class="accordion-collapse collapse show" data-bs-parent="#faqAccordion">
            <div class="accordion-body text-start">YLabs is an interactive learning platform.</div>
          </div>
        </div>
        <div class="accordion-item">
          <h2 class="accordion-header" id="headingTwo">
            <button class="accordion-button collapsed" type="button" aria-expanded="false">
              How do I get graded?
            </button>
          </h2>
          <div id="collapseTwo" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
            <div class="accordion-body text-start">Automatically via our grading engine.</div>
          </div>
        </div>
      </div>
      </main></body></html>`;

    case "BS-401":
      return `<!DOCTYPE html><html lang="en"><head>${bsHead}</head><body>${headerHtml}
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
      </body></html>`;

    case "BS-402":
      return `<!DOCTYPE html><html lang="en"><head>${bsHead}
        <style>.btn-primary { background-color: #ff5722 !important; border-color: #ff5722 !important; border-radius: 0.75rem !important; }</style>
        </head><body>${headerHtml}<main>${heroHtml}
        <button class="btn btn-primary">Save Changes</button>
      </main></body></html>`;

    // ==========================================
    // TAILWIND CSS LABS
    // ==========================================
    case "TW-101":
      return `<!DOCTYPE html><html lang="en"><head>${twHead}</head><body>${headerHtml}<main>${heroHtml}
      <div class="max-w-sm rounded-lg overflow-hidden shadow-md bg-white p-6 m-4 border border-slate-200 text-left">
        <h2 class="text-xl font-bold text-slate-800 mb-2">Welcome to Tailwind</h2>
        <p class="text-slate-600 text-base">
          Utility-first CSS framework packed with classes like flex, pt-4, text-center and rotate-90 that can be composed to build any design, directly in your markup.
        </p>
      </div>
      </main></body></html>`;

    case "TW-102":
      return `<!DOCTYPE html><html lang="en"><head>${twHead}</head><body>${headerHtml}<main>${heroHtml}</main>
      <nav class="bg-indigo-600 p-4">
        <div class="flex flex-col md:flex-row md:justify-between md:items-center">
          <a href="#" class="text-white font-bold text-2xl mb-4 md:mb-0">BrandLogo</a>
          <div class="flex flex-col md:flex-row md:space-x-4 space-y-2 md:space-y-0 text-left">
            <a href="#" class="text-indigo-100 hover:text-white font-medium">Home</a>
            <a href="#" class="text-indigo-100 hover:text-white font-medium">Features</a>
            <a href="#" class="text-indigo-100 hover:text-white font-medium">Pricing</a>
          </div>
        </div>
      </nav>
      </body></html>`;

    case "TW-201":
      return `<!DOCTYPE html><html lang="en"><head>${twHead}</head><body>${headerHtml}<main>${heroHtml}
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
      </main></body></html>`;

    case "TW-202":
      return `<!DOCTYPE html><html lang="en" class="dark"><head>${twHead}</head><body>${headerHtml}<main>${heroHtml}
      <div class="bg-white dark:bg-slate-900 min-h-screen p-8 transition-colors duration-300 text-left">
        <h1 class="text-slate-900 dark:text-white text-3xl font-bold">Dashboard</h1>
        <div class="mt-6 bg-slate-100 dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <p class="text-slate-600 dark:text-slate-300">
            Your analytics are looking great today.
          </p>
        </div>
      </div>
      </main></body></html>`;

    case "TW-301":
      return `<!DOCTYPE html><html lang="en"><head>${twHead}</head><body>${headerHtml}<main>${heroHtml}
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
      </main></body></html>`;

    case "TW-302":
      return `<!DOCTYPE html><html lang="en"><head>${twHead}
        <style>@keyframes wiggle { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } } .animate-wiggle { animation: wiggle 1s ease-in-out infinite; }</style>
        </head><body>${headerHtml}<main>${heroHtml}
      <div class="flex justify-center items-center h-screen">
        <svg class="animate-wiggle w-16 h-16 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
      </div>
      </main></body></html>`;

    case "TW-401":
      return `<!DOCTYPE html><html lang="en"><head>${twHead}</head><body>${headerHtml}<main>${heroHtml}
      <button class="py-2 px-4 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75">Save Changes</button>
      </main></body></html>`;

    case "TW-402":
      return `<!DOCTYPE html><html lang="en"><head>${twHead}
        <style>
          .prose { max-width: 65ch; color: #374151; }
          .prose h1 { color: #111827; font-weight: 800; font-size: 2.25em; margin-top: 0; margin-bottom: 0.8888889em; line-height: 1.1111111; }
          .prose p { margin-top: 1.25em; margin-bottom: 1.25em; }
          .prose ul { margin-top: 1.25em; margin-bottom: 1.25em; list-style-type: disc; padding-left: 1.625em; }
          .prose li { margin-top: 0.5em; margin-bottom: 0.5em; }
        </style>
        </head><body>${headerHtml}<main>${heroHtml}
      <article class="prose prose-slate prose-lg lg:prose-xl mx-auto dark:prose-invert text-left px-4">
        <h1>Garlic bread with cheese: What the science tells us</h1>
        <p>For years parents have espoused the health benefits of eating garlic bread with cheese to their children, with the food earning such an iconic status in our culture that kids will often dress up as warm, cheesy loaf for Halloween.</p>
        <ul>
          <li>It tastes good</li>
          <li>It is warm</li>
        </ul>
      </article>
      </main></body></html>`;

    case "TW-501":
      return `<!DOCTYPE html><html lang="en"><head>${twHead}</head><body>
      <div class="min-h-screen bg-slate-50 flex flex-col">
        <nav class="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
          <span class="text-2xl font-black text-indigo-600">ApexSaaS</span>
          <div class="space-x-4"><a href="#" class="text-slate-600 font-medium">Features</a><a href="#" class="text-slate-600 font-medium">Pricing</a><button class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium">Log In</button></div>
        </nav>
        <main class="flex-grow flex flex-col items-center justify-center text-center px-4 py-20">
          <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 mb-6">Ship faster than ever.</h1>
          <p class="text-xl text-slate-500 max-w-2xl mx-auto mb-10">The all-in-one platform to build, deploy, and scale your next big idea. No credit card required.</p>
          <div class="space-x-4"><button class="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all">Start for free</button></div>
        </main>
      </div>
      </body></html>`;

    default:
      return null;
  }
}
