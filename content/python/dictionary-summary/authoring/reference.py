def summarize_scores(scores):
    total = 0
    for score in scores.values():
        total += score
    return {"count": len(scores), "total": total}
