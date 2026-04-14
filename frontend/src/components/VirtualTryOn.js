import React, { useEffect, useRef, useState } from "react";
import { labToRgb, hexToLab, labToHex } from "../utils/colorUtils";
import convert from "color-convert";
import { generateAiImage } from "../services/aiImageService";
import { SHADE_DB } from "../data/foundationData"; // Import the shade database

const VirtualTryOn = ({
  originalImage,
  faceAnalysis,
  selectedProduct,
  productType = "foundation",
}) => {
  const beforeCanvasRef = useRef(null);
  const afterCanvasRef = useRef(null);
  const [opacity, setOpacity] = useState(0.5);
  const [error, setError] = useState(null);
  const [aiGeneratedImage, setAiGeneratedImage] = useState(null);
  const [aiImageLoading, setAiImageLoading] = useState(false);
  const [aiImageError, setAiImageError] = useState(null);
  const [recommendation, setRecommendations] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [response, setResponse] = useState([]);
  const [newRecss, setRecss] = useState([]);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [generatedReccs, setGenRecss] = useState([])
  const [shareKey, setShareKey] = useState('');

  const generateShareKey = () => {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  };

  const handleShare = (productHex, productBrand, productShade) => {
    const shareKey = generateShareKey();

    let processedImageDataUrl = null;

    if (aiGeneratedImage) {
      const canvas = document.createElement("canvas");
      canvas.width = aiGeneratedImage.width;
      canvas.height = aiGeneratedImage.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(aiGeneratedImage, 0, 0);

      try {
        processedImageDataUrl = canvas.toDataURL("image/jpeg");
      } catch (e) {
        console.error("Error converting AI image to data URL:", e);
      }
    } else if (afterCanvasRef.current) {
      try {
        processedImageDataUrl = afterCanvasRef.current.toDataURL("image/jpeg");
      } catch (e) {
        console.error("Error converting canvas to data URL:", e);
      }
    } else if (originalImage) {
      const canvas = document.createElement("canvas");
      canvas.width = originalImage.width;
      canvas.height = originalImage.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(originalImage, 0, 0);

      try {
        processedImageDataUrl = canvas.toDataURL("image/jpeg");
      } catch (e) {
        console.error("Error converting original image to data URL:", e);
      }
    }

    const shareData = {
      id: shareKey,
      processedImage: processedImageDataUrl,
      productType: productType,
      productHex: productHex,
      productBrand: productBrand,
      productName:
        productType === "foundation"
          ? "Perfect Match Foundation"
          : "Perfect Match Lipstick",
      productShade: productShade,
      userName: "Your Friend",
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(`share_${shareKey}`, JSON.stringify(shareData));
    window.location.href = `/share/${shareKey}`;
  };
  useEffect(() => {
    if (!originalImage || !faceAnalysis || !selectedProduct) {
      return;
    }
    try {
      if (productType === "foundation" && !faceAnalysis.faceMask) {
        setError("Face mask not found. Please try another photo.");
        return;
      } else if (productType === "lipstick" && !faceAnalysis.lipsMask) {
        setError("Lips not detected. Please try another photo.");
        return;
      }

      const productMask =
        productType === "lipstick"
          ? faceAnalysis.lipsMask
          : faceAnalysis.faceMask;

      if (beforeCanvasRef.current) {
        const beforeCanvas = beforeCanvasRef.current;
        beforeCanvas.width = originalImage.width;
        beforeCanvas.height = originalImage.height;
        const beforeCtx = beforeCanvas.getContext("2d");
        beforeCtx.clearRect(0, 0, beforeCanvas.width, beforeCanvas.height);
        beforeCtx.drawImage(originalImage, 0, 0);
      }

      if (afterCanvasRef.current) {
        const afterCanvas = afterCanvasRef.current;
        afterCanvas.width = originalImage.width;
        afterCanvas.height = originalImage.height;
        const afterCtx = afterCanvas.getContext("2d");

        // Clear the canvas first
        afterCtx.clearRect(0, 0, afterCanvas.width, afterCanvas.height);

        // Draw the original image first
        afterCtx.drawImage(originalImage, 0, 0);

        // Apply product based on type
        if (productType === "lipstick") {
          applyLipstick(afterCtx, productMask, selectedProduct.hex, opacity);
        } else {
          applyFoundation(afterCtx, productMask, selectedProduct.hex, opacity);
        }
      }
      setError(null);
    } catch (err) {
      console.error("Error in virtual try-on:", err);
      setError("Failed to apply foundation. Please try again.");
    }
  }, [
    originalImage,
    faceAnalysis,
    selectedProduct,
    productType,
    opacity,
    aiGeneratedImage,
    selectedRecommendation,
  ]);

  useEffect(() => {
    if (recommendation.length > 1) {
      fetchAiGeneratedImage();
    }
  }, [recommendation]);

  const fetchAiGeneratedImage = async () => {
    if (!selectedProduct || !window.uploadedImageFile) {
      return;
    }

    setAiImageLoading(true);
    setAiImageError(null);

    try {
      // Convert skinTone to string format for API (assuming we have access to skinTone)
      const labValueString = faceAnalysis?.skinTone
        ? faceAnalysis.skinTone.join(",")
        : "";
      const childName = `${selectedProduct.shade}`;
      const response = await generateAiImage({
        imageFile: window.uploadedImageFile,
        sku: selectedProduct.sku,
        childName,
        labValue: labValueString,
        reccs: recommendation?.slice(0, 4).map((rec) => ({ sku: rec?.shade?.sku, childName: rec?.shade?.shade })),
        product: productType
      });

      if (response && response.success && response.url) {
        setAiImageLoading(false);
        setResponse(response?.selectedProduct);
        setGenRecss(response?.recommendations);
        setShareKey(response?.ref);
      } else {
        setAiImageError("No AI-generated image received from the server");
        setAiImageLoading(false);
      }
    } catch (error) {
      console.error("Error fetching AI-generated image:", error);
      setAiImageError(
        "Failed to generate AI image. Using standard try-on instead."
      );
      setAiImageLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProduct && faceAnalysis) {
      getRecommendations();
    }
  }, [selectedProduct, faceAnalysis]);

  // Initialize canvases for recommendation
  useEffect(() => {
    if (recommendation.length > 0 && originalImage && faceAnalysis) {
      // Force update of recommendation to trigger canvas initialization
      setRecommendations([...recommendation]);
    }
  }, [recommendation.length, originalImage, faceAnalysis]);

  // No need for this useEffect anymore since we're using a simpler approach

  const getRecommendations = async () => {
    if (!selectedProduct || !faceAnalysis) return;

    setLoadingRecommendations(true);

    try {
      const selectedProductWithLab = {
        ...selectedProduct,
        lab:
          selectedProduct.lab ||
          (selectedProduct.hex ? hexToLab(selectedProduct.hex) : null),
      };

      // Get mock foundations data (in a real app, this would come from a database or API)
      // For this example, we'll create some mock data


      // Filter out the selected product and get different brands
      const otherBrands = SHADE_DB?.filter(
        (foundation) => foundation.brand !== selectedProduct.brand
      );

      // Calculate deltaE for each foundation
      const calculateDeltaE = (lab1, lab2) => {
        const [L1, a1, b1] = lab1;
        const [L2, a2, b2] = lab2;
        return Math.sqrt(
          Math.pow(L2 - L1, 2) + Math.pow(a2 - a1, 2) + Math.pow(b2 - b1, 2)
        );
      };

      // Process childShades from each foundation to get individual shades
      const allShades = [];
      otherBrands.forEach((foundation) => {
        foundation.childShades.forEach((shade) => {
          const shadeLab = hexToLab(shade.hex);
          const deltaE = calculateDeltaE(selectedProductWithLab.lab, shadeLab);

          allShades.push({
            sku: foundation.sku,
            name: foundation.name,
            url: foundation.url,
            price: foundation.price,
            brand: foundation.brand,
            shade: shade.name,
            hex: shade.hex,
            lab: shadeLab,
            childShades: foundation.childShades,
            deltaE: deltaE,
            undertone: shade.undertone || "Neutral",
          });
        });
      });

      // Sort by LAB similarity
      const sortedByLAB = allShades.sort((a, b) => a.deltaE - b.deltaE);

      // Get top 6 recommendation
      const topRecommendations = sortedByLAB.slice(0, 6).map((shade) => {
        const matchScore = Math.max(60, 100 - shade.deltaE * 3);
        return {
          shade: shade,
          matchScore: matchScore,
          reasoning: `Similar color match (ΔE: ${shade.deltaE.toFixed(1)})`,
          deltaE: shade.deltaE,
          canvasReady: false,
          canvasRef: null,
          id: `${shade.brand}-${shade.shade}-${Math.random()
            .toString(36)
            .substring(2, 9)}`,
        };
      });

      const temp = topRecommendations?.map((val) => {
        return {
          sku: val?.shade?.sku,
          childName: val?.shade?.shade,
        };
      });

      setRecss(temp);
      setRecommendations(topRecommendations);
    } catch (error) {
      console.error("Error getting recommendation:", error);
      setRecommendations([]);
    }

    setLoadingRecommendations(false);
  };
  // Function removed as we're now using static data

  const applyFoundation = (ctx, faceMask, foundationHex, opacity) => {
    try {
      // Convert hex to RGB
      const rgb = convert.hex.rgb(foundationHex.replace("#", ""));
      const [foundationR, foundationG, foundationB] = rgb;

      // Reset any transformations and composite operations
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";

      // Save the current context state
      ctx.save();

      // Clip to the face mask
      ctx.beginPath();
      ctx.clip(faceMask);

      // Apply foundation with opacity
      ctx.fillStyle = `rgba(${foundationR}, ${foundationG}, ${foundationB}, ${opacity})`;
      ctx.globalCompositeOperation = "multiply"; // Use multiply blend mode for realistic foundation
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      // Restore the context state
      ctx.restore();

      // Reset composite operation to default
      ctx.globalCompositeOperation = "source-over";
    } catch (err) {
      console.error("Error applying foundation:", err);
      throw new Error("Failed to apply foundation to face");
    }
  };

  const applyLipstick = (ctx, lipsMask, lipstickHex, opacity) => {
    try {
      // Convert hex to RGB
      const rgb = convert.hex.rgb(lipstickHex.replace("#", ""));
      const [lipstickR, lipstickG, lipstickB] = rgb;

      // Reset any transformations and composite operations
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";

      // Save the current context state
      ctx.save();

      // Clip to the lips mask
      ctx.beginPath();
      ctx.clip(lipsMask);

      // Apply lipstick with opacity
      ctx.fillStyle = `rgba(${lipstickR}, ${lipstickG}, ${lipstickB}, ${opacity})`;
      ctx.globalCompositeOperation = "multiply"; // Use multiply blend mode for realistic lipstick
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      // Add a slight shine effect
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      // Restore the context state
      ctx.restore();

      // Reset composite operation to default
      ctx.globalCompositeOperation = "source-over";
    } catch (err) {
      console.error("Error applying lipstick:", err);
      throw new Error("Failed to apply lipstick to lips");
    }
  };

  // We don't need this function anymore since we're using a simpler approach with CSS overlays

  // Function to handle recommendation click
  const handleRecommendationClick = (rec) => {
    setSelectedRecommendation(rec.shade);

    // If we have a canvas reference, update the after canvas with this shade
    if (afterCanvasRef.current && faceAnalysis) {
      const afterCanvas = afterCanvasRef.current;
      const afterCtx = afterCanvas.getContext("2d");

      // Clear the canvas first
      afterCtx.clearRect(0, 0, afterCanvas.width, afterCanvas.height);

      // Draw the original image first
      afterCtx.drawImage(originalImage, 0, 0);

      // Apply the selected recommendation's foundation
      const productMask =
        productType === "lipstick"
          ? faceAnalysis.lipsMask
          : faceAnalysis.faceMask;
      if (productType === "lipstick") {
        applyLipstick(afterCtx, productMask, rec.shade.hex, opacity);
      } else {
        applyFoundation(afterCtx, productMask, rec.shade.hex, opacity);
      }

      // Clear any AI-generated image when switching to a recommendation
      setAiGeneratedImage(null);

      console.log(
        `Applied ${productType} shade: ${rec.shade.brand} - ${rec.shade.shade} (${rec.shade.hex})`
      );
    }
  };

  return (
    <div className="virtual-try-on">
      <h2>
        Virtual {productType === "foundation" ? "Foundation" : "Lipstick"}{" "}
        Try-On
      </h2>

      {selectedProduct && (
        <div className="selected-product-info">
          {selectedProduct.brand} - {selectedProduct.shade}
        </div>
      )}

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {aiImageLoading && (
        <div
          className="loading-indicator"
          style={{ textAlign: "center", margin: "20px 0" }}
        >
          <p>Generating AI image for try-on...</p>
        </div>
      )}

      {aiImageError && (
        <div
          className="error-message"
          style={{ color: "#f44336", textAlign: "center", margin: "10px 0" }}
        >
          <p>{aiImageError}</p>
        </div>
      )}

      <div className={`try-on-container side-by-side`}>
        <div className="canvas-wrapper before">
          <canvas ref={beforeCanvasRef} className="try-on-canvas" />
          <div className="canvas-label">Before</div>
        </div>

        <div className="canvas-wrapper after">
          {response?.url ? (
            <div
              className="ai-image-wrapper"
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <img
                src={response?.url}
                alt="AI-generated try-on"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
              <a
                className="share-icon"
                href={`/share/${shareKey}?productType=${productType}`}
                target="_blank"
                style={{
                  position: "absolute",
                  top: "12px",
                  right: "12px",
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  zIndex: "20",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                  transition: "all 0.2s ease",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
                </svg>
              </a>
              <div className="canvas-label">AI-Generated Try-On</div>
            </div>
          ) : (
            <>
              {aiImageLoading && (
                <div
                  className="loading-screen"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "8px",
                    border: "2px dashed #dee2e6",
                  }}
                >
                  <div
                    className="loading-spinner"
                    style={{
                      width: "40px",
                      height: "40px",
                      border: "4px solid #e9ecef",
                      borderTop: "4px solid #007bff",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                      marginBottom: "16px",
                    }}
                  ></div>
                  <p
                    style={{
                      color: "#6c757d",
                      fontSize: "16px",
                      fontWeight: "500",
                      margin: "0",
                      textAlign: "center",
                    }}
                  >
                    Processing your try-on...
                  </p>
                  <p
                    style={{
                      color: "#adb5bd",
                      fontSize: "14px",
                      margin: "8px 0 0 0",
                      textAlign: "center",
                    }}
                  >
                    This may take a few moments
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Recommendation Cards Section */}
      {selectedProduct && (
        <>
          <div
            style={{
              marginTop: "40px",
              marginBottom: "20px",
              textAlign: "center",
              position: "relative",
            }}
          >
            <h3
              style={{
                display: "inline-block",
                margin: "0",
                padding: "0 20px",
                position: "relative",
                zIndex: "2",
                backgroundColor: "white",
                fontFamily: '"Poppins", sans-serif',
                fontWeight: "500",
                color: "var(--primary-dark)",
                letterSpacing: "0.5px",
              }}
            >
              Recommended{" "}
              {productType === "foundation" ? "Foundation" : "Lipstick"} Shades
            </h3>
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "0",
                right: "0",
                height: "1px",
                backgroundColor: "var(--background-dark)",
                zIndex: "1",
              }}
            ></div>
          </div>

          {aiImageLoading ? (
            <div
              className="loading-screen"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
                border: "2px dashed #dee2e6",
              }}
            >
              <div
                className="loading-spinner"
                style={{
                  width: "40px",
                  height: "40px",
                  border: "4px solid #e9ecef",
                  borderTop: "4px solid #007bff",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  marginBottom: "16px",
                }}
              ></div>
              <p
                style={{
                  color: "#6c757d",
                  fontSize: "16px",
                  fontWeight: "500",
                  margin: "0",
                  textAlign: "center",
                }}
              >
                Finding perfect matches for you...
              </p>
            </div>
          ) : (
            <div
              className="recommendation-cards"
              style={{
                margin: "30px auto",
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "30px",
                maxWidth: "1000px",
                padding: "0 20px",
              }}
            >
              {generatedReccs && generatedReccs.length > 0 ? (
                generatedReccs.map((rec, index) => (
                  <div
                    key={`generated-rec-${index}`}
                    className="recommendation-card"
                    style={{
                      borderRadius: "var(--border-radius)",
                      boxShadow: "var(--box-shadow)",
                      backgroundColor: "white",
                      position: "relative",
                      overflow: "hidden",
                      transition: "all 0.3s ease",
                      cursor: "pointer",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div
                      className="card-header"
                      style={{
                        width: "100%",
                        height: "240px",
                        overflow: "hidden",
                        borderBottom: "1px solid var(--background-light)",
                        position: "relative",
                      }}
                    >
                      <img
                        src={rec?.url}
                        alt="generated recommended image"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover"
                        }}
                      />
                      <a
                        className="share-icon"
                        href={`/share/${shareKey}?productType=${productType}&index=${index + 1}`}
                        target="_blank"
                        style={{
                          position: "absolute",
                          top: "12px",
                          right: "12px",
                          backgroundColor: "rgba(255, 255, 255, 0.9)",
                          borderRadius: "50%",
                          width: "36px",
                          height: "36px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          zIndex: "20",
                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
                        </svg>
                      </a>
                      <div
                        style={{
                          position: "absolute",
                          bottom: "0",
                          left: "0",
                          right: "0",
                          height: "60px",
                          background:
                            "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)",
                          pointerEvents: "none",
                        }}
                      ></div>
                    </div>

                    {/* Card Body with Product Details */}
                    <div
                      className="card-body"
                      style={{
                        padding: "16px",
                        flex: "1",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div
                        className="product-swatch"
                        style={{
                          width: "100%",
                          height: "40px",
                          backgroundColor: rec?.childName ?
                            rec?.product?.childShades?.find(s => s.name === rec.childName)?.hex :
                            "#D8BC9D", // Default color if not found
                          marginBottom: "12px",
                          borderRadius: "var(--border-radius)",
                          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
                        }}
                      ></div>

                      <div className="product-details" style={{ flex: "1" }}>
                        <h3
                          style={{
                            margin: "0 0 5px 0",
                            fontSize: "1.1rem",
                            fontWeight: "600",
                            color: "var(--primary-dark)",
                          }}
                        >
                          {rec?.product?.brand}
                        </h3>

                        <h4
                          style={{
                            margin: "0 0 8px 0",
                            fontWeight: "normal",
                            color: "var(--text-light)",
                            fontSize: "0.95rem",
                          }}
                        >
                          {rec?.product?.name}
                        </h4>
                      </div>
                    </div>
                  </div>
                ))
              ) : null}
            </div>
          )}
          {recommendation.length === 0 && !loadingRecommendations && (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                gridColumn: "1 / -1",
              }}
            >
              <p>No similar shades found.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VirtualTryOn;

