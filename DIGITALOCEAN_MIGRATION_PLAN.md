# DigitalOcean Migration Plan

## 🎯 **Migration Objective**
Move Minnesota Directory from **Vercel** → **DigitalOcean App Platform** to enable:
- Backend services for user authentication
- Managed database for user data
- Integrated authentication options
- Better full-stack control
- Cost optimization

## 📊 **Current State Analysis**

### **Current Hosting: Vercel**
- ✅ **Pros**: Easy deployment, great CDN, automatic HTTPS
- ❌ **Cons**: Limited backend capabilities, expensive for databases, authentication requires 3rd party

### **Current Setup:**
- Frontend: React + TypeScript + Vite
- Deployment: Vercel with `vercel.json` SPA routing
- Assets: Static files (CSV, images, icons)
- Domain: Custom domain via GitHub repository
- Version: Currently v01.00.05

## 🏗️ **Target State: DigitalOcean App Platform**

### **DigitalOcean Advantages:**
- ✅ **App Platform**: Full-stack deployment (frontend + backend)
- ✅ **Managed Databases**: PostgreSQL/MySQL with backups
- ✅ **Authentication**: Built-in auth options or custom implementation
- ✅ **Scalability**: Auto-scaling and load balancing
- ✅ **Cost**: More cost-effective for full-stack apps
- ✅ **Integration**: Seamless DO ecosystem (Spaces, Monitoring)

## 📋 **Migration Phases**

### **Phase 1: Pre-Migration Setup** 
- [ ] Create DigitalOcean account (if needed)
- [ ] Set up DigitalOcean App Platform project  
- [ ] Configure build settings and environment variables
- [ ] Test deployment with current static site

### **Phase 2: App Platform Migration**
- [ ] Create App Platform app specification
- [ ] Configure build process (Vite → static files)
- [ ] Set up custom domain and SSL
- [ ] Migrate environment variables
- [ ] Test full functionality

### **Phase 3: Database Setup** (for user auth)
- [ ] Provision DigitalOcean Managed Database (PostgreSQL)
- [ ] Configure database connection and security
- [ ] Set up backup and monitoring
- [ ] Create initial user schema

### **Phase 4: Backend API Setup**
- [ ] Add Node.js/Express backend to project
- [ ] Create authentication endpoints
- [ ] Implement JWT token management
- [ ] Add user management API routes

### **Phase 5: Testing & Verification**
- [ ] Performance comparison (Vercel vs DO)
- [ ] SSL certificate verification
- [ ] CDN and caching verification
- [ ] Mobile responsiveness check
- [ ] SEO impact assessment

### **Phase 6: DNS Cutover**
- [ ] Update DNS records
- [ ] Monitor traffic and performance
- [ ] Decommission Vercel deployment

## 🔧 **Technical Implementation Details**

### **App Platform App Spec Configuration**
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
    
databases:
  - name: minnesota-directory-db
    engine: PG
    size: db-s-1vcpu-1gb
    num_nodes: 1
    
domains:
  - domain: yourdomain.com
    type: PRIMARY
    wildcard: false
```

### **Environment Variables Migration**
Current Vercel env vars → DigitalOcean App Platform:
```
# Build Variables
NODE_ENV=production
VITE_APP_VERSION=01.00.05

# New Database Variables (for user auth)
DATABASE_URL=${db.DATABASE_URL}
JWT_SECRET=<generate-secure-secret>
AUTH_TOKEN_EXPIRY=24h
```

### **Backend API Structure** (to be added)
```
├── api/
│   ├── auth/
│   │   ├── login.ts
│   │   ├── register.ts
│   │   ├── logout.ts
│   │   └── verify.ts
│   ├── users/
│   │   ├── profile.ts
│   │   └── update.ts
│   └── companies/
│       └── favorites.ts
├── middleware/
│   ├── auth.ts
│   └── validation.ts
└── utils/
    ├── database.ts
    ├── jwt.ts
    └── security.ts
```

## 💰 **Cost Comparison**

### **Vercel Current Costs:**
- Hobby Plan: $0/month (current)
- Pro Plan: $20/month (with custom domain)
- Database: Would require external service ($10-50/month)

### **DigitalOcean Estimated Costs:**
- App Platform Basic: $5/month
- Managed Database (1GB): $15/month  
- **Total: ~$20/month** (includes everything)

## 🚀 **Migration Timeline**

### **Week 1: Setup & Basic Migration**
- DigitalOcean account and App Platform setup
- Basic static site deployment
- Domain configuration

### **Week 2: Backend Integration**
- Database provisioning
- Backend API development
- Authentication framework setup

### **Week 3: Testing & Optimization**
- Performance testing
- Security verification
- UI/UX testing

### **Week 4: Go-Live**
- DNS cutover
- Monitoring setup
- Vercel decommission

## 🔒 **Security & Compliance**

### **DigitalOcean Security Features:**
- ✅ **SSL/TLS**: Automatic certificate management
- ✅ **Database Security**: Encrypted connections, firewall rules
- ✅ **Network Security**: Private networking, VPC
- ✅ **Compliance**: SOC 2, ISO 27001, GDPR ready
- ✅ **Monitoring**: Built-in application monitoring

### **Implementation Security:**
- Password hashing (bcrypt)
- JWT token security
- Rate limiting
- Input validation
- SQL injection prevention

## 📈 **Success Metrics**

### **Performance Metrics:**
- [ ] Page load time ≤ 2 seconds
- [ ] API response time ≤ 500ms
- [ ] Database query time ≤ 100ms
- [ ] 99.9% uptime SLA

### **Functionality Metrics:**
- [ ] All current features working
- [ ] Version tracking system operational
- [ ] Social media icons loading correctly
- [ ] Mobile responsiveness maintained

## 🔄 **Rollback Plan**

### **If Migration Fails:**
1. **Immediate**: Revert DNS to Vercel
2. **Short-term**: Fix issues on DigitalOcean
3. **Long-term**: Complete migration in next iteration

### **Backup Strategy:**
- Full database backups before migration
- Static asset backups
- Configuration backups
- DNS record backups

## 📋 **Pre-Migration Checklist**

### **Required Information:**
- [ ] Current domain registrar access
- [ ] GitHub repository access
- [ ] Vercel deployment settings backup
- [ ] Current environment variables export
- [ ] Performance baseline measurements

### **DigitalOcean Account Setup:**
- [ ] Create DigitalOcean account
- [ ] Set up billing and payment method
- [ ] Configure team access (if needed)
- [ ] Set up monitoring and alerts

---

## 🎯 **Next Steps:**
1. **Create DigitalOcean account and App Platform project**
2. **Test basic static deployment**
3. **Begin user authentication development in parallel**
4. **Complete migration before implementing user features**

*This migration will provide the foundation needed for robust user authentication and future backend features.*
