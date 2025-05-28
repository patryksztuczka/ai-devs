import fs from "node:fs";
import https from "node:https";
import path from "node:path";

const ASSETS_DIR = "./multimodal/assets";

export function replaceImagesWithDescriptions(
  markdown: string,
  descriptions: Array<{ file: string; description: string }>
) {
  const descriptionMap = descriptions.reduce((acc, { file, description }) => {
    acc[file] = description;
    return acc;
  }, {} as { [key: string]: string });

  return markdown.replace(/!\[.*?\]\((.*?)\)/g, (match, imagePath) => {
    const fileName = imagePath.split("/").pop();
    return descriptionMap[fileName] || match;
  });
}

export async function downloadFile(url: string, fileName: string) {
  const assets = fs.readdirSync(ASSETS_DIR);
  if (assets.includes(fileName)) {
    return;
  }
  const file = fs.createWriteStream(`${ASSETS_DIR}/${fileName}`);
  https.get(url, (response) => {
    response.pipe(file);
  });
}

export async function transcribeAudio(fileName: string) {
  const proc = Bun.spawn([
    "whisper",
    "--model",
    "base",
    "--output_format",
    "txt",
    "--output_dir",
    ASSETS_DIR,
    "--language",
    "pl",
    path.join(ASSETS_DIR, fileName),
  ]);

  await proc.exited;
}
