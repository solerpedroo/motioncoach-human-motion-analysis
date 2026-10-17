export function createCamera(
  media: Pick<MediaDevices, "getUserMedia" | "enumerateDevices">,
) {
  let generation = 0;
  let current: MediaStream | null = null;
  const stop = () => {
    generation++;
    current?.getTracks().forEach((track) => {
      track.stop();
    });
    current = null;
  };
  return {
    stop,
    async open(deviceId?: string): Promise<MediaStream | null> {
      stop();
      const token = generation;
      const stream = await media.getUserMedia({
        audio: false,
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        },
      });
      if (token !== generation) {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
        return null;
      }
      current = stream;
      return stream;
    },
    async devices() {
      return (await media.enumerateDevices()).filter(
        (device) => device.kind === "videoinput",
      );
    },
  };
}
export function cameraError(error: unknown): string {
  const name =
    error && typeof error === "object" && "name" in error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Camera permission denied. Allow camera access in your browser, then try again.";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "Camera unavailable. Select another camera or reconnect it, then try again.";
  return "Camera could not start. Close other camera apps and try again on HTTPS or localhost.";
}
