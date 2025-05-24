import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error("Wallet error caught:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <div className="error-container">
        <h2>Something went wrong with wallet connection</h2>
        <p>Please try refreshing the page or using a different browser</p>
        <button onClick={() => window.location.reload()}>Refresh Page</button>
      </div>;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
