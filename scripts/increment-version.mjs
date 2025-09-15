#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

/**
 * Increment Version Script
 * 
 * This script increments the version number across all version files
 * Usage: npm run increment-version [patch|minor|major]
 * Default: patch
 */

const versionType = process.argv[2] || 'patch';
const currentDate = new Date().toISOString().split('T')[0];

// Version files to update
const versionFiles = [
  'src/version.json',
  'public/version.json'
];

function parseVersion(versionString) {
  // Handle format like "01.00.77"
  const parts = versionString.split('.');
  return {
    major: parseInt(parts[0], 10),
    minor: parseInt(parts[1], 10),
    patch: parseInt(parts[2], 10)
  };
}

function formatVersion(major, minor, patch) {
  // Format back to "01.00.77" style
  return `${major.toString().padStart(2, '0')}.${minor.toString().padStart(2, '0')}.${patch.toString().padStart(2, '0')}`;
}

function incrementVersion(version, type) {
  const parsed = parseVersion(version);
  
  switch (type) {
    case 'major':
      parsed.major += 1;
      parsed.minor = 0;
      parsed.patch = 0;
      break;
    case 'minor':
      parsed.minor += 1;
      parsed.patch = 0;
      break;
    case 'patch':
    default:
      parsed.patch += 1;
      break;
  }
  
  return formatVersion(parsed.major, parsed.minor, parsed.patch);
}

console.log(`🔧 Incrementing version (${versionType})...`);

// Process each version file
versionFiles.forEach(filePath => {
  try {
    const fullPath = path.resolve(filePath);
    const fileContent = fs.readFileSync(fullPath, 'utf8');
    const versionData = JSON.parse(fileContent);
    
    const oldVersion = versionData.version;
    const newVersion = incrementVersion(oldVersion, versionType);
    
    // Update version data
    versionData.version = newVersion;
    versionData.lastUpdated = currentDate;
    versionData.buildNumber = (versionData.buildNumber || 0) + 1;
    
    // Write back to file
    fs.writeFileSync(fullPath, JSON.stringify(versionData, null, 2) + '\n');
    
    console.log(`✅ Updated ${filePath}: ${oldVersion} → ${newVersion} (build ${versionData.buildNumber})`);
    
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
});

// Also update package.json if needed
try {
  const packagePath = 'package.json';
  const packageContent = fs.readFileSync(packagePath, 'utf8');
  const packageData = JSON.parse(packageContent);
  
  // Convert our version format to semver for package.json
  const versionData = JSON.parse(fs.readFileSync('public/version.json', 'utf8'));
  const parsed = parseVersion(versionData.version);
  const semverVersion = `${parsed.major}.${parsed.minor}.${parsed.patch}`;
  
  packageData.version = semverVersion;
  fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2) + '\n');
  
  console.log(`✅ Updated package.json: ${semverVersion}`);
  
} catch (error) {
  console.error(`❌ Error updating package.json:`, error.message);
}

console.log(`\n🎉 Version increment complete!`);
console.log(`📋 Next steps:`);
console.log(`   1. Build: npm run build`);
console.log(`   2. Commit: git add . && git commit -m "chore: bump version to v${JSON.parse(fs.readFileSync('public/version.json', 'utf8')).version}"`);
console.log(`   3. Deploy: git push origin main`);
