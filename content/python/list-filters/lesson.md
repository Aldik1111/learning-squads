# Keep the values you need

A filter answers one question for every item: should this item be kept? Imagine choosing practice sessions long enough for a focused break. A session exactly as long as the minimum should count too.

## Build a result one item at a time

Start with an empty result. Visit each value, compare it with a threshold, and append qualifying values. Put the return after the loop so that every item is examined.

```python
temperatures = [8, 12, 12, 5]
warm = []
for temperature in temperatures:
    if temperature >= 10:
        warm.append(temperature)
# warm is [12, 12]; temperatures is unchanged
```

`>=` includes the boundary; `>` excludes it. Appending during the original left-to-right traversal preserves order. Repeated values represent separate observations, so a set would lose information. Do not remove items from the input while iterating: our function promises to leave its caller's data unchanged.

## Practice

Implement `keep_at_least(values, minimum)` for a list of integers and an integer minimum. Return a new list of qualifying integers. Inputs of other types are outside this exercise. For `[3, 1, 3, 2]` with minimum `2`, predict `[3, 3, 2]` before running the checks.

Trace three columns on paper: current value, comparison result, result so far. Test an empty list, no matches, an exact match, negative values, and repeated matches. If a case fails, explain whether the mistake is the boundary, loop placement, or changed input. Then submit a short account of your correction as the practical task.

## Sources

- [Python tutorial: lists and looping](https://docs.python.org/3/tutorial/datastructures.html)
