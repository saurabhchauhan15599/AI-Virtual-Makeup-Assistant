import { Module } from '@nestjs/common';
import { RecommendationAgentService } from './recommendation-agent.service';
import { RecommendationAgentController } from './recommendation-agent.controller';

@Module({
  controllers: [RecommendationAgentController],
  providers: [RecommendationAgentService],
})
export class RecommendationAgentModule {}
