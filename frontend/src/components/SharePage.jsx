import React, { useState, useEffect } from "react";
import "../styles/SharePage.css";
import { fetchImagewithRef } from "../services/aiImageService";

const SharePage = () => {
  const [imageData, setImageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Extract share key from URL
  const getShareKey = () => {
    const url = window.location.pathname;
    return url.split("/")[2];
  };

  const getQueryParams = () => {
    const url = window.location;
    const params = new URLSearchParams(url.search);
    return {
      productType: params.get("productType") || "lipstick",
      index: params.get("index") ? parseInt(params.get("index")) : null,
    };
  };

  const shareKey = getShareKey();
  const { productType, index } = getQueryParams();

  const fetchImage = async () => {
    try {
      setLoading(true);
      const storedData = await fetchImagewithRef(shareKey);

      if (storedData) {
        // Determine if we should use a recommendation based on index
        let selectedProductData = storedData?.selectedProduct;
        let productImageUrl = storedData?.selectedProduct.url;

        // If index is provided, use the recommendation at that index
        if (
          index !== null &&
          storedData?.recommendation &&
          storedData?.recommendation.length >= index
        ) {
          selectedProductData = storedData?.recommendation?.[index - 1];
          productImageUrl = selectedProductData?.url;
        }

        // Find the product hex color
        const productHex = selectedProductData?.product?.childShades?.find(
          (item) => item.name === selectedProductData?.childName
        )?.hex;

        const obj = {
          productType: productType,
          productName: selectedProductData?.product?.name,
          productShade: selectedProductData?.childName,
          productBrand: selectedProductData?.product?.brand,
          productHex: productHex || "#ccc",
          processedImage: productImageUrl,
          isRecommendation: index !== null,
          recommendationIndex: index,
        };

        setImageData(obj);
        setLoading(false);
      }
    } catch (e) {
      setError(
        "Failed to load shared image. Please check the link and try again."
      );
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shareKey) {
      fetchImage();
    } else {
      setError("Invalid share link");
      setLoading(false);
    }
  }, []);

  const handleTryItYourself = () => {
    window.location.href = "/";
  };

  const handleShareAgain = () => {
    if (navigator.share) {
      navigator.share({
        title: "Check out this amazing makeup transformation!",
        text: "See how I look with different foundation and lipstick shades using AI!",
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  return (
    <div className="share-page">
      <div className="share-container">
        {/* Header Section */}
        <header className="share-header">
          <h1>✨ Amazing Transformation!</h1>
          <p>
            See how {imageData?.userName || "your friend"} looks with different
            makeup shades
          </p>
        </header>

        {loading && (
          <div className="loading-section">
            <div className="loading-spinner"></div>
            <h2>Loading your friend's transformation...</h2>
            <p>Please wait while we fetch the amazing results!</p>
          </div>
        )}
        {error && (
          <div className="error-section">
            <div className="error-icon">⚠️</div>
            <h2>Oops! Something went wrong</h2>
            <p>{error}</p>
            <button className="try-again-button" onClick={handleTryItYourself}>
              Try the App Yourself
            </button>
          </div>
        )}
        {/* Main Image Section */}
        <div className="transformation-showcase">
          <div className="image-container">
            <div className="transformed-image-wrapper">
              <img
                className="transformed-image"
                src={imageData?.processedImage}
                alt="Makeup transformation result"
              />
              <div className="image-overlay">
                <div className="transformation-badge">
                  <span>AI Enhanced</span>
                </div>
              </div>
            </div>
          </div>

          {/* Product Information */}
          <div className="product-info">
            <div className="product-card">
              <div className="product-card-header">
                <h3>
                  {imageData?.productType === "foundation" ? (
                    <>
                      <span className="product-icon">✨</span> Foundation Match
                    </>
                  ) : (
                    <>
                      <span className="product-icon">💋</span> Lipstick Shade
                    </>
                  )}
                </h3>
              </div>

              <div className="product-card-content">
                {imageData?.productHex && (
                  <div className="product-color-display">
                    <div className="product-color-swatch-container">
                      <div
                        className="product-color-swatch"
                        style={{ backgroundColor: imageData?.productHex }}
                      >
                        <div className="swatch-shine"></div>
                      </div>
                    </div>
                    <div className="product-color-label">
                      <div className="connector-line"></div>
                      <div className="match-label">Perfect Match</div>
                    </div>
                  </div>
                )}

                <div className="product-info-details">
                  <div className="product-brand-badge">
                    {imageData?.productBrand || "Beauty Pro"}
                  </div>

                  <h4 className="product-name">
                    {imageData?.productName || "Perfect Match Foundation"}
                  </h4>

                  <div className="product-shade-tag">
                    <span className="shade-dot"></span>
                    {imageData?.productShade || "Medium Beige"}
                  </div>
                </div>
              </div>

              <div className="product-card-footer">
                {imageData?.isRecommendation ? (
                  <div className="product-tag">
                    Recommendation #{imageData?.recommendationIndex}
                  </div>
                ) : (
                  <div className="product-tag">AI Recommended</div>
                )}
                <div className="product-tag">Perfect Match</div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action Section */}
        <div className="cta-section">
          <h2>Want to see how YOU would look?</h2>
          <p>
            Try our AI-powered virtual makeup assistant and discover your
            perfect shades!
          </p>

          <div className="cta-buttons">
            <button
              className="primary-cta-button"
              onClick={handleTryItYourself}
            >
              <span className="button-icon">🎨</span>
              Try It Yourself
            </button>
            <button className="secondary-cta-button" onClick={handleShareAgain}>
              <span className="button-icon">📤</span>
              Share This Look
            </button>
          </div>
        </div>

        {/* Features Preview */}
        <div className="features-preview">
          <h3>What you can do with our app:</h3>
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon">📸</div>
              <h4>Upload Your Photo</h4>
              <p>Take a selfie or upload an existing photo</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🔍</div>
              <h4>AI Analysis</h4>
              <p>Our AI analyzes your skin tone and features</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🎨</div>
              <h4>Virtual Try-On</h4>
              <p>See how different makeup looks on you</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">💝</div>
              <h4>Perfect Matches</h4>
              <p>Get personalized product recommendations</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="share-footer">
          <p>Powered by AI Virtual Makeup Try-On</p>
          <div className="footer-links">
            <button onClick={handleTryItYourself} className="footer-link">
              Start Your Transformation
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default SharePage;
