import { Controller } from '@nestjs/common';
import { LabAnalyzerService } from './lab-analyzer.service';

@Controller('lab-analyzer')
export class LabAnalyzerController {
  constructor(private readonly labAnalyzerService: LabAnalyzerService) {}
}
