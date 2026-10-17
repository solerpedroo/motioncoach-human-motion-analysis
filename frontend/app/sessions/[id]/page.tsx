import { EmptySession, PageHeading } from "@/components/page-parts";
export default async function Session({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <PageHeading
        eyebrow="SESSION REPORT"
        title="A closer look at your session."
        description={
          id === "demo"
            ? "Report preview — no real session data."
            : "Session unavailable — this foundation does not store or load sessions yet."
        }
      />
      <EmptySession report />
    </>
  );
}
