import React from "react";
import "../styles/ProductTypeSelector.css";

const ProductTypeSelector = ({ onProductTypeSelect, selectedType }) => {
  return (
    <div className="product-type-selector-container">
      <h2>Choose a product to try on</h2>
      <div className="product-type-options">
        <button
          className={`product-type-button ${
            selectedType === "foundation" ? "active" : ""
          }`}
          onClick={() => onProductTypeSelect("foundation")}
        >
          <img
            src={process.env.PUBLIC_URL + "/images/foundationicon.png"}
            alt="Face with foundation matching mesh"
            className="face-image"
          />
        </button>
        <button
          className={`product-type-button ${
            selectedType === "lipstick" ? "active" : ""
          }`}
          onClick={() => onProductTypeSelect("lipstick")}
        >
          <img
            src={process.env.PUBLIC_URL + "/images/lipstickicon.jpg"}
            alt="Face with foundation matching mesh"
            className="face-image"
          />
        </button>
      </div>
    </div>
  );
};

export default ProductTypeSelector;
