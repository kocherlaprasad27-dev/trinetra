require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Listing ADMIN users and checking admin@example.com');
    try {
        const admins = await prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: { id: true, email: true, name: true, role: true }
        });
        console.log('Admins:', admins);
        const adminByEmail = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: 'admin@example.com' },
                    { id: 'admin' }
                ]
            }
        });
        if (adminByEmail) {
            console.log('admin@example.com FOUND:', { id: adminByEmail.id, email: adminByEmail.email, role: adminByEmail.role });
        } else {
            console.log('admin@example.com NOT FOUND');
        }
    } catch (e) {
        console.error("Prisma Query Error:", e);
    }
    if (process.env.RESET_ADMIN === '1') {
        try {
            const hash = await bcrypt.hash(process.env.ADMIN_NEW_PASSWORD || 'admin123', 10);
            const updated = await prisma.user.update({
                where: { id: 'USR-ADMIN' },
                data: { password: hash }
            });
            console.log('Admin password updated for ID USR-ADMIN:', { email: updated.email });
        } catch (e) {
            console.error('Failed to update admin password:', e.message);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
