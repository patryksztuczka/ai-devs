export class EmbeddingService {
  private readonly JINA_API_KEY = process.env.JINA_API_KEY;

  async createJinaEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch("https://api.jina.ai/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.JINA_API_KEY}`,
        },
        body: JSON.stringify({
          model: "jina-embeddings-v3",
          task: "text-matching",
          dimensions: 1024,
          late_chunking: false,
          embedding_type: "float",
          input: [text],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error("Error creating Jina embedding:", error);
      throw error;
    }
  }
}
