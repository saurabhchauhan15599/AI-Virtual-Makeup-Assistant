import * as faceapi from 'face-api.js';
class FaceApiService {
  constructor() {
    this.modelsLoaded = false;
    this.modelPath = `${process.env.PUBLIC_URL}/models`;
  }

  async loadModels() {
    if (this.modelsLoaded) {
      return Promise.resolve();
    }

    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(this.modelPath),
        faceapi.nets.faceLandmark68Net.loadFromUri(this.modelPath),
        faceapi.nets.faceRecognitionNet.loadFromUri(this.modelPath)
      ]);
      
      this.modelsLoaded = true;
      console.log('Face-api models loaded successfully');
      return Promise.resolve();
    } catch (error) {
      console.error('Error loading face-api models:', error);
      return Promise.reject(error);
    }
  }

  async detectFace(media) {
    if (!this.modelsLoaded) {
      await this.loadModels();
    }

    try {
      // Detect face with landmarks
      const detection = await faceapi.detectSingleFace(
        media, 
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks();
      
      if (!detection) {
        throw new Error('No face detected');
      }
      
      return detection;
    } catch (error) {
      console.error('Error detecting face:', error);
      throw error;
    }
  }

  extractFaceRegions(detection) {
    if (!detection || !detection.landmarks || !detection.landmarks.positions) {
      console.error('Invalid detection result:', detection);
      return {
        leftCheek: { x: 0, y: 0, width: 10, height: 10 },
        rightCheek: { x: 0, y: 0, width: 10, height: 10 },
        forehead: { x: 0, y: 0, width: 10, height: 10 },
        nose: { x: 0, y: 0, width: 10, height: 10 },
        chin: { x: 0, y: 0, width: 10, height: 10 },
        face: { x: 0, y: 0, width: 10, height: 10 }
      };
    }
    
    const { landmarks } = detection;
    const positions = landmarks.positions;
    const box = detection.detection.box;
    const leftCheek = {
      x: Math.round(positions[1].x),
      y: Math.round(positions[1].y),
      width: Math.max(10, Math.round((positions[31].x - positions[1].x) / 2)),
      height: Math.max(10, Math.round((positions[31].y - positions[1].y) / 2))
    };
    
    // Right cheek region
    const rightCheek = {
      x: Math.round(positions[15].x - Math.round((positions[15].x - positions[35].x) / 2)),
      y: Math.round(positions[15].y),
      width: Math.max(10, Math.round((positions[15].x - positions[35].x) / 2)),
      height: Math.max(10, Math.round((positions[15].y - positions[35].y) / 2))
    };
    
    // Forehead region
    const forehead = {
      x: Math.round(positions[19].x),
      y: Math.max(0, Math.round(positions[19].y - 20)), // Slightly above the eyebrows
      width: Math.max(10, Math.round(positions[24].x - positions[19].x)),
      height: 20
    };
    
    // Nose region
    const nose = {
      x: Math.round(positions[27].x),
      y: Math.round(positions[27].y),
      width: Math.max(10, Math.round(positions[35].x - positions[31].x)),
      height: Math.max(10, Math.round(positions[33].y - positions[27].y))
    };
    
    // Chin region
    const chin = {
      x: Math.round(positions[7].x),
      y: Math.round(positions[7].y),
      width: Math.max(10, Math.round(positions[9].x - positions[7].x)),
      height: Math.max(10, Math.round(positions[9].y - positions[7].y))
    };
    
    // Full face region
    const face = {
      x: Math.round(box.x),
      y: Math.round(box.y),
      width: Math.round(box.width),
      height: Math.round(box.height)
    };
    
    return {
      leftCheek,
      rightCheek,
      forehead,
      nose,
      chin,
      face
    };
  }

  createFaceMask(detection, width, height) {
    if (!detection || !detection.landmarks || !detection.landmarks.positions) {
      console.error('Invalid detection result for face mask:', detection);
      // Return a default circle as fallback
      const path = new Path2D();
      path.arc(width / 2, height / 2, Math.min(width, height) / 4, 0, 2 * Math.PI);
      return path;
    }
    
    const { landmarks } = detection;
    const positions = landmarks.positions;
    
    // Create a path for the face mask
    const path = new Path2D();
    
    // Calculate forehead top point (above the eyebrows)
    const foreheadY = Math.max(0, positions[19].y - 30); // Higher above eyebrows
    const foreheadLeftX = positions[19].x - 10; // Slightly wider than eyebrows
    const foreheadRightX = positions[24].x + 10; // Slightly wider than eyebrows
    
    // Start at the left side of the forehead
    path.moveTo(foreheadLeftX, foreheadY);
    
    // Draw line across the top of the forehead
    path.lineTo(foreheadRightX, foreheadY);
    
    // Connect to the right temple
    path.lineTo(positions[16].x, positions[16].y);
    
    // Follow the face contour (jawline) from right to left
    for (let i = 15; i >= 0; i--) {
      path.lineTo(positions[i].x, positions[i].y);
    }
    
    // Connect back to the left side of the forehead to complete the face shape
    path.lineTo(foreheadLeftX, foreheadY);
    
    // Close the path
    path.closePath();
    
    return path;
  }

  createLipsMask(detection, width, height) {
    if (!detection || !detection.landmarks || !detection.landmarks.positions) {
      console.error('Invalid detection result for lips mask:', detection);
      // Return a default small oval as fallback
      const path = new Path2D();
      path.ellipse(width / 2, height / 2, width / 10, height / 20, 0, 0, 2 * Math.PI);
      return path;
    }
    
    const { landmarks } = detection;
    const positions = landmarks.positions;
    
    // Create a path for the lips mask
    const path = new Path2D();
    
    // Lips landmarks (indices 48-67)
    // Start with the outer lip contour
    path.moveTo(positions[48].x, positions[48].y); // Start at the left corner of the mouth
    
    // Top outer lip (left to right)
    for (let i = 49; i <= 54; i++) {
      path.lineTo(positions[i].x, positions[i].y);
    }
    
    // Bottom outer lip (right to left)
    for (let i = 55; i <= 59; i++) {
      path.lineTo(positions[i].x, positions[i].y);
    }
    
    // Close the outer lip contour
    path.closePath();
    
    return path;
  }

  createProductMask(detection, width, height, productType) {
    if (productType === 'lipstick') {
      return this.createLipsMask(detection, width, height);
    } else {
      return this.createFaceMask(detection, width, height);
    }
  }
}

// Create and export a singleton instance
const faceApiService = new FaceApiService();
export default faceApiService;