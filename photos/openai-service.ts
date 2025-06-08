import OpenAI from "openai";
import { listPhotosPrompt } from "./prompts/list-photos";
import { extractJsonFromText } from "./utils";
import { analyzePhotoPrompt } from "./prompts/analyze-photo";
import { createBarbaraDescriptionPrompt } from "./prompts/create-barbara-description";

export class OpenAiService {
  private readonly openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  public async answer(
    input: OpenAI.Responses.ResponseInput,
    model: string = "gpt-4.1-mini",
    stream: boolean = false
  ) {
    const response = await this.openai.responses.create({
      input,
      model,
      stream,
    });

    return response as OpenAI.Responses.Response;
  }

  public async analyzePhoto(encodedImage: string) {
    const analyzeResult = await this.answer(
      [
        {
          role: "system",
          content: analyzePhotoPrompt(),
        },
        {
          role: "user",
          content: [
            {
              detail: "low",
              type: "input_image",
              image_url: `data:image/png;base64,${encodedImage}`,
            },
          ],
        },
      ],
      "gpt-4o"
    );
    const result = JSON.parse(
      extractJsonFromText(analyzeResult.output_text) || ""
    );
    return result.action;
  }

  public async listPhotosUrls(message: string) {
    const photosResult = await this.answer(
      [
        {
          role: "system",
          content: listPhotosPrompt(),
        },
        {
          role: "user",
          content: message,
        },
      ],
      "gpt-4.1-nano"
    );
    console.log(photosResult.output_text);

    const urls = JSON.parse(
      extractJsonFromText(photosResult.output_text) || ""
    ).urls;
    return urls;
  }

  public async createBarbaraDescription(encodedPhotos: string[]) {
    const descriptionResult = await this.answer(
      [
        {
          role: "system",
          content: createBarbaraDescriptionPrompt(),
        },
        {
          role: "user",
          content: encodedPhotos.map((photo) => ({
            detail: "low",
            type: "input_image",
            image_url: `data:image/jpeg;base64,${photo}`,
          })),
        },
      ],
      "gpt-4o"
    );
    return descriptionResult.output_text;
  }
}
