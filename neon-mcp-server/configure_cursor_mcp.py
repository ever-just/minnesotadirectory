#!/usr/bin/env python3
"""
Configure Cursor MCP settings for neon-minnesota-directory server
"""
import json
import os

def create_mcp_config():
    """Create MCP configuration for Cursor"""
    
    # Get absolute path to server.py
    current_dir = os.path.dirname(os.path.abspath(__file__))
    server_path = os.path.join(current_dir, "server.py")
    python_path = os.path.join(current_dir, "venv", "bin", "python")
    
    config = {
        "mcpServers": {
            "neon-minnesota-directory": {
                "command": python_path,
                "args": [server_path],
                "env": {
                    "NETLIFY_DATABASE_URL": "postgresql://neondb_owner:npg_RaSZ09iyfWAm@ep-winter-recipe-aejsi9db-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
                }
            }
        }
    }
    
    print("🔧 MCP Configuration for Cursor:")
    print("=" * 50)
    print("Add this to your Cursor MCP settings:")
    print()
    print(json.dumps(config, indent=2))
    print()
    print("📍 Server Location:")
    print(f"   Python: {python_path}")
    print(f"   Server: {server_path}")
    print()
    print("🛠️  Available Tools (once database is awake):")
    tools = [
        "query_companies - Query companies with filters",
        "get_database_stats - Get database statistics", 
        "execute_sql_query - Run custom SQL queries",
        "get_company_by_id - Get specific company details",
        "create_company - Create new company records",
        "update_company - Update existing companies",
        "delete_company - Remove company records",
        "get_industries_stats - Get industry statistics",
        "get_website_structure - Get website analysis",
        "queue_sitemap_analysis - Queue sitemap analysis"
    ]
    for tool in tools:
        print(f"   • {tool}")
    
    print()
    print("⚠️  IMPORTANT: Database Authentication Issue Detected")
    print("   The Neon database is rejecting connections (likely paused).")
    print("   To fix:")
    print("   1. Go to https://console.neon.tech")
    print("   2. Find your minnesotadirectory project") 
    print("   3. Click to wake up/activate the database")
    print("   4. Restart Cursor or refresh MCP settings")

if __name__ == "__main__":
    create_mcp_config()





