import { HttpException, HttpStatus } from '@nestjs/common';

export type QuotaScope = 'user' | 'global';

export class ChatbotQuotaExceededException extends HttpException {
  constructor(
    public readonly scope: QuotaScope,
    public readonly limit: number,
    public readonly used: number,
  ) {
    const isGlobal = scope === 'global';
    super(
      {
        success: false,
        errorCode: isGlobal ? 'GLOBAL_QUOTA_EXCEEDED' : 'USER_QUOTA_EXCEEDED',
        message: isGlobal
          ? 'Trợ lý ảo đang tạm ngưng phục vụ do bảo trì hệ thống. Chúng tôi sẽ khôi phục trong thời gian sớm nhất. Xin cảm ơn quý khách đã thông cảm!'
          : 'Trợ lý đang gặp một chút sự cố tạm thời. Vui lòng quay lại sau ít phút nhé!',
        scope,
        limit,
        used,
      },
      isGlobal ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
