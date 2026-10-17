import { PageHeading, PreviewNotice } from "@/components/page-parts";
import { WorkoutPreview } from "@/components/workout-preview";
import { exercises } from "@/lib/exercises";
export default async function Live({
  searchParams,
}: {
  searchParams: Promise<{ exercise?: string }>;
}) {
  const params = await searchParams;
  const selected =
    exercises.find((item) => item.id === params.exercise)?.id ?? "squat";
  return (
    <>
      <PageHeading
        eyebrow="LIVE WORKOUT"
        title="Your space to move."
        description="Set up your view, find your framing, and get to know the session experience."
      />
      <PreviewNotice />
      <WorkoutPreview mode="live" initialExercise={selected} />
    </>
  );
}
