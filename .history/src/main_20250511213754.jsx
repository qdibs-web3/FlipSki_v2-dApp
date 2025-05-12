// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // Import these
import App from './App';
import './styles/index.css'; // Assuming you have global styles here

// Create a client
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}> {/* Add QueryClientProvider here */}
      <Router>
        <App />
      </Router>
    </QueryClientProvider>
  </React.StrictMode>
);
