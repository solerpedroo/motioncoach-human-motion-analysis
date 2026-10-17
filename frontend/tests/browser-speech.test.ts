import { afterEach, expect, it, vi } from "vitest";
import { createBrowserSpeechPort } from "@/components/workout/browser-speech";

afterEach(() => vi.unstubAllGlobals());
it("does not require a local-only voice before speaking", () => {
  const speak = vi.fn(),
    cancel = vi.fn(),
    resume = vi.fn(),
    getVoices = vi
      .fn()
      .mockReturnValue([{ localService: false, lang: "en-US" }]);
  vi.stubGlobal("window", {
    speechSynthesis: { speak, cancel, getVoices, resume },
  });
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      constructor(public text: string) {}
    },
  );
  const port = createBrowserSpeechPort();
  expect(port?.available()).toBe(true);
  const failed = vi.fn();
  port?.speak("Repetition completed.", vi.fn(), failed);
  expect(failed).not.toHaveBeenCalled();
  expect(speak).toHaveBeenCalledWith(
    expect.objectContaining({
      text: "Repetition completed.",
      lang: "en-US",
    }),
  );
  port?.cancel();
  expect(cancel).toHaveBeenCalledOnce();
});
it("speaks Portuguese with a local voice and still rejects remote voices", () => {
  const speak = vi.fn(),
    cancel = vi.fn(),
    getVoices = vi.fn().mockReturnValue([
      { localService: true, lang: "en-US" },
      { localService: false, lang: "pt-BR" },
      { localService: true, lang: "pt-BR" },
    ]);
  vi.stubGlobal("window", { speechSynthesis: { speak, cancel, getVoices } });
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      constructor(public text: string) {}
    },
  );
  let language: "en" | "pt-BR" = "pt-BR";
  const port = createBrowserSpeechPort(() => language);
  expect(port?.available()).toBe(true);
  port?.speak("Repetição concluída.", vi.fn(), vi.fn());
  expect(speak).toHaveBeenCalledWith(
    expect.objectContaining({
      text: "Repetição concluída.",
      lang: "pt-BR",
    }),
  );
  language = "en";
  expect(port?.available()).toBe(true);
});
it("returns unavailable if the speech API is absent", () => {
  vi.stubGlobal("window", {});
  expect(createBrowserSpeechPort()).toBeNull();
});
