from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
import numpy as np
from skimage.metrics import structural_similarity as ssim
import cv2


@dataclass
class SSIMResult:
    score: float                        
    diff_map: Optional[np.ndarray] = None 
class SSIMLayer:
    def __init__(self, cfg: dict):
        self._cfg = cfg

    def run(self, exp_blurred: np.ndarray, act_blurred: np.ndarray) -> SSIMResult:
        exp_gray = cv2.cvtColor(exp_blurred, cv2.COLOR_RGB2GRAY).astype(np.float64)
        act_gray = cv2.cvtColor(act_blurred, cv2.COLOR_RGB2GRAY).astype(np.float64)

        score, diff_map = ssim(
            exp_gray,
            act_gray,
            full=True,
            data_range=255.0,
        )
        diff_map_inv = 1.0 - diff_map
        score = float(np.clip(score, 0.0, 1.0))

        return SSIMResult(score=score, diff_map=diff_map_inv)
