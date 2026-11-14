def clean_labels(labels):
    result = []
    for label in labels:
        cleaned = label.strip().lower()
        if cleaned:
            result.append(cleaned)
    return result
