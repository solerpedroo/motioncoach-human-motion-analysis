import { PageHeading, PreviewNotice } from "@/components/page-parts";
import { WorkoutPreview } from "@/components/workout-preview";
export default function Upload() {
  return (
    <>
      <PageHeading
        eyebrow="VIDEO ANALYSIS"
        title="See the bigger picture."
        description="A workspace for reviewing recorded movement, one observation at a time."
      />
      <PreviewNotice />
      <WorkoutPreview mode="upload" />
    </>
  );
}
