from dataclasses import dataclass, field
from typing import Dict, List, Set, Tuple

SHIFT_TYPES = ("morning", "day", "night")

DoctorId = str
Shift = str
Day = int
ScheduleKey = Tuple[Day, Shift]
Schedule = Dict[ScheduleKey, List[DoctorId]]

@dataclass(frozen=True)
class Staff:
    id: DoctorId
    level: int

@dataclass
class SchedulingProblem:
    roster: List[Staff]
    num_days: int
    slots_per_shift: int = 3

    # HARD: doctor cannot work this exact day + shift
    unavailability: Set[Tuple[DoctorId, Day, Shift]] = field(default_factory=set)

    # SOFT: doctor would prefer the whole day off
    requested_holidays: Set[Tuple[DoctorId, Day]] = field(default_factory=set)

    # HARD: these assigments are fixed and must remain
    manual_assignments: Dict[ScheduleKey, List[DoctorId]] = field(default_factory=dict)
