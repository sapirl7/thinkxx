import {
  Connection,
  Transaction,
  TransactionInstruction,
  Keypair,
} from '@solana/web3.js';

export interface SponsoredTxConfig {
  /** Fee payer keypair (the sponsor) */
  feePayer: Keypair;
  /** Maximum lamports the sponsor will pay per transaction */
  maxFeePerTx: number;
}

/**
 * SponsoredTransactionBuilder — builds transactions where a sponsor
 * pays the fees on behalf of the user.
 *
 * This enables gasless UX for mobile dApp users.
 * The sponsor (e.g. a server-side relayer) signs as fee payer,
 * while the user signs the actual instruction(s).
 */
export class SponsoredTransactionBuilder {
  private readonly connection: Connection;
  private readonly config: SponsoredTxConfig;

  constructor(connection: Connection, config: SponsoredTxConfig) {
    this.connection = connection;
    this.config = config;
  }

  /**
   * Build a sponsored transaction.
   * The fee payer is set to the sponsor; the user only needs to sign
   * the instruction-level authority.
   */
  async build(
    instructions: TransactionInstruction[],
  ): Promise<Transaction> {
    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash('confirmed');

    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = this.config.feePayer.publicKey;

    for (const ix of instructions) {
      tx.add(ix);
    }

    return tx;
  }

  /**
   * Build and partially sign a sponsored transaction.
   * Returns a serialized transaction ready for the user to add their signature.
   */
  async buildAndPartialSign(
    instructions: TransactionInstruction[],
  ): Promise<Buffer> {
    const tx = await this.build(instructions);
    tx.partialSign(this.config.feePayer);
    return tx.serialize({ requireAllSignatures: false });
  }

  /**
   * Estimate fee for a transaction.
   */
  async estimateFee(instructions: TransactionInstruction[]): Promise<number> {
    const tx = await this.build(instructions);
    tx.sign(this.config.feePayer);
    const fee = await this.connection.getFeeForMessage(
      tx.compileMessage(),
      'confirmed',
    );
    return fee.value ?? 5000; // Default 5000 lamports
  }

  /**
   * Check if sponsor has sufficient balance for fees.
   */
  async checkSponsorBalance(): Promise<{ balance: number; sufficient: boolean }> {
    const balance = await this.connection.getBalance(this.config.feePayer.publicKey);
    return {
      balance,
      sufficient: balance >= this.config.maxFeePerTx,
    };
  }
}
