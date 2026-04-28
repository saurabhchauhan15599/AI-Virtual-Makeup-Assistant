import { ContentListUnion, GoogleGenAI } from '@google/genai';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadService } from '../upload/upload.service';
import { GenerateRecommendationsDto } from './dto/generate-recommendations.dto';
import { Product } from './interfaces/product.interface';
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class ImageAgentService implements OnModuleInit {
    private productsData: Map<string, Product> = new Map<string, Product>();

    constructor(
        private configService: ConfigService,
        private uploadService: UploadService
    ) {

    }

    async onModuleInit() {
        await this.loadProductsData();
    }

    async generateImage() {
        const ai = new GoogleGenAI({ apiKey: this.configService.get('AIzaSyCxF3HbCwjN1yM5d0srw8fcM4LWxh4R6g4') });

        const imagePath = "./avatar-2023 1.jpeg";
        const imageData = fs.readFileSync(imagePath);
        const base64Image = imageData.toString("base64");

        const prompt: ContentListUnion = [
            {
                text: "Apply red colour lipstick should look natural"
            },
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Image
                }
            }
        ]

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image-preview",
            contents: prompt,
        });
        for (const part of response?.candidates[0].content.parts) {
            if (part.text) {
                console.log(part.text);
            } else if (part.inlineData) {
                const imageData = part.inlineData.data;
                const buffer = Buffer.from(imageData, "base64");
                fs.writeFileSync("gemini-native-image.png", buffer);
                console.log("Image saved as gemini-native-image.png");
            }
        }
    }

    async generateRecommendations(imageFile: Express.Multer.File, params: GenerateRecommendationsDto) {
        console.log('Processing image with parameters:', {
            labValue: params.labValue,
            sku: params.sku,
            childName: params.childName
        });
        console.log('Image details:', {
            originalname: imageFile.originalname,
            mimetype: imageFile.mimetype,
            size: imageFile.size
        });


        const ai = new GoogleGenAI({ apiKey: this.configService.get('GEMINI_API_KEY') });
        // Convert uploaded file buffer to base64
        const base64Image = imageFile.buffer.toString("base64");
        console.log(this.productsData.get(params.sku).childShades)
        const prompt: ContentListUnion = [
            {
                text: `Apply foundation to the person face in the image keep as real as possible below are param for LAB value for person
                hex code of foundation
                -Person Lab Value: ${params.labValue}
                -Foundation HEX code: ${this.productsData.get(params.sku).childShades.find(e => e.name == params.childName).hex}`
            },
            {
                inlineData: {
                    mimeType: imageFile.mimetype,
                    data: base64Image
                }
            }
        ];

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-image-preview",
                contents: prompt,
            });

            const recommendations = [];
            for (const part of response?.candidates[0].content.parts) {
                if (part.text) {
                    console.log('Generated recommendation:', part.text);
                    recommendations.push({
                        type: 'text',
                        content: part.text
                    });
                } else if (part.inlineData) {
                    const imageData = part.inlineData.data;
                    const filename = `recommendation-${params.sku}-${params.childName}-${Date.now()}.png`;
                    const buffer = Buffer.from(imageData, "base64");
                    fs.writeFileSync(filename, buffer);
                    try {
                        // Upload to GCP bucket instead of saving locally
                        const publicUrl = await this.uploadService.uploadBase64ImageToGCP(
                            imageData,
                            filename,
                            'image/png'
                        );

                        console.log(`Generated image uploaded to GCP: ${publicUrl}`);
                        recommendations.push({
                            type: 'image',
                            filename: filename,
                            url: publicUrl,
                            data: imageData
                        });


                        return {
                            success: true,
                            url: publicUrl
                        };
                    } catch (uploadError) {
                        console.error(uploadError)
                        throw uploadError;
                    }
                }
            }
        } catch (error) {
            throw new Error(`Failed to generate recommendations: ${error.message}`);
        }
    }

    private async loadProductsData() {
        try {
            const filePath = path.join(process.cwd(), 'merged-output.json');
            const fileContent = fs.readFileSync(filePath, 'utf8');
            this.productsData = (JSON.parse(fileContent) as Product[]).reduce((a, e) => {
                a.set(e.sku, e);
                return a;
            }, new Map());
            console.log(`Loaded products from merged-output.json`);
        } catch (error) {
            console.error('Error loading products data:', error);
        }
    }
}
