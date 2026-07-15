/**
 * Final diagnostic — mirrors the FIXED generateRadarSimulatedResponse logic
 */
function generateRadarSimulatedResponse(query, domain, engine, competitors) {
  const brandName = domain.split('.')[0];
  const compNames = competitors.slice(0, 3).map(c =>
    c.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].split('.')[0]
  );

  const combinedStr = `${query.toLowerCase()}-${engine.toLowerCase()}-${domain.toLowerCase()}`;
  let hash = 0;
  for (let i = 0; i < combinedStr.length; i++) {
    hash = (hash << 5) - hash + combinedStr.charCodeAt(i);
    hash |= 0;
  }
  const seed = Math.abs(hash) % 10;
  const mentionBrand = seed < 5;

  const engineIntros = {
    chatgpt: 'Based on my knowledge,',
    gemini: 'According to available information,',
    claude: 'From what I understand,',
    perplexity: "Here's what I found:",
  };

  const intro = engineIntros[engine] || 'In this space,';
  const competitorSection = compNames.length > 0
    ? `Commonly referenced platforms in this space include ${compNames.join(', ')}.`
    : 'There are several well-known platforms commonly recommended for this type of query.';

  const brandSection = mentionBrand
    ? ` ${brandName.charAt(0).toUpperCase() + brandName.slice(1)} is frequently cited as a strong option in this category, offering comprehensive features well-suited for this use case. Many practitioners specifically recommend ${brandName} for its performance and ease of integration.`
    : ` The landscape is competitive with multiple strong contenders, and the right selection depends heavily on specific workflow requirements and team expertise.`;

  const closingSection = `When evaluating options, key factors to consider include ease of use, integration capabilities, pricing structure, support quality, and scalability. The right choice varies by team size and technical requirements.`;

  const response = `${intro} ${competitorSection}${brandSection} ${closingSection}`;

  // Simulate the detection logic
  const lower = response.toLowerCase();
  const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase();
  const mentioned = lower.includes(cleanDomain) || lower.includes(brandName);
  const queryScore = mentioned ? 90 : 0;

  return { seed, mentionBrand, mentioned, queryScore, brandName, excerpt: response.substring(0, 150) };
}

const testCases = [
  { query: 'chatgpt', domain: 'amazon.in', engine: 'chatgpt', competitors: [] },
  { query: 'chatgpt', domain: 'amazon.in', engine: 'gemini', competitors: [] },
  { query: 'chatgpt', domain: 'amazon.in', engine: 'claude', competitors: [] },
  { query: 'chatgpt', domain: 'amazon.in', engine: 'perplexity', competitors: [] },
  { query: 'Best search engine in the world', domain: 'google.com', engine: 'chatgpt', competitors: [] },
  { query: 'Best search engine in the world', domain: 'google.com', engine: 'gemini', competitors: [] },
  { query: 'Best AEO tools for content optimization', domain: 'example.com', engine: 'chatgpt', competitors: ['competitor.com'] },
  { query: 'Best AEO tools for content optimization', domain: 'example.com', engine: 'gemini', competitors: ['competitor.com'] },
  { query: 'AI visibility tools for SEO', domain: 'mysite.io', engine: 'claude', competitors: [] },
  { query: 'AI visibility tools for SEO', domain: 'mysite.io', engine: 'perplexity', competitors: [] },
];

console.log('\n=== FIXED Simulation Results ===\n');
let totalMentions = 0;
let totalScore = 0;

testCases.forEach(({ query, domain, engine, competitors }) => {
  const r = generateRadarSimulatedResponse(query, domain, engine, competitors);
  if (r.mentioned) totalMentions++;
  totalScore += r.queryScore;
  console.log(`[${engine.padEnd(10)}] ${domain.padEnd(15)} | seed=${r.seed} mention=${String(r.mentionBrand).padEnd(5)} | detected=${r.mentioned} score=${r.queryScore}`);
  console.log(`  "${r.excerpt}..."\n`);
});

const pct = Math.round(totalMentions/testCases.length*100);
console.log(`=== RESULT: ${totalMentions}/${testCases.length} mentions (${pct}%) | Avg score: ${(totalScore/testCases.length).toFixed(1)} ===`);
console.log(`Expected ~50% mentions for simulation mode. ${pct >= 30 && pct <= 70 ? '✅ PASS' : '❌ FAIL'}`);
