interface StatusDisplayProps {
  status?: "disconnected" | "connecting" | "connected" | "error";
  isConnecting: boolean;
}

export default function StatusDisplay({
  status,
  isConnecting,
}: StatusDisplayProps) {
  let text = "Click to start";

  if (isConnecting) {
    text = "Connecting...";
  } else if (status === "connected") {
    text = "Listening...";
  } else if (status === "error") {
    text = "Disconnected";
  } else if (status === "disconnected") {
    text = "Click to start";
  }

  return <div className="status">{text}</div>;
}