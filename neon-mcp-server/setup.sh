#!/bin/bash

# Neon MCP Server Setup Script
echo "🚀 Setting up Neon MCP Server for Minnesota Directory"
echo "=================================================="
echo

# Check if we're in the right directory
if [ ! -f "server.py" ]; then
    echo "❌ Please run this script from the neon-mcp-server directory"
    echo "   cd neon-mcp-server && ./setup.sh"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "❌ Failed to create virtual environment"
        exit 1
    fi
    echo "✅ Virtual environment created"
fi

# Activate virtual environment and install dependencies
echo "📦 Installing dependencies..."
source venv/bin/activate
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo "✅ Dependencies installed"

# Run configuration
echo
echo "🔧 Running configuration setup..."
python configure.py

echo
echo "🎉 Neon MCP Server setup complete!"
echo
echo "Next steps:"
echo "1. Restart Cursor to load the new MCP server"
echo "2. Test the connection: python test_server.py"
echo "3. Use the Neon MCP tools in your Cursor conversations"
echo
echo "Available MCP Tools:"
echo "  • query_companies - Search and filter companies"
echo "  • get_company_by_id - Get specific company details"
echo "  • create_company - Add new companies"
echo "  • update_company - Modify existing companies"
echo "  • delete_company - Remove companies"
echo "  • get_industries_stats - Industry analytics"
echo "  • get_database_stats - Database statistics"
echo "  • execute_sql_query - Run custom SQL queries"
echo "  • get_website_structure - Website analysis data"
echo "  • queue_sitemap_analysis - Queue sitemap analysis"
echo
