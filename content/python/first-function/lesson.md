# Write your first useful function

Imagine a habit tracker: each entry is `True` for done or `False` for not done. You want a count of completed habits, not the length of the list.

## Read a small example

A function packages work under a name. A parameter receives input; `return` gives the result back. Indentation groups statements. A `for` loop visits items, and an `if` condition chooses whether to run a statement.

```python
def count_long_words(words):
    total = 0
    for word in words:
        if len(word) > 4:
            total = total + 1
    return total

print(count_long_words(["work", "learn", "practice"]))  # 2
```

Trace the example: start at zero; skip `work`; count `learn`; count `practice`; return two. Notice that `return` lines up with `for`, so it runs after the loop.

## Your task

Complete `count_completed(habits)`. Input is a list containing only booleans. Return an integer: the number of `True` entries. Keep the original list unchanged. You do not need imports or interactive input.

| Input | Expected result |
| --- | --- |
| `[True, False, True]` | `2` |
| `[False, False]` | `0` |
| `[]` | `0` |

Start with a count of zero. Visit each entry. Add one when it is true. Return the count after visiting all entries. Try the examples before reading feedback. A placeholder that returns zero will pass the empty case but fail completed habits.

## Explain it to a teammate

What would happen if you returned inside the loop? Which example catches a function that just returns the list's length? Share your reasoning even if your code is not finished.

Reference: [Python tutorial: functions and control flow](https://docs.python.org/3/tutorial/controlflow.html#defining-functions). The habit-tracker task and examples are original.
