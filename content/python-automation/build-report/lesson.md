# Turn totals into a repeatable report

A correct calculation is easier to compare when its presentation is predictable. If the same totals arrive in a different insertion order, the report should still use the same line order. Here we build a list of lines; we do not open files or send messages.

## Sort, then format

```python
counts = {"walk": 2, "read": 4}
lines = []
for label in sorted(counts):
    lines.append(f"{label} = {counts[label]}")
# ["read = 4", "walk = 2"]
```

`sorted()` returns a new sorted list of keys. The source dictionary is unchanged. An f-string inserts the current label and value into text. Formatting adds no new calculation: a number stays the same even though the output line is a string.

Our exercise uses lowercase ASCII category names so the expected order is Python's ordinary lexicographic order, not a locale-specific dictionary order. Use exactly one colon and one space between name and total. Consistent punctuation makes reports easier to inspect and compare.

## Practice

Implement `report_lines(totals)` for a dictionary of nonempty lowercase ASCII category names to non-negative integer totals. Return lines in sorted key order, such as `["read: 7", "walk: 5"]`. Keep zero totals. Empty input produces an empty list, not a heading or placeholder.

Build the same two-category input in opposite insertion orders and check that both produce equal output. Add a category with total zero and another with a multi-digit value. A function that prints instead of returns can look correct on screen but fail when a caller needs the list. In your task summary, explain that difference and show the exact returned value. This small reporting function can later be combined with cleaning and grouping, while each step remains independently testable.

## Sources

- [Python sorted](https://docs.python.org/3/library/functions.html#sorted)
- [Python formatted string literals](https://docs.python.org/3/tutorial/inputoutput.html#formatted-string-literals)
