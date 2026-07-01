// Default to Vite proxy (relative path) if no explicit URL set
const TOKEN_SERVER =
  import.meta.env.VITE_TOKEN_SERVER_URL || "";

export interface TokenResponse {
  token: string;
  error?: string;
}

export async function fetchConversationToken(): Promise<string> {
  const url = TOKEN_SERVER
    ? `${TOKEN_SERVER}/api/token`
    : `/api/token`;

  const res = await fetch(url);

  if (!res.ok) {
    let message = `Token server error (${res.status})`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch {
      // use default message
    }
    throw new Error(message);
  }

  const data: TokenResponse = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }
  if (!data.token) {
    throw new Error("Token server returned empty token");
  }
  return data.token;
}