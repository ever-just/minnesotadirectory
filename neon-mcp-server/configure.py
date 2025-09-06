#!/usr/bin/env python3
"""
Configuration script for Neon MCP Server
"""

import json
import os
import sys
from pathlib import Path

def get_cursor_config_path():
    """Get the Cursor MCP configuration file path"""
    home = Path.home()
    
    # Common Cursor config locations
    possible_paths = [
        home / "Library" / "Application Support" / "Cursor" / "User" / "globalStorage" / "rooveterinaryinc.roo-cline" / "settings" / "cline_mcp_settings.json",
        home / ".cursor" / "mcp_settings.json",
        home / ".config" / "cursor" / "mcp_settings.json"
    ]
    
    for path in possible_paths:
        if path.exists():
            return path
        
        # Also check parent directories for settings files
        parent = path.parent
        if parent.exists():
            for settings_file in parent.glob("*mcp*.json"):
                return settings_file
    
    # Default to the first path if none exist
    return possible_paths[0]

def create_mcp_config():
    """Create or update Cursor MCP configuration"""
    
    # Get the absolute path to this server
    server_path = Path(__file__).parent.absolute() / "server.py"
    
    # Ask user for database URL
    print("🔧 Neon MCP Server Configuration")
    print("=" * 40)
    print()
    
    database_url = input("Enter your NETLIFY_DATABASE_URL (Neon connection string): ").strip()
    
    if not database_url:
        print("❌ Database URL is required!")
        return False
    
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
    
    print(f"✅ MCP Configuration created for server at: {server_path}")
    print()
    print("📋 Add this configuration to your Cursor MCP settings:")
    print()
    print(json.dumps(mcp_config, indent=2))
    print()
    
    # Try to find and update Cursor config
    config_path = get_cursor_config_path()
    print(f"🔍 Looking for Cursor config at: {config_path}")
    
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
        print("Please manually add the configuration above to your Cursor MCP settings.")
    
    # Create local .env file for testing
    env_file = Path(__file__).parent / ".env"
    with open(env_file, 'w') as f:
        f.write(f"NETLIFY_DATABASE_URL={database_url}\n")
    
    print(f"✅ Created local .env file at: {env_file}")
    print()
    print("🚀 Setup complete! You can now:")
    print("   1. Test the server: python test_server.py")
    print("   2. Restart Cursor to load the new MCP server")
    print("   3. Use the Neon MCP tools in your conversations")
    
    return True

def main():
    """Main configuration function"""
    if len(sys.argv) > 1 and sys.argv[1] == "--help":
        print("Neon MCP Server Configuration Tool")
        print()
        print("This script helps you set up the Neon MCP server for Cursor.")
        print("It will:")
        print("  - Ask for your Neon database connection string")
        print("  - Create/update Cursor MCP configuration")
        print("  - Create a local .env file for testing")
        print()
        print("Usage: python configure.py")
        return
    
    try:
        success = create_mcp_config()
        if success:
            print()
            print("🎉 Configuration completed successfully!")
        else:
            print("❌ Configuration failed.")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n❌ Configuration cancelled.")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Configuration error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
