import base64
import os
import tempfile
import sys
from django.conf import settings
import io

try:
    from bs4 import BeautifulSoup
    _bs4_available = True
except ImportError:
    _bs4_available = False

try:
    from PIL import Image
    _pil_available = True
except ImportError:
    _pil_available = False

ui_diff_path = os.path.join(settings.BASE_DIR, '..', 'yuvro-code-executer', 'ui-diff')
if ui_diff_path not in sys.path:
    sys.path.insert(0, ui_diff_path)

try:
    from ui_diff import compare
except ImportError:
    compare = None


def render_html_screenshot(html_content: str, css_content: str, width: int = 1280, height: int = 800) -> bytes:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise RuntimeError("Playwright is not installed. Please install it to use the frontend validator.")

    html_with_css = html_content
    css_tag = f"<style>{css_content}</style>"
    if "<head>" in html_with_css:
        html_with_css = html_with_css.replace("</head>", f"{css_tag}</head>")
    else:
        html_with_css = f"{css_tag}{html_with_css}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": width, "height": height})
        page.set_content(html_with_css)
        page.wait_for_timeout(500)
        screenshot_bytes = page.screenshot(full_page=True)
        browser.close()
        
    return screenshot_bytes

def ui_diff_score(base_img_bytes: bytes, user_img_bytes: bytes) -> tuple[float, str]:
    if compare is None:
        return 0.0, ""


    try:
        base_pil = Image.open(io.BytesIO(base_img_bytes)).convert("RGB")
        user_pil = Image.open(io.BytesIO(user_img_bytes)).convert("RGB")
        
        with tempfile.TemporaryDirectory() as tmpdir:
            diff_path = os.path.join(tmpdir, "diff.png")
            result = compare(
                expected=base_pil,
                actual=user_pil,
                diff_image_path=diff_path
            )
            
            diff_b64 = ""
            if os.path.exists(diff_path):
                with open(diff_path, "rb") as f:
                    diff_b64 = base64.b64encode(f.read()).decode("utf-8")
                    
            return result.confidence_score, diff_b64
    except Exception as e:
        print(f"Error in ui_diff_score: {e}")
        return 0.0, ""

def structural_validate(base_html: str, user_html: str) -> dict:
    if not _bs4_available:
        return {"score": 0, "checks": [{"name": "BeautifulSoup4 not installed", "passed": False, "reason": "Install bs4 in the backend container"}]}
    try:
        base_soup = BeautifulSoup(base_html, 'html.parser')
        user_soup = BeautifulSoup(user_html, 'html.parser')
    except Exception:
        return {"score": 0, "feedback": ["Failed to parse HTML"]}

    checks = []
    passed_checks = 0
    total_checks = 0

    expected_tags = set([tag.name for tag in base_soup.find_all(True) if tag.name not in ['html', 'head', 'meta', 'title', 'body', 'link', 'style', 'script']])
    user_tags = set([tag.name for tag in user_soup.find_all(True)])
    
    if expected_tags:
        for tag in expected_tags:
            total_checks += 1
            if tag in user_tags:
                passed_checks += 1
                checks.append({"name": f"Contains <{tag}> element", "passed": True, "reason": "Found"})
            else:
                checks.append({"name": f"Contains <{tag}> element", "passed": False, "reason": "Missing"})

    expected_classes = set()
    for tag in base_soup.find_all(True):
        classes = tag.get('class')
        if classes:
            expected_classes.update(classes)
            
    user_classes = set()
    for tag in user_soup.find_all(True):
        classes = tag.get('class')
        if classes:
            user_classes.update(classes)

    if expected_classes:
        for cls in expected_classes:
            total_checks += 1
            if cls in user_classes:
                passed_checks += 1
                checks.append({"name": f"Contains class '{cls}'", "passed": True, "reason": "Found"})
            else:
                checks.append({"name": f"Contains class '{cls}'", "passed": False, "reason": "Missing"})
                
    score = (passed_checks / total_checks * 100) if total_checks > 0 else 100.0
    
    return {
        "score": score,
        "checks": checks
    }

def validate_frontend_ticket(ticket_id: str, user_html: str, user_css: str, base_html: str, base_css: str) -> dict:
    try:
        # 1. Render screenshots
        base_img = render_html_screenshot(base_html, base_css)
        user_img = render_html_screenshot(user_html, user_css)
        
        # 2. Compare screenshots
        ui_score, diff_b64 = ui_diff_score(base_img, user_img)
        
        # 3. Structural validation
        structural_result = structural_validate(base_html, user_html)
        
        base_b64 = base64.b64encode(base_img).decode("utf-8")
        user_b64 = base64.b64encode(user_img).decode("utf-8")
        
        return {
            "ui_score": ui_score,
            "structural_score": structural_result["score"],
            "checks": structural_result["checks"],
            "base_img_b64": base_b64,
            "user_img_b64": user_b64,
            "diff_img_b64": diff_b64
        }
    except Exception as e:
        return {
            "error": str(e),
            "ui_score": 0,
            "structural_score": 0,
            "checks": [{"name": "Execution", "passed": False, "reason": str(e)}],
            "base_img_b64": None,
            "user_img_b64": None,
            "diff_img_b64": None
        }
