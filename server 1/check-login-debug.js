require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const emailInput = 'sai001104@gmail.com';
    const passwordInput = '@Sai112000'; // The password from DB
    const masterPass = 'pass123';

    console.log(`Attempting login simulation for: ${emailInput}`);

    try {
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: emailInput },
                    { id: emailInput }
                ]
            }
        });

        if (!user) {
            console.log('User NOT FOUND in DB');
            return;
        }
        console.log('User FOUND in DB:', user.email);
        console.log('DB Password:', user.password);

        // Logic from auth.routes.js
        if (user.password === passwordInput || passwordInput === 'pass123' || passwordInput === 'admin123') {
            console.log('[SUCCESS] Password match (Direct)');
        } else {
            console.log('[FAILURE] Password mismatch (Direct)');
            console.log(`Expected: ${user.password}, Got: ${passwordInput}`);
        }

        // Test Master Pass
        if (user.password === masterPass || masterPass === 'pass123' || masterPass === 'admin123') {
            console.log('[SUCCESS] Password match (Master Pass)');
        } else {
            console.log('[FAILURE] Password mismatch (Master Pass)');
        }

    } catch (e) {
        console.error("Prisma Query Error:", e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
