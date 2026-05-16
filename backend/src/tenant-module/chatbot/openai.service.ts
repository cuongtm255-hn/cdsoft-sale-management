import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionChunk,
} from 'openai/resources/chat/completions';

@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);
  private readonly client: OpenAI | null;
  private readonly chatModel: string;
  private readonly fastModel: string;
  private readonly uncertainModel: string;
  private readonly complexModel: string;
  private readonly embeddingModel: string;
  private readonly embeddingDimension: number;
  private readonly temperature: number;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('chatbot.openaiApiKey');
    const baseURL = config.get<string>('chatbot.openaiBaseUrl');
    this.chatModel = config.get<string>('chatbot.chatModel') || 'gpt-4o-mini';
    this.fastModel = config.get<string>('chatbot.fastModel') || 'gpt-5-nano';
    this.uncertainModel = config.get<string>('chatbot.uncertainModel') || 'gpt-5.4-nano';
    this.complexModel = config.get<string>('chatbot.complexModel') || 'gpt-5.4-mini';
    this.embeddingModel = config.get<string>('chatbot.embeddingModel') || 'text-embedding-3-small';
    this.embeddingDimension = config.get<number>('chatbot.embeddingDimension') ?? 1536;
    this.temperature = config.get<number>('chatbot.temperature') ?? 0.2;

    this.client = apiKey ? new OpenAI({ apiKey, baseURL }) : null;
    if (!this.client) {
      this.logger.warn('OPENAI_API_KEY missing — chatbot will run in demo/echo mode.');
    }
  }

  isReady(): boolean {
    return !!this.client;
  }

  getChatModel() {
    return this.chatModel;
  }

  getFastModel() {
    return this.fastModel;
  }

  getUncertainModel() {
    return this.uncertainModel;
  }

  getComplexModel() {
    return this.complexModel;
  }

  private supportsCustomTemperature(model: string) {
    return !/^gpt-5([.-]|$)/i.test(model);
  }

  async createEmbedding(text: string): Promise<number[]> {
    if (!this.client) throw new InternalServerErrorException('OPENAI_NOT_CONFIGURED');
    const trimmed = text.slice(0, 8000); // safety
    const res = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: trimmed,
      dimensions: this.embeddingDimension,
    });
    return res.data[0].embedding;
  }

  /**
   * Call chat completions with tools, streaming. Returns the streaming iterable.
   */
  async streamChat(args: {
    messages: ChatCompletionMessageParam[];
    tools?: ChatCompletionTool[];
    toolChoice?: 'auto' | 'none' | 'required';
    model?: string;
  }): Promise<AsyncIterable<ChatCompletionChunk>> {
    if (!this.client) throw new InternalServerErrorException('OPENAI_NOT_CONFIGURED');
    const model = args.model || this.chatModel;
    return this.client.chat.completions.create({
      model,
      ...(this.supportsCustomTemperature(model)
        ? { temperature: this.temperature }
        : {}),
      messages: args.messages,
      tools: args.tools,
      tool_choice: args.toolChoice ?? (args.tools?.length ? 'auto' : 'none'),
      stream: true,
      stream_options: { include_usage: true },
    });
  }
}
