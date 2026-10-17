import { PageHeading, PrivacyNote } from "@/components/page-parts";
import { SessionHistory } from "@/components/workout/session-history";
export default function Dashboard() {
  return (
    <>
      <PageHeading
        eyebrow="MY TRAINING"
        title="Your movement journal."
        description="A place for sessions you choose to keep, and observations you can return to."
      />
      <SessionHistory />
      <PrivacyNote />
    </>
  );
}
