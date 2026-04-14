import React, { useState, useEffect } from "react";
import { labToHex, hexToLab } from "../utils/colorUtils";
import geminiService from "../services/geminiService";

const RecommendationModal = ({
    isOpen,
    onClose,
    selectedFoundation,
    skinTone,
    undertone,
    allFoundations,
    onFoundationSelect,
}) => {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [aiPowered, setAiPowered] = useState(false);
    const [selectedRecommendation, setSelectedRecommendation] = useState(null);

    useEffect(() => {
        if (isOpen && selectedFoundation && skinTone) {
            getRecommendations();
        }
    }, [isOpen, selectedFoundation, skinTone]);

    const getRecommendations = async () => {
        setLoading(true);
        console.log(
            "🔍 MODAL: Getting recommendations for",
            selectedFoundation.brand,
            selectedFoundation.shade
        );

        try {
            // Ensure selectedFoundation has lab property
            const selectedFoundationWithLab = {
                ...selectedFoundation,
                lab:
                    selectedFoundation.lab ||
                    (selectedFoundation.hex
                        ? hexToLab(selectedFoundation.hex)
                        : null),
            };

            // Filter out the selected foundation and get different brands
            const otherBrands = allFoundations.filter(
                (foundation) => foundation.brand !== selectedFoundation.brand
            );

            console.log("🔍 MODAL: Filtering foundations...");
            console.log("📊 Total foundations:", allFoundations.length);
            console.log("📊 Other brands count:", otherBrands.length);
            console.log(
                "🎯 Selected foundation:",
                selectedFoundation.brand,
                selectedFoundation.shade,
                "LAB:",
                selectedFoundationWithLab.lab
            );

            // Sort other brands by LAB similarity to selected foundation FIRST
            const calculateDeltaE = (lab1, lab2) => {
                const [L1, a1, b1] = lab1;
                const [L2, a2, b2] = lab2;
                return Math.sqrt(
                    Math.pow(L2 - L1, 2) +
                        Math.pow(a2 - a1, 2) +
                        Math.pow(b2 - b1, 2)
                );
            };

            // Process childShades from each foundation to get individual shades
            const allShades = [];
            otherBrands.forEach((foundation) => {
                foundation.childShades.forEach((shade) => {
                    const shadeLab = hexToLab(shade.hex);
                    const deltaE = calculateDeltaE(
                        selectedFoundationWithLab.lab,
                        shadeLab
                    );

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
                    });
                });
            });

            const sortedByLAB = allShades.sort((a, b) => a.deltaE - b.deltaE);

            console.log("🎯 Top 10 closest LAB matches:");
            sortedByLAB.slice(0, 10).forEach((f, i) => {
                console.log(
                    `${i + 1}. ${f.brand} ${f.shade} LAB[${f.lab.join(
                        ", "
                    )}] ΔE=${f.deltaE.toFixed(1)}`
                );
            });

            // Send the closest 30 LAB matches to AI (not just first 30 in database)
            const closestMatches = sortedByLAB.slice(0, 30);

            // Get AI recommendations for similar shades across different brands
            const userPreferences = {
                excludeBrand: selectedFoundation.brand,
                targetShade: selectedFoundationWithLab,
                crossBrandMatching: true,
            };

            console.log(
                "🚀 MODAL: Calling Gemini AI service for recommendations..."
            );
            console.log("📊 MODAL: Sending to AI:", {
                skinTone,
                undertone,
                closestMatchesCount: closestMatches.length,
                userPreferences,
            });

            const aiResult = await geminiService.getFoundationRecommendations(
                skinTone,
                undertone,
                closestMatches, // Send LAB-sorted matches instead of random first 30
                userPreferences
            );

            console.log(
                "📥 MODAL: Received result from Gemini service:",
                aiResult
            );

            if (aiResult.success && aiResult.recommendations) {
                console.log(
                    "✅ MODAL: AI recommendations successfully received!"
                );
                console.log("🤖 MODAL: AI-powered:", aiResult.aiPowered);
                console.log(
                    "📋 MODAL: Raw AI recommendations:",
                    aiResult.recommendations
                );

                // Deduplicate AI recommendations - keep highest match score for each brand+shade
                const deduplicatedRecommendations = deduplicateRecommendations(
                    aiResult.recommendations
                );
                console.log(
                    "🎯 MODAL: Final deduplicated recommendations:",
                    deduplicatedRecommendations
                );

                setRecommendations(deduplicatedRecommendations);
                setAiPowered(aiResult.aiPowered);

                if (aiResult.aiPowered) {
                    console.log(
                        "🎉 MODAL: Successfully using GEMINI AI recommendations!"
                    );
                } else {
                    console.log(
                        "⚠️ MODAL: Using fallback recommendations (AI failed)"
                    );
                }
            } else {
                // Fallback to traditional matching
                console.log(
                    "❌ MODAL: AI result failed, using traditional matching fallback"
                );
                console.log("📊 MODAL: AI result details:", aiResult);

                const traditionalMatches =
                    getTraditionalRecommendations(otherBrands);
                const deduplicatedTraditional =
                    deduplicateRecommendations(traditionalMatches);

                console.log(
                    "🔧 MODAL: Traditional recommendations:",
                    deduplicatedTraditional
                );

                setRecommendations(deduplicatedTraditional);
                setAiPowered(false);
            }
        } catch (error) {
            const traditionalMatches = getTraditionalRecommendations(
                allFoundations.filter(
                    (f) => f.brand !== selectedFoundation.brand
                )
            );
            const deduplicatedTraditional =
                deduplicateRecommendations(traditionalMatches);
            setRecommendations(deduplicatedTraditional);
            setAiPowered(false);
        }

        setLoading(false);
    };

    /**
     * Deduplicates recommendations by keeping only the highest match score for each brand+shade combination
     * @param {Array} recommendations - Array of recommendation objects
     * @returns {Array} Deduplicated recommendations
     */
    const deduplicateRecommendations = (recommendations) => {
        console.log(
            `🔄 MODAL: Deduplicating ${recommendations.length} recommendations...`
        );
        const bestMatches = new Map();

        recommendations.forEach((rec) => {
            const shadeKey = `${rec.shade.brand}-${rec.shade.shade}`;

            // Keep only the best matching shade for each brand+shade combination
            if (
                !bestMatches.has(shadeKey) ||
                bestMatches.get(shadeKey).matchScore < rec.matchScore
            ) {
                if (bestMatches.has(shadeKey)) {
                    console.log(
                        `🔄 MODAL: Replacing ${shadeKey} - old score: ${
                            bestMatches.get(shadeKey).matchScore
                        }%, new score: ${rec.matchScore}%`
                    );
                }
                bestMatches.set(shadeKey, rec);
            }
        });

        const deduplicated = Array.from(bestMatches.values())
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 5); // Limit to top 5 results

        console.log(
            `✅ MODAL: Deduplicated to ${deduplicated.length} unique shades (top 5)`
        );
        return deduplicated;
    };

    const getTraditionalRecommendations = (foundations) => {
        // Ensure selectedFoundation has lab property
        const selectedFoundationWithLab = {
            ...selectedFoundation,
            lab:
                selectedFoundation.lab ||
                (selectedFoundation.hex
                    ? hexToLab(selectedFoundation.hex)
                    : [0, 0, 0]),
        };

        // Process childShades from each foundation to get individual shades
        const allShades = [];

        foundations.forEach((foundation) => {
            foundation.childShades.forEach((shade) => {
                const shadeLab = hexToLab(shade.hex);
                const deltaE = calculateDeltaE(
                    selectedFoundationWithLab.lab,
                    shadeLab
                );

                const matchScore = Math.max(60, 100 - deltaE * 3);
                const currentShade = {
                    shade: {
                        sku: foundation.sku,
                        name: foundation.name,
                        url: foundation.url,
                        price: foundation.price,
                        brand: foundation.brand,
                        shade: shade.name,
                        hex: shade.hex,
                        lab: shadeLab,
                        childShades: foundation.childShades,
                    },
                    matchScore: matchScore,
                    reasoning: `Similar LAB color distance (ΔE: ${deltaE.toFixed(
                        1
                    )})`,
                    rank: 0,
                    deltaE: deltaE,
                };

                allShades.push(currentShade);
            });
        });

        // Return all shades - deduplication will be handled by deduplicateRecommendations
        return allShades.sort((a, b) => b.matchScore - a.matchScore);
    };

    const calculateDeltaE = (lab1, lab2) => {
        const [L1, a1, b1] = lab1;
        const [L2, a2, b2] = lab2;
        return Math.sqrt(
            Math.pow(L2 - L1, 2) + Math.pow(a2 - a1, 2) + Math.pow(b2 - b1, 2)
        );
    };

    const handleFoundationSelect = (foundation) => {
        console.log(
            "👆 MODAL: Foundation selected from recommendations:",
            foundation.brand,
            foundation.shade
        );
        setSelectedRecommendation(foundation);
        onFoundationSelect(foundation);
        // Don't close modal automatically - let user close manually
        console.log(
            "✅ MODAL: Foundation selected, modal staying open for user to review"
        );
    };

    if (!isOpen) return null;

    return (
        <div
            className="modal-overlay"
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
            }}
        >
            <div
                className="modal-content"
                style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    padding: "24px",
                    maxWidth: "800px",
                    maxHeight: "80vh",
                    overflow: "auto",
                    position: "relative",
                    margin: "20px",
                }}
            >
                {/* Header */}
                <div className="modal-header" style={{ marginBottom: "20px" }}>

                    <h2 style={{ margin: "0 0 8px 0", color: "#333" }}>
                        Similar Shades Across Brands
                    </h2>

                    {selectedFoundation && (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                marginBottom: "16px",
                            }}
                        >
                            <div
                                style={{
                                    width: "40px",
                                    height: "40px",
                                    borderRadius: "50%",
                                    backgroundColor:
                                        selectedFoundation.hex ||
                                        labToHex(
                                            ...(selectedFoundation.lab ||
                                                (selectedFoundation.hex
                                                    ? hexToLab(
                                                          selectedFoundation.hex
                                                      )
                                                    : [0, 0, 0]))
                                        ),
                                    border: "2px solid #ddd",
                                }}
                            ></div>
                            <div>
                                <p
                                    style={{
                                        margin: "0",
                                        fontWeight: "bold",
                                        fontSize: "16px",
                                    }}
                                >
                                    {selectedFoundation.brand} -{" "}
                                    {selectedFoundation.shade}
                                </p>
                                <p
                                    style={{
                                        margin: "0",
                                        fontSize: "14px",
                                        color: "#666",
                                    }}
                                >
                                    Selected Foundation
                                </p>
                            </div>
                        </div>
                    )}

                    {aiPowered && (
                        <div
                            style={{
                                padding: "8px 12px",
                                backgroundColor: "#e8f5e8",
                                border: "1px solid #4CAF50",
                                borderRadius: "6px",
                                fontSize: "14px",
                                color: "#2e7d32",
                            }}
                        >
                            ✨ AI-Powered Cross-Brand Recommendations
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="modal-body">
                    {loading ? (
                        <div style={{ textAlign: "center", padding: "40px" }}>
                            <p>🔍 Finding similar shades across brands...</p>
                        </div>
                    ) : (
                        <>
                            <h3 style={{ marginBottom: "16px", color: "#333" }}>
                                Recommended Similar Shades (
                                {recommendations.length})
                            </h3>

                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                        "repeat(auto-fill, minmax(280px, 1fr))",
                                    gap: "16px",
                                }}
                            >
                                {recommendations.map((rec, index) => (
                                    <div
                                        key={`${rec.shade.brand}-${rec.shade.shade}`}
                                        className="recommendation-card"
                                        onClick={() =>
                                            handleFoundationSelect(rec.shade)
                                        }
                                        style={{
                                            border:
                                                selectedRecommendation &&
                                                selectedRecommendation.brand ===
                                                    rec.shade.brand &&
                                                selectedRecommendation.shade ===
                                                    rec.shade.shade
                                                    ? "3px solid #4CAF50"
                                                    : "2px solid #ddd",
                                            borderRadius: "8px",
                                            padding: "16px",
                                            cursor: "pointer",
                                            transition: "all 0.2s ease",
                                            backgroundColor:
                                                selectedRecommendation &&
                                                selectedRecommendation.brand ===
                                                    rec.shade.brand &&
                                                selectedRecommendation.shade ===
                                                    rec.shade.shade
                                                    ? "#f0f8f0"
                                                    : "#fafafa",
                                            boxShadow:
                                                selectedRecommendation &&
                                                selectedRecommendation.brand ===
                                                    rec.shade.brand &&
                                                selectedRecommendation.shade ===
                                                    rec.shade.shade
                                                    ? "0 0 15px rgba(76, 175, 80, 0.3)"
                                                    : "none",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.borderColor =
                                                "#4CAF50";
                                            e.target.style.backgroundColor =
                                                "#f5f5f5";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.borderColor = "#ddd";
                                            e.target.style.backgroundColor =
                                                "#fafafa";
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "12px",
                                                marginBottom: "12px",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: "32px",
                                                    height: "32px",
                                                    borderRadius: "50%",
                                                    backgroundColor:
                                                        rec.shade.hex ||
                                                        labToHex(
                                                            ...(rec.shade.lab ||
                                                                (rec.shade.hex
                                                                    ? hexToLab(
                                                                          rec
                                                                              .shade
                                                                              .hex
                                                                      )
                                                                    : [
                                                                          0, 0,
                                                                          0,
                                                                      ]))
                                                        ),
                                                    border: "2px solid #ddd",
                                                }}
                                            ></div>
                                            <div style={{ flex: 1 }}>
                                                <h4
                                                    style={{
                                                        margin: "0",
                                                        fontSize: "14px",
                                                        fontWeight: "bold",
                                                    }}
                                                >
                                                    {rec.shade.brand}
                                                </h4>
                                                <p
                                                    style={{
                                                        margin: "0",
                                                        fontSize: "13px",
                                                        color: "#666",
                                                    }}
                                                >
                                                    {rec.shade.shade}
                                                </p>
                                            </div>
                                            {aiPowered && (
                                                <span
                                                    style={{
                                                        fontSize: "12px",
                                                        backgroundColor:
                                                            "#4CAF50",
                                                        color: "white",
                                                        padding: "2px 6px",
                                                        borderRadius: "10px",
                                                    }}
                                                >
                                                    ✨ AI
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ marginBottom: "8px" }}>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent:
                                                        "space-between",
                                                    alignItems: "center",
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: "12px",
                                                        color: "#666",
                                                    }}
                                                >
                                                    Match Score:
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: "14px",
                                                        fontWeight: "bold",
                                                        color: "#4CAF50",
                                                    }}
                                                >
                                                    {Math.round(rec.matchScore)}
                                                    %
                                                </span>
                                            </div>
                                            <div
                                                style={{
                                                    width: "100%",
                                                    height: "4px",
                                                    backgroundColor: "#eee",
                                                    borderRadius: "2px",
                                                    marginTop: "4px",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: `${rec.matchScore}%`,
                                                        height: "100%",
                                                        backgroundColor:
                                                            "#4CAF50",
                                                        borderRadius: "2px",
                                                    }}
                                                ></div>
                                            </div>
                                        </div>

                                        <p
                                            style={{
                                                margin: "0",
                                                fontSize: "12px",
                                                color: "#666",
                                                fontStyle: "italic",
                                                lineHeight: "1.3",
                                            }}
                                        >
                                            {rec.reasoning}
                                        </p>

                                        <p
                                            style={{
                                                margin: "8px 0 0 0",
                                                fontSize: "11px",
                                                color: "#999",
                                            }}
                                        >
                                            Undertone: {rec.shade.undertone}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {recommendations.length === 0 && !loading && (
                                <div
                                    style={{
                                        textAlign: "center",
                                        padding: "40px",
                                        color: "#666",
                                    }}
                                >
                                    <p>
                                        No similar shades found in other brands.
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div
                    className="modal-footer"
                    style={{
                        marginTop: "24px",
                        paddingTop: "16px",
                        borderTop: "1px solid #eee",
                        textAlign: "center",
                    }}
                >
                    <button
                        onClick={onClose}
                        style={{
                            padding: "10px 20px",
                            backgroundColor: "#111111",
                            border: "1px solid #111111",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "14px",
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecommendationModal;
