from __future__ import annotations
import pathlib
from typing import Optional, Union
import numpy as np
from PIL import Image
from .preprocess import preprocess_pair
from .layers.ssim_layer import SSIMLayer
from .layers.phash_layer import PHashLayer
from .layers.position_layer import PositionLayer
from .layers.color_layer import ColorLayer
from .fusion import fuse_scores
from .report import CompareResult, generate_report
from ._config import load_config


def compare(
    expected: Union[str, pathlib.Path, Image.Image, np.ndarray],
    actual: Union[str, pathlib.Path, Image.Image, np.ndarray],
    config: Union[str, pathlib.Path, dict, None] = None,
    ignore_regions: Optional[list[dict]] = None,
    diff_image_path: Optional[Union[str, pathlib.Path]] = None,
    output_path: Optional[Union[str, pathlib.Path]] = None,
) -> CompareResult:
    cfg = load_config(config)
    cfg_regions = cfg.get("ignore_regions", []) or []
    all_ignore = cfg_regions + (ignore_regions or [])
    exp_img, act_img, exp_arr, act_arr, masked_exp, masked_act = preprocess_pair(
        expected, actual, cfg, all_ignore
    )

    if np.array_equal(exp_arr, act_arr):
        return CompareResult(
            confidence_score=100.0,
            layers={"ssim": 1.0, "phash": 1.0, "position_match": 1.0, "color_match": 1.0},
            issues=[],
            has_critical_failures=False,
            diff_image_path=str(diff_image_path) if diff_image_path else None,
            report_path=str(output_path) if output_path else None,
        )

    ssim_result = SSIMLayer(cfg).run(masked_exp, masked_act)
    phash_result = PHashLayer(cfg).run(exp_img, act_img)
    position_result = PositionLayer(cfg).run(exp_arr, act_arr)
    color_result = ColorLayer(cfg).run(exp_arr, act_arr, position_result.matched_pairs)
    fused = fuse_scores(cfg, ssim_result, phash_result, position_result, color_result)
    result = generate_report(
        cfg=cfg,
        fused=fused,
        ssim_result=ssim_result,
        phash_result=phash_result,
        position_result=position_result,
        color_result=color_result,
        exp_arr=exp_arr,
        act_arr=act_arr,
        diff_image_path=diff_image_path,
        output_path=output_path,
    )

    return result


__all__ = ["compare", "CompareResult"]
