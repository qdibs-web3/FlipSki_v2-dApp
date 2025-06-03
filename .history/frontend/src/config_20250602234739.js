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
    default: { http: [`https://base-mainnet.infura.io/v3/${import.meta.env.VITE_INFURA_API_KEY}`] },
    public: { http: [`https://base-mainnet.infura.io/v3/${import.meta.env.VITE_INFURA_API_KEY}`] },
  },
  blockExplorers: {
    default: { name: 'Basescan', url: 'https://basescan.org/' },
  },
  testnet: false,
});

// Contract address on Base
export const COINFLIP_CONTRACT_ADDRESS = "0x1EC9aE124af51A3f45414Bb3259f8E9bE92afbfE"; 