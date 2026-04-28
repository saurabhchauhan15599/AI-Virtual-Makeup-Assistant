import { Module } from '@nestjs/common';
import { ImageAgentService } from './image-agent.service';
import { ImageAgentController } from './image-agent.controller';
import { ConfigModule } from '@nestjs/config';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [ConfigModule, UploadModule],
  providers: [ImageAgentService],
  controllers: [ImageAgentController],
  exports: [ImageAgentService]
})
export class ImageAgentModule { }
