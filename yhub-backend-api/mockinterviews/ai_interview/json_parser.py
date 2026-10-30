import json
import re

def parse_json_response(text: str) -> dict | list:
    """Robustly parse JSON from LLM output.

    Handles:
      - Clean JSON
      - ```json ... ``` fenced blocks
      - Trailing commas (common LLM mistake)
      - Unescaped control characters/newlines (strict=False)
      - Leading/trailing commentary
      - Both object and array responses
    """
    text = text.strip()

    try:
        return json.loads(text, strict=False)
    except (json.JSONDecodeError, ValueError):
        pass

    if "```" in text:
        parts = text.split("```")
        for part in parts[1::2]:
            cleaned = part.strip()
            if cleaned.lower().startswith("json"):
                cleaned = cleaned[4:].strip()
            try:
                return json.loads(cleaned, strict=False)
            except (json.JSONDecodeError, ValueError):
                fixed = re.sub(r",\s*([}\]])", r"\1", cleaned)
                try:
                    return json.loads(fixed, strict=False)
                except (json.JSONDecodeError, ValueError):
                    pass

    first_obj = text.find("{")
    first_arr = text.find("[")

    if first_arr != -1 and (first_obj == -1 or first_arr < first_obj):
        last_arr = text.rfind("]")
        if last_arr > first_arr:
            candidate = text[first_arr : last_arr + 1]
            try:
                return json.loads(candidate, strict=False)
            except (json.JSONDecodeError, ValueError):
                fixed = re.sub(r",\s*([}\]])", r"\1", candidate)
                try:
                    return json.loads(fixed, strict=False)
                except (json.JSONDecodeError, ValueError):
                    pass

    if first_obj != -1:
        last_obj = text.rfind("}")
        if last_obj > first_obj:
            candidate = text[first_obj : last_obj + 1]
            try:
                return json.loads(candidate, strict=False)
            except (json.JSONDecodeError, ValueError):
                fixed = re.sub(r",\s*([}\]])", r"\1", candidate)
                try:
                    return json.loads(fixed, strict=False)
                except (json.JSONDecodeError, ValueError):
                    pass

    raise ValueError(f"Could not parse JSON from LLM response: {text[:300]}")
