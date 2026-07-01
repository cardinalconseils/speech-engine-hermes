interface MicButtonProps {
  disabled: boolean;
  onClick: () => void;
  status?: "disconnected" | "connecting" | "connected" | "error";
}

export default function MicButton({
  disabled,
  onClick,
  status,
}: MicButtonProps) {
  const className = [
    "mic-button",
    status === "connecting" && "connecting",
    status === "connected" && "connected",
    status === "error" && "error-state",
  ]
    .filter(Boolean)
    .join(" ");

  const label =
    status === "connected"
      ? "Listening — click to end"
      : status === "connecting"
      ? "Connecting..."
      : status === "error"
      ? "Error — click to retry"
      : "Click to start";

  return (
    <button
      className={className}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
    >
      {status === "connecting" ? (
        <span className="spinner" />
      ) : (
        <span aria-hidden="true">🎙️</span>
      )}
      <span className="sr-only">{label}</span>
    </button>
  );
}