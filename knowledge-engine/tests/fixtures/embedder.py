"""Stand-ins for OpenAI in tests."""

import hashlib
import math
import random
from collections.abc import Callable, Sequence
from types import SimpleNamespace

from knowledge.vector_store import DENSE_SIZE


def fake_vector(text: str, size: int = DENSE_SIZE) -> list[float]:
    """Deterministic unit vector: same text, same vector."""
    rng = random.Random(int(hashlib.sha256(text.encode()).hexdigest()[:16], 16))
    values = [rng.gauss(0, 1) for _ in range(size)]
    norm = math.sqrt(sum(v * v for v in values))
    return [v / norm for v in values]


class FakeEmbedder:
    model = "fake-embedding"

    def __init__(self, on_embed: Callable[[Sequence[str]], None] | None = None):
        self.calls: list[int] = []
        self.on_embed = on_embed

    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        if self.on_embed:
            self.on_embed(texts)
        self.calls.append(len(texts))
        return [fake_vector(t) for t in texts]


class FakeOpenAIClient:
    """Mimics client.embeddings.create; `script` yields an exception or None (success) per call."""

    def __init__(self, script=(), size: int = DENSE_SIZE, shuffle: bool = True, drop: int = 0):
        self.script = list(script)
        self.size, self.shuffle, self.drop = size, shuffle, drop
        self.calls: list[list[str]] = []
        self.embeddings = SimpleNamespace(create=self._create)

    def _create(self, *, model: str, input: list[str]):
        self.calls.append(list(input))
        if self.script:
            outcome = self.script.pop(0)
            if outcome is not None:
                raise outcome
        data = [SimpleNamespace(index=i, embedding=fake_vector(t, self.size)) for i, t in enumerate(input)]
        if self.shuffle:
            data.reverse()  # the API does not promise order; the embedder sorts by index
        return SimpleNamespace(data=data[self.drop :])
