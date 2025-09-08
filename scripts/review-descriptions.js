/**
 * Description Review and Approval Workflow
 * 
 * This script provides tools to review, approve, and manage generated business descriptions
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { companies } from '../db/schema.js';
import readline from 'readline';
import fs from 'fs/promises';

const CONFIG = {
    DATABASE_URL: process.env.DATABASE_URL,
    OUTPUT_DIR: './review-reports'
};

class DescriptionReviewTool {
    constructor() {
        if (!CONFIG.DATABASE_URL) {
            throw new Error('DATABASE_URL environment variable is required');
        }
        const sql = neon(CONFIG.DATABASE_URL);
        this.db = drizzle(sql);
        
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }
    
    async getGeneratedDescriptions(limit = 20, offset = 0) {
        return await this.db
            .select()
            .from(companies)
            .where(eq(companies.description_status, 'generated'))
            .limit(limit)
            .offset(offset);
    }
    
    async generateReviewReport() {
        console.log('📊 Generating comprehensive review report...');
        
        // Get summary statistics
        const stats = await this.db.execute(sql`
            SELECT 
                description_status,
                description_source,
                COUNT(*) as count,
                AVG(CHAR_LENGTH(new_description)) as avg_length
            FROM companies 
            WHERE new_description IS NOT NULL
            GROUP BY description_status, description_source
            ORDER BY description_status, count DESC
        `);
        
        // Get sample companies for each status
        const samples = await this.db.execute(sql`
            WITH ranked_companies AS (
                SELECT 
                    name,
                    industry,
                    description_status,
                    description_source,
                    LEFT(description, 150) as old_desc,
                    LEFT(new_description, 150) as new_desc,
                    description_generated_at,
                    ROW_NUMBER() OVER (PARTITION BY description_status ORDER BY description_generated_at DESC) as rn
                FROM companies 
                WHERE new_description IS NOT NULL
            )
            SELECT * FROM ranked_companies WHERE rn <= 5
            ORDER BY description_status, rn
        `);
        
        // Generate report
        let report = `# Business Description Review Report
Generated: ${new Date().toISOString()}

## Summary Statistics

| Status | Source | Count | Avg Length |
|--------|--------|-------|------------|
`;
        
        stats.rows.forEach(row => {
            report += `| ${row.description_status} | ${row.description_source || 'N/A'} | ${row.count} | ${Math.round(row.avg_length || 0)} chars |\n`;
        });
        
        report += `\n## Sample Descriptions by Status\n\n`;
        
        let currentStatus = '';
        samples.rows.forEach(row => {
            if (row.description_status !== currentStatus) {
                currentStatus = row.description_status;
                report += `### ${currentStatus.toUpperCase()}\n\n`;
            }
            
            report += `**${row.name}** (${row.industry})\n`;
            report += `*Source: ${row.description_source}*\n`;
            report += `*Generated: ${row.description_generated_at}*\n\n`;
            report += `**Original:** ${row.old_desc}...\n\n`;
            report += `**New:** ${row.new_desc}...\n\n`;
            report += `---\n\n`;
        });
        
        // Save report
        await fs.mkdir(CONFIG.OUTPUT_DIR, { recursive: true });
        const filename = `review-report-${new Date().toISOString().split('T')[0]}.md`;
        const filepath = `${CONFIG.OUTPUT_DIR}/${filename}`;
        
        await fs.writeFile(filepath, report);
        console.log(`✅ Report saved to ${filepath}`);
        
        return stats.rows;
    }
    
    async interactiveReview() {
        console.log('🔍 Starting interactive review process...');
        console.log('Commands: [a]pprove, [r]eject, [s]kip, [e]dit, [q]uit, [h]elp');
        
        let offset = 0;
        const limit = 1;
        let hasMore = true;
        
        while (hasMore) {
            const companies = await this.getGeneratedDescriptions(limit, offset);
            
            if (companies.length === 0) {
                console.log('✅ No more descriptions to review!');
                break;
            }
            
            const company = companies[0];
            
            console.log('\n' + '='.repeat(80));
            console.log(`📋 Company: ${company.name}`);
            console.log(`🏭 Industry: ${company.industry}`);
            console.log(`🌐 Website: ${company.website || 'Not available'}`);
            console.log(`📍 Location: ${company.city}, ${company.state}`);
            console.log(`💰 Revenue: $${company.sales || 'Not disclosed'}`);
            console.log(`👥 Employees: ${company.employees || 'Not specified'}`);
            console.log(`📅 Generated: ${company.description_generated_at}`);
            console.log(`🔧 Source: ${company.description_source}`);
            console.log('\n📝 ORIGINAL DESCRIPTION:');
            console.log(company.description || 'No original description');
            console.log('\n🆕 NEW DESCRIPTION:');
            console.log(company.new_description);
            console.log('='.repeat(80));
            
            const action = await this.askQuestion('\n👉 Action [a/r/s/e/q/h]: ');
            
            switch (action.toLowerCase()) {
                case 'a':
                    await this.approveDescription(company.id);
                    console.log('✅ Description approved!');
                    offset++;
                    break;
                    
                case 'r':
                    const reason = await this.askQuestion('Reason for rejection: ');
                    await this.rejectDescription(company.id, reason);
                    console.log('❌ Description rejected');
                    offset++;
                    break;
                    
                case 's':
                    console.log('⏭️  Skipped');
                    offset++;
                    break;
                    
                case 'e':
                    console.log('✏️  Edit mode not implemented yet. Use [s]kip and edit manually in database.');
                    break;
                    
                case 'q':
                    console.log('👋 Exiting review process');
                    hasMore = false;
                    break;
                    
                case 'h':
                    this.showHelp();
                    break;
                    
                default:
                    console.log('❓ Invalid command. Type [h] for help.');
                    break;
            }
        }
        
        this.rl.close();
    }
    
    async approveDescription(companyId) {
        await this.db
            .update(companies)
            .set({
                description_status: 'approved',
                description_approved_at: new Date()
            })
            .where(eq(companies.id, companyId));
    }
    
    async rejectDescription(companyId, reason) {
        await this.db
            .update(companies)
            .set({
                description_status: 'rejected'
                // Could add a rejection_reason column if needed
            })
            .where(eq(companies.id, companyId));
    }
    
    async bulkApprove(criteria = {}) {
        let conditions = [eq(companies.description_status, 'generated')];
        
        if (criteria.source) {
            conditions.push(eq(companies.description_source, criteria.source));
        }
        
        if (criteria.industry) {
            conditions.push(eq(companies.industry, criteria.industry));
        }
        
        if (criteria.minLength) {
            conditions.push(sql`CHAR_LENGTH(${companies.new_description}) >= ${criteria.minLength}`);
        }
        
        const result = await this.db
            .update(companies)
            .set({
                description_status: 'approved',
                description_approved_at: new Date()
            })
            .where(and(...conditions));
        
        console.log(`✅ Bulk approved descriptions matching criteria`);
        return result;
    }
    
    async getApprovalStats() {
        const stats = await this.db.execute(sql`
            SELECT 
                description_status,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM companies WHERE new_description IS NOT NULL), 2) as percentage
            FROM companies 
            WHERE new_description IS NOT NULL
            GROUP BY description_status
            ORDER BY count DESC
        `);
        
        console.log('\n📊 Approval Statistics:');
        console.log('┌─────────────┬───────┬────────────┐');
        console.log('│ Status      │ Count │ Percentage │');
        console.log('├─────────────┼───────┼────────────┤');
        
        stats.rows.forEach(row => {
            const status = row.description_status.padEnd(11);
            const count = row.count.toString().padStart(5);
            const percentage = (row.percentage + '%').padStart(10);
            console.log(`│ ${status} │ ${count} │ ${percentage} │`);
        });
        
        console.log('└─────────────┴───────┴────────────┘');
    }
    
    showHelp() {
        console.log(`
📖 Review Commands Help:

🔹 [a] Approve    - Mark description as approved and ready for activation
🔹 [r] Reject     - Mark description as rejected (requires reason)
🔹 [s] Skip       - Skip this description for now
🔹 [e] Edit       - Edit mode (not implemented - edit manually)
🔹 [q] Quit       - Exit the review process
🔹 [h] Help       - Show this help message

💡 Tips:
- Look for accuracy, completeness, and professional tone
- Ensure Business Model Canvas sections are properly filled
- Check if company information matches what you know
- Reject descriptions that seem inaccurate or too generic
        `);
    }
    
    askQuestion(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer);
            });
        });
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    const tool = new DescriptionReviewTool();
    
    switch (command) {
        case 'report':
            await tool.generateReviewReport();
            await tool.getApprovalStats();
            break;
            
        case 'review':
            await tool.interactiveReview();
            break;
            
        case 'stats':
            await tool.getApprovalStats();
            break;
            
        case 'bulk-approve':
            const criteria = {};
            
            // Parse bulk approval criteria from command line
            for (let i = 1; i < args.length; i += 2) {
                const key = args[i].replace('--', '');
                const value = args[i + 1];
                
                if (key === 'source') criteria.source = value;
                if (key === 'industry') criteria.industry = value;
                if (key === 'min-length') criteria.minLength = parseInt(value);
            }
            
            console.log('Bulk approving with criteria:', criteria);
            await tool.bulkApprove(criteria);
            await tool.getApprovalStats();
            break;
            
        default:
            console.log(`
📋 Description Review Tool

Usage:
  node scripts/review-descriptions.js <command> [options]

Commands:
  report              Generate comprehensive review report
  review              Start interactive review process
  stats               Show approval statistics
  bulk-approve        Bulk approve descriptions with criteria

Bulk Approve Options:
  --source <name>     Approve only from specific source (e.g., claude-3-sonnet)
  --industry <name>   Approve only from specific industry
  --min-length <num>  Approve only descriptions with minimum character length

Examples:
  node scripts/review-descriptions.js report
  node scripts/review-descriptions.js review
  node scripts/review-descriptions.js bulk-approve --source claude-3-sonnet --min-length 500
  node scripts/review-descriptions.js stats
            `);
            break;
    }
    
    process.exit(0);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('💥 Error:', error.message);
        process.exit(1);
    });
}

export default DescriptionReviewTool;
