import { ArrowUpRight, MoveUpRight, ScanLine, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { exercises } from "@/lib/exercises";
import { en } from "@/messages/en";

export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function PreviewNotice() {
  return (
    <div className="notice">
      <ScanLine size={18} />
      <p>{en.previewNotice}</p>
    </div>
  );
}

export function PrivacyNote() {
  return (
    <div className="privacy-note">
      <ShieldCheck size={21} />
      <div>
        <strong>{en.privacy}</strong>
        <p>{en.privacyDetail}</p>
      </div>
      <Link href="/settings">
        Privacy preferences <ArrowUpRight size={15} />
      </Link>
    </div>
  );
}

export function ExerciseCards({ detailed = false }: { detailed?: boolean }) {
  return (
    <div className="exercise-grid">
      {exercises.map((exercise) => (
        <article className="exercise-card" key={exercise.id}>
          <div className="exercise-art">
            <span className="exercise-number">{exercise.number}</span>
            <MovementDiagram kind={exercise.id} />
            <span className="view-tag">{exercise.view}</span>
          </div>
          <div className="exercise-copy">
            <p className="eyebrow">{exercise.category}</p>
            <h3>{exercise.name}</h3>
            <p>{exercise.detail}</p>
            {detailed ? (
              <>
                <dl>
                  <dt>Required joints</dt>
                  <dd>{exercise.joints}</dd>
                </dl>
                <p className="limitation">{exercise.limitation}</p>
              </>
            ) : null}
            <Link href={`/workout/live?exercise=${exercise.id}`}>
              Explore exercise <MoveUpRight size={15} />
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

// Decorative framing diagrams, not inferred pose or measured movement.
export function MovementDiagram({ kind = "squat" }: { kind?: string }) {
  const shapes: Record<
    string,
    { head: [number, number]; points: string; arms: string }
  > = {
    squat: {
      head: [91, 28],
      points: "89,45 67,83 106,107 65,140 91,142",
      arms: "88,49 115,68 139,66",
    },
    push_up: {
      head: [141, 67],
      points: "127,73 87,86 36,103 23,111",
      arms: "126,75 115,107 135,117",
    },
    biceps_curl: {
      head: [86, 27],
      points: "85,44 85,91 74,139 53,141",
      arms: "88,48 105,77 117,52",
    },
    jumping_jack: {
      head: [90, 29],
      points: "90,46 90,90 56,139 39,142",
      arms: "90,50 64,37 47,16",
    },
  };
  const shape = shapes[kind] ?? shapes.squat;
  return (
    <svg viewBox="0 0 180 160" aria-hidden="true" className="movement-diagram">
      <path d="M20 144H160" className="diagram-floor" />
      <circle cx={shape.head[0]} cy={shape.head[1]} r="10" />
      <polyline points={shape.points} />
      <polyline points={shape.arms} />
      {kind === "jumping_jack" ? (
        <>
          <polyline points="90,50 116,37 133,16" />
          <polyline points="90,90 124,139 141,142" />
        </>
      ) : null}
      <circle
        cx={kind === "squat" ? 106 : 90}
        cy={kind === "squat" ? 107 : 90}
        r="4"
        className="diagram-joint"
      />
    </svg>
  );
}

export function EmptySession({ report = false }: { report?: boolean }) {
  return (
    <section className="panel empty-state">
      <div className="empty-icon">
        <ScanLine size={30} />
      </div>
      <span className="small-label">
        {report ? "REPORT PREVIEW" : "YOUR TRAINING JOURNAL"}
      </span>
      <h2>
        {report
          ? "No measured session here yet"
          : "Every session starts with a little space."}
      </h2>
      <p>
        {report
          ? "This route is a preview. Real repetitions, angle traces and events will appear after a completed session."
          : "Your saved sessions will live here when local history is available. Saving will always be your choice."}
      </p>
      <Button asChild>
        <Link href="/workout/live">
          Explore live workout <ArrowUpRight size={16} />
        </Link>
      </Button>
      <Link
        className="text-link"
        href={report ? "/dashboard" : "/sessions/demo"}
      >
        {report ? "Back to my training" : "View report preview"}
      </Link>
    </section>
  );
}
