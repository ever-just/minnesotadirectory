import { integer, pgTable, varchar, text, decimal, boolean, timestamp, uuid } from 'drizzle-orm/pg-core';

export const companies = pgTable('companies', {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar({ length: 255 }).notNull(),
    industry: varchar({ length: 255 }),
    sales: decimal({ precision: 18, scale: 2 }),
    employees: integer(),
    address: text(),
    city: varchar({ length: 255 }),
    state: varchar({ length: 50 }).default('Minnesota'),
    postalCode: varchar({ length: 20 }),
    phone: varchar({ length: 50 }),
    website: varchar({ length: 500 }),
    description: text(),
    tradestyle: varchar({ length: 255 }),
    ticker: varchar({ length: 10 }),
    ownership: varchar({ length: 100 }),
    naicsDescription: text(),
    sicDescription: text(),
    isHeadquarters: boolean().default(false),
    employeesSite: varchar({ length: 50 }),
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp().defaultNow()
});

export const industries = pgTable('industries', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull().unique(),
    companyCount: integer().default(0),
    createdAt: timestamp().defaultNow()
});