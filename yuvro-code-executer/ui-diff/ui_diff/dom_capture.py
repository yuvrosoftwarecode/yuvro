from __future__ import annotations
from dataclasses import dataclass
from typing import Optional
from .layers.position_layer import BBox


@dataclass
class DOMCaptureResult:
    boxes: list[BBox]
    source: str  


def capture_dom_boxes(
    url: str,
    selector: str = "*",
    timeout_ms: int = 10_000,
) -> DOMCaptureResult:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise ImportError(
            "playwright is not installed. Run: pip install playwright && playwright install chromium"
        )

    boxes: list[BBox] = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto(url, timeout=timeout_ms)
            page.wait_for_load_state("networkidle", timeout=timeout_ms)
        except Exception as e:
            browser.close()
            raise RuntimeError(f"Failed to navigate to {url}: {e}")

        elements = page.query_selector_all(selector)
        for el in elements:
            try:
                bb = el.bounding_box()
                if bb and bb["width"] > 0 and bb["height"] > 0:
                    boxes.append(BBox(
                        x=int(bb["x"]),
                        y=int(bb["y"]),
                        w=int(bb["width"]),
                        h=int(bb["height"]),
                    ))
            except Exception:
                continue
        browser.close()

    return DOMCaptureResult(boxes=boxes, source="playwright")
