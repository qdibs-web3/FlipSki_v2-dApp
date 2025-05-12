// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThirdwebProvider } from '@thirdweb-dev/react';
import { BaseSepoliaTestnet } from '@thirdweb-dev/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // Import these
import App from './App';
import { WalletProvider } from './context/WalletProvider';
import './styles/index.css'; // Assuming you have global styles here

// Create a client
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}> {/* Add QueryClientProvider here */}
      <ThirdwebProvider
        activeChain={BaseSepoliaTestnet}
        clientId="7f8c19e1d729d08da2b1a29179a940aa"
      >
        <WalletProvider>
          <Router>
            <App />
          </Router>
        </WalletProvider>
      </ThirdwebProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

