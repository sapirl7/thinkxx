import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LAMPORTS_PER_SOL, PublicKey, Transaction } from '@solana/web3.js';
import { deriveSolVaultPda, ThinkxxClient } from '@thinkxx/sdk';
import { useWallet } from '../providers/WalletProvider';
import ScreenShell from '../components/ScreenShell';
import { readBalanceWithRetry } from '../lib/rpc';
import {
  AddressBlock,
  MetricPanel,
  Panel,
  PrimaryButton,
  SectionHeading,
  SecondaryButton,
  StatusPill,
} from '../components/Primitives';
import { theme } from '../theme';

interface DepositScreenProps {
  planAddress: string;
  onBack: () => void;
}

export default function DepositScreen({
  planAddress,
  onBack,
}: DepositScreenProps): React.JSX.Element {
  const { connection, publicKey, signAndSendTransaction } = useWallet();
  const [amount, setAmount] = useState('');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [vaultBalance, setVaultBalance] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);

  const planPda = new PublicKey(planAddress);

  useEffect(() => {
    const fetchBalances = async (): Promise<void> => {
      if (!publicKey) return;
      try {
        const [walletLamports, [solVaultPda]] = await Promise.all([
          readBalanceWithRetry(connection, publicKey, 'confirmed'),
          Promise.resolve(deriveSolVaultPda(planPda)),
        ]);
        setWalletBalance(walletLamports / LAMPORTS_PER_SOL);

        const vaultLamports = await readBalanceWithRetry(connection, solVaultPda, 'confirmed');
        setVaultBalance(vaultLamports / LAMPORTS_PER_SOL);
      } catch {
        // Ignore balance fetch errors.
      }
    };

    void fetchBalances();
  }, [connection, planPda, publicKey]);

  const parsedAmount = Number.parseFloat(amount);
  const isValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const hasEnoughBalance = walletBalance !== null && isValidAmount && parsedAmount <= walletBalance;
  const nextVaultBalance = (vaultBalance ?? 0) + (isValidAmount ? parsedAmount : 0);
  const nextWalletBalance = (walletBalance ?? 0) - (isValidAmount ? parsedAmount : 0);

  const handleDeposit = async (): Promise<void> => {
    if (!publicKey || !isValidAmount || !hasEnoughBalance) return;

    setSending(true);
    try {
      const client = new ThinkxxClient(connection);
      const lamports = BigInt(Math.floor(parsedAmount * LAMPORTS_PER_SOL));
      const ix = client.buildDepositSol(publicKey, planPda, lamports);
      const sig = await signAndSendTransaction(new Transaction().add(ix));
      setTxSig(sig);
      Alert.alert('Success', `Deposited ${parsedAmount} SOL into vault.`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Deposit failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <ScreenShell
      title="Deposit SOL"
      subtitle="Fund the selected plan vault from the connected owner wallet."
      eyebrow="Owner flow / funding"
      onBack={onBack}
      scroll
      contentContainerStyle={styles.content}
      footer={
        <View style={styles.footerDock}>
          <PrimaryButton
            label={isValidAmount ? `Deposit ${parsedAmount} SOL` : 'Enter Amount'}
            onPress={handleDeposit}
            disabled={!isValidAmount || !hasEnoughBalance || sending}
            loading={sending}
          />
          {sending ? (
            <View style={styles.sendingRow}>
              <ActivityIndicator color={theme.colors.primaryLight} size="small" />
              <Text style={styles.footerText}>Waiting for wallet approval and confirmation…</Text>
            </View>
          ) : (
            <Text style={styles.footerText}>
              Review the amount carefully. Deposits increase the protected SOL held by the selected plan.
            </Text>
          )}
        </View>
      }
    >
      <AddressBlock
        label="Selected plan"
        address={planAddress}
        helper="Deposits move SOL from the owner wallet into this plan vault."
      />

      <View style={styles.metricRow}>
        <MetricPanel
          eyebrow="Wallet"
          value={walletBalance !== null ? `${walletBalance.toFixed(4)} SOL` : '…'}
          caption="Available owner balance"
        />
        <MetricPanel
          eyebrow="Vault"
          value={vaultBalance !== null ? `${vaultBalance.toFixed(4)} SOL` : '…'}
          caption="Current selected plan"
        />
      </View>

      <Panel tone="secondary">
        <SectionHeading label="Amount (SOL)" />
        <View style={styles.amountRow}>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.0"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="decimal-pad"
            autoFocus
            editable={!sending}
          />
          {walletBalance ? (
            <SecondaryButton
              label="MAX"
              tone="secondary"
              onPress={() => setAmount(Math.max(0, walletBalance - 0.01).toFixed(4))}
            />
          ) : null}
        </View>
        <Text style={styles.amountHint}>
          Keep a small SOL buffer in the wallet for future network fees.
        </Text>
        {!hasEnoughBalance && isValidAmount ? (
          <StatusPill label="Insufficient balance" tone="danger" />
        ) : null}
      </Panel>

      {isValidAmount && hasEnoughBalance ? (
        <Panel tone="success">
          <SectionHeading label="Post-deposit preview" />
          <Text style={styles.previewHeadline}>{nextVaultBalance.toFixed(4)} SOL</Text>
          <Text style={styles.previewBody}>
            Vault after deposit • wallet balance would move to {nextWalletBalance.toFixed(4)} SOL before fees.
          </Text>
        </Panel>
      ) : null}

      {txSig ? (
        <Panel tone="success">
          <SectionHeading label="Transaction confirmed" />
          <Text style={styles.signatureLabel}>Latest signature</Text>
          <Text style={styles.signatureValue}>
            {txSig.slice(0, 20)}…{txSig.slice(-8)}
          </Text>
        </Panel>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
  },
  metricRow: {
    gap: theme.spacing.md,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  amountInput: {
    flex: 1,
    minHeight: 64,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: theme.spacing.lg,
    color: theme.colors.text,
    fontSize: 32,
    fontWeight: theme.fontWeight.bold,
  },
  amountHint: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  previewHeadline: {
    color: theme.colors.text,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: theme.fontWeight.bold,
  },
  previewBody: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  signatureLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  signatureValue: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  footerDock: {
    gap: theme.spacing.md,
  },
  footerText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
    textAlign: 'center',
  },
  sendingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
});
