import { ApiProperty } from '@nestjs/swagger';

export class GenerateRecommendationsDto {
  @ApiProperty({
    required: true
  })
  labValue: string;

  @ApiProperty({
   
    required: true
  })
  sku: string;

  @ApiProperty({
    required: true
  })
  childName: string;
}