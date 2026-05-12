/**
 * Client-side session management for the download gate.
 *
 * Flow:
 *   1. After a test completes, call createSession() to mint a server-side token.
 *   2. The token is stored in sessionStorage so it survives page navigation
 *      within the same tab but is discarded when the tab closes.
 *   3. Before exporting the receipt, checkSession() validates the token with
 *      the backend by sending "Authorization: Bearer <token>".
 *      The server returns 403 if the token is missing, malformed, or expired.
 */

const TOKEN_KEY = 'spidtes_session_token';

export interface SessionCheckResult {
  valid: boolean;
  grade?: string;
  isp?: string;
  error?: string;
}

/**
 * Creates a server-side session after a test completes.
 * Stores the returned token in sessionStorage for subsequent requests.
 */
export async function createSession(grade: string, isp: string): Promise<string> {
  const res = await fetch('/api/create-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grade, isp }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create session: ${res.status} ${res.statusText}`);
  }
  const { token } = (await res.json()) as { token: string };
  sessionStorage.setItem(TOKEN_KEY, token);
  return token;
}

/**
 * Validates the stored session token against the backend.
 *
 * The Authorization header with "Bearer <token>" is the critical piece that
 * was missing before — sending requests without it returns 403.
 */
export async function checkSession(): Promise<SessionCheckResult> {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) {
    return { valid: false, error: 'No session token found. Please run a speed test first.' };
  }
  try {
    const res = await fetch('/api/check-session', {
      method: 'GET',
      headers: {
        // This Authorization header is required by the backend.
        // Omitting it causes the server to return 403 Forbidden.
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.status === 403) {
      const body = (await res.json()) as { error?: string };
      sessionStorage.removeItem(TOKEN_KEY);
      return { valid: false, error: body.error ?? 'Session rejected by server.' };
    }
    if (!res.ok) {
      return { valid: false, error: `Unexpected server response: ${res.status}` };
    }
    const data = (await res.json()) as { valid: boolean; grade?: string; isp?: string };
    return data;
  } catch (err) {
    return { valid: false, error: 'Network error while checking session.' };
  }
}

export function clearSession(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}
