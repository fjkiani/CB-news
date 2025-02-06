import React, { useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

interface NetworkGraphProps {
  relationships: {
    source: string;
    target: string;
    strength: number;
    type: 'positive' | 'negative' | 'neutral';
  }[];
}

export const NetworkGraph: React.FC<NetworkGraphProps> = ({ relationships }) => {
  const graphData = {
    nodes: Array.from(
      new Set(relationships.flatMap(r => [r.source, r.target]))
    ).map(id => ({ id })),
    links: relationships.map(r => ({
      source: r.source,
      target: r.target,
      value: r.strength,
      color: r.type === 'positive' ? '#10B981' : 
             r.type === 'negative' ? '#EF4444' : '#6B7280',
    })),
  };

  return (
    <div className="h-full w-full">
      <ForceGraph2D
        graphData={graphData}
        nodeRelSize={6}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={d => d.value * 0.001}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.id;
          const fontSize = 12/globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#4B5563';
          ctx.fillText(label, node.x!, node.y!);
        }}
      />
    </div>
  );
};