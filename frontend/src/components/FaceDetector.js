import React, { useEffect, useRef, useState } from 'react';
import faceApiService from '../services/faceApiService';
import { extractSkinTone, determineUndertone } from '../utils/colorUtils';

/**
 * Component for detecting faces and analyzing skin tone
 * @param {Object} props - Component props
 * @param {HTMLImageElement} props.image - Image element to analyze
 * @param {Function} props.onAnalysisComplete - Callback when analysis is complete
 * @param {Function} props.onError - Callback when an error occurs
 * @param {String} props.productType - Type of product ('foundation' or 'lipstick')
 */
const FaceDetector = ({ image, onAnalysisComplete, onError, productType = 'foundation' }) => {
  const canvasRef = useRef(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!image) return;
    
    const analyzeImage = async () => {
      setAnalyzing(true);
      setProgress(10);
      
      try {
        // Create a canvas for analysis
        const canvas = canvasRef.current;
        canvas.width = image.width;
        canvas.height = image.height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        
        setProgress(30);
        
        // Load face-api models if not already loaded
        await faceApiService.loadModels();
        setProgress(50);
        
        // Detect face in the image
        const detection = await faceApiService.detectFace(canvas);
        setProgress(70);
        
        // Extract face regions for skin tone analysis
        const regions = faceApiService.extractFaceRegions(detection);
        
        // Get image data for analysis
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Extract skin tone from cheek and forehead regions
        const samplingRegions = [
          [regions.leftCheek.x, regions.leftCheek.y, regions.leftCheek.width, regions.leftCheek.height],
          [regions.rightCheek.x, regions.rightCheek.y, regions.rightCheek.width, regions.rightCheek.height],
          [regions.forehead.x, regions.forehead.y, regions.forehead.width, regions.forehead.height]
        ];
        
        const skinTone = extractSkinTone(imageData, samplingRegions);
        const undertone = determineUndertone(skinTone);
        
        setProgress(90);
        
        // Draw face landmarks for visualization
        drawFaceLandmarks(ctx, detection);
        
        // Create appropriate mask based on product type
        const productMask = faceApiService.createProductMask(detection, canvas.width, canvas.height, productType);
        
        setProgress(100);
        
        // Call the callback with analysis results
        onAnalysisComplete({
          detection,
          regions,
          skinTone,
          undertone,
          faceMask: productMask, // Keep the name faceMask for backward compatibility
          lipsMask: productType === 'lipstick' ? productMask : null, // Add lipsMask for lipstick
          productType,
          canvas
        });
      } catch (error) {
        console.error('Face detection error:', error);
        onError(error.message || 'Failed to detect face. Please try another photo.');
      } finally {
        setAnalyzing(false);
      }
    };
    
    analyzeImage();
  }, [image, onAnalysisComplete, onError]);

  /**
   * Draw face landmarks on canvas for visualization
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} detection - Face detection result
   */
  const drawFaceLandmarks = (ctx, detection) => {
    if (!detection || !detection.landmarks) return;
    
    const { landmarks } = detection;
    const positions = landmarks.positions;
    
    // Draw face contour
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(positions[0].x, positions[0].y);
    
    // Jawline
    for (let i = 1; i <= 16; i++) {
      ctx.lineTo(positions[i].x, positions[i].y);
    }
    
    // Connect back to start
    ctx.lineTo(positions[0].x, positions[0].y);
    ctx.stroke();
    
    // Draw sampling regions
    const regions = faceApiService.extractFaceRegions(detection);
    if (!regions) return;
    
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
    ctx.lineWidth = 1;
    
    // Left cheek
    ctx.strokeRect(
      regions.leftCheek.x,
      regions.leftCheek.y,
      regions.leftCheek.width,
      regions.leftCheek.height
    );
    
    // Right cheek
    ctx.strokeRect(
      regions.rightCheek.x,
      regions.rightCheek.y,
      regions.rightCheek.width,
      regions.rightCheek.height
    );
    
    // Forehead
    ctx.strokeRect(
      regions.forehead.x,
      regions.forehead.y,
      regions.forehead.width,
      regions.forehead.height
    );
  };

  return (
    <div className="face-detector">
      {analyzing && (
        <div className="analysis-progress">
          <h3>Analyzing Face</h3>
          <div className="progress-bar">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p>{progress}% complete</p>
        </div>
      )}
      
      <canvas 
        ref={canvasRef}
        className="analysis-canvas"
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default FaceDetector;