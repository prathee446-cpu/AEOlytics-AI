import { prisma } from '../db/prisma';
import { AIService } from './ai.service';
import { SSEService } from './sse.service';

export class RadarSchedulerService {
  private static timer: ReturnType<typeof setInterval> | null = null;
  private static isScanning = false;

  /**
   * Start the background tracking service
   */
  static start() {
    // 15 minutes by default, configurable via environment
    const intervalMs = process.env.RADAR_INTERVAL_MS 
      ? parseInt(process.env.RADAR_INTERVAL_MS, 10) 
      : 15 * 60 * 1000;

    console.log(`[Radar Scheduler] Starting background visibility tracker. Interval: ${intervalMs / 1000}s`);

    // Run first execution after a short 10s warmup delay so the server boots completely
    setTimeout(() => {
      this.runScanCycle().catch(err => console.error('[Radar Scheduler] Warmup scan failed:', err));
    }, 10000);

    // Setup interval
    this.timer = setInterval(async () => {
      try {
        await this.runScanCycle();
      } catch (err) {
        console.error('[Radar Scheduler] Error in scan interval cycle:', err);
      }
    }, intervalMs);
  }

  /**
   * Stop the background tracking service
   */
  static stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[Radar Scheduler] Background visibility tracker stopped.');
    }
  }

  /**
   * Runs the background visibility audit check for all configured users
   */
  private static async runScanCycle() {
    if (this.isScanning) {
      console.log('[Radar Scheduler] Scan cycle already in progress, skipping.');
      return;
    }

    this.isScanning = true;
    console.log('[Radar Scheduler] Starting background visibility check cycle...');

    try {
      // Find all unique users who have previously run a scan to determine who has configured tracking
      const userSessions = await prisma.radarSession.findMany({
        select: { userId: true },
        distinct: ['userId'],
      });

      console.log(`[Radar Scheduler] Found ${userSessions.length} users with configured tracking.`);

      for (const { userId } of userSessions) {
        try {
          await this.scanForUser(userId);
        } catch (userErr) {
          console.error(`[Radar Scheduler] Scan failed for user ${userId}:`, userErr);
        }
      }
    } catch (err) {
      console.error('[Radar Scheduler] Error in runScanCycle:', err);
    } finally {
      this.isScanning = false;
      console.log('[Radar Scheduler] Background visibility check cycle complete.');
    }
  }

  /**
   * Runs a fresh visibility audit scan for a specific user based on all their tracked domains
   */
  private static async scanForUser(userId: string) {
    // 1. Fetch all sessions for this user to identify all unique tracked domains
    const allUserSessions = await prisma.radarSession.findMany({
      where: { userId },
      orderBy: { scannedAt: 'desc' },
    });

    const latestSessionsByDomain = new Map<string, any>();
    for (const s of allUserSessions) {
      if (!latestSessionsByDomain.has(s.domain)) {
        latestSessionsByDomain.set(s.domain, s);
      }
    }

    if (latestSessionsByDomain.size === 0) {
      console.log(`[Radar Scheduler] No tracking configurations found for user ${userId}. Skipping.`);
      return;
    }

    console.log(`[Radar Scheduler] Running audits for ${latestSessionsByDomain.size} domains for user ${userId}...`);

    for (const latestSession of latestSessionsByDomain.values()) {
      try {
        await this.scanForUserDomain(userId, latestSession);
      } catch (err) {
        console.error(`[Radar Scheduler] Background scan failed for domain ${latestSession.domain} (user ${userId}):`, err);
      }
    }
  }

  /**
   * Performs the scan for a single domain configuration
   */
  private static async scanForUserDomain(userId: string, latestSession: any) {
    const { url, domain, trackedQueries, engines, competitorDomains } = latestSession;
    if (!trackedQueries.length || !engines.length) {
      console.log(`[Radar Scheduler] Incomplete config for user ${userId} / domain ${domain}. Skipping.`);
      return;
    }

    // LOG STAGE: URL received
    console.log(`[Radar Scheduler] URL configuration received: ${url}`);

    // LOG STAGE: Tracking started
    console.log(`[Radar Scheduler] Tracking started for domain: ${domain}`);

    // Notify clients that tracking has started
    SSEService.sendToUser(userId, 'activity', {
      type: 'activity',
      message: `Background visibility tracking initiated for ${domain}...`,
      timestamp: new Date().toISOString(),
    });

    // 2. Perform query checks in parallel batches
    const allResultPromises: Promise<any>[] = [];
    const resultMeta: { query: string; engine: string }[] = [];

    trackedQueries.forEach((query: string) => {
      engines.forEach((engine: string) => {
        allResultPromises.push(
          AIService.analyzeRadarQuery(query, domain, engine, competitorDomains)
        );
        resultMeta.push({ query, engine });
      });
    });

    const settled = await Promise.allSettled(allResultPromises);
    const analysisResults = settled.map((r, i) => ({
      ...resultMeta[i],
      ...(r.status === 'fulfilled' ? r.value : {
        mentioned: false,
        rankPosition: null,
        citationStatus: 'none',
        competitorMentions: [],
        responseExcerpt: 'Engine connection timeout or service unavailable.',
        queryScore: 0,
      }),
    }));

    // LOG STAGE: Data collected
    const totalChecks = analysisResults.length;
    const totalMentions = analysisResults.filter(r => r.mentioned).length;
    console.log(`[Radar Scheduler] Data collected. Checks: ${totalChecks}, Mentions: ${totalMentions}`);

    // 3. Aggregate results and scores & LOG STAGE: Visibility score calculated
    const overallScore = totalChecks > 0
      ? parseFloat(((totalMentions / totalChecks) * 100).toFixed(1))
      : 0;
    console.log(`[Radar Scheduler] Visibility score calculated: ${overallScore}%`);

    // 4. Generate fresh recommendations
    const recommendations = await AIService.generateRadarRecommendations(domain, analysisResults);

    // 5. Store session in database
    const newSession = await prisma.radarSession.create({
      data: {
        userId,
        url,
        domain,
        engines,
        trackedQueries,
        competitorDomains,
        overallScore,
        totalChecks,
        totalMentions,
        results: {
          create: analysisResults.map(r => ({
            query: r.query,
            engine: r.engine,
            mentioned: r.mentioned,
            rankPosition: r.rankPosition,
            citationStatus: r.citationStatus,
            competitorMentions: r.competitorMentions as any,
            responseExcerpt: r.responseExcerpt,
            queryScore: r.queryScore,
          })),
        },
        recommendations: {
          create: recommendations.map(rec => ({
            type: rec.type,
            priority: rec.priority,
            engine: rec.engine ?? null,
            title: rec.title,
            description: rec.description,
          })),
        },
      },
      include: {
        results: true,
        recommendations: true,
      },
    });

    // LOG STAGE: Database updated
    console.log(`[Radar Scheduler] Database updated. Session ID: ${newSession.id} for domain: ${domain}`);

    // 6. Detect changes and calculate trends
    const scoreDiff = parseFloat((overallScore - latestSession.overallScore).toFixed(1));
    let trendMessage = `Visibility score for ${domain} remained stable at ${overallScore}%`;
    let changeType: 'increase' | 'decrease' | 'stable' = 'stable';

    if (scoreDiff > 0) {
      trendMessage = `Visibility score for ${domain} increased by +${scoreDiff}% (now ${overallScore}%)`;
      changeType = 'increase';
    } else if (scoreDiff < 0) {
      trendMessage = `Visibility score for ${domain} decreased by ${scoreDiff}% (now ${overallScore}%)`;
      changeType = 'decrease';
    }

    console.log(`[Radar Scheduler] User ${userId} updated domain ${domain}: ${trendMessage}`);

    // LOG STAGE: WebSocket / SSE event sent
    console.log(`[Radar Scheduler] WebSocket/SSE event sent to user: ${userId} for domain: ${domain}`);
    SSEService.sendToUser(userId, 'radar_update', {
      session: newSession,
      previousScore: latestSession.overallScore,
      changeType,
      scoreDiff,
      domain,
    });

    SSEService.sendToUser(userId, 'activity', {
      type: 'activity',
      message: `Visibility tracking for ${domain} completed.`,
      timestamp: new Date().toISOString(),
    });

    SSEService.sendToUser(userId, 'activity', {
      type: 'activity',
      message: trendMessage,
      timestamp: new Date().toISOString(),
    });
  }
}
