import { defineChain } from 'viem';

// Base Sepolia Testnet Chain Definition
export const baseSepoliaChain = defineChain({
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Sepolia Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://sepolia.base.org'] },
    public: { http: ['https://sepolia.base.org'] },
  },
  blockExplorers: {
    default: { name: 'Basescan', url: 'https://sepolia.basescan.org' },
  },
  testnet: true,
});

// Contract address on Base
export const COINFLIP_CONTRACT_ADDRESS = "0xcECAaf4310aCDb4433a0e64f3Ab56e691493Ca44"; 