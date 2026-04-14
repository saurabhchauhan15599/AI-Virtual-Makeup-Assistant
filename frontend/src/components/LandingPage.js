import React, { useState, useEffect } from 'react';
import { SHADE_DB } from '../data/foundationData';
import ProductTypeSelector from './ProductTypeSelector';

const LandingPage = ({ onStartTryOn, onProductTypeSelect, selectedProductType }) => {
  // Get a selection of foundation shades for display
  const shadeSelection = SHADE_DB.filter((_, index) => index % 20 === 0).slice(0, 7);

  // Animation states
  const [animate, setAnimate] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Trigger animations when component mounts
  useEffect(() => {
    // Start main animation after a short delay
    const animationTimer = setTimeout(() => {
      setAnimate(true);
    }, 300);

    // Cycle through steps for highlighting
    const stepInterval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % 3);
    }, 3000);

    return () => {
      clearTimeout(animationTimer);
      clearInterval(stepInterval);
    };
  }, []);

  return (
    <div className={`landing-page ${animate ? 'animate-in' : ''}`}>
      <div className="landing-content">
        <div className="landing-info">
          <h1 className="animate-title">Find your perfect makeup match</h1>

          {/* Product Type Selection */}
          <ProductTypeSelector
            onProductTypeSelect={onProductTypeSelect}
            selectedType={selectedProductType}
          />

          <button
            className="start-button animate-pulse"
            onClick={onStartTryOn}
            disabled={!selectedProductType}
          >
            Start Virtual Try On
          </button>
        </div>

        <div className="landing-visual">
          <div className="face-mesh-overlay">
            <img
              src={process.env.PUBLIC_URL + "/images/face-analysis-demo.webp"}
              alt="Face with foundation matching mesh"
              className="face-image"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;