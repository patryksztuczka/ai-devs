import chalk from "chalk";
import inquirer from "inquirer";
import fs from "node:fs/promises";
import path from "path";
import { EmbeddingService } from "./embedding-service";
import { VectorService } from "./vector-service";

const DOCUMENTS_DIR = "./vector-search/documents";
const OUTPUT_FILE = "./vector-search/documents.json";
const QUESTION =
  "W raporcie, z którego dnia znajduje się wzmianka o kradzieży prototypu broni?";

export interface IDocument {
  text: string;
  metadata: {
    date: string;
  };
}

let answer: string | undefined;

async function convertDocumentsToJson() {
  try {
    // Read all files from the directory
    const files = await fs.readdir(DOCUMENTS_DIR);
    const documents: IDocument[] = [];

    // Process each file
    for (const file of files) {
      if (!file.endsWith(".txt")) continue;

      // Extract date from filename and convert format
      const [year, month, day] = file.split(".")[0].split("_");
      const formattedDate = `${year}-${month}-${day}`;

      // Read file content
      const content = await fs.readFile(
        path.join(DOCUMENTS_DIR, file),
        "utf-8"
      );

      // Create document metadata
      const document: IDocument = {
        text: content.trim(),
        metadata: {
          date: formattedDate,
        },
      };

      documents.push(document);
    }

    // Save to JSON file
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(documents, null, 2));
    console.log(
      chalk.green(
        `Successfully converted ${documents.length} documents to JSON`
      )
    );
  } catch (error) {
    console.error(chalk.red("Error converting documents:"), error);
  }
}

async function initializeCollectionWithData() {
  const vectorService = new VectorService(new EmbeddingService());
  const documents = JSON.parse(
    await fs.readFile(OUTPUT_FILE, "utf-8")
  ) as IDocument[];
  await vectorService.initializeCollectionWithData("documents", documents);
}

async function performSearch() {
  const vectorService = new VectorService(new EmbeddingService());
  const results = await vectorService.performSearch("documents", QUESTION);
  console.log(results);
  const firstResult = results[0];
  const answer = firstResult.payload?.date as string;
  return answer;
}

async function sendAnswerToAPI(answer: string) {
  if (!process.env.HQ_URL || !process.env.PERSONAL_API_KEY) {
    throw new Error(
      "Missing HQ_URL or PERSONAL_API_KEY in environment variables"
    );
  }

  try {
    const response = await fetch(`${process.env.HQ_URL}/reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        task: "wektory",
        apikey: process.env.PERSONAL_API_KEY,
        answer,
      }),
    });

    const result = await response.json();
    console.log(chalk.gray("API response:", JSON.stringify(result, null, 2)));
  } catch (error) {
    console.error(chalk.red("Failed to send answer to API:"), error);
  }
}

async function main() {
  const choices = [
    "Convert text documents to json metadata",
    "Initialize collection with data",
    "Perform search",
    "Send answer to API",
    "Exit",
  ];

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices,
    },
  ]);

  switch (action) {
    case "Convert text documents to json metadata":
      console.log(chalk.blue("Converting text documents to json metadata..."));
      await convertDocumentsToJson();
      break;
    case "Initialize collection with data":
      console.log(chalk.blue("Initializing collection with data..."));
      await initializeCollectionWithData();
      break;
    case "Perform search":
      console.log(chalk.blue("Performing search..."));
      answer = await performSearch();
      break;
    case "Send answer to API":
      console.log(chalk.blue("Sending answer to API..."));
      if (answer) {
        await sendAnswerToAPI(answer);
      } else {
        console.log(chalk.red("No answer to send"));
      }
      break;
    case "Exit":
      console.log(chalk.yellow("Goodbye!"));
      process.exit(0);
  }

  await main();
}

main();
