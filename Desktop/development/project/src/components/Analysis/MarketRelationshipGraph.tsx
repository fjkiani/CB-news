import React, { useMemo } from 'react';
import { ProcessedArticle } from '../../services/news/types';
import ForceGraph2D from 'react-force-graph-2d';

interface MarketRelationshipGraphProps {
  articles: ProcessedArticle[];
}

export const MarketRelationshipGraph: React.FC<MarketRelationshipGraphProps> = ({ articles }) => {
  const graphData = useMemo(() => {
    const nodes = new Set<string>();
    const links: Array<{ source: string; target: string; value: number }> = [];

    articles.forEach(article => {
      // Add all entities as nodes
      article.entities.companies.forEach(company => nodes.add(company));
      article.entities.sectors.forEach(sector => nodes.add(sector));
      article.entities.indicators.forEach(indicator => nodes.add(indicator));

      // Create links between entities mentioned in the same article
      const entities = [
        ...article.entities.companies,
        ...article.entities.sectors,
        ...article.entities.indicators
      ];

      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          links.push({
            source: entities[i],
            target: entities[j],
            value: 1
          });
        }
      }
    });

    return {
      nodes: Array.from(nodes).map(id => ({ id })),
      links
    };
  }, [articles]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-4">Market Relationships</h2>
      <div className="h-[400px]">
        <ForceGraph2D
          graphData={graphData}
          nodeRelSize={6}
          linkDirectionalParticles={2}
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const label = node.id;
            const fontSize = 12/globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#4B5563';
            ctx.fillText(label, node.x, node.y);
          }}
        />
      </div>
    </div>
  );
};