import { afterEach, expect, it, vi } from "vitest";
import { createBrowserSpeechPort } from "@/components/workout/browser-speech";

afterEach(() => vi.unstubAllGlobals());
it("does not use remote voices or microphone access", () => {
  const speak = vi.fn(),
    cancel = vi.fn(),
    getVoices = vi
      .fn()
      .mockReturnValue([{ localService: false, lang: "en-US" }]);
  vi.stubGlobal("window", { speechSynthesis: { speak, cancel, getVoices } });
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      constructor(public text: string) {}
    },
  );
  const port = createBrowserSpeechPort();
  expect(port?.available()).toBe(false);
  const failed = vi.fn();
  port?.speak("Keep your full body visible.", vi.fn(), failed);
  expect(speak).not.toHaveBeenCalled();
  expect(failed).toHaveBeenCalledOnce();
  const local = { localService: true, lang: "en-US" };
  getVoices.mockReturnValue([local]);
  expect(port?.available()).toBe(true);
  port?.speak("Repetition completed.", vi.fn(), failed);
  expect(speak).toHaveBeenCalledWith(
    expect.objectContaining({
      text: "Repetition completed.",
      voice: local,
      lang: "en-US",
    }),
  );
  port?.cancel();
  expect(cancel).toHaveBeenCalledOnce();
});
it("returns unavailable if the speech API is absent", () => {
  vi.stubGlobal("window", {});
  expect(createBrowserSpeechPort()).toBeNull();
});
