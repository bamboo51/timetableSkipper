# Timetable Skipper

A small Python benchmark that builds 30-day doctor schedules with three
different approaches:

- **Greedy** — quickly chooses the best eligible doctor for each slot.
- **CP-SAT** — uses Google OR-Tools to optimize the complete schedule.
- **Monte Carlo** — creates random valid schedules until its time limit expires.

The example problem has 20 doctors (10 Year 1, 6 Year 2, and 4 Year 3) and
assigns 4 doctors to each morning, day, and night shift.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

On Windows, activate the environment with `.venv\Scripts\activate`.

## Run

```bash
python main.py
```

The default run compares one generated problem using time budgets of 0.1, 1,
and 5 seconds. The budget is applied separately to CP-SAT and Monte Carlo.

Use smaller or larger benchmark suites with command-line options:

```bash
python main.py --instances 3 --budgets 0.1 1
python main.py --csv results.csv --schedules-csv schedules.csv
```

### Time budgets

`--budgets` is a list of maximum runtimes used to compare solution quality at
different time limits. For example, `--budgets 0.1 1 5` runs three independent
experiments for each generated problem; the 5-second run does not continue the
1-second run.

- Greedy does not use the budget because it makes one pass and stops. It is
  still repeated for each budget so every comparison has a Greedy baseline.
- CP-SAT searches for up to the selected budget, but may finish early when it
  proves an optimal solution. A short budget may end with status `UNKNOWN`.
- Monte Carlo keeps generating candidates for the entire budget. It may exceed
  the limit slightly while finishing its current candidate.

Larger budgets can improve CP-SAT and Monte Carlo results, but take longer. If
both algorithms consume their full limits, the approximate benchmark time is:

```text
instances × 2 × sum(budgets)
```

With the defaults, that is at most about `1 × 2 × 6.1 = 12.2` seconds, plus
small setup and Greedy costs. Each budget produces separate rows and schedules
in the output CSV files.

## Output

The command prints a summary and creates two CSV files:

- `scheduler_comparison.csv` contains runtime, feasibility, constraint
  violations, score, and solver status for every run.
- `schedules.csv` contains every day and shift produced by Greedy, CP-SAT,
  and Monte Carlo. Doctor IDs in a shift are separated by semicolons.

Each schedule row includes the algorithm, problem seed, solver seed, time
budget, whether a schedule was found, day, shift, and assigned doctors.

## How the algorithms work

All three algorithms receive the same doctors, days, shifts, constraints, and
scoring rules. They differ in how they choose assignments and whether they can
reconsider earlier choices. Each algorithm has its full explanation and Mermaid
flowchart in a separate file:

- [Greedy](algorithms/greedy.md)
- [CP-SAT](algorithms/cp-sat.md)
- [Monte Carlo](algorithms/monte-carlo.md)

### Comparison

| Algorithm | How it chooses | Main strength | Main limitation |
| --- | --- | --- | --- |
| Greedy | Best eligible choice at each step | Very fast and easy to understand | Cannot undo an early choice |
| CP-SAT | Searches the complete constraint model | Can find and prove high-quality solutions | Needs more time and solver machinery |
| Monte Carlo | Repeated random valid candidates | Explores many different schedules | No guarantee of improvement or optimality |

## Scheduling rules

Every valid schedule must:

- fill every shift with exactly four doctors;
- include at least one Year 2 or Year 3 doctor per shift;
- assign each doctor to at most one shift per day;
- respect unavailability and fixed assignments;
- prevent a night shift followed by a morning shift;
- prevent three consecutive night shifts.

Requested holidays are preferences rather than hard constraints.

## Score

Lower scores are better. Invalid schedules receive an infinite score. Valid
schedules use:

```text
100 × holiday violations + 10 × workload gap + 5 × night-shift gap
```

`CP-SAT` may report `UNKNOWN` when its time budget expires before it finds a
schedule or proves a result. In that case, the large metric values are sentinel
values indicating that no schedule was returned.

## Interpreting the results

- **Feasible** is the percentage of runs that returned schedules satisfying all
  hard rules. With one instance, it will be either 0% or 100%.
- **Median(s)** is the typical runtime for that algorithm and budget.
- **Worst hard** is the largest hard-constraint violation count. The value
  `1000000000` means no schedule was returned; it is not a real violation count.
- **Median score** and **Worst score** summarize only feasible schedules. Lower
  is better, and `inf` means there were no feasible schedules to score.
- With one instance, median and worst values are identical. Increase
  `--instances` to compare reliability across multiple generated problems.

For the example result:

- CP-SAT could not find a schedule in 0.1 seconds, but this does not prove the
  problem is infeasible. At 1 second it matched Greedy's score of 30, and at 5
  seconds it reached the best possible score of 0.
- Greedy returned a valid score-30 schedule in about 0.002 seconds. Its rows are
  identical because Greedy does not use the time budget.
- Monte Carlo always returned a valid schedule and improved from 1565 to 1160
  with more time, but remained worse than Greedy and CP-SAT on this instance.

Therefore, Greedy is the best choice here when speed matters and a near-best
schedule is sufficient. CP-SAT with a longer budget is best when schedule
quality matters most. This result does not justify choosing Monte Carlo unless
tests across more instances show an advantage.

## Files

- `main.py` — example data, benchmark runner, and command-line interface
- `greedy.py` — greedy scheduler
- `cp_sat.py` — OR-Tools CP-SAT scheduler
- `monte_carlo.py` — random-search scheduler
- `eval.py` — constraint validation and scoring
- `helpers.py`, `type.py`, `utils.py` — shared types, helpers, and CSV output
- `algorithms/` — detailed Mermaid flowcharts for each scheduling algorithm
