import csv
from statistics import median
from typing import Dict, List, Optional

from helpers import schedule_doctors
from type import Schedule, SHIFT_TYPES

def save_results_csv(
    results: List[Dict[str, object]],
    path: str = "scheduler_comparison.csv",
) -> None:
    fields = [
        "algorithm",
        "instance_seed",
        "solver_seed",
        "time_budget",
        "feasible",
        "seconds",
        "hard_violations",
        "holiday_violations",
        "workload_gap",
        "night_gap",
        "score",
        "valid_candidates",
        "solver_status",
        "optimality_gap",
    ]

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()

        for result in results:
            writer.writerow(
                {field: result.get(field, "") for field in fields}
            )

    print(f"Saved benchmark table to: {path}")


def save_schedules_csv(results: List[Dict[str, object]], path: str) -> None:
    fields = [
        "algorithm",
        "instance_seed",
        "solver_seed",
        "time_budget",
        "schedule_found",
        "day",
        "shift",
        "doctors",
    ]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for result in results:
            schedule = result["schedule"]
            for day in range(1, int(result["num_days"]) + 1):
                for shift in SHIFT_TYPES:
                    writer.writerow(
                        {
                            **{field: result[field] for field in fields[:4]},
                            "schedule_found": schedule is not None,
                            "day": day,
                            "shift": shift,
                            "doctors": ";".join(schedule_doctors(schedule, day, shift))
                            if schedule is not None
                            else "",
                        }
                    )

    print(f"Saved schedules to: {path}")


def summarize_results(results: List[Dict[str, object]]) -> List[Dict[str, object]]:
    groups = {}
    for row in results:
        groups.setdefault((row["algorithm"], row["time_budget"]), []).append(row)

    summary = []
    for (algorithm, budget), rows in sorted(groups.items(), key=lambda item: item[0]):
        feasible = [row for row in rows if row["feasible"]]
        summary.append(
            {
                "algorithm": algorithm,
                "budget": budget,
                "feasible_rate": len(feasible) / len(rows),
                "median_seconds": median(row["seconds"] for row in rows),
                "worst_hard": max(row["hard_violations"] for row in rows),
                "median_score": median(row["score"] for row in feasible)
                if feasible
                else float("inf"),
                "worst_score": max(row["score"] for row in feasible)
                if feasible
                else float("inf"),
            }
        )
    return summary


def print_summary(summary: List[Dict[str, object]]) -> None:
    print("\nAlgorithm   Budget  Feasible  Median(s)  Worst hard  Median score  Worst score")
    for row in summary:
        print(
            f'{row["algorithm"]:<11} {row["budget"]:>6g}  '
            f'{row["feasible_rate"]:>7.0%}  {row["median_seconds"]:>9.3f}  '
            f'{row["worst_hard"]:>10}  {row["median_score"]:>12g}  '
            f'{row["worst_score"]:>11g}'
        )


def print_results(results: List[Dict[str, object]]) -> None:
    headers = [
        "Algorithm",
        "Feasible",
        "Time(s)",
        "Hard",
        "Holiday",
        "WorkGap",
        "NightGap",
        "Score",
        "MC valid",
    ]

    rows = []
    for r in results:
        score = r["score"]
        score_display = "inf" if score == float("inf") else str(score)

        rows.append(
            [
                str(r["algorithm"]),
                "YES" if r["feasible"] else "NO",
                f'{r["seconds"]:.4f}',
                str(r["hard_violations"]),
                str(r["holiday_violations"]),
                str(r["workload_gap"]),
                str(r["night_gap"]),
                score_display,
                str(r["valid_candidates"]),
            ]
        )

    widths = [
        max(len(headers[i]), *(len(row[i]) for row in rows))
        for i in range(len(headers))
    ]

    def line(values):
        return " | ".join(
            value.ljust(widths[i])
            for i, value in enumerate(values)
        )

    print()
    print(line(headers))
    print("-+-".join("-" * width for width in widths))

    for row in rows:
        print(line(row))

    print()

    for r in results:
        if r["hard_breakdown"]:
            print(
                f'{r["algorithm"]} hard violations:',
                r["hard_breakdown"],
            )

def print_schedule(
    title: str,
    schedule: Optional[Schedule],
    num_days: int,
) -> None:
    print(f"\n===== {title} =====")

    if schedule is None:
        print("No schedule.")
        return

    for day in range(1, num_days + 1):
        print(f"Day {day}")
        for shift in SHIFT_TYPES:
            assigned = schedule_doctors(schedule, day, shift)
            print(f"  {shift:8} : {', '.join(assigned)}")
