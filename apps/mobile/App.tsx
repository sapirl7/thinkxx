import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { WalletProvider, useWallet } from './src/providers/WalletProvider';
import ConnectScreen from './src/screens/ConnectScreen';
import DashboardScreen from './src/screens/DashboardScreen';

/**
 * Root navigation — switches between Connect and Dashboard
 * based on wallet connection state.
 */
function AppNavigator(): React.JSX.Element {
  const { connected } = useWallet();

  if (!connected) {
    return <ConnectScreen />;
  }

  return <DashboardScreen />;
}

/**
 * App root — wraps with WalletProvider.
 */
export default function App(): React.JSX.Element {
  return (
    <WalletProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </WalletProvider>
  );
}
