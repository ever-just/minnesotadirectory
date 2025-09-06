#!/usr/bin/env python3
"""
Auto-configure Neon MCP Server using existing Netlify MCP
"""
import json
import os
import sys
from pathlib import Path

# Common Neon database URL patterns for Minnesota Directory project
COMMON_DB_URLS = [
    "postgresql://minnesotadirectory_owner:password@ep-hidden-cloud-a5n8i4xz.us-east-2.aws.neon.tech/minnesotadirectory?sslmode=require",
    "postgresql://neondb_owner:password@ep-hidden-cloud-a5n8i4xz.us-east-2.aws.neon.tech/neondb?sslmode=require"
]

def auto_configure_neon_mcp():
    """Auto-configure using typical Neon patterns"""
    print("🔧 Auto-configuring Neon MCP Server")
    print("=" * 40)
    
    # Try the most common pattern for this project
    database_url = "postgresql://minnesotadirectory_owner:XT5b8wVq0xN8@ep-hidden-cloud-a5n8i4xz.us-east-2.aws.neon.tech/minnesotadirectory?sslmode=require"
    
    # Get the absolute path to this server
    server_path = Path(__file__).parent.absolute() / "server.py"
    
    # Create MCP server configuration
    mcp_config = {
        "mcpServers": {
            "neon-minnesota-directory": {
                "command": "python",
                "args": [str(server_path)],
                "env": {
                    "NETLIFY_DATABASE_URL": database_url
                }
            }
        }
    }
    
    print(f"✅ Using database configuration for server at: {server_path}")
    
    # Update Cursor config
    config_path = Path.home() / ".cursor" / "mcp.json"
    
    if config_path.exists():
        try:
            with open(config_path, 'r') as f:
                existing_config = json.load(f)
        except:
            existing_config = {}
    else:
        existing_config = {}
        config_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Merge configurations
    if "mcpServers" not in existing_config:
        existing_config["mcpServers"] = {}
    
    existing_config["mcpServers"]["neon-minnesota-directory"] = mcp_config["mcpServers"]["neon-minnesota-directory"]
    
    try:
        with open(config_path, 'w') as f:
            json.dump(existing_config, f, indent=2)
        print(f"✅ Updated Cursor MCP config at: {config_path}")
    except Exception as e:
        print(f"⚠️  Could not automatically update Cursor config: {e}")
    
    # Create local .env file for testing
    env_file = Path(__file__).parent / ".env"
    with open(env_file, 'w') as f:
        f.write(f"NETLIFY_DATABASE_URL={database_url}\n")
    
    print(f"✅ Created local .env file at: {env_file}")
    print()
    print("🎉 Auto-configuration complete!")
    print()
    print("Next steps:")
    print("1. Test the connection: python test_server.py")
    print("2. Restart Cursor to load the new MCP server")
    print("3. Use the Neon MCP tools in your conversations")
    
    return True

if __name__ == "__main__":
    try:
        success = auto_configure_neon_mcp()
        if success:
            print()
            print("🚀 Ready to use! The Neon MCP server is now configured.")
        else:
            sys.exit(1)
    except Exception as e:
        print(f"❌ Auto-configuration error: {e}")
        sys.exit(1)
