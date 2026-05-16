import { registerAs } from '@nestjs/config';

export default registerAs('chatbot', () => ({
  enabled: (process.env.CHATBOT_ENABLED ?? 'true').toLowerCase() === 'true',

  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  openaiBaseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
  chatModel: process.env.CHATBOT_MODEL ?? 'gpt-5-nano',
  fastModel: process.env.CHATBOT_FAST_MODEL ?? 'gpt-5-nano',
  uncertainModel: process.env.CHATBOT_UNCERTAIN_MODEL ?? 'gpt-5.4-nano',
  complexModel: process.env.CHATBOT_COMPLEX_MODEL ?? 'gpt-5.4-mini',
  embeddingModel: process.env.CHATBOT_EMBEDDING_MODEL ?? 'text-embedding-3-small',
  embeddingDimension: parseInt(process.env.CHATBOT_EMBEDDING_DIMENSION ?? '1536', 10),
  maxToolIterations: parseInt(process.env.CHATBOT_MAX_TOOL_ITERATIONS ?? '5', 10),
  temperature: parseFloat(process.env.CHATBOT_TEMPERATURE ?? '0.2'),

  opensearchUrl: process.env.OPENSEARCH_URL ?? '',
  opensearchUsername: process.env.OPENSEARCH_USERNAME ?? '',
  opensearchPassword: process.env.OPENSEARCH_PASSWORD ?? '',
  opensearchIndex: process.env.OPENSEARCH_INDEX ?? 'cdsoft_knowledge_base',
  opensearchTopK: parseInt(process.env.OPENSEARCH_TOP_K ?? '5', 10),

  dailyGlobalLimit: parseInt(process.env.CHATBOT_DAILY_GLOBAL_LIMIT ?? '20000', 10),
  dailyPerUserLimit: parseInt(process.env.CHATBOT_DAILY_PER_USER_LIMIT ?? '200', 10),
}));
