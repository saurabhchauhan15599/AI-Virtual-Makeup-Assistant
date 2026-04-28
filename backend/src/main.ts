import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ImageAgentService } from './image-agent/image-agent.service';
import { convertCsvToJson } from './utils/csv-to-json.util';
import { processSkuFile } from './utils/sku-processor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('AI Hackathon Team 10 API')
    .setDescription('API for AI-powered image recommendations with product data integration')
    .setVersion('1.0')
    .addTag('image-agent', 'Image processing and AI recommendations')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const imageGenService = app.get<ImageAgentService>(ImageAgentService);

  // imageGenService.generateImage();
  // const columnNames = ['sku', 'name', 'url', 'price', 'in_stock', 'image_url', 'categories', 'group_id', 'Base_price_map', 'Is_New_In', 'Is_Trending', 'RRP_Price_Map', 'available_sizes', 'brand', 'breadcrumbs_Categories', 'discount_rrp', 'dy_display_price', 'new_in_release_date', 'price_sale_amount', 'review_number', 'reviews_stars', 'rrp_saving', 'sale_price'];
  // const jsonData = await convertCsvToJson('./filtered_csv_cb.csv', columnNames, {
  //   skipHeader: true,
  //   outputFile: './output.json'
  // });
  // await processSkuFile('./sku_list.txt', './sku-results.json');
  
  console.log('🚀 Server running on http://localhost:' + (process.env.PORT ?? 3000));
  console.log('📚 Swagger documentation available at http://localhost:' + (process.env.PORT ?? 3001) + '/api');
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
