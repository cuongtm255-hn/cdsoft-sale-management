import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { ChatbotToolsService } from './chatbot-tools.service';
import { ChatbotQuotaService } from './chatbot-quota.service';
import { OpenAiService } from './openai.service';
import { OpenSearchService } from './opensearch.service';
import { ChatbotQueryContextService } from './chatbot-query-context.service';
import { ChatbotMasterDataReadService } from './chatbot-master-data-read.service';
import { ChatbotOrdersReadService } from './chatbot-orders-read.service';
import { ChatbotInventoryReadService } from './chatbot-inventory-read.service';
import { ChatbotFinanceReadService } from './chatbot-finance-read.service';
import { ChatbotReportsReadService } from './chatbot-reports-read.service';
import { ChatbotLoyaltyReadService } from './chatbot-loyalty-read.service';
import { ChatbotAccessService } from './chatbot-access.service';
import { RolesService } from '../roles/roles.service';

@Module({
  controllers: [ChatbotController],
  providers: [
    ChatbotService,
    ChatbotToolsService,
    ChatbotQuotaService,
    OpenAiService,
    OpenSearchService,
    ChatbotQueryContextService,
    ChatbotMasterDataReadService,
    ChatbotOrdersReadService,
    ChatbotInventoryReadService,
    ChatbotFinanceReadService,
    ChatbotReportsReadService,
    ChatbotLoyaltyReadService,
    ChatbotAccessService,
    RolesService,
  ],
  exports: [OpenAiService, OpenSearchService, ChatbotToolsService],
})
export class ChatbotModule {}
