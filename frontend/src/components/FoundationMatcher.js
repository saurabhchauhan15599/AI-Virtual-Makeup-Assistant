import React, { useState, useEffect } from "react";
import {
    SHADE_DB,
    getUniqueBrands,
    getProductsByType,
} from "../data/foundationData";
import {
    findMatchingFoundations,
    hexToLab,
    labToHex,
} from "../utils/colorUtils";
import RecommendationModal from "./RecommendationModal";
import { generateAiImage } from "../services/aiImageService";

const FoundationMatcher = ({
    skinTone,
    undertone,
    onFoundationSelect,
    onProceedToTryOn,
    productType = "foundation",
}) => {
    const [matches, setMatches] = useState([]);
    const [selectedFoundation, setSelectedFoundation] = useState(null);
    const [filterBrand, setFilterBrand] = useState("");
    const [loading, setLoading] = useState(true);
    const [showRecommendationModal, setShowRecommendationModal] =
        useState(false);
    const [modalSelectedFoundation, setModalSelectedFoundation] =
        useState(null);

    // Get unique brands for filtering based on product type
    const brands = getUniqueBrands(productType);

    // Handle brand filter change
    const handleBrandChange = (e) => {
        setFilterBrand(e.target.value);
    };

    // Find matching foundations when skin tone or filters change
    useEffect(() => {
        if (!skinTone) return;

        setLoading(true);

        // Find matching foundations with options
        const options = {
            brand: filterBrand || undefined,
            limit: 50, // Show more results for filtering
        };

        // Get the appropriate product database based on product type
        const productDatabase = getProductsByType(productType);

        const foundationMatches = findMatchingFoundations(
            skinTone,
            productDatabase,
            options
        );
        setMatches(foundationMatches);

        // Select the best match by default only once
        if (foundationMatches.length > 0 && !selectedFoundation) {
            setSelectedFoundation(foundationMatches[0]);
            // Don't call onFoundationSelect here - wait for explicit user action
        }

        setLoading(false);
    }, [skinTone, filterBrand]); // Removed selectedFoundation and filterUndertone from dependencies

    // Handle foundation selection - can either select directly or open modal
    const handleFoundationSelect = async (foundation, action = "select") => {
        if (action === "select") {
            // Direct selection
            setSelectedFoundation(foundation);
            // Don't call onFoundationSelect here - wait for explicit button click
        } else if (action === "modal") {
            // Open modal for cross-brand recommendations

            setModalSelectedFoundation(foundation);
            setShowRecommendationModal(true);
        }
    };

    // Handle final foundation selection from modal
    const handleFinalFoundationSelect = (foundation) => {
        setSelectedFoundation(foundation);
        // Don't close modal automatically - let user close manually
    };

    // Format match score as percentage
    const formatMatchScore = (score) => {
        // Lower score is better, so invert and scale
        const percentage = Math.max(0, Math.min(100, 100 - score * 5));
        return `${Math.round(percentage)}%`;
    };

    return (
        <div className="foundation-matcher">
            <h2>
                {productType === "foundation" ? "Foundation" : "Lipstick"}{" "}
                Matches
            </h2>

            {skinTone && (
                <div className="skin-tone-info">
                    <div
                        className="skin-tone-swatch"
                        style={{ backgroundColor: labToHex(...skinTone) }}
                    ></div>
                    <div className="skin-tone-details">
                        <p>
                            Detected Undertone: <strong>{undertone}</strong>
                        </p>
                        <p>
                            LAB Values: [
                            {skinTone.map((v) => Math.round(v)).join(", ")}]
                        </p>
                    </div>
                </div>
            )}

            <div className="filter-controls">
                <div className="filter-group">
                    <label htmlFor="brand-filter">Brand:</label>
                    <select
                        id="brand-filter"
                        value={filterBrand}
                        onChange={handleBrandChange}
                    >
                        <option value="">All Brands</option>
                        {brands.map((brand) => (
                            <option key={brand} value={brand}>
                                {brand}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="loading-indicator">
                    <p>Finding matches...</p>
                </div>
            ) : matches.length === 0 ? (
                <div className="no-matches">
                    <p>
                        No matching foundations found. Try adjusting the
                        filters.
                    </p>
                </div>
            ) : (
                <div className="matches-list">
                    {matches.slice(0, 10).map((foundation) => (
                        <div
                            key={`${foundation.name}-${foundation.shade}-${foundation.sku}`}
                            className={`foundation-card ${
                                selectedFoundation === foundation
                                    ? "selected"
                                    : ""
                            }`}
                            onClick={() => handleFoundationSelect(foundation)}
                            style={{
                                cursor: "pointer",
                                border:
                                    selectedFoundation === foundation
                                        ? "3px solid #111111"
                                        : "2px solid #ddd",
                                backgroundColor: "#fff",
                                color: "#333",
                                borderRadius: "8px",
                                padding: "16px",
                                margin: "8px 0",
                                transition: "all 0.3s ease",
                                boxShadow:
                                    selectedFoundation === foundation
                                        ? "0 0 15px rgba(76, 175, 80, 0.3)"
                                        : "0 2px 8px rgba(0, 0, 0, 0.1)",
                                position: "relative",
                            }}
                        >
                            <div
                                className="foundation-swatch"
                                style={{ backgroundColor: foundation.hex }}
                            ></div>
                            <div className="foundation-details">
                                <h3>
                                    <a
                                        href={foundation.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{textDecoration: "none", color:'#111111'}}
                                
                                    >
                                        {foundation.name}
                                    </a>
                                </h3>
                                <h4>{foundation.shade}</h4>
                                <p className="foundation-childShades">
                                    Available shades:{" "}
                                    {foundation.childShades.length}
                                </p>
                                {productType !== "lipstick" && (
                                    <div className="match-score">
                                        <div className="match-label">
                                            Match:
                                        </div>
                                        <div className="match-bar">
                                            <div
                                                className="match-bar-fill"
                                                style={{
                                                    width: formatMatchScore(
                                                        foundation.matchDetails
                                                            .matchScore
                                                    ),
                                                    backgroundColor:
                                                        getMatchColor(
                                                            foundation
                                                                .matchDetails
                                                                .matchScore
                                                        ),
                                                }}
                                            ></div>
                                        </div>
                                        <div className="match-percentage">
                                            {formatMatchScore(
                                                foundation.matchDetails
                                                    .matchScore
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Action buttons */}
                                <div
                                    style={{
                                        marginTop: "12px",
                                        display: "flex",
                                        gap: "8px",
                                        justifyContent: "center",
                                    }}
                                >
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleFoundationSelect(
                                                foundation,
                                                "modal"
                                            );
                                        }}
                                        style={{
                                            padding: "8px 16px",
                                            backgroundColor: "#111111",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "4px",
                                            fontSize: "12px",
                                            fontWeight: "bold",
                                            cursor: "pointer",
                                            width: "100%",
                                        }}
                                    >
                                        Similar
                                    </button>
                                </div>

                                {/* Selected indicator */}
                                {selectedFoundation === foundation && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: "8px",
                                            right: "8px",
                                            backgroundColor: "#111111",
                                            color: "white",
                                            borderRadius: "50%",
                                            width: "24px",
                                            height: "24px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "12px",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        ✓
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="button-container">
                {selectedFoundation && (
                    <button
                        className="proceed-button"
                        onClick={() => {
                            if (selectedFoundation) {
                                onFoundationSelect(selectedFoundation);
                                setTimeout(() => {
                                    onProceedToTryOn();
                                }, 100);
                            }
                        }}
                        style={{
                            padding: "12px 24px",
                            backgroundColor: "#111111",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "16px",
                            fontWeight: "bold",
                            cursor: "pointer",
                            width: "100%",
                            maxWidth: "300px",
                            margin: "0 auto",
                            display: "block",
                        }}
                    >
                        Proceed to Try-On
                    </button>
                )}
            </div>

            {/* Recommendation Modal */}
            <RecommendationModal
                isOpen={showRecommendationModal}
                onClose={() => setShowRecommendationModal(false)}
                selectedFoundation={modalSelectedFoundation}
                skinTone={skinTone}
                undertone={undertone}
                allFoundations={getProductsByType(productType)}
                onFoundationSelect={handleFinalFoundationSelect}
            />
        </div>
    );
};

/**
 * Get color for match score visualization
 * @param {Number} score - Match score (lower is better)
 * @returns {String} CSS color value
 */
const getMatchColor = (score) => {
    // Convert score to percentage (inverted, since lower score is better)
    const percentage = Math.max(0, Math.min(100, 100 - score * 5));

    if (percentage >= 90) return "#4CAF50"; // Excellent match - green
    if (percentage >= 75) return "#8BC34A"; // Good match - light green
    if (percentage >= 60) return "#FFEB3B"; // Decent match - yellow
    if (percentage >= 40) return "#FFC107"; // Fair match - amber
    return "#FF5722"; // Poor match - deep orange
};

export default FoundationMatcher;
