const TOKEN_KEY = "medicareai_session_token";

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSessionToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
