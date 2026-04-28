import { Module } from '@nestjs/common';
import { LabAnalyzerService } from './lab-analyzer.service';
import { LabAnalyzerController } from './lab-analyzer.controller';

@Module({
  controllers: [LabAnalyzerController],
  providers: [LabAnalyzerService],
})
export class LabAnalyzerModule {}
