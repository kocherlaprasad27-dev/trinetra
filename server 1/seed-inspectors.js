const prisma = require('./src/config/prisma');
const bcrypt = require('bcryptjs');

async function main() {
  try {
    // Create some test inspectors
    const inspectors = [
      {
        id: 'insp001',
        name: 'Raj Kumar',
        email: 'raj@example.com',
        password: await bcrypt.hash('pass123', 10),
        role: 'INSPECTOR'
      },
      {
        id: 'insp002',
        name: 'Priya Singh',
        email: 'priya@example.com',
        password: await bcrypt.hash('pass123', 10),
        role: 'INSPECTOR'
      },
      {
        id: 'insp003',
        name: 'Amit Patel',
        email: 'amit@example.com',
        password: await bcrypt.hash('pass123', 10),
        role: 'INSPECTOR'
      }
    ];

    for (const inspector of inspectors) {
      const existing = await prisma.user.findUnique({ where: { id: inspector.id } });
      if (!existing) {
        const created = await prisma.user.create({ data: inspector });
        console.log(`✅ Created inspector: ${created.name} (${created.email})`);
      } else {
        console.log(`⏭️  Inspector already exists: ${inspector.name}`);
      }
    }

    console.log('\n✅ Seed completed!');
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
