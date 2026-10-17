import { PageHeading } from "@/components/page-parts";
import { VideoUpload } from "@/components/upload/video-upload";

export default function Upload() {
  return (
    <>
      <PageHeading
        eyebrow="VIDEO ANALYSIS"
        title="See the bigger picture."
        description="Queue a local video. Pose runs in a separate worker, and the file stays private until you delete it or it expires."
      />
      <VideoUpload />
    </>
  );
}
