from __future__ import annotations
import numpy as np
import pytest



def _white_canvas(w: int = 800, h: int = 600) -> np.ndarray:
    return np.ones((h, w, 3), dtype=np.uint8) * 255


def _draw_rect(
    canvas: np.ndarray,
    x: int, y: int, w: int, h: int,
    color: tuple[int, int, int] = (30, 80, 200),
) -> np.ndarray:
    out = canvas.copy()
    out[y : y + h, x : x + w] = color
    return out

@pytest.fixture
def near_identical_pair() -> tuple[np.ndarray, np.ndarray]:
    expected = _white_canvas()
    expected = _draw_rect(expected, 50, 50, 200, 80, color=(30, 80, 200))  
    expected = _draw_rect(expected, 50, 160, 120, 60, color=(60, 180, 75)) 
    expected = _draw_rect(expected, 50, 250, 300, 150, color=(220, 220, 220))  
    rng = np.random.default_rng(42)
    noise = rng.integers(-2, 3, expected.shape, dtype=np.int16)
    actual = np.clip(expected.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    return expected, actual


@pytest.fixture
def shifted_element_pair() -> tuple[np.ndarray, np.ndarray]:
    expected = _white_canvas(w=400, h=400)
    expected = _draw_rect(expected, 10, 10, 80, 40, color=(30, 80, 200))  
    expected = _draw_rect(expected, 10, 70, 60, 30, color=(60, 180, 75))    
    expected = _draw_rect(expected, 10, 120, 120, 60, color=(220, 220, 220)) 

    actual = _white_canvas(w=400, h=400)
    # Block A shifted 110px right — zero IoU with expected position
    actual = _draw_rect(actual, 120, 10, 80, 40, color=(30, 80, 200))
    # Block B shifted 110px down — zero IoU with expected position
    actual = _draw_rect(actual, 10, 180, 60, 30, color=(60, 180, 75))
    actual = _draw_rect(actual, 10, 120, 120, 60, color=(220, 220, 220))   

    return expected, actual


@pytest.fixture
def wrong_color_pair() -> tuple[np.ndarray, np.ndarray]:
    expected = _white_canvas()
    expected = _draw_rect(expected, 50, 50, 200, 80, color=(30, 80, 200))   
    expected = _draw_rect(expected, 50, 160, 120, 60, color=(60, 180, 75))  
    expected = _draw_rect(expected, 50, 250, 300, 150, color=(220, 220, 220))  

    actual = _white_canvas()
    actual = _draw_rect(actual, 50, 50, 200, 80, color=(200, 30, 30))      
    actual = _draw_rect(actual, 50, 160, 120, 60, color=(60, 180, 75))     
    actual = _draw_rect(actual, 50, 250, 300, 150, color=(220, 220, 220))  

    return expected, actual


@pytest.fixture
def missing_element_pair() -> tuple[np.ndarray, np.ndarray]:
    expected = _white_canvas()
    expected = _draw_rect(expected, 50, 50, 200, 80, color=(30, 80, 200))   
    expected = _draw_rect(expected, 50, 160, 120, 60, color=(60, 180, 75))  
    expected = _draw_rect(expected, 50, 250, 300, 150, color=(220, 220, 220))  

    actual = _white_canvas()
    actual = _draw_rect(actual, 50, 50, 200, 80, color=(30, 80, 200))      
    actual = _draw_rect(actual, 50, 250, 300, 150, color=(220, 220, 220))  

    return expected, actual
