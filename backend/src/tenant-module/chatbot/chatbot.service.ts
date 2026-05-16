import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { OpenAiService } from './openai.service';
import { ChatbotToolsService, ToolName } from './chatbot-tools.service';
import { ChatbotQuotaService } from './chatbot-quota.service';
import { ChatMessageDto } from './dto/chat.dto';
import {
  ChatbotAccessService,
  type ChatbotAccessContext,
} from './chatbot-access.service';
import {
  buildActionUnsupportedMessage,
  formatDirectToolResult,
} from './chatbot-direct-response';
import { planChatRoute, type ChatRoutePlan } from './chatbot-routing';

interface FunctionToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export type StreamEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; name: string; arguments: any }
  | { type: 'tool_result'; name: string; result: any }
  | { type: 'usage'; promptTokens: number; completionTokens: number; totalTokens: number }
  | { type: 'done' }
  | { type: 'error'; message: string; errorCode?: string };

const BASE_SYSTEM_PROMPT = `Ban la tro ly cho mot phan mem quan ly ban hang.

Yeu cau chung:
- Tra loi bang tieng Viet ngan gon, ro rang, huong toi nguoi dung thong thuong.
- Khong nhac ten cong ty, ten thuong hieu, ten san pham, ten he thong hay phien ban trong cau tra loi neu nguoi dung khong nhac toi.
- Khong dung cac cau dan nhu "Hien tai bot chi ho tro..." neu khong thuc su can thiet.
- Khong mo dau bang "Tuy vay", "Ngoai ra", "Ban co muon..." neu khong can.
- Neu day la huong dan thao tac, di thang vao cac buoc can lam.
- Neu day la cau hoi du lieu nghiep vu, chi duoc tra loi dua tren ket qua tool.
- Khong bia du lieu.`;

const CHATBOT_TIMEZONE = 'Asia/Bangkok';

function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'long',
  }).formatToParts(date);

  const map = new Map(parts.map((part) => [part.type, part.value]));
  return {
    year: map.get('year') ?? '0000',
    month: map.get('month') ?? '01',
    day: map.get('day') ?? '01',
    hour: map.get('hour') ?? '00',
    minute: map.get('minute') ?? '00',
    second: map.get('second') ?? '00',
    weekday: map.get('weekday') ?? 'Monday',
  };
}

function buildRuntimeDateContext(now = new Date()) {
  const parts = getDatePartsInTimeZone(now, CHATBOT_TIMEZONE);
  const todayIso = `${parts.year}-${parts.month}-${parts.day}`;
  const nowIso = `${todayIso} ${parts.hour}:${parts.minute}:${parts.second}`;

  return [
    'Runtime date context:',
    `- Hom nay theo mui gio ${CHATBOT_TIMEZONE} la ${todayIso}.`,
    `- Bay gio la ${nowIso} (${parts.weekday}).`,
    '- Khi nguoi dung noi cac moc thoi gian tuong doi nhu hom nay, hom qua, ngay mai, tuan nay, tuan truoc, thang nay, thang truoc, quy nay, nam nay: hay suy luan dua tren ngay hien tai o tren.',
    '- Quy uoc tuan: tu Thu hai den Chu nhat neu nguoi dung khong noi khac.',
    '- Khi goi tool co filter ngay, hay chuyen ve fromDate/toDate dang YYYY-MM-DD.',
  ].join('\n');
}

function buildRuntimeAccessContext(
  access: ChatbotAccessContext,
  allowedToolNames: string[],
) {
  const permissionList = access.permissions.length
    ? access.permissions.join(', ')
    : '(none)';
  const toolList = allowedToolNames.length
    ? allowedToolNames.join(', ')
    : '(none)';
  const scopeRule =
    access.role === 'STAFF'
      ? 'Vai tro STAFF chi duoc xem du lieu ban hang, khach hang, thanh toan va loyalty trong pham vi phu trach cua user hien tai.'
      : 'Neu tool cho phep thi duoc xem du lieu trong pham vi tenant hien tai.';

  return [
    'Runtime access context:',
    `- Vai tro hien tai: ${access.role}.`,
    `- Permissions hien tai: ${permissionList}.`,
    `- Tool duoc phep dung trong luot nay: ${toolList}.`,
    `- ${scopeRule}`,
    '- Neu nguoi dung hoi ngoai quyen thi tu choi ro rang va ngan gon.',
  ].join('\n');
}

function buildRouteInstruction(plan: ChatRoutePlan) {
  if (plan.intent === 'RAG_GUIDE') {
    return [
      'Route: RAG_GUIDE.',
      '- Day la cau hoi huong dan thao tac.',
      '- Luon dung ragSearch truoc khi tra loi.',
      '- Cau tra loi phai di thang vao noi dung huong dan, khong can cau mo dau xin loi hay giai thich pham vi ho tro.',
      '- Neu tim thay huong dan, uu tien tra loi bang 3-7 buoc ngan gon.',
      '- Khong hoi lai ve phien ban, ten man hinh, thuong hieu hay anh chup man hinh neu tai lieu da du de tra loi.',
      '- Khong nhac ten cong ty, ten san pham hay thuong hieu trong cau tra loi.',
    ].join('\n');
  }

  if (plan.intent === 'QUERY_DB') {
    return [
      'Route: QUERY_DB.',
      '- Day la cau hoi tra cuu du lieu nghiep vu.',
      '- Luon dung tool duoc cung cap, khong tra loi bang tri nho nen.',
      '- Neu user da neu ro bo loc thi phai truyen dung bo loc vao tool.',
      '- Uu tien cau tra loi ngan, ro, dang bullet hoac bang ngan gon.',
      '- Tranh cach dien dat ky thuat khong can thiet.',
    ].join('\n');
  }

  return [
    'Route: UNCERTAIN.',
    '- Neu cau hoi co ve la du lieu nghiep vu thi dung tool.',
    '- Neu cau hoi co ve la huong dan thao tac thi dung ragSearch neu duoc cap.',
    '- Neu van thieu ngu canh thi hoi lai ngan gon.',
  ].join('\n');
}

function formatFallbackFromToolResult(
  toolName: ToolName,
  result: any,
  userText: string,
) {
  if (!result || result.error) {
    return result?.error || 'Xin loi, toi chua lay duoc du lieu theo yeu cau nay.';
  }

  const items = Array.isArray(result.items) ? result.items : [];
  if (!items.length) {
    if (toolName === 'ragSearch') {
      return `Toi chua tim thay huong dan phu hop cho yeu cau "${userText}".`;
    }
    return `Toi chua tim thay du lieu phu hop voi yeu cau "${userText}".`;
  }

  if (toolName === 'getStock') {
    const rows = items
      .slice(0, 10)
      .map(
        (item: any) =>
          `- ${item.product_name} (${item.sku}) | ${item.warehouse_name} | ton ${item.quantity}`,
      )
      .join('\n');
    return `Toi tim thay cac ton kho sau:\n${rows}`;
  }

  if (toolName === 'ragSearch') {
    const hits = Array.isArray(result.hits) ? result.hits : [];
    return hits.slice(0, 3).map((hit: any) => hit.content).join('\n\n');
  }

  if (items.length === 1) {
    return `Toi da tim thay 1 ket qua phu hop cho yeu cau "${userText}".`;
  }

  return `Toi da tim thay ${items.length} ket qua phu hop cho yeu cau "${userText}".`;
}

function pickModelForPlan(openai: OpenAiService, plan: ChatRoutePlan) {
  if (plan.intent === 'UNCERTAIN') {
    return openai.getUncertainModel();
  }
  if (plan.requiresComplexModel) {
    return openai.getComplexModel();
  }
  return openai.getFastModel();
}

function latestUserText(messages: ChatMessageDto[]) {
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'user');
  return lastUserMessage?.content?.trim() ?? '';
}

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly maxIterations: number;

  constructor(
    private readonly openai: OpenAiService,
    private readonly tools: ChatbotToolsService,
    private readonly quota: ChatbotQuotaService,
    private readonly accessService: ChatbotAccessService,
    config: ConfigService,
  ) {
    this.maxIterations = config.get<number>('chatbot.maxToolIterations') ?? 5;
  }

  async *chat(args: {
    tenantCode: string;
    userId: string;
    userRole: string;
    messages: ChatMessageDto[];
  }): AsyncGenerator<StreamEvent> {
    if (!this.openai.isReady()) {
      yield {
        type: 'error',
        message: 'Chatbot chua duoc cau hinh tren server.',
        errorCode: 'NOT_CONFIGURED',
      };
      yield { type: 'done' };
      return;
    }

    const status = await this.quota.checkAndConsume(args.tenantCode, args.userId);
    this.logger.log(
      `Quota OK [${args.tenantCode}/${args.userId}] user=${status.userUsed} global=${status.globalUsed}`,
    );

    const access = await this.accessService.buildAccessContext(
      args.userId,
      args.userRole,
    );
    const userText = latestUserText(args.messages);
    const plan = planChatRoute(userText);

    if (plan.intent === 'API_ACTION') {
      yield { type: 'text', content: buildActionUnsupportedMessage() };
      yield { type: 'usage', promptTokens: 0, completionTokens: 0, totalTokens: 0 };
      yield { type: 'done' };
      return;
    }

    if (plan.directToolCall) {
      const result = await this.tools.runTool(
        plan.directToolCall.toolName,
        plan.directToolCall.args,
        access,
      );
      yield {
        type: 'text',
        content: formatDirectToolResult(
          plan.directToolCall.toolName,
          result,
          userText,
        ),
      };
      yield { type: 'usage', promptTokens: 0, completionTokens: 0, totalTokens: 0 };
      yield { type: 'done' };
      return;
    }

    const toolSchemas = this.tools.getToolSchemas(access, plan.toolNames);
    if (!toolSchemas.length && plan.intent !== 'RAG_GUIDE') {
      yield {
        type: 'text',
        content: 'Tai khoan hien tai khong duoc phep xem noi dung nay. Neu can, ban vui long lien he quan tri vien hoac nguoi quan ly de duoc cap quyen phu hop.',
      };
      yield { type: 'usage', promptTokens: 0, completionTokens: 0, totalTokens: 0 };
      yield { type: 'done' };
      return;
    }

    const model = pickModelForPlan(this.openai, plan);
    const runtimeDateContext = buildRuntimeDateContext();
    const runtimeAccessContext = buildRuntimeAccessContext(
      access,
      toolSchemas.map((tool) => (tool as any).function.name),
    );
    const conversation: ChatCompletionMessageParam[] = [
      { role: 'system', content: BASE_SYSTEM_PROMPT },
      { role: 'system', content: buildRouteInstruction(plan) },
      { role: 'system', content: runtimeDateContext },
      { role: 'system', content: runtimeAccessContext },
      ...args.messages.map(
        (message) =>
          ({ role: message.role, content: message.content }) as ChatCompletionMessageParam,
      ),
    ];

    let iteration = 0;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let toolCallSeen = false;
    let lastToolName: ToolName | null = null;
    let lastToolResult: any = null;

    try {
      while (iteration < this.maxIterations) {
        iteration += 1;

        const stream = await this.openai.streamChat({
          model,
          messages: conversation,
          tools: toolSchemas,
          toolChoice:
            iteration === 1
            && (plan.intent === 'RAG_GUIDE' || plan.intent === 'QUERY_DB')
              ? 'required'
              : 'auto',
        });

        let assistantContent = '';
        const pendingToolCalls: Map<
          number,
          { id: string; name: string; argChunks: string[] }
        > = new Map();

        for await (const chunk of stream) {
          const choice = chunk.choices?.[0];
          if (!choice) {
            if (chunk.usage) {
              totalPromptTokens += chunk.usage.prompt_tokens ?? 0;
              totalCompletionTokens += chunk.usage.completion_tokens ?? 0;
            }
            continue;
          }

          const delta = choice.delta as any;

          if (delta?.content) {
            assistantContent += delta.content;
            yield { type: 'text', content: delta.content };
          }

          if (delta?.tool_calls) {
            for (const toolCallDelta of delta.tool_calls) {
              const idx = toolCallDelta.index ?? 0;
              let entry = pendingToolCalls.get(idx);
              if (!entry) {
                entry = {
                  id: toolCallDelta.id ?? '',
                  name: toolCallDelta.function?.name ?? '',
                  argChunks: [],
                };
                pendingToolCalls.set(idx, entry);
              }
              if (toolCallDelta.id) entry.id = toolCallDelta.id;
              if (toolCallDelta.function?.name) entry.name = toolCallDelta.function.name;
              if (toolCallDelta.function?.arguments) {
                entry.argChunks.push(toolCallDelta.function.arguments);
              }
            }
          }
        }

        const toolCalls: FunctionToolCall[] = [...pendingToolCalls.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([, entry]) => ({
            id: entry.id,
            type: 'function' as const,
            function: {
              name: entry.name,
              arguments: entry.argChunks.join('') || '{}',
            },
          }));

        const assistantMsg = toolCalls.length
          ? ({
              role: 'assistant',
              content: assistantContent || null,
              tool_calls: toolCalls,
            } as any)
          : ({ role: 'assistant', content: assistantContent } as ChatCompletionMessageParam);
        conversation.push(assistantMsg);

        if (!toolCalls.length) {
          break;
        }

        for (const toolCall of toolCalls) {
          toolCallSeen = true;
          let parsedArgs: any = {};
          try {
            parsedArgs = JSON.parse(toolCall.function.arguments || '{}');
          } catch {
            parsedArgs = {};
          }
          yield {
            type: 'tool_call',
            name: toolCall.function.name,
            arguments: parsedArgs,
          };
          const result = await this.tools.runTool(
            toolCall.function.name as ToolName,
            parsedArgs,
            access,
          );
          lastToolName = toolCall.function.name as ToolName;
          lastToolResult = result;
          yield { type: 'tool_result', name: toolCall.function.name, result };
          conversation.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }
      }
    } catch (e: any) {
      this.logger.error(`OpenAI/tool error: ${e?.message ?? e}`);
      yield { type: 'error', message: this.sanitizeError(e) };
      yield { type: 'done' };
      return;
    }

    const hasAssistantText = conversation.some(
      (message: any) =>
        message.role === 'assistant'
        && typeof message.content === 'string'
        && message.content.trim().length > 0,
    );

    if (toolCallSeen && !hasAssistantText && lastToolName) {
      yield {
        type: 'text',
        content: formatFallbackFromToolResult(lastToolName, lastToolResult, userText),
      };
    }

    yield {
      type: 'usage',
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
      totalTokens: totalPromptTokens + totalCompletionTokens,
    };
    yield { type: 'done' };
  }

  private sanitizeError(e: any): string {
    const status = e?.status ?? e?.response?.status;
    if (status === 429) {
      return 'Tro ly dang ban, vui long thu lai sau it phut.';
    }
    if (status >= 500) {
      return 'Tro ly gap su co tam thoi, vui long thu lai.';
    }
    if (status === 401 || status === 403) {
      return 'Tro ly chua duoc cau hinh dung, vui long lien he quan tri vien.';
    }
    return 'Tro ly gap su co tam thoi, vui long thu lai.';
  }

  getQuotaStatus(tenantCode: string, userId: string) {
    return this.quota.getStatus(tenantCode, userId);
  }
}
