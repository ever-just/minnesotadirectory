/**
 * Description Activation Script
 * 
 * This script safely replaces original descriptions with approved new descriptions
 * and provides rollback capabilities
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { companies } from '../db/schema.js';
import fs from 'fs/promises';
import readline from 'readline';

const CONFIG = {
    DATABASE_URL: process.env.DATABASE_URL,
    BACKUP_DIR: './description-backups'
};

class DescriptionActivator {
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
    
    async createBackup() {
        console.log('💾 Creating backup of current descriptions...');
        
        // Get all companies with descriptions
        const companiesData = await this.db
            .select({
                id: companies.id,
                name: companies.name,
                originalDescription: companies.description,
                newDescription: companies.new_description,
                descriptionStatus: companies.description_status
            })
            .from(companies)
            .where(sql`${companies.description} IS NOT NULL OR ${companies.new_description} IS NOT NULL`);
        
        // Create backup directory
        await fs.mkdir(CONFIG.BACKUP_DIR, { recursive: true });
        
        // Create backup file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = `${CONFIG.BACKUP_DIR}/descriptions-backup-${timestamp}.json`;
        
        const backupData = {
            timestamp: new Date().toISOString(),
            totalCompanies: companiesData.length,
            companies: companiesData
        };
        
        await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
        console.log(`✅ Backup saved to ${backupFile}`);
        
        return backupFile;
    }
    
    async getActivationStats() {
        const stats = await this.db.execute(sql`
            SELECT 
                CASE 
                    WHEN description_status = 'approved' THEN 'Ready to Activate'
                    WHEN description_status = 'active' THEN 'Already Active'
                    WHEN description_status = 'generated' THEN 'Awaiting Review'
                    WHEN description_status = 'rejected' THEN 'Rejected'
                    ELSE 'Original Only'
                END as status_group,
                COUNT(*) as count,
                COUNT(*) FILTER (WHERE description IS NOT NULL) as has_original,
                COUNT(*) FILTER (WHERE new_description IS NOT NULL) as has_new
            FROM companies
            GROUP BY 
                CASE 
                    WHEN description_status = 'approved' THEN 'Ready to Activate'
                    WHEN description_status = 'active' THEN 'Already Active'
                    WHEN description_status = 'generated' THEN 'Awaiting Review'
                    WHEN description_status = 'rejected' THEN 'Rejected'
                    ELSE 'Original Only'
                END
            ORDER BY count DESC
        `);
        
        console.log('\n📊 Activation Status:');
        console.log('┌─────────────────────┬───────┬──────────────┬─────────────┐');
        console.log('│ Status              │ Count │ Has Original │ Has New     │');
        console.log('├─────────────────────┼───────┼──────────────┼─────────────┤');
        
        stats.rows.forEach(row => {
            const status = row.status_group.padEnd(19);
            const count = row.count.toString().padStart(5);
            const hasOriginal = row.has_original.toString().padStart(12);
            const hasNew = row.has_new.toString().padStart(11);
            console.log(`│ ${status} │ ${count} │ ${hasOriginal} │ ${hasNew} │`);
        });
        
        console.log('└─────────────────────┴───────┴──────────────┴─────────────┘');
        
        return stats.rows;
    }
    
    async getApprovedDescriptions() {
        return await this.db
            .select()
            .from(companies)
            .where(eq(companies.description_status, 'approved'));
    }
    
    async activateDescriptions(dryRun = true) {
        const approvedCompanies = await this.getApprovedDescriptions();
        
        if (approvedCompanies.length === 0) {
            console.log('ℹ️  No approved descriptions found to activate');
            return { activated: 0, errors: 0 };
        }
        
        console.log(`${dryRun ? '🔍 DRY RUN:' : '🚀 ACTIVATING:'} ${approvedCompanies.length} approved descriptions`);
        
        let activated = 0;
        let errors = 0;
        
        for (const company of approvedCompanies) {
            try {
                if (!dryRun) {
                    await this.db
                        .update(companies)
                        .set({
                            description: company.new_description,
                            description_status: 'active'
                        })
                        .where(eq(companies.id, company.id));
                }
                
                console.log(`${dryRun ? '📋' : '✅'} ${company.name} - ${company.industry}`);
                activated++;
                
            } catch (error) {
                console.error(`❌ Failed to activate ${company.name}: ${error.message}`);
                errors++;
            }
        }
        
        return { activated, errors };
    }
    
    async rollbackDescriptions(backupFile) {
        console.log(`🔄 Rolling back descriptions from ${backupFile}...`);
        
        try {
            const backupData = JSON.parse(await fs.readFile(backupFile, 'utf8'));
            
            let restored = 0;
            let errors = 0;
            
            for (const company of backupData.companies) {
                try {
                    await this.db
                        .update(companies)
                        .set({
                            description: company.originalDescription,
                            description_status: 'original'
                        })
                        .where(eq(companies.id, company.id));
                    
                    restored++;
                    
                } catch (error) {
                    console.error(`❌ Failed to rollback ${company.name}: ${error.message}`);
                    errors++;
                }
            }
            
            console.log(`✅ Rollback complete: ${restored} restored, ${errors} errors`);
            return { restored, errors };
            
        } catch (error) {
            console.error('❌ Failed to read backup file:', error.message);
            throw error;
        }
    }
    
    async previewChanges() {
        const approvedCompanies = await this.getApprovedDescriptions();
        
        if (approvedCompanies.length === 0) {
            console.log('ℹ️  No approved descriptions to preview');
            return;
        }
        
        console.log(`\n🔍 PREVIEW: Changes for ${approvedCompanies.length} companies\n`);
        
        for (let i = 0; i < Math.min(5, approvedCompanies.length); i++) {
            const company = approvedCompanies[i];
            
            console.log(`📋 ${company.name} (${company.industry})`);
            console.log('   Original:', (company.description || 'None').substring(0, 100) + '...');
            console.log('   New:', company.new_description.substring(0, 100) + '...');
            console.log('');
        }
        
        if (approvedCompanies.length > 5) {
            console.log(`... and ${approvedCompanies.length - 5} more companies`);
        }
    }
    
    async confirmAction(message) {
        return new Promise((resolve) => {
            this.rl.question(`${message} (y/N): `, (answer) => {
                resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
            });
        });
    }
    
    async interactiveActivation() {
        console.log('🎯 Interactive Description Activation\n');
        
        // Show current stats
        await this.getActivationStats();
        
        // Preview changes
        await this.previewChanges();
        
        // Confirm backup creation
        const shouldBackup = await this.confirmAction('\n💾 Create backup before activation?');
        let backupFile = null;
        
        if (shouldBackup) {
            backupFile = await this.createBackup();
        }
        
        // Confirm activation
        const shouldActivate = await this.confirmAction('\n🚀 Proceed with activation?');
        
        if (!shouldActivate) {
            console.log('❌ Activation cancelled');
            this.rl.close();
            return;
        }
        
        // Perform activation
        const result = await this.activateDescriptions(false);
        
        console.log(`\n✅ Activation complete!`);
        console.log(`   Activated: ${result.activated}`);
        console.log(`   Errors: ${result.errors}`);
        
        if (backupFile) {
            console.log(`   Backup: ${backupFile}`);
        }
        
        // Show final stats
        await this.getActivationStats();
        
        this.rl.close();
    }
    
    async cleanupOldColumns() {
        const shouldCleanup = await this.confirmAction('\n🧹 Remove new_description and status columns after successful activation?');
        
        if (shouldCleanup) {
            try {
                await this.db.execute(sql`
                    ALTER TABLE companies 
                    DROP COLUMN IF EXISTS new_description,
                    DROP COLUMN IF EXISTS description_status,
                    DROP COLUMN IF EXISTS description_generated_at,
                    DROP COLUMN IF EXISTS description_approved_at,
                    DROP COLUMN IF EXISTS description_source,
                    DROP COLUMN IF EXISTS description_version
                `);
                
                console.log('✅ Cleanup complete - temporary columns removed');
            } catch (error) {
                console.error('❌ Cleanup failed:', error.message);
                console.log('💡 You can manually remove these columns later if needed');
            }
        }
    }
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    const activator = new DescriptionActivator();
    
    switch (command) {
        case 'stats':
            await activator.getActivationStats();
            break;
            
        case 'preview':
            await activator.getActivationStats();
            await activator.previewChanges();
            break;
            
        case 'dry-run':
            const backupFile = await activator.createBackup();
            const dryResult = await activator.activateDescriptions(true);
            console.log(`\n📊 Dry Run Results:`);
            console.log(`   Would activate: ${dryResult.activated}`);
            console.log(`   Potential errors: ${dryResult.errors}`);
            break;
            
        case 'activate':
            const forceFlag = args.includes('--force');
            
            if (forceFlag) {
                // Non-interactive activation
                const backup = await activator.createBackup();
                const result = await activator.activateDescriptions(false);
                console.log(`✅ Forced activation complete: ${result.activated} activated, ${result.errors} errors`);
                console.log(`   Backup: ${backup}`);
            } else {
                // Interactive activation
                await activator.interactiveActivation();
            }
            break;
            
        case 'rollback':
            const backupFilePath = args[1];
            if (!backupFilePath) {
                console.error('❌ Please provide backup file path');
                console.log('Usage: node scripts/activate-descriptions.js rollback <backup-file>');
                break;
            }
            
            const rollbackResult = await activator.rollbackDescriptions(backupFilePath);
            console.log(`✅ Rollback complete: ${rollbackResult.restored} restored, ${rollbackResult.errors} errors`);
            break;
            
        case 'cleanup':
            await activator.cleanupOldColumns();
            break;
            
        default:
            console.log(`
🎯 Description Activation Tool

Usage:
  node scripts/activate-descriptions.js <command> [options]

Commands:
  stats          Show activation statistics
  preview        Preview changes to be made
  dry-run        Run activation simulation with backup
  activate       Interactive activation process
  activate --force  Non-interactive activation
  rollback <file>   Rollback using backup file
  cleanup        Remove temporary columns after activation

Examples:
  node scripts/activate-descriptions.js stats
  node scripts/activate-descriptions.js preview
  node scripts/activate-descriptions.js activate
  node scripts/activate-descriptions.js rollback ./description-backups/backup-2024-01-01.json
  node scripts/activate-descriptions.js cleanup

⚠️  Safety Features:
  • Automatic backup creation before activation
  • Dry-run capability to preview changes
  • Interactive confirmation prompts
  • Complete rollback capability
  • Statistics and progress tracking
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

export default DescriptionActivator;
