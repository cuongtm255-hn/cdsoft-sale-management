/**
 * Ingest Markdown documentation into OpenSearch as embedded chunks.
 *
 * Usage (from backend dir):
 *   npx ts-node -r tsconfig-paths/register src/tenant-module/chatbot/scripts/ingest-docs.ts <docs-dir> [--tenant=global]
 *
 * Reads all .md files under <docs-dir>, splits into ~800-char chunks (with 100-char overlap),
 * embeds each chunk via OpenAI, and upserts into the OpenSearch index defined by OPENSEARCH_INDEX.
 *
 * Required env: OPENAI_API_KEY, OPENSEARCH_URL (and optionally OPENSEARCH_USERNAME/PASSWORD).
 */

import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import chatbotConfig from '../../../config/chatbot.config';
import cacheConfig from '../../../config/cache.config';
import { OpenAiService } from '../openai.service';
import { OpenSearchService } from '../opensearch.service';
import { inferRequiredPermissionsForDoc } from '../chatbot-doc-access';

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

function chunkText(text: string): string[] {
  const cleaned = text.replace(/\r\n/g, '\n').trim();
  if (cleaned.length <= CHUNK_SIZE) return [cleaned];

  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + CHUNK_SIZE, cleaned.length);
    let slice = cleaned.slice(start, end);

    // Try to end at paragraph boundary if possible.
    if (end < cleaned.length) {
      const lastNl = slice.lastIndexOf('\n\n');
      if (lastNl > CHUNK_SIZE * 0.5) {
        slice = slice.slice(0, lastNl);
      }
    }

    const normalized = slice.trim();
    if (!normalized) break;
    chunks.push(normalized);

    const nextStart = start + slice.length - CHUNK_OVERLAP;
    // Ensure forward progress near the tail; otherwise we can loop forever
    // when the remaining slice length is <= overlap.
    if (end >= cleaned.length || nextStart <= start) break;
    start = nextStart;
  }

  return chunks;
}

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(full);
  }
  return files;
}

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config({ path: ['.env.local', '.env'] });

  const args = process.argv.slice(2);
  const docsDir = args.find((arg) => !arg.startsWith('--')) ?? path.resolve(process.cwd(), '..', 'docs');
  const tenantArg = args.find((arg) => arg.startsWith('--tenant='));
  const tenantId = tenantArg ? tenantArg.split('=')[1] : 'global';

  if (!fs.existsSync(docsDir)) {
    console.error(`Docs directory not found: ${docsDir}`);
    process.exit(1);
  }

  const config = {
    get: (key: string) => {
      const [ns, k] = key.split('.');
      const loaders: Record<string, () => any> = { chatbot: chatbotConfig, cache: cacheConfig };
      const loader = loaders[ns];
      return loader ? loader()[k] : undefined;
    },
  } as unknown as ConfigService;

  const openai = new OpenAiService(config);
  const search = new OpenSearchService(config);

  if (!openai.isReady()) {
    console.error('OPENAI_API_KEY missing.');
    process.exit(1);
  }
  if (!search.isReady()) {
    console.error('OPENSEARCH_URL missing.');
    process.exit(1);
  }

  console.log(`Scanning ${docsDir} for .md files...`);
  const files = walk(docsDir);
  console.log(`Found ${files.length} markdown files.`);

  await search.ensureIndex();
  console.log('OpenSearch index ready.');

  let totalChunks = 0;
  for (const file of files) {
    const rel = path.relative(docsDir, file).replace(/\\/g, '/');
    const raw = fs.readFileSync(file, 'utf-8');
    const chunks = chunkText(raw);
    console.log(`-> ${rel} -> ${chunks.length} chunk(s)`);

    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i];
      const id = crypto.createHash('sha1').update(`${tenantId}:${rel}:${i}`).digest('hex');
      try {
        const embedding = await openai.createEmbedding(chunk);
        const requiredPermissions = inferRequiredPermissionsForDoc(rel, chunk);
        await search.upsert({
          id,
          content: chunk,
          source: rel,
          tenantId,
          embedding,
          requiredPermissions,
        });
        totalChunks += 1;
      } catch (e: any) {
        console.error(`  Chunk ${i} failed: ${e.message}`);
      }
    }
  }

  await search.refreshIndex();
  console.log('OpenSearch index refreshed.');
  console.log(`Done! Ingested ${totalChunks} chunks for tenant=${tenantId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
