import OpenAI from "openai";
import type { TCreateTable } from "./banan-api-service";

export class OpenAiService {
  private readonly openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  public async getQuery(prompt: string, tablesStructure: TCreateTable[]) {
    const systemPrompt: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
      role: "system",
      content: `
      You are an expert in SQL and you are given a list of tables and their structure.
      <objectives>
      - Help user to write SQL queries based on what he wants to achieve.
      </objectives>
      <context>
        ${tablesStructure
          .map((table) => `${table.tableName}: ${table.createTable}`)
          .join("\n")}
      </context>
      <rules>
        - You should use the tables structure from the context to learn about the tables columns and their types.
        - If you don't know the answer, you should say "I don't know".
        - Return only the string with query, example: "SELECT * FROM datacenters;"
        - DO NOT return \`\`\`sql\`\`\` in the response.
        - Return one line string with query.
      </rules>
    `,
    };

    const userPrompt: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
      role: "user",
      content: prompt,
    };

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [systemPrompt, userPrompt],
    });

    return response.choices[0].message.content;
  }
}
