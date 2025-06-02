import { defineChain } from 'viem';

// Base Chain Definition
export const baseMainnet = defineChain({
  id: 8453,
  name: 'Base',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://mainnet.base.org/'] },
    public: { http: ['https://mainnet.base.org/'] },
  },
  blockExplorers: {
    default: { name: 'Basescan', url: 'https://basescan.org/' },
  },
  testnet: false,
});

// Contract address on Base
export const COINFLIP_CONTRACT_ADDRESS = "0xcECAaf4310aCDb4433a0e64f3Ab56e691493Ca44"; 