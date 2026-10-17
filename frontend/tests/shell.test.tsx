import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Methodology from "@/app/about/methodology/page";
import Dashboard from "@/app/dashboard/page";
import Exercises from "@/app/exercises/page";
import Overview from "@/app/page";
import Session from "@/app/sessions/[id]/page";
import Settings from "@/app/settings/page";
import Live from "@/app/workout/live/page";
import UploadPage from "@/app/workout/upload/page";
import { AppShell } from "@/components/app-shell";
import { WorkoutPreview } from "@/components/workout-preview";
import { navigation } from "@/lib/navigation";
import { en } from "@/messages/en";

vi.mock("next/navigation", () => ({ usePathname: () => "/workout/live" }));

it("exposes every navigation destination and marks the current route", () => {
  render(
    <AppShell>
      <p>Content</p>
    </AppShell>,
  );
  const nav = screen.getByRole("navigation", { name: "Main navigation" });
  for (const item of navigation)
    expect(nav.querySelector(`a[href="${item.href}"]`)).toHaveTextContent(
      item.label,
    );
  expect(screen.getByRole("link", { name: "Live workout" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute(
    "href",
    "#main-content",
  );
});

describe("scope routes", () => {
  const routes = [
    ["overview", () => <Overview />],
    ["dashboard", () => <Dashboard />],
    ["exercises", () => <Exercises />],
    ["settings", () => <Settings />],
    ["methodology", () => <Methodology />],
    ["upload", () => <UploadPage />],
    [
      "live",
      () =>
        Live({ searchParams: Promise.resolve({ exercise: "jumping_jack" }) }),
    ],
    ["session", () => Session({ params: Promise.resolve({ id: "demo" }) })],
  ] as const;
  for (const [name, page] of routes) {
    it(`renders ${name} with one page heading`, async () => {
      render(await page());
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    });
  }
});

it("previews all named states with an explicit recovery or navigation action", async () => {
  const user = userEvent.setup();
  render(<WorkoutPreview mode="live" />);
  const select = screen.getByRole("combobox", { name: "Preview state" });
  for (const [state, message] of Object.entries(en.states)) {
    await user.click(select);
    await user.click(
      screen.getByRole("option", { name: state.replaceAll("_", " ") }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(message.title);
    expect(
      screen.getByText(message.action, { selector: "button, a" }),
    ).toBeVisible();
  }
  await user.click(select);
  await user.click(screen.getByRole("option", { name: "camera denied" }));
  await user.click(screen.getByRole("button", { name: "Back to setup" }));
  expect(select).toHaveTextContent("idle");
});

it("selects all four exercises and keeps measurements unavailable", async () => {
  const user = userEvent.setup();
  render(<WorkoutPreview mode="live" />);
  const select = screen.getByRole("combobox", { name: "Exercise" });
  for (const name of ["Squat", "Push-up", "Biceps curl", "Jumping jack"]) {
    await user.click(select);
    await user.click(screen.getByRole("option", { name }));
    expect(select).toHaveTextContent(name);
    expect(screen.getByText("Not measured")).toBeVisible();
  }
  expect(
    screen.getByRole("button", { name: "Camera coming in a later release" }),
  ).toBeDisabled();
});

it("does not request media, upload files, or save data during preview interactions", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  const saveSpy = vi.spyOn(Storage.prototype, "setItem");
  const media = vi.fn();
  vi.stubGlobal("navigator", {
    ...navigator,
    mediaDevices: { getUserMedia: media },
  });
  render(<WorkoutPreview mode="upload" />);
  const preview = screen.getByRole("combobox", { name: "Preview state" });
  await userEvent.click(preview);
  await userEvent.click(screen.getByRole("option", { name: "processing" }));
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(saveSpy).not.toHaveBeenCalled();
  expect(media).not.toHaveBeenCalled();
  expect(document.querySelector('input[type="file"]')).toBeNull();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
