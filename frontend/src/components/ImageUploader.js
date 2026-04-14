import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';


const ImageUploader = ({ onImageUpload }) => {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraMode, setCameraMode] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [stream, setStream] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  /**
   * Handle file drop
   */
  const onDrop = useCallback(acceptedFiles => {
    setError(null);
    setLoading(true);
    
    // Check if any files were accepted
    if (acceptedFiles.length === 0) {
      setError('No valid image files were uploaded.');
      setLoading(false);
      return;
    }
    
    const file = acceptedFiles[0]; // Take only the first file
    
    // Create a preview URL
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    
    // Create an image element to pass to the parent component
    const image = new Image();
    image.src = previewUrl;
    
    image.onload = () => {
      setLoading(false);
      // Store the file in the window object for access by other components
      window.uploadedImageFile = file;
      onImageUpload(image, file);
    };
    
    image.onerror = () => {
      setError('Error loading image. Please try another file.');
      setLoading(false);
      URL.revokeObjectURL(previewUrl);
      setPreview(null);
    };
  }, [onImageUpload]);

  /**
   * Configure dropzone
   */
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/webp': []
    },
    maxFiles: 1,
    multiple: false
  });

  /**
   * Reset the uploader
   */
  const handleReset = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setError(null);
    
    // If in camera mode, don't exit camera mode, just clear the preview
    if (cameraMode && stream) {
      return;
    }
    
    // If we were in camera mode but exited, stop the stream
    if (stream) {
      stopCameraStream();
    }
  };
  
  /**
   * Toggle camera mode on/off
   */
  const toggleCameraMode = async () => {
    if (cameraMode) {
      // Turn off camera mode
      stopCameraStream();
      setCameraMode(false);
      setCameraReady(false);
    } else {
      // Turn on camera mode
      setCameraMode(true);
      try {
        await startCameraStream();
      } catch (err) {
        setError(`Camera access error: ${err.message}`);
        setCameraMode(false);
      }
    }
  };
  
  /**
   * Start the camera stream
   */
  const startCameraStream = async () => {
    try {
      setLoading(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
          setLoading(false);
        };
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError(`Could not access camera: ${err.message}`);
      setLoading(false);
      throw err;
    }
  };
  
  /**
   * Stop the camera stream
   */
  const stopCameraStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };
  
  /**
   * Capture image from camera
   */
  const captureImage = () => {
    if (!videoRef.current || !cameraReady) return;
    
    setLoading(true);
    
    try {
      // Set up canvas with video dimensions
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the video frame to the canvas
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to blob
      canvas.toBlob((blob) => {
        // Create a preview URL
        const previewUrl = URL.createObjectURL(blob);
        setPreview(previewUrl);
        
        // Create an image element to pass to the parent component
        const image = new Image();
        image.src = previewUrl;
        
        image.onload = () => {
          setLoading(false);
          // Create a File object from the blob
          const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
          // Store the file in the window object for access by other components
          window.uploadedImageFile = file;
          onImageUpload(image, file);
        };
        
        image.onerror = () => {
          setError('Error loading captured image.');
          setLoading(false);
          URL.revokeObjectURL(previewUrl);
          setPreview(null);
        };
      }, 'image/jpeg', 0.95);
    } catch (err) {
      console.error("Error capturing image:", err);
      setError(`Failed to capture image: ${err.message}`);
      setLoading(false);
    }
  };
  
  // Clean up camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="image-uploader">
      <h2>Upload Your Photo</h2>
      
      {!preview ? (
        cameraMode ? (
          <div className="camera-container">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="camera-preview"
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            
            {cameraReady && (
              <button
                onClick={captureImage}
                className="capture-button"
                disabled={loading}
              >
                Capture Photo
              </button>
            )}
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={`dropzone ${isDragActive ? 'active' : ''}`}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p>Drop the image here...</p>
            ) : (
              <div>
                <p>Drag & drop an image here, or click to select</p>
                <p className="dropzone-hint">
                  For best results, use a front-facing photo with good lighting
                </p>
              </div>
            )}
          </div>
        )
      ) : (
        <div className="preview-container">
          <img
            src={preview}
            alt="Preview"
            className="image-preview"
          />
          <button
            onClick={handleReset}
            className="reset-button"
          >
            {cameraMode ? "Take another photo" : "Upload a different photo"}
          </button>
        </div>
      )}
      
      {loading && (
        <div className="loading-indicator">
          <p>Processing image...</p>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;