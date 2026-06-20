"""Pure diagnostic helpers for the Sherpa keyword worker."""

from dataclasses import dataclass
from typing import Iterable, Sequence


@dataclass(frozen=True)
class KeywordVariant:
    phrase: str
    tokens: tuple[str, ...]


def _prefix_matches(observed: Sequence[str], expected: Sequence[str]) -> int:
    matched = 0
    for actual, wanted in zip(observed, expected):
        if _canonical_token(actual) != _canonical_token(wanted):
            break
        matched += 1
    return matched


def _canonical_token(token: str) -> str:
    return str(token).replace("▁", " ")


def build_diagnostics(
    observed_tokens: Iterable[str],
    variants: Sequence[KeywordVariant],
) -> dict:
    observed = tuple(str(token) for token in observed_tokens)
    if not observed:
        return _empty_diagnostics()

    best = None
    best_rank = None
    for variant in variants:
        total = len(variant.tokens)
        if total == 0:
            continue
        matched = _prefix_matches(observed, variant.tokens)
        if matched == 0:
            continue
        progress = min(1.0, matched / total)
        rank = (matched, progress, -total)
        if best_rank is None or rank > best_rank:
            best = (variant, matched, total, progress)
            best_rank = rank

    if best is None:
        return _empty_diagnostics()

    variant, matched, total, progress = best
    return {
        "candidate": variant.phrase,
        "matched_tokens": matched,
        "total_tokens": total,
        "token_progress": progress,
        "confidence_estimate": progress,
    }


def _empty_diagnostics() -> dict:
    return {
        "candidate": "",
        "matched_tokens": 0,
        "total_tokens": 0,
        "token_progress": 0.0,
        "confidence_estimate": 0.0,
    }


def diagnostic_response(
    request_id,
    keyword,
    tokens,
    timestamps,
    variants,
):
    exact_tokens = [str(token) for token in tokens]
    exact_timestamps = [float(timestamp) for timestamp in timestamps]
    return {
        "id": request_id,
        "ok": True,
        "keyword": str(keyword),
        "tokens": exact_tokens,
        "timestamps": exact_timestamps,
        **build_diagnostics(exact_tokens, variants),
    }
