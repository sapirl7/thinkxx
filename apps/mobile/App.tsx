import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { WalletProvider, useWallet } from './src/providers/WalletProvider';
import ConnectScreen from './src/screens/ConnectScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CreatePlanScreen from './src/screens/CreatePlanScreen';
import PlanDetailScreen from './src/screens/PlanDetailScreen';
import GuardiansScreen from './src/screens/GuardiansScreen';
import SettingsScreen from './src/screens/SettingsScreen';

/**
 * Screen-based navigation for the Thinkxx mobile app.
 */
type Screen = 'dashboard' | 'create_plan' | 'plan_detail' | 'guardians' | 'settings';

function AppNavigator(): React.JSX.Element {
  const { connected, disconnect, publicKey } = useWallet();
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const walletAddress = publicKey?.toBase58() ?? null;

  useEffect(() => {
    setSelectedPlan(null);
    setScreen('dashboard');
  }, [walletAddress]);

  if (!connected) {
    return <ConnectScreen />;
  }

  const openPlan = (address: string) => {
    setSelectedPlan(address);
    setScreen('plan_detail');
  };

  switch (screen) {
    case 'create_plan':
      return (
        <CreatePlanScreen
          onBack={() => setScreen('dashboard')}
          onCreated={openPlan}
        />
      );
    case 'plan_detail':
      return (
        <PlanDetailScreen
          planAddress={selectedPlan}
          onBack={() => setScreen('dashboard')}
          onGuardians={() => setScreen('guardians')}
        />
      );
    case 'guardians':
      return <GuardiansScreen onBack={() => setScreen('plan_detail')} />;
    case 'settings':
      return (
        <SettingsScreen
          onBack={() => setScreen('dashboard')}
          onDisconnect={disconnect}
        />
      );
    default:
      return (
        <DashboardScreen
          onCreatePlan={() => setScreen('create_plan')}
          onOpenPlan={openPlan}
          onSettings={() => setScreen('settings')}
        />
      );
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
