"""MCP search server (plan T9): `python -m knowledge.mcp_server` → Streamable HTTP at /mcp.

Auth: every request needs `Authorization: Bearer <key>`; the key maps to one org_id in
`api_keys` (only its hash is stored). An ASGI middleware refuses unknown keys before the MCP
SDK sees the request, and each tool resolves the org from the same header again — so no tool
takes org_id as an argument and no request can reach another organization's documents.

Keys:
    python -m knowledge.mcp_server create-key --org acme --label "NeuronKnowledge app"
    python -m knowledge.mcp_server list-keys [--org acme]
    python -m knowledge.mcp_server revoke-key <key>

search_knowledge runs hybrid search (dense + BM25 → RRF), reranked when RERANK_ENABLED=true.

Uses the mcp 2.x SDK (FastMCP is now `MCPServer`).
"""

import argparse
import json
import logging
import sys
from typing import Any

import anyio
import uvicorn
from mcp.server.mcpserver import Context, MCPServer

# ToolError messages reach the client; any other exception is reported only as a generic failure
from mcp.server.mcpserver.exceptions import ToolError

from knowledge import api_keys, db, search, thai_text
from knowledge.api_keys import KeyResolver, bearer_token
from knowledge.config import Settings, get_settings, setup_logging
from knowledge.embedder import Embedder, OpenAIEmbedder
from knowledge.errors import PermanentError, TransientError
from knowledge.rerank import load_reranker
from knowledge.search import Reranker
from knowledge.vector_store import get_client

log = logging.getLogger("knowledge.mcp")

INSTRUCTIONS = (
    "คลังความรู้ขององค์กร (Knowledge Engine): ค้นเอกสารที่องค์กรอัปโหลดไว้ ด้วย search_knowledge "
    "แล้วตอบโดยอ้างอิงแหล่งที่มาตาม citation ที่ได้"
)
SEARCH_DESCRIPTION = (
    "ค้นหาข้อมูลจากเอกสารในคลังความรู้ขององค์กร (Search the organization's knowledge base). "
    "ค้นทั้งตามความหมายและตามคำที่ตรงกัน จึงใส่ชื่อเฉพาะ รหัส หรือเลขที่เอกสารใน query ได้. "
    "คืนรายการชิ้นเนื้อหา {text, citation, filename, doc_id, chunk_index, score} เรียงจากเกี่ยวข้องมากไปน้อย. "
    "ตอบโดยอ้างอิง citation ในรูปแบบ [citation] ทุกครั้ง ถ้าผลลัพธ์ไม่เกี่ยวข้องให้บอกว่าไม่พบข้อมูล อย่าแต่งเอง. "
    "ใช้ tags หรือ doc_ids (จาก list_documents) เพื่อจำกัดขอบเขตได้"
)
UNAUTHORIZED = "ไม่ได้รับอนุญาต: ต้องส่ง Authorization: Bearer <API key ของคลังความรู้>"


class Services:
    """Shared clients for the tools; built once when the server starts."""

    def __init__(self, settings: Settings, embedder: Embedder | None = None, reranker: Reranker | None = None):
        self.settings = settings
        self.keys = KeyResolver(settings)
        self.qdrant = get_client(settings)
        self.embedder = embedder or OpenAIEmbedder(settings)
        # Loaded at startup (not on the first query) so a missing package or model fails fast
        self.reranker = reranker or load_reranker(settings)


_services: Services | None = None


def services() -> Services:
    global _services
    if _services is None:
        _services = Services(get_settings())
    return _services


def configure(svc: Services) -> None:
    """Use these clients (tests pass their own settings and embedder)."""
    global _services
    _services = svc


mcp = MCPServer("knowledge", instructions=INSTRUCTIONS)


async def _org(ctx: Context) -> str:
    headers = ctx.headers or {}
    key = bearer_token(headers.get("authorization") or headers.get("Authorization"))
    org_id = await anyio.to_thread.run_sync(services().keys.org_for, key)
    if not org_id:
        raise ToolError(UNAUTHORIZED)
    return org_id


def _json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, default=str)


@mcp.tool(description=SEARCH_DESCRIPTION, structured_output=False)
async def search_knowledge(
    query: str,
    ctx: Context,
    top_k: int = 5,
    tags: list[str] | None = None,
    doc_ids: list[str] | None = None,
) -> str:
    org_id = await _org(ctx)
    svc = services()
    try:
        hits = await anyio.to_thread.run_sync(
            lambda: search.search(
                settings=svc.settings,
                qdrant=svc.qdrant,
                embedder=svc.embedder,
                org_id=org_id,
                query=query,
                top_k=top_k,
                tags=tags,
                doc_ids=doc_ids,
                mode="hybrid",
                reranker=svc.reranker,
            )
        )
    except (TransientError, PermanentError) as err:
        # e.g. OPENAI_API_KEY missing or OpenAI down: say why, in Thai, instead of a generic failure
        raise ToolError(f"ค้นหาไม่สำเร็จ: {err}") from err
    log.info("search org=%s top_k=%s rerank=%s hits=%d", org_id, top_k, svc.reranker is not None, len(hits))
    if not hits:
        return _json({"results": [], "note": "ไม่พบข้อมูลที่เกี่ยวข้องในคลังความรู้ขององค์กร"})
    return _json({"results": [h.as_dict() for h in hits]})


@mcp.tool(
    description=(
        "รายการเอกสารที่พร้อมค้นหาในคลังความรู้ขององค์กร (List the organization's indexed documents): "
        "{doc_id, filename, description, tags, file_type, chunk_count}. กรองด้วย tags ได้"
    ),
    structured_output=False,
)
async def list_documents(ctx: Context, tags: list[str] | None = None) -> str:
    org_id = await _org(ctx)
    docs = await anyio.to_thread.run_sync(lambda: search.list_documents(services().settings, org_id, tags))
    return _json({"documents": docs})


@mcp.tool(
    description=(
        "อ่านชิ้นเนื้อหาของเอกสารพร้อมชิ้นข้างเคียง (Read a chunk and its neighbours) — ใช้ doc_id และ "
        "chunk_index จากผลของ search_knowledge เพื่อดูบริบทเพิ่ม; window = จำนวนชิ้นก่อน/หลัง (0–3)"
    ),
    structured_output=False,
)
async def get_document_chunk(doc_id: str, chunk_index: int, ctx: Context, window: int = 1) -> str:
    org_id = await _org(ctx)
    svc = services()
    chunks = await anyio.to_thread.run_sync(
        lambda: search.get_document_chunk(
            settings=svc.settings,
            qdrant=svc.qdrant,
            org_id=org_id,
            doc_id=doc_id,
            chunk_index=chunk_index,
            window=window,
        )
    )
    if not chunks:
        raise ToolError("ไม่พบเนื้อหานี้ในคลังความรู้ขององค์กร")
    return _json({"chunks": [c.as_dict() for c in chunks]})


class RequireApiKey:
    """ASGI middleware: refuse requests without a valid key before the MCP SDK sees them."""

    def __init__(self, app, resolver: KeyResolver):
        self.app = app
        self.resolver = resolver

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        authorization = dict(scope.get("headers") or []).get(b"authorization", b"").decode("latin-1")
        org_id = await anyio.to_thread.run_sync(self.resolver.org_for, bearer_token(authorization))
        if org_id:
            return await self.app(scope, receive, send)
        body = json.dumps({"error": UNAUTHORIZED}, ensure_ascii=False).encode()
        await send({
            "type": "http.response.start",
            "status": 401,
            "headers": [(b"content-type", b"application/json"), (b"www-authenticate", b"Bearer")],
        })  # fmt: skip
        await send({"type": "http.response.body", "body": body})


def build_app(svc: Services):
    """The ASGI app: MCP over Streamable HTTP at /mcp, behind API-key auth. Stateless, so any
    number of mcp containers can serve the same clients."""
    configure(svc)
    app = mcp.streamable_http_app(host="0.0.0.0", stateless_http=True, json_response=True)
    return RequireApiKey(app, svc.keys)


def serve() -> None:
    setup_logging()
    settings = get_settings()
    db.ping(settings)
    thai_text.warmup()
    if settings.openai_api_key is None:
        log.warning("OPENAI_API_KEY is not set: search_knowledge will fail until it is")
    app = build_app(Services(settings))
    log.info("mcp ready on :%d/mcp", settings.mcp_port)
    uvicorn.run(app, host="0.0.0.0", port=settings.mcp_port, log_level="info")


def cli(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(prog="python -m knowledge.mcp_server")
    sub = parser.add_subparsers(dest="command")
    create = sub.add_parser("create-key", help="create an API key for one org (printed once)")
    create.add_argument("--org", required=True)
    create.add_argument("--label")
    listing = sub.add_parser("list-keys", help="list keys (hash prefix only)")
    listing.add_argument("--org")
    revoke = sub.add_parser("revoke-key", help="revoke a key")
    revoke.add_argument("key")
    args = parser.parse_args(argv)

    if args.command is None:
        serve()
        return 0
    settings = get_settings()
    if args.command == "create-key":
        key = api_keys.create_key(settings, args.org, args.label)
        print(f"API key for org '{args.org}' (shown once — store it now):\n{key}")
    elif args.command == "list-keys":
        for row in api_keys.list_keys(settings, args.org):
            state = "revoked" if row["revoked"] else "active"
            created = f"{row['created_at']:%Y-%m-%d}"
            print(f"{row['org_id']:<20} {state:<8} {row['hash_prefix']}…  {row['label'] or ''}  {created}")
    elif args.command == "revoke-key":
        print("revoked" if api_keys.revoke_key(settings, args.key) else "no such key")
    return 0


if __name__ == "__main__":
    sys.exit(cli(sys.argv[1:]))
