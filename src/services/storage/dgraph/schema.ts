export const schema = `
type Article {
  id: ID!
  title: String! @search(by: [term, fulltext])
  content: String! @search(by: [fulltext])
  publishedAt: DateTime @search
  url: String! @id
  source: String @search(by: [hash])
  category: String @search(by: [hash])
  sentiment: Float @search
  tags: [String] @search(by: [hash])
  summary: String
  raw: String
}
`;
