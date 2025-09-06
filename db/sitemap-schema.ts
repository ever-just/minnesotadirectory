import { integer, pgTable, varchar, text, decimal, boolean, timestamp, uuid, index } from 'drizzle-orm/pg-core';

// Note: companies table already exists, so we reference it by name
// Main sitemap data table
export const websiteStructures = pgTable('website_structures', {
    id: uuid().primaryKey().defaultRandom(),
    companyId: uuid().notNull(), // References existing companies table
    domain: varchar({ length: 255 }).notNull(),
    totalPages: integer().default(0),
    totalDirectories: integer().default(0),
    totalSubdomains: integer().default(0),
    sitemapUrl: varchar({ length: 500 }),
    lastAnalyzed: timestamp().notNull(),
    nextAnalysis: timestamp(),
    analysisStatus: varchar({ length: 50 }).default('pending'),
    errorMessage: text(),
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp().defaultNow()
}, (table) => ({
    companyIdx: index('website_structures_company_idx').on(table.companyId),
    domainIdx: index('website_structures_domain_idx').on(table.domain),
    statusIdx: index('website_structures_status_idx').on(table.analysisStatus)
}));

export const websitePages = pgTable('website_pages', {
    id: uuid().primaryKey().defaultRandom(),
    websiteStructureId: uuid().references(() => websiteStructures.id).notNull(),
    url: varchar({ length: 1000 }).notNull(),
    path: varchar({ length: 500 }).notNull(),
    title: varchar({ length: 500 }),
    priority: decimal({ precision: 3, scale: 2 }),
    lastModified: timestamp(),
    changeFreq: varchar({ length: 20 }),
    pageType: varchar({ length: 50 }),
    isDirectory: boolean().default(false),
    parentPath: varchar({ length: 500 }),
    depth: integer().default(0),
    discoveredAt: timestamp().defaultNow(),
    createdAt: timestamp().defaultNow()
}, (table) => ({
    websiteIdx: index('website_pages_website_idx').on(table.websiteStructureId),
    urlIdx: index('website_pages_url_idx').on(table.url)
}));

export const analysisQueue = pgTable('analysis_queue', {
    id: uuid().primaryKey().defaultRandom(),
    companyId: uuid().notNull(), // References existing companies table
    domain: varchar({ length: 255 }).notNull(),
    priority: integer().default(5),
    status: varchar({ length: 50 }).default('queued'),
    attempts: integer().default(0),
    maxAttempts: integer().default(3),
    lastAttempt: timestamp(),
    errorMessage: text(),
    scheduledFor: timestamp(),
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp().defaultNow()
}, (table) => ({
    statusIdx: index('analysis_queue_status_idx').on(table.status),
    companyIdx: index('analysis_queue_company_idx').on(table.companyId)
}));
