import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

import { ThirdwebProvider } from "@thirdweb-dev/react";
import { BaseSepoliaTestnet } from "@thirdweb-dev/chains";
// Assuming WalletProvider.js was copied to src/context/WalletProvider.js or WalletProvider.jsx
// and it exports WalletProvider as a named export.
import { WalletProvider } from './context/WalletProvider';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThirdwebProvider
      activeChain={BaseSepoliaTestnet}
      clientId="7f8c19e1d729d08da2b1a29179a940aa"
    >
      <WalletProvider>
        <App />
      </WalletProvider>
    </ThirdwebProvider>
  </React.StrictMode>
);
