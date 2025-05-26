import fs from "node:fs";
import path from "node:path";

import { OpenAiService } from "./openai-service";
import { categorizePrompt, ocrPrompt } from "./prompts";

const INPUT_DIR = "./reports/data";

const OUTPUT_DIR = "./reports/converted-data";

const peopleReports: string[] = [];

const hardwareReports: string[] = [];

const openAiService = new OpenAiService();

function isFileAlreadyConverted(fileName: string) {
  const extension = path.extname(fileName);
  const convertedFileName = `${fileName.replace(extension, "")}.txt`;
  return fs.existsSync(path.join(OUTPUT_DIR, convertedFileName));
}

async function convertToText(fileName: string) {
  const isConverted = isFileAlreadyConverted(fileName);
  if (path.extname(fileName) === ".txt") {
    if (isConverted) {
      return;
    }

    const text = fs.readFileSync(path.join(INPUT_DIR, fileName), "utf8");
    fs.writeFileSync(path.join(OUTPUT_DIR, fileName), text);
    return;
  }

  if (isConverted) {
    return;
  }

  if (path.extname(fileName) === ".mp3") {
    const proc = Bun.spawn([
      "whisper",
      "--model",
      "base",
      "--output_format",
      "txt",
      "--output_dir",
      OUTPUT_DIR,
      "--language",
      "en",
      path.join(INPUT_DIR, fileName),
    ]);

    await proc.exited;
    return;
  }

  if (path.extname(fileName) === ".png") {
    const base64Image = fs.readFileSync(
      path.join(INPUT_DIR, fileName),
      "base64"
    );

    // write the base64 image to a file
    fs.writeFileSync(path.join(OUTPUT_DIR, "image.txt"), base64Image);

    const response = await openAiService.response(
      [
        {
          role: "system",
          content: ocrPrompt(),
        },
        {
          role: "user",
          content: [
            {
              detail: "low",
              type: "input_image",
              image_url: `data:image/png;base64,${base64Image}`,
            },
          ],
        },
      ],
      "gpt-4o"
    );

    const text = response.output_text;

    if (!text) {
      console.log("No text found in", fileName);
      return;
    }
    const extension = path.extname(fileName);
    const convertedFileName = `${fileName.replace(extension, "")}.txt`;
    fs.writeFileSync(path.join(OUTPUT_DIR, convertedFileName), text);
  }
}

async function categorizeReport(fileName: string) {
  const text = fs.readFileSync(path.join(OUTPUT_DIR, fileName), "utf8");
  const response = await openAiService.response(
    [
      {
        role: "system",
        content: categorizePrompt(),
      },
      {
        role: "user",
        content: text,
      },
    ],
    "gpt-4o"
  );

  const data = JSON.parse(response.output_text) as {
    _thinking: string;
    category: "people" | "hardware" | "other";
  };

  const originalFileName = fileName.replace(".txt", "");

  const originalFileNameWithExt = fs
    .readdirSync(INPUT_DIR)
    .find(
      (file) =>
        file.replace(path.extname(file), "") ===
        originalFileName.replace(".txt", "")
    );

  console.log(fileName, originalFileNameWithExt, data);

  if (data.category === "people") {
    peopleReports.push(originalFileNameWithExt || originalFileName);
  } else if (data.category === "hardware") {
    hardwareReports.push(originalFileNameWithExt || originalFileName);
  }
}

const reports = fs.readdirSync(INPUT_DIR);

await Promise.all(reports.map(convertToText));

const convertedReports = fs.readdirSync(OUTPUT_DIR);

await Promise.all(convertedReports.map(categorizeReport));

peopleReports.sort();
hardwareReports.sort();

console.log("People reports", peopleReports);

console.log("Hardware reports", hardwareReports);

const sendReportsResponse = await fetch(`${process.env.HQ_URL}/reports`, {
  method: "POST",
  body: JSON.stringify({
    task: "kategorie",
    apikey: process.env.PERSONAL_API_KEY,
    answer: {
      people: peopleReports,
      hardware: hardwareReports,
    },
  }),
});

const data = await sendReportsResponse.json();

console.log(data);

console.log("Done");
