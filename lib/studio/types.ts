// Shared contracts for Creator Studio, the Agent Catalog and the Activity Log.
// Every page branch builds against these types, so change them only through CORE-01
// (see docs/specs/00-data-model.md) and announce the change to all page owners.

import type { UserRole } from '@/lib/auth';

// ---------- S02 Data Connections
// Extended by S02 on 2026-10-25 (approved by the project owner); data_connections.type CHECK must match.
export type ConnectionType =
  | 'postgresql'
  | 'mysql'
  | 'mssql'
  | 'mariadb'
  | 'cockroachdb'
  | 'redshift'
  | 'oracle'
  | 'clickhouse';
export type ConnectionStatus = 'untested' | 'ok' | 'error';

/** The stored password never leaves the server; the API only reports whether one is set. */
export interface DataConnection {
  id: number;
  name: string;
  type: ConnectionType;
  host: string;
  port: number;
  database: string;
  username: string;
  hasPassword: boolean;
  readOnlyVerified: boolean;
  status: ConnectionStatus;
  lastError: string | null;
  lastTestedAt: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface TableColumn {
  name: string;
  dataType: string;
  nullable: boolean;
}

export interface TableSchema {
  schema: string;
  table: string;
  rowEstimate: number | null;
  columns: TableColumn[];
}

// ---------- S03 Knowledge Sets
/** file = uploaded file, db_table = table from a connection, mcp_tool = tool from an MCP server */
export type SourceKind = 'file' | 'db_table' | 'mcp_tool';
/** index = chunk + embed for hybrid RAG; live = query at answer time (numbers, statistics) */
export type SourceMode = 'index' | 'live';
export type ProcessingStatus = 'pending' | 'processing' | 'ready' | 'error';

export interface KnowledgeSource {
  id: number;
  knowledgeSetId: number;
  kind: SourceKind;
  mode: SourceMode;
  name: string;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  connectionId: number | null;
  tableName: string | null;
  /** Columns allowed for this source; columns not listed are never read */
  columns: string[] | null;
  mcpToolId: number | null;
  status: ProcessingStatus;
  chunkCount: number;
  error: string | null;
  updatedAt: string;
}

export type RagPreset = 'long_document' | 'faq_short' | 'table_rows' | 'custom';

export interface RagSettings {
  preset: RagPreset;
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  /** 0 = vector only, 1 = keyword only */
  keywordWeight: number;
  rerank: boolean;
  minScore: number;
}

export type KnowledgeSetStatus = 'draft' | 'building' | 'ready' | 'error';

export interface KnowledgeSet {
  id: number;
  slug: string;
  name: string;
  domain: string;
  description: string;
  /** Locked once the first source is indexed; changing it means a full re-index */
  embeddingModel: string;
  rag: RagSettings;
  status: KnowledgeSetStatus;
  version: number;
  sourceCount: number;
  useCaseCount: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

// ---------- S04 Use Cases
export interface UseCase {
  id: number;
  knowledgeSetId: number;
  title: string;
  description: string;
  /** Extra instruction for the agent on how to answer this kind of question */
  guidance: string | null;
  exampleCount: number;
  createdBy: number;
  updatedAt: string;
}

/** Examples feed dynamic few-shot prompting and the evaluation suite (S06). */
export interface UseCaseExample {
  id: number;
  useCaseId: number;
  question: string;
  expectedAnswer: string | null;
  expectedSourceIds: number[];
  /** true = the agent must decline this question (out of scope) */
  shouldRefuse: boolean;
  updatedAt: string;
}

// ---------- S05 Agent Builder (extends the existing agents table)
export type AgentStatus = 'draft' | 'published' | 'archived';

export interface StudioAgent {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string | null;
  status: AgentStatus;
  knowledgeSetIds: number[];
  mcpToolIds: number[];
  defaultModelId: number | null;
  activePromptVersion: number | null;
  latestEvalScore: number | null;
  publishedAt: string | null;
}

export interface AgentPromptVersion {
  id: number;
  agentId: number;
  version: number;
  prompt: string;
  generatedFromUseCases: boolean;
  note: string | null;
  createdBy: number;
  createdAt: string;
}

// ---------- S06 Playground and Evaluation
export interface EvalResult {
  exampleId: number;
  passed: boolean;
  answer: string;
  retrievedSourceIds: number[];
  reason: string | null;
}

export interface EvalRun {
  id: number;
  agentId: number;
  promptVersion: number;
  total: number;
  passed: number;
  /** 0–100 */
  score: number;
  startedAt: string;
  finishedAt: string | null;
}

// ---------- CORE-02 retrieval output, shown by P03 and S06
export interface Citation {
  sourceId: number;
  knowledgeSetId: number;
  title: string;
  /** Page number, sheet/row, or table key */
  locator: string;
  snippet: string;
  score: number;
}

// ---------- A01 Activity Log
export interface ActivityLog {
  id: number;
  actorId: number | null;
  actorRole: UserRole | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  detail: Record<string, unknown>;
  ip: string | null;
  createdAt: string;
}
