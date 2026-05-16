import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChatbotService, StreamEvent } from './chatbot.service';
import { ChatRequestDto } from './dto/chat.dto';
import { ChatbotQuotaExceededException } from './chatbot-quota.exception';
import { OpenAiService } from './openai.service';

@ApiTags('Tenant / Chatbot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenant/chatbot')
export class ChatbotController {
  constructor(
    private readonly service: ChatbotService,
    private readonly openai: OpenAiService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Lấy trạng thái quota và mute của user hiện tại' })
  async status(@CurrentUser() user: any) {
    const enabled = this.openai.isReady();
    if (!enabled) return { enabled: false };
    const status = await this.service.getQuotaStatus(user.tenantCode, user.id);
    return { enabled: true, ...status };
  }

  @Post('chat')
  @ApiOperation({ summary: 'Gửi message và nhận phản hồi streaming (SSE)' })
  async chat(
    @Body() dto: ChatRequestDto,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
    res.flushHeaders?.();

    const writeEvent = (event: StreamEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    let aborted = false;
    res.on('close', () => {
      aborted = true;
    });

    try {
      const generator = this.service.chat({
        tenantCode: user.tenantCode,
        userId: user.id,
        userRole: user.role,
        messages: dto.messages,
      });
      for await (const event of generator) {
        if (aborted) break;
        writeEvent(event);
      }
    } catch (e: any) {
      if (e instanceof ChatbotQuotaExceededException) {
        const body: any = e.getResponse();
        writeEvent({ type: 'error', message: body.message, errorCode: body.errorCode });
      } else {
        writeEvent({ type: 'error', message: 'Trợ lý ảo gặp sự cố tạm thời, vui lòng thử lại.' });
      }
      writeEvent({ type: 'done' });
    }

    res.end();
  }
}
