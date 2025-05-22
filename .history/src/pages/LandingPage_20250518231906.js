import React from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import '../styles/LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <h1>FLIPSKI</h1>
      <button className="play-button" onClick={() => navigate('/flipski-coin')}>
        $FLIPSKI
      </button>
      <button className="play-button" onClick={() => navigate('/flipski')}>
        Play Now
      </button>
    </div>
  );
};

export default LandingPage;
