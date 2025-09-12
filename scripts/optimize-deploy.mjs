#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function optimizeDeploy() {
  console.log('🚀 Optimizing deployment...');
  
  try {
    // Remove any unnecessary files before deployment
    const filesToRemove = [
      'dist/assets/*.map',  // Remove source maps if any
      'dist/**/*.LICENSE.txt',  // Remove license files
    ];
    
    // Clean up node_modules if present in dist
    try {
      await fs.rmdir(join(rootDir, 'dist/node_modules'), { recursive: true });
      console.log('✅ Removed node_modules from dist');
    } catch (e) {
      // Ignore if doesn't exist
    }
    
    // Ensure data directory exists
    try {
      await fs.access(join(rootDir, 'data'));
      console.log('✅ Data directory exists');
    } catch {
      console.error('❌ Data directory missing! Creating it...');
      await fs.mkdir(join(rootDir, 'data'), { recursive: true });
    }
    
    // Check that large files are not in dist
    const distFiles = await fs.readdir(join(rootDir, 'dist'), { recursive: true });
    for (const file of distFiles) {
      if (file.includes('real-pages-lookup') || file.includes('ForMinnesotacompanies')) {
        console.error(`❌ Found large file in dist: ${file}`);
        // Remove it
        await fs.unlink(join(rootDir, 'dist', file));
        console.log(`✅ Removed ${file} from dist`);
      }
    }
    
    console.log('✅ Deployment optimization complete');
  } catch (error) {
    console.error('❌ Error during optimization:', error);
    process.exit(1);
  }
}

optimizeDeploy();
