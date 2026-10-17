export const en = {
  brand: "MotionCoach",
  tagline: "Understand your movement.",
  preview: "Interface preview",
  previewNotice:
    "Live sessions stay in this browser. Video upload uses the local API; charts and file export are not available yet.",
  privacy: "Your movement. Your data.",
  privacyDetail:
    "Live analysis is designed to stay in your browser. Recording and saving a session require separate choices.",
  limit:
    "Educational movement observations. Estimates depend on visibility and camera angle; they do not diagnose injury or certify that a movement is safe.",
  nav: {
    overview: "Overview",
    dashboard: "My training",
    live: "Live workout",
    upload: "Video analysis",
    exercises: "Exercise library",
    settings: "Preferences",
    methodology: "How it works",
  },
  states: {
    idle: {
      title: "Your space is ready",
      description:
        "Choose an exercise and review the framing guide before a future camera session.",
      action: "Review framing guide",
    },
    requesting_permission: {
      title: "Waiting for camera access",
      description:
        "In a camera session, allow video access in your browser. No microphone is needed.",
      action: "Back to setup",
    },
    camera_denied: {
      title: "Camera access was denied",
      description:
        "Check camera permissions in your browser, then return to setup to try again.",
      action: "Back to setup",
    },
    loading_model: {
      title: "Preparing pose detection",
      description:
        "The future camera flow will load the model before analysis. No model is loading in this preview.",
      action: "Back to setup",
    },
    calibrating: {
      title: "Check your framing",
      description:
        "Keep the required joints visible and the camera stable. This checks visibility, not personal biomechanics.",
      action: "Review framing guide",
    },
    ready: {
      title: "Ready to observe",
      description:
        "This previews the ready state. Capture remains off and no movement has been measured.",
      action: "Back to setup",
    },
    analyzing: {
      title: "Observing movement",
      description:
        "In a real session, phase and repetition updates will appear here. This preview has no measurements.",
      action: "Preview pause",
    },
    paused: {
      title: "Session paused",
      description:
        "The future session will suspend repetition transitions while paused. This is a simulated state.",
      action: "Preview resume",
    },
    no_pose: {
      title: "No person detected",
      description: "Move into view and keep your full body inside the frame.",
      action: "Review framing guide",
    },
    low_confidence: {
      title: "Movement is partially hidden",
      description:
        "Adjust the camera so the required joints remain visible. Missing angles will stay unavailable.",
      action: "Review framing guide",
    },
    processing: {
      title: "Preparing your analysis",
      description:
        "A future video job will show its actual stage here. No file has been uploaded in this preview.",
      action: "Back to setup",
    },
    completed: {
      title: "Session summary preview",
      description:
        "A real completed session will show measured repetitions and events. No results have been generated here.",
      action: "View report preview",
    },
    failed: {
      title: "Analysis could not finish",
      description:
        "The future flow will show a specific failure reason and allow another attempt. This is a simulated error.",
      action: "Back to setup",
    },
    cancelled: {
      title: "Analysis cancelled",
      description:
        "This is a demonstration of cancellation. No video job was created.",
      action: "Back to setup",
    },
  },
  feedback: {
    "framing.joints_hidden": "Make sure your knees and hips are visible.",
    "framing.arm_hidden": "Keep the selected arm visible.",
    "framing.prefer_side_view": "Try positioning the camera to the side.",
    "framing.full_body_front": "Keep both arms and both feet visible.",
    "framing.prefer_front_view": "Use a front-facing camera for this exercise.",
    "rep.not_fully_observed": "Your movement was not fully captured.",
    "rep.partial_movement": "Partial movement detected.",
    "rep.completed": "Repetition completed.",
    "capture.unstable_view": "Try a more stable camera angle.",
    "consistency.smaller_range":
      "This repetition had a smaller observed range of motion.",
    "consistency.elbow_drift": "Elbow position varied across repetitions.",
  },
} as const;
export type ScreenState = keyof typeof en.states;
