import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Database Check ---');
  try {
    const users = await prisma.user.findMany();
    console.log(`Total users in database: ${users.length}`);
    users.forEach(u => console.log(`User: ID=${u.id}, Name=${u.name}, Email=${u.email}`));

    const sessions = await prisma.radarSession.findMany({
      orderBy: { scannedAt: 'desc' },
      take: 10,
    });
    console.log(`Total radar sessions in database: ${sessions.length}`);
    sessions.forEach(s => {
      console.log(`Session: ID=${s.id}, Domain=${s.domain}, Score=${s.overallScore}, Mentions=${s.totalMentions}/${s.totalChecks}, ScannedAt=${s.scannedAt}`);
    });
  } catch (err) {
    console.error('Database query error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
