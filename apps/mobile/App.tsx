import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { WalletProvider, useWallet } from './src/providers/WalletProvider';
import ConnectScreen from './src/screens/ConnectScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CreatePlanScreen from './src/screens/CreatePlanScreen';
import PlanDetailScreen from './src/screens/PlanDetailScreen';
import GuardiansScreen from './src/screens/GuardiansScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ClaimScreen from './src/screens/ClaimScreen';

/**
 * Screen-based navigation for the Thinkxx mobile app.
 */
type Screen = 'dashboard' | 'create_plan' | 'plan_detail' | 'guardians' | 'settings' | 'claim';

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
      return <GuardiansScreen planAddress={selectedPlan} onBack={() => setScreen('plan_detail')} />;
    case 'claim':
      return <ClaimScreen initialPlanAddress={selectedPlan} onBack={() => setScreen('dashboard')} />;
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
          onClaim={() => {
            setSelectedPlan(null);
            setScreen('claim');
          }}
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
