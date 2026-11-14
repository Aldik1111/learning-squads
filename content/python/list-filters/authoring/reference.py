def keep_at_least(values, minimum):
    result = []
    for value in values:
        if value >= minimum:
            result.append(value)
    return result
