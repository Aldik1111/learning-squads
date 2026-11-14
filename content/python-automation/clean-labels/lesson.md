# Normalize labels before using them

Small inconsistencies can split one category into several: `" Reading "`, `"READING"`, and `"reading"`. This exercise defines one explicit normalization rule. It is a rule for our sample labels, not a universal policy for people's names or every language.

## Normalize, then decide

```python
raw = "  PLANNING  "
clean = raw.strip().lower()
# clean is "planning"; raw still contains the original text
```

`strip()` removes leading and trailing whitespace, not spaces inside a phrase. `lower()` returns a lowercase string. Store the transformed value before checking whether it is empty: `"   "` is not empty until it has been stripped. In a loop, append only nonempty cleaned values to a new result list.

Do not use `set()` to remove duplicates; two equal labels may represent two different records. Do not sort unless the contract requests it. Normalizing spelling is not permission to rewrite meanings: `"deep work"` should keep its internal space.

## Practice

Implement `clean_labels(labels)` for a list of strings. Strip the ends, lowercase each item, and omit results that are empty. Preserve order and repeated nonempty labels. The input list must remain unchanged.

For `[" Study ", "", "STUDY", "deep work"]`, write the expected output before running anything. Add a whitespace-only example containing a tab or newline. Compare your result with an implementation that checks emptiness before stripping: which item slips through? Explain why normalization order matters in your task summary. In a real workflow, first agree on rules with the data owner and keep the original source so the transformation can be reviewed.

## Sources

- [Python string methods](https://docs.python.org/3/library/stdtypes.html#string-methods)
