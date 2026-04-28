import { Injectable } from '@nestjs/common';
import convert from 'color-convert';

@Injectable()
export class LabAnalyzerService {


    extractSkinTone(imageData, regions) {
        const { data, width } = imageData;
        let totalPixels = 0;
        let totalR = 0, totalG = 0, totalB = 0;

        // Sample pixels from each region
        regions.forEach(region => {
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
        return this.rgbToLab(avgR, avgG, avgB);
    };


    rgbToLab(r, g, b) {
        return convert.rgb.lab([r, g, b]);
    };

}
