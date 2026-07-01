# Deploy & Run (devnet)

Practical steps to run the app and point it at a freshly deployed program.
This complements `README.md` and `docs/RELEASE_READINESS.md`.

## 1. Install dependencies (safe)

The dependency tree is pinned in `pnpm-lock.yaml`. Install exactly those versions
and do not run any package lifecycle scripts:

```bash
pnpm install --frozen-lockfile --ignore-scripts
```

`--ignore-scripts` disables `postinstall`/`preinstall` hooks — the usual
supply-chain execution vector. None of the project's own packages declare
lifecycle scripts.

## 2. Build & test (no validator needed)

```bash
pnpm typecheck     # all workspaces
pnpm test          # sdk (vitest) + mobile (jest)
```

The Anchor program is checked with the Rust toolchain:

```bash
cargo check --manifest-path programs/lifeline/Cargo.toml
```

The bankrun suite under `tests/` additionally requires the Anchor + Solana CLIs
(`anchor build` must produce `target/deploy/lifeline.so`). Install them if you
want to run `pnpm test:anchor`.

## 3. Deploy the program (issues a new program id)

> The program in this branch contains correctness/security fixes (grace-period
> gate on `finalize_claim`, claim account cleanup, `checked_sub`, tightened
> `update_timing`/beneficiary validation). It **must be redeployed** for those to
> take effect. Deploy under a **fresh keypair** (do not reuse a key that lived on
> a compromised machine).

```bash
solana-keygen new -o ~/.config/solana/id.json      # fresh deploy wallet
solana config set --url devnet
solana airdrop 2
anchor build
anchor deploy                                       # prints the new program id
```

Update the declared id in `Anchor.toml` and `declare_id!` if you want the source
default to match, or just override it at runtime (next step).

## 4. Point the apps at the new program id

`PROGRAM_ID` (in `@thinkxx/config`) resolves from the environment, falling back
to the last deployed devnet id. Set the env var instead of editing code:

- **Mobile (Expo)** — `EXPO_PUBLIC_PROGRAM_ID` (inlined at build time):

  ```bash
  # apps/mobile/.env  (or your shell before `expo start`)
  EXPO_PUBLIC_PROGRAM_ID=<your_new_program_id>
  ```

- **CLI / Node** — `THINKXX_PROGRAM_ID`:

  ```bash
  THINKXX_PROGRAM_ID=<your_new_program_id> pnpm --filter @thinkxx/cli start
  ```

If the env var is unset or invalid, the app falls back to the built-in default id.

## 5. Run the mobile app

```bash
pnpm --filter @thinkxx/mobile start      # Expo dev server
# then build a devnet APK via EAS (see apps/mobile/eas.json) for on-device MWA
```

On-chain actions require a Mobile Wallet Adapter wallet (Phantom/Solflare) on the
device/emulator. The app blocks on-chain calls while `PROGRAM_ID` is the
placeholder `1111…1111`.
