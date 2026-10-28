import pytest
from qdrant_client import models

from knowledge import vector_store
from knowledge.vector_store import DENSE_SIZE, DENSE_VECTOR, SPARSE_VECTOR, ensure_collection

pytestmark = pytest.mark.integration


def test_creates_collection_with_plan_layout(qdrant, test_settings):
    name = test_settings.qdrant_collection
    assert ensure_collection(qdrant, name) is True

    info = qdrant.get_collection(name)
    dense = info.config.params.vectors[DENSE_VECTOR]
    assert (dense.size, dense.distance) == (DENSE_SIZE, models.Distance.COSINE)
    assert info.config.params.sparse_vectors[SPARSE_VECTOR].modifier == models.Modifier.IDF
    assert set(vector_store.PAYLOAD_INDEXES) <= set(info.payload_schema)
    assert info.payload_schema["org_id"].params.is_tenant is True


def test_is_idempotent(qdrant, test_settings):
    name = test_settings.qdrant_collection
    ensure_collection(qdrant, name)
    assert ensure_collection(qdrant, name) is False


def test_rejects_existing_collection_with_wrong_layout(qdrant, test_settings):
    name = test_settings.qdrant_collection
    qdrant.create_collection(
        name, vectors_config={DENSE_VECTOR: models.VectorParams(size=768, distance=models.Distance.COSINE)}
    )
    with pytest.raises(RuntimeError, match="dense vector"):
        ensure_collection(qdrant, name)
