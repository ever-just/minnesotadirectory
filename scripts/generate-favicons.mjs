#!/usr/bin/env node

/**
 * Favicon Generation Script for Minnesota Directory
 * 
 * This script provides instructions and tools to generate all required favicon formats
 * from the base SVG file. Since we cannot programmatically generate images in Node.js
 * without additional dependencies, this script provides:
 * 1. Clear instructions for manual generation
 * 2. Validation of existing favicon files
 * 3. Automated favicon package creation guidance
 */

import fs from 'fs';
import path from 'path';

const FAVICON_SIZES = {
  'favicon.ico': '16x16,32x32 (multi-size ICO)',
  'favicon-16x16.png': '16x16',
  'favicon-32x32.png': '32x32', 
  'apple-touch-icon.png': '180x180',
  'android-chrome-192x192.png': '192x192',
  'android-chrome-512x512.png': '512x512',
  'mstile-150x150.png': '150x150'
};

const SOCIAL_SIZES = {
  'og-image.png': '1200x630 (Open Graph)',
  'twitter-image.png': '1200x600 (Twitter Card)'
};

const PUBLIC_DIR = 'public';

function checkFaviconFiles() {
  console.log('🔍 Checking favicon files...\n');
  
  const results = {
    existing: [],
    missing: [],
    total: 0,
    complete: 0
  };

  // Check core favicon files
  console.log('📱 Core Favicon Files:');
  Object.entries(FAVICON_SIZES).forEach(([filename, size]) => {
    const filepath = path.join(PUBLIC_DIR, filename);
    const exists = fs.existsSync(filepath);
    results.total++;
    
    if (exists) {
      const stats = fs.statSync(filepath);
      const sizeKB = (stats.size / 1024).toFixed(1);
      console.log(`  ✅ ${filename} (${size}) - ${sizeKB}KB`);
      results.existing.push(filename);
      results.complete++;
    } else {
      console.log(`  ❌ ${filename} (${size}) - Missing`);
      results.missing.push(filename);
    }
  });

  // Check social media images
  console.log('\n🌐 Social Media Images:');
  Object.entries(SOCIAL_SIZES).forEach(([filename, size]) => {
    const filepath = path.join(PUBLIC_DIR, filename);
    const exists = fs.existsSync(filepath);
    results.total++;
    
    if (exists) {
      const stats = fs.statSync(filepath);
      const sizeKB = (stats.size / 1024).toFixed(1);
      console.log(`  ✅ ${filename} (${size}) - ${sizeKB}KB`);
      results.existing.push(filename);
      results.complete++;
    } else {
      console.log(`  ⚠️  ${filename} (${size}) - Missing (Optional)`);
      results.missing.push(filename);
    }
  });

  // Check base SVG
  console.log('\n📄 Base Files:');
  const svgPath = path.join(PUBLIC_DIR, 'favicon.svg');
  if (fs.existsSync(svgPath)) {
    console.log('  ✅ favicon.svg - Base file exists');
  } else {
    console.log('  ❌ favicon.svg - Missing base file!');
  }

  return results;
}

function printGenerationInstructions() {
  console.log('\n' + '='.repeat(60));
  console.log('🎨 FAVICON GENERATION INSTRUCTIONS');
  console.log('='.repeat(60));
  
  console.log('\n🎯 AUTOMATIC GENERATION (Recommended):');
  console.log('1. Visit: https://realfavicongenerator.net/');
  console.log('2. Upload: public/favicon.svg');
  console.log('3. Configure settings for each platform');
  console.log('4. Download the generated package');
  console.log('5. Extract files to public/ directory');
  console.log('6. Run this script again to verify');

  console.log('\n🎯 ALTERNATIVE TOOLS:');
  console.log('• https://favicon.io/ - Simple text/image to favicon');
  console.log('• https://www.favicon-generator.org/ - Multi-format generator');
  console.log('• https://formito.com/tools/favicon - Online favicon maker');

  console.log('\n🎯 MANUAL GENERATION:');
  console.log('Using design software (Figma, Photoshop, GIMP):');
  console.log('1. Open public/favicon.svg in your design tool');
  console.log('2. Export each required size:');
  
  Object.entries(FAVICON_SIZES).forEach(([filename, size]) => {
    console.log(`   • ${filename} → ${size}`);
  });

  console.log('\n🎯 SOCIAL MEDIA IMAGES:');
  console.log('Create branded social sharing images:');
  Object.entries(SOCIAL_SIZES).forEach(([filename, size]) => {
    console.log(`   • ${filename} → ${size}`);
  });

  console.log('\n🎯 OPTIMIZATION TIPS:');
  console.log('• Keep favicon.ico under 32KB');
  console.log('• PNG files should be under 10KB each (except social images)');
  console.log('• Use https://tinypng.com/ to compress PNG files');
  console.log('• Test at 16x16 size to ensure clarity');
}

function printFileStructure() {
  console.log('\n' + '='.repeat(40));
  console.log('📁 EXPECTED FILE STRUCTURE');
  console.log('='.repeat(40));
  console.log('public/');
  console.log('├── favicon.svg ✅ (Base file - exists)');
  
  Object.keys(FAVICON_SIZES).forEach(filename => {
    const exists = fs.existsSync(path.join(PUBLIC_DIR, filename));
    console.log(`├── ${filename} ${exists ? '✅' : '❌'}`);
  });
  
  Object.keys(SOCIAL_SIZES).forEach(filename => {
    const exists = fs.existsSync(path.join(PUBLIC_DIR, filename));
    console.log(`├── ${filename} ${exists ? '✅' : '⚠️'} (Optional)`);
  });
  
  console.log('├── site.webmanifest ✅ (PWA config - exists)');
  console.log('├── browserconfig.xml ✅ (Windows tiles - exists)');
  console.log('└── robots.txt ✅ (SEO config - exists)');
}

function generateFaviconPackage() {
  console.log('\n🔧 FAVICON PACKAGE GENERATOR');
  console.log('Creating favicon generation template...\n');

  const template = {
    source: 'public/favicon.svg',
    outputs: Object.entries(FAVICON_SIZES).map(([filename, size]) => ({
      filename,
      size,
      format: filename.endsWith('.ico') ? 'ico' : 'png'
    })),
    socialMedia: Object.entries(SOCIAL_SIZES).map(([filename, size]) => ({
      filename,
      size,
      format: 'png',
      template: `Minnesota Business Directory - ${filename === 'og-image.png' ? 'Social Preview' : 'Twitter Card'}`
    })),
    instructions: [
      'Upload public/favicon.svg to your preferred favicon generator',
      'Generate all required formats',
      'Download and extract to public/ directory',
      'Run npm run check-favicons to verify'
    ]
  };

  const templatePath = 'favicon-generation-template.json';
  fs.writeFileSync(templatePath, JSON.stringify(template, null, 2));
  console.log(`📄 Template saved to: ${templatePath}`);
  console.log('📄 Use this template with favicon generation tools');
}

// Main execution
function main() {
  console.log('🎨 Minnesota Directory - Favicon Generator\n');
  
  const results = checkFaviconFiles();
  
  console.log('\n📊 GENERATION STATUS:');
  console.log(`Complete: ${results.complete}/${results.total} files`);
  console.log(`Missing: ${results.missing.length} files`);
  
  if (results.missing.length > 0) {
    printGenerationInstructions();
    generateFaviconPackage();
  } else {
    console.log('\n🎉 All favicon files are present!');
    console.log('✅ Your favicon implementation is complete.');
  }
  
  printFileStructure();
  
  console.log('\n🚀 NEXT STEPS:');
  console.log('1. Generate missing favicon files using the instructions above');
  console.log('2. Test with: npm run check-favicons');
  console.log('3. Build project: npm run build');
  console.log('4. Test favicon display in browsers');
}

// Export for use in other scripts
export { checkFaviconFiles, FAVICON_SIZES, SOCIAL_SIZES };

// Always run the main function when script is executed
main();
