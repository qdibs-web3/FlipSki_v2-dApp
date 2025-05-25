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
    console.error("Component error caught:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided, otherwise use default
      if (this.props.fallbackRender) {
        return this.props.fallbackRender({ 
          error: this.state.error,
          resetError: () => this.setState({ hasError: false, error: null })
        });
      }
      
      // Default fallback UI
      return (
        <div className="error-container" style={{ padding: '10px', border: '1px solid #f5c6cb', borderRadius: '4px', backgroundColor: '#f8d7da', color: '#721c24', margin: '10px 0' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Component temporarily unavailable</p>
          <small>{this.state.error?.message || "Unknown error"}</small>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: '5px', padding: '3px 8px', backgroundColor: '#721c24', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
          >
            Try Again
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

export default ErrorBoundary;
