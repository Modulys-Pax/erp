import { Module, forwardRef } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { FileProcessingService } from '../../shared/services/file-processing.service';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      dest: './uploads/chat',
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret') || 'change-me-in-production',
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
  ],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService, FileProcessingService],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
