"use client";

import { createConfig, http } from "wagmi";
import { mainnet } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

/** Reown (WalletConnect) cloud project id — public-by-design (it ships in every
 *  client bundle; it is an identifier, not a secret). Env var overrides it for
 *  non-default deployments (Vercel etc.). */
const REOWN_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "73d3ff7c2e67a1ef1da6e5f1a8a0950c";

/** Injected wallets (MetaMask / Brave / Rabbit) + WalletConnect (mobile QR / deep links). */
export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [
    injected({ shimDisconnect: true }),
    walletConnect({ projectId: REOWN_PROJECT_ID, showQrModal: true }),
  ],
  transports: { [mainnet.id]: http() },
});
