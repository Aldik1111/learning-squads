# Summarize named scores

A dictionary connects a key to a value: a learner name to a score, for example. A summary should describe the data without changing any learner's entry. We will calculate a count and a total, not an average or a pass/fail decision.

## Keys and values have different jobs

```python
minutes_by_day = {"Monday": 12, "Tuesday": 8}
total = 0
for minutes in minutes_by_day.values():
    total += minutes
# total is 20
```

Looping over a dictionary directly visits its keys. Use `.values()` when the numbers are what you need. `len(minutes_by_day)` counts entries, while the accumulated total adds their values. A zero value still belongs to a real entry and must contribute to the count.

The result can itself be a dictionary with an agreed shape: `{"count": 2, "total": 20}`. Consumers can ask for `result["total"]` without guessing which position contains the total. Spelling and value types are part of this agreement.

## Practice

Write `summarize_scores(scores)`. The input maps unique string names to non-negative integer scores. Return exactly `count` and `total`, both integers. For an empty dictionary, both are zero. Do not add an average, drop zero scores, rename keys, or modify the input.

Before coding, predict the result for `{"Ari": 0, "Bo": 7}`. Then trace your accumulator for three learners. Compare the empty case with the zero-score case: both may have total zero, but their counts differ. In your practical task, explain that difference and show a small before/after example. Checking this distinction catches a common bug that counts only truthy values.

## Sources

- [Python tutorial: dictionaries](https://docs.python.org/3/tutorial/datastructures.html#dictionaries)
