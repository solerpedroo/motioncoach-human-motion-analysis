import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SessionHistory } from "@/components/workout/session-history";
import {
  SaveSession,
  SessionSummaryView,
} from "@/components/workout/session-summary";
import { createSessionStore } from "@/features/session-store/indexeddb";
import { createSessionRecorder } from "@/features/session-store/session-recorder";

let factory: IDBFactory;
beforeEach(() => {
  factory = new IDBFactory();
  vi.stubGlobal("indexedDB", factory);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const sample = (id = "one") =>
  createSessionRecorder({
    id,
    exercise: "squat",
    camera_view: "side",
    started_at: "2026-10-17T12:00:00Z",
    origin_ms: 0,
  }).finish(0, "user_stopped");
it("keeps a finished summary volatile until the explicit save action", async () => {
  const open = vi.spyOn(factory, "open");
  const view = render(
    <>
      <SessionSummaryView session={sample()} />
      <SaveSession session={sample()} />
    </>,
  );
  expect(screen.getByRole("region", { name: "Workout summary" })).toBeVisible();
  expect(screen.getByText("This summary has not been saved.")).toBeVisible();
  expect(open).not.toHaveBeenCalled();
  view.unmount();
  render(<SessionHistory />);
  await screen.findByText("No saved sessions in this browser.");
});
it("saves by explicit opt-in and makes the summary available to history and detail", async () => {
  const view = render(<SaveSession session={sample()} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Save summary in this browser" }),
  );
  await screen.findByRole("button", { name: "Summary saved" });
  expect(await createSessionStore(factory).get("one")).not.toBeNull();
  view.unmount();
  render(<SessionHistory id="one" />);
  await screen.findByRole("region", { name: "Workout summary" });
  fireEvent.click(screen.getByText("Method and limitations"));
  expect(screen.getByText("Not recorded", { exact: false })).toBeVisible();
});
it("deletes an individual saved session and all remaining history", async () => {
  const store = createSessionStore(factory);
  await store.save(sample("one"), true);
  await store.save(sample("two"), true);
  render(<SessionHistory />);
  await waitFor(() =>
    expect(
      screen.getAllByRole("button", { name: "Delete squat session" }),
    ).toHaveLength(2),
  );
  fireEvent.click(
    screen.getAllByRole("button", { name: "Delete squat session" })[0],
  );
  await waitFor(() =>
    expect(
      screen.getAllByRole("button", { name: "Delete squat session" }),
    ).toHaveLength(1),
  );
  expect(await store.list()).toHaveLength(1);
  fireEvent.click(
    screen.getByRole("button", { name: "Delete all saved sessions" }),
  );
  await screen.findByText("No saved sessions in this browser.");
  expect(await store.list()).toEqual([]);
});
it("reports a missing saved session without starting camera access", async () => {
  render(<SessionHistory id="missing" />);
  await screen.findByText("Session unavailable in this browser.");
  expect(screen.queryByRole("region", { name: "Workout summary" })).toBeNull();
});
it("preserves the unsaved summary when storage access fails and allows retry", async () => {
  const open = vi.spyOn(factory, "open").mockImplementation(() => {
    throw new DOMException("Storage denied", "SecurityError");
  });
  render(<SaveSession session={sample()} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Save summary in this browser" }),
  );
  await screen.findByText("Summary could not be saved. Try again.");
  expect(
    screen.getByRole("button", { name: "Save summary in this browser" }),
  ).toBeEnabled();
  open.mockRestore();
  fireEvent.click(
    screen.getByRole("button", { name: "Save summary in this browser" }),
  );
  await screen.findByRole("button", { name: "Summary saved" });
});
it("does not silently remove a corrupt record and still offers deletion", async () => {
  const store = createSessionStore(factory);
  await store.save(sample(), true);
  const db = await new Promise<IDBDatabase>((resolve) => {
    const request = factory.open("motioncoach-local-sessions", 1);
    request.onsuccess = () => resolve(request.result);
  });
  await new Promise<void>((resolve) => {
    const tx = db.transaction("summaries", "readwrite");
    tx.objectStore("summaries").put({
      summary: { id: "one" },
      storage_version: 99,
    });
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
  });
  render(<SessionHistory />);
  await screen.findByRole("alert");
  fireEvent.click(
    screen.getByRole("button", { name: "Delete all saved sessions" }),
  );
  await screen.findByText("No saved sessions in this browser.");
});
