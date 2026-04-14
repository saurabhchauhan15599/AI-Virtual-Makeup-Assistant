import React, { useState } from "react";
import ImageUploader from "./components/ImageUploader";
import FaceDetector from "./components/FaceDetector";
import FoundationMatcher from "./components/FoundationMatcher";
import VirtualTryOn from "./components/VirtualTryOn";
import LandingPage from "./components/LandingPage";
import "./styles/App.css";
import SharePage from "./components/SharePage";

function App() {
  const url = window.location.pathname;
  const [image, setImage] = useState(null);
  const [faceAnalysis, setFaceAnalysis] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productType, setProductType] = useState(null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(0);
  const [openAiKey, setOpenAiKey] = useState("");
  const [isStepLocked, setIsStepLocked] = useState(false);
  const [showVirtualTryOn, setShowVirtualTryOn] = useState(false);
  const [showLandingPage, setShowLandingPage] = useState(true);
  const shareKey = url.split("/")[2];
  const isSharePage = url.includes("share");
  const [productTypeSelected, setProductTypeSelected] = useState(false);

  const handleImageUpload = (imageElement) => {
    if (isStepLocked) {
      return;
    }

    setImage(imageElement);
    setFaceAnalysis(null);
    setSelectedProduct(null);
    setError(null);
    setStep(2);
  };

  const handleAnalysisComplete = (analysis) => {
    if (isStepLocked) {
      return;
    }

    setFaceAnalysis(analysis);
    setStep(3);
  };

  const handleAnalysisError = (errorMessage) => {
    if (isStepLocked) {
      return;
    }

    setError(errorMessage);
    setStep(1);
  };

  const handleProductSelect = (product) => {
    setIsStepLocked(false);
    setSelectedProduct(product);
  };

  const handleProductTypeChange = (type) => {
    // Only allow product type change if not already selected or still on landing page
    if (!productTypeSelected || showLandingPage) {
      setProductType(type);
      setSelectedProduct(null); // Reset selection when changing product type
    }
  };

  const handleProceedToTryOn = () => {
    setIsStepLocked(false);
    setStep(4);
    setShowVirtualTryOn(true);
  };

  // Handle OpenAI API key input
  const handleApiKeyChange = (e) => {
    setOpenAiKey(e.target.value);
  };

  const handleStartTryOn = () => {
    if (productType) {
      // Only proceed if product type is selected
      setShowLandingPage(false);
      setStep(1); // Move to the first step (upload photo)
      setProductTypeSelected(true); // Lock in the product type selection
    }
  };

  return (
    <div className="app">
      {isSharePage && shareKey ? (
        <SharePage />
      ) : showLandingPage ? (
        <LandingPage
          onStartTryOn={handleStartTryOn}
          onProductTypeSelect={handleProductTypeChange}
          selectedProductType={productType}
        />
      ) : (
        <>
          <header className="app-header">
            <h1>Virtual Makeup Try-On</h1>
            <p className="tagline">
              Find your perfect {productType} match with AI
            </p>
          </header>

          <main className="app-content">
            <div className="steps-indicator">
              <div className={`step ${step >= 1 ? "active" : ""}`}>
                <div className="step-number">1</div>
                <div className="step-label">Upload Photo</div>
              </div>
              <div className={`step ${step >= 2 ? "active" : ""}`}>
                <div className="step-number">2</div>
                <div className="step-label">Analyze Face</div>
              </div>
              <div className={`step ${step >= 3 ? "active" : ""}`}>
                <div className="step-number">3</div>
                <div className="step-label">
                  {productType === "foundation"
                    ? "Match Foundation"
                    : "Match Lipstick"}
                </div>
              </div>
              <div className={`step ${step >= 4 ? "active" : ""}`}>
                <div className="step-number">4</div>
                <div className="step-label">Try On</div>
              </div>
            </div>

            {error && (
              <div className="error-banner">
                <p>{error}</p>
                <button onClick={() => setError(null)}>Dismiss</button>
              </div>
            )}

            <div className="app-sections">
              <section className={`section ${step === 1 ? "active" : ""}`}>
                <ImageUploader onImageUpload={handleImageUpload} />
              </section>

              {image && step === 2 && (
                <section className={`section ${step === 2 ? "active" : ""}`}>
                  <FaceDetector
                    image={image}
                    onAnalysisComplete={handleAnalysisComplete}
                    onError={handleAnalysisError}
                    productType={productType}
                  />
                </section>
              )}

              {faceAnalysis && step === 3 && (
                <section className={`section ${step === 3 ? "active" : ""}`}>
                  <FoundationMatcher
                    skinTone={faceAnalysis.skinTone}
                    undertone={faceAnalysis.undertone}
                    onFoundationSelect={handleProductSelect}
                    onProceedToTryOn={handleProceedToTryOn}
                    productType={productType}
                  />
                </section>
              )}
              {(step === 4 || showVirtualTryOn) && (
                <section
                  className="section active"
                  style={{ display: "block" }}
                >
                  <div className="try-on-section">
                    <VirtualTryOn
                      originalImage={image}
                      faceAnalysis={faceAnalysis}
                      selectedProduct={selectedProduct}
                      productType={productType}
                    />
                  </div>
                </section>
              )}
            </div>
          </main>
        </>
      )}
    </div>
  );
}

export default App;
