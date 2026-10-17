"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { LocalSession } from "@/features/session-store/session-recorder";
import styles from "./session.module.css";
import { SessionSummaryView } from "./session-summary";
export function SessionHistory({ id }: { id?: string }) {
  const [records, setRecords] = useState<LocalSession[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const load = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      const { createSessionStore } = await import(
        "@/features/session-store/indexeddb"
      );
      const store = createSessionStore();
      const items = id
        ? [await store.get(id)].filter(
            (item): item is LocalSession => item !== null,
          )
        : await store.list();
      setRecords(items);
      setStatus("ready");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Local history could not load. Try again.",
      );
      setStatus("error");
    }
  }, [id]);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { createSessionStore } = await import(
          "@/features/session-store/indexeddb"
        );
        const store = createSessionStore();
        const items = id
          ? [await store.get(id)].filter(
              (item): item is LocalSession => item !== null,
            )
          : await store.list();
        if (active) {
          setRecords(items);
          setStatus("ready");
        }
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Local history could not load. Try again.",
          );
          setStatus("error");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);
  const remove = async (sessionId?: string) => {
    setPending(true);
    setError("");
    try {
      const { createSessionStore } = await import(
        "@/features/session-store/indexeddb"
      );
      const store = createSessionStore();
      if (sessionId) await store.remove(sessionId);
      else await store.clear();
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Deletion failed. Try again.",
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <section className={styles.panel} aria-label="Local session history">
      <h2>{id ? "Saved session" : "Local session history"}</h2>
      <p>
        Only summaries you chose to save appear here. Browser storage can be
        cleared or evicted; this is not a backup.
      </p>
      {status === "loading" && <p role="status">Loading local history…</p>}
      {error && <p role="alert">{error}</p>}
      {status === "ready" && records.length === 0 && (
        <p>
          {id
            ? "Session unavailable in this browser."
            : "No saved sessions in this browser."}
        </p>
      )}
      {id ? (
        records.map((record) => (
          <div key={record.summary.id}>
            <SessionSummaryView session={record} />
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => void remove(record.summary.id)}
            >
              Delete this session
            </Button>
          </div>
        ))
      ) : (
        <ul className={styles.history}>
          {records.map((record) => (
            <li key={record.summary.id}>
              <Link href={`/sessions/${encodeURIComponent(record.summary.id)}`}>
                {record.summary.exercise.replaceAll("_", " ")} ·{" "}
                {new Date(record.summary.started_at).toLocaleString("en-US")}
              </Link>
              <p>
                {record.summary.completed_repetitions} complete ·{" "}
                {record.summary.incomplete_repetitions} incomplete
              </p>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => void remove(record.summary.id)}
              >
                Delete {record.summary.exercise.replaceAll("_", " ")} session
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.actions}>
        <Button
          variant="outline"
          disabled={pending || status === "loading"}
          onClick={() => void load()}
        >
          Refresh history
        </Button>
        <Button
          variant="outline"
          disabled={
            pending ||
            status === "loading" ||
            (status === "ready" && records.length === 0 && !id)
          }
          onClick={() => void remove()}
        >
          Delete all saved sessions
        </Button>
        <Link href="/workout/live">Start a live workout</Link>
      </div>
      <p className={styles.note}>
        Deletion removes saved summaries from this browser. An unsaved summary
        may remain in another open workout tab until you leave it.
      </p>
    </section>
  );
}
