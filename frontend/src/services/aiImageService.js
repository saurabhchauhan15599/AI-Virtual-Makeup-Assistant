// Generate AI image using backend API endpoint
export const generateAiImage = async ({
  imageFile = '',
  labValue = '',
  sku = '',
  childName = '',
  reccs = [],
  product = ''
}) => {
  try {
    // Validate inputs
    if (!imageFile) {
      throw new Error("Image file is required");
    }

    const formData = new FormData();

    // Add the image file with proper type specification
    formData.append("image", imageFile, imageFile.name);

    // Add other required fields exactly as specified in curl
    formData.append("labValue", labValue);
    formData.append("product", product);
    formData.append("sku", sku);
    formData.append("childName", childName);
    formData.append("otherShades", JSON.stringify(reccs));

    // Make API call to backend using the exact endpoint from curl
    const response = await fetch(
      "https://hackathon-team-10.thgaccess.com/image-agent/generate-ai-recommendations",
      {
        method: "POST",
        headers: {
          accept: "*/*",
          // Don't set Content-Type header - let browser set it with boundary for FormData
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend API error:", {
        status: response.status,
        statusText: response.statusText,
        errorText,
      });
      throw new Error(
        `Backend API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    // Parse the response
    const responseData = await response.json();

    if (
      responseData &&
      responseData.selectedProduct &&
      responseData.selectedProduct.success &&
      responseData.selectedProduct.url
    ) {
      const selectedProduct = responseData.selectedProduct;
      const recommendations = responseData.recommendation || [];

      return {
        success: true,
        url: selectedProduct.url,
        images: [{ url: selectedProduct.url }],
        selectedProduct: {
          sku: selectedProduct.sku,
          childName: selectedProduct.childName,
          product: selectedProduct.product,
          url: selectedProduct.url,
        },
        recommendations: recommendations.map((rec) => ({
          sku: rec.sku,
          childName: rec.childName,
          url: rec.url,
          product: rec.product,
        })),
        ref: responseData.ref,
        metadata: {
          backendResponse: true,
          hasRecommendations: recommendations.length > 0,
          recommendationCount: recommendations.length,
        },
      };
    } else if (responseData && responseData.success && responseData.imageUrl) {
      return {
        success: true,
        url: responseData.imageUrl,
        images: [{ url: responseData.imageUrl }],
        text: responseData.description || "",
        metadata: {
          backendResponse: true,
          processingTime: responseData.processingTime,
          model: responseData.model,
        },
      };
    } else if (responseData && responseData.imageData) {
      const mimeType = responseData.mimeType || "image/png";
      const byteCharacters = atob(responseData.imageData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const imageUrl = URL.createObjectURL(blob);

      return {
        success: true,
        url: imageUrl,
        images: [{ url: imageUrl, data: responseData.imageData, mimeType }],
        text: responseData.description || "",
        metadata: {
          backendResponse: true,
          processingTime: responseData.processingTime,
          model: responseData.model,
        },
      };
    } else if (responseData && responseData.url) {
      return {
        success: true,
        url: responseData.url,
        images: [{ url: responseData.url }],
        text: responseData.description || responseData.text || "",
        metadata: {
          backendResponse: true,
          processingTime: responseData.processingTime,
          model: responseData.model,
        },
      };
    } else {
      console.warn("Invalid backend response:", responseData);
      throw new Error("No AI-generated image received from the backend server");
    }
  } catch (error) {
    console.error("Error generating AI image via backend:", error);

    // Provide user-friendly error messages
    if (
      error.message.includes("Failed to fetch") ||
      error.message.includes("network")
    ) {
      throw new Error(
        "Network error occurred. Please check your connection and try again."
      );
    } else if (
      error.message.includes("500") ||
      error.message.includes("502") ||
      error.message.includes("503")
    ) {
      throw new Error(
        "AI service is temporarily unavailable. Please try again later."
      );
    } else if (error.message.includes("400") || error.message.includes("422")) {
      throw new Error(
        "Invalid request data. Please try uploading a different image."
      );
    } else if (error.message.includes("404")) {
      throw new Error("AI service endpoint not found. Please contact support.");
    }

    throw error;
  }
};

export const fetchImagewithRef = async (ref) => {
  try {
    const response = await fetch(
      `https://hackathon-team-10.thgaccess.com/image-agent/${ref}`
    );
    const res = await response.json();
    return res;
  } catch (e) {
    console.error(e);
  }
};

// Export configuration for debugging
export const getConfig = () => ({
  API_ENDPOINT:
    "https://hackathon-team-10.thgaccess.com/image-agent/generate-ai-recommendations",
  METHOD: "POST",
  CONTENT_TYPE: "multipart/form-data",
});
