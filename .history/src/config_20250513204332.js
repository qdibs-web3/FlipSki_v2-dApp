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

// Deployed contract address on Base Sepolia Testnet
export const COINFLIP_CONTRACT_ADDRESS = "0xb06A0a6d8163861C0b79Cc4B1F58a8e1C3b8f2b5"; 