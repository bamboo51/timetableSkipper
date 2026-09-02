import random
import time
from typing import List, Optional, Set, Tuple

from eval import evaluate, validate_hard_constraints
from helpers import doctors, schedule_doctors, senior_doctors
from type import DoctorId, Schedule, SchedulingProblem, SHIFT_TYPES


def _construct_random_valid_candidate(
    problem: SchedulingProblem,
    rng: random.Random,
) -> Optional[Schedule]:
    """
    Construct one random schedule while actively enforcing the hard rules.

    This is NOT CP-SAT. It makes random choices and can reach a dead end.
    If it reaches a dead end, the candidate is discarded.
    """
    doctor_ids = doctors(problem)
    seniors = senior_doctors(problem)

    schedule: Schedule = {
        key: list(value)
        for key, value in problem.manual_assignments.items()
    }

    # Basic manual-assignment sanity.
    for (day, shift), assigned in schedule.items():
        if len(assigned) > problem.slots_per_shift:
            return None
        if len(set(assigned)) != len(assigned):
            return None
        for d in assigned:
            if (d, day, shift) in problem.unavailability:
                return None

    def worked_night(doctor: DoctorId, day: int) -> bool:
        if day < 1:
            return False
        return doctor in schedule_doctors(schedule, day, "night")

    for day in range(1, problem.num_days + 1):
        # All manual assignments for this date count toward daily capacity.
        assigned_today: Set[DoctorId] = set()

        for shift in SHIFT_TYPES:
            for d in schedule_doctors(schedule, day, shift):
                if d in assigned_today:
                    return None
                assigned_today.add(d)

        for shift in SHIFT_TYPES:
            key = (day, shift)
            assigned = list(schedule.get(key, []))

            def eligible_pool(pool: List[DoctorId]) -> List[DoctorId]:
                result = []

                for d in pool:
                    if d in assigned:
                        continue

                    if d in assigned_today:
                        continue

                    if (d, day, shift) in problem.unavailability:
                        continue

                    # Sleep/rest rule.
                    if shift == "morning" and worked_night(d, day - 1):
                        continue

                    # Maximum 2 consecutive nights.
                    if (
                        shift == "night"
                        and worked_night(d, day - 1)
                        and worked_night(d, day - 2)
                    ):
                        continue

                    result.append(d)

                return result

            # Ensure senior coverage.
            if not any(d in seniors for d in assigned):
                eligible_seniors = eligible_pool(sorted(seniors))

                if not eligible_seniors:
                    return None

                chosen = rng.choice(eligible_seniors)
                assigned.append(chosen)
                assigned_today.add(chosen)

            # Fill all remaining slots randomly.
            while len(assigned) < problem.slots_per_shift:
                eligible = eligible_pool(doctor_ids)

                if not eligible:
                    return None

                chosen = rng.choice(eligible)
                assigned.append(chosen)
                assigned_today.add(chosen)

            schedule[key] = assigned

    # Defensive final check.
    if sum(validate_hard_constraints(problem, schedule).values()) != 0:
        return None

    return schedule


def monte_carlo_schedule(
    problem: SchedulingProblem,
    max_time_seconds: float = 5.0,
    random_seed: int = 42,
) -> Tuple[Optional[Schedule], int]:
    if max_time_seconds <= 0:
        raise ValueError("max_time_seconds must be positive")

    rng = random.Random(random_seed)
    deadline = time.perf_counter() + max_time_seconds

    best_schedule = None
    best_score = float("inf")
    valid_candidates = 0

    while time.perf_counter() < deadline:
        candidate = _construct_random_valid_candidate(problem, rng)

        if candidate is None:
            continue

        valid_candidates += 1
        metrics = evaluate(problem, candidate)

        if metrics["score"] < best_score:
            best_score = metrics["score"]
            best_schedule = candidate

    return best_schedule, valid_candidates
