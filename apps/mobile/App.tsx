import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
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
import {
  EMPTY_PLAN_SESSION,
  type PersistedPlanSession,
  loadPlanSession,
  normalizePlanSessionForWallet,
  persistPlanSession,
} from './src/state/plan-session';
import { theme } from './src/theme';

/**
 * Screen-based navigation for the Thinkxx mobile app.
 * Owner-side screens are bound to a persisted selected plan PDA.
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
  const { connected, publicKey, hydrated } = useWallet();
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [planSession, setPlanSession] = useState<PersistedPlanSession>(EMPTY_PLAN_SESSION);
  const [planHydrated, setPlanHydrated] = useState(false);
  const walletAddress = publicKey?.toBase58() ?? null;
  const selectedPlanAddress = planSession.selectedPlanPda ?? planSession.lastCreatedPlanPda;

  const updatePlanSession = useCallback(
    (updater: PersistedPlanSession | ((current: PersistedPlanSession) => PersistedPlanSession)) => {
      setPlanSession(current => {
        const next = typeof updater === 'function' ? updater(current) : updater;
        void persistPlanSession(next);
        return next;
      });
    },
    []
  );

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    let active = true;

    const hydratePlanState = async (): Promise<void> => {
      const stored = await loadPlanSession();
      const normalized = normalizePlanSessionForWallet(stored, walletAddress);

      if (!active) {
        return;
      }

      setPlanSession(normalized);
      setPlanHydrated(true);
      setScreen('dashboard');

      if (JSON.stringify(normalized) !== JSON.stringify(stored)) {
        void persistPlanSession(normalized);
      }
    };

    setPlanHydrated(false);
    void hydratePlanState();

    return () => {
      active = false;
    };
  }, [hydrated, walletAddress]);

  const bindPlanAddress = useCallback(
    (planAddr: string): void => {
      updatePlanSession(current => ({
        walletOwner: walletAddress,
        selectedPlanPda: planAddr,
        lastCreatedPlanPda: current.lastCreatedPlanPda === planAddr ? planAddr : current.lastCreatedPlanPda,
        knownPlanPdas: Array.from(new Set([...current.knownPlanPdas, planAddr])),
      }));
    },
    [updatePlanSession, walletAddress]
  );

  if (!hydrated || !planHydrated) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <Text style={styles.loadingText}>Restoring session...</Text>
      </View>
    );
  }

  if (!connected) {
    return <ConnectScreen />;
  }

  const navigateToPlanDetail = (planAddr: string): void => {
    bindPlanAddress(planAddr);
    setScreen('plan_detail');
  };

  const navigateToGuardians = (planAddr: string): void => {
    bindPlanAddress(planAddr);
    setScreen('guardians');
  };

  const navigateToHeartbeat = (planAddr?: string): void => {
    const resolvedPlan = planAddr ?? selectedPlanAddress;
    if (!resolvedPlan) {
      setScreen('dashboard');
      return;
    }

    bindPlanAddress(resolvedPlan);
    setScreen('heartbeat');
  };

  const navigateToDeposit = (planAddr: string): void => {
    bindPlanAddress(planAddr);
    setScreen('deposit');
  };

  switch (screen) {
    case 'create_plan':
      return (
        <CreatePlanScreen
          onBack={() => setScreen('dashboard')}
          onCreated={(planAddress: string) => {
            updatePlanSession(current => ({
              walletOwner: walletAddress,
              selectedPlanPda: planAddress,
              lastCreatedPlanPda: planAddress,
              knownPlanPdas: Array.from(new Set([...current.knownPlanPdas, planAddress])),
            }));
            setScreen('plan_detail');
          }}
        />
      );
    case 'heartbeat':
      return (
        <HeartbeatScreen
          onBack={() => setScreen('dashboard')}
          planAddress={selectedPlanAddress}
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
        <DashboardScreen
          onCreatePlan={() => setScreen('create_plan')}
          onHeartbeat={navigateToHeartbeat}
          onSettings={() => setScreen('settings')}
          onPlanDetail={navigateToPlanDetail}
          onDeposit={navigateToDeposit}
          selectedPlanAddress={selectedPlanAddress}
          lastCreatedPlanAddress={planSession.lastCreatedPlanPda}
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
          selectedPlanAddress={selectedPlanAddress}
          lastCreatedPlanAddress={planSession.lastCreatedPlanPda}
        />
      );
    case 'settings':
      return <SettingsScreen onBack={() => setScreen('dashboard')} />;
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
          selectedPlanAddress={selectedPlanAddress}
          lastCreatedPlanAddress={planSession.lastCreatedPlanPda}
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
          selectedPlanAddress={selectedPlanAddress}
          lastCreatedPlanAddress={planSession.lastCreatedPlanPda}
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

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
});
