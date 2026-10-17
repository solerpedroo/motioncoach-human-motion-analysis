import {
  EmptySession,
  PageHeading,
  PrivacyNote,
} from "@/components/page-parts";
export default function Dashboard() {
  return (
    <>
      <PageHeading
        eyebrow="MY TRAINING"
        title="Your movement journal."
        description="A place for sessions you choose to keep, and observations you can return to."
      />
      <EmptySession />
      <PrivacyNote />
    </>
  );
}
