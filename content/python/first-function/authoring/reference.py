"""Trusted authoring reference; do not preload into the learner editor."""


def count_completed(habits):
    total = 0
    for habit in habits:
        if habit:
            total = total + 1
    return total
