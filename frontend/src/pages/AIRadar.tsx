import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Card } from '../components/ui/Widgets';
import { motion, AnimatePresence } from 'framer-motion';
import { RadarNetworkGraph } from '../components/radar/RadarNetworkGraph';
import { CompetitorHeatmap } from '../components/radar/CompetitorHeatmap';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Activity, Zap, Target, Layers, Network, 
  Search, TrendingUp, AlertCircle, CheckCircle2 
} from 'lucide-react';
import api from '../services/api';

// --- Custom Hook for Live WebSocket ---
function useLiveRadarStream() {
  const [events, setEvents] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws/ai-intelligence';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.type === 'REAL_TIME_EVENT' || data.type === 'SYSTEM_STATUS') {
          setEvents(prev => [data, ...prev].slice(0, 50));
        }
      } catch(e) {}
    };

    return () => ws.close();
  }, []);

  return { events, connected };
}

// --- Cinematic Canvas Radar ---
const CinematicRadarCanvas: React.FC<{ nodes: any[]; activeNodeId: string | null; onNodeHit?: (id: string) => void }> = ({ nodes, activeNodeId, onNodeHit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let angle = 0;
    
    // Background Particles
    const particles = Array.from({ length: 40 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
      alpha: Math.random() * 0.5 + 0.1
    }));

    // Hit effects (ripples)
    const ripples: any[] = [];

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) / 2 - 20;

      // Clear with slight trailing effect for motion blur
      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)'; // Slate 900 with alpha
      ctx.fillRect(0, 0, width, height);

      // Draw Grid
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for(let i = 0; i < width; i += gridSize) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
      }
      for(let i = 0; i < height; i += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
      }

      // Draw Radar Rings
      [0.2, 0.4, 0.6, 0.8, 1.0].forEach(r => {
        ctx.beginPath();
        ctx.arc(cx, cy, radius * r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
        ctx.stroke();
      });

      // Update & Draw Particles
      particles.forEach(p => {
        p.x += p.speedX; p.y += p.speedY;
        if (p.x < 0) p.x = width; if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height; if (p.y > height) p.y = 0;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99, 102, 241, ${p.alpha})`;
        ctx.fill();
      });

      // Draw Nodes
      nodes.forEach(node => {
        // Map group to dist/angle for visual spread
        const dist = (node.val / 20) * radius * 0.8; 
        // Hash string to pseudo-random angle
        let hash = 0;
        for (let i = 0; i < node.id.length; i++) hash = node.id.charCodeAt(i) + ((hash << 5) - hash);
        const nodeAngle = (Math.abs(hash) % 360) * (Math.PI / 180);
        
        const nx = cx + Math.cos(nodeAngle) * dist;
        const ny = cy + Math.sin(nodeAngle) * dist;

        // Check if radar sweep hits node
        const sweepDiff = (angle - nodeAngle + Math.PI * 4) % (Math.PI * 2);
        const isHit = sweepDiff < 0.1;

        if (isHit && Math.random() > 0.8) {
          ripples.push({ x: nx, y: ny, life: 1.0, color: node.group === 2 ? '#10b981' : node.group === 4 ? '#f59e0b' : '#6366f1' });
          if (onNodeHit) onNodeHit(node.id);
        }

        ctx.beginPath();
        ctx.arc(nx, ny, 4, 0, Math.PI * 2);
        ctx.fillStyle = node.id === activeNodeId ? '#fff' : (node.group === 2 ? '#10b981' : node.group === 4 ? '#f59e0b' : '#6366f1');
        
        // Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw Ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.life -= 0.02;
        if (r.life <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(r.x, r.y, 20 * (1 - r.life), 0, Math.PI * 2);
        ctx.strokeStyle = r.color;
        ctx.globalAlpha = r.life;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      // Draw Sweep
      const gradient = ctx.createConicGradient(angle, cx, cy);
      gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
      gradient.addColorStop(0.1, 'rgba(99, 102, 241, 0.1)');
      gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
      
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, angle - Math.PI/4, angle);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Sweep Line
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      angle += 0.02;
      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [nodes, activeNodeId]);

  return <canvas ref={canvasRef} width={800} height={800} className="w-full h-full rounded-full mix-blend-screen" />;
};


// --- Main Component ---
export const AIRadar: React.FC = () => {
  const { events, connected } = useLiveRadarStream();
  
  const [networkData, setNetworkData] = useState<{nodes: any[], links: any[]}>({ nodes: [], links: [] });
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [mentions, setMentions] = useState<any[]>([]);
  const [activeNode, setActiveNode] = useState<string | null>(null);

  useEffect(() => {
    // Fetch initial data
    const load = async () => {
      try {
        const [netRes, compRes, mentRes] = await Promise.all([
          api.get('/api/radar/keywords/clusters'),
          api.get('/api/radar/competitors'),
          api.get('/api/radar/mentions/live')
        ]);
        if (netRes.data.success) setNetworkData({ nodes: netRes.data.nodes, links: netRes.data.links });
        if (compRes.data.success) {
          // Transform for heatmap
          const heatData = compRes.data.competitors.map((c: any) => ({
            domain: c.domain,
            chatgpt: Math.floor(c.mentions * 0.4),
            gemini: Math.floor(c.mentions * 0.3),
            claude: Math.floor(c.mentions * 0.2),
            perplexity: Math.floor(c.mentions * 0.1),
          }));
          setCompetitors(heatData);
        }
        if (mentRes.data.success) setMentions(mentRes.data.mentions);
      } catch(e) {
        console.error("Failed to load radar data", e);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden">
      <Navbar title="AI Intelligence Center" />
      
      {/* Background Animated Grid */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDEwaDQwTTAgMjBoNDBNMCAzMGg0ME0xMCAwdjQwTTIwIDB2NDBNMzAgMHY0MCIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3N2Zz4=')] opacity-50"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/80 to-slate-950"></div>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 p-6 pt-24 max-w-[1600px] mx-auto h-[calc(100vh)] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <Activity className="w-8 h-8 text-indigo-400" />
              AI Intelligence Center
            </h1>
            <p className="text-slate-400 mt-1 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${connected ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${connected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              </span>
              Real-time Global Sync Active
            </p>
          </div>
          <div className="flex gap-4">
            <div className="px-4 py-2 bg-slate-900/80 backdrop-blur border border-slate-700/50 rounded-lg flex items-center gap-3">
              <div className="text-slate-400 text-sm">System Health</div>
              <div className="text-emerald-400 font-mono font-medium">99.9%</div>
            </div>
            <div className="px-4 py-2 bg-indigo-900/20 backdrop-blur border border-indigo-500/30 rounded-lg flex items-center gap-3">
              <div className="text-indigo-400 text-sm">Active Nodes</div>
              <div className="text-white font-mono font-medium">{networkData.nodes.length}</div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="flex-1 grid grid-cols-12 gap-6 pb-6 overflow-hidden">
          
          {/* Left Column: Mentions & Heatmap */}
          <div className="col-span-3 flex flex-col gap-6 overflow-y-auto thin-scroll pr-2">
            
            <Card className="bg-slate-900/60 backdrop-blur-xl border-slate-700/50 flex-1">
              <h3 className="text-sm font-medium text-slate-300 mb-4 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Live Event Stream
              </h3>
              <div className="space-y-3">
                <AnimatePresence>
                  {events.map((evt, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-sm p-3 rounded bg-slate-800/50 border border-slate-700/50"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-mono text-indigo-400">{evt.event?.type || evt.type}</span>
                        <span className="text-xs text-slate-500">Just now</span>
                      </div>
                      <p className="text-slate-300 line-clamp-2">{evt.event?.message || evt.message}</p>
                    </motion.div>
                  ))}
                  {events.length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-sm">Waiting for real-time events...</div>
                  )}
                </AnimatePresence>
              </div>
            </Card>

            <Card className="bg-slate-900/60 backdrop-blur-xl border-slate-700/50">
               <h3 className="text-sm font-medium text-slate-300 mb-4 uppercase tracking-wider flex items-center gap-2">
                <Target className="w-4 h-4 text-rose-400" />
                Competitor Radar Matrix
              </h3>
              <CompetitorHeatmap data={competitors} />
            </Card>

          </div>

          {/* Center Column: Cinematic Radar */}
          <div className="col-span-6 relative flex items-center justify-center">
            {/* Overlay UI elements */}
            <div className="absolute top-4 left-4 z-20">
              <div className="text-2xl font-bold text-white tracking-widest">GLOBAL SCAN</div>
              <div className="text-indigo-400 text-xs font-mono">FREQ: 144.20 MHz | SECTOR 7G</div>
            </div>

            {/* The Radar Canvas */}
            <div className="w-[600px] h-[600px] relative">
              <CinematicRadarCanvas 
                nodes={networkData.nodes} 
                activeNodeId={activeNode}
                onNodeHit={(id) => setActiveNode(id)}
              />
            </div>
            
            <div className="absolute bottom-4 right-4 z-20 text-right">
              <div className="text-xs font-mono text-slate-500">TARGET ACQUISITION</div>
              <div className="text-lg font-bold text-emerald-400">{activeNode ? activeNode : 'SCANNING...'}</div>
            </div>
          </div>

          {/* Right Column: Network Graph & Analytics */}
          <div className="col-span-3 flex flex-col gap-6 overflow-y-auto thin-scroll pl-2">
            
            <Card className="bg-slate-900/60 backdrop-blur-xl border-slate-700/50 h-[300px]">
              <h3 className="text-sm font-medium text-slate-300 mb-4 uppercase tracking-wider flex items-center gap-2">
                <Network className="w-4 h-4 text-emerald-400" />
                Entity Knowledge Graph
              </h3>
              <div className="h-[220px] rounded-lg overflow-hidden border border-slate-800">
                 <RadarNetworkGraph data={networkData} width={380} height={220} />
              </div>
            </Card>

            <Card className="bg-slate-900/60 backdrop-blur-xl border-slate-700/50 flex-1">
              <h3 className="text-sm font-medium text-slate-300 mb-4 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                Recent AI Mentions
              </h3>
              <div className="space-y-4">
                {mentions.map((m, i) => (
                  <div key={i} className="flex gap-3 pb-4 border-b border-slate-800 last:border-0">
                    <div className="mt-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold uppercase text-white bg-slate-800 px-2 py-0.5 rounded">{m.engine}</span>
                        <span className="text-xs text-slate-400 truncate w-32">{m.query}</span>
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                        "...{m.excerpt}..."
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
};
