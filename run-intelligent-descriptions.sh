#!/bin/bash

# 🧠 Revolutionary Business Description System
# Quick launcher script for intelligent description generation

echo "🚀 REVOLUTIONARY BUSINESS DESCRIPTION SYSTEM"
echo "================================================"
echo "Zero-Cost, AI-Powered, Website Intelligence-Driven"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp scripts/environment-config-example.env .env
    echo "✅ Created .env file. Please edit it with your database URL."
    echo "   DATABASE_URL=your-neon-database-url"
    echo ""
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not set in environment"
    echo "   Please set it in .env file or export it:"
    echo "   export DATABASE_URL='your-neon-database-url'"
    echo ""
fi

echo "🎯 Choose your approach:"
echo ""
echo "1) 🔍 Quick Demo (5 minutes)"
echo "   See the system analyze a real company with website intelligence"
echo ""
echo "2) 🧠 Interactive Processing (30 min per company)"  
echo "   Full website analysis + Claude generation workflow"
echo ""
echo "3) 📊 System Statistics"
echo "   View current database status and processing stats"
echo ""
echo "4) 📋 Review Generated Descriptions"
echo "   Review and approve generated descriptions"
echo ""
echo "5) 🚀 Activate Approved Descriptions"
echo "   Replace old descriptions with approved new ones"
echo ""

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo ""
        echo "🔍 Running Quick Demo..."
        echo "This will find a company with good sitemap data and show you"
        echo "the website intelligence extraction + Claude prompt generation."
        echo ""
        node scripts/quick-intelligent-demo.js
        ;;
    2)
        echo ""
        echo "🧠 Starting Interactive Intelligent Processing..."
        echo "This will analyze website content and guide you through"
        echo "Claude-powered description generation."
        echo ""
        node scripts/intelligent-description-engine.js
        ;;
    3)
        echo ""
        echo "📊 System Statistics..."
        node -e "
        import { drizzle } from 'drizzle-orm/neon-http';
        import { neon } from '@neondatabase/serverless';
        import { sql } from 'drizzle-orm';
        
        const db = drizzle(neon(process.env.DATABASE_URL));
        
        async function showStats() {
            console.log('📈 Database Statistics:');
            console.log('');
            
            // Companies with sitemap data
            const sitemapStats = await db.execute(sql\`
                SELECT 
                    ws.analysis_status,
                    COUNT(*) as count,
                    AVG(ws.total_pages) as avg_pages
                FROM website_structures ws
                JOIN companies c ON c.id = ws.company_id
                GROUP BY ws.analysis_status
            \`);
            
            console.log('🌐 Sitemap Analysis Status:');
            sitemapStats.rows.forEach(row => {
                console.log(\`  \${row.analysis_status}: \${row.count} companies (avg \${Math.round(row.avg_pages || 0)} pages)\`);
            });
            console.log('');
            
            // Description status
            const descStats = await db.execute(sql\`
                SELECT 
                    COALESCE(description_status, 'original') as status,
                    COUNT(*) as count
                FROM companies 
                GROUP BY COALESCE(description_status, 'original')
            \`);
            
            console.log('📝 Description Status:');
            descStats.rows.forEach(row => {
                console.log(\`  \${row.status}: \${row.count} companies\`);
            });
            console.log('');
            
            // Ready for processing
            const ready = await db.execute(sql\`
                SELECT COUNT(*) as count
                FROM companies c
                JOIN website_structures ws ON c.id = ws.company_id
                WHERE ws.analysis_status = 'completed'
                  AND ws.total_pages > 5
                  AND c.new_description IS NULL
            \`);
            
            console.log(\`🚀 Ready for Intelligent Processing: \${ready.rows[0].count} companies\`);
            console.log('');
        }
        
        showStats().catch(console.error);
        "
        ;;
    4)
        echo ""
        echo "📋 Starting Review Process..."
        node scripts/review-descriptions.js review
        ;;
    5)
        echo ""
        echo "🚀 Starting Activation Process..."
        node scripts/activate-descriptions.js activate
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "✅ Process complete!"
echo ""
echo "📚 For more information:"
echo "   • System Overview: REVOLUTIONARY_DESCRIPTION_SYSTEM.md"
echo "   • Technical Details: INTELLIGENT_DESCRIPTION_SYSTEM.md"
echo "   • Original Guide: BUSINESS_DESCRIPTION_REWRITE_GUIDE.md"
echo ""
echo "🎯 Next Steps:"
echo "   1. Run demo to see system capabilities"
echo "   2. Process 2-3 companies to validate quality"
echo "   3. Scale up with batch processing"
echo "   4. Review and approve descriptions"
echo "   5. Activate approved descriptions"
