import { WebsiteStructureService, WebsiteStructure, WebsitePage, Subdomain } from '../src/services/WebsiteStructureService';
import { neon } from '@netlify/neon';

interface AnalysisJob {
    id: string;
    companyId: string;
    domain: string;
    priority: number;
    attempts: number;
    maxAttempts: number;
}

interface StoredWebsiteStructure {
    id: string;
    companyId: string;
    domain: string;
    totalPages: number;
    totalDirectories: number;
    totalSubdomains: number;
    sitemapUrl?: string;
    lastAnalyzed: string;
    nextAnalysis?: string;
    analysisStatus: string;
    pages: StoredWebsitePage[];
    subdomains: StoredSubdomain[];
}

interface StoredWebsitePage {
    url: string;
    path: string;
    title?: string;
    priority?: number;
    lastModified?: string;
    changeFreq?: string;
    pageType?: string;
    isDirectory: boolean;
    parentPath?: string;
    depth: number;
}

interface StoredSubdomain {
    subdomain: string;
    fullDomain: string;
    isActive: boolean;
    responseTime?: number;
    lastChecked?: string;
}

export class SitemapAnalysisService {
    private static sql = neon(process.env.NETLIFY_DATABASE_URL!);

    // ==========================================
    // QUEUE MANAGEMENT
    // ==========================================

    /**
     * Add companies to analysis queue
     */
    static async queueCompaniesForAnalysis(companies: Array<{id: string, domain: string}>, priority: number = 5): Promise<void> {
        const sql = this.sql;
        
        for (const company of companies) {
            if (!company.domain) continue;

            await sql`
                INSERT INTO analysis_queue (company_id, domain, priority, status, scheduled_for)
                VALUES (${company.id}, ${company.domain}, ${priority}, 'queued', NOW())
                ON CONFLICT (company_id) DO UPDATE SET
                    priority = LEAST(analysis_queue.priority, ${priority}),
                    updated_at = NOW()
            `;
        }
        
        console.log(`📝 Queued ${companies.length} companies for sitemap analysis`);
    }

    /**
     * Get next batch of jobs to process
     */
    static async getNextAnalysisJobs(limit: number = 10): Promise<AnalysisJob[]> {
        const sql = this.sql;
        
        const jobs = await sql`
            UPDATE analysis_queue 
            SET status = 'processing', last_attempt = NOW(), attempts = attempts + 1
            WHERE id IN (
                SELECT id FROM analysis_queue
                WHERE status = 'queued' 
                AND (scheduled_for IS NULL OR scheduled_for <= NOW())
                AND attempts < max_attempts
                ORDER BY priority ASC, created_at ASC
                LIMIT ${limit}
                FOR UPDATE SKIP LOCKED
            )
            RETURNING id, company_id, domain, priority, attempts, max_attempts
        `;

        return jobs.map(job => ({
            id: job.id,
            companyId: job.company_id,
            domain: job.domain,
            priority: job.priority,
            attempts: job.attempts,
            maxAttempts: job.max_attempts
        }));
    }

    /**
     * Mark job as completed
     */
    static async markJobCompleted(jobId: string): Promise<void> {
        const sql = this.sql;
        await sql`
            UPDATE analysis_queue 
            SET status = 'completed', updated_at = NOW()
            WHERE id = ${jobId}
        `;
    }

    /**
     * Mark job as failed
     */
    static async markJobFailed(jobId: string, errorMessage: string): Promise<void> {
        const sql = this.sql;
        await sql`
            UPDATE analysis_queue 
            SET status = 'failed', error_message = ${errorMessage}, updated_at = NOW()
            WHERE id = ${jobId}
        `;
    }

    // ==========================================
    // ANALYSIS PROCESSING
    // ==========================================

    /**
     * Process a single company's website analysis
     */
    static async processCompanyAnalysis(job: AnalysisJob): Promise<boolean> {
        console.log(`🔍 Analyzing ${job.domain} (attempt ${job.attempts}/${job.maxAttempts})`);
        
        try {
            // Run the website analysis
            const structure = await WebsiteStructureService.analyzeWebsite(`https://${job.domain}`);
            
            // Store the results in database
            await this.storeWebsiteStructure(job.companyId, structure);
            
            // Mark job as completed
            await this.markJobCompleted(job.id);
            
            console.log(`✅ Successfully analyzed ${job.domain}: ${structure.pages.length} pages, ${structure.subdomains.length} subdomains`);
            return true;
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Failed to analyze ${job.domain}:`, errorMessage);
            
            if (job.attempts >= job.maxAttempts) {
                await this.markJobFailed(job.id, errorMessage);
                console.log(`💀 Permanently failed ${job.domain} after ${job.attempts} attempts`);
            } else {
                // Reschedule for retry with exponential backoff
                const retryDelay = Math.pow(2, job.attempts) * 60; // 2, 4, 8 minutes
                const sql = this.sql;
                await sql`
                    UPDATE analysis_queue 
                    SET status = 'queued', scheduled_for = NOW() + INTERVAL '${retryDelay} minutes'
                    WHERE id = ${job.id}
                `;
                console.log(`🔄 Rescheduled ${job.domain} for retry in ${retryDelay} minutes`);
            }
            
            return false;
        }
    }

    /**
     * Store website structure in database
     */
    static async storeWebsiteStructure(companyId: string, structure: WebsiteStructure): Promise<void> {
        const sql = this.sql;
        
        // Calculate next analysis date (30 days from now)
        const nextAnalysis = new Date();
        nextAnalysis.setDate(nextAnalysis.getDate() + 30);
        
        // Insert/update main website structure
        const [websiteStructure] = await sql`
            INSERT INTO website_structures (
                company_id, domain, total_pages, total_directories, total_subdomains,
                sitemap_url, last_analyzed, next_analysis, analysis_status
            )
            VALUES (
                ${companyId}, ${structure.domain}, ${structure.pages.length}, 
                ${this.countDirectories(structure.pages)}, ${structure.subdomains.length},
                ${structure.sitemapUrl || null}, NOW(), ${nextAnalysis.toISOString()}, 'completed'
            )
            ON CONFLICT (company_id) DO UPDATE SET
                domain = ${structure.domain},
                total_pages = ${structure.pages.length},
                total_directories = ${this.countDirectories(structure.pages)},
                total_subdomains = ${structure.subdomains.length},
                sitemap_url = ${structure.sitemapUrl || null},
                last_analyzed = NOW(),
                next_analysis = ${nextAnalysis.toISOString()},
                analysis_status = 'completed',
                error_message = NULL,
                updated_at = NOW()
            RETURNING id
        `;

        const websiteStructureId = websiteStructure.id;

        // Clear old pages and subdomains
        await sql`DELETE FROM website_pages WHERE website_structure_id = ${websiteStructureId}`;
        await sql`DELETE FROM website_subdomains WHERE website_structure_id = ${websiteStructureId}`;

        // Insert pages
        if (structure.pages.length > 0) {
            const pageValues = structure.pages.map(page => ({
                websiteStructureId,
                url: page.url,
                path: this.extractPath(page.url),
                title: page.title || null,
                priority: page.priority || null,
                lastModified: page.lastModified || null,
                changeFreq: page.changeFreq || null,
                pageType: this.determinePageType(page.url),
                isDirectory: this.isDirectory(page.url),
                parentPath: this.getParentPath(page.url),
                depth: this.calculateDepth(page.url)
            }));

            // Insert in batches to avoid query size limits
            const batchSize = 100;
            for (let i = 0; i < pageValues.length; i += batchSize) {
                const batch = pageValues.slice(i, i + batchSize);
                await sql`
                    INSERT INTO website_pages (
                        website_structure_id, url, path, title, priority, last_modified,
                        change_freq, page_type, is_directory, parent_path, depth
                    )
                    SELECT * FROM ${sql(batch.map(p => [
                        p.websiteStructureId, p.url, p.path, p.title, p.priority,
                        p.lastModified, p.changeFreq, p.pageType, p.isDirectory,
                        p.parentPath, p.depth
                    ]))}
                `;
            }
        }

        // Insert subdomains
        if (structure.subdomains.length > 0) {
            const subdomainValues = structure.subdomains.map(subdomain => [
                websiteStructureId,
                subdomain.name,
                subdomain.fullDomain,
                subdomain.isActive,
                subdomain.responseTime || null,
                subdomain.lastChecked || null
            ]);

            await sql`
                INSERT INTO website_subdomains (
                    website_structure_id, subdomain, full_domain, is_active, response_time, last_checked
                )
                SELECT * FROM ${sql(subdomainValues)}
            `;
        }

        console.log(`💾 Stored website structure for ${structure.domain}: ${structure.pages.length} pages, ${structure.subdomains.length} subdomains`);
    }

    // ==========================================
    // DATA RETRIEVAL
    // ==========================================

    /**
     * Get cached website structure for a company
     */
    static async getCachedWebsiteStructure(companyId: string): Promise<StoredWebsiteStructure | null> {
        const sql = this.sql;
        
        const [structure] = await sql`
            SELECT ws.*, c.name as company_name
            FROM website_structures ws
            JOIN companies c ON c.id = ws.company_id
            WHERE ws.company_id = ${companyId}
            AND ws.analysis_status = 'completed'
        `;

        if (!structure) return null;

        // Get pages
        const pages = await sql`
            SELECT * FROM website_pages 
            WHERE website_structure_id = ${structure.id}
            ORDER BY priority DESC, path ASC
        `;

        // Get subdomains
        const subdomains = await sql`
            SELECT * FROM website_subdomains 
            WHERE website_structure_id = ${structure.id}
            ORDER BY subdomain ASC
        `;

        return {
            id: structure.id,
            companyId: structure.company_id,
            domain: structure.domain,
            totalPages: structure.total_pages,
            totalDirectories: structure.total_directories,
            totalSubdomains: structure.total_subdomains,
            sitemapUrl: structure.sitemap_url,
            lastAnalyzed: structure.last_analyzed,
            nextAnalysis: structure.next_analysis,
            analysisStatus: structure.analysis_status,
            pages: pages.map(p => ({
                url: p.url,
                path: p.path,
                title: p.title,
                priority: p.priority,
                lastModified: p.last_modified,
                changeFreq: p.change_freq,
                pageType: p.page_type,
                isDirectory: p.is_directory,
                parentPath: p.parent_path,
                depth: p.depth
            })),
            subdomains: subdomains.map(s => ({
                subdomain: s.subdomain,
                fullDomain: s.full_domain,
                isActive: s.is_active,
                responseTime: s.response_time,
                lastChecked: s.last_checked
            }))
        };
    }

    /**
     * Check if website structure needs refresh
     */
    static async needsRefresh(companyId: string): Promise<boolean> {
        const sql = this.sql;
        
        const [result] = await sql`
            SELECT 
                CASE 
                    WHEN next_analysis IS NULL OR next_analysis <= NOW() THEN true
                    WHEN analysis_status != 'completed' THEN true
                    ELSE false
                END as needs_refresh
            FROM website_structures 
            WHERE company_id = ${companyId}
        `;

        return result?.needs_refresh || true; // Default to true if no record
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    private static countDirectories(pages: WebsitePage[]): number {
        const directories = new Set();
        pages.forEach(page => {
            const path = this.extractPath(page.url);
            const segments = path.split('/').filter(Boolean);
            for (let i = 1; i <= segments.length; i++) {
                directories.add('/' + segments.slice(0, i).join('/'));
            }
        });
        return directories.size;
    }

    private static extractPath(url: string): string {
        try {
            return new URL(url).pathname;
        } catch {
            return '/';
        }
    }

    private static determinePageType(url: string): string {
        const path = this.extractPath(url).toLowerCase();
        
        if (path === '/' || path === '') return 'home';
        if (path.includes('about')) return 'about';
        if (path.includes('contact')) return 'contact';
        if (path.includes('service')) return 'services';
        if (path.includes('product')) return 'products';
        if (path.includes('blog') || path.includes('news')) return 'blog';
        if (path.includes('career') || path.includes('job')) return 'careers';
        if (path.includes('support') || path.includes('help')) return 'support';
        
        return 'other';
    }

    private static isDirectory(url: string): boolean {
        const path = this.extractPath(url);
        return path.endsWith('/') && path !== '/';
    }

    private static getParentPath(url: string): string | null {
        const path = this.extractPath(url);
        const segments = path.split('/').filter(Boolean);
        if (segments.length <= 1) return null;
        return '/' + segments.slice(0, -1).join('/');
    }

    private static calculateDepth(url: string): number {
        const path = this.extractPath(url);
        return path.split('/').filter(Boolean).length;
    }
}
