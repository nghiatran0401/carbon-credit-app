const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface TurnstileVerifyResult {
  success: boolean;
  'error-codes': string[];
  challenge_ts?: string;
  hostname?: string;
}

/**
 * Verify a Cloudflare Turnstile token server-side.
 * Returns true if the token is valid, false otherwise.
 */
export async function verifyTurnstileToken(
  token: string,
  remoteip?: string | null,
): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.error('TURNSTILE_SECRET_KEY is not set');
    return false;
  }

  const body: Record<string, string> = {
    secret: secretKey,
    response: token,
  };
  if (remoteip) {
    body.remoteip = remoteip;
  }

  const res = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const result: TurnstileVerifyResult = await res.json();
  return result.success;
}
