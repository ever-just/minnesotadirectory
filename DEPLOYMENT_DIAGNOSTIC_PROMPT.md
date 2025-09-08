# 🔍 Claude 4 Sonnet Deployment Diagnostic Research Prompt

## 📋 **Research Objective**
Investigate why **git commits to main branch are not deploying to production site** despite successful pushes. The live site shows **v01.00.30** while local shows **v01.00.39** indicating a deployment pipeline failure.

---

## 🚨 **PROBLEM STATEMENT**

### **Current Situation:**
- ✅ **Local Development**: Working perfectly on localhost:8888
- ✅ **Git Commits**: Successful pushes to main branch (confirmed in terminal)
- ✅ **Version Increments**: Local version.json shows 01.00.39
- ❌ **Live Site**: Still showing v01.00.30 (9 versions behind!)
- ❌ **Production Deployment**: Not updating despite code changes

### **Expected vs Actual:**
```
Expected: Git Push → Auto Deploy → Live Site Updated
Actual:   Git Push → ??? → Live Site Unchanged
```

---

## 🔍 **PROJECT INVESTIGATION CHECKLIST**

### **1. Repository Configuration Analysis**

#### **Check Git Remote Configuration:**
```bash
# Verify git remote URLs
git remote -v

# Check current branch and upstream
git branch -vv

# Verify recent commits reached origin
git log --oneline -10
git log origin/main --oneline -10

# Check for any local vs remote divergence
git status
git diff origin/main
```

#### **Expected Results:**
- Remote should point to correct GitHub repository
- Main branch should track origin/main
- Recent commits should be visible on both local and origin

### **2. Netlify Configuration Files**

#### **Check netlify.toml Configuration:**
```bash
# Examine build configuration
cat netlify.toml

# Key settings to verify:
# - [build] command and publish directory
# - Branch deployment settings
# - Function configuration
# - Environment variables
```

#### **Look for:**
- ✅ **Build command**: Should trigger on main branch
- ✅ **Publish directory**: Should be 'dist' or correct build output
- ✅ **Branch settings**: Auto-deploy configuration
- ❌ **Conflicting settings**: Multiple build configs

### **3. Package.json Build Scripts**

#### **Verify Build Configuration:**
```bash
# Check build scripts
cat package.json | grep -A 10 -B 5 "scripts"

# Test local build
npm run build

# Check if build creates dist/ directory
ls -la dist/
```

#### **Critical Questions:**
- Does `npm run build` complete successfully?
- Is the dist/ directory created and populated?
- Are there any build errors or warnings?

### **4. Version.json Investigation**

#### **Check Version File Consistency:**
```bash
# Check local version
cat public/version.json
cat dist/version.json  # If exists after build

# Check version in git history
git log --oneline | head -5
```

#### **Expected vs Actual:**
- Local version.json should show 01.00.39
- Git commits should show version increments
- Live site should reflect latest version

---

## 🌐 **NETLIFY DASHBOARD INVESTIGATION**

### **Deployment Status Research:**

#### **What to Check in Netlify Dashboard:**
1. **Site Overview**:
   - Last deployment timestamp
   - Deployment status (success/failed/pending)
   - Active branch being deployed

2. **Deploys Tab**:
   - Recent deployment history
   - Build logs for failures
   - Deploy previews vs production

3. **Site Configuration**:
   - Connected repository
   - Branch settings (auto-deploy)
   - Build settings (command, directory)

4. **Functions Tab**:
   - Function deployment status
   - Runtime errors or build failures

### **Environment Variables**:
```bash
# Check if required environment variables are set in Netlify
# Should include:
# - DATABASE_URL
# - STACK_SECRET_SERVER_KEY
# - JWT_SECRET
```

---

## 🔍 **WEB RESEARCH QUESTIONS**

### **When Project Investigation Reveals Issues:**

#### **If Repository Disconnected:**
**Search:** "Netlify reconnect GitHub repository deployment not working"
**Search:** "Netlify site not deploying from git push main branch"

#### **If Build Failures Found:**
**Search:** "Netlify build failed React Vite TypeScript troubleshooting"
**Search:** "Netlify build logs error [SPECIFIC_ERROR_FROM_LOGS]"

#### **If Branch Configuration Issues:**
**Search:** "Netlify deploy branch settings not working main branch"
**Search:** "Netlify auto deploy from main branch configuration"

#### **If Environment Variable Issues:**
**Search:** "Netlify environment variables not deploying production build"
**Search:** "Netlify build environment variables missing production"

#### **If Function Deployment Issues:**
**Search:** "Netlify Functions TypeScript deployment build errors"
**Search:** "Netlify Functions not deploying with site update"

---

## 📊 **DIAGNOSTIC METHODOLOGY**

### **Phase 1: Local Project Analysis (15 minutes)**
1. **Git Status**: Verify repository state and commit history
2. **Build Test**: Run local build and check for errors  
3. **Configuration Review**: Examine netlify.toml and package.json
4. **Version Tracking**: Trace version.json changes

### **Phase 2: Netlify Dashboard Deep Dive (15 minutes)**
1. **Deployment History**: Check last successful vs failed deploys
2. **Build Logs**: Examine any error messages or warnings
3. **Site Configuration**: Verify repository and branch connections
4. **Function Status**: Check if functions are deploying properly

### **Phase 3: Web Research (15-30 minutes)**
Based on findings from Phase 1-2, research specific issues:
1. **Search specific error messages** found in build logs
2. **Research configuration problems** identified
3. **Find solutions** for deployment pipeline issues

### **Phase 4: Solution Implementation (30-60 minutes)**
1. **Apply fixes** based on research findings
2. **Test deployment** with small change
3. **Verify production update** 
4. **Document solution** for future reference

---

## 🎯 **SUCCESS CRITERIA**

### **Primary Goal:**
✅ **Production site shows latest version** (01.00.39+) after git push

### **Secondary Goals:**
✅ **All enterprise features working** on live site (auth, saved companies, logos)
✅ **Reliable deployment pipeline** for future updates
✅ **Clear understanding** of deployment process

---

## 📋 **EXPECTED RESEARCH OUTPUTS**

### **Diagnostic Report:**
```markdown
# Deployment Pipeline Analysis

## Root Cause Identified
[Specific issue preventing deployments]

## Configuration Issues Found
[Netlify settings, git config, build problems]

## Solution Steps
[Exact steps to fix deployment pipeline]

## Verification Method
[How to confirm deployments are working]
```

### **Implementation Plan:**
```markdown
# Deployment Fix Implementation

## Immediate Fixes Required
[Critical issues to resolve first]

## Configuration Changes
[Netlify dashboard or config file updates]

## Testing Protocol
[How to verify each fix works]

## Prevention Strategy
[How to avoid future deployment issues]
```

---

## ⚠️ **CRITICAL AREAS TO INVESTIGATE**

### **High Priority:**
1. **Netlify Site Connection**: Is the correct GitHub repo connected?
2. **Build Triggers**: Are pushes to main configured to trigger builds?
3. **Build Failures**: Are there silent build failures in Netlify?
4. **Branch Configuration**: Is the site deploying from the correct branch?

### **Medium Priority:**
1. **Environment Variables**: Are production env vars properly configured?
2. **Build Command**: Is the build command correct and working?
3. **Function Dependencies**: Are Netlify Functions building properly?
4. **Domain Configuration**: Any DNS or domain-related issues?

### **Low Priority:**
1. **Caching Issues**: CDN or browser caching problems
2. **Preview vs Production**: Deploying to wrong environment
3. **Manual Deploy Required**: Auto-deploy disabled

---

## 🎯 **RESEARCH SUCCESS INDICATORS**

### **When Research is Complete:**
- ✅ **Root cause identified**: Clear understanding of deployment failure
- ✅ **Fix plan ready**: Step-by-step solution available
- ✅ **Confidence level high**: 90%+ certainty fix will work

### **When Implementation is Ready:**
- ✅ **All prerequisites met**: Required access, settings, configurations
- ✅ **Backup plan available**: Rollback strategy if needed
- ✅ **Testing method defined**: How to verify success

---

**This research should reveal exactly why the incredible enterprise platform built (worth $60K-140K in value) is not reaching production despite successful development.**
