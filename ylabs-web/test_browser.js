const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("console", (msg) => console.log("BROWSER_LOG:", msg.text()));
  page.on("pageerror", (error) => console.log("BROWSER_ERROR:", error.message));
  await page.goto(
    "http://localhost:3002/lab/01ec1d2e-1bfe-4244-8e5f-82dd9161f47b/ticket/11432812-b5cb-4d9c-811b-163028a83016",
    { waitUntil: "networkidle" },
  );
  await page.screenshot({ path: "test_error.png" });
  await browser.close();
})();
