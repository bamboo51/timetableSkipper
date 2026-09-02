# Monte Carlo algorithm flowchart

[Back to the project README](../README.md) · [View the implementation](../monte_carlo.py)

The Monte Carlo scheduler repeatedly builds random schedules, rejects invalid
ones, and remembers the valid schedule with the lowest score.

Monte Carlo methods use repeated random trials. A simple analogy is shuffling a
deck many times, scoring each order, and keeping the best order seen. More time
allows more trials, but does not guarantee the best possible result.

## How it works

For each candidate schedule, this implementation:

1. Starts with the fixed manual assignments.
2. Visits each day and shift in order.
3. Randomly selects an eligible senior if senior coverage is still needed.
4. Randomly selects eligible doctors until the shift is full.
5. Discards the candidate if it reaches a dead end or fails final validation.
6. Scores every valid candidate and remembers the best one.

This loop continues until the budget expires. `valid_candidates` in the result
CSV shows how many complete schedules survived validation. The random seed
makes the sequence of choices repeatable, although faster computers may test
more candidates within the same time.

## Flowchart

```mermaid
flowchart TD
    A([Start]) --> B{Is the time budget positive?}
    B -- No --> C[Raise an error]
    B -- Yes --> D[Create seeded random generator and deadline]
    D --> E[Set best schedule to none and best score to infinity]
    E --> F{Is there time remaining?}
    F -- No --> Z([Return best schedule and valid-candidate count])
    F -- Yes --> G[Copy fixed manual assignments]
    G --> H{Are manual assignments valid?}
    H -- No --> F
    H -- Yes --> I[Visit the next day and shift]
    I --> J{Is senior coverage missing?}
    J -- Yes --> K[Build eligible senior pool]
    K --> L{Any eligible senior?}
    L -- No --> F
    L -- Yes --> M[Randomly choose and assign one senior]
    J -- No --> N{Is the shift full?}
    M --> N
    N -- No --> O[Build pool of all eligible doctors]
    O --> P{Any eligible doctor?}
    P -- No --> F
    P -- Yes --> Q[Randomly choose and assign one doctor]
    Q --> N
    N -- Yes --> R{Are all days and shifts complete?}
    R -- No --> I
    R -- Yes --> S{Does final validation pass?}
    S -- No --> F
    S -- Yes --> T[Score candidate and count it as valid]
    T --> U{Is its score lower than the best score?}
    U -- Yes --> V[Save it as the new best schedule]
    U -- No --> F
    V --> F
```

## Strengths and limitations

Eligibility uses the same availability, daily assignment, rest, and
consecutive-night rules as the other algorithms. A candidate that reaches a
dead end is discarded rather than repaired. Because the deadline is checked
between candidates, the run may exceed its budget slightly while finishing one
candidate.

Monte Carlo explores different parts of the solution space without building a
mathematical solver model. However, random selection ignores which choice is
likely to improve the score, so it can require many trials and may still lose
to the much faster Greedy heuristic.
