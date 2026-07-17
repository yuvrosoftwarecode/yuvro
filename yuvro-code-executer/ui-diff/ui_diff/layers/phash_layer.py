from __future__ import annotations
from dataclasses import dataclass
import imagehash
from PIL import Image
import numpy as np


@dataclass
class PHashResult:
    score: float      
    hash_distance: int 


class PHashLayer:
    _HASH_BITS = 64

    def __init__(self, cfg: dict):
        self._cfg = cfg

    def run(self, exp_pil: Image.Image, act_pil: Image.Image) -> PHashResult:
        h_exp = imagehash.average_hash(exp_pil)
        h_act = imagehash.average_hash(act_pil)

        distance = int(h_exp - h_act)  # Hamming distance
        score = 1.0 - (distance / self._HASH_BITS)
        score = float(np.clip(score, 0.0, 1.0))

        return PHashResult(score=score, hash_distance=distance)
