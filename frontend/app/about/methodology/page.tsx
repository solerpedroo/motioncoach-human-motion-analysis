import { ArrowRight } from "lucide-react";
import { PageHeading, PrivacyNote } from "@/components/page-parts";

const steps = [
  [
    "01",
    "Observe",
    "A pose model will estimate body landmarks from one camera view. Missing or hidden joints remain uncertain.",
  ],
  [
    "02",
    "Understand",
    "A separate movement engine will calculate 2D angles and identify phases using explicit, versioned rules.",
  ],
  [
    "03",
    "Reflect",
    "Completed cycles will become repetitions, with observations linked to visibility, timing and the rule that produced them.",
  ],
];
export default function Methodology() {
  return (
    <>
      <PageHeading
        eyebrow="HOW IT WORKS"
        title="Observations you can understand."
        description="From visible landmarks to explainable movement events. A method built around uncertainty and reproducibility."
      />
      <section className="method-grid">
        {steps.map(([number, title, text]) => (
          <article className="panel method-card" key={number}>
            <span>{number}</span>
            <h2>{title}</h2>
            <p>{text}</p>
            <ArrowRight size={20} />
          </article>
        ))}
      </section>
      <section className="panel prose-panel">
        <p className="eyebrow">WHAT AN OBSERVATION CAN TELL YOU</p>
        <h2>Visibility comes before a conclusion.</h2>
        <p>
          Pose quality describes the available data: GOOD, LIMITED or
          INSUFFICIENT. It is not a rating of how you exercise. Missing angles
          stay unavailable, and an uncertain movement cannot complete a
          repetition.
        </p>
        <p>
          One camera gives a two-dimensional view. It cannot determine muscle
          effort, load distribution, pain or clinical conditions. Initial
          thresholds are unvalidated development seeds.
        </p>
        <h3>Evaluation status: not evaluated</h3>
        <p>
          No pose model, human video or scientific benchmark has run in this
          foundation. Accuracy and performance will only be reported after
          documented evaluation with suitable reference data.
        </p>
        <h3>Current release</h3>
        <p>
          This release contains shared contracts, an API liveness endpoint and
          an interface preview. Capture, repetition analysis, reports and local
          history follow in later releases.
        </p>
      </section>
      <PrivacyNote />
    </>
  );
}
