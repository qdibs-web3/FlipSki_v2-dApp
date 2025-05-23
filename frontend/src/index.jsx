import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThirdwebProvider } from '@thirdweb-dev/react';
import { BaseSepoliaTestnet } from '@thirdweb-dev/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletProvider } from './context/WalletProvider';
import App from './App';
import './styles/index.css';

const queryClient = new QueryClient();

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router>
        <ThirdwebProvider
          activeChain={BaseSepoliaTestnet}
          clientId={'7f8c19e1d729d08da2b1a29179a940aa'}
        >
          <WalletProvider>
            <App />
          </WalletProvider>
        </ThirdwebProvider>
      </Router>
    </QueryClientProvider>
  </React.StrictMode>
);
