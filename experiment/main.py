import argparse
import random
import time
from typing import Dict, List, Optional, Tuple

from cp_sat import cp_sat_schedule
from eval import evaluate
from greedy import greedy_schedule
from monte_carlo import monte_carlo_schedule
from type import Schedule, SchedulingProblem, Staff, SHIFT_TYPES
from utils import print_summary, save_results_csv, save_schedules_csv, summarize_results


def benchmark(
    problem: SchedulingProblem,
    time_budget: float = 5.0,
    instance_seed: int = 0,
    solver_seed: int = 42,
) -> Tuple[List[Dict[str, object]], Dict[str, Optional[Schedule]]]:
    results: List[Dict[str, object]] = []
    schedules: Dict[str, Optional[Schedule]] = {}

    print("Start Greedy")
    start = time.perf_counter()
    greedy = greedy_schedule(problem)
    elapsed = time.perf_counter() - start
    results.append(
        {
            "algorithm": "Greedy",
            "seconds": elapsed,
            **evaluate(problem, greedy),
            "valid_candidates": "",
            "solver_status": "COMPLETED",
            "optimality_gap": "",
        }
    )
    schedules["Greedy"] = greedy

    print("Start CP-SAT")
    start = time.perf_counter()
    cpsat, status, gap = cp_sat_schedule(problem, time_budget, solver_seed)
    elapsed = time.perf_counter() - start
    results.append(
        {
            "algorithm": "CP-SAT",
            "seconds": elapsed,
            **evaluate(problem, cpsat),
            "valid_candidates": "",
            "solver_status": status,
            "optimality_gap": gap if gap is not None else "",
        }
    )
    schedules["CP-SAT"] = cpsat

    print("Start Monte Carlo")
    start = time.perf_counter()
    monte_carlo, valid_candidates = monte_carlo_schedule(
        problem, time_budget, solver_seed
    )
    elapsed = time.perf_counter() - start
    results.append(
        {
            "algorithm": "Monte Carlo",
            "seconds": elapsed,
            **evaluate(problem, monte_carlo),
            "valid_candidates": valid_candidates,
            "solver_status": "COMPLETED",
            "optimality_gap": "",
        }
    )
    schedules["Monte Carlo"] = monte_carlo

    for result in results:
        result.update(
            instance_seed=instance_seed,
            solver_seed=solver_seed,
            time_budget=time_budget,
        )

    return results, schedules


def build_example_problem(seed: int = 42) -> SchedulingProblem:
    rng = random.Random(seed)
    roster = [
        *[Staff(f"1D{i:03d}", 1) for i in range(1, 11)],
        *[Staff(f"2D{i:03d}", 2) for i in range(1, 7)],
        *[Staff(f"3D{i:03d}", 3) for i in range(1, 5)],
    ]
    num_days = 30

    unavailability = {
        (staff.id, day, shift)
        for staff in roster
        for day in range(1, num_days + 1)
        for shift in SHIFT_TYPES
        if rng.random() < 0.05
    }
    requested_holidays = {
        (staff.id, day)
        for staff in roster
        for day in rng.sample(range(1, num_days + 1), rng.randint(1, 2))
    }
    manual_assignments = {
        (1, "morning"): ["3D001"],
        (5, "night"): ["2D001"],
        (10, "day"): ["3D002"],
        (15, "morning"): ["2D002"],
        (20, "night"): ["3D003"],
    }

    for (day, shift), assigned_doctors in manual_assignments.items():
        for doctor in assigned_doctors:
            unavailability.discard((doctor, day, shift))

    return SchedulingProblem(
        roster=roster,
        num_days=num_days,
        slots_per_shift=4,
        unavailability=unavailability,
        requested_holidays=requested_holidays,
        manual_assignments=manual_assignments,
    )


def run_suite(
    instance_count: int,
    budgets: List[float],
) -> Tuple[List[Dict[str, object]], List[Dict[str, object]]]:
    if instance_count < 1 or not budgets or any(budget <= 0 for budget in budgets):
        raise ValueError("instance_count and all time budgets must be positive")

    results = []
    schedule_results = []
    for instance_seed in range(instance_count):
        problem = build_example_problem(instance_seed)
        daily_slots = len(SHIFT_TYPES) * problem.slots_per_shift
        if len(problem.roster) < daily_slots:
            raise ValueError(f"Instance {instance_seed} needs {daily_slots} doctors")

        solver_seed = 10_000 + instance_seed
        for budget in budgets:
            rows, schedules = benchmark(problem, budget, instance_seed, solver_seed)
            results.extend(rows)
            schedule_results.extend(
                {
                    "algorithm": algorithm,
                    "instance_seed": instance_seed,
                    "solver_seed": solver_seed,
                    "time_budget": budget,
                    "num_days": problem.num_days,
                    "schedule": schedule,
                }
                for algorithm, schedule in schedules.items()
            )

    return results, schedule_results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fair scheduler benchmark")
    parser.add_argument("--instances", type=int, default=1)
    parser.add_argument("--budgets", type=float, nargs="+", default=[0.1, 1.0, 5.0])
    parser.add_argument("--csv", default="scheduler_comparison.csv")
    parser.add_argument("--schedules-csv", default="schedules.csv")
    args = parser.parse_args()

    benchmark_results, schedule_results = run_suite(args.instances, args.budgets)
    save_results_csv(benchmark_results, args.csv)
    save_schedules_csv(schedule_results, args.schedules_csv)
    print_summary(summarize_results(benchmark_results))
