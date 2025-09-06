import { integer, pgTable, varchar, text, decimal, boolean, timestamp, uuid, jsonb, index } from 'drizzle-orm/pg-core';

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

export const users = pgTable('users', {
    id: uuid().primaryKey().defaultRandom(),
    email: varchar({ length: 255 }).notNull().unique(),
    name: varchar({ length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    isEmailVerified: boolean('is_email_verified').default(false),
    emailVerificationToken: varchar('email_verification_token', { length: 255 }),
    resetPasswordToken: varchar('reset_password_token', { length: 255 }),
    resetPasswordExpires: timestamp('reset_password_expires'),
    lastLoginAt: timestamp('last_login_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
    emailVerificationIdx: index('users_email_verification_idx').on(table.emailVerificationToken),
    resetTokenIdx: index('users_reset_token_idx').on(table.resetPasswordToken)
}));

export const savedCompanies = pgTable('saved_companies', {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid().references(() => users.id, { onDelete: 'cascade' }).notNull(),
    companyId: uuid().references(() => companies.id, { onDelete: 'cascade' }).notNull(),
    savedAt: timestamp('saved_at').defaultNow(),
    notes: text(), // Optional user notes about the company
    tags: varchar({ length: 500 }), // User-defined tags (comma-separated)
    createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
    userIdx: index('saved_companies_user_idx').on(table.userId),
    companyIdx: index('saved_companies_company_idx').on(table.companyId),
    userCompanyIdx: index('saved_companies_user_company_idx').on(table.userId, table.companyId),
    // Ensure one save per user per company
    userCompanyUnique: index('saved_companies_unique').on(table.userId, table.companyId)
}));

export const userActivity = pgTable('user_activity', {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid().references(() => users.id, { onDelete: 'cascade' }).notNull(),
    activityType: varchar('activity_type', { length: 50 }).notNull(), // 'login', 'company_view', 'company_save', 'company_unsave', 'search'
    companyId: uuid().references(() => companies.id, { onDelete: 'cascade' }),
    searchTerm: varchar('search_term', { length: 255 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    timestamp: timestamp().defaultNow()
}, (table) => ({
    userIdx: index('user_activity_user_idx').on(table.userId),
    typeIdx: index('user_activity_type_idx').on(table.activityType),
    timestampIdx: index('user_activity_timestamp_idx').on(table.timestamp)
}));

// Sitemap analysis tables
export const websiteStructures = pgTable('website_structures', {
    id: uuid().primaryKey().defaultRandom(),
    companyId: uuid().references(() => companies.id).notNull(),
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
    companyId: uuid().references(() => companies.id).notNull(),
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

// Logo storage tables
export const companyLogos = pgTable('company_logos', {
    id: uuid().primaryKey().defaultRandom(),
    companyId: uuid().references(() => companies.id, { onDelete: 'cascade' }).notNull(),
    logoData: text('logo_data'), // Base64 encoded binary data
    logoUrl: varchar('logo_url', { length: 1000 }), // Optional CDN/storage URL
    contentType: varchar('content_type', { length: 50 }).notNull(), // image/png, image/svg+xml, etc.
    fileExtension: varchar('file_extension', { length: 10 }).notNull(), // png, svg, jpg
    fileSize: integer('file_size'), // Size in bytes
    qualityScore: integer('quality_score').default(0), // 0-100 quality rating
    source: varchar({ length: 50 }), // clearbit, google, manual, etc.
    width: integer(),
    height: integer(),
    isPlaceholder: boolean('is_placeholder').default(false),
    domain: varchar({ length: 255 }), // Store domain for easy lookup
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
    companyIdx: index('company_logos_company_idx').on(table.companyId),
    domainIdx: index('company_logos_domain_idx').on(table.domain),
    qualityIdx: index('company_logos_quality_idx').on(table.qualityScore),
    sourceIdx: index('company_logos_source_idx').on(table.source),
    // Unique constraint: one primary logo per company
    uniqueCompanyLogo: index('company_logos_unique_company').on(table.companyId)
}));

export const logoSources = pgTable('logo_sources', {
    id: uuid().primaryKey().defaultRandom(),
    companyLogoId: uuid('company_logo_id').references(() => companyLogos.id, { onDelete: 'cascade' }).notNull(),
    sourceName: varchar('source_name', { length: 50 }), // clearbit, google, favicon
    sourceUrl: varchar('source_url', { length: 1000 }),
    quality: integer().default(0),
    loadTimeMs: integer('load_time_ms'),
    lastTested: timestamp('last_tested'),
    isWorking: boolean('is_working').default(true),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
    companyLogoIdx: index('logo_sources_company_logo_idx').on(table.companyLogoId),
    sourceNameIdx: index('logo_sources_source_name_idx').on(table.sourceName),
    workingIdx: index('logo_sources_working_idx').on(table.isWorking)
}));

export const logoPerformance = pgTable('logo_performance', {
    id: uuid().primaryKey().defaultRandom(),
    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }).notNull(),
    cacheKey: varchar('cache_key', { length: 255 }),
    fetchAttempts: integer('fetch_attempts').default(0),
    lastFetchAttempt: timestamp('last_fetch_attempt'),
    averageLoadTimeMs: integer('average_load_time_ms'),
    successRate: decimal('success_rate', { precision: 5, scale: 2 }),
    totalRequests: integer('total_requests').default(0),
    successfulRequests: integer('successful_requests').default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
    companyIdx: index('logo_performance_company_idx').on(table.companyId),
    cacheKeyIdx: index('logo_performance_cache_key_idx').on(table.cacheKey),
    performanceIdx: index('logo_performance_success_rate_idx').on(table.successRate)
}));