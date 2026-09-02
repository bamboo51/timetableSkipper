from collections import Counter, defaultdict
from typing import Dict, List, Optional, Set

from helpers import doctor_map, doctors
from type import DoctorId, Schedule, SchedulingProblem, Shift, SHIFT_TYPES

def greedy_schedule(problem: SchedulingProblem) -> Schedule:
    """
    Greedy baseline using the same hard constraints and soft preferences as
    the other algorithms. It may leave a slot empty if no valid choice exists.
    """
    doctor_ids = doctors(problem)
    staff_by_id = doctor_map(problem)

    roster_by_level = {
        1: [s.id for s in problem.roster if s.level == 1],
        2: [s.id for s in problem.roster if s.level == 2],
        3: [s.id for s in problem.roster if s.level == 3],
    }

    # Copy fixed/manual assignments.
    schedule: Schedule = {
        key: list(value)
        for key, value in problem.manual_assignments.items()
    }

    total = Counter()
    by_shift_type: Dict[DoctorId, Counter] = defaultdict(Counter)

    for (day, shift), assigned in schedule.items():
        for doctor in assigned:
            total[doctor] += 1
            by_shift_type[doctor][shift] += 1

    def rank(doctor: DoctorId, day: int, shift: Shift):
        return (
            (doctor, day) in problem.requested_holidays,
            total[doctor],
            by_shift_type[doctor][shift],
            doctor,
        )

    def pick_best(
        candidates: List[DoctorId], day: int, shift: Shift
    ) -> Optional[DoctorId]:
        if not candidates:
            return None
        return min(candidates, key=lambda d: rank(d, day, shift))

    for day in range(1, problem.num_days + 1):
        assigned_today: Set[DoctorId] = {
            doctor
            for shift in SHIFT_TYPES
            for doctor in schedule.get((day, shift), [])
        }

        for shift in SHIFT_TYPES:
            key = (day, shift)
            assigned = list(schedule.get(key, []))

            def candidates_for(pool: List[DoctorId]) -> List[DoctorId]:
                already_in_shift = set(assigned)
                return [
                    doctor
                    for doctor in pool
                    if doctor not in already_in_shift
                    and doctor not in assigned_today
                    and (doctor, day, shift) not in problem.unavailability
                    and not (
                        shift == "morning"
                        and doctor in schedule.get((day - 1, "night"), [])
                    )
                    and not (
                        shift == "night"
                        and doctor in schedule.get((day - 1, "night"), [])
                        and doctor in schedule.get((day - 2, "night"), [])
                    )
                ]

            # Senior coverage.
            coverage_ok = any(
                staff_by_id[d].level >= 2
                for d in assigned
                if d in staff_by_id
            )

            if not coverage_ok and len(assigned) < problem.slots_per_shift:
                senior_pool = roster_by_level[3] + roster_by_level[2]
                eligible = candidates_for(senior_pool)
                chosen = pick_best(eligible, day, shift)

                if chosen is not None:
                    assigned.append(chosen)
                    total[chosen] += 1
                    by_shift_type[chosen][shift] += 1
                    assigned_today.add(chosen)

            # Fill remaining slots.
            while len(assigned) < problem.slots_per_shift:
                eligible = candidates_for(doctor_ids)
                chosen = pick_best(eligible, day, shift)

                if chosen is None:
                    break

                assigned.append(chosen)
                total[chosen] += 1
                by_shift_type[chosen][shift] += 1
                assigned_today.add(chosen)

            schedule[key] = assigned

    return schedule
