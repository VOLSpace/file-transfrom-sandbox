import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient, DocumentType } from '@prisma/client';
import { TextractClient, AnalyzeDocumentCommand, Document } from '@aws-sdk/client-textract';
import { injectable } from 'inversify';
import { Readable } from 'stream';

@injectable()
export class FileTransformService {
  private s3: S3Client;
  private textract: TextractClient;

  constructor(private prismaClient: PrismaClient) {
    this.s3 = new S3Client({
      region: process.env.AWS_DEFAULT_REGION || 'default-region', 
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'default-access-key-id', 
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'default-secret-access-key', 
      }
    });
    this.textract = new TextractClient({
      region: process.env.AWS_DEFAULT_REGION || 'default-region', 
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'default-access-key-id', 
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'default-secret-access-key', 
      }
    });
  }

  public async extractTextFromS3File(bucket: string, key: string, fileType: DocumentType): Promise<string> {
    switch (fileType) {
      case 'PDF':
      case 'DOCX':
      case 'DOC':
        return this.extractTextWithTextract(bucket, key);
  
      case 'TEXT': {
        const params = { Bucket: bucket, Key: key };
        const data = await this.s3.send(new GetObjectCommand(params));
        return this.extractTextFromTxt(data.Body as Readable);
      }
      
      default:
        throw new Error(`500.2:S:Unsupported file type: ${fileType}`);
    }
  }

  private async extractTextWithTextract(bucket: string, key: string): Promise<string> {
    const document: Document = {
      S3Object: {
        Bucket: bucket,
        Name: key
      }
    };

    const command = new AnalyzeDocumentCommand({
      Document: document,
      FeatureTypes: ['TABLES', 'FORMS'] // adjust as needed
    });

    try {
      const result = await this.textract.send(command);
      return result.Blocks?.filter(block => block.BlockType === 'LINE').map(block => block.Text).join('\n') || '';
    } catch (error) {
      console.error('Error processing document with Textract:', error);
      throw error;
    }
  }

  private async extractTextFromTxt(stream: Readable): Promise<string> {
    const buffer = await this.streamToBuffer(stream);
    return buffer.toString('utf-8');
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}
