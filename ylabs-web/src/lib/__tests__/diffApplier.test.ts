import { describe, it } from "node:test";
import assert from "node:assert";
import {
  applyDiffOrCode,
  normalizeFilePath,
  isDiffContent,
  parseConsolidatedFileDiffs,
} from "../diffApplier.ts";

describe("diffApplier Unit & Integration Tests", () => {
  it("1. normalizeFilePath removes quotes, leading slashes, and ./", () => {
    assert.strictEqual(normalizeFilePath('"app/__init__.py"'), "app/__init__.py");
    assert.strictEqual(normalizeFilePath("'./src/main.py'"), "src/main.py");
    assert.strictEqual(normalizeFilePath("`todo.py`"), "todo.py");
  });

  it("2. isDiffContent correctly identifies SEARCH/REPLACE and unified diffs", () => {
    assert.strictEqual(isDiffContent("<<<<<<< SEARCH\nfoo\n=======\nbar\n>>>>>>> REPLACE"), true);
    assert.strictEqual(isDiffContent("--- a/f\n+++ b/f\n@@ -1 +1 @@\n-a\n+b"), true);
    assert.strictEqual(isDiffContent("print('hello')", "diff"), true);
    assert.strictEqual(isDiffContent("def foo():\n    return 42"), false);
  });

  it("3. applyDiffOrCode applies exact SEARCH/REPLACE block", () => {
    const original = "def create_app():\n    app = Flask(False)\n    return app\n";
    const diff = "<<<<<<< SEARCH\n    app = Flask(False)\n=======\n    app = Flask(True)\n>>>>>>> REPLACE";
    const res = applyDiffOrCode(original, diff);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.result, "def create_app():\n    app = Flask(True)\n    return app\n");
    assert.strictEqual(res.method, "search-replace");
  });

  it("4. applyDiffOrCode ignores comment placeholders and handles indentation alignment", () => {
    const original = "def create_app(test_config=None):\n    app = Flask(__name__, instance_relative_config=False)\n    return app\n";
    const diff = `    <<<<<<< SEARCH
    // exact lines from existing file that need to be changed
    app = Flask(__name__, instance_relative_config=False)
    =======
    app = Flask(__name__, instance_relative_config=True)
    >>>>>>> REPLACE`;
    const res = applyDiffOrCode(original, diff);
    assert.strictEqual(res.success, true);
    assert.strictEqual(
      res.result,
      "def create_app(test_config=None):\n    app = Flask(__name__, instance_relative_config=True)\n    return app\n"
    );
  });

  it("5. applyDiffOrCode applies multiple hunks to the same file in one pass", () => {
    const original = "def a():\n    return 1\ndef b():\n    return 2\n";
    const diff = `<<<<<<< SEARCH
    return 1
=======
    return 10
>>>>>>> REPLACE

<<<<<<< SEARCH
    return 2
=======
    return 20
>>>>>>> REPLACE`;
    const res = applyDiffOrCode(original, diff);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.result, "def a():\n    return 10\ndef b():\n    return 20\n");
  });

  it("6. applyDiffOrCode does NOT corrupt file with raw diff if search block cannot match", () => {
    const original = "def some_unrelated_code():\n    pass\n";
    const diff = "<<<<<<< SEARCH\n    totally_non_existent_function()\n=======\n    fixed()\n>>>>>>> REPLACE";
    const res = applyDiffOrCode(original, diff);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.result, original); // File remains unharmed!
  });

  it("7. parseConsolidatedFileDiffs merges multiple hunks for same file into 1 entry", () => {
    const response = `I fixed the configuration in app/__init__.py.

\`\`\`python file="app/__init__.py"
<<<<<<< SEARCH
    app = Flask(False)
=======
    app = Flask(True)
>>>>>>> REPLACE
\`\`\`

And also fixed the secret key:

\`\`\`python file="app/__init__.py"
<<<<<<< SEARCH
    SECRET_KEY = "dev"
=======
    SECRET_KEY = "prod"
>>>>>>> REPLACE
\`\`\`
`;
    const parsed = parseConsolidatedFileDiffs(response, "app/__init__.py", { "app/__init__.py": "..." });
    assert.strictEqual(parsed.hasCode, true);
    assert.strictEqual(parsed.files.length, 1);
    assert.strictEqual(parsed.files[0].path, "app/__init__.py");
    assert.strictEqual(parsed.files[0].hunkCount, 2);
    assert.strictEqual(parsed.explanation.includes("I fixed the configuration"), true);
    assert.strictEqual(parsed.explanation.includes("<<<<<<<"), false);
  });

  it("8. applyDiffOrCode preserves all lines in multi-line replace without truncation", () => {
    const original = `def two_sum(nums, target):
    left = 0
    right = len(nums) - 1
    while left < right:
        left += 1
        right -= 2
    return []
`;

    const diff = `<<<<<<< SEARCH
        left += 1
        right -= 2
=======
        left += 1
        right -= 1
>>>>>>> REPLACE`;

    const res = applyDiffOrCode(original, diff, "two_sum.py");
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.result.includes("left += 1"), true);
    assert.strictEqual(res.result.includes("right -= 1"), true);
    assert.strictEqual(res.result.includes("right -= 2"), false);
  });

  it("9. applyDiffOrCode generates standard Git diff patch in unified format", () => {
    const original = "alpha\nbeta\ngamma\n";
    const diff = "<<<<<<< SEARCH\nbeta\n=======\nbeta_modified\n>>>>>>> REPLACE";
    const res = applyDiffOrCode(original, diff, "sample.txt");
    assert.strictEqual(res.success, true);
    assert.strictEqual(typeof res.gitPatch, "string");
    assert.strictEqual(res.gitPatch!.includes("--- sample.txt"), true);
    assert.strictEqual(res.gitPatch!.includes("+++ sample.txt"), true);
    assert.strictEqual(res.gitPatch!.includes("-beta"), true);
    assert.strictEqual(res.gitPatch!.includes("+beta_modified"), true);
  });

  it("10. applyDiffOrCode applies standard unified Git patch directly", () => {
    const original = "alpha\nbeta\ngamma\n";
    const gitPatch = `Index: sample.txt
===================================================================
--- sample.txt
+++ sample.txt
@@ -1,3 +1,3 @@
 alpha
-beta
+beta_unified
 gamma
`;
    const res = applyDiffOrCode(original, gitPatch, "sample.txt");
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.result, "alpha\nbeta_unified\ngamma\n");
    assert.strictEqual(res.method, "unified");
  });
});
