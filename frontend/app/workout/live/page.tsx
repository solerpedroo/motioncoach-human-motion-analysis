import { LiveWorkout } from "@/components/camera/live-workout";
import { PageHeading } from "@/components/page-parts";
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
        description="Observe your movement with local camera processing and a live 2D pose overlay."
      />
      <LiveWorkout initialExercise={selected} />
    </>
  );
}
