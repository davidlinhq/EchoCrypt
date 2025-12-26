import { createConfig, createStorage, http, injected, noopStorage } from 'wagmi';
import { sepolia } from 'wagmi/chains';

export const config = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(),
  },
  storage: createStorage({ storage: noopStorage }),
  ssr: false,
});
