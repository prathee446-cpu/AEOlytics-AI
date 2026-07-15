import { CrawlResult } from './crawler.service';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ContentMetrics {
  semanticCoverage: number;       // 0-1
  questionAnswerability: number;  // 0-1
  entityDensity: number;          // 0-1
  entityRelationships: number;    // 0-1
  topicalAuthority: number;       // 0-1
  headingStructure: number;       // 0-1
  chunkQuality: number;           // 0-1
  contentFreshness: number;       // 0-1
  citationQuality: number;        // 0-1
  externalReferences: number;     // 0-1
  internalLinks: number;          // 0-1
  readability: number;            // 0-1
  markdownStructure: number;      // 0-1
  answerCompleteness: number;     // 0-1
  aiSearchFriendliness: number;   // 0-1
  schemaCoverage: number;         // 0-1
  faqCoverage: number;            // 0-1
  knowledgeGraphSignals: number;  // 0-1
  searchIntentMatch: number;      // 0-1
  queryCoverage: number;          // 0-1
}

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

export interface OptimizerIssue {
  severity: SeverityLevel;
  title: string;
  description: string;
  recommendation: string;
  whyItMatters: string;
  aiInterpretation: string;
}

export interface OptimizerPanel {
  panelId: string;
  label: string;
  score: number;       // 0-100
  issues: OptimizerIssue[];
  summary: string;
}

export interface AuditScores {
  chatgpt: number;
  googleAI: number;
  gemini: number;
  perplexity: number;
  claude: number;
  copilot: number;
  overall: number;
}

export interface FullAuditResult {
  scores: AuditScores;
  metrics: ContentMetrics;
  panels: OptimizerPanel[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine Weight Profiles (must sum to 1.0 per engine)
// ─────────────────────────────────────────────────────────────────────────────

type WeightMap = Record<keyof ContentMetrics, number>;

const ENGINE_WEIGHTS: Record<string, WeightMap> = {
  chatgpt: {
    semanticCoverage:      0.06,
    questionAnswerability: 0.12,
    entityDensity:         0.04,
    entityRelationships:   0.04,
    topicalAuthority:      0.06,
    headingStructure:      0.05,
    chunkQuality:          0.06,
    contentFreshness:      0.03,
    citationQuality:       0.03,
    externalReferences:    0.03,
    internalLinks:         0.02,
    readability:           0.10,
    markdownStructure:     0.04,
    answerCompleteness:    0.10,
    aiSearchFriendliness:  0.09,
    schemaCoverage:        0.04,
    faqCoverage:           0.10,
    knowledgeGraphSignals: 0.04,
    searchIntentMatch:     0.05,
    queryCoverage:         0.06,
  },
  googleAI: {
    semanticCoverage:      0.08,
    questionAnswerability: 0.06,
    entityDensity:         0.07,
    entityRelationships:   0.07,
    topicalAuthority:      0.09,
    headingStructure:      0.07,
    chunkQuality:          0.04,
    contentFreshness:      0.07,
    citationQuality:       0.06,
    externalReferences:    0.05,
    internalLinks:         0.04,
    readability:           0.05,
    markdownStructure:     0.04,
    answerCompleteness:    0.06,
    aiSearchFriendliness:  0.05,
    schemaCoverage:        0.09,
    faqCoverage:           0.04,
    knowledgeGraphSignals: 0.06,
    searchIntentMatch:     0.04,
    queryCoverage:         0.04,
  },
  gemini: {
    semanticCoverage:      0.10,
    questionAnswerability: 0.06,
    entityDensity:         0.07,
    entityRelationships:   0.07,
    topicalAuthority:      0.08,
    headingStructure:      0.06,
    chunkQuality:          0.05,
    contentFreshness:      0.04,
    citationQuality:       0.04,
    externalReferences:    0.04,
    internalLinks:         0.03,
    readability:           0.06,
    markdownStructure:     0.05,
    answerCompleteness:    0.07,
    aiSearchFriendliness:  0.07,
    schemaCoverage:        0.07,
    faqCoverage:           0.04,
    knowledgeGraphSignals: 0.08,
    searchIntentMatch:     0.04,
    queryCoverage:         0.03,
  },
  perplexity: {
    semanticCoverage:      0.06,
    questionAnswerability: 0.06,
    entityDensity:         0.08,
    entityRelationships:   0.05,
    topicalAuthority:      0.07,
    headingStructure:      0.04,
    chunkQuality:          0.04,
    contentFreshness:      0.06,
    citationQuality:       0.12,
    externalReferences:    0.12,
    internalLinks:         0.02,
    readability:           0.05,
    markdownStructure:     0.03,
    answerCompleteness:    0.06,
    aiSearchFriendliness:  0.05,
    schemaCoverage:        0.04,
    faqCoverage:           0.05,
    knowledgeGraphSignals: 0.06,
    searchIntentMatch:     0.04,
    queryCoverage:         0.05,
  },
  claude: {
    semanticCoverage:      0.07,
    questionAnswerability: 0.08,
    entityDensity:         0.04,
    entityRelationships:   0.04,
    topicalAuthority:      0.06,
    headingStructure:      0.06,
    chunkQuality:          0.10,
    contentFreshness:      0.03,
    citationQuality:       0.04,
    externalReferences:    0.04,
    internalLinks:         0.03,
    readability:           0.12,
    markdownStructure:     0.06,
    answerCompleteness:    0.10,
    aiSearchFriendliness:  0.08,
    schemaCoverage:        0.03,
    faqCoverage:           0.06,
    knowledgeGraphSignals: 0.03,
    searchIntentMatch:     0.05,
    queryCoverage:         0.02,
  },
  copilot: {
    semanticCoverage:      0.06,
    questionAnswerability: 0.07,
    entityDensity:         0.05,
    entityRelationships:   0.05,
    topicalAuthority:      0.07,
    headingStructure:      0.10,
    chunkQuality:          0.06,
    contentFreshness:      0.05,
    citationQuality:       0.05,
    externalReferences:    0.04,
    internalLinks:         0.08,
    readability:           0.07,
    markdownStructure:     0.10,
    answerCompleteness:    0.06,
    aiSearchFriendliness:  0.05,
    schemaCoverage:        0.06,
    faqCoverage:           0.03,
    knowledgeGraphSignals: 0.04,
    searchIntentMatch:     0.04,
    queryCoverage:         0.02,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Scoring Engine
// ─────────────────────────────────────────────────────────────────────────────

export class ScoringService {
  /**
   * Run the full AEO audit: compute all 20 metrics → 6 engine scores → 9 optimizer panels.
   */
  static audit(crawl: CrawlResult): FullAuditResult {
    const metrics = this.computeMetrics(crawl);
    const scores = this.computeEngineScores(metrics);
    const panels = this.generateOptimizerPanels(metrics, crawl);
    return { scores, metrics, panels };
  }

  // ── 20 Real Content Metrics ─────────────────────────────────────────────────

  static computeMetrics(c: CrawlResult): ContentMetrics {
    return {
      semanticCoverage:      this.metricSemanticCoverage(c),
      questionAnswerability: this.metricQuestionAnswerability(c),
      entityDensity:         this.metricEntityDensity(c),
      entityRelationships:   this.metricEntityRelationships(c),
      topicalAuthority:      this.metricTopicalAuthority(c),
      headingStructure:      this.metricHeadingStructure(c),
      chunkQuality:          this.metricChunkQuality(c),
      contentFreshness:      this.metricContentFreshness(c),
      citationQuality:       this.metricCitationQuality(c),
      externalReferences:    this.metricExternalReferences(c),
      internalLinks:         this.metricInternalLinks(c),
      readability:           this.metricReadability(c),
      markdownStructure:     this.metricMarkdownStructure(c),
      answerCompleteness:    this.metricAnswerCompleteness(c),
      aiSearchFriendliness:  this.metricAISearchFriendliness(c),
      schemaCoverage:        this.metricSchemaCoverage(c),
      faqCoverage:           this.metricFAQCoverage(c),
      knowledgeGraphSignals: this.metricKnowledgeGraphSignals(c),
      searchIntentMatch:     this.metricSearchIntentMatch(c),
      queryCoverage:         this.metricQueryCoverage(c),
    };
  }

  // 1. Semantic Coverage: vocabulary richness relative to content length
  private static metricSemanticCoverage(c: CrawlResult): number {
    const text = [...c.paragraphs, ...c.h1, ...c.h2, ...c.h3].join(' ');
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    if (words.length === 0) return 0;
    const uniqueWords = new Set(words).size;
    const ratio = uniqueWords / words.length;
    // Ideal ratio is 0.35-0.60 for good semantic coverage
    return clamp(ratio * 2, 0, 1);
  }

  // 2. Question Answerability: question-formatted headings + following paragraphs
  private static metricQuestionAnswerability(c: CrawlResult): number {
    const questionPattern = /^(what|how|why|when|where|who|which|is|are|can|does|do|will|should|would|could)\b/i;
    const allHeadings = [...c.h2, ...c.h3];
    const totalHeadings = allHeadings.length;
    if (totalHeadings === 0) return 0.1;
    const questionHeadings = allHeadings.filter(h => questionPattern.test(h.trim()) || h.trim().endsWith('?')).length;
    const faqBonus = this.hasFAQSection(c) ? 0.25 : 0;
    return clamp(questionHeadings / totalHeadings + faqBonus, 0, 1);
  }

  // 3. Entity Density: named entities per 100 words (optimal: 2-5 per 100 words)
  private static metricEntityDensity(c: CrawlResult): number {
    if (c.wordCount === 0) return 0;
    const densityPer100 = (c.entities.length / c.wordCount) * 100;
    // Bell curve: optimal at 3, score decreases outside 1-8 range
    if (densityPer100 < 0.5) return 0.1;
    if (densityPer100 < 1) return 0.4;
    if (densityPer100 <= 5) return clamp(0.5 + densityPer100 / 10, 0, 1);
    if (densityPer100 <= 8) return 0.9;
    return 0.6; // too dense
  }

  // 4. Entity Relationships: do entities co-occur in same paragraphs?
  private static metricEntityRelationships(c: CrawlResult): number {
    if (c.entities.length < 2) return 0.1;
    let coOccurrences = 0;
    c.paragraphs.forEach(para => {
      const paraLower = para.toLowerCase();
      const mentioned = c.entities.filter(e => paraLower.includes(e.toLowerCase()));
      if (mentioned.length >= 2) coOccurrences += mentioned.length - 1;
    });
    return clamp(coOccurrences / 10, 0, 1);
  }

  // 5. Topical Authority: depth (H3 count per H2) × breadth (H2 count)
  private static metricTopicalAuthority(c: CrawlResult): number {
    const breadth = Math.min(1, c.h2.length / 5);
    const depth = c.h2.length > 0 ? Math.min(1, c.h3.length / (c.h2.length * 2)) : 0;
    const wordDepth = Math.min(1, c.wordCount / 1500);
    return (breadth * 0.35 + depth * 0.35 + wordDepth * 0.30);
  }

  // 6. Heading Structure: H1 count, H2 presence, hierarchy validity
  private static metricHeadingStructure(c: CrawlResult): number {
    let score = 0;
    if (c.h1.length === 1) score += 0.35;         // Exactly one H1
    else if (c.h1.length > 1) score += 0.10;       // Multiple H1s penalised
    if (c.h2.length >= 2) score += 0.30;            // At least 2 H2s
    else if (c.h2.length === 1) score += 0.15;
    if (c.h3.length > 0) score += 0.20;             // Has H3 depth
    if (c.h1.length > 0 && c.h2.length > 0) score += 0.15; // Proper hierarchy
    return clamp(score, 0, 1);
  }

  // 7. Chunk Quality: proportion of paragraphs in optimal length range (50-180 words)
  private static metricChunkQuality(c: CrawlResult): number {
    if (c.paragraphs.length === 0) return 0;
    let good = 0;
    c.paragraphs.forEach(p => {
      const wc = p.split(/\s+/).length;
      if (wc >= 30 && wc <= 180) good++;
    });
    return good / c.paragraphs.length;
  }

  // 8. Content Freshness: has publish/modified date? Is it recent?
  private static metricContentFreshness(c: CrawlResult): number {
    let score = 0;
    if (c.publishDate) {
      score += 0.30;
      try {
        const age = Date.now() - new Date(c.publishDate).getTime();
        const ageMonths = age / (1000 * 60 * 60 * 24 * 30);
        if (ageMonths < 3) score += 0.40;
        else if (ageMonths < 12) score += 0.25;
        else if (ageMonths < 24) score += 0.10;
      } catch {}
    }
    if (c.modifiedDate) score += 0.20;
    // Freshness language signals
    const freshWords = ['updated', 'recent', 'current', 'latest', '2024', '2025', '2026'];
    const textLower = c.paragraphs.join(' ').toLowerCase();
    if (freshWords.some(w => textLower.includes(w))) score += 0.10;
    return clamp(score, 0, 1);
  }

  // 9. Citation Quality: external links present with meaningful anchor text
  private static metricCitationQuality(c: CrawlResult): number {
    const count = c.externalLinks.length;
    if (count === 0) return 0;
    const withText = c.externalLinks.filter(l => l.text && l.text.length > 3).length;
    const qualityRatio = withText / count;
    return clamp((Math.log(count + 1) / Math.log(12)) * qualityRatio, 0, 1);
  }

  // 10. External References: unique external domains cited
  private static metricExternalReferences(c: CrawlResult): number {
    const domains = new Set(c.externalLinks.map(l => {
      try { return new URL(l.href).hostname; } catch { return l.href; }
    }));
    return clamp(domains.size / 5, 0, 1);
  }

  // 11. Internal Links: presence of contextual internal links
  private static metricInternalLinks(c: CrawlResult): number {
    return clamp(c.internalLinks.length / 5, 0, 1);
  }

  // 12. Readability: approximate Flesch-Kincaid (higher score = more readable)
  private static metricReadability(c: CrawlResult): number {
    const text = c.paragraphs.join(' ');
    if (!text.trim()) return 0.5;

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(Boolean);
    if (sentences.length === 0 || words.length === 0) return 0.5;

    const avgWordsPerSentence = words.length / sentences.length;
    // Approximate syllable count (vowel groups per word)
    const totalSyllables = words.reduce((sum, word) => {
      const syllables = (word.toLowerCase().match(/[aeiouy]+/g) || []).length;
      return sum + Math.max(1, syllables);
    }, 0);
    const avgSyllablesPerWord = totalSyllables / words.length;

    // Flesch Reading Ease: 206.835 - 1.015*AWL - 84.6*ASW
    const fre = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
    // Normalise to 0-1 (FRE 0-100 → 0-1, clamped)
    return clamp(fre / 100, 0, 1);
  }

  // 13. Markdown Structure: use of formatting elements (lists, bold, tables, etc.)
  private static metricMarkdownStructure(c: CrawlResult): number {
    let score = 0;
    if (c.lists.length > 0) score += 0.25;
    if (c.tables.length > 0) score += 0.20;
    if (c.images.length > 0) score += 0.15;
    if (c.h2.length > 0) score += 0.25;
    if (c.h3.length > 0) score += 0.15;
    return clamp(score, 0, 1);
  }

  // 14. Answer Completeness: does content address who/what/when/where/why/how?
  private static metricAnswerCompleteness(c: CrawlResult): number {
    const text = [...c.paragraphs, ...c.h1, ...c.h2, ...c.h3].join(' ').toLowerCase();
    const signals = {
      what: /\bwhat\b|\bdefinition\b|\bmeaning\b|\bexplain\b|\bexplanation\b|\bis a\b/.test(text),
      how: /\bhow\b|\bsteps?\b|\bprocess\b|\bmethod\b|\bprocedure\b|\bway to\b/.test(text),
      why: /\bwhy\b|\breason\b|\bbecause\b|\bcause\b|\bpurpose\b/.test(text),
      who: /\bwho\b|\bauthor\b|\bcreated by\b|\bby\b/.test(text),
      when: /\bwhen\b|\bdate\b|\byear\b|\bsince\b|\buntil\b|\blaunch\b/.test(text),
      benefits: /\bbenefit\b|\badvantage\b|\bpro\b|\bvalue\b|\bimprove\b/.test(text),
    };
    const answered = Object.values(signals).filter(Boolean).length;
    return answered / 6;
  }

  // 15. AI Search Friendliness: direct answers, definitions, numbered processes
  private static metricAISearchFriendliness(c: CrawlResult): number {
    const text = c.paragraphs.join(' ').toLowerCase();
    let score = 0;
    // Direct definitional openings
    if (/\b\w+ is an?\b|\b\w+ refers to\b|\b\w+ can be defined as\b/.test(text)) score += 0.20;
    // Numbered steps or ordered processes
    if (c.lists.some(l => l.length >= 3)) score += 0.20;
    // Summary / TL;DR / key takeaways
    if (/\bkey takeaway\b|\bsummary\b|\bin conclusion\b|\btl;dr\b/.test(text)) score += 0.20;
    // Question → direct answer pattern (FAQ-like)
    if (this.hasFAQSection(c)) score += 0.25;
    // Short, scannable paragraphs (good for AI snippet extraction)
    const shortParas = c.paragraphs.filter(p => p.split(/\s+/).length < 60).length;
    if (c.paragraphs.length > 0 && shortParas / c.paragraphs.length > 0.5) score += 0.15;
    return clamp(score, 0, 1);
  }

  // 16. Schema Coverage: presence and variety of JSON-LD schemas
  private static metricSchemaCoverage(c: CrawlResult): number {
    const types = c.jsonLD.map(s => (s['@type'] || '').toLowerCase());
    let score = 0;
    if (types.some(t => t.includes('article') || t.includes('blogposting') || t.includes('newsarticle'))) score += 0.30;
    if (types.some(t => t.includes('faqpage') || t.includes('question'))) score += 0.30;
    if (types.some(t => t.includes('breadcrumblist') || t.includes('breadcrumb'))) score += 0.15;
    if (types.some(t => t.includes('organization') || t.includes('person') || t.includes('author'))) score += 0.15;
    if (types.some(t => t.includes('product') || t.includes('howto') || t.includes('recipe'))) score += 0.10;
    return clamp(score, 0, 1);
  }

  // 17. FAQ Coverage: quality of FAQ section
  private static metricFAQCoverage(c: CrawlResult): number {
    if (!this.hasFAQSection(c)) return 0;
    // Count FAQ pairs (Q + A patterns)
    const faqPairs = c.questions.filter(q =>
      c.paragraphs.some(p => p.length > 30 && p.split(/\s+/).length < 100)
    ).length;
    return clamp(0.3 + faqPairs / 8, 0, 1);
  }

  // 18. Knowledge Graph Signals: entities with definitional context
  private static metricKnowledgeGraphSignals(c: CrawlResult): number {
    if (c.entities.length === 0) return 0;
    const text = c.paragraphs.join(' ').toLowerCase();
    let signals = 0;
    c.entities.forEach(entity => {
      const entityLower = entity.toLowerCase();
      // Entity is defined (followed by "is", "are", "refers to")
      if (new RegExp(`${entityLower}\\s+(is|are|refers|means|stands for)`, 'i').test(text)) signals++;
      // Entity appears in headings
      if (c.h2.some(h => h.toLowerCase().includes(entityLower)) || c.h3.some(h => h.toLowerCase().includes(entityLower))) signals++;
    });
    return clamp(signals / Math.max(1, c.entities.length * 1.5), 0, 1);
  }

  // 19. Search Intent Match: does content satisfy its detected intent type?
  private static metricSearchIntentMatch(c: CrawlResult): number {
    let score = 0.3; // base score
    const intent = c.primaryIntent;
    switch (intent) {
      case 'How-To':
        if (c.lists.some(l => l.length >= 3)) score += 0.40;
        if (c.h2.length >= 2) score += 0.20;
        if (c.wordCount > 500) score += 0.10;
        break;
      case 'Informational':
        if (c.wordCount > 600) score += 0.30;
        if (c.h2.length >= 3) score += 0.20;
        if (c.externalLinks.length > 0) score += 0.10;
        if (this.hasFAQSection(c)) score += 0.10;
        break;
      case 'Comparative':
        if (c.tables.length > 0) score += 0.40;
        if (c.h2.length >= 2) score += 0.20;
        break;
      case 'Transactional':
        if (c.internalLinks.length > 2) score += 0.30;
        if (c.h2.length > 0) score += 0.20;
        break;
      default:
        if (c.wordCount > 400) score += 0.30;
    }
    return clamp(score, 0, 1);
  }

  // 20. Query Coverage: total potential search queries answered
  private static metricQueryCoverage(c: CrawlResult): number {
    const questionCount = c.questions.length;
    const headingQuestions = [...c.h2, ...c.h3].filter(h => /\?$/.test(h) || /^(what|how|why|when|where|who)/i.test(h)).length;
    const total = questionCount + headingQuestions;
    return clamp(total / 12, 0, 1);
  }

  // ── Engine Scoring ──────────────────────────────────────────────────────────

  static computeEngineScores(metrics: ContentMetrics): AuditScores {
    const score = (engine: string) => {
      const weights = ENGINE_WEIGHTS[engine];
      let total = 0;
      (Object.keys(weights) as Array<keyof ContentMetrics>).forEach(key => {
        total += (metrics[key] || 0) * weights[key];
      });
      return Math.round(clamp(total * 100, 10, 98));
    };

    const chatgpt = score('chatgpt');
    const googleAI = score('googleAI');
    const gemini = score('gemini');
    const perplexity = score('perplexity');
    const claude = score('claude');
    const copilot = score('copilot');
    const overall = Math.round((chatgpt + googleAI + gemini + perplexity + claude + copilot) / 6);

    return { chatgpt, googleAI, gemini, perplexity, claude, copilot, overall };
  }

  // ── Optimizer Panels ────────────────────────────────────────────────────────

  static generateOptimizerPanels(metrics: ContentMetrics, c: CrawlResult): OptimizerPanel[] {
    return [
      this.panelContentQuality(metrics, c),
      this.panelSemanticCoverage(metrics, c),
      this.panelQuestionCoverage(metrics, c),
      this.panelHeadingAnalysis(metrics, c),
      this.panelSchema(metrics, c),
      this.panelInternalLinking(metrics, c),
      this.panelExternalAuthority(metrics, c),
      this.panelMetadata(metrics, c),
      this.panelImages(metrics, c),
    ];
  }

  // Panel 1: Content Quality
  private static panelContentQuality(m: ContentMetrics, c: CrawlResult): OptimizerPanel {
    const issues: OptimizerIssue[] = [];
    const score = Math.round((m.chunkQuality * 0.35 + m.readability * 0.35 + m.answerCompleteness * 0.30) * 100);

    if (c.wordCount < 300) {
      issues.push({ severity: 'critical', title: 'Thin Content Detected', description: `Content has only ${c.wordCount} words. AI engines require substantial content to extract quality answers.`, recommendation: 'Expand to at least 600 words with detailed explanations, examples, and context.', whyItMatters: 'AI search engines like ChatGPT and Perplexity preferentially cite longer, comprehensive articles with depth.', aiInterpretation: 'This content is below the minimum threshold for AI citation consideration.' });
    } else if (c.wordCount < 600) {
      issues.push({ severity: 'high', title: 'Below Optimal Word Count', description: `Content has ${c.wordCount} words. Comprehensive articles with 800+ words score significantly higher.`, recommendation: 'Add more detail, examples, case studies, or an FAQ section to reach 800+ words.', whyItMatters: 'Content depth signals topical authority and completeness to AI answer engines.', aiInterpretation: 'Content may be cited for simple queries but will lose to longer, more comprehensive articles for complex searches.' });
    }

    const weakParas = c.paragraphs.filter(p => p.split(/\s+/).length < 25);
    if (weakParas.length > c.paragraphs.length * 0.4 && c.paragraphs.length > 2) {
      issues.push({ severity: 'medium', title: 'Multiple Weak Paragraphs', description: `${weakParas.length} paragraphs contain fewer than 25 words. These are too short to provide meaningful answers.`, recommendation: 'Merge or expand short paragraphs. Each paragraph should develop a complete thought (30-120 words).', whyItMatters: 'AI engines extract paragraph-level context to generate answers. Thin paragraphs lack extractable meaning.', aiInterpretation: 'Short paragraphs reduce the quality of context chunks available for AI answer generation.' });
    }

    const longParas = c.paragraphs.filter(p => p.split(/\s+/).length > 200);
    if (longParas.length > 0) {
      issues.push({ severity: 'medium', title: 'Overly Long Paragraphs', description: `${longParas.length} paragraph(s) exceed 200 words, reducing readability and AI chunk quality.`, recommendation: 'Break long paragraphs into 2-3 shorter, focused paragraphs with clear transitions.', whyItMatters: 'AI models extract smaller, coherent chunks. Monolithic paragraphs reduce the precision of extracted answers.', aiInterpretation: 'Long paragraphs create low-quality chunks that dilute answer relevance.' });
    }

    if (m.readability < 0.4) {
      issues.push({ severity: 'high', title: 'Low Readability Score', description: 'Content uses complex sentence structures that reduce AI parseability and user comprehension.', recommendation: 'Shorten sentences to an average of 15-18 words. Use active voice and simpler vocabulary.', whyItMatters: 'AI search engines score readable content higher as it is more likely to satisfy user query intent directly.', aiInterpretation: 'Complex text reduces the confidence score that AI engines assign when extracting answers.' });
    }

    if (m.answerCompleteness < 0.5) {
      issues.push({ severity: 'medium', title: 'Incomplete Topic Coverage', description: 'Content does not address fundamental questions (What, How, Why, When, Who) related to the topic.', recommendation: 'Add sections that directly answer each fundamental question about the topic.', whyItMatters: 'AI answer engines prioritize content that comprehensively addresses user intent across all question types.', aiInterpretation: 'Incomplete answer coverage means this content will only be cited for a narrow subset of related queries.' });
    }

    const summary = issues.length === 0 ? 'Content quality is strong. All quality metrics pass.' : `${issues.length} content quality issue(s) detected that may reduce AI citation probability.`;
    return { panelId: 'content-quality', label: 'Content Quality', score, issues, summary };
  }

  // Panel 2: Semantic Coverage
  private static panelSemanticCoverage(m: ContentMetrics, c: CrawlResult): OptimizerPanel {
    const issues: OptimizerIssue[] = [];
    const score = Math.round((m.semanticCoverage * 0.4 + m.entityDensity * 0.35 + m.topicalAuthority * 0.25) * 100);

    if (c.entities.length < 5) {
      issues.push({ severity: 'high', title: 'Low Named Entity Coverage', description: `Only ${c.entities.length} named entities detected. Rich entity coverage helps AI engines build knowledge graph connections.`, recommendation: 'Include specific product names, people, organizations, technologies, and locations relevant to the topic.', whyItMatters: 'Named entities are the backbone of AI knowledge graphs. Content without strong entity signals is harder for AI to associate with topic clusters.', aiInterpretation: 'Low entity density signals weak topical authority to entity-aware AI search systems.' });
    }

    if (m.semanticCoverage < 0.4) {
      issues.push({ severity: 'medium', title: 'Limited Vocabulary Breadth', description: 'Content uses a narrow range of vocabulary, indicating shallow semantic coverage of the topic.', recommendation: 'Introduce synonyms, related concepts, and domain-specific terminology to broaden semantic coverage.', whyItMatters: 'AI search engines evaluate semantic richness to determine if content truly covers a topic or merely repeats keywords.', aiInterpretation: 'Low vocabulary diversity signals repetitive content, reducing topical authority scores.' });
    }

    if (m.topicalAuthority < 0.5) {
      issues.push({ severity: 'medium', title: 'Insufficient Topic Depth', description: `Content covers ${c.h2.length} main sections with ${c.h3.length} subsections. More depth increases topical authority.`, recommendation: 'Add subsections (H3 headings) under each main topic to demonstrate expert-level depth.', whyItMatters: 'AI engines reward content with clear topical depth—multiple levels of structured detail on the same theme.', aiInterpretation: 'Shallow topic coverage reduces the probability of being selected as an authoritative source.' });
    }

    if (m.entityRelationships < 0.3) {
      issues.push({ severity: 'low', title: 'Weak Entity Relationships', description: 'Entities appear in isolation rather than in co-context with related entities.', recommendation: 'Write sentences that naturally link related concepts and entities together in the same paragraph.', whyItMatters: 'Knowledge graphs are built on entity co-occurrence. Strong entity relationships boost relevance for multi-entity queries.', aiInterpretation: 'Isolated entities miss the relational context needed for AI knowledge graph association.' });
    }

    const summary = issues.length === 0 ? 'Excellent semantic coverage. Entity density and topical authority are strong.' : `${issues.length} semantic coverage gap(s) identified.`;
    return { panelId: 'semantic-coverage', label: 'Semantic Coverage', score, issues, summary };
  }

  // Panel 3: Question Coverage
  private static panelQuestionCoverage(m: ContentMetrics, c: CrawlResult): OptimizerPanel {
    const issues: OptimizerIssue[] = [];
    const score = Math.round((m.questionAnswerability * 0.45 + m.faqCoverage * 0.30 + m.queryCoverage * 0.25) * 100);

    if (!this.hasFAQSection(c)) {
      issues.push({ severity: 'high', title: 'No FAQ Section', description: 'Content lacks a dedicated FAQ section, missing one of the highest-value AEO signals.', recommendation: 'Add a "Frequently Asked Questions" section with 5-8 Q&A pairs covering common user queries about the topic.', whyItMatters: 'FAQ sections are explicitly indexed by Google AI Overview and heavily referenced by ChatGPT for "People Also Ask" answers.', aiInterpretation: 'The absence of FAQ structure significantly reduces eligibility for AI-generated answer snippets.' });
    } else if (c.questions.filter(q => q.endsWith('?')).length < 3) {
      issues.push({ severity: 'medium', title: 'FAQ Section Too Sparse', description: 'FAQ section detected but contains fewer than 3 explicit questions.', recommendation: 'Expand FAQ section to include at least 5 specific questions that users would realistically ask.', whyItMatters: 'A minimal FAQ section provides limited value. AI engines reward comprehensive Q&A coverage.', aiInterpretation: 'Sparse FAQ sections signal low intent to provide comprehensive answers.' });
    }

    const questionHeadings = [...c.h2, ...c.h3].filter(h => /^(what|how|why|when|where|who)/i.test(h) || h.endsWith('?'));
    if (questionHeadings.length === 0) {
      issues.push({ severity: 'medium', title: 'No Question-Based Headings', description: 'None of the H2/H3 headings are framed as questions.', recommendation: 'Reformat at least 3-5 H2 headings as direct questions (e.g., "How Does X Work?" instead of "X Functionality").', whyItMatters: 'Question-formatted headings directly map to user search queries, improving featured snippet eligibility.', aiInterpretation: 'AI engines preferentially extract content under question headings when answering conversational queries.' });
    }

    if (m.queryCoverage < 0.3) {
      issues.push({ severity: 'low', title: 'Low Query Coverage', description: `Content answers approximately ${Math.round(m.queryCoverage * 12)} search queries. Target 8+ distinct query angles.`, recommendation: 'Identify related search queries using tools like Google Search Console and add sections that address each.', whyItMatters: 'Higher query coverage means more entry points from which AI engines can surface this content.', aiInterpretation: 'Low query coverage limits the breadth of search scenarios where this content will be cited.' });
    }

    const summary = issues.length === 0 ? 'Strong question coverage. Content is well-structured for conversational AI queries.' : `${issues.length} question coverage issue(s) reducing AI query answerability.`;
    return { panelId: 'question-coverage', label: 'Question Coverage', score, issues, summary };
  }

  // Panel 4: Heading Analysis
  private static panelHeadingAnalysis(m: ContentMetrics, c: CrawlResult): OptimizerPanel {
    const issues: OptimizerIssue[] = [];
    const score = Math.round(m.headingStructure * 100);

    if (c.h1.length === 0) {
      issues.push({ severity: 'critical', title: 'Missing H1 Tag', description: 'No H1 heading detected. Every page must have exactly one H1.', recommendation: 'Add a clear, descriptive H1 heading at the top of the content that captures the page\'s primary topic.', whyItMatters: 'H1 is the most important structural signal for AI crawlers—it defines the primary context of the entire page.', aiInterpretation: 'Pages without H1 tags are classified as poorly structured and receive lower authority scores.' });
    } else if (c.h1.length > 1) {
      issues.push({ severity: 'high', title: 'Multiple H1 Tags', description: `Found ${c.h1.length} H1 tags. A page should have exactly one H1.`, recommendation: 'Keep only one H1 and demote the others to H2 or H3 as appropriate.', whyItMatters: 'Multiple H1 tags confuse AI search engines about the page\'s primary topic, diluting topical focus.', aiInterpretation: 'Multiple H1 tags signal poor content structure, reducing AI confidence in topic classification.' });
    }

    if (c.h2.length === 0) {
      issues.push({ severity: 'high', title: 'No H2 Subheadings', description: 'Content has no H2 subheadings, making it appear as one large unstructured block.', recommendation: 'Break content into logical sections with descriptive H2 headings every 200-300 words.', whyItMatters: 'H2 headings create chunk boundaries that AI engines use to extract topic-specific answers.', aiInterpretation: 'Unstructured content cannot be chunked effectively for AI answer retrieval.' });
    } else if (c.h2.length < 3 && c.wordCount > 500) {
      issues.push({ severity: 'medium', title: 'Too Few H2 Subheadings', description: `Only ${c.h2.length} H2 heading(s) for ${c.wordCount} words of content. Add more sections.`, recommendation: 'Add one H2 heading per 200-250 words of content to improve scannability and chunk quality.', whyItMatters: 'Adequate H2 density ensures AI engines can extract focused, topic-specific answers from each section.', aiInterpretation: 'Insufficient section headings reduce the granularity of indexable content chunks.' });
    }

    if (c.h3.length === 0 && c.h2.length > 2) {
      issues.push({ severity: 'low', title: 'Missing H3 Depth', description: 'Content has multiple H2 sections but no H3 subsections for additional depth.', recommendation: 'Add H3 headings within complex H2 sections to provide hierarchical structure and topical depth.', whyItMatters: 'H3 headings signal content depth and allow AI engines to extract more granular topic answers.', aiInterpretation: 'Flat heading structure reduces the perceived depth of topic expertise.' });
    }

    // Check heading balance (very long sections without heading)
    const avgWordsPerSection = c.wordCount / Math.max(1, c.h2.length + 1);
    if (avgWordsPerSection > 400) {
      issues.push({ severity: 'low', title: 'Unbalanced Section Lengths', description: `Average section contains ~${Math.round(avgWordsPerSection)} words. Some sections may be too long.`, recommendation: 'Split sections exceeding 300 words into subsections with H3 headings for better structure.', whyItMatters: 'Overly long sections reduce AI chunk precision, making it harder to extract targeted answers.', aiInterpretation: 'Long unstructured sections decrease chunk quality and targeted answer extraction accuracy.' });
    }

    const summary = issues.length === 0 ? 'Heading structure is well-formed with proper hierarchy.' : `${issues.length} heading structure issue(s) affecting AI content indexing.`;
    return { panelId: 'heading-analysis', label: 'Heading Analysis', score, issues, summary };
  }

  // Panel 5: Schema
  private static panelSchema(m: ContentMetrics, c: CrawlResult): OptimizerPanel {
    const issues: OptimizerIssue[] = [];
    const score = Math.round(m.schemaCoverage * 100);
    const schemaTypes = c.jsonLD.map(s => (s['@type'] || '').toLowerCase());

    if (c.jsonLD.length === 0) {
      issues.push({ severity: 'critical', title: 'No JSON-LD Schema Detected', description: 'Page has no structured data markup. This is a major AEO gap.', recommendation: 'Add Article, FAQPage, and BreadcrumbList JSON-LD schemas to the page <head>.', whyItMatters: 'Schema markup is the primary signal that AI search engines use to understand content type, entity relationships, and factual structure.', aiInterpretation: 'Pages without schema are treated as unstructured text, severely limiting AI knowledge graph integration.' });
    } else {
      if (!schemaTypes.some(t => t.includes('article') || t.includes('blogposting') || t.includes('newsarticle'))) {
        issues.push({ severity: 'high', title: 'Missing Article Schema', description: 'No Article, BlogPosting, or NewsArticle schema found.', recommendation: 'Add Article schema with headline, author, datePublished, dateModified, and description fields.', whyItMatters: 'Article schema tells AI engines this is editorial content with an author, publication date, and specific topic—critical for news and knowledge queries.', aiInterpretation: 'Without Article schema, content cannot be classified as authoritative editorial material.' });
      }
      if (!schemaTypes.some(t => t.includes('faqpage') || t.includes('question'))) {
        issues.push({ severity: 'high', title: 'Missing FAQPage Schema', description: 'No FAQPage structured data detected.', recommendation: 'Add FAQPage JSON-LD schema with all Q&A pairs from the FAQ section.', whyItMatters: 'FAQPage schema directly feeds Google AI Overview and enables rich FAQ results in search engines.', aiInterpretation: 'FAQ content without FAQPage schema is not machine-readable for AI answer extraction.' });
      }
      if (!schemaTypes.some(t => t.includes('breadcrumb'))) {
        issues.push({ severity: 'low', title: 'Missing BreadcrumbList Schema', description: 'No breadcrumb structured data found.', recommendation: 'Add BreadcrumbList schema to define the content\'s position in the site hierarchy.', whyItMatters: 'Breadcrumb schema helps AI engines understand content hierarchy and navigational context.', aiInterpretation: 'Without breadcrumb data, AI cannot infer the categorical context of the content.' });
      }
    }

    // Validate JSON-LD for basic errors
    c.jsonLD.forEach((schema, idx) => {
      if (!schema['@context']) {
        issues.push({ severity: 'medium', title: `Schema #${idx + 1} Missing @context`, description: 'A JSON-LD block is missing the required @context field.', recommendation: 'Add "@context": "https://schema.org" to all JSON-LD schema objects.', whyItMatters: 'Schemas without @context are invalid and will be ignored by search engines.', aiInterpretation: 'Invalid schema markup is treated as absent by AI search indexers.' });
      }
    });

    const summary = issues.length === 0 ? 'Excellent schema coverage with all key structured data types present.' : `${issues.length} schema issue(s) reducing AI machine-readability.`;
    return { panelId: 'schema', label: 'Schema', score, issues, summary };
  }

  // Panel 6: Internal Linking
  private static panelInternalLinking(m: ContentMetrics, c: CrawlResult): OptimizerPanel {
    const issues: OptimizerIssue[] = [];
    const score = Math.round(m.internalLinks * 100);

    if (c.internalLinks.length === 0) {
      issues.push({ severity: 'high', title: 'No Internal Links', description: 'Content contains no internal links to other pages.', recommendation: 'Add 3-5 contextual internal links to related articles, product pages, or category pages.', whyItMatters: 'Internal linking distributes PageRank and helps AI engines understand site topic clusters and content relationships.', aiInterpretation: 'Isolated pages without internal links are harder for AI to associate with broader topic authority clusters.' });
    } else if (c.internalLinks.length < 3) {
      issues.push({ severity: 'medium', title: 'Insufficient Internal Links', description: `Only ${c.internalLinks.length} internal link(s). Aim for 3-5 contextual internal links.`, recommendation: 'Add more internal links to related content using descriptive anchor text.', whyItMatters: 'Strong internal linking signals topical depth and helps distribute authority across related content.', aiInterpretation: 'Low internal link density reduces topical cluster signals for AI search indexing.' });
    }

    const genericAnchors = c.internalLinks.filter(l => /^(click here|read more|here|this|learn more|see more)$/i.test(l.text.trim()));
    if (genericAnchors.length > 0) {
      issues.push({ severity: 'low', title: 'Generic Anchor Text', description: `${genericAnchors.length} internal link(s) use generic anchor text like "click here" or "read more".`, recommendation: 'Replace generic anchors with descriptive keyword-rich text that describes the linked content.', whyItMatters: 'Descriptive anchor text provides AI engines with context about both the linking and linked page topics.', aiInterpretation: 'Generic anchor text provides zero topical context to AI search indexers.' });
    }

    const summary = issues.length === 0 ? 'Internal linking is adequate with descriptive anchor text.' : `${issues.length} internal linking improvement(s) recommended.`;
    return { panelId: 'internal-linking', label: 'Internal Linking', score, issues, summary };
  }

  // Panel 7: External Authority
  private static panelExternalAuthority(m: ContentMetrics, c: CrawlResult): OptimizerPanel {
    const issues: OptimizerIssue[] = [];
    const score = Math.round((m.citationQuality * 0.5 + m.externalReferences * 0.5) * 100);

    if (c.externalLinks.length === 0) {
      issues.push({ severity: 'high', title: 'No External Citations', description: 'Content has no links to external sources or references.', recommendation: 'Add 3-5 citations to authoritative external sources (research papers, official documentation, reputable sites).', whyItMatters: 'AI search engines like Perplexity heavily weight externally-referenced content as it signals research quality and factual grounding.', aiInterpretation: 'Content without citations appears opinion-based rather than fact-based, reducing citation probability.' });
    } else if (c.externalLinks.length < 3) {
      issues.push({ severity: 'medium', title: 'Low Citation Count', description: `Only ${c.externalLinks.length} external link(s). Authoritative content typically references 5+ sources.`, recommendation: 'Add more citations to diverse, high-authority sources to strengthen credibility signals.', whyItMatters: 'Citation diversity signals comprehensive research and increases trust signals for AI search engines.', aiInterpretation: 'Few citations reduce the factual authority score assigned by research-oriented AI engines.' });
    }

    const uniqueDomains = new Set(c.externalLinks.map(l => { try { return new URL(l.href).hostname; } catch { return ''; } }));
    if (uniqueDomains.size < 2 && c.externalLinks.length >= 3) {
      issues.push({ severity: 'low', title: 'Low Citation Diversity', description: 'External links point to only one or two domains, reducing citation diversity.', recommendation: 'Reference multiple authoritative sources from different domains to demonstrate thorough research.', whyItMatters: 'Citation diversity signals broad research scope, increasing AI confidence in content accuracy.', aiInterpretation: 'Single-source citations are treated as potentially biased by AI fact-checking systems.' });
    }

    const summary = issues.length === 0 ? 'External authority signals are strong with diverse, quality citations.' : `${issues.length} external authority gap(s) identified.`;
    return { panelId: 'external-authority', label: 'External Authority', score, issues, summary };
  }

  // Panel 8: Metadata
  private static panelMetadata(m: ContentMetrics, c: CrawlResult): OptimizerPanel {
    const issues: OptimizerIssue[] = [];
    let metaScore = 0;

    const titleLen = c.metaTitle.length;
    if (titleLen === 0) {
      issues.push({ severity: 'critical', title: 'Missing Meta Title', description: 'Page has no meta title tag.', recommendation: 'Add a meta title between 50-60 characters that includes the primary keyword.', whyItMatters: 'Meta title is the first element AI search engines read to determine page topic and relevance.', aiInterpretation: 'Pages without titles are given lowest priority in AI search index ranking.' });
    } else if (titleLen < 30) {
      issues.push({ severity: 'high', title: 'Meta Title Too Short', description: `Meta title is ${titleLen} characters. Optimal is 50-60 characters.`, recommendation: 'Expand the title to include the primary keyword and a compelling descriptor.', whyItMatters: 'Short titles miss the opportunity to signal full topic coverage to AI engines.', aiInterpretation: 'Short titles reduce topic classification precision for AI indexers.' });
      metaScore += 10;
    } else if (titleLen > 70) {
      issues.push({ severity: 'medium', title: 'Meta Title Too Long', description: `Meta title is ${titleLen} characters. Google truncates at ~60 characters.`, recommendation: 'Shorten the title to 50-60 characters while retaining the primary keyword near the front.', whyItMatters: 'Truncated titles lose essential keyword context in search result displays.', aiInterpretation: 'Overly long titles may indicate keyword stuffing, which AI engines penalise.' });
      metaScore += 20;
    } else {
      metaScore += 30;
    }

    const descLen = c.metaDescription.length;
    if (descLen === 0) {
      issues.push({ severity: 'high', title: 'Missing Meta Description', description: 'Page has no meta description.', recommendation: 'Add a compelling meta description of 150-160 characters summarizing the page content.', whyItMatters: 'Meta descriptions provide AI engines with a pre-parsed summary of page content.', aiInterpretation: 'Pages without descriptions force AI engines to generate their own summaries, often with less accuracy.' });
    } else if (descLen < 100) {
      issues.push({ severity: 'medium', title: 'Meta Description Too Short', description: `Meta description is only ${descLen} characters. Optimal is 150-160 characters.`, recommendation: 'Expand the description to include key terms, benefits, and a call-to-action.', whyItMatters: 'Short descriptions leave context gaps that AI engines fill with potentially inaccurate inferences.', aiInterpretation: 'Thin descriptions reduce AI confidence in topic classification.' });
      metaScore += 10;
    } else {
      metaScore += 25;
    }

    if (!c.canonicalUrl) {
      issues.push({ severity: 'low', title: 'Missing Canonical Tag', description: 'No canonical URL specified.', recommendation: 'Add <link rel="canonical" href="..."> pointing to the preferred URL for this content.', whyItMatters: 'Canonical tags prevent duplicate content issues and consolidate ranking signals for AI indexers.', aiInterpretation: 'Without canonical tags, AI engines may index multiple versions of the same content, splitting authority.' });
    } else {
      metaScore += 20;
    }

    const ogFields = Object.keys(c.ogTags);
    if (ogFields.length < 3) {
      issues.push({ severity: 'low', title: 'Incomplete Open Graph Tags', description: `Only ${ogFields.length} OG tag(s) found. Complete OG markup improves social sharing and AI metadata extraction.`, recommendation: 'Add og:title, og:description, og:image, og:type, and og:url tags.', whyItMatters: 'OG tags provide structured metadata used by AI systems to classify and summarize content.', aiInterpretation: 'Incomplete OG metadata reduces content discoverability in AI-powered social search.' });
    } else {
      metaScore += 15;
    }

    const summary = issues.length === 0 ? 'Metadata is complete and well-optimized.' : `${issues.length} metadata issue(s) affecting AI search visibility.`;
    return { panelId: 'metadata', label: 'Metadata', score: Math.min(100, metaScore), issues, summary };
  }

  // Panel 9: Images
  private static panelImages(m: ContentMetrics, c: CrawlResult): OptimizerPanel {
    const issues: OptimizerIssue[] = [];
    let imgScore = 70; // base

    if (c.images.length === 0) {
      issues.push({ severity: 'medium', title: 'No Images Found', description: 'Content contains no images. Visual content improves engagement and AI multimodal indexing.', recommendation: 'Add relevant images, diagrams, or charts to illustrate key concepts.', whyItMatters: 'AI search engines increasingly support multimodal content. Images improve user engagement signals and content richness.', aiInterpretation: 'Text-only content is less likely to be surfaced in visual AI search features.' });
      imgScore = 40;
    } else {
      const missingAlt = c.images.filter(img => !img.alt || img.alt.trim().length < 3);
      if (missingAlt.length > 0) {
        issues.push({ severity: 'high', title: `${missingAlt.length} Image(s) Missing ALT Text`, description: `${missingAlt.length} of ${c.images.length} images have no ALT text, making them invisible to AI search engines.`, recommendation: 'Add descriptive ALT text to all images. Include relevant keywords naturally.', whyItMatters: 'ALT text is the primary way AI engines understand image content and connect visuals to text context.', aiInterpretation: 'Images without ALT text are inaccessible to AI indexers and cannot be associated with related queries.' });
        imgScore -= missingAlt.length * 10;
      }

      const missingCaption = c.images.filter(img => !img.caption || img.caption.trim().length < 5);
      if (missingCaption.length > c.images.length * 0.5) {
        issues.push({ severity: 'low', title: 'Images Missing Captions', description: 'Most images lack captions, missing an opportunity for additional contextual content.', recommendation: 'Add descriptive captions to key images, explaining what they show and why they are relevant.', whyItMatters: 'Image captions provide additional text context that AI engines use to associate images with topic queries.', aiInterpretation: 'Uncaptioned images lose a significant contextual content opportunity for AI indexing.' });
        imgScore -= 10;
      }
    }

    const summary = issues.length === 0 ? 'Image optimization is complete with proper ALT text and captions.' : `${issues.length} image optimization issue(s) detected.`;
    return { panelId: 'images', label: 'Images', score: Math.max(0, Math.min(100, imgScore)), issues, summary };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private static hasFAQSection(c: CrawlResult): boolean {
    const allHeadings = [...c.h1, ...c.h2, ...c.h3].map(h => h.toLowerCase());
    const hasFAQHeading = allHeadings.some(h => h.includes('faq') || h.includes('frequently asked') || h.includes('common question'));
    const hasFAQInText = c.paragraphs.join(' ').toLowerCase().includes('frequently asked') || c.paragraphs.join(' ').toLowerCase().includes('faq');
    const hasJsonLDFAQ = c.jsonLD.some(s => (s['@type'] || '').toLowerCase().includes('faq'));
    return hasFAQHeading || hasFAQInText || hasJsonLDFAQ;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}
