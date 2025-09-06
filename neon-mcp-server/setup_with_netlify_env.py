#!/usr/bin/env python3
"""
Configure Neon MCP Server to use the same environment as Netlify
"""
import json
import os
from pathlib import Path

print("🔧 Configuring Neon MCP Server to use Netlify environment")
print("=" * 55)

# Get the absolute path to this server
server_path = Path(__file__).parent.absolute() / "server.py"

# Create MCP server configuration that uses environment variable
mcp_config = {
    "mcpServers": {
        "neon-minnesota-directory": {
            "command": "python",
            "args": [str(server_path)],
            "env": {
                "NETLIFY_DATABASE_URL": "${NETLIFY_DATABASE_URL}"
            }
        }
    }
}

print(f"✅ Created MCP configuration for server at: {server_path}")

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

print()
print("📋 To complete setup, you need to:")
print("1. Set your NETLIFY_DATABASE_URL environment variable")
print("2. You can get this from: Netlify Dashboard > Site Settings > Environment Variables")
print("3. Or from your local development environment")
print()
print("💡 For testing, create a .env file with:")
print("   NETLIFY_DATABASE_URL=your_connection_string_here")
print()
print("🎉 MCP Server is configured and ready!")

