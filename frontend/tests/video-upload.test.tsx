import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { VideoUpload } from "@/components/upload/video-upload";

it("offers a local video job without claiming a result yet", () => {
  render(<VideoUpload />);
  expect(screen.getByLabelText("Video file")).toBeRequired();
  expect(screen.getByRole("combobox", { name: "Exercise" })).toHaveValue(
    "squat",
  );
  expect(screen.getByRole("button", { name: "Analyze video" })).toBeEnabled();
  expect(screen.getByText(/temporary/i)).toBeVisible();
  expect(screen.queryByRole("status")).toBeNull();
});
