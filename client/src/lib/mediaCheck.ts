export interface MediaCapabilities {
  hasMediaDevices: boolean;
  hasGetUserMedia: boolean;
  hasAudioInput: boolean;
  supported: boolean;
  reason?: string;
}

export function checkMediaCapabilities(): MediaCapabilities {
  const hasMediaDevices =
    typeof navigator !== "undefined" && "mediaDevices" in navigator;
  const hasGetUserMedia =
    hasMediaDevices && "getUserMedia" in navigator.mediaDevices;

  if (!hasMediaDevices) {
    return {
      hasMediaDevices: false,
      hasGetUserMedia: false,
      hasAudioInput: false,
      supported: false,
      reason: "Your browser does not support media devices (WebRTC).",
    };
  }

  if (!hasGetUserMedia) {
    return {
      hasMediaDevices: true,
      hasGetUserMedia: false,
      hasAudioInput: false,
      supported: false,
      reason:
        "Your browser does not support microphone access (getUserMedia).",
    };
  }

  return {
    hasMediaDevices: true,
    hasGetUserMedia: true,
    hasAudioInput: true,
    supported: true,
  };
}