"""Curated debug and optimisation snippets for Phases 5 and 6.

Per Master Prompt Rule (Part B - 4):
'Prepare debug and optimisation snippets yourself. Use a validated bank per language
and level, or generate them in advance and run them once to confirm the bug or
slowness is real. Do not let the live model invent a bug.'
"""

from typing import Dict, Any

DEBUG_SNIPPETS: Dict[str, Dict[int, Dict[str, Any]]] = {
    "python": {
        1: {
            "title": "Off-by-one indexing error",
            "code": """def get_first_and_last(items):\n    # Bug: IndexError on empty or off-by-one access\n    first = items[0]\n    last = items[len(items)]\n    return first, last\n""",
            "expected_bug": "Accesses len(items) instead of len(items)-1 and does not handle empty list.",
        },
        2: {
            "title": "Mutable default argument",
            "code": """def append_to_cache(item, cache=[]):\n    cache.append(item)\n    return cache\n\n# Bug: cache retains state between calls\nprint(append_to_cache(1))\nprint(append_to_cache(2))\n""",
            "expected_bug": "Default mutable argument `cache=[]` is shared across invocations.",
        },
        3: {
            "title": "Modifying list while iterating",
            "code": """def remove_evens(nums):\n    for i, n in enumerate(nums):\n        if n % 2 == 0:\n            nums.pop(i)\n    return nums\n""",
            "expected_bug": "Mutating `nums` while iterating with `enumerate` causes indices to shift and skips items.",
        },
        4: {
            "title": "Race condition / Late binding closure",
            "code": """def make_multipliers():\n    return [lambda x: i * x for i in range(5)]\n\n# All multipliers end up using i=4\nmultipliers = make_multipliers()\nprint([m(2) for m in multipliers])\n""",
            "expected_bug": "Variable `i` is bound late in the enclosing scope, making all closures evaluate with i=4.",
        },
        5: {
            "title": "Thread safety & GIL deadlock simulation",
            "code": """import threading\n\ncounter = 0\nlock_a = threading.Lock()\nlock_b = threading.Lock()\n\ndef task_1():\n    with lock_a:\n        with lock_b:\n            pass\n\ndef task_2():\n    with lock_b:\n        with lock_a:\n            pass\n""",
            "expected_bug": "Inconsistent lock acquisition ordering between task_1 and task_2 causes potential deadlock.",
        },
    },
    "javascript": {
        2: {
            "title": "Asynchronous loop bug",
            "code": """async function fetchAll(ids) {\n    const results = [];\n    ids.forEach(async (id) => {\n        const data = await fetch(`/api/${id}`);\n        results.push(data);\n    });\n    return results; // Bug: returns empty array before promises resolve\n}\n""",
            "expected_bug": "Array.prototype.forEach does not wait for async callback promises.",
        }
    }
}

OPTIMISATION_SNIPPETS: Dict[str, Dict[int, Dict[str, Any]]] = {
    "python": {
        1: {
            "title": "O(N^2) duplicates lookup",
            "code": """def has_duplicates(items):\n    # O(N^2) bottleneck\n    for i in range(len(items)):\n        for j in range(i + 1, len(items)):\n            if items[i] == items[j]:\n                return True\n    return False\n""",
            "bottleneck": "Nested loop O(N^2) complexity. Should use a hash set for O(N) time.",
        },
        2: {
            "title": "String concatenation in loop",
            "code": """def build_large_string(words):\n    result = ""\n    for word in words:\n        result += word + " "\n    return result\n""",
            "bottleneck": "Repeated string concatenation creates new strings each time O(N^2). Use `' '.join(words)` for O(N).",
        },
        3: {
            "title": "Repeated list membership checks",
            "code": """def find_common_elements(list1, list2):\n    # list2 membership check is O(M)\n    common = []\n    for item in list1:\n        if item in list2:\n            common.append(item)\n    return common\n""",
            "bottleneck": "O(N * M) due to `item in list2`. Converting `list2` to a `set` reduces time to O(N + M).",
        },
        4: {
            "title": "Fibonacci without memoization",
            "code": """def fib(n):\n    if n <= 1:\n        return n\n    return fib(n - 1) + fib(n - 2)\n""",
            "bottleneck": "Exponential O(2^N) recursion without memoization. Dynamic programming or `@lru_cache` achieves O(N).",
        },
        5: {
            "title": "High memory consumption & large object duplication",
            "code": """def read_and_filter_records(filepath, target_key):\n    # Loads entire file into memory at once\n    with open(filepath, 'r') as f:\n        lines = f.readlines()\n    return [line for line in lines if target_key in line]\n""",
            "bottleneck": "High memory footprint loading all lines into memory. Should use generator streaming line by line.",
        },
    }
}


def get_curated_debug_snippet(stack: str = "python", level: int = 2) -> Dict[str, Any]:
    """Retrieve a validated debug snippet for the candidate's stack and level."""
    stack_snippets = DEBUG_SNIPPETS.get(stack.lower(), DEBUG_SNIPPETS["python"])
    return stack_snippets.get(level, stack_snippets.get(2, list(stack_snippets.values())[0]))


def get_curated_optimisation_snippet(stack: str = "python", level: int = 2) -> Dict[str, Any]:
    """Retrieve a validated optimisation snippet for the candidate's stack and level."""
    stack_snippets = OPTIMISATION_SNIPPETS.get(stack.lower(), OPTIMISATION_SNIPPETS["python"])
    return stack_snippets.get(level, stack_snippets.get(2, list(stack_snippets.values())[0]))
