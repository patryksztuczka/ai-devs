import chalk from "chalk";
import inquirer from "inquirer";
import fs from "node:fs/promises";
import path from "path";
import { CentralaApiService } from "./banan-api-service";
import { OpenAiService } from "./openai-service";
import { listPhotosPrompt } from "./prompts/list-photos";
import { analyzePhotoPrompt } from "./prompts/analyze-photo";
import { sendAnswerToAPI } from "../helpers";

async function plan(encodedImage: string) {
  const openaiService = new OpenAiService();
  try {
    const action = await openaiService.analyzePhoto(encodedImage);
    return action;
  } catch (error) {
    console.error(error);
  }
}

async function execute(action: string, fileName: string) {
  const centralaApiService = new CentralaApiService();

  const result = await centralaApiService.modifyPhoto(action, fileName);
  return result;
}

const finalPhotos: string[] = [];

async function fetchPhotos() {
  const centralaApiService = new CentralaApiService();

  const openaiService = new OpenAiService();

  const result = await centralaApiService.startConversation();

  const urls = await openaiService.listPhotosUrls(result.message);

  if (!urls.length) return;

  // const testUrls = [urls[0]];

  console.log(urls);

  for (const url of urls) {
    let isRepaired = false;
    let currentImage = url;
    while (!isRepaired) {
      const response = await fetch(currentImage);
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");

      const fileName = url.split("/").pop();
      // Decide what to do with the image
      const action = await plan(base64);
      console.log(action);
      if (
        action === "NO_ACTION" ||
        action === "UNSUITABLE" ||
        action === null
      ) {
        finalPhotos.push(currentImage);
        isRepaired = true;
        break;
      }
      // Execute the action
      const result = await execute(action, fileName);
      console.log(result);
      // Get the url of processed photo
      const newUrls = await openaiService.listPhotosUrls(result.message);
      if (newUrls.length) {
        currentImage = newUrls[0];
      } else {
        isRepaired = true;
        break;
      }
    }
  }

  await fs.writeFile(
    path.join(__dirname, "photos.json"),
    JSON.stringify(finalPhotos)
  );

  console.log(finalPhotos);
}

async function createBarbaraDescription() {
  const openaiService = new OpenAiService();
  const photos = await fs.readFile(
    path.join(__dirname, "photos.json"),
    "utf-8"
  );
  const photosArray = JSON.parse(photos) as string[];

  const encodedPhotosPromises = photosArray.map(async (photo) => {
    const response = await fetch(photo);
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return base64;
  });

  const encodedPhotos = await Promise.all(encodedPhotosPromises);
  const result = await openaiService.createBarbaraDescription(encodedPhotos);
  console.log(result);
  sendAnswerToAPI("photos", result);
}

async function main() {
  const choices = ["Fetch photos", "Create Barbara's description", "Exit"];

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices,
    },
  ]);

  switch (action) {
    case "Fetch photos":
      console.log(chalk.blue("Fetching photos..."));
      await fetchPhotos();
      break;
    case "Create Barbara's description":
      console.log(chalk.blue("Creating Barbara's description..."));
      await createBarbaraDescription();
      break;
    case "Exit":
      console.log(chalk.yellow("Goodbye!"));
      process.exit(0);
  }

  await main();
}

main();
