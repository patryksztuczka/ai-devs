import OpenAI from "openai";

export class OpenAiService {
  private readonly openai: OpenAI;
  private readonly modelName =
    "ft:gpt-4o-mini-2024-07-18:personal:aidev-reaserch:BzsRYvzU";

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  public async verify(data: string) {
    const completion = await this.openai.chat.completions.create({
      model: this.modelName,
      messages: [
        { role: "system", content: "validate data" },
        { role: "user", content: data },
      ],
    });
    return completion.choices[0].message.content;
  }
}
