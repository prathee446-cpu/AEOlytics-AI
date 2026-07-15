import { prisma } from '../db/prisma';

export class VectorService {
  /**
   * Computes cosine similarity between two float vectors in JS/TS.
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dotProduct / denom;
  }

  /**
   * Performs similarity vector search on articles.
   * If pgvector extension is present on PostgreSQL, runs raw SQL distance query.
   * Otherwise, fetches articles and evaluates similarity in-memory as fallback.
   */
  static async searchArticles(queryEmbedding: number[], limit = 5): Promise<any[]> {
    try {
      // Format the float array embedding as a Postgres vector string '[0.1,0.2,...]'
      const vecString = `[${queryEmbedding.join(',')}]`;
      
      // Attempt pgvector distance operator <=> (Cosine distance)
      const results: any[] = await prisma.$queryRawUnsafe(`
        SELECT id, title, content, "aiScore", "visibilityScore", category, tags, "userId", "createdAt", "updatedAt",
               (1 - (embedding::vector <=> '${vecString}'::vector)) as similarity
        FROM "Article"
        WHERE status = 'PUBLISHED' AND array_length(embedding, 1) = ${queryEmbedding.length}
        ORDER BY embedding <=> '${vecString}'::vector
        LIMIT ${limit}
      `);
      
      return results.map(r => ({
        id: r.id,
        title: r.title,
        content: r.content,
        aiScore: Number(r.aiScore),
        visibilityScore: Number(r.visibilityScore),
        category: r.category,
        tags: r.tags,
        userId: r.userId,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        similarity: Number(r.similarity)
      }));
    } catch (err) {
      console.warn('Postgres SQL vector search failed. Executing fallback JS/TS in-memory cosine search.', err);
      
      // Load all published articles with embeddings from Postgres
      const articles = await prisma.article.findMany({
        where: { status: 'PUBLISHED' }
      });
      
      const scored = articles
        .map(art => {
          // If no embedding, set similarity to 0
          if (!art.embedding || art.embedding.length === 0) {
            return { ...art, similarity: 0 };
          }
          const sim = this.cosineSimilarity(art.embedding, queryEmbedding);
          return { ...art, similarity: sim };
        })
        .filter(art => art.similarity > 0)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return scored;
    }
  }
}
