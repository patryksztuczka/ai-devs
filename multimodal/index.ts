import { NodeHtmlMarkdown } from "node-html-markdown";
import { parse } from "node-html-parser";
import fs from "node:fs";
import { OpenAiService } from "./openai-service";
import { downloadFile, replaceImagesWithDescriptions } from "./helpers";

const ASSETS_DIR = "./multimodal/assets";

const paperResponse = await fetch(
  `${process.env.HQ_URL}/dane/arxiv-draft.html`
);

const paperContent = await paperResponse.text();

const root = parse(paperContent);

const paperContentElement = root.querySelector(".container");

const audioUrls: string[] = [];

const imagesWithCaptions: { url: string; caption: string; file: string }[] = [];

const openAiService = new OpenAiService();

paperContentElement?.querySelectorAll("source").forEach((source) => {
  const src = source.getAttribute("src");
  if (src) {
    audioUrls.push(`${process.env.HQ_URL}/dane/${src}`);
  }
});

paperContentElement?.querySelectorAll("figure").forEach((figure) => {
  const imgElement = figure.querySelector("img");
  const figcaptionElement = figure.querySelector("figcaption");
  if (imgElement && figcaptionElement) {
    const src = imgElement.getAttribute("src");
    const caption = figcaptionElement.innerText;
    if (src) {
      imagesWithCaptions.push({
        url: `${process.env.HQ_URL}/dane/${src}`,
        caption,
        file: `${ASSETS_DIR}/${src.split("/").pop()}`,
      });
    }
  }
});

async function describeImage(image: {
  url: string;
  caption: string;
  file: string;
}) {
  const systemPrompt = `
  You are a helpful assistant that describes images.
  You are given an image and a caption.
  You return only the description of the image, no other text.
  The description should be in Polish.
  `;

  const base64Image = fs.readFileSync(image.file, { encoding: "base64" });

  const response = await openAiService.response([
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: `Caption: ${image.caption}`,
        },
        {
          detail: "low",
          type: "input_image",
          image_url: `data:image/png;base64,${base64Image}`,
        },
      ],
    },
  ]);

  return response.output_text;
}

for (const audioUrl of audioUrls) {
  const fileName = audioUrl.split("/").pop();
  if (fileName) {
    await downloadFile(audioUrl, fileName);
  }
}

for (const imageWithCaption of imagesWithCaptions) {
  const fileName = imageWithCaption.url.split("/").pop();
  if (fileName) {
    await downloadFile(imageWithCaption.url, fileName);
  }
}

// const markdownContent = NodeHtmlMarkdown.translate(paperContent);

// const imageDescriptions = await Promise.all(
//   imagesWithCaptions.map(async (image) => ({
//     file: image.file.replace("./multimodal/assets/", ""),
//     description: `<opis_obrazu>${await describeImage(image)}</opis_obrazu>`,
//   }))
// );

// const descriptionsJson = JSON.stringify(imageDescriptions, null, 2);

// fs.writeFileSync(`${ASSETS_DIR}/descriptions.json`, descriptionsJson);

// for (const audioUrl of audioUrls) {
//   const fileName = audioUrl.split("/").pop();
//   if (fileName) {
//     await transcribeAudio(fileName);
//   }
// }

const descriptions = JSON.parse(
  fs.readFileSync(`${ASSETS_DIR}/descriptions.json`, { encoding: "utf-8" })
);

// let newMarkdown = replaceImagesWithDescriptions(markdownContent, descriptions);
// fs.writeFileSync(`${ASSETS_DIR}/markdown.md`, newMarkdown);

const questionsResponse = await fetch(
  `${process.env.HQ_URL}/data/${process.env.PERSONAL_API_KEY}/arxiv.txt`
);

const questions = await questionsResponse.text();

console.log(questions);

const markdownContent = fs.readFileSync(`${ASSETS_DIR}/markdown.md`, {
  encoding: "utf-8",
});

async function answerQuestions(questions: string) {
  const systemPrompt = `
  You are a helpful assistant that answers questions based on the provided context.
  <context>
  ${markdownContent}
  </context>
  The answer should be in Polish written in full sentences.
  Return object with id as key and answer as value: { "id": "answer" }
  `;

  const response = await openAiService.response(
    [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: questions,
          },
        ],
      },
    ],
    "gpt-4o"
  );

  console.log(response.output_text);

  return response.output_text;
}

const answers = JSON.parse(await answerQuestions(questions));

const sendReportsResponse = await fetch(`${process.env.HQ_URL}/reports`, {
  method: "POST",
  body: JSON.stringify({
    task: "arxiv",
    apikey: process.env.PERSONAL_API_KEY,
    answer: answers,
  }),
});

const data = await sendReportsResponse.json();

console.log(data);

console.log("Done");
