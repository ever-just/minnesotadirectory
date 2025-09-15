#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔧 Setting up Git hooks for automatic versioning...\n');

try {
    // Check if .git exists
    if (!fs.existsSync(path.join(__dirname, '..', '.git'))) {
        console.error('❌ Not a git repository. Please run this from the project root.');
        process.exit(1);
    }

    // Create hooks directory if it doesn't exist
    const hooksDir = path.join(__dirname, '..', '.git', 'hooks');
    if (!fs.existsSync(hooksDir)) {
        fs.mkdirSync(hooksDir, { recursive: true });
    }

    // Create pre-commit hook
    const preCommitHook = `#!/bin/sh
# Auto-versioning pre-commit hook

# Get the commit message (if available)
COMMIT_MSG=$(git diff --cached --name-only)

# Check if package.json is being committed
if git diff --cached --name-only | grep -q "package.json"; then
    echo "📦 package.json already staged, skipping auto-version"
else
    echo "📦 Running auto-versioning..."
    
    # Run version increment
    node scripts/auto-version.js "patch"
    
    # Stage the updated files
    git add package.json src/version.json public/version.json 2>/dev/null || true
    
    # Show new version
    VERSION=$(node -p "require('./package.json').version")
    echo "✅ Version updated to v$VERSION"
fi
`;

    // Create post-commit hook
    const postCommitHook = `#!/bin/sh
# Post-commit hook to display version info

VERSION=$(node -p "require('./package.json').version")
COMMIT=$(git rev-parse --short HEAD)

echo ""
echo "═══════════════════════════════════════"
echo "  📦 Committed as version v$VERSION"
echo "  🔖 Commit: $COMMIT"
echo "═══════════════════════════════════════"
echo ""
`;

    // Write hooks
    fs.writeFileSync(path.join(hooksDir, 'pre-commit'), preCommitHook);
    fs.chmodSync(path.join(hooksDir, 'pre-commit'), '755');
    
    fs.writeFileSync(path.join(hooksDir, 'post-commit'), postCommitHook);
    fs.chmodSync(path.join(hooksDir, 'post-commit'), '755');

    console.log('✅ Git hooks installed successfully!\n');
    console.log('📋 Hooks installed:');
    console.log('   • pre-commit: Auto-increments version before each commit');
    console.log('   • post-commit: Displays version info after commit\n');
    
    console.log('🎯 Version bumping rules:');
    console.log('   • feat: commits → minor version bump (1.0.0 → 1.1.0)');
    console.log('   • fix/chore/docs: → patch version bump (1.0.0 → 1.0.1)');
    console.log('   • breaking change: → major version bump (1.0.0 → 2.0.0)\n');
    
    console.log('💡 To disable for a specific commit, use:');
    console.log('   git commit --no-verify\n');

} catch (error) {
    console.error('❌ Error setting up hooks:', error.message);
    process.exit(1);
}