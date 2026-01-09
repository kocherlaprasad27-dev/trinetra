const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const XLSX = require('xlsx');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const EXCLUDED_SHEETS = ['Cover', 'Instructions', 'Summary', 'Room Summary'];

async function main() {
  console.log('Starting seed v4 (Severity)...');
  const filePath = path.join(__dirname, 'Copy of Home Inspection Report.xlsx');
  const workbook = XLSX.readFile(filePath);

  await prisma.predefinedIssue.deleteMany({});
  console.log('Cleared existing predefined issues...');

  const issues = [];
  const seen = new Set();

  workbook.SheetNames.forEach(sheetName => {
    if (EXCLUDED_SHEETS.some(s => sheetName.includes(s))) return;
    
    // Derive Room Type from Sheet Name
    // Remove "Report - " prefix if present
    let roomType = sheetName.replace(/^Report\s*-\s*/i, '').trim();
    // Remove trailing numbers (e.g. "Bedroom 1" -> "Bedroom")
    roomType = roomType.replace(/\s*\d+$/, '').trim();

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Start from row 1 (skip header)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 4) continue;

      const category = row[1];
      const question = row[2];
      const severityRaw = row[3];

      if (!category || !question) continue;
      if (String(question).includes('Total Score')) continue;

      const description = String(question).trim();
      
      let severity = 'MINOR';
      if (severityRaw) {
          const s = String(severityRaw).toUpperCase().trim();
          if (['MAJOR', 'MINOR', 'CRITICAL', 'COSMETIC'].includes(s)) {
              severity = s;
          } else if (s === 'PASS' || s === 'SATISFACTORY') {
              severity = 'COSMETIC'; 
          }
      }

      const key = `${roomType}|${category}|${description}`;
      if (seen.has(key)) continue;
      seen.add(key);

      issues.push({
        roomType,
        category: String(category).trim(),
        description,
        severity
      });
    }
  });

  console.log(`Extracted ${issues.length} unique issues.`);
  
  if (issues.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < issues.length; i += batchSize) {
        const batch = issues.slice(i, i + batchSize);
        await prisma.predefinedIssue.createMany({
          data: batch,
          skipDuplicates: true
        });
        console.log(`Inserted batch ${i} - ${i + batch.length}`);
      }
  }

  console.log('Seeding completed.');
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
