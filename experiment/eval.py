from collections import Counter
from typing import Dict, Optional

from helpers import (
    doctors,
    holiday_violations,
    night_counts,
    schedule_doctors,
    senior_doctors,
    total_counts,
)
from type import Schedule, SchedulingProblem, SHIFT_TYPES

def validate_hard_constraints(
    problem: SchedulingProblem,
    schedule: Schedule,
) -> Dict[str, int]:
    """
    Count hard-constraint violations.

    Hard constraints used for the comparison:
      - exactly slots_per_shift doctors per shift
      - no duplicate doctor inside one shift
      - at least one Year 2/3 doctor per shift
      - respect exact-shift unavailability
      - at most one shift per doctor per day
      - no Night(day) -> Morning(day+1)
      - no 3 consecutive night shifts
      - preserve manual assignments
    """
    known_doctors = set(doctors(problem))
    seniors = senior_doctors(problem)

    violations = Counter()

    # Shift-level checks.
    for day in range(1, problem.num_days + 1):
        for shift in SHIFT_TYPES:
            assigned = schedule_doctors(schedule, day, shift)

            if len(assigned) != problem.slots_per_shift:
                violations["wrong_staff_count"] += abs(
                    len(assigned) - problem.slots_per_shift
                )

            if len(set(assigned)) != len(assigned):
                violations["duplicate_in_shift"] += (
                    len(assigned) - len(set(assigned))
                )

            unknown = [d for d in assigned if d not in known_doctors]
            violations["unknown_doctor"] += len(unknown)

            if not any(d in seniors for d in assigned):
                violations["missing_senior"] += 1

            for d in assigned:
                if (d, day, shift) in problem.unavailability:
                    violations["unavailable_assignment"] += 1

    # At most one shift per day.
    for day in range(1, problem.num_days + 1):
        per_day = Counter()
        for shift in SHIFT_TYPES:
            per_day.update(schedule_doctors(schedule, day, shift))

        for count in per_day.values():
            if count > 1:
                violations["multiple_shifts_same_day"] += count - 1

    # Night -> next morning.
    for day in range(1, problem.num_days):
        night_today = set(schedule_doctors(schedule, day, "night"))
        morning_tomorrow = set(schedule_doctors(schedule, day + 1, "morning"))
        violations["night_to_morning"] += len(
            night_today.intersection(morning_tomorrow)
        )

    # No 3 consecutive nights.
    for doctor in known_doctors:
        for day in range(1, problem.num_days - 1):
            if (
                doctor in schedule_doctors(schedule, day, "night")
                and doctor in schedule_doctors(schedule, day + 1, "night")
                and doctor in schedule_doctors(schedule, day + 2, "night")
            ):
                violations["three_consecutive_nights"] += 1

    # Fixed/manual assignments.
    for (day, shift), fixed_doctors in problem.manual_assignments.items():
        assigned = schedule_doctors(schedule, day, shift)
        for d in fixed_doctors:
            if d not in assigned:
                violations["manual_assignment_lost"] += 1

    return dict(violations)


def evaluate(problem: SchedulingProblem, schedule: Optional[Schedule]) -> Dict[str, object]:
    if schedule is None:
        return {
            "feasible": False,
            "hard_violations": 10**9,
            "holiday_violations": 10**9,
            "workload_gap": 10**9,
            "night_gap": 10**9,
            "score": float("inf"),
            "hard_breakdown": {},
        }

    hard_breakdown = validate_hard_constraints(problem, schedule)
    hard_total = sum(hard_breakdown.values())

    work = total_counts(problem, schedule)
    nights = night_counts(problem, schedule)

    workload_gap = max(work.values()) - min(work.values())
    night_gap = max(nights.values()) - min(nights.values())
    holidays = holiday_violations(problem, schedule)

    # Invalid schedules do not compete on soft quality. Among valid schedules:
    #   requested holiday violation = 100
    #   workload imbalance          = 10 per gap
    #   night-shift imbalance       = 5 per gap
    score = (
        100 * holidays + 10 * workload_gap + 5 * night_gap
        if hard_total == 0
        else float("inf")
    )

    return {
        "feasible": hard_total == 0,
        "hard_violations": hard_total,
        "holiday_violations": holidays,
        "workload_gap": workload_gap,
        "night_gap": night_gap,
        "score": score,
        "hard_breakdown": hard_breakdown,
        "workload": work,
        "night_counts": nights,
    }
