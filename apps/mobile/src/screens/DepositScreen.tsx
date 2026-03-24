import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { PublicKey, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ThinkxxClient } from '@thinkxx/sdk';
import { deriveSolVaultPda } from '@thinkxx/sdk';
import { useWallet } from '../providers/WalletProvider';
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
          connection.getBalance(publicKey, 'confirmed'),
          Promise.resolve(deriveSolVaultPda(planPda)),
        ]);
        setWalletBalance(walletLamports / LAMPORTS_PER_SOL);

        const vaultLamports = await connection.getBalance(solVaultPda, 'confirmed');
        setVaultBalance(vaultLamports / LAMPORTS_PER_SOL);
      } catch {
        // Ignore balance fetch errors
      }
    };
    fetchBalances();
  }, [publicKey, planAddress]);

  const parsedAmount = parseFloat(amount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;
  const hasEnoughBalance = walletBalance !== null && isValidAmount && parsedAmount <= walletBalance;

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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Deposit SOL</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.content}>
        {/* Balances */}
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>Wallet</Text>
            <Text style={styles.balanceValue}>
              {walletBalance !== null ? `${walletBalance.toFixed(4)} SOL` : '...'}
            </Text>
          </View>
          <Text style={styles.arrow}>→</Text>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>Vault</Text>
            <Text style={styles.balanceValue}>
              {vaultBalance !== null ? `${vaultBalance.toFixed(4)} SOL` : '...'}
            </Text>
          </View>
        </View>

        {/* Amount Input */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Amount (SOL)</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.0"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="decimal-pad"
              autoFocus
              editable={!sending}
            />
            {walletBalance && (
              <TouchableOpacity
                style={styles.maxBtn}
                onPress={() => setAmount(Math.max(0, walletBalance - 0.01).toFixed(4))}
              >
                <Text style={styles.maxBtnText}>MAX</Text>
              </TouchableOpacity>
            )}
          </View>
          {isValidAmount && !hasEnoughBalance && (
            <Text style={styles.errorHint}>Insufficient balance</Text>
          )}
        </View>

        {/* Preview */}
        {isValidAmount && hasEnoughBalance && (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>After Deposit</Text>
            <Text style={styles.previewValue}>
              Vault: {((vaultBalance ?? 0) + parsedAmount).toFixed(4)} SOL
            </Text>
            <Text style={styles.previewSub}>
              Wallet: {((walletBalance ?? 0) - parsedAmount).toFixed(4)} SOL
            </Text>
          </View>
        )}

        {/* Tx Result */}
        {txSig && (
          <View style={styles.resultCard}>
            <Text style={styles.resultIcon}>✅</Text>
            <Text style={styles.resultLabel}>Transaction Confirmed</Text>
            <Text style={styles.resultSig}>
              {txSig.slice(0, 20)}...{txSig.slice(-8)}
            </Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.depositBtn,
            (!isValidAmount || !hasEnoughBalance || sending) && styles.depositBtnDisabled,
          ]}
          onPress={handleDeposit}
          disabled={!isValidAmount || !hasEnoughBalance || sending}
        >
          {sending ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text style={styles.depositBtnText}>
              {isValidAmount ? `Deposit ${parsedAmount} SOL` : 'Enter Amount'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl + 20, paddingBottom: theme.spacing.md,
  },
  backBtn: { width: 60 },
  backText: { color: theme.colors.primary, fontSize: theme.fontSize.md },
  title: { color: theme.colors.text, fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold },
  content: { flex: 1, paddingHorizontal: theme.spacing.lg, gap: theme.spacing.lg },
  balanceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg,
  },
  balanceItem: { alignItems: 'center' },
  balanceLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginBottom: 2 },
  balanceValue: { color: theme.colors.text, fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.semibold },
  arrow: { color: theme.colors.primary, fontSize: 24 },
  inputCard: {
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg,
  },
  inputLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.sm },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  input: {
    flex: 1, color: theme.colors.text, fontSize: 32, fontWeight: theme.fontWeight.bold,
    paddingVertical: theme.spacing.xs,
  },
  maxBtn: {
    backgroundColor: theme.colors.primary + '20', borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs,
  },
  maxBtnText: { color: theme.colors.primary, fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.bold },
  errorHint: { color: theme.colors.danger, fontSize: theme.fontSize.xs, marginTop: theme.spacing.xs },
  previewCard: {
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.primary + '30',
  },
  previewLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs },
  previewValue: {
    color: theme.colors.success, fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold,
    marginTop: 2,
  },
  previewSub: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm, marginTop: 2 },
  resultCard: {
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.success + '30',
  },
  resultIcon: { fontSize: 32, marginBottom: theme.spacing.xs },
  resultLabel: { color: theme.colors.success, fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold },
  resultSig: {
    color: theme.colors.textMuted, fontSize: theme.fontSize.xs, fontFamily: 'monospace',
    marginTop: theme.spacing.xs,
  },
  depositBtn: {
    backgroundColor: theme.colors.accent, borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md, alignItems: 'center', marginTop: 'auto',
  },
  depositBtnDisabled: { opacity: 0.5 },
  depositBtnText: { color: '#000', fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold },
});
