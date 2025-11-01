import { Injectable, Logger } from "@nestjs/common";
import OpenAI from "openai";
import pLimit from 'p-limit';
import { Snippet as SnippetEntity } from '../entities/snippet.entity';

const logger = new Logger('EmbeddingService');

const MAX_CONCURRENT_REQUESTS = 15;

@Injectable()
export class EmbeddingService {
  async getEmbeddingsFromSnippets(snippets: SnippetEntity[], progressPercentageMap: Map<number, number>, bookId: number) {

    const limit = pLimit(MAX_CONCURRENT_REQUESTS);
    let completeCount = 0;
    await Promise.all(
        snippets.map((snippetEntity) =>
          limit(async () => {
  
            const embedding = await this.getEmbedding(snippetEntity.snippetText);
  
            snippetEntity.embedding = embedding;

            completeCount++ ;
            progressPercentageMap.set(bookId, 95 + Math.round(completeCount / snippets.length * 5));

            logger.log(`Progress percentage: ${progressPercentageMap.get(bookId)}`);
            logger.log(`OpenAI responded for embedding`);

          })));

    return snippets;
  }

  private async getEmbedding(text: string) {

    logger.log(`Calling OpenAI for embedding`);
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    logger.log(`OpenAI responded for embedding`);

    return response.data[0].embedding;
  }
}