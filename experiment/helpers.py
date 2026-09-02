from typing import Dict, List, Set

from type import Day, DoctorId, Schedule, SchedulingProblem, Shift, Staff, SHIFT_TYPES

def doctor_map(problem: SchedulingProblem) -> Dict[DoctorId, Staff]:
    return {staff.id: staff for staff in problem.roster}


def doctors(problem: SchedulingProblem) -> List[DoctorId]:
    return [staff.id for staff in problem.roster]


def senior_doctors(problem: SchedulingProblem) -> Set[DoctorId]:
    # Your rule: Year 2 OR Year 3 must be present.
    return {staff.id for staff in problem.roster if staff.level >= 2}


def schedule_doctors(schedule: Schedule, day: Day, shift: Shift) -> List[DoctorId]:
    return schedule.get((day, shift), [])


def total_counts(problem: SchedulingProblem, schedule: Schedule) -> Dict[DoctorId, int]:
    counts = {d: 0 for d in doctors(problem)}
    for assigned in schedule.values():
        for d in assigned:
            if d in counts:
                counts[d] += 1
    return counts


def night_counts(problem: SchedulingProblem, schedule: Schedule) -> Dict[DoctorId, int]:
    counts = {d: 0 for d in doctors(problem)}
    for day in range(1, problem.num_days + 1):
        for d in schedule_doctors(schedule, day, "night"):
            if d in counts:
                counts[d] += 1
    return counts


def holiday_violations(problem: SchedulingProblem, schedule: Schedule) -> int:
    violations = 0
    for doctor, day in problem.requested_holidays:
        for shift in SHIFT_TYPES:
            if doctor in schedule_doctors(schedule, day, shift):
                violations += 1
    return violations
