import { randomUUID } from "node:crypto";
import { QdrantClient } from "@qdrant/js-client-rest";
import { EmbeddingService } from "./embedding-service";
import path from "node:path";
import fs from "node:fs/promises";
import type { IDocument } from ".";

export class VectorService {
  private client: QdrantClient;
  private embeddingService: EmbeddingService;

  constructor(embeddingService: EmbeddingService) {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    });
    this.embeddingService = embeddingService;
  }

  async ensureCollection(name: string) {
    const collections = await this.client.getCollections();
    if (!collections.collections.some((c) => c.name === name)) {
      await this.client.createCollection(name, {
        vectors: { size: 1024, distance: "Cosine" },
      });
    }
  }

  async addPoints(
    collectionName: string,
    points: Array<{
      id?: string;
      text: string;
      metadata?: Record<string, any>;
    }>
  ) {
    const pointsToUpsert = await Promise.all(
      points.map(async (point) => {
        const embedding = await this.embeddingService.createJinaEmbedding(
          point.text
        );

        return {
          id: point.id || randomUUID(),
          vector: embedding,
          payload: {
            text: point.text,
            ...point.metadata,
          },
        };
      })
    );

    const pointsFilePath = path.join(__dirname, "points.json");
    await fs.writeFile(pointsFilePath, JSON.stringify(pointsToUpsert, null, 2));

    await this.client.upsert(collectionName, {
      wait: true,
      points: pointsToUpsert,
    });
  }

  async initializeCollectionWithData(name: string, points: Array<IDocument>) {
    const collections = await this.client.getCollections();
    if (!collections.collections.some((c) => c.name === name)) {
      await this.ensureCollection(name);
      await this.addPoints(name, points);
    }
  }

  async performSearch(collectionName: string, question: string) {
    const embedding = await this.embeddingService.createJinaEmbedding(question);
    const results = await this.client.search(collectionName, {
      vector: embedding,
      limit: 1,
    });

    return results;
  }
}
