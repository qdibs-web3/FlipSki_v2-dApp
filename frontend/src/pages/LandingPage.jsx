import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LandingPage.css';
import gif from "../assets/flipski4.gif";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <div className="gif-container">
        <img src={gif} alt="Flipski" className="landing-gif" />
      </div>

      <h1 className="landing-header">FLIPSKI</h1>
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
