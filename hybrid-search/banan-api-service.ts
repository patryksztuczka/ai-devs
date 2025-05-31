import {
  showCreateTableResponseSchema,
  showTablesResponseSchema,
} from "./schemas";

export type TCreateTable = {
  tableName: string;
  createTable: string;
};

export class BananApiService {
  private readonly apikey = process.env.PERSONAL_API_KEY;

  async queryDatabase(query: string) {
    const response = await fetch(`${process.env.HQ_URL}/apidb`, {
      method: "POST",
      body: JSON.stringify({
        task: "database",
        apikey: this.apikey,
        query,
      }),
    });
    const result = await response.json();
    return result;
  }

  async showTables() {
    const result = await this.queryDatabase("SHOW TABLES");
    const parsedResult = showTablesResponseSchema.parse(result);
    return parsedResult.reply.map((table) => table.Tables_in_banan);
  }

  async showCreateTable(tableName: string): Promise<TCreateTable> {
    const result = await this.queryDatabase(`SHOW CREATE TABLE ${tableName}`);
    const parsedResult = showCreateTableResponseSchema.parse(result);
    return parsedResult.reply.map((table) => ({
      tableName: table.Table,
      createTable: table["Create Table"],
    }))[0];
  }
}
