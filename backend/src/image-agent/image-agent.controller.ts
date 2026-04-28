import { Controller, Get, Post, Body, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GenerateRecommendationsDto } from './dto/generate-recommendations.dto';
import { ImageAgentService } from './image-agent.service';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiConsumes,
    ApiBody
} from '@nestjs/swagger';

@ApiTags('image-agent')
@Controller('image-agent')
export class ImageAgentController {

    constructor(private readonly imageAgentService: ImageAgentService) { }

    @Get()
    @ApiOperation({ summary: 'Health check endpoint' })
    @ApiResponse({ status: 200, description: 'Service is running', type: String })
    getImage(): Promise<String> {
        return Promise.resolve('Done');
    }

    @Post('generate-ai-recommendations')
    @UseInterceptors(FileInterceptor('image'))
    @ApiOperation({
        summary: 'Generate AI recommendations from image',
        description: 'Upload an image with product parameters to get AI-powered recommendations'
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Image file and product parameters',
        schema: {
            type: 'object',
            properties: {
                image: {
                    type: 'string',
                    format: 'binary',
                },
                labValue: {
                    type: 'string',
                },
                sku: {
                    type: 'string',
                    description: 'Product SKU',
                },
                childName: {
                    type: 'string',
                }
            },
            required: ['image', 'labValue', 'sku', 'childName']
        }
    })
    @ApiResponse({
        status: 200,
        description: 'AI recommendations generated successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                url: { type: 'string', example: 'https://storage.googleapis.com/bucket/image.png' }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Bad request - missing required parameters' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async generateAiRecommendations(
        @UploadedFile() image: Express.Multer.File,
        @Body() body: GenerateRecommendationsDto
    ): Promise<any> {
        console.log('Received image:', image?.originalname, 'Size:', image?.size);
        console.log('Received parameters:', {
            labValue: body.labValue,
            sku: body.sku,
            childName: body.childName
        });
        
        if (!image) {
            throw new Error('Image file is required');
        }
        
        if (!body.labValue) {
            throw new Error('labValue parameter is required');
        }
        
        if (!body.sku) {
            throw new Error('sku parameter is required');
        }
        
        if (!body.childName) {
            throw new Error('childName parameter is required');
        }

        return await this.imageAgentService.generateRecommendations(image, body);
    }
}
