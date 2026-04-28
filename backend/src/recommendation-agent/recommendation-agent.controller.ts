import { Controller } from '@nestjs/common';
import { RecommendationAgentService } from './recommendation-agent.service';

@Controller('recommendation-agent')
export class RecommendationAgentController {
  constructor(private readonly recommendationAgentService: RecommendationAgentService) {}
}
