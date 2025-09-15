#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class AutoVersioning {
    constructor() {
        this.packagePath = path.join(__dirname, '..', 'package.json');
        this.versionPath = path.join(__dirname, '..', 'src', 'version.json');
        this.publicVersionPath = path.join(__dirname, '..', 'public', 'version.json');
    }

    async getCurrentVersion() {
        try {
            const packageJson = JSON.parse(await fs.readFile(this.packagePath, 'utf-8'));
            return packageJson.version;
        } catch (error) {
            console.error('Error reading package.json:', error);
            return '1.0.0';
        }
    }

    parseVersion(version) {
        const [major, minor, patch] = version.split('.').map(Number);
        return { major, minor, patch };
    }

    incrementVersion(version, type = 'patch') {
        const { major, minor, patch } = this.parseVersion(version);
        
        switch (type) {
            case 'major':
                return `${major + 1}.0.0`;
            case 'minor':
                return `${major}.${minor + 1}.0`;
            case 'patch':
            default:
                return `${major}.${minor}.${patch + 1}`;
        }
    }

    determineVersionBump(commitMessage) {
        const message = commitMessage.toLowerCase();
        
        // Breaking changes -> major version
        if (message.includes('breaking change') || message.includes('breaking:')) {
            return 'major';
        }
        
        // New features -> minor version
        if (message.startsWith('feat:') || message.startsWith('feature:')) {
            return 'minor';
        }
        
        // Everything else -> patch version
        return 'patch';
    }

    async updateVersion(newVersion) {
        try {
            // Update package.json
            const packageJson = JSON.parse(await fs.readFile(this.packagePath, 'utf-8'));
            packageJson.version = newVersion;
            await fs.writeFile(this.packagePath, JSON.stringify(packageJson, null, 2) + '\n');
            
            // Update src/version.json
            const versionData = {
                version: newVersion,
                buildTime: new Date().toISOString(),
                commit: process.env.GIT_COMMIT || 'unknown',
                branch: process.env.GIT_BRANCH || 'main'
            };
            
            await fs.writeFile(this.versionPath, JSON.stringify(versionData, null, 2) + '\n');
            await fs.writeFile(this.publicVersionPath, JSON.stringify(versionData, null, 2) + '\n');
            
            console.log(`✅ Version updated to ${newVersion}`);
            return true;
        } catch (error) {
            console.error('Error updating version:', error);
            return false;
        }
    }

    async run(commitMessage = '', type = null) {
        const currentVersion = await this.getCurrentVersion();
        console.log(`Current version: ${currentVersion}`);
        
        // Determine version bump type
        const bumpType = type || this.determineVersionBump(commitMessage);
        const newVersion = this.incrementVersion(currentVersion, bumpType);
        
        console.log(`Bumping ${bumpType} version: ${currentVersion} → ${newVersion}`);
        
        await this.updateVersion(newVersion);
        
        return newVersion;
    }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2);
    const commitMessage = args[0] || '';
    const type = args[1] || null;
    
    const versioning = new AutoVersioning();
    versioning.run(commitMessage, type);
}

export default AutoVersioning;