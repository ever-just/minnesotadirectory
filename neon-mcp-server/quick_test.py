#!/usr/bin/env python3
"""
Quick test to verify MCP server is working
"""
import subprocess
import json
import sys

def test_mcp_server():
    """Test if MCP server responds correctly"""
    try:
        # Test listing tools
        result = subprocess.run(
            [
                sys.executable,
                "-c",
                """
import asyncio
import sys
sys.path.insert(0, '.')
from server import server

async def test():
    tools = await server.list_tools()
    return [{"name": t.name, "description": t.description} for t in tools]

print(asyncio.run(test()))
"""
            ],
            capture_output=True,
            text=True,
            cwd="/Users/cloudaistudio/Documents/EVERJUST PROJECTS/minnesotadirectory/neon-mcp-server"
        )
        
        if result.returncode == 0:
            tools = eval(result.stdout)
            print("✅ MCP Server is working!")
            print(f"   Found {len(tools)} tools:")
            for tool in tools:
                print(f"   - {tool['name']}: {tool['description'][:60]}...")
            return True
        else:
            print("❌ MCP Server failed to respond")
            print(f"   Error: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_mcp_server()
    sys.exit(0 if success else 1)


