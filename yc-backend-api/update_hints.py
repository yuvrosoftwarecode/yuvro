import os
import json
import glob
import urllib.request

# Specific files the user mentioned (Heaps etc)
TARGET_FILES = [
    r"c:\Users\kadal\Desktop\Yuvro-code\yuvro-code\yc-backend-api\course\fixtures\prod\data_structures\topics\04_heaps.json",
    r"c:\Users\kadal\Desktop\Yuvro-code\yuvro-code\yc-backend-api\course\fixtures\prod\data_structures\topics\05_graphs.json",
    r"c:\Users\kadal\Desktop\Yuvro-code\yuvro-code\yc-backend-api\course\fixtures\prod\data_structures\topics\06_dynamic_programming.json",
    r"c:\Users\kadal\Desktop\Yuvro-code\yuvro-code\yc-backend-api\course\fixtures\prod\data_structures\topics\03_trees.json"
]

def generate_hints(title, content):
    """
    Very basic heuristic hint generation based on problem title and content.
    Since we don't have an external API key hardcoded, we will generate structural hints
    based on standard DSA patterns.
    """
    hints = []
    title_lower = title.lower()
    content_lower = content.lower()
    
    # Generic starting hint
    hints.append("Start by carefully reading the problem statement and understanding the input/output format.")
    
    # Heuristic hints based on keywords
    if "tree" in title_lower or "node" in content_lower:
        hints.append("For tree problems, consider whether a Depth First Search (DFS) or Breadth First Search (BFS) approach is more appropriate.")
        if "binary search tree" in content_lower or "bst" in content_lower:
            hints.append("Remember the property of a BST: left child is smaller, right child is greater than the parent.")
    
    if "graph" in title_lower or "edge" in content_lower or "vertex" in content_lower:
        hints.append("How will you represent the graph? An adjacency list is usually an efficient choice.")
        hints.append("Consider if you need to keep track of visited nodes to avoid infinite loops.")
        
    if "heap" in title_lower or "kth" in title_lower or "largest" in title_lower or "smallest" in title_lower:
        hints.append("A Priority Queue (Heap) is often the best data structure when you need to repeatedly find the minimum or maximum element.")
        hints.append("For 'Kth largest' problems, a Min-Heap of size K can be very efficient.")
        
    if "dynamic programming" in title_lower or "dp" in title_lower or "maximum profit" in content_lower or "minimum cost" in content_lower:
        hints.append("Try to break down the problem into smaller overlapping subproblems.")
        hints.append("Can you write a recursive relation? Once you have that, you can use memoization or tabulation to optimize it.")
        
    if "sort" in content_lower:
        hints.append("Would sorting the input array first simplify the problem?")
        
    if len(hints) < 3:
        hints.append("Consider the time and space complexity constraints. Is there a way to optimize your brute-force approach using a hash map or two pointers?")
        
    return hints

def process_json_file(file_path):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return False

    with open(file_path, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            return False

    modified = False
    
    # Custom format: Object with a "questions" array
    if isinstance(data, dict) and "questions" in data:
        for q in data["questions"]:
            if isinstance(q, dict):
                # Always regenerate hints if they are empty
                if "hints" not in q or not q["hints"]:
                    title = q.get("title", "")
                    content = q.get("content", "")
                    q["hints"] = generate_hints(title, content)
                    modified = True
                    
    elif isinstance(data, list):
        # Some might be in django fixture format? Just in case.
        for item in data:
            if isinstance(item, dict) and item.get("model") == "course.question":
                fields = item.get("fields", {})
                if "hints" not in fields or not fields["hints"]:
                    title = fields.get("title", "")
                    content = fields.get("content", "")
                    fields["hints"] = generate_hints(title, content)
                    item["fields"] = fields
                    modified = True

    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4)
        print(f"Updated {os.path.basename(file_path)}")
    else:
        print(f"No changes needed for {os.path.basename(file_path)}")
    return modified

def main():
    count = 0
    for f in TARGET_FILES:
        if process_json_file(f):
            count += 1
    print(f"Total files updated: {count}")

if __name__ == "__main__":
    main()
