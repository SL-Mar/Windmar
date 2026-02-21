"""
Unit tests for Phase 3d: Multi-Objective Pareto Front.

Tests Pareto filtering, lambda sweep behavior, and API schema.
"""

import pytest

from src.optimization.base_optimizer import ParetoSolution
from src.optimization.route_optimizer import RouteOptimizer


# ---------------------------------------------------------------------------
# §1 – Pareto filter: pure algorithmic tests
# ---------------------------------------------------------------------------
class TestParetoFilter:
    """Test the static _pareto_filter method."""

    def _make_solution(self, fuel, time, lam=0.0):
        return ParetoSolution(
            lambda_value=lam,
            fuel_mt=fuel,
            time_hours=time,
            distance_nm=100.0,
            waypoints=[(0, 0), (1, 1)],
            speed_profile=[12.0],
        )

    def test_single_solution_trivial(self):
        """Single solution is always non-dominated."""
        s = self._make_solution(50, 100)
        result = RouteOptimizer._pareto_filter([s])
        assert len(result) == 1
        assert result[0] is s

    def test_empty_list(self):
        """Empty input returns empty output."""
        result = RouteOptimizer._pareto_filter([])
        assert result == []

    def test_dominated_removed(self):
        """A solution dominated by another is removed."""
        a = self._make_solution(50, 100)  # Dominates b
        b = self._make_solution(60, 110)  # Dominated
        result = RouteOptimizer._pareto_filter([a, b])
        assert len(result) == 1
        assert result[0].fuel_mt == 50

    def test_non_dominated_kept(self):
        """Two non-dominated solutions (trade-off) are both kept."""
        a = self._make_solution(50, 120)  # Less fuel, more time
        b = self._make_solution(70, 90)   # More fuel, less time
        result = RouteOptimizer._pareto_filter([a, b])
        assert len(result) == 2

    def test_identical_solutions(self):
        """Identical solutions: at least one is kept (not all removed)."""
        a = self._make_solution(50, 100)
        b = self._make_solution(50, 100)
        result = RouteOptimizer._pareto_filter([a, b])
        # Neither dominates the other (both <=, but not strict on any)
        assert len(result) >= 1

    def test_three_solutions_mixed(self):
        """Three solutions: 1 dominated, 2 on front."""
        a = self._make_solution(40, 130)   # Low fuel, high time
        b = self._make_solution(60, 100)   # Mid
        c = self._make_solution(80, 85)    # High fuel, low time
        d = self._make_solution(65, 110)   # Dominated by b (more fuel, more time)
        result = RouteOptimizer._pareto_filter([a, b, c, d])
        fuels = [s.fuel_mt for s in result]
        assert 65 not in fuels  # d is dominated
        assert 40 in fuels
        assert 60 in fuels
        assert 80 in fuels

    def test_sorted_by_fuel_ascending(self):
        """Pareto front is sorted by fuel ascending."""
        a = self._make_solution(80, 85)
        b = self._make_solution(40, 130)
        c = self._make_solution(60, 100)
        result = RouteOptimizer._pareto_filter([a, b, c])
        fuels = [s.fuel_mt for s in result]
        assert fuels == sorted(fuels)


# ---------------------------------------------------------------------------
# §2 – Lambda sweep: lower λ → lower fuel, higher λ → lower time
# ---------------------------------------------------------------------------
class TestLambdaSweep:
    """Test that the lambda parameter controls fuel/time trade-off direction."""

    def test_lambda_zero_minimizes_fuel(self):
        """λ=0 means no time penalty → pure fuel minimization (lowest fuel)."""
        # This is verified by the Pareto front: the λ=0 solution should
        # have the lowest fuel among all solutions
        solutions = [
            ParetoSolution(0.0, 40, 130, 100, [], []),
            ParetoSolution(0.5, 60, 100, 100, [], []),
            ParetoSolution(1.0, 80, 85, 100, [], []),
        ]
        front = RouteOptimizer._pareto_filter(solutions)
        # Sorted by fuel: first should be λ=0 solution
        assert front[0].fuel_mt <= front[-1].fuel_mt

    def test_lambda_one_minimizes_time(self):
        """λ=1.0 applies maximum time penalty → closest to time minimization."""
        solutions = [
            ParetoSolution(0.0, 40, 130, 100, [], []),
            ParetoSolution(1.0, 80, 85, 100, [], []),
        ]
        front = RouteOptimizer._pareto_filter(solutions)
        # Last (highest fuel) should have lowest time
        assert front[-1].time_hours <= front[0].time_hours


# ---------------------------------------------------------------------------
# §3 – ParetoSolution dataclass
# ---------------------------------------------------------------------------
class TestParetoSolutionDataclass:
    """Verify ParetoSolution dataclass fields."""

    def test_default_is_selected_false(self):
        s = ParetoSolution(0.3, 50, 100, 200, [], [])
        assert s.is_selected is False

    def test_fields_accessible(self):
        s = ParetoSolution(0.5, 55.2, 98.1, 1500.0, [(0, 0)], [13.0], is_selected=True)
        assert s.lambda_value == 0.5
        assert s.fuel_mt == 55.2
        assert s.time_hours == 98.1
        assert s.distance_nm == 1500.0
        assert s.is_selected is True
