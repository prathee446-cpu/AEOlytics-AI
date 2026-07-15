import React, { useRef, useEffect, useState } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';

interface Node {
  id: string;
  group: number;
  val: number;
}

interface Link {
  source: string;
  target: string;
  value: number;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

interface Props {
  data: GraphData;
  width?: number;
  height?: number;
}

export const RadarNetworkGraph: React.FC<Props> = ({ data, width = 600, height = 400 }) => {
  const fgRef = useRef<ForceGraphMethods>();
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    // Wait a tick for layout to settle before rendering properly
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const getNodeColor = (node: any) => {
    switch(node.group) {
      case 1: return '#6366f1'; // Primary domain (Indigo)
      case 2: return '#10b981'; // Mentioned Query (Green)
      case 3: return '#ef4444'; // Unmentioned Query (Red)
      case 4: return '#f59e0b'; // Competitor (Amber)
      default: return '#9ca3af';
    }
  };

  if (!isReady || !data.nodes.length) {
    return (
      <div className="flex items-center justify-center text-slate-500" style={{ width, height }}>
        {isReady ? "No cluster data available" : "Loading graph..."}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900/50" style={{ width, height }}>
      <ForceGraph2D
        ref={fgRef}
        width={width}
        height={height}
        graphData={data}
        nodeColor={getNodeColor}
        nodeRelSize={4}
        linkColor={() => 'rgba(99, 102, 241, 0.2)'}
        linkWidth={(link) => link.value}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.id as string;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Inter, sans-serif`;
          const textWidth = ctx.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

          ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
          if (node.x && node.y) {
            ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);
          }
          
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = getNodeColor(node);
          if (node.x && node.y) {
            ctx.fillText(label, node.x, node.y);
          }

          (node as any).__bckgDimensions = bckgDimensions; // to re-use in nodePointerAreaPaint
        }}
        nodePointerAreaPaint={(node, color, ctx) => {
          ctx.fillStyle = color;
          const bckgDimensions = (node as any).__bckgDimensions;
          if (bckgDimensions && node.x && node.y) {
            ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);
          }
        }}
        d3VelocityDecay={0.3}
        warmupTicks={100}
        cooldownTicks={0}
      />
    </div>
  );
};
