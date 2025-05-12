// src/App.js
import React from 'react'; // Removed { useState } as it's not used
import { Routes, Route } from 'react-router-dom'; // Removed BrowserRouter as Router
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import CoinFlipPage from './pages/CoinFlipPage';
import './styles/App.css'; // It's good practice to import App specific styles here if any

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/coinflip" element={<CoinFlipPage />} />
      </Routes>
    </>
  );
}

export default App;

