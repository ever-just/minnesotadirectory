# 🤖 Claude 4 Sonnet Research Prompt: Neon Auth + Stack Auth Integration Solution

## 📋 **Research Objective**
Find a working solution to integrate **Neon Auth (with Stack Auth SDK)** into a **Vite + React + TypeScript** application for **user profile management** while resolving Next.js dependency conflicts.

---

## 🚨 **SPECIFIC PROBLEMS TO SOLVE**

### **Primary Issue: Next.js Import Conflicts**
```
✘ [ERROR] Could not resolve "next/navigation"
✘ [ERROR] Could not resolve "next/link" 
✘ [ERROR] Could not resolve "next/headers"
```

**Root Cause:** `@stackframe/stack` v2.8.36 imports Next.js modules that don't exist in Vite environments

### **Current Technical Stack:**
- **Frontend**: Vite 6.3.5 + React 18.3.1 + TypeScript
- **Backend**: Netlify Functions + Neon PostgreSQL
- **Build System**: Vite (not Webpack)
- **Deployment**: Netlify (not Vercel)

### **Neon Auth Configuration (Already Set Up):**
```
STACK_PROJECT_ID: 0a08a082-f36e-4983-8e82-f090cad88df1
STACK_PUBLISHABLE_KEY: pck_36egmmz37c6zkkkmd40g96vgzqfpxt20dj321pv9yge7r  
STACK_SECRET_KEY: ssk_53fe28h3jyy4bqthg42x2kbd7pwh9s3hzs1gwwve96pk0
```

---

## 🔍 **RESEARCH QUESTIONS TO INVESTIGATE**

### **Primary Research Paths:**

#### **1. Alternative Stack Auth Packages**
- Is `@stackframe/react` (v2.8.36) compatible with Vite?
- Does `@stackframe/js` work for frontend integration?
- Are there standalone React components available?

#### **2. Vite Configuration Solutions**
- Can Vite externals be configured to resolve Next.js modules?
- Are there Vite plugins that provide Next.js compatibility?
- Can we alias Next.js imports to compatible alternatives?

#### **3. Backend-Only Integration**
- Can Neon Auth work with **API-only integration**?
- Can we use Stack Auth only in Netlify Functions?
- Is there a headless auth approach?

#### **4. Build System Workarounds**
- Can we use Stack Auth with dynamic imports?
- Are there ESM vs CommonJS compatibility issues?
- Can we use Stack Auth with micro-frontends?

#### **5. Alternative Neon Auth Approaches**
- Does Neon offer direct auth APIs without Stack Auth?
- Are there official Neon Auth REST APIs?
- Can we integrate with Neon's user sync tables directly?

---

## 📚 **RESEARCH SOURCES TO EXAMINE**

### **Official Documentation:**
1. **Stack Auth Docs**: https://docs.stack-auth.com
   - React setup guides
   - Vite compatibility sections
   - Build system requirements

2. **Neon Auth Docs**: https://neon.tech/docs/guides/auth
   - Integration approaches
   - SDK alternatives
   - API-only usage

### **Community Resources:**
1. **GitHub Issues**: 
   - Search `@stackframe/stack` + "vite" issues
   - Look for Next.js compatibility workarounds
   - Check for React-only examples

2. **Stack Overflow & Forums**:
   - Vite + Stack Auth integration
   - Next.js module resolution in non-Next.js apps
   - Authentication alternatives for Vite

3. **Discord/Community**:
   - Stack Auth Discord server
   - Neon community discussions

---

## 📁 **PROJECT FILES TO REVIEW**

### **Current Implementation Files:**
```bash
# Review existing Stack Auth attempts
/src/providers/StackAuthProvider.tsx
/src/hooks/useStackAuth.ts
/src/components/StackUserMenu.tsx
/src/config/stackAuth.ts

# Review git history for Stack Auth commits
git log --grep="Stack Auth" --oneline
git log --grep="Neon Auth" --oneline

# Review migration plans
/NEON_AUTH_MIGRATION_PLAN.md
/AI_NEON_AUTH_MIGRATION_PLAN.md

# Review current auth system
/src/services/authService.ts
/netlify/functions/auth-*.ts

# Review package.json for dependency conflicts
package.json (check for conflicting dependencies)
```

### **Error Logs to Analyze:**
- Build failure logs with exact error messages
- Import resolution errors
- Vite configuration warnings

---

## 🎯 **SUCCESS CRITERIA**

### **Primary Goal:**
✅ **Neon Auth integration** that enables advanced **user profile management** without breaking the Vite build

### **Secondary Goals:**
✅ **Preserve existing features** (8 users, saved companies, website analysis)
✅ **Social login support** (Google, GitHub)
✅ **Advanced user settings** dashboard
✅ **Zero downtime** migration strategy

### **Technical Requirements:**
- **Build System**: Must work with Vite 6.3.5
- **Framework**: React 18.3.1 compatibility required
- **Performance**: No degradation from current system
- **Data**: Preserve existing user data and saved companies

---

## 🔬 **RESEARCH METHODOLOGY**

### **Phase 1: Documentation Deep Dive**
1. **Read Stack Auth docs** thoroughly for React-specific guidance
2. **Examine Neon Auth** integration patterns and alternatives
3. **Study Vite configuration** options for external dependency resolution

### **Phase 2: Community Research**
1. **Search GitHub Issues** for similar problems and solutions
2. **Check Stack Overflow** for Vite + Stack Auth discussions
3. **Review Discord/forums** for community workarounds

### **Phase 3: Code Analysis**
1. **Examine failed imports** to understand exact dependency chain
2. **Review Vite configuration** for potential fixes
3. **Analyze existing auth system** for migration compatibility

### **Phase 4: Solution Testing**
1. **Test proposed solutions** in isolated environments
2. **Verify compatibility** with existing codebase
3. **Ensure feature preservation**

---

## 📝 **EXPECTED RESEARCH OUTPUT**

### **Comprehensive Analysis Document:**
```markdown
# Neon Auth Integration Research Results

## Executive Summary
[Solution viability and recommended approach]

## Technical Findings
[Detailed compatibility analysis]

## Implementation Options
[Ranked list of viable solutions]

## Migration Strategy
[Step-by-step implementation plan]

## Risk Assessment
[Potential issues and mitigation strategies]
```

---

## 🎯 **RESEARCH PRIORITIES**

### **High Priority:**
1. **Vite + Stack Auth compatibility** solutions
2. **API-only Neon Auth** integration approaches  
3. **React-specific** Stack Auth packages

### **Medium Priority:**
1. **Build configuration** workarounds
2. **Alternative authentication** providers with Neon compatibility
3. **Hybrid approaches** (custom frontend + Neon backend)

### **Low Priority:**
1. **Framework migration** options (React → Next.js)
2. **Alternative auth providers** entirely

---

**This research should provide a clear path to integrate Neon Auth for advanced user profile management while preserving the excellent enterprise platform already built.**
