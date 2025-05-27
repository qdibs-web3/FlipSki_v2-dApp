// src/App.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import CoinFlipPage from './pages/CoinFlipPage';
import FlipskiCoinPage from './pages/FlipskiCoinPage'; // Import the new page
import './styles/App.css';

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/flipski" element={<CoinFlipPage />} />
        <Route path="/flipski-coin" element={<FlipskiCoinPage />} /> {/* Add route for the new page */}
      </Routes>
      <Footer />
    </>
  );
}

export default App;