import { useEffect, useState } from "react";
import MicButton from "./components/MicButton";
import StatusDisplay from "./components/StatusDisplay";
import ErrorDisplay from "./components/ErrorDisplay";
import { checkMediaCapabilities } from "./lib/mediaCheck";
import type { MediaCapabilities } from "./lib/mediaCheck";
import { useSpeechConversation } from "./hooks/useSpeechConversation";

export default function App() {
  const [capabilities, setCapabilities] = useState<MediaCapabilities | null>(null);

  const { status, toggleConversation, isTransitioning, errorMessage, clearError } =
    useSpeechConversation();

  useEffect(() => {
    setCapabilities(checkMediaCapabilities());
  }, []);

  if (capabilities && !capabilities.supported) {
    return (
      <div className="container">
        <h1>Speech Engine</h1>
        <p className="subtitle">Powered by ElevenLabs + OpenRouter</p>
        <MicButton disabled={true} onClick={() => {}} status={status} />
        <div className="unsupported">{capabilities.reason}</div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Speech Engine</h1>
      <p className="subtitle">Powered by ElevenLabs + OpenRouter</p>
      <MicButton
        disabled={isTransitioning}
        onClick={toggleConversation}
        status={status}
      />
      <StatusDisplay status={status} isConnecting={isTransitioning} />
      <ErrorDisplay message={errorMessage} onRetry={clearError} />
    </div>
  );
}
