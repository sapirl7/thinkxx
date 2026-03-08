import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { WalletProvider, useWallet } from './src/providers/WalletProvider';
import ConnectScreen from './src/screens/ConnectScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CreatePlanScreen from './src/screens/CreatePlanScreen';
import HeartbeatScreen from './src/screens/HeartbeatScreen';

/**
 * Simple screen-based navigation.
 * Full React Navigation to be added when the app grows.
 */
type Screen = 'dashboard' | 'create_plan' | 'heartbeat';

function AppNavigator(): React.JSX.Element {
  const { connected } = useWallet();
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
