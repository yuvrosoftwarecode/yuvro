"""Transcript Manager for the TEST mock interview.

OpenAI: "Ordering between completion events from different speech turns isn't guaranteed. Use
item_id to match transcription events to committed input items." So:

1. Every audio commit we send gets an incremental sequence number (seq).
2. OpenAI's input_audio_buffer.committed event gives the item_id; it is mapped to the oldest
   seq still waiting for one (commits are acknowledged in the order they were sent).
3. Delta / completed / failed events are matched to their seq by item_id.
4. Final transcripts are released strictly in seq order (speaking order); a later chunk waits
   until every earlier chunk has its final text (or failed).
5. Every message reports `pending` = commits still waiting for a final transcript, so the client
   never submits an answer while part of it is still being transcribed.

Transcription context: a short prompt (role + Alex's current question, never the interview
history) and keywords (technical terms). gpt-live-transcribe returns no timestamps or confidence
scores, so nothing here relies on them.
"""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field

MAX_PROMPT_CHARS = 700
MAX_KEYWORDS = 30
MAX_KEYWORD_CHARS = 50


@dataclass
class _Segment:
    seq: int
    item_id: str = ""
    partial: str = ""
    final: str | None = None      # None = not completed yet
    failed: bool = False


def clean_keywords(raw) -> list[str]:
    """OpenAI: keep each keyword on one line, no '<', '>', carriage return or line feed."""
    out: list[str] = []
    seen: set[str] = set()
    for value in raw or []:
        word = " ".join(str(value).replace("<", " ").replace(">", " ").split())[:MAX_KEYWORD_CHARS].strip()
        if word and word.lower() not in seen:
            seen.add(word.lower())
            out.append(word)
        if len(out) >= MAX_KEYWORDS:
            break
    return out


@dataclass
class TranscriptManager:
    role: str = ""
    question: str = ""
    keywords: list[str] = field(default_factory=list)
    turn_id: str = ""
    _next_seq: int = 0
    _segments: dict[int, _Segment] = field(default_factory=dict)       # seq -> segment (until released)
    _awaiting_item: deque = field(default_factory=deque)              # seqs committed, item_id not known yet
    _seq_by_item: dict[str, int] = field(default_factory=dict)
    _early_events: dict[str, list[tuple[str, str]]] = field(default_factory=dict)  # item_id seen before committed
    _next_release: int = 0

    @property
    def pending(self) -> int:
        return len(self._segments)

    # ── Commits ────────────────────────────────────────────────────────────
    def on_commit_sent(self) -> int:
        seq = self._next_seq
        self._next_seq += 1
        self._segments[seq] = _Segment(seq=seq)
        self._awaiting_item.append(seq)
        return seq

    def on_committed(self, item_id: str) -> tuple[int | None, list[dict]]:
        """input_audio_buffer.committed -> (seq, events released by early-arriving transcripts)."""
        if not item_id or item_id in self._seq_by_item:
            return self._seq_by_item.get(item_id), []
        if not self._awaiting_item:
            return None, []
        seq = self._awaiting_item.popleft()
        self._segments[seq].item_id = item_id
        self._seq_by_item[item_id] = seq
        events: list[dict] = []
        for kind, text in self._early_events.pop(item_id, []):
            events += self._apply(kind, item_id, text)
        return seq, events

    def on_commit_rejected(self) -> list[dict]:
        """OpenAI rejected the oldest commit that has no item yet (e.g. empty buffer): release it as failed."""
        if not self._awaiting_item:
            return []
        seq = self._awaiting_item.popleft()
        seg = self._segments[seq]
        seg.final, seg.failed = "", True
        return self._release_in_order()

    # ── Transcription events ───────────────────────────────────────────────
    def on_delta(self, item_id: str, delta: str) -> list[dict]:
        """OpenAI: a piece of new text to append."""
        return self._route("delta", item_id, delta)

    def on_partial(self, item_id: str, text: str) -> list[dict]:
        """Sarvam: the whole text so far for this segment (replaces the previous partial)."""
        return self._route("partial", item_id, text)

    def on_completed(self, item_id: str, transcript: str) -> list[dict]:
        return self._route("completed", item_id, transcript or "")

    def on_failed(self, item_id: str) -> list[dict]:
        return self._route("failed", item_id, "")

    def _route(self, kind: str, item_id: str, text: str) -> list[dict]:
        if not item_id:
            return []
        if item_id not in self._seq_by_item:
            # Arrived before its committed event: keep it until we know its seq.
            self._early_events.setdefault(item_id, []).append((kind, text))
            return []
        return self._apply(kind, item_id, text)

    def _apply(self, kind: str, item_id: str, text: str) -> list[dict]:
        seq = self._seq_by_item.get(item_id)
        seg = self._segments.get(seq) if seq is not None else None
        if seg is None or seg.final is not None:
            return []
        if kind in ("delta", "partial"):
            if not text:
                return []
            seg.partial = seg.partial + text if kind == "delta" else text
            return [{"type": "partial", "seq": seq, "item_id": item_id, "text": seg.partial.strip(),
                     "pending": self.pending}]
        seg.final = text.strip() if kind == "completed" else ""
        seg.failed = kind == "failed"
        return self._release_in_order()

    def _release_in_order(self) -> list[dict]:
        events: list[dict] = []
        while self._next_release in self._segments and self._segments[self._next_release].final is not None:
            seg = self._segments.pop(self._next_release)
            self._seq_by_item.pop(seg.item_id, None)
            self._next_release += 1
            events.append({"type": "final", "seq": seg.seq, "item_id": seg.item_id, "text": seg.final,
                           "failed": seg.failed, "pending": self.pending})
        return events

    # ── Context for OpenAI ─────────────────────────────────────────────────
    def set_context(self, role=None, question=None, keywords=None, turn_id=None) -> bool:
        changed = False
        if turn_id is not None:
            self.turn_id = str(turn_id)[:40]
        if role is not None and str(role).strip()[:200] != self.role:
            self.role = str(role).strip()[:200]
            changed = True
        if question is not None and str(question).strip()[:500] != self.question:
            self.question = str(question).strip()[:500]
            changed = True
        if keywords is not None:
            cleaned = clean_keywords(keywords)
            if cleaned != self.keywords:
                self.keywords = cleaned
                changed = True
        return changed

    def build_prompt(self) -> str:
        parts = ["Spoken answer in a technical mock interview, in English (often Indian English)."]
        if self.role:
            parts.append(f"Role: {self.role}.")
        if self.question:
            parts.append(f"Interviewer's question: \"{self.question}\"")
        prompt = " ".join(parts)
        return prompt[:MAX_PROMPT_CHARS]
