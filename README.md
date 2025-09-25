# Minnesota Business Directory

A comprehensive React + TypeScript application showcasing 2,700+ Minnesota companies with advanced features including smart chunking, database integration, and professional company logos.

## 🏢 Project Overview

The Minnesota Directory is a production-ready business directory featuring:

- **2,765 Minnesota Companies** - Complete business profiles with detailed information
- **Database-Powered Architecture** - Migrated from CSV to PostgreSQL via Netlify Functions  
- **Smart Chunking Technology** - 82% performance improvement with progressive loading
- **Professional Company Logos** - Individual logos for each company with intelligent fallbacks
- **Advanced Search & Filtering** - Real-time industry filtering and company search
- **SEO Optimized** - Complete sitemap, meta tags, and structured data
- **Mobile Responsive** - Optimized for all devices and screen sizes

## 🚀 Key Features

### Performance Optimizations
- **Smart Chunking**: Initial load of 500 companies with 100% industry coverage
- **Progressive Loading**: Infinite scroll with automatic batching
- **Logo System**: Multi-tier fallback (Clearbit → Google Favicon → Placeholder)
- **Database Integration**: Fast API responses via Netlify Functions

### User Experience
- **Instant Filtering**: All 159 industries accessible immediately
- **Company Profiles**: Detailed pages with website analysis and navigation
- **Professional Design**: Modern UI with Minnesota-themed branding
- **Search Functionality**: Real-time search across company data

## 🛠 Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Database**: PostgreSQL (Neon) via Netlify Functions
- **Hosting**: Netlify with automatic deployments
- **Styling**: Modern CSS with responsive design
- **Performance**: Smart chunking, lazy loading, progressive enhancement

## 📊 Architecture

### Current System (Database-Powered)
```
CSV Data → PostgreSQL Database → Netlify Functions → React Frontend
```

### Data Flow
1. **Data Processing**: CSV parsed and migrated to PostgreSQL
2. **API Layer**: Netlify Functions provide RESTful endpoints
3. **Smart Loading**: Progressive chunks ensure optimal performance
4. **User Interface**: React components with real-time filtering

## 🔧 Development Setup

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/minnesotadirectory.git
cd minnesotadirectory

# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

### Environment Setup
The project uses Netlify Functions for database connectivity. Environment variables are managed through Netlify's interface for production deployments.

### Development Scripts
```bash
# Development server
pnpm run dev

# Production build
pnpm run build

# Generate sitemap
pnpm run generate-sitemap

# Version management
node scripts/increment-version.js
```

## 📁 Project Structure

```
minnesotadirectory/
├── src/
│   ├── components/          # React components
│   ├── lib/                 # Utilities and types
│   ├── pages/              # Page components
│   └── styles/             # CSS files
├── netlify/
│   └── functions/          # API endpoints
├── public/                 # Static assets
├── scripts/               # Build and utility scripts
├── docs/                  # Documentation
│   ├── completed/         # Implementation documentation
│   └── historical/        # Historical planning docs
└── mcp-logo-server/       # MCP server for logo management
```

## 🎯 Performance Metrics

### Achieved Improvements
- **82% DOM Reduction**: From 41,475 to 7,500 nodes
- **75% Render Speed**: Initial render under 75ms
- **100% Industry Coverage**: All industries in first 500 companies
- **Sub-second Loading**: Complete page load under 1 second

### Key Performance Features
- Smart chunking with industry-aware loading
- Progressive image loading with lazy loading
- Efficient database queries with proper indexing
- Optimized bundle size with code splitting

## 🔍 SEO & Discovery

### Search Engine Optimization
- **Dynamic Sitemap**: 2,700+ indexed pages
- **Meta Tags**: Comprehensive SEO meta tags
- **Structured Data**: Schema.org markup for companies
- **Local SEO**: Minnesota-specific geographic targeting

### Social Media Integration
- Open Graph tags for social sharing
- Twitter Card support
- Professional favicon system
- PWA manifest for mobile installation

## 📈 Database Migration

The project successfully migrated from CSV-based architecture to a full database system:

### Migration Highlights
- **Zero Downtime**: Seamless transition with fallback systems
- **Data Integrity**: All 2,765 companies migrated successfully  
- **Performance Gain**: 60% faster filtering and search
- **Scalability**: Ready for future growth and features

### Database Schema
- **Companies Table**: Complete business information
- **Industries Table**: Normalized industry classification
- **Optimized Indexes**: Fast queries and filtering

## 🚀 Deployment

### Production Deployment
The site automatically deploys via Netlify when changes are pushed to the main branch:

```bash
# Deploy with version increment
node scripts/increment-version.js
git add .
git commit -m "Description v01.00.XX"
git push origin main
```

### Live Site
- **Production**: [minnesotadirectory.org](https://minnesotadirectory.org)
- **Development**: [minnesota-directory.netlify.app](https://minnesota-directory.netlify.app)

## 📚 Documentation

### Available Documentation
- **SEO Strategy**: `SEO_OPTIMIZATION_NOTES.md`
- **Completed Features**: `docs/completed/`
- **Historical Planning**: `docs/historical/`
- **Logo System**: MCP server documentation in `mcp-logo-server/`

### Implementation History
The project includes comprehensive documentation of major implementations:
- Smart Chunking Performance Optimization
- Database Migration Process  
- Company Logo System Implementation
- Favicon & Sitemap Integration

## 🤝 Contributing

### Development Workflow
1. Create feature branch from main
2. Implement changes with proper testing
3. Update documentation as needed
4. Submit pull request with detailed description

### Code Standards
- TypeScript strict mode enabled
- ESLint configuration for code quality
- Responsive design requirements
- Performance optimization guidelines

## 📄 License

This project is proprietary software developed for Minnesota business directory services.

## 📞 Support

For technical support or business inquiries, please contact the development team.

---

**Minnesota Directory** - Connecting businesses across the Land of 10,000 Lakes 🏞️

<!-- Verified repo access and functionality - Devin AI -->
