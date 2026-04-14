/**
 * Service for interacting with Google Gemini AI API
 * Provides intelligent foundation shade recommendations
 */
class GeminiService {
    constructor() {
        this.apiKey = process.env.REACT_APP_GEMINI_API_KEY;
        this.baseUrl =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    }

    /**
     * Get foundation recommendations using Gemini AI
     * @param {Array} skinTone - LAB color values [L, a, b]
     * @param {String} undertone - Detected undertone (warm/cool/neutral)
     * @param {Array} availableShades - Array of available foundation shades
     * @param {Object} userPreferences - User preferences (brand, coverage, etc.)
     * @returns {Promise<Object>} AI-powered recommendations
     */
    async getFoundationRecommendations(
        skinTone,
        undertone,
        availableShades,
        userPreferences = {}
    ) {
        if (!this.apiKey) {
            return this.getFallbackRecommendations(
                skinTone,
                undertone,
                availableShades
            );
        }

        try {
            const prompt = this.buildRecommendationPrompt(
                skinTone,
                undertone,
                availableShades,
                userPreferences
            );

            const response = await fetch(this.baseUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-goog-api-key": this.apiKey,
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt,
                                },
                            ],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.3,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error(
                    `Gemini API error: ${response.status} ${response.statusText}`
                );
            }

            const data = await response.json();

            if (
                !data.candidates ||
                !data.candidates[0] ||
                !data.candidates[0].content
            ) {
                throw new Error("Invalid response from Gemini API");
            }

            const aiResponse = data.candidates[0].content.parts[0].text;

            const result = this.parseAIResponse(aiResponse, availableShades);

            return result;
        } catch (error) {
            return this.getFallbackRecommendations(
                skinTone,
                undertone,
                availableShades
            );
        }
    }

    /**
     * Build the prompt for Gemini AI
     * @param {Array} skinTone - LAB color values
     * @param {String} undertone - Detected undertone
     * @param {Array} availableShades - Available foundation shades
     * @param {Object} userPreferences - User preferences
     * @returns {String} Formatted prompt
     */
    buildRecommendationPrompt(
        skinTone,
        undertone,
        availableShades,
        userPreferences
    ) {
        const [L, a, b] = skinTone;

        // Get top 20 shades for analysis to keep prompt manageable
        const topShades = availableShades.slice(0, 20);

        const shadesInfo = topShades
            .map(
                (shade, index) =>
                    `${index + 1}. ${shade.brand} - ${
                        shade.shade
                    } (LAB: [${shade.lab.join(", ")}], Undertone: ${
                        shade.undertone
                    })`
            )
            .join("\n");

        // Check if this is a cross-brand recommendation request
        const isCrossBrandRequest =
            userPreferences.crossBrandMatching && userPreferences.targetShade;

        if (isCrossBrandRequest) {
            const targetShade = userPreferences.targetShade;

            const prompt = `You are an expert makeup artist and color specialist. A user has selected a foundation shade and wants to find SIMILAR SHADES from OTHER BRANDS.

SELECTED FOUNDATION:
- Brand: ${targetShade.brand}
- Shade: ${targetShade.shade}
- LAB Values: [${targetShade.lab.join(", ")}]
- Undertone: ${targetShade.undertone}

USER'S SKIN ANALYSIS:
- LAB Color Values: [${L.toFixed(1)}, ${a.toFixed(1)}, ${b.toFixed(1)}]
- Detected Undertone: ${undertone}
- Skin Depth: ${this.getSkinDepthDescription(L)}

AVAILABLE ALTERNATIVE SHADES (from other brands):
${shadesInfo}

TASK:
Find the TOP 8 most similar foundation shades from the available options that would work as alternatives to the selected foundation. Consider:
1. LAB color similarity to the selected shade (most important)
2. Undertone compatibility with both user's skin and selected shade
3. Professional color matching principles
4. Cross-brand shade matching expertise

RESPONSE FORMAT (JSON):
{
  "recommendations": [
    {
      "rank": 1,
      "shadeIndex": 1,
      "matchScore": 95,
      "reasoning": "Brief explanation of why this is a good alternative",
      "undertoneMatch": "excellent/good/fair",
      "colorDistance": 1.5
    }
  ],
  "analysis": {
    "skinDescription": "How these alternatives work with the user's skin tone",
    "undertoneConfidence": "high/medium/low",
    "recommendations": "Tips for choosing between these alternatives"
  }
}

IMPORTANT: shadeIndex must be a single number (not an array), corresponding to the numbered list above.

Please provide only the JSON response, no additional text.`;

            return prompt;
        } else {
            return `You are an expert makeup artist and color specialist. I need you to analyze a person's skin tone and recommend the best foundation shades from the available options.

SKIN ANALYSIS:
- LAB Color Values: [${L.toFixed(1)}, ${a.toFixed(1)}, ${b.toFixed(1)}]
- Detected Undertone: ${undertone}
- Skin Depth: ${this.getSkinDepthDescription(L)}

AVAILABLE FOUNDATION SHADES:
${shadesInfo}

USER PREFERENCES:
${
    userPreferences.preferredBrands
        ? `- Preferred Brands: ${userPreferences.preferredBrands.join(", ")}`
        : "- No brand preference"
}
${
    userPreferences.coverage
        ? `- Coverage Preference: ${userPreferences.coverage}`
        : "- No coverage preference specified"
}
${
    userPreferences.skinType
        ? `- Skin Type: ${userPreferences.skinType}`
        : "- Skin type not specified"
}

TASK:
Please analyze the skin tone and recommend the TOP 5 best matching foundation shades from the list above. Consider:
1. LAB color distance (most important factor)
2. Undertone compatibility
3. User preferences if specified
4. Professional color matching principles

RESPONSE FORMAT (JSON):
{
  "recommendations": [
    {
      "rank": 1,
      "shadeIndex": 1,
      "matchScore": 95,
      "reasoning": "Brief explanation of why this shade matches well",
      "undertoneMatch": "excellent/good/fair",
      "colorDistance": 1.5
    }
  ],
  "analysis": {
    "skinDescription": "Professional description of the skin tone",
    "undertoneConfidence": "high/medium/low",
    "recommendations": "Additional tips for foundation application"
  }
}

IMPORTANT: shadeIndex must be a single number (not an array), corresponding to the numbered list above.

Please provide only the JSON response, no additional text.`;
        }
    }

    /**
     * Parse AI response and format recommendations
     * @param {String} aiResponse - Raw AI response
     * @param {Array} availableShades - Available shades for reference
     * @returns {Object} Parsed recommendations
     */
    parseAIResponse(aiResponse, availableShades) {
        try {
            // Clean the response to extract JSON
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("No JSON found in AI response");
            }

            let parsed;
            try {
                parsed = JSON.parse(jsonMatch[0]);
            } catch (parseError) {
                // Try to fix incomplete JSON by adding missing closing braces
                let fixedJson = jsonMatch[0];
                if (!fixedJson.trim().endsWith("}")) {
                    // Count open braces vs close braces
                    const openBraces = (fixedJson.match(/\{/g) || []).length;
                    const closeBraces = (fixedJson.match(/\}/g) || []).length;
                    const missingBraces = openBraces - closeBraces;

                    for (let i = 0; i < missingBraces; i++) {
                        fixedJson += "}";
                    }

                    parsed = JSON.parse(fixedJson);
                }
            }

            // Map shade indices back to actual shade objects
            if (parsed.recommendations) {
                parsed.recommendations = parsed.recommendations
                    .map((rec, recIndex) => {
                        // Handle both array and single number shadeIndex
                        let shadeIndex;
                        if (Array.isArray(rec.shadeIndex)) {
                            shadeIndex = rec.shadeIndex[0] - 1; // Take first value and convert to 0-based
                        } else {
                            shadeIndex = rec.shadeIndex - 1; // Convert to 0-based index
                        }

                        if (
                            shadeIndex >= 0 &&
                            shadeIndex < availableShades.length
                        ) {
                            const shade = availableShades[shadeIndex];

                            return {
                                ...rec,
                                shade: shade,
                                aiPowered: true,
                            };
                        }
                        return null;
                    })
                    .filter(Boolean);
            }

            const result = {
                success: true,
                aiPowered: true,
                ...parsed,
            };

            return result;
        } catch (error) {
            return this.getFallbackRecommendations(null, null, availableShades);
        }
    }

    /**
     * Get skin depth description from L value
     * @param {Number} L - Lightness value from LAB
     * @returns {String} Skin depth description
     */
    getSkinDepthDescription(L) {
        if (L >= 85) return "Very Light";
        if (L >= 70) return "Light";
        if (L >= 55) return "Medium Light";
        if (L >= 40) return "Medium";
        if (L >= 25) return "Medium Deep";
        return "Deep";
    }

    /**
     * Fallback recommendations when AI is unavailable
     * @param {Array} skinTone - LAB color values
     * @param {String} undertone - Detected undertone
     * @param {Array} availableShades - Available shades
     * @returns {Object} Fallback recommendations
     */
    getFallbackRecommendations(skinTone, undertone, availableShades) {
        const topShades = availableShades.slice(0, 5);

        const result = {
            success: true,
            aiPowered: false,
            recommendations: topShades.map((shade, index) => ({
                rank: index + 1,
                shade: shade,
                matchScore: Math.max(60, 95 - index * 5), // Decreasing scores
                reasoning: `Traditional color matching algorithm - ${
                    index === 0 ? "closest" : "good"
                } LAB color distance`,
                undertoneMatch:
                    shade.undertone === undertone ? "excellent" : "good",
                colorDistance: shade.matchDetails?.matchScore || 0,
            })),
            analysis: {
                skinDescription: skinTone
                    ? `Skin tone with LAB values [${skinTone
                          .map((v) => v.toFixed(1))
                          .join(", ")}]`
                    : "Skin tone analysis",
                undertoneConfidence: "medium",
                recommendations:
                    "Using traditional color matching. For best results, consider professional color consultation.",
            },
        };

        return result;
    }

    /**
     * Get personalized makeup tips using Gemini AI
     * @param {Array} skinTone - LAB color values
     * @param {String} undertone - Detected undertone
     * @param {Object} selectedFoundation - Selected foundation shade
     * @returns {Promise<Object>} Personalized tips
     */
    async getPersonalizedTips(skinTone, undertone, selectedFoundation) {
        if (!this.apiKey) {
            return this.getFallbackTips(undertone);
        }

        try {
            const prompt = `As a professional makeup artist, provide personalized makeup tips for someone with:
- Skin LAB values: [${skinTone.join(", ")}]
- Undertone: ${undertone}
- Selected foundation: ${selectedFoundation.brand} ${selectedFoundation.shade}

Provide 3-4 specific, actionable tips for:
1. Foundation application technique
2. Complementary makeup colors
3. Skin preparation
4. Setting and longevity

Keep each tip concise (1-2 sentences). Format as JSON:
{
  "tips": [
    {"category": "Application", "tip": "..."},
    {"category": "Colors", "tip": "..."},
    {"category": "Prep", "tip": "..."},
    {"category": "Setting", "tip": "..."}
  ]
}`;

            const response = await fetch(this.baseUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-goog-api-key": this.apiKey,
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.4,
                        maxOutputTokens: 512,
                    },
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const aiResponse = data.candidates[0].content.parts[0].text;
                const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            }
        } catch (error) {
            // Silently fall back to default tips
        }

        return this.getFallbackTips(undertone);
    }

    /**
     * Fallback tips when AI is unavailable
     * @param {String} undertone - Detected undertone
     * @returns {Object} Fallback tips
     */
    getFallbackTips(undertone) {
        const baseTips = [
            {
                category: "Application",
                tip: "Apply foundation in thin layers, building coverage gradually for a natural finish.",
            },
            {
                category: "Prep",
                tip: "Use a primer suited to your skin type to ensure smooth application and longer wear.",
            },
            {
                category: "Setting",
                tip: "Set with translucent powder in the T-zone and use setting spray for all-day wear.",
            },
        ];

        const undertoneSpecificTip = {
            warm: {
                category: "Colors",
                tip: "Complement your warm undertones with peachy blushes and golden-toned bronzers.",
            },
            cool: {
                category: "Colors",
                tip: "Enhance your cool undertones with pink-based blushes and silver-toned highlighters.",
            },
            neutral: {
                category: "Colors",
                tip: "You can wear both warm and cool tones - experiment with different color families.",
            },
        };

        return {
            tips: [
                ...baseTips,
                undertoneSpecificTip[undertone] || undertoneSpecificTip.neutral,
            ],
        };
    }
}

// Create and export singleton instance
const geminiService = new GeminiService();
export default geminiService;
