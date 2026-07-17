from __future__ import annotations
import pytest
import numpy as np
from ui_diff import compare
from ui_diff._config import load_config

def _run(expected: np.ndarray, actual: np.ndarray, cfg_overrides: dict = None) -> "CompareResult":
    cfg = load_config(cfg_overrides)
    return compare(expected=expected, actual=actual, config=cfg)

class TestNearIdentical:
    def test_confidence_score_is_high(self, near_identical_pair):
        expected, actual = near_identical_pair
        result = _run(expected, actual)
        assert result.confidence_score >= 85, (
            f"Near-identical pair scored {result.confidence_score:.1f} — expected >= 85. "
            f"Issues: {result.issues}"
        )

    def test_no_missing_elements(self, near_identical_pair):
        expected, actual = near_identical_pair
        result = _run(expected, actual)
        missing = [i for i in result.issues if i["type"] == "missing_element"]
        assert len(missing) == 0, f"Unexpected missing elements: {missing}"

    def test_position_score_high(self, near_identical_pair):
        expected, actual = near_identical_pair
        result = _run(expected, actual)
        assert result.layers["position_match"] >= 0.80, (
            f"Position score {result.layers['position_match']:.4f} too low for near-identical pair."
        )

    def test_color_score_high(self, near_identical_pair):
        expected, actual = near_identical_pair
        result = _run(expected, actual)
        assert result.layers["color_match"] >= 0.80, (
            f"Color score {result.layers['color_match']:.4f} too low for near-identical pair."
        )


class TestShiftedElement:
    def test_confidence_score_drops(self, shifted_element_pair):
        expected, actual = shifted_element_pair
        result = _run(expected, actual)
        assert result.confidence_score < 85, (
            f"Shifted pair scored {result.confidence_score:.1f} — expected < 85."
        )

    def test_position_issue_detected(self, shifted_element_pair):
        expected, actual = shifted_element_pair
        result = _run(expected, actual)
        pos_issues = [i for i in result.issues if i["type"] == "position_shift"]
        assert len(pos_issues) > 0, (
            f"No position_shift issue detected for 40px shifted element. "
            f"Issues found: {[i['type'] for i in result.issues]}"
        )

    def test_position_score_lower_than_near_identical(
        self, shifted_element_pair, near_identical_pair
    ):
        exp_ni, act_ni = near_identical_pair
        exp_sh, act_sh = shifted_element_pair
        r_ni = _run(exp_ni, act_ni)
        r_sh = _run(exp_sh, act_sh)
        assert r_sh.layers["position_match"] < r_ni.layers["position_match"], (
            f"Shifted pair position score ({r_sh.layers['position_match']:.4f}) "
            f"should be < near-identical ({r_ni.layers['position_match']:.4f})"
        )


class TestWrongColor:
    def test_color_issue_detected(self, wrong_color_pair):
        expected, actual = wrong_color_pair
        result = _run(expected, actual)
        color_issues = [i for i in result.issues if i["type"] == "color_mismatch"]
        assert len(color_issues) > 0, (
            f"No color_mismatch detected for blue→red change. "
            f"Issues: {[i['type'] for i in result.issues]}"
        )

    def test_color_score_lower_than_near_identical(
        self, wrong_color_pair, near_identical_pair
    ):
        exp_ni, act_ni = near_identical_pair
        exp_wc, act_wc = wrong_color_pair
        r_ni = _run(exp_ni, act_ni)
        r_wc = _run(exp_wc, act_wc)
        assert r_wc.layers["color_match"] < r_ni.layers["color_match"], (
            f"Wrong-color pair color score ({r_wc.layers['color_match']:.4f}) "
            f"should be < near-identical ({r_ni.layers['color_match']:.4f})"
        )

    def test_delta_e_value_reported(self, wrong_color_pair):
        expected, actual = wrong_color_pair
        result = _run(expected, actual)
        color_issues = [i for i in result.issues if i["type"] == "color_mismatch"]
        if color_issues:
            assert "delta_e" in color_issues[0], "delta_e missing from color issue"
            assert color_issues[0]["delta_e"] > 5.0, (
                f"Expected large delta_e for blue→red, got {color_issues[0]['delta_e']}"
            )

class TestMissingElement:
    def test_missing_element_flagged(self, missing_element_pair):
        expected, actual = missing_element_pair
        result = _run(expected, actual)
        missing = [i for i in result.issues if i["type"] == "missing_element"]
        assert len(missing) > 0, (
            f"No missing_element issue detected. "
            f"Issues: {[i['type'] for i in result.issues]}"
        )

    def test_confidence_score_drops(self, missing_element_pair):
        expected, actual = missing_element_pair
        result = _run(expected, actual)
        assert result.confidence_score < 92, (
            f"Missing-element pair scored {result.confidence_score:.1f} — expected < 92."
        )

    def test_position_score_penalized(self, missing_element_pair):
        expected, actual = missing_element_pair
        result = _run(expected, actual)
        assert result.layers["position_match"] < 1.0, (
            "Position score should not be 1.0 when an element is missing."
        )


class TestReportSchema:
    def test_result_has_required_fields(self, near_identical_pair):
        expected, actual = near_identical_pair
        result = _run(expected, actual)
        d = result.to_dict()
        assert "confidence_score" in d
        assert "layers" in d
        assert "ssim" in d["layers"]
        assert "phash" in d["layers"]
        assert "position_match" in d["layers"]
        assert "color_match" in d["layers"]

    def test_confidence_score_in_range(self, near_identical_pair):
        expected, actual = near_identical_pair
        result = _run(expected, actual)
        assert 0 <= result.confidence_score <= 100

    def test_layer_scores_in_range(self, near_identical_pair):
        expected, actual = near_identical_pair
        result = _run(expected, actual)
        for name, val in result.layers.items():
            assert 0.0 <= val <= 1.0, f"Layer {name} score {val} out of [0, 1]"

    def test_text_not_in_score(self, near_identical_pair):
        expected, actual = near_identical_pair
        result = _run(expected, actual)
        assert "text" not in result.layers, (
            "Text layer must not be included in default scoring."
        )
