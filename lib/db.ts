import { PrismaClient } from "@prisma/client";

// Один клиент на процесс: в dev hot-reload иначе плодит соединения.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
