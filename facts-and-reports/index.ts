import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "path";
import inquirer from "inquirer";
import chalk from "chalk";
import { OpenAiService } from "./openai-service";

const REPORTS_DIR = "./facts-and-reports/reports";
const FACTS_DIR = "./facts-and-reports/facts";
const MERGED_FACTS_FILE = "./facts-and-reports/merged-facts.txt";
const METADATA_FILE = "./facts-and-reports/all-reports-metadata.json";

interface ReportMetadata {
  fileName: string;
  location: string;
  keywords: string[];
  connectedFacts: string[];
}

interface ApiResponse {
  [key: string]: string; // filename -> comma-separated keywords
}

async function sendResults(metadata: ReportMetadata[]) {
  if (!process.env.HQ_URL || !process.env.PERSONAL_API_KEY) {
    throw new Error(
      "Missing HQ_URL or PERSONAL_API_KEY in environment variables"
    );
  }

  // Transform metadata to required format
  const answer: ApiResponse = metadata.reduce((acc, report) => {
    acc[report.fileName] = report.keywords.join(",");
    return acc;
  }, {} as ApiResponse);

  try {
    const response = await fetch(`${process.env.HQ_URL}/reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        task: "dokumenty",
        apikey: process.env.PERSONAL_API_KEY,
        answer,
      }),
    });

    const result = await response.json();
    console.log(chalk.gray("API response:", JSON.stringify(result, null, 2)));
  } catch (error) {
    console.error(chalk.red("Failed to send results:", error));
    throw error;
  }
}

async function mergeFacts(): Promise<string> {
  const factFiles = await readdir(FACTS_DIR);
  let mergedContent = "";

  for (const file of factFiles) {
    if (!file.endsWith(".txt")) continue;
    const content = await readFile(join(FACTS_DIR, file), "utf-8");
    mergedContent += `[FACT: ${file}]\n${content}\n\n`;
  }

  await writeFile(MERGED_FACTS_FILE, mergedContent, "utf-8");
  return mergedContent;
}

async function analyzeReports(factsContent: string) {
  const openAiService = new OpenAiService();
  const reports = await readdir(REPORTS_DIR);
  const metadata: ReportMetadata[] = [];

  for (const report of reports) {
    if (!report.endsWith(".txt")) continue;

    console.log(chalk.blue(`Analyzing report: ${report}`));

    const content = await readFile(join(REPORTS_DIR, report), "utf-8");
    const locationMatch = report.match(/sektor_[A-Z]\d/);
    const location = locationMatch?.[0] ?? "";

    try {
      const analysis = await openAiService.analyzeReport(
        content,
        factsContent,
        report
      );

      metadata.push({
        fileName: report,
        location,
        keywords: analysis.keywords,
        connectedFacts: analysis.connectedFacts,
      });

      console.log(chalk.green(`✓ Analysis completed for ${report}`));
      console.log(chalk.gray("Keywords:", analysis.keywords.join(", ")));
      console.log(
        chalk.gray("Connected facts:", analysis.connectedFacts.join(", "))
      );
    } catch (error) {
      console.error(chalk.red(`Error analyzing ${report}:`, error));
    }
  }

  await writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2), "utf-8");
  return metadata;
}

async function mainMenu() {
  const choices = [
    "Merge facts into single file",
    "Analyze reports using AI",
    "Send results to API",
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
    case "Merge facts into single file":
      console.log(chalk.blue("\nMerging facts..."));
      const mergedContent = await mergeFacts();
      console.log(chalk.green(`✓ Facts merged into ${MERGED_FACTS_FILE}`));
      console.log(chalk.gray(`Total characters: ${mergedContent.length}`));
      break;

    case "Analyze reports using AI":
      console.log(chalk.blue("\nReading merged facts..."));
      const factsContent = await readFile(MERGED_FACTS_FILE, "utf-8");
      console.log(chalk.blue("Starting analysis of reports..."));
      const metadata = await analyzeReports(factsContent);
      console.log(
        chalk.green(`✓ Analysis completed. Results saved to ${METADATA_FILE}`)
      );
      console.log(chalk.gray(`Processed ${metadata.length} reports`));
      break;

    case "Send results to API":
      try {
        console.log(chalk.blue("\nReading analysis results..."));
        const metadataContent = await readFile(METADATA_FILE, "utf-8");
        const metadata = JSON.parse(metadataContent) as ReportMetadata[];
        console.log(chalk.blue("Sending results to API..."));
        await sendResults(metadata);
      } catch (error) {
        if (error instanceof Error && error.message.includes("ENOENT")) {
          console.error(
            chalk.red(
              "No analysis results found. Please run the analysis first."
            )
          );
        } else {
          console.error(chalk.red("Failed to send results:", error));
        }
      }
      break;

    case "Exit":
      console.log(chalk.yellow("Goodbye!"));
      process.exit(0);
  }

  // Return to main menu
  await mainMenu();
}

console.log(chalk.blue("Welcome to Facts & Reports Manager"));
mainMenu().catch(console.error);
