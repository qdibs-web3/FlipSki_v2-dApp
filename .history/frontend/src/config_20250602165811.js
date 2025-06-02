import { defineChain } from 'viem';

// Base Sepolia Testnet Chain Definition
export const baseSepoliaChain = defineChain({
  id: 8453,
  name: 'Base Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Sepolia Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://mainnet.base.org'] },
    public: { http: ['https://mainnet.base.org'] },
  },
  blockExplorers: {
    default: { name: 'Basescan', url: 'https://mainnet.base.org/' },
  },
  testnet: true,
});

// Contract address on Base
export const COINFLIP_CONTRACT_ADDRESS = "0xcECAaf4310aCDb4433a0e64f3Ab56e691493Ca44"; 