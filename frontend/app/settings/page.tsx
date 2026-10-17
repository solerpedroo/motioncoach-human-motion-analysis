import { CameraOff, Database, ShieldCheck, VolumeX } from "lucide-react";
import { PageHeading } from "@/components/page-parts";

const preferences = [
  {
    icon: CameraOff,
    title: "Camera",
    state: "Off",
    description:
      "Camera access is not available in this preview. Future sessions will request video only, by your action.",
  },
  {
    icon: VolumeX,
    title: "Voice feedback",
    state: "Off",
    description:
      "Optional synthesized speech will be available in live sessions. It will not require microphone access.",
  },
  {
    icon: Database,
    title: "Local session history",
    state: "Not enabled",
    description:
      "No session data is persisted in this foundation. Future saving will require an explicit choice and include deletion controls.",
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
        description="Understand each permission and what happens to your data. These are preview defaults; nothing is saved."
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
