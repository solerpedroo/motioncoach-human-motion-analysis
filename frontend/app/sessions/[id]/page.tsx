import { PageHeading } from "@/components/page-parts";
import { SessionHistory } from "@/components/workout/session-history";
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
        description="Summaries are loaded from this browser only, when you have chosen to save them."
      />
      <SessionHistory key={id} id={id} />
    </>
  );
}
