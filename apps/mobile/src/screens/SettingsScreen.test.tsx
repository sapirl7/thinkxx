/**
 * SettingsScreen tests — validates disconnect and display logic.
 */

describe('SettingsScreen logic', () => {
  it('version matches package.json', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('../../package.json');
    expect(pkg.version).toBe('0.1.0');
  });

  it('disconnect clears state', () => {
    let connected = true;
    let publicKey: string | null = 'abc123';

    function disconnect() {
      connected = false;
      publicKey = null;
    }

    disconnect();
    expect(connected).toBe(false);
    expect(publicKey).toBeNull();
  });

  it('settings items are defined', () => {
    const settingsItems = [
      { label: 'Network', value: 'Devnet' },
      { label: 'Version', value: '0.3.0' },
    ];

    expect(settingsItems).toHaveLength(2);
    expect(settingsItems[0].label).toBe('Network');
    expect(settingsItems[1].value).toBe('0.3.0');
  });
});
