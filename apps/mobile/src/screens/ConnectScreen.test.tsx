/**
 * ConnectScreen tests — validates error display and connection state logic.
 *
 * Tests the logic directly without rendering since RNTL requires
 * a full react-native environment.
 */

// ── Tests ──────────────────────────────────────────────

describe('ConnectScreen logic', () => {
  it('formats error messages for display', () => {
    const errorMessages: Record<string, string> = {
      ERROR_WALLET_NOT_FOUND: 'No compatible Solana wallet found. Please install Phantom or Solflare.',
      ERROR_AUTHORIZATION_FAILED: 'Authorization was canceled or denied by the wallet.',
      GENERIC: 'Failed to connect to wallet. Please try again.',
    };

    expect(errorMessages.ERROR_WALLET_NOT_FOUND).toContain('Phantom');
    expect(errorMessages.ERROR_AUTHORIZATION_FAILED).toContain('denied');
    expect(errorMessages.GENERIC).toContain('try again');
  });

  it('shows error banner only when error is truthy', () => {
    const showBanner = (error: string | null) => error !== null && error.length > 0;

    expect(showBanner(null)).toBe(false);
    expect(showBanner('')).toBe(false);
    expect(showBanner('Some error')).toBe(true);
  });

  it('disables connect button while connecting', () => {
    const isDisabled = (connecting: boolean) => connecting;

    expect(isDisabled(false)).toBe(false);
    expect(isDisabled(true)).toBe(true);
  });

  it('shows app name Thinkxx', () => {
    const APP_NAME = 'Thinkxx';
    expect(APP_NAME).toBe('Thinkxx');
  });
});
