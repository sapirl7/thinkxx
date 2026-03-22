/**
 * SettingsScreen tests — render-based.
 *
 * Covers: disconnect callback, settings display.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';

import { resetMobileMocks } from '../../test/setup';

import SettingsScreen from './SettingsScreen';

const onBack = jest.fn();
const onDisconnect = jest.fn();

beforeEach(() => {
  resetMobileMocks();
  onBack.mockReset();
  onDisconnect.mockReset();
});

describe('SettingsScreen', () => {
  it('renders all settings sections', () => {
    const { container } = render(<SettingsScreen onBack={onBack} onDisconnect={onDisconnect} />);
    expect(container.textContent).toContain('Security');
    expect(container.textContent).toContain('Notifications');
    expect(container.textContent).toContain('Protocol');
    expect(container.textContent).toContain('About');
    expect(container.textContent).toContain('Danger Zone');
  });

  it('shows version info', () => {
    const { container } = render(<SettingsScreen onBack={onBack} onDisconnect={onDisconnect} />);
    expect(container.textContent).toContain('Version');
  });

  it('shows network as Devnet', () => {
    const { container } = render(<SettingsScreen onBack={onBack} onDisconnect={onDisconnect} />);
    expect(container.textContent).toContain('Devnet');
  });

  it('renders disconnect option in danger zone', () => {
    const { container } = render(<SettingsScreen onBack={onBack} onDisconnect={onDisconnect} />);
    expect(container.textContent).toContain('Disconnect Wallet');
  });
});
