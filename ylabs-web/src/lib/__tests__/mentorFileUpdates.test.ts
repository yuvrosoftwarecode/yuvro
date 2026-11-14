import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  parseFenceInfo,
  parseFileUpdates,
  resolveAgainstKnownFiles,
} from "../mentorFileUpdates.ts";

describe("mentorFileUpdates", () => {
  test("parses language and path from fence info", () => {
    assert.equal(parseFenceInfo("python src/app.py").path, "src/app.py");
    assert.equal(parseFenceInfo("python:src/app.py").path, "src/app.py");
    assert.equal(parseFenceInfo('js filename="server.js"').path, "server.js");
    assert.equal(parseFenceInfo("main.py").path, "main.py");
  });

  test("extracts multiple labeled files from one response", () => {
    const content = [
      "Updated both files.",
      "```python app.py",
      "print('a')",
      "```",
      "```python utils.py",
      "print('b')",
      "```",
    ].join("\n");
    const updates = parseFileUpdates(content, "app.py");
    assert.equal(updates.length, 2);
    assert.equal(updates[0].path, "app.py");
    assert.equal(updates[1].path, "utils.py");
    assert.match(updates[0].code, /print\('a'\)/);
  });

  test("uses File: header before an unlabeled fence", () => {
    const content = ["File: templates/index.html", "```html", "<h1>Hi</h1>", "```"].join("\n");
    const updates = parseFileUpdates(content, "main.py");
    assert.equal(updates.length, 1);
    assert.equal(updates[0].path, "templates/index.html");
  });

  test("falls back to the active file for a single unlabeled block", () => {
    const content = ["```python", "print(1)", "```"].join("\n");
    const updates = parseFileUpdates(content, "solution.py");
    assert.equal(updates.length, 1);
    assert.equal(updates[0].path, "solution.py");
  });

  test("resolves a basename against known workspace files", () => {
    assert.equal(
      resolveAgainstKnownFiles("app.py", ["src/app.py", "src/utils.py"]),
      "src/app.py",
    );
  });
});
