from __future__ import annotations
from dataclasses import dataclass


@dataclass
class TextResult:
    score: float = 1.0   
    enabled: bool = False
    message: str = "Text layer is disabled by default."


class TextLayer:
    def __init__(self, cfg: dict):
        self._enabled = cfg.get("text", {}).get("enabled", False)

    def run(self, exp_arr, act_arr) -> TextResult:
        if not self._enabled:
            return TextResult()
        # Future: integrate easyocr / pytesseract here
        raise NotImplementedError(
            "Text layer is not yet implemented. "
            "Enable it only for static-copy validation where dynamic text is masked."
        )
