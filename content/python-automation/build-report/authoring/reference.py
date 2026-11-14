def report_lines(totals):
    return [f"{category}: {totals[category]}" for category in sorted(totals)]
