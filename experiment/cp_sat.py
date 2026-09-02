import time
from typing import Optional, Tuple

from ortools.sat.python import cp_model

from helpers import doctors, senior_doctors
from type import Schedule, SchedulingProblem, SHIFT_TYPES


def cp_sat_schedule(
    problem: SchedulingProblem,
    max_time_seconds: float = 5.0,
    random_seed: int = 42,
) -> Tuple[Optional[Schedule], str, Optional[float]]:
    if max_time_seconds <= 0:
        raise ValueError("max_time_seconds must be positive")

    deadline = time.perf_counter() + max_time_seconds
    doctor_ids = doctors(problem)
    seniors = senior_doctors(problem)

    model = cp_model.CpModel()

    # x[d, day, shift] = 1 iff doctor d works that shift.
    x = {}
    for d in doctor_ids:
        for day in range(1, problem.num_days + 1):
            for shift in SHIFT_TYPES:
                x[d, day, shift] = model.new_bool_var(
                    f"x_{d}_{day}_{shift}"
                )

    # HARD 1: exact staffing.
    for day in range(1, problem.num_days + 1):
        for shift in SHIFT_TYPES:
            model.add(
                sum(x[d, day, shift] for d in doctor_ids)
                == problem.slots_per_shift
            )

    # HARD 2: Year 2 or Year 3 on every shift.
    for day in range(1, problem.num_days + 1):
        for shift in SHIFT_TYPES:
            model.add(
                sum(x[d, day, shift] for d in seniors) >= 1
            )

    # HARD 3: one shift maximum per doctor per day.
    for d in doctor_ids:
        for day in range(1, problem.num_days + 1):
            model.add_at_most_one(
                x[d, day, shift] for shift in SHIFT_TYPES
            )

    # HARD 4: availability.
    for d, day, shift in problem.unavailability:
        if d in doctor_ids and 1 <= day <= problem.num_days and shift in SHIFT_TYPES:
            model.add(x[d, day, shift] == 0)

    # HARD 5: fixed/manual assignments.
    for (day, shift), fixed_doctors in problem.manual_assignments.items():
        for d in fixed_doctors:
            model.add(x[d, day, shift] == 1)

    # HARD 6: Night today -> Morning tomorrow forbidden.
    for d in doctor_ids:
        for day in range(1, problem.num_days):
            model.add(
                x[d, day, "night"] + x[d, day + 1, "morning"] <= 1
            )

    # HARD 7: no 3 consecutive night shifts.
    for d in doctor_ids:
        for day in range(1, problem.num_days - 1):
            model.add(
                x[d, day, "night"]
                + x[d, day + 1, "night"]
                + x[d, day + 2, "night"]
                <= 2
            )

    # Total workload per doctor.
    total_work = {}
    for d in doctor_ids:
        total_work[d] = model.new_int_var(
            0, problem.num_days, f"total_{d}"
        )
        model.add(
            total_work[d]
            == sum(
                x[d, day, shift]
                for day in range(1, problem.num_days + 1)
                for shift in SHIFT_TYPES
            )
        )

    max_work = model.new_int_var(0, problem.num_days, "max_work")
    min_work = model.new_int_var(0, problem.num_days, "min_work")
    workload_gap = model.new_int_var(0, problem.num_days, "workload_gap")

    model.add_max_equality(max_work, [total_work[d] for d in doctor_ids])
    model.add_min_equality(min_work, [total_work[d] for d in doctor_ids])
    model.add(workload_gap == max_work - min_work)

    # Night workload.
    night_work = {}
    for d in doctor_ids:
        night_work[d] = model.new_int_var(
            0, problem.num_days, f"nights_{d}"
        )
        model.add(
            night_work[d]
            == sum(
                x[d, day, "night"]
                for day in range(1, problem.num_days + 1)
            )
        )

    max_nights = model.new_int_var(0, problem.num_days, "max_nights")
    min_nights = model.new_int_var(0, problem.num_days, "min_nights")
    night_gap = model.new_int_var(0, problem.num_days, "night_gap")

    model.add_max_equality(max_nights, [night_work[d] for d in doctor_ids])
    model.add_min_equality(min_nights, [night_work[d] for d in doctor_ids])
    model.add(night_gap == max_nights - min_nights)

    # Requested holidays are SOFT.
    holiday_terms = []
    for d, day in problem.requested_holidays:
        for shift in SHIFT_TYPES:
            holiday_terms.append(x[d, day, shift])

    # Same soft objective as common evaluator.
    model.minimize(
        100 * sum(holiday_terms)
        + 10 * workload_gap
        + 5 * night_gap
    )

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = max(0.001, deadline - time.perf_counter())
    solver.parameters.random_seed = random_seed
    solver.parameters.num_search_workers = 1

    status = solver.solve(model)

    status_name = solver.status_name(status)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return None, status_name, None

    schedule: Schedule = {}
    for day in range(1, problem.num_days + 1):
        for shift in SHIFT_TYPES:
            schedule[(day, shift)] = [
                d
                for d in doctor_ids
                if solver.value(x[d, day, shift]) == 1
            ]

    objective = solver.objective_value
    gap = abs(objective - solver.best_objective_bound) / max(1.0, abs(objective))
    return schedule, status_name, gap
