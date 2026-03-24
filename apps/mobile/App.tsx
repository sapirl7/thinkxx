import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { WalletProvider, useWallet } from './src/providers/WalletProvider';
import ConnectScreen from './src/screens/ConnectScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CreatePlanScreen from './src/screens/CreatePlanScreen';
import HeartbeatScreen from './src/screens/HeartbeatScreen';
import PlanDetailScreen from './src/screens/PlanDetailScreen';
import GuardiansScreen from './src/screens/GuardiansScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import DepositScreen from './src/screens/DepositScreen';

/**
 * Screen-based navigation for the Thinkxx mobile app.
 * 7 screens covering the full owner-side protocol UX.
 * Plan address is passed through navigation for PlanDetail, Guardians, Heartbeat, Deposit.
 */
type Screen =
  | 'dashboard'
  | 'create_plan'
  | 'heartbeat'
  | 'plan_detail'
  | 'guardians'
  | 'settings'
  | 'deposit';

function AppNavigator(): React.JSX.Element {
  const { connected, publicKey } = useWallet();
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [lastPlanAddress, setLastPlanAddress] = useState<string | null>(null);
  const [selectedPlanAddress, setSelectedPlanAddress] = useState<string | null>(null);
  const walletAddress = publicKey?.toBase58() ?? null;

  useEffect(() => {
    setLastPlanAddress(null);
    setSelectedPlanAddress(null);
    setScreen('dashboard');
  }, [walletAddress]);

  if (!connected) {
    return <ConnectScreen />;
  }

  const navigateToPlanDetail = (planAddr: string): void => {
    setSelectedPlanAddress(planAddr);
    setScreen('plan_detail');
  };

  const navigateToGuardians = (planAddr: string): void => {
    setSelectedPlanAddress(planAddr);
    setScreen('guardians');
  };

  const navigateToHeartbeat = (planAddr?: string): void => {
    if (planAddr) setSelectedPlanAddress(planAddr);
    setScreen('heartbeat');
  };

  const navigateToDeposit = (planAddr: string): void => {
    setSelectedPlanAddress(planAddr);
    setScreen('deposit');
  };

  switch (screen) {
    case 'create_plan':
      return (
        <CreatePlanScreen
          onBack={() => setScreen('dashboard')}
          onCreated={(planAddress: string) => {
            setLastPlanAddress(planAddress);
            setScreen('dashboard');
          }}
        />
      );
    case 'heartbeat':
      return (
        <HeartbeatScreen
          onBack={() => setScreen('dashboard')}
          initialPlanAddress={selectedPlanAddress ?? lastPlanAddress}
        />
      );
    case 'plan_detail':
      return selectedPlanAddress ? (
        <PlanDetailScreen
          planAddress={selectedPlanAddress}
          onBack={() => setScreen('dashboard')}
          onGuardians={navigateToGuardians}
          onHeartbeat={navigateToHeartbeat}
          onDeposit={navigateToDeposit}
        />
      ) : (
        // Fallback: shouldn't happen, but go to dashboard
        <DashboardScreen
          onCreatePlan={() => setScreen('create_plan')}
          onHeartbeat={navigateToHeartbeat}
          onSettings={() => setScreen('settings')}
          onPlanDetail={navigateToPlanDetail}
          onDeposit={navigateToDeposit}
          lastPlanAddress={lastPlanAddress}
        />
      );
    case 'guardians':
      return selectedPlanAddress ? (
        <GuardiansScreen
          planAddress={selectedPlanAddress}
          onBack={() => navigateToPlanDetail(selectedPlanAddress)}
        />
      ) : (
        <DashboardScreen
          onCreatePlan={() => setScreen('create_plan')}
          onHeartbeat={navigateToHeartbeat}
          onSettings={() => setScreen('settings')}
          onPlanDetail={navigateToPlanDetail}
          onDeposit={navigateToDeposit}
          lastPlanAddress={lastPlanAddress}
        />
      );
    case 'settings':
      return (
        <SettingsScreen
          onBack={() => setScreen('dashboard')}
        />
      );
    case 'deposit':
      return selectedPlanAddress ? (
        <DepositScreen
          planAddress={selectedPlanAddress}
          onBack={() => navigateToPlanDetail(selectedPlanAddress)}
        />
      ) : (
        <DashboardScreen
          onCreatePlan={() => setScreen('create_plan')}
          onHeartbeat={navigateToHeartbeat}
          onSettings={() => setScreen('settings')}
          onPlanDetail={navigateToPlanDetail}
          onDeposit={navigateToDeposit}
          lastPlanAddress={lastPlanAddress}
        />
      );
    default:
      return (
        <DashboardScreen
          onCreatePlan={() => setScreen('create_plan')}
          onHeartbeat={navigateToHeartbeat}
          onSettings={() => setScreen('settings')}
          onPlanDetail={navigateToPlanDetail}
          onDeposit={navigateToDeposit}
          lastPlanAddress={lastPlanAddress}
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
