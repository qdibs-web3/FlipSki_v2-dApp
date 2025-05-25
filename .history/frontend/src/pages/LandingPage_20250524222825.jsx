import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
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
