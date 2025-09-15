# 📦 Versioning System Documentation

## Overview
This project uses **automatic semantic versioning** that increments the version number with every commit. The version is synchronized across multiple files and follows semantic versioning principles (MAJOR.MINOR.PATCH).

## 🚀 Quick Start

### Automatic Versioning (Recommended)
The project automatically increments the version on every commit:
```bash
git add .
git commit -m "feat: Add new feature"  # Auto-increments minor version
```

### Manual Version Commands
```bash
npm run version:patch  # Increment patch version (1.0.0 → 1.0.1)
npm run version:minor  # Increment minor version (1.0.0 → 1.1.0)
npm run version:major  # Increment major version (1.0.0 → 2.0.0)
```

## 📋 Versioning Rules

### Automatic Version Bumping Based on Commit Message

| Commit Type | Version Change | Example | When to Use |
|------------|---------------|---------|-------------|
| `feat:` | Minor (+0.1.0) | 1.0.0 → 1.1.0 | New features |
| `fix:` | Patch (+0.0.1) | 1.0.0 → 1.0.1 | Bug fixes |
| `docs:` | Patch (+0.0.1) | 1.0.0 → 1.0.1 | Documentation |
| `style:` | Patch (+0.0.1) | 1.0.0 → 1.0.1 | Code style changes |
| `refactor:` | Patch (+0.0.1) | 1.0.0 → 1.0.1 | Code refactoring |
| `perf:` | Patch (+0.0.1) | 1.0.0 → 1.0.1 | Performance improvements |
| `test:` | Patch (+0.0.1) | 1.0.0 → 1.0.1 | Test additions/changes |
| `chore:` | Patch (+0.0.1) | 1.0.0 → 1.0.1 | Build/tool changes |
| `BREAKING CHANGE:` | Major (+1.0.0) | 1.0.0 → 2.0.0 | Breaking API changes |

## 🔧 Configuration

### Version Files
The version is synchronized across these files:
- `package.json` - Main version source
- `src/version.json` - Runtime version info
- `public/version.json` - Public version endpoint

### Git Hooks
The project uses Git hooks for automatic versioning:
- **pre-commit**: Automatically increments version before commit
- **post-commit**: Displays version information after commit

### Project Configuration
See `.project-config.json` for complete versioning configuration:
```json
{
  "versioning": {
    "enabled": true,
    "autoIncrement": true,
    "strategy": "semantic"
  }
}
```

## 💻 Usage Examples

### Standard Development Workflow
```bash
# Make your changes
edit src/components/MyComponent.tsx

# Commit with conventional message
git add .
git commit -m "feat: Add search functionality"
# Version automatically bumped to next minor version

# Push to remote
git push origin main
```

### Bug Fix Workflow
```bash
# Fix a bug
edit src/utils/helper.js

# Commit the fix
git add .
git commit -m "fix: Resolve null pointer in helper function"
# Version automatically bumped to next patch version
```

### Breaking Change Workflow
```bash
# Make breaking changes
edit src/api/endpoints.js

# Commit with breaking change notice
git add .
git commit -m "feat: Redesign API endpoints

BREAKING CHANGE: API endpoints have been restructured"
# Version automatically bumped to next major version
```

## 🛠️ Setup

### Initial Setup (Already Done)
```bash
# Install git hooks
npm run setup:hooks

# Verify hooks are installed
ls -la .git/hooks/
```

### Disable Auto-Versioning for a Commit
```bash
git commit --no-verify -m "temporary: Skip version bump"
```

## 📊 Version Information

### Check Current Version
```bash
# Via npm
npm version

# Via package.json
cat package.json | grep version

# Via version endpoint (when running)
curl http://localhost:3000/version.json
```

### Version History
```bash
# View version changes in git log
git log --oneline | grep -E "v[0-9]+\.[0-9]+\.[0-9]+"
```

## 🔍 Troubleshooting

### Version Not Incrementing
1. Check if hooks are installed: `ls .git/hooks/`
2. Reinstall hooks: `npm run setup:hooks`
3. Check commit message format follows conventions

### Version Out of Sync
```bash
# Manually sync version files
npm run version:patch
```

### Reset Version
```bash
# Edit package.json manually
# Then run auto-version to sync
npm run version:auto
```

## 📜 Commit Message Format

### Structure
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Examples
```bash
# Feature
feat(auth): Add OAuth2 integration

# Fix
fix(api): Handle timeout errors properly

# Breaking Change
feat(database): Migrate to PostgreSQL

BREAKING CHANGE: MySQL support has been removed
```

## 🎯 Best Practices

1. **Always use conventional commits** for automatic version bumping
2. **Include scope** in commit messages for clarity
3. **Document breaking changes** in commit body
4. **Review version before pushing** to ensure correctness
5. **Tag releases** for important versions: `git tag v1.0.0`

## 📝 Global Project Rules

As defined in `.project-config.json`:
- ✅ Always increment version number with each commit
- ✅ Use semantic versioning (major.minor.patch)
- ✅ Follow conventional commit messages
- ✅ Auto-stage version files when committing
- ✅ Display version info after each commit
- ✅ Synchronize version across all version files

## 🚨 Important Notes

- Version is automatically incremented on EVERY commit
- To skip versioning, use `--no-verify` flag
- Version files are automatically staged with commits
- Breaking changes should be clearly marked in commit messages
- The system follows semantic versioning strictly

## 📞 Support

For issues with the versioning system:
1. Check this documentation
2. Review `.project-config.json` settings
3. Examine git hooks in `.git/hooks/`
4. Check the auto-version script: `scripts/auto-version.js`

---

*Last Updated: September 2024*
*Version System: v2.0.0*