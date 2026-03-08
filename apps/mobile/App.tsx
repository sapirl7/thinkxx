import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { WalletProvider, useWallet } from './src/providers/WalletProvider';
import ConnectScreen from './src/screens/ConnectScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CreatePlanScreen from './src/screens/CreatePlanScreen';
import HeartbeatScreen from './src/screens/HeartbeatScreen';
import PlanDetailScreen from './src/screens/PlanDetailScreen';
import GuardiansScreen from './src/screens/GuardiansScreen';
import SettingsScreen from './src/screens/SettingsScreen';

/**
 * Screen-based navigation for the Thinkxx mobile app.
 * 7 screens covering the full protocol UX.
 */
type Screen =
  | 'dashboard'
  | 'create_plan'
  | 'heartbeat'
  | 'plan_detail'
  | 'guardians'
  | 'settings';

function AppNavigator(): React.JSX.Element {
  const { connected, disconnect } = useWallet();
  const [screen, setScreen] = useState<Screen>('dashboard');

  if (!connected) {
    return <ConnectScreen />;
  }

  switch (screen) {
    case 'create_plan':
      return (
        <CreatePlanScreen
          onBack={() => setScreen('dashboard')}
          onCreated={() => setScreen('dashboard')}
        />
      );
    case 'heartbeat':
      return (
        <HeartbeatScreen
          onBack={() => setScreen('dashboard')}
        />
      );
    case 'plan_detail':
      return (
        <PlanDetailScreen
          onBack={() => setScreen('dashboard')}
          onGuardians={() => setScreen('guardians')}
        />
      );
    case 'guardians':
      return (
        <GuardiansScreen
          onBack={() => setScreen('plan_detail')}
        />
      );
    case 'settings':
      return (
        <SettingsScreen
          onBack={() => setScreen('dashboard')}
          onDisconnect={disconnect}
        />
      );
    default:
      return <DashboardScreen />;
  }
}

export default function App(): React.JSX.Element {
  return (
    <WalletProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </WalletProvider>
  );
}
