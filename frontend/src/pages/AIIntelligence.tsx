import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';
import { gsap } from 'gsap';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Radio, Clock, ShieldCheck, Zap, Server, Code2, Search, Database, AlertCircle, Terminal } from 'lucide-react';
import api from '../services/api';

/**
 * Three.js Background Component
 */
const SystemOrb = ({ activeConnections }: { activeConnections: number }) => {
  const meshRef = useRef<any>(null);
  const isHighLoad = activeConnections > 5;

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 64, 64]} scale={isHighLoad ? 2.2 : 1.8}>
      <MeshDistortMaterial
        color={isHighLoad ? "#8b5cf6" : "#4338ca"}
        attach="material"
        distort={0.4}
        speed={isHighLoad ? 3 : 1.5}
        roughness={0.2}
        metalness={0.8}
        emissive={isHighLoad ? "#7c3aed" : "#3730a3"}
        emissiveIntensity={1.2}
      />
    </Sphere>
  );
};

export const AIIntelligence: React.FC = () => {
  const headerRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef<HTMLDivElement>(null);
  const orbContainerRef = useRef<HTMLDivElement>(null);

  // Connection State
  const [wsStatus, setWsStatus] = useState<'Connecting' | 'Connected' | 'Disconnected' | 'Reconnecting...'>('Connecting');
  const wsStatusRef = useRef(wsStatus);
  const setWsStatusWithRef = useCallback((status: 'Connecting' | 'Connected' | 'Disconnected' | 'Reconnecting...') => {
    wsStatusRef.current = status;
    setWsStatus(status);
  }, []);
  const [disconnectReason, setDisconnectReason] = useState<string>('');
  
  // Diagnostics State
  const [wsLatency, setWsLatency] = useState(0);
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);
  const [lastPingTime, setLastPingTime] = useState<Date | null>(null);
  const [lastPongTime, setLastPongTime] = useState<Date | null>(null);
  const [connectedSince, setConnectedSince] = useState<Date | null>(null);
  const [eventsReceivedCount, setEventsReceivedCount] = useState(0);
  const [eventsSentCount, setEventsSentCount] = useState(0);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Data State
  const [summary, setSummary] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [stats, setStats] = useState<{
    eventsProcessed: number;
    radarScans: number;
    articlesManaged: number;
  }>({ eventsProcessed: 0, radarScans: 0, articlesManaged: 0 });

  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  // Identify WS URL
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  let wsHost = window.location.host;
  if (import.meta.env.VITE_API_URL) {
    try {
      const url = new URL(import.meta.env.VITE_API_URL);
      wsHost = url.host;
    } catch(e) {}
  } else if (import.meta.env.MODE === 'development') {
    wsHost = 'localhost:5000';
  }
  const token = localStorage.getItem('contentiq_token') || '';
  const wsUrl = `${protocol}//${wsHost}/ws/ai-intelligence?token=${encodeURIComponent(token)}`;

  const cleanupConnection = useCallback(() => {
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connectWs = useCallback((attempt: number = 0) => {
    cleanupConnection();
    setWsStatusWithRef(attempt > 0 ? 'Reconnecting...' : 'Connecting');
    
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
    } catch (err) {
      setWsStatusWithRef('Disconnected');
      setDisconnectReason('Invalid WebSocket Endpoint');
      scheduleReconnect(attempt + 1);
      return;
    }

    let pingStart = Date.now();

    ws.onopen = () => {
      setWsStatusWithRef('Connected');
      setDisconnectReason('');
      setReconnectAttempts(0);
      setConnectedSince(new Date());
      setWsLatency(Date.now() - pingStart);

      // Start Heartbeat (ping every 10s)
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          pingStart = Date.now();
          ws.send(JSON.stringify({ type: 'PING' }));
          setLastPingTime(new Date());
          setEventsSentCount(prev => prev + 1);
        }
      }, 10000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'PONG') {
          setLastPongTime(new Date());
          setWsLatency(Date.now() - pingStart);
          setEventsReceivedCount(prev => prev + 1);
        } else if (data.type === 'SYSTEM_STATUS') {
          setSystemHealth({
            status: data.serverStatus || 'Operational',
            activeConnections: data.activeConnections,
            uptime: data.uptime,
            latency: Date.now() - pingStart,
          });
          setEventsReceivedCount(prev => prev + 1);
        } else if (data.type === 'REAL_TIME_EVENT' && data.event) {
          const newEvent = data.event;
          setLastEventTime(new Date());
          setEventsReceivedCount(prev => prev + 1);
          
          setActivities(prev => {
            if (prev.some(act => act.id === newEvent.id)) return prev;
            return [newEvent, ...prev].slice(0, 50);
          });
          
          gsap.fromTo('.live-activity-flash', 
            { backgroundColor: 'rgba(74, 222, 128, 0.2)' },
            { backgroundColor: 'transparent', duration: 1 }
          );

          // Update statistics counters
          setStats(prev => ({
            ...prev,
            eventsProcessed: prev.eventsProcessed + 1,
            radarScans: newEvent.type === 'RADAR_SCAN_COMPLETE' ? prev.radarScans + 1 : prev.radarScans,
          }));

          // Update timeline on radar scan completed
          if (newEvent.type === 'RADAR_SCAN_COMPLETE' && newEvent.details?.domain) {
            setTimeline(prev => {
              if (prev.some(item => item.scannedAt === newEvent.createdAt)) return prev;
              return [...prev, {
                domain: newEvent.details.domain,
                overallScore: newEvent.details.overallScore || 0,
                scannedAt: newEvent.createdAt || newEvent.details.scannedAt || new Date().toISOString(),
              }].slice(-30);
            });
          }

          // Update summary counters on article events
          if (newEvent.type === 'ARTICLE_PUBLISHED' || newEvent.type === 'DRAFT_SAVED') {
            const isNew = newEvent.details?.isNew;
            setSummary(prev => {
              if (!prev) return prev;
              let publishedDiff = 0;
              let draftDiff = 0;

              if (newEvent.type === 'ARTICLE_PUBLISHED') {
                publishedDiff = 1;
                draftDiff = isNew ? 0 : -1;
              } else {
                draftDiff = 1;
              }

              const newTotal = prev.totalAssets + (isNew ? 1 : 0);
              return {
                ...prev,
                totalAssets: newTotal,
                publishedAssets: prev.publishedAssets + publishedDiff,
                draftAssets: prev.draftAssets + draftDiff,
              };
            });

            if (isNew) {
              setStats(prev => ({ ...prev, articlesManaged: prev.articlesManaged + 1 }));
            }
          }

          // Update average scores on audit completed
          if (newEvent.type === 'AUDIT_COMPLETED' && newEvent.details?.aiScore !== undefined) {
            setSummary(prev => {
              if (!prev) return prev;
              const aiScore = newEvent.details.aiScore;
              const visibilityScore = newEvent.details.visibilityScore || 0;
              const prevCount = prev.publishedAssets || 1;
              return {
                ...prev,
                averageAiScore: Math.round((prev.averageAiScore * prevCount + aiScore) / (prevCount + 1)),
                averageVisibilityScore: Math.round((prev.averageVisibilityScore * prevCount + visibilityScore) / (prevCount + 1)),
              };
            });
          }
        }
      } catch (e) {
        console.error('Failed parsing WS message', e);
      }
    };

    ws.onclose = (event) => {
      setWsStatusWithRef('Disconnected');
      setConnectedSince(null);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      
      let reason = 'Backend Offline';
      if (event.code === 1006) {
        reason = 'Backend Offline';
      } else if (event.code === 1008) {
        reason = 'Authentication Failed';
      } else if (event.code === 1011) {
        reason = 'Server Error';
      } else if (event.reason) {
        reason = event.reason;
      }

      if (wsStatusRef.current === 'Connecting' || wsStatusRef.current === 'Reconnecting...') {
        reason = 'Connection Refused';
      }

      if (!navigator.onLine) {
        reason = 'Network Error';
      }
      
      setDisconnectReason(reason);
      scheduleReconnect(attempt + 1);
    };

    ws.onerror = (error) => {
      if (!navigator.onLine) {
        setDisconnectReason('Network Error');
      } else if (wsUrl.includes('undefined')) {
        setDisconnectReason('Invalid WebSocket Endpoint');
      } else {
        setDisconnectReason('Connection Refused');
      }
    };
  }, [wsUrl, cleanupConnection]);

  const scheduleReconnect = useCallback((attempt: number) => {
    setReconnectAttempts(attempt);
    // Exponential backoff: 1s, 2s, 4s, 8s... capped at 30s
    const backoffTime = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
    reconnectTimeoutRef.current = setTimeout(() => {
      connectWs(attempt);
    }, backoffTime);
  }, [connectWs]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [sumRes, actRes, healthRes, timelineRes, statsRes] = await Promise.all([
          api.get('/api/ai-intelligence/summary'),
          api.get('/api/ai-intelligence/live-activity'),
          api.get('/api/ai-intelligence/system-health'),
          api.get('/api/ai-intelligence/timeline'),
          api.get('/api/ai-intelligence/statistics'),
        ]);
        setSummary(sumRes.data.summary);
        setActivities(actRes.data.activities);
        setSystemHealth(healthRes.data.health);
        setTimeline(timelineRes.data.timeline || []);
        setStats(statsRes.data.stats || { eventsProcessed: 0, radarScans: 0, articlesManaged: 0 });
      } catch (e) {
        console.error('Failed to fetch AI Intelligence initial data', e);
      }
    };
    fetchInitialData();
    connectWs(0);

    return () => cleanupConnection();
  }, [connectWs, cleanupConnection]);

  // Entrance animations
  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(headerRef.current,
      { y: -30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
    )
    .fromTo(orbContainerRef.current,
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, duration: 1.5, ease: "expo.out" },
      "-=0.5"
    )
    .fromTo(panelsRef.current?.children || [],
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "power2.out" },
      "-=1.2"
    );
  }, []);

  const formatEventType = (type: string) => type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const getEventIcon = (type: string) => {
    if (type.includes('AUDIT')) return <Search className="w-4 h-4 text-sky-400" />;
    if (type.includes('KEYWORDS') || type.includes('SCHEMA')) return <Code2 className="w-4 h-4 text-emerald-400" />;
    if (type.includes('PUBLISHED') || type.includes('SAVED')) return <Database className="w-4 h-4 text-indigo-400" />;
    return <Zap className="w-4 h-4 text-amber-400" />;
  };

  const getStatusColor = () => {
    if (wsStatus === 'Connected') return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]';
    if (wsStatus === 'Reconnecting...') return 'bg-amber-500 animate-pulse';
    return 'bg-red-500';
  };

  return (
    <div className="relative w-full h-screen bg-neutral-950 overflow-hidden flex flex-col text-white font-sans">
      
      {/* Background Orb */}
      <div ref={orbContainerRef} className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 5] }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={2} />
          <pointLight position={[-10, -10, -5]} intensity={1} color="#4338ca" />
          <SystemOrb activeConnections={systemHealth?.activeConnections || 0} />
        </Canvas>
      </div>
      
      {/* Header */}
      <div ref={headerRef} className="relative z-10 w-full p-4 flex items-center justify-between bg-neutral-950/40 backdrop-blur-xl border-b border-white/10 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.5)]">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400">
              AI Intelligence Center
            </h1>
            <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-400 font-semibold">
              Live Neural Network Monitoring
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Quick Stats Panel */}
          <div className="flex items-center gap-6 px-6 py-2 rounded-full bg-neutral-900/60 border border-white/5 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor()}`} />
              <span className="text-xs font-medium text-neutral-300">
                {wsStatus} {wsStatus === 'Connected' ? `(${wsLatency}ms)` : ''}
              </span>
            </div>
            {wsStatus !== 'Connected' && disconnectReason && (
              <>
                <div className="w-[1px] h-4 bg-white/10" />
                <span className="text-xs text-red-400 font-medium">{disconnectReason}</span>
              </>
            )}
            <div className="w-[1px] h-4 bg-white/10" />
            <div className="flex items-center gap-2 text-neutral-300">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-medium">Last: {lastEventTime ? lastEventTime.toLocaleTimeString() : '--:--'}</span>
            </div>
          </div>
          
          {/* Diagnostics Toggle */}
          <button 
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            title="Developer Diagnostics"
          >
            <Terminal className="w-4 h-4 text-neutral-400" />
          </button>
        </div>
      </div>

      {/* Diagnostics Overlay */}
      <AnimatePresence>
        {showDiagnostics && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 right-6 z-50 w-96 bg-neutral-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-5 font-mono text-xs text-neutral-300"
          >
            <div className="flex items-center gap-2 mb-4 text-white border-b border-white/10 pb-2">
              <Terminal className="w-4 h-4" />
              <span className="font-semibold uppercase tracking-wider">Developer Diagnostics</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-neutral-500">WebSocket Connected</span> <span className={wsStatus === 'Connected' ? 'text-emerald-400' : 'text-red-400'}>{wsStatus === 'Connected' ? 'Yes' : 'No'}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Current Connection State</span> <span>{wsStatus}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Connected Clients</span> <span>{systemHealth?.activeConnections || 0}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Last Event Received</span> <span>{lastEventTime ? lastEventTime.toLocaleTimeString() : 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Last Ping</span> <span>{lastPingTime ? lastPingTime.toLocaleTimeString() : 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Last Pong</span> <span>{lastPongTime ? lastPongTime.toLocaleTimeString() : 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Backend Latency</span> <span>{wsLatency}ms</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Reconnect Attempts</span> <span>{reconnectAttempts}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Events Received</span> <span>{eventsReceivedCount}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Events Sent</span> <span>{eventsSentCount}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Server Status</span> <span className="text-emerald-400">{systemHealth?.status || 'Operational'}</span></div>
              {disconnectReason && (
                <div className="flex justify-between items-start gap-4">
                  <span className="text-neutral-500 shrink-0">Last Error</span> 
                  <span className="text-red-400 text-right">{disconnectReason}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Grid */}
      <div className="relative z-10 flex-1 overflow-y-auto p-8">
        <div ref={panelsRef} className="max-w-[1600px] mx-auto grid grid-cols-12 gap-6">
          
          <motion.div 
            whileHover={{ y: -5, scale: 1.02 }}
            className="col-span-12 lg:col-span-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-lg p-6 shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-[50px] -mr-10 -mt-10 transition-transform group-hover:scale-150" />
            <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" /> Platform Security & Load
            </h3>
            <div className="space-y-6">
              <div>
                <p className="text-4xl font-bold text-white mb-1">{systemHealth ? systemHealth.activeConnections : '--'}</p>
                <p className="text-xs text-neutral-400">Active WebSocket Connections</p>
              </div>
              <div className="w-full bg-neutral-800/50 rounded-full h-1.5 mb-2">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full" style={{ width: `${Math.min(((systemHealth?.activeConnections || 0) / 100) * 100, 100)}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                <div>
                  <p className="text-2xl font-bold text-white mb-1">{summary ? summary.totalAssets : '--'}</p>
                  <p className="text-xs text-neutral-400">Total Tracked Assets</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white mb-1">{stats ? stats.articlesManaged : '--'}</p>
                  <p className="text-xs text-neutral-400">Articles Managed</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5, scale: 1.02 }}
            className="col-span-12 lg:col-span-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-lg p-6 shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-[50px] -mr-10 -mt-10 transition-transform group-hover:scale-150" />
            <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" /> AI Optimization State
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-4xl font-bold text-white mb-1">{summary ? `${summary.averageAiScore}%` : '--'}</p>
                  <p className="text-xs text-neutral-400">Average Readiness Score</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-white mb-1">{summary ? `${summary.averageVisibilityScore}%` : '--'}</p>
                  <p className="text-xs text-neutral-400">Average LLM Visibility</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div>
                  <p className="text-2xl font-bold text-white mb-1">{stats ? stats.radarScans : '--'}</p>
                  <p className="text-xs text-neutral-400">Radar Scans Run</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white mb-1">{stats ? stats.eventsProcessed : '--'}</p>
                  <p className="text-xs text-neutral-400">Events Processed</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Live Activity Feed */}
          <motion.div 
            className="col-span-12 lg:col-span-4 row-span-2 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl p-0 shadow-2xl flex flex-col overflow-hidden live-activity-flash"
          >
            <div className="p-6 border-b border-white/10 bg-white/5 shrink-0 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                <Server className={`w-4 h-4 ${wsStatus === 'Connected' ? 'text-emerald-400 animate-pulse' : 'text-neutral-500'}`} /> 
                Live Event Stream
              </h3>
              {wsStatus !== 'Connected' && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs font-medium">
                  <AlertCircle className="w-3 h-3" /> Offline
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-neutral-500">
                  {wsStatus === 'Connected' ? 'Waiting for live events...' : 'Connect to view live events'}
                </div>
              ) : (
                <AnimatePresence>
                  {activities.map((act) => (
                    <motion.div 
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -20, opacity: 0 }}
                      key={act.id} 
                      className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-neutral-900 border border-white/10 shrink-0">
                        {getEventIcon(act.type)}
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral-400 font-mono mb-1">{new Date(act.createdAt).toLocaleTimeString()} - {formatEventType(act.type)}</p>
                        <p className="text-sm text-neutral-200">{act.message}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>

          <motion.div 
            className="col-span-12 lg:col-span-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-lg p-6 shadow-2xl min-h-[300px]"
          >
            <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-6">Radar Execution Timeline</h3>
            <div className="w-full h-full flex flex-col items-center justify-center min-h-[180px]">
              {timeline.length === 0 ? (
                <div className="text-neutral-500 flex flex-col items-center gap-2">
                  <Clock className="w-8 h-8 text-neutral-600 animate-pulse" />
                  <p className="text-sm">No radar scan execution history found.</p>
                </div>
              ) : (
                <div className="w-full flex flex-col gap-6">
                  <div className="relative w-full h-2 bg-neutral-800 rounded-full flex items-center justify-between px-4 mt-6">
                    <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: '100%' }} />
                    
                    {timeline.map((item, index) => {
                      const percentage = (index / Math.max(1, timeline.length - 1)) * 90 + 5;
                      return (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          key={index}
                          className="absolute -translate-x-1/2 flex flex-col items-center group cursor-pointer"
                          style={{ left: `${percentage}%` }}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 border-neutral-950 transition-all ${
                            item.overallScore >= 70 ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' :
                            item.overallScore >= 40 ? 'bg-indigo-400 shadow-[0_0_10px_#818cf8]' :
                            'bg-red-400 shadow-[0_0_10px_#f87171]'
                          } group-hover:scale-125`} />
                          
                          <div className="absolute bottom-6 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900 border border-white/10 px-2 py-1 rounded text-[10px] whitespace-nowrap pointer-events-none z-20">
                            <span className="font-semibold text-white">{item.domain}</span>: {item.overallScore}%
                            <br />
                            <span className="text-neutral-400 text-[9px]">{new Date(item.scannedAt).toLocaleTimeString()}</span>
                          </div>
                          
                          <span className="text-[10px] text-neutral-400 mt-2 font-mono truncate max-w-[80px]">
                            {item.domain}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-neutral-400 text-center mt-4">
                    Real-time radar execution path tracking {timeline.length} LLM index audits.
                  </p>
                </div>
              )}
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
};
