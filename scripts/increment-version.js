#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const versionFilePath = path.join(__dirname, '../public/version.json');

// Read current version
let versionData;
try {
  const versionContent = fs.readFileSync(versionFilePath, 'utf8');
  versionData = JSON.parse(versionContent);
} catch (error) {
  console.log('Version file not found, creating initial version...');
  versionData = {
    version: '01.00.00',
    lastUpdated: new Date().toISOString().split('T')[0],
    buildNumber: 1
  };
}

// Increment version
const versionParts = versionData.version.split('.').map(num => parseInt(num, 10));

// Increment patch version (00.00.01 -> 00.00.02)
versionParts[2] += 1;

// If patch reaches 100, increment minor and reset patch
if (versionParts[2] >= 100) {
  versionParts[2] = 0;
  versionParts[1] += 1;
}

// If minor reaches 100, increment major and reset minor
if (versionParts[1] >= 100) {
  versionParts[1] = 0;
  versionParts[0] += 1;
}

// Format with leading zeros
const newVersion = versionParts
  .map(num => num.toString().padStart(2, '0'))
  .join('.');

// Update version data
versionData.version = newVersion;
versionData.lastUpdated = new Date().toISOString().split('T')[0];
versionData.buildNumber += 1;

// Write updated version
fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2));

console.log(`✅ Version incremented to: ${newVersion}`);
console.log(`📅 Last updated: ${versionData.lastUpdated}`);
console.log(`🔢 Build number: ${versionData.buildNumber}`);
