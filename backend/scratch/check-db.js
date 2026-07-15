const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Database Check ---');
  try {
    const users = await prisma.user.findMany();
    console.log(`Total users in database: ${users.length}`);
    users.forEach(u => console.log(`User: ID=${u.id}, Name=${u.name}, Email=${u.email}`));

    const sessions = await prisma.radarSession.findMany({
      orderBy: { scannedAt: 'desc' },
      take: 2,
      include: { results: true }
    });
    console.log(`Total radar sessions in database: ${sessions.length}`);
    sessions.forEach(s => {
      console.log(`Session: ID=${s.id}, Domain=${s.domain}, Score=${s.overallScore}, Mentions=${s.totalMentions}/${s.totalChecks}, ScannedAt=${s.scannedAt}`);
      console.log('Results:');
      s.results.forEach(r => {
        console.log(`  - Engine: ${r.engine}, Query: "${r.query}", Mentioned: ${r.mentioned}, CitationStatus: ${r.citationStatus}, Score: ${r.queryScore}`);
        console.log(`    Excerpt: "${r.responseExcerpt}"`);
      });
    });
  } catch (err) {
    console.error('Database query error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
