import { ExerciseCards, PageHeading } from "@/components/page-parts";
export default function Exercises() {
  return (
    <>
      <PageHeading
        eyebrow="EXERCISE LIBRARY"
        title="Start with a good view."
        description="Four exercises, each with its own framing needs. Visibility determines what can be observed."
      />
      <ExerciseCards detailed />
      <div className="notice">
        <p>
          These guides describe camera framing. They do not prescribe range of
          motion or assess physical execution.
        </p>
      </div>
    </>
  );
}
