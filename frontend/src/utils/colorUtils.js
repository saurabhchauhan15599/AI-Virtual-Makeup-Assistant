import convert from "color-convert";

/**
 * Converts RGB color to LAB color space
 * @param {Number} r - Red component (0-255)
 * @param {Number} g - Green component (0-255)
 * @param {Number} b - Blue component (0-255)
 * @returns {Array} LAB color values [L, a, b]
 */
export const rgbToLab = (r, g, b) => {
    return convert.rgb.lab([r, g, b]);
};

/**
 * Converts LAB color to RGB color space
 * @param {Number} l - Lightness component
 * @param {Number} a - a component
 * @param {Number} b - b component
 * @returns {Array} RGB color values [r, g, b]
 */
export const labToRgb = (l, a, b) => {
    return convert.lab.rgb([l, a, b]);
};

/**
 * Converts LAB color to hex string
 * @param {Number} l - Lightness component
 * @param {Number} a - a component
 * @param {Number} b - b component
 * @returns {String} Hex color string (e.g., "#FFFFFF")
 */
export const labToHex = (l, a, b) => {
    const rgb = convert.lab.rgb([l, a, b]);
    return `#${convert.rgb.hex(rgb)}`;
};

/**
 * Converts hex color to LAB color space
 * @param {String} hex - Hex color string (e.g., "#FFFFFF")
 * @returns {Array} LAB color values [L, a, b]
 */
export const hexToLab = (hex) => {
    // Safety check for undefined or null hex values
    if (!hex || typeof hex !== "string") {
        console.warn("hexToLab: Invalid hex value provided:", hex);
        return [0, 0, 0]; // Return default LAB values
    }

    // Remove # if present
    const cleanHex = hex.startsWith("#") ? hex.slice(1) : hex;
    // Convert hex to rgb
    const rgb = convert.hex.rgb(cleanHex);
    // Convert rgb to lab
    return convert.rgb.lab(rgb);
};

/**
 * Calculates Delta E (color difference) between two LAB colors
 * Uses CIE76 formula for simplicity
 * @param {Array} lab1 - First LAB color [L, a, b]
 * @param {Array} lab2 - Second LAB color [L, a, b]
 * @returns {Number} Delta E value (lower means more similar colors)
 */
export const calculateDeltaE = (lab1, lab2) => {
    const [L1, a1, b1] = lab1;
    const [L2, a2, b2] = lab2;

    // CIE76 Delta E formula
    return Math.sqrt(
        Math.pow(L2 - L1, 2) + Math.pow(a2 - a1, 2) + Math.pow(b2 - b1, 2)
    );
};

/**
 * Determines undertone from LAB values
 * @param {Array} lab - LAB color values [L, a, b]
 * @returns {String} Undertone classification ("warm", "cool", or "neutral")
 */
export const determineUndertone = (lab) => {
    const [, a, b] = lab; // Using destructuring without unused variable

    // Simple undertone determination based on a/b ratio
    if (a > b * 0.9) return "warm";
    if (a < b * 0.7) return "cool";
    return "neutral";
};

/**
 * Calculates undertone compatibility score
 * @param {Array} skinLab - Skin LAB color values [L, a, b]
 * @param {String} foundationUndertone - Foundation undertone ("warm", "cool", or "neutral")
 * @returns {Number} Compatibility score (0-1, higher is better)
 */
export const calculateUndertoneCompatibility = (
    skinLab,
    foundationUndertone
) => {
    const skinUndertone = determineUndertone(skinLab);

    // Perfect match
    if (skinUndertone === foundationUndertone) return 1.0;

    // Neutral foundation works with any skin undertone
    if (foundationUndertone === "neutral") return 0.8;

    // Neutral skin works reasonably well with any foundation
    if (skinUndertone === "neutral") return 0.6;

    // Worst case: warm skin with cool foundation or vice versa
    return 0.3;
};

/**
 * Extracts average skin tone from image data
 * @param {ImageData} imageData - Image data from canvas
 * @param {Array} regions - Array of regions to sample [x, y, width, height]
 * @returns {Array} Average LAB color values [L, a, b]
 */
export const extractSkinTone = (imageData, regions) => {
    const { data, width } = imageData;
    let totalPixels = 0;
    let totalR = 0,
        totalG = 0,
        totalB = 0;

    // Sample pixels from each region
    regions.forEach((region) => {
        const [x, y, w, h] = region;

        for (let j = y; j < y + h; j++) {
            for (let i = x; i < x + w; i++) {
                const idx = (j * width + i) * 4;

                // Skip transparent pixels
                if (data[idx + 3] < 128) continue;

                totalR += data[idx];
                totalG += data[idx + 1];
                totalB += data[idx + 2];
                totalPixels++;
            }
        }
    });

    // Calculate average RGB
    const avgR = Math.round(totalR / totalPixels);
    const avgG = Math.round(totalG / totalPixels);
    const avgB = Math.round(totalB / totalPixels);

    // Convert to LAB
    return rgbToLab(avgR, avgG, avgB);
};

/**
 * Finds best matching foundations for a given skin tone
 * @param {Array} skinToneLab - Skin tone in LAB color space [L, a, b]
 * @param {Array} foundationDatabase - Array of foundation objects
 * @param {Object} options - Options for matching
 * @param {String} options.brand - Filter by brand (optional)
 * @param {String} options.undertone - Filter by undertone (optional)
 * @param {Number} options.limit - Limit number of results (optional)
 * @returns {Array} Sorted array of foundation matches with scores
 */
export const findMatchingFoundations = (
    skinToneLab,
    foundationDatabase,
    options = {}
) => {
    const { brand, limit = 10 } = options;

    // Filter foundations by brand if specified
    let foundations = foundationDatabase;
    if (brand) {
        foundations = foundations.filter((f) => f.brand === brand);
    }

    // Calculate match scores for each foundation and its child shades
    const matches = [];

    foundations.forEach((foundation) => {
        // Process each child shade
        foundation.childShades.forEach((shade) => {
            // Convert hex to LAB for comparison
            const shadeLab = hexToLab(shade.hex);

            // Calculate color difference (Delta E)
            const deltaE = calculateDeltaE(skinToneLab, shadeLab);

            // Combined match score (lower is better)
            const matchScore = deltaE;

            matches.push({
                sku: foundation.sku,
                name: foundation.name,
                url: foundation.url,
                price: foundation.price,
                brand: foundation.brand,
                shade: shade.name,
                hex: shade.hex,
                lab: shadeLab, // Add pre-computed LAB values
                childShades: foundation.childShades,
                matchDetails: {
                    deltaE,
                    matchScore,
                },
            });
        });
    });

    // Sort by match score (lower is better)
    const sortedMatches = matches.sort(
        (a, b) => a.matchDetails.matchScore - b.matchDetails.matchScore
    );

    // Limit results if specified
    return limit ? sortedMatches.slice(0, limit) : sortedMatches;
};

/**
 * Applies foundation color to an image
 * @param {ImageData} imageData - Original image data
 * @param {Array} foundationLab - Foundation color in LAB [L, a, b]
 * @param {Number} opacity - Foundation opacity (0-1)
 * @returns {ImageData} New image data with foundation applied
 */
export const applyFoundation = (imageData, foundationHex, opacity = 0.5) => {
    const { data, width, height } = imageData;
    const newImageData = new ImageData(
        new Uint8ClampedArray(data),
        width,
        height
    );
    const newData = newImageData.data;

    // Convert hex to RGB
    const rgb = convert.hex.rgb(foundationHex.replace("#", ""));
    const [foundationR, foundationG, foundationB] = rgb;

    // Apply foundation to each pixel
    for (let i = 0; i < data.length; i += 4) {
        // Skip transparent pixels
        if (data[i + 3] < 128) continue;

        // Simple color blending with opacity
        newData[i] = Math.round(
            data[i] * (1 - opacity) + foundationR * opacity
        );
        newData[i + 1] = Math.round(
            data[i + 1] * (1 - opacity) + foundationG * opacity
        );
        newData[i + 2] = Math.round(
            data[i + 2] * (1 - opacity) + foundationB * opacity
        );
    }

    return newImageData;
};
