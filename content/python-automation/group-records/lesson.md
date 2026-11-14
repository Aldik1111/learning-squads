# Combine records by category

A list of activity records can contain several entries for the same category. Reporting every row is different from calculating a total per category. This module turns repeated records into a compact summary without discarding any minutes.

## Choose the grouping key

```python
rows = [{"kind": "walk", "minutes": 5}, {"kind": "walk", "minutes": 8}]
totals = {}
for row in rows:
    kind = row["kind"]
    totals[kind] = totals.get(kind, 0) + row["minutes"]
# totals is {"walk": 13}
```

The grouping key tells you which bucket receives a value. `.get(key, 0)` supplies the initial zero when the bucket does not exist yet. Assigning only the latest value would overwrite earlier minutes. A zero-minute record still establishes that its category was present.

Keep grouping separate from cleaning. In this exercise `"Read"` and `"read"` are different categories, and an empty string is a permitted category key. If a real project needs normalized categories, that must be a separate agreed transformation, not a hidden change here.

## Practice

Write `group_minutes(records)` for records with exactly the required `category` string and non-negative integer `minutes` fields. Extra validation, missing fields, and other types are outside this exercise's contract. Return a dictionary mapping each encountered category to its total minutes; empty input returns `{}`.

Trace interleaved categories: read 3, walk 5, read 4. Explain why the read total is 7 even though its records are not adjacent. Test a zero-minute record, repeated categories, and distinct case. Leave both the list and its nested dictionaries unchanged. Your practical summary should identify the grouping key and the bug caused by overwriting rather than accumulating.

## Sources

- [Python dictionary get](https://docs.python.org/3/library/stdtypes.html#dict.get)
