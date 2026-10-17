import { CameraOff, Database, ShieldCheck, VolumeX } from "lucide-react";
import { PageHeading } from "@/components/page-parts";

const preferences = [
  {
    icon: CameraOff,
    title: "Camera",
    state: "Off",
    description:
      "Live Workout requests video only when you press Start. Stop or leaving that page releases the camera.",
  },
  {
    icon: VolumeX,
    title: "Voice feedback",
    state: "Off",
    description:
      "Live sessions offer optional synthesized speech with a local English voice. Disabling voice interrupts speech immediately; no microphone is requested.",
  },
  {
    icon: Database,
    title: "Local session history",
    state: "Opt-in only",
    description:
      "Save a finished summary explicitly in Live Workout. My training lists saved summaries and offers individual and bulk deletion. Video and landmarks are never stored.",
  },
  {
    icon: ShieldCheck,
    title: "Recording & uploads",
    state: "Unavailable",
    description:
      "Recording will require a separate action. Uploaded videos will use temporary storage and an explicit retention policy.",
  },
];
export default function Settings() {
  return (
    <>
      <PageHeading
        eyebrow="PREFERENCES & PRIVACY"
        title="You decide what stays."
        description="Understand each permission and your local data choices. Voice starts off and summaries are saved only by your action."
      />
      <section className="panel preference-list">
        {preferences.map(({ icon: Icon, title, state, description }) => (
          <article className="preference-row" key={title}>
            <div className="path-icon">
              <Icon size={23} />
            </div>
            <div>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
            <span className="pill">{state}</span>
          </article>
        ))}
      </section>
      <section className="panel language-panel">
        <h2>Language & appearance</h2>
        <p>English · Dark theme</p>
        <p className="muted">
          Portuguese translation and appearance preferences will be added in a
          later release.
        </p>
      </section>
    </>
  );
}
