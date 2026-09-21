"use client";

import { createConfig, http } from "wagmi";
import { mainnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";

/** Injected-wallet config (MetaMask / Brave / Rabbit etc.).
 *  WalletConnect cloud project id: TODO when we add mobile-wallet QR flow. */
export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [injected({ shimDisconnect: true })],
  transports: { [mainnet.id]: http() },
});
