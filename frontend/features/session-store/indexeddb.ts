import type { LocalSession } from "./session-recorder";
import { parseLocalSession } from "./validation";
export const SESSION_DATABASE = "motioncoach-local-sessions";
export const SESSION_DATABASE_VERSION = 1;
export function createSessionStore(
  factory: IDBFactory | undefined = globalThis.indexedDB,
  name = SESSION_DATABASE,
) {
  const open = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
      if (!factory) {
        reject(new Error("Local history is unavailable in this browser."));
        return;
      }
      const request = factory.open(name, SESSION_DATABASE_VERSION);
      let failed = false;
      request.onupgradeneeded = () => {
        request.result.createObjectStore("summaries", {
          keyPath: "summary.id",
        });
      };
      request.onerror = () =>
        reject(
          new Error(
            "Local history could not open. Check browser storage settings.",
          ),
        );
      request.onblocked = () => {
        failed = true;
        reject(
          new Error(
            "Local history is blocked by another tab. Close it and retry.",
          ),
        );
      };
      request.onsuccess = () => {
        if (failed) {
          request.result.close();
          return;
        }
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
    });
  async function transaction<T>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const database = await open();
    return new Promise((resolve, reject) => {
      let result: T;
      const tx = database.transaction("summaries", mode);
      const request = operation(tx.objectStore("summaries"));
      request.onsuccess = () => {
        result = request.result;
      };
      tx.oncomplete = () => {
        database.close();
        resolve(result);
      };
      tx.onabort = tx.onerror = () => {
        database.close();
        reject(
          new Error(
            "Local history operation failed. Your unsaved summary is still available until you leave this page.",
          ),
        );
      };
    });
  }
  return {
    async save(session: LocalSession, consent: boolean) {
      if (!consent)
        throw new Error("Choose to save this summary before storing it.");
      const checked = parseLocalSession(session);
      await transaction("readwrite", (store) => store.put(checked));
    },
    async list(): Promise<LocalSession[]> {
      const records = await transaction<unknown[]>("readonly", (store) =>
        store.getAll(),
      );
      return records
        .map(parseLocalSession)
        .sort(
          (a, b) =>
            b.summary.started_at.localeCompare(a.summary.started_at) ||
            a.summary.id.localeCompare(b.summary.id),
        );
    },
    async get(id: string): Promise<LocalSession | null> {
      const record = await transaction<unknown>("readonly", (store) =>
        store.get(id),
      );
      return record === undefined ? null : parseLocalSession(record);
    },
    async remove(id: string) {
      await transaction("readwrite", (store) => store.delete(id));
    },
    async clear() {
      await transaction("readwrite", (store) => store.clear());
    },
  };
}
