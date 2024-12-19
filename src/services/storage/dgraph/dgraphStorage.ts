// src/services/storage/dgraphStorage.ts
import { DgraphClient, DgraphClientStub } from "dgraph-js";
import { schema } from './schema';

export class DgraphStorage {
  private client: DgraphClient;

  constructor() {
    const clientStub = new DgraphClientStub(
      process.env.DGRAPH_URL || "localhost:9080"
    );
    this.client = new DgraphClient(clientStub);
  }

  async initialize() {
    const op = { schema };
    await this.client.alter({ schema: op.schema });
  }

  async storeArticle(article: any) {
    const mutation = {
      setJson: {
        "dgraph.type": "Article",
        id: article.id,
        title: article.title,
        content: article.content,
        publishedAt: article.publishedAt,
        url: article.url,
        source: article.source,
        category: article.category,
        sentiment: article.sentiment.score,
        tags: article.tags?.map((t: any) => t.label) || [],
        summary: article.summary,
        raw: JSON.stringify(article.raw)
      },
    };

    const txn = this.client.newTxn();
    try {
      await txn.mutate(mutation);
      await txn.commit();
    } finally {
      await txn.discard();
    }
  }

  async getRecentArticles(limit = 100) {
    const query = `
      query recent($limit: int) {
        articles(func: type(Article), orderdesc: publishedAt, first: $limit) {
          id
          title
          content
          publishedAt
          url
          source
          category
          sentiment
          tags
          summary
        }
      }
    `;

    const vars = { $limit: limit };
    const res = await this.client.newTxn().queryWithVars(query, vars);
    return res.getJson().articles;
  }
}