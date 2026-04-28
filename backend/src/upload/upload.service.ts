import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';

@Injectable()
export class UploadService {
  private storage: Storage;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.storage = new Storage({
      projectId: this.configService.get('GCP_PROJECT_ID'),
    });
    this.bucketName = this.configService.get('GCP_BUCKET_NAME');
  }

  async uploadImageToGCP(
    imageBuffer: Buffer,
    fileName: string,
    mimeType: string = 'image/png'
  ): Promise<string> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      const stream = file.createWriteStream({
        metadata: {
          contentType: mimeType,
        },
        public: true
      });

      return new Promise((resolve, reject) => {
        stream.on('error', (error) => {
          console.error('Upload error:', error);
          reject(error);
        });

        stream.on('finish', async () => {
          resolve(file.publicUrl());
        });

        stream.end(imageBuffer);
      });
    } catch (error) {
      console.error('Error uploading to GCP:', error);
      throw new Error(`Failed to upload image to GCP: ${error.message}`);
    }
  }

  async uploadBase64ImageToGCP(
    base64Data: string,
    fileName: string,
    mimeType: string = 'image/png'
  ): Promise<string> {
    const imageBuffer = Buffer.from(base64Data, 'base64');
    return this.uploadImageToGCP(imageBuffer, fileName, mimeType);
  }
}