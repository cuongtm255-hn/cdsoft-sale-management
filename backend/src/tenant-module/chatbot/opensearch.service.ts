import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as OpenSearchClient } from '@opensearch-project/opensearch';
import { inferRequiredPermissionsForDoc } from './chatbot-doc-access';

export interface KbHit {
  content: string;
  source: string;
  score: number;
  tenantId: string;
  requiredPermissions?: string[];
}

@Injectable()
export class OpenSearchService {
  private readonly logger = new Logger(OpenSearchService.name);
  private readonly client: OpenSearchClient | null;
  private readonly indexName: string;
  private readonly topK: number;
  private readonly dimension: number;

  constructor(private readonly config: ConfigService) {
    const url = config.get<string>('chatbot.opensearchUrl');
    const username = config.get<string>('chatbot.opensearchUsername');
    const password = config.get<string>('chatbot.opensearchPassword');
    this.indexName = config.get<string>('chatbot.opensearchIndex') || 'cdsoft_knowledge_base';
    this.topK = config.get<number>('chatbot.opensearchTopK') ?? 5;
    this.dimension = config.get<number>('chatbot.embeddingDimension') ?? 1536;

    if (url) {
      this.client = new OpenSearchClient({
        node: url,
        auth: username && password ? { username, password } : undefined,
        ssl: { rejectUnauthorized: false },
      });
      this.logger.log(`OpenSearch client initialized → index=${this.indexName}`);
    } else {
      this.client = null;
      this.logger.warn('OPENSEARCH_URL not set — RAG search returns empty context.');
    }
  }

  isReady(): boolean {
    return !!this.client;
  }

  /** Create index with knn_vector mapping if not exists (idempotent). */
  async ensureIndex(): Promise<void> {
    if (!this.client) return;
    const exists = await this.client.indices.exists({ index: this.indexName });
    const mappings: any = {
      properties: {
        content: { type: 'text' },
        source: { type: 'keyword' },
        tenant_id: { type: 'keyword' },
        required_permissions: { type: 'keyword' },
        embedding: {
          type: 'knn_vector',
          dimension: this.dimension,
          method: {
            name: 'hnsw',
            engine: 'lucene',
            space_type: 'cosinesimil',
            parameters: { ef_construction: 128, m: 16 },
          },
        },
      },
    };

    if (!exists.body) {
      await this.client.indices.create({
        index: this.indexName,
        body: {
          settings: { index: { knn: true } },
          mappings,
        },
      });
      this.logger.log(`Created index ${this.indexName}`);
      return;
    }

    await this.client.indices.putMapping({
      index: this.indexName,
      body: mappings,
    });
  }

  async upsert(doc: { id: string; content: string; source: string; tenantId: string; embedding: number[]; requiredPermissions?: string[] }): Promise<void> {
    if (!this.client) return;
    await this.client.index({
      index: this.indexName,
      id: doc.id,
      refresh: false,
      body: {
        content: doc.content,
        source: doc.source,
        tenant_id: doc.tenantId,
        ...(doc.requiredPermissions?.length ? { required_permissions: doc.requiredPermissions } : {}),
        embedding: doc.embedding,
      },
    });
  }

  async refreshIndex(): Promise<void> {
    if (!this.client) return;
    await this.client.indices.refresh({ index: this.indexName });
  }

  /** KNN search restricted to global docs + the caller's tenant. */
  async knnSearch(vector: number[], tenantCode: string, userPermissions: string[] = []): Promise<KbHit[]> {
    if (!this.client) return [];
    try {
      const res = await this.client.search({
        index: this.indexName,
        body: {
          size: this.topK,
          _source: ['content', 'source', 'tenant_id', 'required_permissions'],
          query: {
            bool: {
              must: [
                {
                  knn: {
                    embedding: { vector, k: this.topK },
                  },
                },
              ],
              filter: [
                { terms: { tenant_id: ['global', tenantCode] } },
                {
                  bool: {
                    should: [
                      {
                        bool: {
                          must_not: [
                            { exists: { field: 'required_permissions' } },
                          ],
                        },
                      },
                      ...(userPermissions.length
                        ? [{ terms: { required_permissions: userPermissions } }]
                        : []),
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
        },
      });
      const hits: any[] = (res.body.hits?.hits as any[]) ?? [];
      return hits
        .map((h) => {
          const sourceDoc = h._source ?? {};
          const requiredPermissions =
            sourceDoc.required_permissions
            ?? inferRequiredPermissionsForDoc(sourceDoc.source ?? '', sourceDoc.content ?? '');
          return {
            content: sourceDoc.content,
            source: sourceDoc.source,
            tenantId: sourceDoc.tenant_id,
            requiredPermissions,
            score: h._score ?? 0,
          } as KbHit;
        })
        .filter((hit) => !hit.requiredPermissions?.length || hit.requiredPermissions.some((permission) => userPermissions.includes(permission)));
    } catch (e: any) {
      this.logger.warn(`KNN search failed: ${e.message}`);
      return [];
    }
  }
}
