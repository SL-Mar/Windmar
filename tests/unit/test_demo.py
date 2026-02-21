"""Tests for demo mode helpers."""
import pytest
from unittest.mock import patch

from api.demo import limit_demo_frames


class TestLimitDemoFrames:
    """Tests for limit_demo_frames()."""

    def test_filters_frames_to_step_12(self):
        result = {
            "cached_hours": 41,
            "frames": {str(h): {"data": h} for h in range(0, 121, 3)},
        }
        filtered = limit_demo_frames(result)
        assert set(filtered["frames"].keys()) == {
            "0", "12", "24", "36", "48", "60", "72", "84", "96", "108", "120"
        }
        assert filtered["cached_hours"] == 11

    def test_custom_step(self):
        result = {
            "frames": {str(h): {} for h in range(0, 121, 3)},
        }
        with patch("api.demo.settings") as mock_settings:
            mock_settings.demo_forecast_step = 24
            filtered = limit_demo_frames(result)
        assert set(filtered["frames"].keys()) == {
            "0", "24", "48", "72", "96", "120"
        }

    def test_passthrough_non_dict(self):
        from starlette.responses import Response
        resp = Response(content=b"test")
        assert limit_demo_frames(resp) is resp

    def test_passthrough_no_frames_key(self):
        result = {"data": "something"}
        assert limit_demo_frames(result) is result

    def test_empty_frames(self):
        result = {"frames": {}, "cached_hours": 0}
        filtered = limit_demo_frames(result)
        assert filtered["frames"] == {}
        assert filtered["cached_hours"] == 0
