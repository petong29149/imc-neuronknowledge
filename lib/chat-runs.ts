import type { StreamEvent } from '@/lib/llm-core';

/**
 * In-memory registry of chat turns that are still being processed.
 *
 * A run is decoupled from the HTTP request that started it: the LLM loop keeps going
 * when the browser tab is closed, refreshed or navigates away, and any client can
 * re-attach later via GET /api/chat/conversations/[id]/stream to replay the events
 * emitted so far and follow the rest live.
 *
 * State lives in this Node process, which fits a single `next start` server.
 */

type Listener = {
  onEvent: (event: StreamEvent) => void;
  onEnd: () => void;
};

export interface ChatRun {
  chatId: number;
  sessionId: string;
  userId: number;
  startedAt: number;
  /** Every event emitted so far in this turn (consecutive text deltas are merged) */
  events: StreamEvent[];
  /** True once the answer is finished ('done' or 'error' emitted); the run may still be wrapping up */
  answered: boolean;
  finished: boolean;
  listeners: Set<Listener>;
  /** Aborted when the user presses Stop */
  abortController: AbortController;
}

// Kept on globalThis so every route bundle (and dev hot reloads) share one registry
const globalForRuns = globalThis as unknown as { __chatRuns?: Map<number, ChatRun> };
const runs = (globalForRuns.__chatRuns ??= new Map<number, ChatRun>());

function bufferEvent(run: ChatRun, event: StreamEvent) {
  const last = run.events[run.events.length - 1];
  const isText = event.type === 'content' || event.type === 'reasoning';
  if (
    isText &&
    last &&
    last.type === event.type &&
    last.step === event.step &&
    last.is_synthesis === event.is_synthesis
  ) {
    last.content = (last.content || '') + (event.content || '');
    return;
  }
  run.events.push({ ...event });
}

/**
 * Starts processing a chat turn in the background and registers it.
 * `work` receives an `emit` function; the run ends when `work` settles.
 */
export function startChatRun(
  info: { chatId: number; sessionId: string; userId: number },
  work: (emit: (event: StreamEvent) => void, signal: AbortSignal) => Promise<void>
): ChatRun {
  const run: ChatRun = {
    ...info,
    startedAt: Date.now(),
    events: [],
    answered: false,
    finished: false,
    listeners: new Set(),
    abortController: new AbortController(),
  };
  runs.set(info.chatId, run);

  const emit = (event: StreamEvent) => {
    if (run.finished) return;
    bufferEvent(run, event);
    if (event.type === 'done' || event.type === 'error') run.answered = true;
    for (const listener of run.listeners) {
      try {
        listener.onEvent(event);
      } catch {
        // A broken listener must not stop the run
      }
    }
  };

  work(emit, run.abortController.signal)
    .catch((err: any) => {
      console.error('[Chat Run] Unhandled error:', err);
      emit({ type: 'error', error: err?.message || 'An error occurred during processing' });
    })
    .finally(() => {
      run.finished = true;
      if (runs.get(info.chatId) === run) runs.delete(info.chatId);
      for (const listener of run.listeners) listener.onEnd();
      run.listeners.clear();
    });

  return run;
}

/** The run for a chat, including one that has answered but is still wrapping up (e.g. titling). */
export function getChatRun(chatId: number): ChatRun | null {
  return runs.get(chatId) ?? null;
}

/**
 * Asks a chat's in-progress answer to stop. The run then saves what it has so far
 * and finishes with a 'done' event (`stopped: true`). Returns false if nothing was running.
 */
export function stopChatRun(chatId: number, userId: number): boolean {
  const run = runs.get(chatId);
  if (!run || run.userId !== userId || run.answered) return false;
  run.abortController.abort();
  return true;
}

/** Whether the chat's answer is still being generated. */
export function isChatProcessing(chatId: number): boolean {
  const run = runs.get(chatId);
  return !!run && !run.answered;
}

/** Ids of this user's chats whose answers are still being generated. */
export function getProcessingChatIds(userId: number): Set<number> {
  const ids = new Set<number>();
  for (const run of runs.values()) {
    if (run.userId === userId && !run.answered) ids.add(run.chatId);
  }
  return ids;
}

/**
 * Streams a run to a client as SSE: first replays everything emitted so far,
 * then forwards new events live until the run ends or the client disconnects.
 */
export function streamChatRun(run: ChatRun): Response {
  const encoder = new TextEncoder();
  let listener: Listener | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const close = () => {
        try {
          controller.close();
        } catch {
          // Already closed
        }
      };
      const send = (event: StreamEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Client went away; the run itself keeps going
        }
      };

      for (const event of run.events) send(event);
      if (run.finished) {
        close();
        return;
      }
      listener = { onEvent: send, onEnd: close };
      run.listeners.add(listener);
    },
    cancel() {
      if (listener) run.listeners.delete(listener);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
