import OpenAI from 'openai';
import { env } from '../config/env';

// Initialize xAI API client if key is available
const xai = env.XAI_API_KEY ? new OpenAI({
  apiKey: env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
  timeout: 20000,
}) : null;

// Initialize OpenAI API client if key is available
const openai = env.OPENAI_API_KEY ? new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  timeout: 20000,
}) : null;

// Initialize Gemini API client using OpenAI compatibility layer
const gemini = env.GEMINI_API_KEY ? new OpenAI({
  apiKey: env.GEMINI_API_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
  timeout: 20000,
}) : null;

// Determine active provider
const getAIProvider = () => {
  if (xai) return 'grok';
  if (openai) return 'openai';
  if (gemini) return 'gemini';
  return 'simulation';
};

export class AIService {
  /**
   * Generates a float array embedding vector for a piece of text.
   * Dim: 768 for Simulation.
   * Note: xAI does not support raw text embeddings, so we fall back to simulation embeddings.
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    const provider = getAIProvider();

    try {
      if (provider === 'grok') {
        console.warn(`[xAI Service] xAI (Grok) API does not support raw text embedding generation. Falling back to stable simulation embeddings.`);
      }
    } catch (error) {
      console.error(`[xAI Service] Embedding configuration check failed. Falling back to simulation.`, error);
    }

    // Simulation Fallback: Hash-based stable embedding generator
    return this.generateSimulatedEmbedding(text);
  }

  /**
   * Performs content structure, grammar, readability, and readiness checks.
   */
  static async analyzeContent(
    title: string,
    content: string,
    crawlMeta?: {
      h1?: string[];
      h2?: string[];
      h3?: string[];
      metaDescription?: string;
      entities?: string[];
      topics?: string[];
    }
  ): Promise<{
    aiScore: number;
    suggestions: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }>;
    gapAnalysis: { missingKeywords: string[]; missingTopics: string[]; missingSections: string[] };
    recommendations: string[];
  }> {
    const provider = getAIProvider();

    const systemPrompt = `You are an expert AI Search Engine Optimization (AEO) Auditor. 
Analyze the following article for AI search readiness (Grammar, Readability, Heading Structure, Keywords, and Semantic Coverage).
Respond ONLY with a JSON object in this format:
{
  "aiScore": 85,
  "suggestions": [
    { "type": "Readability", "message": "Shorten complex paragraphs to improve readability.", "severity": "medium" }
  ],
  "gapAnalysis": {
    "missingKeywords": ["AEO tools", "semantic relevance"],
    "missingTopics": ["How AI Search crawlers index content"],
    "missingSections": ["FAQ Section explaining crawler operations"]
  },
  "recommendations": [
    "Add a FAQ summary at the end.",
    "Define terms clearly near the top."
  ]
}`;

    const userPrompt = `Title: ${title}\nContent:\n${content}`;

    if (provider === 'grok' && xai) {
      try {
        console.log(`[xAI Service] Requesting analyzeContent from Grok API using model grok-latest...`);
        const result = await xai.chat.completions.create({
          model: 'grok-latest',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        });

        const textResult = result.choices[0].message.content || '';
        const parsed = JSON.parse(textResult);
        if (parsed && typeof parsed.aiScore === 'number') {
          return parsed;
        }
      } catch (error) {
        console.error('[xAI Service] Real AI Analysis failed. Using simulation fallback.', error);
      }
    }

    // Simulation Fallback — uses crawlMeta when available for richer keyword analysis
    return this.generateSimulatedAnalysis(title, content, crawlMeta);
  }

  /**
   * Predicts search visibility in AI engines (Gemini, ChatGPT, Perplexity).
   */
  static async predictVisibility(title: string, content: string): Promise<{
    visibilityScore: number;
    confidenceScore: number;
    recommendations: string[];
  }> {
    const provider = getAIProvider();

    const systemPrompt = `You are an AI Search Visibility Predictor. Estimate how likely this content is to be cited as a source by conversational search engines (Gemini, Perplexity, OpenAI Search).
Respond ONLY with a JSON object in this format:
{
  "visibilityScore": 78,
  "confidenceScore": 0.88,
  "recommendations": [
    "Integrate schema markup formats implicitly in descriptions.",
    "Answer direct who/what/how questions clearly."
  ]
}`;

    const userPrompt = `Title: ${title}\nContent:\n${content}`;

    if (provider === 'grok' && xai) {
      try {
        console.log(`[xAI Service] Requesting predictVisibility from Grok API using model grok-latest...`);
        const result = await xai.chat.completions.create({
          model: 'grok-latest',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        });

        const textResult = result.choices[0].message.content || '';
        const parsed = JSON.parse(textResult);
        if (parsed && typeof parsed.visibilityScore === 'number') {
          return parsed;
        }
      } catch (error) {
        console.error('[xAI Service] Real AI Visibility prediction failed. Using simulation.', error);
      }
    }

    // Simulation Fallback
    const wordCount = content.split(/\s+/).length;
    const hasFAQ = content.toLowerCase().includes('faq') || content.toLowerCase().includes('frequently asked');
    const visibilityScore = Math.min(100, Math.max(30, Math.floor((wordCount / 300) * 10 + (hasFAQ ? 25 : 10) + Math.random() * 15)));
    return {
      visibilityScore,
      confidenceScore: parseFloat((0.6 + Math.random() * 0.35).toFixed(2)),
      recommendations: [
        hasFAQ ? 'Extend your FAQ section to cover alternative semantic phrasings.' : 'Add a FAQ section to address conversational questions.',
        'Include statistics or research findings; AI engines prioritize citation of quantitative facts.',
        'Use bullet points to summarize procedures. Natural language processors index lists easily.'
      ],
    };
  }

  /**
   * One-click Optimization rewriter
   */
  static async optimizeContent(title: string, content: string, action: string): Promise<string> {
    const provider = getAIProvider();

    const prompts: Record<string, string> = {
      HEADINGS: 'Rewrite the headings in this content to be descriptive, question-focused, and rich in semantic value. Maintain the main text paragraphs.',
      READABILITY: 'Simplify the language, shorten complex sentences, and break down dense paragraphs to optimize readability without losing details.',
      INTRO: 'Rewrite the introduction to be highly engaging, clear, and direct. State the main thesis immediately so AI engines can parse the summary.',
      CONCLUSION: 'Generate a strong conclusion summarizing key take-aways and listing an actionable summary.',
      FAQ: 'Generate a comprehensive Frequently Asked Questions (FAQ) section based on the content. Structure it with Q&As that searchers might prompt.',
      STRUCTURE: 'Improve the overall structural flow of the text, ordering arguments logically with clear transition statements.'
    };

    const optimizationRequest = prompts[action] || prompts.READABILITY;
    const systemPrompt = `You are an AI optimization assistant. Apply the following request to the article. Return ONLY the fully revised article content. Keep markdown formatting.
Request: ${optimizationRequest}`;

    const userPrompt = `Title: ${title}\nContent:\n${content}`;

    if (provider === 'grok' && xai) {
      try {
        console.log(`[xAI Service] Requesting optimizeContent (${action}) from Grok API using model grok-latest...`);
        const result = await xai.chat.completions.create({
          model: 'grok-latest',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        });

        const textResult = result.choices[0].message.content || '';
        if (textResult && textResult.trim().length > 0) {
          return textResult.trim();
        }
      } catch (error) {
        console.error('[xAI Service] Real AI Optimization failed. Using simulation.', error);
      }
    }

    // Simulation Fallback
    return this.generateSimulatedOptimization(title, content, action);
  }

  /**
   * Simple TF-IDF overlap retrieval helper for RAG context.
   * Splits content into sections and filters to the top 3 most relevant matches.
   */
  static retrieveRelevantContext(content: string, query: string): string {
    if (!content) return '';
    
    // Split by headings or multiple line breaks
    const sections = content.split(/(?=\n#{1,6}\s+)|\n\n+/).map(s => s.trim()).filter(Boolean);
    console.log('[RAG Pipeline LOG] Chunks created from crawled content. Count:', sections.length);
    if (sections.length <= 3) {
      return content;
    }

    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (queryWords.length === 0) {
      console.log('[RAG Pipeline LOG] Empty search query. Returning first 3 fallback chunks.');
      return sections.slice(0, 3).join('\n\n');
    }

    const scored = sections.map(sec => {
      const secLower = sec.toLowerCase();
      let score = 0;
      queryWords.forEach(word => {
        if (secLower.includes(word)) {
          if (sec.startsWith('#') && secLower.split('\n')[0].includes(word)) {
            score += 3;
          } else {
            score += 1;
          }
        }
      });
      return { section: sec, score };
    });

    scored.sort((a, b) => b.score - a.score);
    console.log('[RAG Pipeline LOG] Keyword overlap similarity search completed.');
    const topSections = scored.slice(0, 3).map(s => s.section);
    return topSections.join('\n\n');
  }

  /**
   * Chat with single article content (RAG Context)
   */
  static async chatWithContent(
    articleTitle: string,
    articleContent: string,
    chatHistory: Array<{ role: string; content: string }>,
    userQuery: string
  ): Promise<string> {
    const provider = getAIProvider();

    if (provider === 'simulation') {
      console.warn('[RAG Pipeline LOG] No AI provider configured. Using simulated chat response.');
      return this.generateSimulatedChatResponse(articleTitle, articleContent, userQuery);
    }

    // Retrieve context sections
    const relevantContext = this.retrieveRelevantContext(articleContent, userQuery);
    console.log('[RAG Pipeline LOG] Context retrieved successfully. Selected chunks content size:', relevantContext.length);

    const systemPrompt = `You are ContentIQ Chatbot, an expert AI analyst. 
You are chatting with a user about their website article: "${articleTitle}".

Strict Instructions:
1. You must answer questions based ONLY on the content crawled from the user's website provided below in the ARTICLE CONTENT section.
2. Do NOT use your general knowledge if the requested information is not available in the provided article content.
3. If the answer is not present or cannot be directly inferred from the provided article content, you MUST respond exactly with:
"I couldn't find this information in the current website content."
Do not make up any information or answer using general knowledge in this case.
4. Ground your answers in the crawled content. Whenever possible, indicate which heading, section, or paragraph of the crawled website was used to generate the answer.
5. Keep your responses concise, structured, helpful, and formatted in Markdown.

---
ARTICLE CONTENT:
${relevantContext}
---`;

    const formattedMessages = chatHistory.map(h => ({
      role: h.role === 'user' ? 'user' as const : 'assistant' as const,
      content: h.content,
    }));

    let client: OpenAI | null = null;
    let model = '';

    if (provider === 'grok' && xai) {
      client = xai;
      model = 'grok-latest';
    } else if (provider === 'openai' && openai) {
      client = openai;
      model = 'gpt-4o-mini';
    } else if (provider === 'gemini' && gemini) {
      client = gemini;
      model = 'gemini-2.5-flash';
    }

    if (!client) {
      throw new Error(`AI Client initialization failed for provider: ${provider}`);
    }

    try {
      console.log('[RAG Pipeline LOG] Dispatching chat request to LLM using model:', model);
      
      const result = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...formattedMessages,
          { role: 'user', content: userQuery },
        ],
      });

      const replyText = result.choices[0].message.content || '';
      if (!replyText.trim()) {
        throw new Error('Received empty response from the AI provider.');
      }

      console.log('[RAG Pipeline LOG] Grok/LLM response received successfully. Length:', replyText.trim().length);
      return replyText.trim();
    } catch (error) {
      console.error('[RAG Pipeline ERROR] Real AI Chat failed. Using simulation fallback.', error);
      return this.generateSimulatedChatResponse(articleTitle, articleContent, userQuery);
    }
  }

  /**
   * Search answer using retrieved articles
   */
  static async searchAnswer(query: string, referencedArticles: Array<{ title: string; content: string }>): Promise<string> {
    const provider = getAIProvider();

    const contextStr = referencedArticles.map((art, idx) => `[Source ${idx + 1}] Title: ${art.title}\nContent:\n${art.content.substring(0, 1000)}`).join('\n\n');

    const systemPrompt = `You are ContentIQ Semantic Search engine. Answer the user's natural language query using the referenced articles below. 
You must cite your sources inline using [Source 1], [Source 2] etc., where appropriate. 
If the referenced sources do not contain the answer, say that you couldn't find the information but provide a general answer based on your capabilities. Keep it professional.`;

    const userPrompt = `Query: ${query}\n\nSources:\n${contextStr || 'No relevant articles found in the database.'}`;

    if (provider === 'grok' && xai) {
      try {
        console.log(`[xAI Service] Requesting searchAnswer from Grok API using model grok-latest...`);
        const result = await xai.chat.completions.create({
          model: 'grok-latest',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        });
        const textResult = result.choices[0].message.content || '';
        if (textResult && textResult.trim().length > 0) {
          return textResult.trim();
        }
      } catch (error) {
        console.error('[xAI Service] Real AI Search answer failed. Using simulation.', error);
      }
    }

    // Simulation Fallback
    return this.generateSimulatedSearchAnswer(query, referencedArticles);
  }

  // --- HELPERS & SIMULATORS ---

  private static generateSimulatedEmbedding(text: string): number[] {
    const embeddingSize = 768;
    const embedding: number[] = [];
    // Stable hash calculation to generate identical embeddings for the same text
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }

    for (let i = 0; i < embeddingSize; i++) {
      const val = Math.sin(hash + i) * Math.cos(hash - i);
      embedding.push(parseFloat(val.toFixed(6)));
    }
    return embedding;
  }

  /**
   * Extract the top meaningful terms from content using TF-IDF-style scoring.
   * Title and heading terms get a positional boost (3x weight).
   * Returns the top N unique terms sorted by importance.
   */
  private static extractTopContentTerms(
    content: string,
    title: string,
    headings: string[] = [],
    topN = 30
  ): string[] {
    // Common English stopwords to exclude
    const STOPWORDS = new Set([
      'the','a','an','and','or','but','in','on','at','to','for','of','with',
      'by','from','is','are','was','were','be','been','being','have','has',
      'had','do','does','did','will','would','could','should','may','might',
      'must','shall','can','need','dare','this','that','these','those','it',
      'its','they','them','their','we','our','you','your','he','his','she',
      'her','not','no','nor','so','yet','both','either','whether','as','if',
      'then','than','when','while','because','since','although','though',
      'after','before','until','unless','however','therefore','thus','hence',
      'also','too','very','just','only','even','still','more','most','such',
      'some','any','all','each','every','many','much','few','little','other',
      'another','same','like','how','what','which','who','where','there','here',
      'about','into','through','during','including','between','across','against',
      'among','throughout','now','use','used','using','make','made','get','got',
      'new','one','two','three','way','ways','part','parts','type','types',
    ]);

    // Tokenize content + title + headings into words
    const allText = content + ' ' + title + ' ' + headings.join(' ');
    const tokens = allText
      .toLowerCase()
      .replace(/[^a-z0-9\s\-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 4 && !STOPWORDS.has(w) && !/^\d+$/.test(w));

    // Build frequency map for body content only
    const bodyTokens = content
      .toLowerCase()
      .replace(/[^a-z0-9\s\-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 4 && !STOPWORDS.has(w) && !/^\d+$/.test(w));

    const freqMap: Record<string, number> = {};
    for (const tok of bodyTokens) {
      freqMap[tok] = (freqMap[tok] || 0) + 1;
    }

    // Build a set of title + heading terms for positional boosting
    const priorityTerms = new Set(
      (title + ' ' + headings.join(' '))
        .toLowerCase()
        .replace(/[^a-z0-9\s\-]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 4 && !STOPWORDS.has(w))
    );

    // Score each unique term: TF × position_boost
    const totalTokens = bodyTokens.length || 1;
    const scored: Array<{ term: string; score: number }> = Object.entries(freqMap).map(([term, freq]) => {
      const tf = freq / totalTokens;
      const boost = priorityTerms.has(term) ? 3.0 : 1.0;
      return { term, score: tf * boost * 1000 }; // scale up for readability
    });

    scored.sort((a, b) => b.score - a.score);

    // Return the top N unique terms, capitalize first letter for display
    return scored
      .slice(0, topN)
      .map(s => s.term.charAt(0).toUpperCase() + s.term.slice(1));
  }

  /**
   * Content-aware dynamic missing keyword detection.
   * Finds important body terms that are underrepresented in key SEO positions
   * (title, H1 headings, meta description).
   */
  private static findMissingKeywords(
    topTerms: string[],
    title: string,
    headings: string[],
    metaDescription: string
  ): string[] {
    // Combine all key SEO position text
    const keyPositionText = (title + ' ' + headings.join(' ') + ' ' + metaDescription).toLowerCase();

    // A term is "missing from key positions" if it appears in content
    // but NOT in any of: title, H1 headings, or meta description
    const missingFromKeyPositions = topTerms.filter(term => {
      const termLower = term.toLowerCase();
      // Check if term (or its stem) appears in key positions
      return !keyPositionText.includes(termLower);
    });

    // Return max 8 terms to keep the list actionable
    return missingFromKeyPositions.slice(0, 8);
  }

  private static generateSimulatedAnalysis(
    title: string,
    content: string,
    crawlMeta?: {
      h1?: string[];
      h2?: string[];
      h3?: string[];
      metaDescription?: string;
      entities?: string[];
      topics?: string[];
    }
  ) {
    const wordCount = content.split(/\s+/).length;
    const hasHeadings = /^#{1,6}\s/m.test(content) ||
      (crawlMeta && ((crawlMeta.h1?.length ?? 0) > 0 || (crawlMeta.h2?.length ?? 0) > 0));
    const hasFAQ = /faq|frequently asked|common question/i.test(content);

    // Gather heading text for keyword analysis
    const headings: string[] = [
      ...(crawlMeta?.h1 || []),
      ...(crawlMeta?.h2 || []),
      ...(crawlMeta?.h3 || []),
      // Extract headings from markdown content
      ...content.split('\n').filter(l => /^#{1,6}\s/.test(l)).map(l => l.replace(/^#{1,6}\s+/, '').trim()),
    ];

    const metaDescription = crawlMeta?.metaDescription || '';

    // Create realistic grading
    let baseScore = 60;
    const suggestions: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }> = [];

    if (wordCount > 600) {
      baseScore += 10;
    } else if (wordCount > 300) {
      baseScore += 5;
    } else {
      suggestions.push({
        type: 'Content Length',
        message: `Content is short (${wordCount} words). Expand to 800+ words to increase AI search index weight.`,
        severity: 'medium',
      });
    }

    if (hasHeadings) {
      baseScore += 15;
    } else {
      suggestions.push({
        type: 'Heading Structure',
        message: 'No heading structure detected. AI crawlers require H1–H3 headings to understand content hierarchy.',
        severity: 'high',
      });
    }

    if (hasFAQ) {
      baseScore += 8;
    } else {
      suggestions.push({
        type: 'FAQ Coverage',
        message: 'No FAQ section detected. Adding a FAQ improves answer engine citation probability by up to 35%.',
        severity: 'medium',
      });
    }

    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const avgSentenceLength = sentences.length > 0 ? wordCount / sentences.length : 0;
    if (avgSentenceLength > 20) {
      baseScore -= 8;
      suggestions.push({
        type: 'Readability',
        message: `Average sentence length is ${Math.round(avgSentenceLength)} words. Shorten to under 18 words for better AI parsing.`,
        severity: 'low',
      });
    }

    if (!metaDescription || metaDescription.trim().length < 50) {
      baseScore -= 5;
      suggestions.push({
        type: 'Meta Description',
        message: 'Meta description is missing or too short. A descriptive meta (120–160 chars) improves AI engine snippet generation.',
        severity: 'medium',
      });
    }

    // ── Dynamic Content-Aware Keyword Gap Analysis ──────────────────────────
    // Extract top meaningful terms from the actual page content
    const topContentTerms = this.extractTopContentTerms(content, title, headings, 25);

    // Identify terms present in the content body but missing from key SEO positions
    const missingKeywords = this.findMissingKeywords(topContentTerms, title, headings, metaDescription);

    // If content is very short or sparse, provide an explanatory message
    const noGapsMessage = missingKeywords.length === 0
      ? [] // empty → frontend shows "No important keyword gaps detected"
      : missingKeywords;

    // Build dynamic missing topics from entities + content analysis
    const entities = crawlMeta?.entities || [];
    const topics = crawlMeta?.topics || headings.slice(0, 3);

    const hasTables = /\|.+\|.+\|/.test(content) || content.includes('<table');
    const hasStats = /\d+%|\$\d+|\d+x|\d+\s*(percent|times|users|visits|conversions)/i.test(content);
    const hasInternalLinks = /\[.+\]\(\/.+\)/.test(content);

    const missingTopics: string[] = [];
    if (!hasTables && wordCount > 400) missingTopics.push('Comparative data tables or structured comparisons');
    if (!hasStats) missingTopics.push('Quantitative statistics or research findings to support claims');
    if (topics.length < 3) missingTopics.push('Broader topic coverage across related subject areas');
    if (entities.length < 3) missingTopics.push('Named entities and specific references for knowledge graph signals');

    const missingSections: string[] = [];
    if (!hasFAQ) missingSections.push('FAQ section addressing common user questions');
    if (!/conclusion|summary|takeaway|key point/i.test(content)) missingSections.push('Conclusion or Key Takeaways summary block');
    if (!hasInternalLinks) missingSections.push('Internal linking to related content for topical authority');

    // Score boost based on content quality signals
    if (hasTables) baseScore += 3;
    if (hasStats) baseScore += 4;
    baseScore = Math.min(96, Math.max(38, baseScore));

    // Build dynamic recommendations from findings
    const recommendations: string[] = [
      'Structure headings as direct questions to improve conversational AI citation rates.',
      'Use bullet-point summaries for key information to maximize AI crawler parsing speed.',
    ];
    if (noGapsMessage.length > 0) {
      recommendations.push(`Incorporate these high-value terms into your title, headings, and meta description: ${noGapsMessage.slice(0, 3).join(', ')}.`);
    } else {
      recommendations.push('Key terms are well-distributed across your title and headings. Focus on adding supporting statistics.');
    }
    if (!hasFAQ) recommendations.push('Add a FAQ section with 4–6 common questions answered directly below each heading.');

    console.log(`[AI Service] Dynamic keyword gap analysis: ${noGapsMessage.length} missing keywords identified from ${topContentTerms.length} top content terms.`);

    return {
      aiScore: baseScore,
      suggestions,
      gapAnalysis: {
        missingKeywords: noGapsMessage,
        missingTopics: missingTopics.slice(0, 3),
        missingSections: missingSections.slice(0, 3),
      },
      recommendations,
    };
  }

  private static generateSimulatedOptimization(title: string, content: string, action: string): string {
    const lines = content.split('\n');

    switch (action) {
      case 'HEADINGS':
        // Rewrites paragraphs starting with # or ##
        return lines.map(line => {
          if (line.startsWith('# ')) {
            return `# How Can We Optimize ${line.replace('# ', '')} for AI Search Engines?`;
          } else if (line.startsWith('## ')) {
            return `## What is the Core Method of ${line.replace('## ', '')}?`;
          }
          return line;
        }).join('\n');

      case 'READABILITY':
        return `*Optimized for Readability*:\n\n` + lines.map(line => {
          if (line.length > 50 && !line.startsWith('#')) {
            return line.replace(/, and /g, '. Furthermore, ').replace(/ because /g, '. This is because ');
          }
          return line;
        }).join('\n');

      case 'INTRO':
        return `## Introduction: Navigating AEO Optimization

Optimizing content for Artificial Intelligence Search Engines (AEO) is now a core requirement for modern digital visibility. This article examines key pathways to restructure, enhance, and scale content relevance. By implementing structural clarity and semantic integrity, content can secure premium citation placements across conversational LLM engines.

\n` + content;

      case 'CONCLUSION':
        return content + `\n\n## Summary & Strategic Conclusion

In summary, AEO success depends on structured schema mapping, explicit query answering, and rich keyword distribution. Restructuring legacy content to fit conversational patterns guarantees visibility in modern search environments. Implement these guidelines immediately to see citation growth.`;

      case 'FAQ':
        return content + `\n\n## Frequently Asked Questions

### What is AEO (Answer Engine Optimization)?
Answer Engine Optimization is the process of formatting, tuning, and structuring copy so AI-powered tools (ChatGPT, Gemini, Perplexity) retrieve it as a primary source for conversational answers.

### Why is semantic keyword depth essential?
Unlike traditional engines mapping keyword strings, AI search engines analyze content contextually, evaluating broad topics, FAQs, and synonyms.

### How do headers influence AI crawler indexation?
H1, H2, and H3 headers serve as semantic indicators. Structuring headings as direct questions facilitates indexing of subsequent text blocks.`;

      case 'STRUCTURE':
        return `> **AEO Executive Notice:** *This document has been restructured to maximize indexation weights.*\n\n` + content;

      default:
        return content;
    }
  }

  private static generateSimulatedChatResponse(title: string, content: string, query: string): string {
    const lowercaseQuery = query.toLowerCase();
    const lowercaseContent = (content || '').toLowerCase();
    const lowercaseTitle = (title || '').toLowerCase();

    // Check if query is related to the content or common features
    const commonTopics = [
      'summarize', 'summary', 'faq', 'question', 'readability', 'keywords', 
      'topics', 'improve', 'heading', 'title', 'meta', 'takeaway', 'point', 
      'service', 'main topic', 'weak', 'seo', 'aeo', 'simple'
    ];
    const hasTopic = commonTopics.some(topic => lowercaseQuery.includes(topic));
    
    const queryWords = lowercaseQuery.split(/\s+/).filter(w => w.length > 3);
    const hasWordOverlap = queryWords.some(word => lowercaseContent.includes(word) || lowercaseTitle.includes(word));

    if (!hasTopic && !hasWordOverlap) {
      return `This information is not available in the current website content.`;
    }

    if (lowercaseQuery.includes('summarize') || lowercaseQuery.includes('summary') || lowercaseQuery.includes('main topic')) {
      return `### Content Summary: **${title}**

Based on the crawled website content of **${title}**:
* **Main Core Topic**: The document discusses digital marketing, optimization methodologies, and pathways to align written content with AI semantic crawl patterns.
* **Key Observations**: Structuring pages clearly, improving readability indexes, and answering intent directly.
* **Source Reference**: Extracted from the main body content of the webpage.`;
    }

    if (lowercaseQuery.includes('faq') || lowercaseQuery.includes('frequently asked') || lowercaseQuery.includes('question')) {
      return `### Suggested FAQs for: **${title}**

Based on the crawled website content:
* **Q: What is the main thesis outlined in this page?**
  * *A*: The page details strategies to improve visibility in conversational engine results. (Source: Introduction paragraph)
* **Q: Which key sections are highlighted for improvements?**
  * *A*: Formatting layout headers, increasing paragraph readability, and resolving missing semantic key phrases. (Source: Body analysis)`;
    }

    if (lowercaseQuery.includes('key point') || lowercaseQuery.includes('takeaway') || lowercaseQuery.includes('service')) {
      return `### Key Points & Services Identified
      
Based on the crawled website content of **${title}**:
1. **Semantic Accessibility**: Organizing content logically with clear headings (Source: Heading section).
2. **Direct Answerability**: Providing immediate answers to user questions to win featured snippets (Source: Introduction).
3. **Keyword Density**: Addressing topic gaps by incorporating key conversational phrases naturally.`;
    }

    if (lowercaseQuery.includes('title') || lowercaseQuery.includes('meta description')) {
      return `### Meta Recommendations for: **${title}**

Based on the crawled website content:
* **Suggested Title**: "How to Optimize Content for AI Search Engines - A Complete Guide"
* **Suggested Meta Description**: "Learn the key strategies, heading structures, and semantic keywords needed to make your content discoverable by conversational AI engines like ChatGPT, Gemini, and Perplexity." (Source: Grounded in Title and Intro Analysis)`;
    }

    if (lowercaseQuery.includes('improve') || lowercaseQuery.includes('readability') || lowercaseQuery.includes('weak') || lowercaseQuery.includes('heading') || lowercaseQuery.includes('keyword') || lowercaseQuery.includes('topic') || lowercaseQuery.includes('seo') || lowercaseQuery.includes('aeo') || lowercaseQuery.includes('simple')) {
      return `### Optimization Checklist for: **${title}**

Based on the crawled website content:
* **Heading Improvement**: Rewrite section headings into conversational questions to improve answer intent recognition.
* **Readability Audit**: Simplify complex sentences and break up long paragraphs (Source: Body paragraphs).
* **Missing Keywords**: Focus on semantic phrases like "conversational search optimization" and "AEO indexation criteria" (Source: Gap Analysis).`;
    }

    return `Based on the crawled website content of **"${title}"**:

The document outlines key details regarding ${title}. Grounded in the main body content, we recommend:
* Structuring descriptions to answer queries directly.
* Eliminating fluff to improve overall flow.
* Using bullet points to break up lists.

(Source: Grounded in crawled page body content)`;
  }

  private static generateSimulatedSearchAnswer(query: string, articles: Array<{ title: string; content: string }>): string {
    if (articles.length === 0) {
      return `I searched your ContentIQ library for: **"${query}"** but couldn't find any relevant articles.

To begin indexing, please add articles in the **Content Library** and make sure their status is set to **Published** so they are indexed into the search database.`;
    }

    const referencesStr = articles.map((a, i) => `[Source ${i + 1}] (${a.title})`).join(', ');

    return `Based on search results in your library (analyzing ${referencesStr}):

1. The systems index content by assessing title relevance and vocabulary mapping. ContentIQ analyzes readability and provides optimization scores for each.
2. In **${articles[0].title}**, the article outlines guidelines for structure, semantic coverage, and headers.
3. Furthermore, AI readiness requires matching user questions directly inside headings.

*Reference: ${articles.map((a, i) => `[Source ${i + 1}]: ${a.title}`).join('; ')}*`;
  }

  private static extractRelevantSection(content: string, issueTitle: string): string {
    const paragraphs = content.split('\n\n').map(p => p.trim()).filter(Boolean);
    if (paragraphs.length === 0) return '';

    const lowerTitle = issueTitle.toLowerCase();

    // 1. Introduction
    if (lowerTitle.includes('introduction') || lowerTitle.includes('intro') || lowerTitle.includes('weak introduction')) {
      const introIdx = paragraphs.findIndex(p => p.startsWith('# ') || p.toLowerCase().includes('introduction') || p.toLowerCase().includes('intro'));
      if (introIdx !== -1 && introIdx < paragraphs.length - 1) {
        return paragraphs[introIdx] + '\n\n' + paragraphs[introIdx + 1];
      }
      return paragraphs[0] + (paragraphs[1] ? '\n\n' + paragraphs[1] : '');
    }

    // 2. Conclusion
    if (lowerTitle.includes('conclusion') || lowerTitle.includes('conclude') || lowerTitle.includes('missing conclusion') || lowerTitle.includes('weak conclusion')) {
      const concIdx = paragraphs.findIndex(p => p.toLowerCase().includes('conclusion') || p.toLowerCase().includes('summary') || p.toLowerCase().includes('conclude'));
      if (concIdx !== -1) {
        return paragraphs.slice(concIdx).join('\n\n');
      }
      return paragraphs[paragraphs.length - 1];
    }

    // 3. FAQ
    if (lowerTitle.includes('faq') || lowerTitle.includes('frequently asked') || lowerTitle.includes('missing faq')) {
      const faqIdx = paragraphs.findIndex(p => p.toLowerCase().includes('faq') || p.toLowerCase().includes('frequently asked') || p.startsWith('### What') || p.startsWith('### How'));
      if (faqIdx !== -1) {
        return paragraphs.slice(faqIdx, faqIdx + 3).join('\n\n');
      }
      return ''; // empty since it is missing
    }

    // 4. Headings
    if (lowerTitle.includes('heading') || lowerTitle.includes('header') || lowerTitle.includes('weak heading')) {
      const quoteMatch = issueTitle.match(/["']([^"']+)["']/);
      if (quoteMatch) {
        const targetHeading = quoteMatch[1].toLowerCase();
        const idx = paragraphs.findIndex(p => p.toLowerCase().includes(targetHeading) && (p.startsWith('#') || p.startsWith('**')));
        if (idx !== -1) {
          return paragraphs[idx] + (paragraphs[idx + 1] ? '\n\n' + paragraphs[idx + 1] : '');
        }
      }
      const headingIdx = paragraphs.findIndex((p, i) => i > 0 && p.startsWith('##'));
      if (headingIdx !== -1) {
        return paragraphs[headingIdx] + (paragraphs[headingIdx + 1] ? '\n\n' + paragraphs[headingIdx + 1] : '');
      }
      return paragraphs.find(p => p.startsWith('#') || p.startsWith('##')) || paragraphs[0];
    }

    // 5. Paragraph / Readability
    if (lowerTitle.includes('paragraph') || lowerTitle.includes('readability') || lowerTitle.includes('long paragraph')) {
      let longest = paragraphs[0];
      for (const p of paragraphs) {
        if (!p.startsWith('#') && p.split(/\s+/).length > longest.split(/\s+/).length) {
          longest = p;
        }
      }
      return longest;
    }

    // 6. Keywords / Topics / Entity Coverage / Links
    const words = lowerTitle.split(/\s+/).filter(w => w.length > 3);
    for (const p of paragraphs) {
      if (!p.startsWith('#')) {
        const hasWord = words.some(w => p.toLowerCase().includes(w));
        if (hasWord) return p;
      }
    }

    // Fallback to the first body paragraph
    const bodyParagraph = paragraphs.find(p => !p.startsWith('#') && p.split(/\s+/).length > 15);
    return bodyParagraph || paragraphs[0];
  }

  /**
   * Section-based Issue Rewriter
   */
  static async rewriteSectionForIssue(
    title: string,
    content: string,
    issueTitle: string,
    issueDescription: string
  ): Promise<{ currentSection: string; improvedSection: string }> {
    const provider = getAIProvider();

    // 1. Locate the specific section from content
    const currentSection = this.extractRelevantSection(content, issueTitle);

    const systemPrompt = `You are an expert AEO (Answer Engine Optimization) copywriter.
Address this specific content issue:
Issue: "${issueTitle}"
Details: "${issueDescription}"

Task:
Intelligently rewrite, optimize, and improve the provided text section to resolve the issue.

AEO guidelines to implement:
1. Provide a direct, authoritative answer to search queries or headings.
2. Structure content logically using clear subheadings, bullet lists, or tables where appropriate.
3. Enhance sentence flow, readability, engagement, and grammar. Avoid repetitive phrasing.
4. Integrate semantic keywords and entities naturally.
5. Boost featured snippet potential by stating key facts concisely first.

IMPORTANT:
- Produce a genuinely rewritten version that is clearly better, structured, and distinct from the original. Do NOT perform simple word/synonym replacements.
- Preserve markdown elements like bullet lists, links, headings, and spacing. Do not collapse everything.
- Return ONLY the rewritten optimized content. Keep markdown formatting. Do not include conversational introduction/conclusion wrappers.`;

    const userPrompt = `Current Section:\n${currentSection || '[Empty / Section is missing]'}`;

    if (provider === 'grok' && xai) {
      try {
        console.log(`[xAI Service] Requesting rewriteSectionForIssue from Grok API using model grok-latest...`);
        const result = await xai.chat.completions.create({
          model: 'grok-latest',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        });

        const textResult = result.choices[0].message.content || '';
        if (textResult && textResult.trim().length > 0) {
          return {
            currentSection: currentSection || `[Section not present in the original page]`,
            improvedSection: textResult.trim(),
          };
        }
      } catch (error) {
        console.error('[xAI Service] Real AI section rewrite failed. Using simulation fallback.', error);
      }
    }

    // Simulation Fallback
    let improvedSection = '';

    const lowerTitle = issueTitle.toLowerCase();
    if (lowerTitle.includes('introduction') || lowerTitle.includes('intro')) {
      improvedSection = `## Introduction: Navigating Answer Engine Discoverability

With the emergence of conversational search platforms like Perplexity, ChatGPT, and Google Gemini, standard search engine optimization has evolved. How can brands guarantee content visibility? The answer lies in structuring text directly to match conversational user intents.

### Key Factors for AEO Content
* **Directness**: Answering queries in the first 2-3 sentences.
* **Hierarchical Headings**: Using clear semantic headings to index topics.
* **Factual Authority**: Grounding guides with data metrics.`;
    } else if (lowerTitle.includes('conclusion')) {
      improvedSection = `## Summary & Conclusion: Next Steps for AEO Compliance

In conclusion, optimizing content for AI answer engines requires a proactive shift from keywords to entities. Ensure that every article structures answers directly, utilizes clean HTML/markdown formats, and includes semantic schema mappings.

### Action Checklist
1. Re-evaluate old introductory paragraphs.
2. Add structured FAQ panels to all high-traffic articles.
3. Check and clean broken heading structures.`;
    } else if (lowerTitle.includes('faq')) {
      improvedSection = `## Frequently Asked Questions

### What is Answer Engine Optimization (AEO)?
Answer Engine Optimization (AEO) is the practice of optimizing content to be selected and cited as a source by conversational search engines (such as Perplexity, Gemini, and ChatGPT).

### How does AEO differ from traditional SEO?
Traditional SEO focuses on web page ranking in browser listings, while AEO targets direct, conversational answer generation inside chat summaries.`;
    } else if (lowerTitle.includes('heading') || lowerTitle.includes('structure')) {
      improvedSection = `## How Can We Structure Website Headings for AI Search Engines?

To maximize heading accessibility for AI crawlers, convert statement headers into direct question formats. For example, change "Heading Structure Info" into "How Can We Structure Website Headings for AI Search Engines?" to match natural language queries.`;
    } else if (lowerTitle.includes('link')) {
      improvedSection = `${currentSection}\n\n*Related Resources: See our updated [AEO Insights Guides](/library) and [Deep Analytics Dashboard](/analytics) for further citation data.*`;
    } else if (lowerTitle.includes('keyword') || lowerTitle.includes('topic')) {
      improvedSection = `${currentSection} (Optimized for conversational discoverability by incorporating structured schema references and search intent alignment).`;
    } else {
      improvedSection = `### Optimized Version: ${issueTitle}

This optimized revision enhances vocabulary density, readability flow, and featured snippet potential for AI answer engines.

${currentSection}`;
    }

    return {
      currentSection: currentSection || `[Section not present in the original page]`,
      improvedSection,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AI VISIBILITY INDEX METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generates 15 relevant AI search queries based on website content,
   * that a real user might ask a conversational AI engine.
   */
  static async generateVisibilityQueries(
    title: string,
    content: string,
    domain: string
  ): Promise<string[]> {
    const provider = getAIProvider();

    const systemPrompt = `You are an AI search behavior analyst.
Given a website's content and domain, generate exactly 15 realistic search queries that users would type into conversational AI engines (ChatGPT, Gemini, Perplexity) when looking for information related to this website's topic.

Rules:
- Queries must be natural language questions, not keywords.
- Vary the queries: include "best X", "how to X", "what is X", "X vs Y", "X for Y use case", etc.
- Make queries competitive — they should be queries where multiple brands/websites might be mentioned.
- Do NOT include the domain name in the queries.
- Return ONLY a JSON array of 15 strings. No explanation.

Example output:
["Best AEO tools for content optimization", "How to optimize content for ChatGPT search", "What is answer engine optimization?", ...]`;

    const userPrompt = `Website Domain: ${domain}\nWebsite Title: ${title}\nContent Summary:\n${content.substring(0, 2000)}`;

    if (provider !== 'simulation') {
      let client: OpenAI | null = null;
      let model = '';
      if (provider === 'grok' && xai) { client = xai; model = 'grok-latest'; }
      else if (provider === 'openai' && openai) { client = openai; model = 'gpt-4o-mini'; }
      else if (provider === 'gemini' && gemini) { client = gemini; model = 'gemini-2.5-flash'; }

      if (client) {
        try {
          const result = await client.chat.completions.create({
            model,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: systemPrompt + '\n\nIMPORTANT: Wrap the array in an object: {"queries": [...]}' },
              { role: 'user', content: userPrompt },
            ],
          });
          const raw = result.choices[0].message.content || '{}';
          const parsed = JSON.parse(raw);
          const queries: string[] = parsed.queries || parsed;
          if (Array.isArray(queries) && queries.length >= 5) {
            return queries.slice(0, 15);
          }
        } catch (err) {
          console.error('[Visibility] Query generation failed, using simulation.', err);
        }
      }
    }

    // Simulation: generate queries from title/content keywords
    return this.generateSimulatedVisibilityQueries(title, content, domain);
  }

  /**
   * Sends a single query to an LLM and analyses the response for
   * brand/domain mentions and competitor mentions.
   */
  static async analyzeVisibilityResponse(
    query: string,
    domain: string,
    competitorDomains: string[]
  ): Promise<{
    llmResponse: string;
    mentioned: boolean;
    mentionPosition: number | null;
    competitorMentions: { domain: string; count: number }[];
    queryScore: number;
  }> {
    const provider = getAIProvider();

    // Clean domain for matching (strip www, protocol)
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase();
    const brandName = cleanDomain.split('.')[0]; // e.g. "ahrefs" from "ahrefs.com"

    let llmResponse = '';

    if (provider !== 'simulation') {
      let client: OpenAI | null = null;
      let model = '';
      if (provider === 'grok' && xai) { client = xai; model = 'grok-latest'; }
      else if (provider === 'openai' && openai) { client = openai; model = 'gpt-4o-mini'; }
      else if (provider === 'gemini' && gemini) { client = gemini; model = 'gemini-2.5-flash'; }

      if (client) {
        try {
          const result = await client.chat.completions.create({
            model,
            messages: [{
              role: 'user',
              content: `${query}\n\nPlease provide a comprehensive answer mentioning specific tools, platforms, or websites where relevant.`
            }],
            max_tokens: 400,
          });
          llmResponse = result.choices[0].message.content || '';
        } catch (err) {
          console.error('[Visibility] LLM query failed, using simulation response.', err);
        }
      }
    }

    // If no real response, generate a simulated one
    if (!llmResponse) {
      llmResponse = this.generateSimulatedLLMResponse(query, cleanDomain, competitorDomains);
    }

    // Analyse the response
    const responseLower = llmResponse.toLowerCase();

    // Check if our domain/brand is mentioned
    const mentioned = responseLower.includes(cleanDomain) || responseLower.includes(brandName);
    
    // Find approximate mention position (which sentence/paragraph)
    let mentionPosition: number | null = null;
    if (mentioned) {
      const sentences = llmResponse.split(/[.!?\n]+/);
      const idx = sentences.findIndex(s => {
        const sl = s.toLowerCase();
        return sl.includes(cleanDomain) || sl.includes(brandName);
      });
      mentionPosition = idx >= 0 ? idx + 1 : 1;
    }

    // Count competitor mentions
    const competitorMentions = competitorDomains.map(comp => {
      const cleanComp = comp.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase();
      const compBrand = cleanComp.split('.')[0];
      const count = (responseLower.match(new RegExp(compBrand, 'g')) || []).length
                  + (responseLower.match(new RegExp(cleanComp, 'g')) || []).length;
      return { domain: cleanComp, count };
    }).filter(c => c.count > 0);

    // Score: 100 if mentioned first, lower if mentioned later, 0 if not
    let queryScore = 0;
    if (mentioned) {
      queryScore = mentionPosition !== null && mentionPosition <= 2 ? 90 : 70;
    }

    return { llmResponse, mentioned, mentionPosition, competitorMentions, queryScore };
  }

  // ── Private Simulation Helpers ────────────────────────────────────────────

  private static generateSimulatedVisibilityQueries(title: string, content: string, domain: string): string[] {
    const topics = title.toLowerCase().split(/\s+/).filter(w => w.length > 4).slice(0, 3);
    const category = content.toLowerCase().includes('seo') || content.toLowerCase().includes('aeo')
      ? 'SEO/AEO'
      : content.toLowerCase().includes('ai') || content.toLowerCase().includes('machine learning')
      ? 'AI/ML'
      : 'digital marketing';

    const templates = [
      `Best ${category} tools in 2025`,
      `How to improve ${topics[0] || 'content'} for AI search engines`,
      `What is the best platform for ${topics[1] || 'content optimization'}?`,
      `${category} tools comparison`,
      `How to optimize content for ChatGPT search results`,
      `Best answer engine optimization strategies`,
      `How does Perplexity AI rank content sources?`,
      `Top ${category} software for small businesses`,
      `AI content visibility improvement techniques`,
      `What tools does Google use for AI search indexing?`,
      `How to get cited by AI search engines like Gemini`,
      `${topics[0] || 'Content'} optimization best practices 2025`,
      `Free vs paid ${category} tools review`,
      `How to measure AI search visibility`,
      `${topics[1] || 'SEO'} automation platforms compared`,
    ];
    return templates.slice(0, 15);
  }

  private static generateSimulatedLLMResponse(query: string, domain: string, competitors: string[]): string {
    const brandName = domain.split('.')[0];
    const compNames = competitors.slice(0, 3).map(c => c.replace(/^(www\.)?/, '').split('.')[0]);
    
    // Randomly decide if brand is mentioned (~40% of time in simulation)
    const seed = query.length + domain.length;
    const mentionBrand = seed % 3 === 0;
    
    const competitorText = compNames.length > 0
      ? `Some popular tools in this space include ${compNames.join(', ')}${mentionBrand ? ` and ${brandName}` : ''}.`
      : mentionBrand
      ? `${brandName} is a notable solution worth considering.`
      : `Several tools exist for this purpose, with varying feature sets.`;

    return `This is a common question in the digital marketing space. ${competitorText} When evaluating options, consider factors like ease of use, integration capabilities, pricing, and analytics depth. Each platform has its strengths depending on your specific use case and team size. For enterprise workflows, scalability and API access are particularly important considerations.`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AI RADAR METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Analyzes a single query for a specific AI engine.
   * Uses real LLM with engine-specific system prompt, falls back to seeded simulation.
   */
  static async analyzeRadarQuery(
    query: string,
    domain: string,
    engine: string,
    competitors: string[]
  ): Promise<{
    mentioned: boolean;
    rankPosition: number | null;
    citationStatus: 'primary' | 'secondary' | 'none';
    competitorMentions: { domain: string; count: number }[];
    responseExcerpt: string;
    queryScore: number;
  }> {
    const provider = getAIProvider();
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase();
    const brandName = cleanDomain.split('.')[0];

    const enginePersonas: Record<string, string> = {
      chatgpt: 'You are ChatGPT, an AI assistant by OpenAI. Answer the question helpfully, mentioning specific tools and websites when relevant.',
      gemini: 'You are Gemini, an AI assistant by Google. Answer the question with factual accuracy, citing relevant platforms and tools.',
      claude: 'You are Claude, an AI assistant by Anthropic. Answer thoughtfully, including relevant tools and services where applicable.',
      perplexity: 'You are Perplexity AI. Provide a concise, well-sourced answer mentioning key platforms in the space.',
    };

    let responseExcerpt = '';

    if (provider !== 'simulation') {
      let client: OpenAI | null = null;
      let model = '';
      if (provider === 'grok' && xai) { client = xai; model = 'grok-latest'; }
      else if (provider === 'openai' && openai) { client = openai; model = 'gpt-4o-mini'; }
      else if (provider === 'gemini' && gemini) { client = gemini; model = 'gemini-2.5-flash'; }

      if (client) {
        try {
          const result = await client.chat.completions.create({
            model,
            messages: [
              { role: 'system', content: enginePersonas[engine] || enginePersonas.chatgpt },
              { role: 'user', content: `${query}\n\nMention specific tools, platforms, and websites where relevant.` },
            ],
            max_tokens: 350,
          });
          responseExcerpt = result.choices[0].message.content || '';
        } catch (err) {
          console.error(`[Radar] ${engine} query failed, using simulation.`, err);
        }
      }
    }

    // Simulation: use seeded randomness per engine+query for consistent results
    if (!responseExcerpt) {
      responseExcerpt = AIService.generateRadarSimulatedResponse(query, cleanDomain, engine, competitors);
    }

    // --- Analyze the response ---
    const lower = responseExcerpt.toLowerCase();
    const mentioned = lower.includes(cleanDomain) || lower.includes(brandName);

    let rankPosition: number | null = null;
    let citationStatus: 'primary' | 'secondary' | 'none' = 'none';

    if (mentioned) {
      const sentences = responseExcerpt.split(/[.!?\n]+/);
      const idx = sentences.findIndex(s => {
        const sl = s.toLowerCase();
        return sl.includes(cleanDomain) || sl.includes(brandName);
      });
      rankPosition = Math.max(1, idx + 1);
      citationStatus = rankPosition <= 2 ? 'primary' : 'secondary';
    }

    const competitorMentions = competitors.map(comp => {
      const cleanComp = comp.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase();
      const compBrand = cleanComp.split('.')[0];
      const count = (lower.match(new RegExp(compBrand, 'g')) || []).length;
      return { domain: cleanComp, count };
    }).filter(c => c.count > 0);

    const queryScore = mentioned
      ? citationStatus === 'primary' ? 90 : 70
      : 0;

    return {
      mentioned,
      rankPosition,
      citationStatus,
      competitorMentions,
      responseExcerpt: responseExcerpt.substring(0, 500),
      queryScore,
    };
  }

  /**
   * Generates AI-powered recommendations based on radar scan results.
   */
  static async generateRadarRecommendations(
    domain: string,
    results: Array<{
      query: string;
      engine: string;
      mentioned: boolean;
      citationStatus: string;
      competitorMentions: { domain: string; count: number }[];
    }>
  ): Promise<Array<{
    type: string;
    priority: string;
    engine?: string;
    title: string;
    description: string;
  }>> {
    const provider = getAIProvider();
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase();
    
    // Calculate per-engine stats
    const engines = ['chatgpt', 'gemini', 'claude', 'perplexity'];
    const engineStats: Record<string, { total: number; mentioned: number }> = {};
    engines.forEach(e => { engineStats[e] = { total: 0, mentioned: 0 }; });
    
    results.forEach(r => {
      if (engineStats[r.engine]) {
        engineStats[r.engine].total++;
        if (r.mentioned) engineStats[r.engine].mentioned++;
      }
    });

    const weakestEngine = engines.reduce((a, b) => {
      const aRate = engineStats[a].total > 0 ? engineStats[a].mentioned / engineStats[a].total : 0;
      const bRate = engineStats[b].total > 0 ? engineStats[b].mentioned / engineStats[b].total : 0;
      return aRate < bRate ? a : b;
    });

    const unmatchedQueries = results.filter(r => !r.mentioned).map(r => r.query);
    const topCompetitors = new Map<string, number>();
    results.forEach(r => {
      r.competitorMentions.forEach(c => {
        topCompetitors.set(c.domain, (topCompetitors.get(c.domain) || 0) + c.count);
      });
    });
    const topCompetitor = Array.from(topCompetitors.entries()).sort((a, b) => b[1] - a[1])[0];

    if (provider !== 'simulation') {
      let client: OpenAI | null = null;
      let model = '';
      if (provider === 'grok' && xai) { client = xai; model = 'grok-latest'; }
      else if (provider === 'openai' && openai) { client = openai; model = 'gpt-4o-mini'; }
      else if (provider === 'gemini' && gemini) { client = gemini; model = 'gemini-2.5-flash'; }

      if (client) {
        try {
          const statsStr = engines.map(e =>
            `${e}: ${engineStats[e].mentioned}/${engineStats[e].total} queries mentioned`
          ).join('\n');

          const prompt = `You are an AI SEO expert. Given this website's AI visibility data for domain "${cleanDomain}":

Engine Performance:
${statsStr}

Unmatched queries (not mentioned): ${unmatchedQueries.slice(0, 5).join(', ')}
Top competitor: ${topCompetitor ? topCompetitor[0] : 'none'}

Generate 5 actionable recommendations to improve AI search visibility.
Return a JSON object: {"recommendations": [{"type": "content|schema|keyword|article", "priority": "high|medium|low", "engine": "engine_name_or_null", "title": "short title", "description": "2-3 sentence explanation"}]}`;

          const result = await client.chat.completions.create({
            model,
            response_format: { type: 'json_object' },
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 800,
          });
          const raw = result.choices[0].message.content || '{}';
          const parsed = JSON.parse(raw);
          if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
            return parsed.recommendations.slice(0, 6);
          }
        } catch (err) {
          console.error('[Radar] Recommendation generation failed, using simulation.', err);
        }
      }
    }

    // Simulation fallback
    return AIService.generateSimulatedRecommendations(cleanDomain, weakestEngine, unmatchedQueries, topCompetitor);
  }

  private static generateRadarSimulatedResponse(
    query: string,
    domain: string,
    engine: string,
    competitors: string[]
  ): string {
    const brandName = domain.split('.')[0];
    const compNames = competitors.slice(0, 3).map(c =>
      c.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].split('.')[0]
    );

    // Use a hash of query+engine+domain for deterministic but varied results
    const combinedStr = `${query.toLowerCase()}-${engine.toLowerCase()}-${domain.toLowerCase()}`;
    let hash = 0;
    for (let i = 0; i < combinedStr.length; i++) {
      hash = (hash << 5) - hash + combinedStr.charCodeAt(i);
      hash |= 0;
    }
    const seed = Math.abs(hash) % 10;
    const mentionBrand = seed < 5; // ~50% appearance chance

    const engineIntros: Record<string, string> = {
      chatgpt: 'Based on my knowledge,',
      gemini: 'According to available information,',
      claude: 'From what I understand,',
      perplexity: "Here's what I found:",
    };

    const intro = engineIntros[engine] || 'In this space,';

    // Build a realistic, query-aware response that embeds brand & competitors naturally
    const competitorSection = compNames.length > 0
      ? `Commonly referenced platforms in this space include ${compNames.join(', ')}.`
      : 'There are several well-known platforms commonly recommended for this type of query.';

    // When mentionBrand is true, embed the brand name naturally and prominently
    const brandSection = mentionBrand
      ? ` ${brandName.charAt(0).toUpperCase() + brandName.slice(1)} is frequently cited as a strong option in this category, offering comprehensive features well-suited for this use case. Many practitioners specifically recommend ${brandName} for its performance and ease of integration.`
      : ` The landscape is competitive with multiple strong contenders, and the right selection depends heavily on specific workflow requirements and team expertise.`;

    const closingSection = `When evaluating options, key factors to consider include ease of use, integration capabilities, pricing structure, support quality, and scalability. The right choice varies by team size and technical requirements.`;

    return `${intro} ${competitorSection}${brandSection} ${closingSection}`;
  }

  private static generateSimulatedRecommendations(
    domain: string,
    weakestEngine: string,
    unmatchedQueries: string[],
    topCompetitor: [string, number] | undefined
  ): Array<{ type: string; priority: string; engine?: string; title: string; description: string }> {
    const engineNames: Record<string, string> = {
      chatgpt: 'ChatGPT',
      gemini: 'Gemini',
      claude: 'Claude',
      perplexity: 'Perplexity',
    };

    return [
      {
        type: 'schema',
        priority: 'high',
        engine: weakestEngine,
        title: `Add FAQ Schema for ${engineNames[weakestEngine] || weakestEngine} Visibility`,
        description: `Your website appears less frequently in ${engineNames[weakestEngine] || weakestEngine} responses because your content lacks structured FAQ schema markup. AI engines prefer well-structured Q&A content for citation. Add JSON-LD FAQPage schema to your key landing pages to improve appearance rate by an estimated 25-40%.`,
      },
      {
        type: 'content',
        priority: 'high',
        engine: undefined,
        title: 'Create Dedicated "Best Of" Comparison Pages',
        description: `Queries like "${unmatchedQueries[0] || 'best AI tools'}" show no mention of ${domain}. AI engines frequently cite comparison and listicle pages. Create a "Best [Category] Tools" page that positions ${domain} clearly against alternatives with factual feature comparisons.`,
      },
      {
        type: 'keyword',
        priority: 'medium',
        engine: 'gemini',
        title: 'Expand Coverage of Long-Tail Conversational Queries',
        description: `Gemini AI searches tend to favor content that directly answers conversational questions. Add a blog section or FAQ hub targeting "how to", "what is", and "vs" queries relevant to your domain. This aligns with Gemini's preference for authoritative, answer-first content.`,
      },
      {
        type: 'content',
        priority: 'medium',
        engine: undefined,
        title: topCompetitor ? `Close the Gap vs ${topCompetitor[0]}` : 'Strengthen Competitive Positioning',
        description: topCompetitor
          ? `${topCompetitor[0]} is mentioned ${topCompetitor[1]} times in AI responses where ${domain} is not. Analyze their top-cited pages and create superior content covering the same topics with more depth, updated statistics, and practical examples.`
          : `Identify your top 2 competitors that AI engines cite most frequently and create content that directly addresses the same queries with higher quality and specificity.`,
      },
      {
        type: 'article',
        priority: 'low',
        engine: 'perplexity',
        title: 'Publish Original Research or Data Reports',
        description: `Perplexity AI and other AI engines heavily cite websites that publish original data, surveys, and research findings. Creating an annual report or unique dataset about your industry will dramatically increase AI citation frequency, as these sources are considered authoritative primary references.`,
      },
      {
        type: 'schema',
        priority: 'low',
        engine: undefined,
        title: 'Implement HowTo and Article Schema Markup',
        description: `Add HowTo schema markup to your tutorial and guide pages. AI engines use structured data to better understand content hierarchy and extract answer snippets. This is especially effective for ChatGPT and Claude which parse structured content more efficiently than plain prose.`,
      },
    ];
  }
}
