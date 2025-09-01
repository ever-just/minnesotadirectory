# DigitalOcean Migration - Step-by-Step Action Plan

## 🎯 **Objective**
Migrate Minnesota Directory from Vercel to DigitalOcean App Platform **before** implementing user authentication to gain access to backend services and managed databases.

## 📋 **Pre-Migration Checklist**
- [ ] ✅ Current site: Running on Vercel (v01.00.05)
- [ ] ✅ Repository: `https://github.com/ever-just/minnesotadirectory.git`
- [ ] ✅ Branch: Currently on `users` branch
- [ ] ✅ Build system: Vite + React + TypeScript
- [ ] Current domain: _[Need to identify]_

---

## 🔧 **Step-by-Step Migration Process**

### **Step 1: DigitalOcean Account & Initial Setup**
**Time Required**: 15 minutes  
**Prerequisites**: DigitalOcean account

**Actions:**
1. **Create DigitalOcean Account** (if needed)
   - Go to digitalocean.com
   - Set up billing method
   - Verify account

2. **Create New App Platform Project**
   - Navigate to App Platform
   - Click "Create App"
   - Choose "GitHub" as source

3. **Connect GitHub Repository**
   - Authorize DigitalOcean to access GitHub
   - Select repository: `ever-just/minnesotadirectory`
   - Choose branch: `main` (we'll deploy from main, not users branch)

**Verification**: ✅ App Platform project created and connected to GitHub

---

### **Step 2: Configure Build Settings**
**Time Required**: 10 minutes

**Actions:**
1. **Configure Build Command**
   ```
   Build Command: npm run build
   Output Directory: dist
   ```

2. **Set Environment Variables**
   ```
   NODE_ENV=production
   VITE_APP_VERSION=01.00.05
   ```

3. **Configure App Spec** (Basic Static Site)
   ```yaml
   name: minnesota-directory
   services:
   - name: web
     source_dir: /
     github:
       repo: ever-just/minnesotadirectory  
       branch: main
     build_command: npm run build
     output_dir: dist
     http_port: 8080
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
   ```

**Verification**: ✅ Build settings configured correctly

---

### **Step 3: Initial Deployment Test**
**Time Required**: 20 minutes

**Actions:**
1. **Deploy to DigitalOcean**
   - Click "Create Resources"
   - Wait for build to complete
   - Monitor build logs

2. **Test Basic Functionality**
   - Visit temporary DigitalOcean URL
   - Test company search
   - Test industry filtering  
   - Test social media icons
   - Verify version display shows correctly

3. **Performance Check**
   - Use browser dev tools
   - Measure page load time
   - Compare to current Vercel performance

**Expected Results:**
- ✅ Site loads successfully
- ✅ All features working
- ✅ Performance similar to Vercel
- ✅ Version tracking operational

---

### **Step 4: Domain & SSL Configuration**  
**Time Required**: 30 minutes

**Actions:**
1. **Identify Current Domain Setup**
   - Check where domain is registered
   - Note current DNS settings
   - Screenshot current configuration

2. **Add Custom Domain to DigitalOcean**
   - Go to App Platform → Domains
   - Add custom domain
   - Note the DNS records provided

3. **Update DNS Records**
   - Update DNS to point to DigitalOcean
   - Wait for propagation (5-60 minutes)
   - Verify SSL certificate auto-generation

**Verification**: ✅ Custom domain working with SSL

---

### **Step 5: Performance & Feature Verification**
**Time Required**: 15 minutes

**Actions:**
1. **Complete Feature Test**
   - [ ] Homepage loads correctly
   - [ ] Company search works
   - [ ] Industry filtering works
   - [ ] Company detail pages load
   - [ ] Social media icons work
   - [ ] Version display shows v01.00.05
   - [ ] Mobile responsiveness maintained

2. **Performance Benchmarking**
   - [ ] Initial load time ≤ 2 seconds
   - [ ] Company filtering ≤ 1 second
   - [ ] No console errors
   - [ ] All assets loading correctly

**Verification**: ✅ All features working at acceptable performance

---

### **Step 6: DNS Cutover & Go-Live**
**Time Required**: 10 minutes

**Actions:**
1. **Final DNS Update**
   - Make final DNS changes if needed
   - Monitor traffic switch to DigitalOcean

2. **Monitor & Verify**
   - Check site availability from multiple locations
   - Monitor for any errors or issues
   - Verify Google indexing isn't affected

3. **Update Documentation**
   - Update any deployment documentation
   - Note new deployment URLs and process

**Verification**: ✅ Site fully migrated and operational

---

### **Step 7: Post-Migration Cleanup**
**Time Required**: 10 minutes

**Actions:**
1. **Pause/Cancel Vercel Deployment** (keep as backup for now)
   - Don't delete immediately
   - Just pause auto-deployments

2. **Update Development Workflow**
   - Note new deployment process
   - Update any CI/CD references

3. **Documentation Update**
   - Update README with new deployment info
   - Document environment variables

**Verification**: ✅ Migration complete, Vercel paused as backup

---

## 🚨 **Risk Mitigation & Rollback Plan**

### **If Migration Fails:**
1. **Immediate Rollback**: Revert DNS to point back to Vercel
2. **Debug Time**: Allow 2-4 hours to fix DigitalOcean issues
3. **Retry**: Attempt migration again with lessons learned

### **Backup Strategy:**
- ✅ Keep Vercel deployment active until migration confirmed successful
- ✅ Have DNS rollback plan ready
- ✅ Screenshot all current configurations

---

## 💰 **Cost Impact**

### **Current (Vercel)**:
- Free tier: $0/month
- Custom domain: Included

### **New (DigitalOcean)**:
- Basic App Platform: $5/month  
- SSL & Domain: Included
- **Net Change**: +$5/month

### **Benefits Gained:**
- Backend capability for user authentication
- Managed database access
- Better full-stack control
- Foundation for user features

---

## 📊 **Success Criteria**

### **Technical Requirements:**
- [ ] ✅ Site loads in ≤ 2 seconds
- [ ] ✅ All current features working  
- [ ] ✅ No broken links or assets
- [ ] ✅ Mobile responsiveness maintained
- [ ] ✅ Version tracking operational (v01.00.05)

### **Business Requirements:**
- [ ] ✅ Zero extended downtime
- [ ] ✅ SEO/Google rankings unaffected  
- [ ] ✅ User experience unchanged
- [ ] ✅ Ready for user authentication development

---

## 🎯 **Next Steps After Migration**

Once DigitalOcean migration is successful:

1. **Add Managed Database** 
   - Provision PostgreSQL for user data
   - Set up connection and security

2. **Add Backend API**
   - Node.js/Express for authentication
   - User management endpoints

3. **Implement User Authentication**
   - Follow USER_AUTHENTICATION_PLAN.md
   - User icon, signup/signin modal
   - JWT token management

---

## ⚡ **Ready to Execute?**

This plan is designed to be:
- **Low Risk**: Vercel kept as backup
- **Fast**: ~2 hours total time
- **Reversible**: Easy rollback plan
- **Foundation**: Sets up for user authentication

**Estimated Total Time**: 2 hours  
**Risk Level**: Low (with rollback plan)  
**Cost Impact**: $5/month  
**Benefits**: Foundation for user features + better backend control

---

*This step-by-step plan is ready for immediate execution. Each step includes verification checkpoints and clear success criteria.*
