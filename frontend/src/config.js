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

// Contract addresses on Base
export const COINFLIP_CONTRACT_ADDRESS = "0x1EC9aE124af51A3f45414Bb3259f8E9bE92afbfE"; // ETH version
export const COINFLIP_ERC20_CONTRACT_ADDRESS = "0x0c20CDb2ce0cAbff1e4cBA87c0D6A2EcA36c7D53"; // ERC20 version - to be updated after deployment

// FlipSki Token Configuration
export const FLIPSKI_TOKEN_ADDRESS = "0xE4b2F8B5B9497222093e2B1Afb98CE2728D3bB07";
export const FLIPSKI_TOKEN_DECIMALS = 18; // Assuming 18 decimals, update if different

