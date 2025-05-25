import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThirdwebProvider, ChainId } from "@thirdweb-dev/react";
import { WalletProvider } from './context/WalletProvider'; // Add this import
import { metamaskWallet } from "@thirdweb-dev/react";
import App from './App';
import './styles/index.css';

// Error boundary component to catch and display ThirdWeb errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error("ThirdWeb error caught:", error, errorInfo);
    this.setState({ errorInfo });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '5px' }}>
          <h2>Something went wrong with ThirdWeb initialization</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            <summary>Show error details</summary>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

// Using a direct chain ID instead of importing baseSepoliaChain
const baseSepoliaChainId = ChainId.BaseSepoliaTestnet;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThirdwebProvider 
        clientId={import.meta.env.VITE_THIRDWEB_CLIENT_ID}
        activeChain={baseSepoliaChainId}
        supportedWallets={[metamaskWallet()]}
        autoConnect={false}
      >
        <WalletProvider> {/* Add this wrapper */}
          <Router>
            <App />
          </Router>
        </WalletProvider>
      </ThirdwebProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
