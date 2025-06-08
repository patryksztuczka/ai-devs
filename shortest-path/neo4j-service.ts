import neo4j, {
  type Result,
  type Session,
  type Driver,
  type Integer,
} from "neo4j-driver";

export class Neo4jService {
  private driver: Driver;

  constructor(uri: string, username: string, password: string) {
    this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  }

  async runQuery(
    cypher: string,
    params: Record<string, any> = {}
  ): Promise<Result> {
    const session: Session = this.driver.session();
    try {
      return await session.run(cypher, params);
    } finally {
      await session.close();
    }
  }

  async addNode(
    label: string,
    properties: Record<string, any>
  ): Promise<{ id: number; properties: Record<string, any> }> {
    const cypher = `
      CREATE (n:${label} $properties)
      RETURN id(n) AS id, n
    `;
    const result = await this.runQuery(cypher, { properties });
    return {
      id: (result.records[0].get("id") as Integer).toNumber(),
      properties: result.records[0].get("n").properties,
    };
  }

  async connectNodes(
    fromNodeId: number,
    toNodeId: number,
    relationshipType: string,
    properties: Record<string, any> = {}
  ): Promise<void> {
    const cypher = `
      MATCH (a:User), (b:User)
      WHERE toInteger(a.userId) = $fromNodeId
      AND toInteger(b.userId) = $toNodeId
      CREATE (a)-[r:${relationshipType} $properties]->(b)
      RETURN r
    `;
    await this.runQuery(cypher, {
      fromNodeId: neo4j.int(fromNodeId),
      toNodeId: neo4j.int(toNodeId),
      properties,
    });
  }

  async findShortestPath(fromName: string, toName: string): Promise<Result> {
    const cypher = `
    MATCH (r:User { username: $fromName }), (b:User { username: $toName })
    MATCH p = shortestPath( (r)-[*]-(b) )
    RETURN p
    LIMIT 1
  `;
    return await this.runQuery(cypher, { fromName, toName });
  }
}
