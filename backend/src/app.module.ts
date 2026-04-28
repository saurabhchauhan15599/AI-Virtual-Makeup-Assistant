import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ImageAgentModule } from './image-agent/image-agent.module';
import { ConfigModule } from '@nestjs/config';
import { LabAnalyzerModule } from './lab-analyzer/lab-analyzer.module';
import { RecommendationAgentModule } from './recommendation-agent/recommendation-agent.module';

@Module({
  imports: [
    ImageAgentModule,
    ConfigModule.forRoot(),
    LabAnalyzerModule,
    RecommendationAgentModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
