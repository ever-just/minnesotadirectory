#!/usr/bin/env python3
"""
Logo Fetcher MCP Server

Fetches company logos by domain using multiple sources:
- Free Logo API (higher quality)
- Google Favicon Service (fallback)

No API keys required.
"""

import asyncio
import logging
import os
import sys
from pathlib import Path
from typing import Any, Sequence
from urllib.parse import urlparse

import aiohttp
from mcp.server import Server
from mcp.server.models import InitializationOptions
from mcp.server.stdio import stdio_server
from mcp.types import (
    CallToolResult,
    TextContent,
    Tool,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize the MCP server
app = Server("logo-fetcher")

@app.list_tools()
async def handle_list_tools() -> list[Tool]:
    """List available tools"""
    return [
        Tool(
            name="fetch_logo",
            description="Fetch a company logo by domain and save it to workspace",
            inputSchema={
                "type": "object",
                "properties": {
                    "domain": {
                        "type": "string",
                        "description": "Company domain (e.g., 'acme.com')"
                    },
                    "output_path": {
                        "type": "string", 
                        "description": "Path to save the logo (e.g., './assets/logos/acme.png')",
                        "default": "./assets/logos/{domain}.png"
                    },
                    "size": {
                        "type": "integer",
                        "description": "Desired logo size in pixels (16-512)",
                        "default": 128
                    },
                    "prefer_svg": {
                        "type": "boolean",
                        "description": "Try to get SVG format if available",
                        "default": False
                    }
                },
                "required": ["domain"]
            }
        ),
        Tool(
            name="fetch_logos_batch",
            description="Fetch multiple company logos at once",
            inputSchema={
                "type": "object",
                "properties": {
                    "domains": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of company domains"
                    },
                    "output_dir": {
                        "type": "string",
                        "description": "Directory to save logos",
                        "default": "./assets/logos/"
                    },
                    "size": {
                        "type": "integer", 
                        "description": "Desired logo size in pixels",
                        "default": 128
                    }
                },
                "required": ["domains"]
            }
        ),
        Tool(
            name="get_logo_info",
            description="Get information about available logo sources for a domain",
            inputSchema={
                "type": "object", 
                "properties": {
                    "domain": {
                        "type": "string",
                        "description": "Company domain to analyze"
                    }
                },
                "required": ["domain"]
            }
        )
    ]

def clean_domain(domain: str) -> str:
    """Clean and normalize domain name"""
    domain = domain.strip()
    if domain.startswith(('http://', 'https://')):
        domain = urlparse(domain).netloc
    if domain.startswith('www.'):
        domain = domain[4:]
    return domain.lower()

def get_company_name(domain: str) -> str:
    """Extract company name from domain for filename"""
    clean = clean_domain(domain)
    # Remove TLD for cleaner filename
    parts = clean.split('.')
    if len(parts) > 1:
        return parts[0]
    return clean

async def fetch_logo_from_google(session: aiohttp.ClientSession, domain: str, size: int = 128) -> tuple[bytes | None, str]:
    """Fetch logo from Google Favicon service"""
    clean = clean_domain(domain)
    url = f"https://www.google.com/s2/favicons?domain={clean}&sz={size}"
    
    try:
        async with session.get(url) as response:
            if response.status == 200:
                content = await response.read()
                # Check if it's a valid image (not empty or default)
                if len(content) > 100:  # Minimal size check
                    return content, "png"
    except Exception as e:
        logger.warning(f"Failed to fetch from Google for {domain}: {e}")
    
    return None, "png"

async def fetch_logo_from_freelogo(session: aiohttp.ClientSession, domain: str, size: int = 128) -> tuple[bytes | None, str]:
    """Fetch logo from Free Logo API"""
    clean = clean_domain(domain)
    
    # Try different endpoints
    urls = [
        f"https://logo.clearbit.com/{clean}",
        f"https://img.logo.dev/{clean}?token=pk_X-HFGGJsQquTbZRUaIPhvw",
        f"https://logo.uplead.com/{clean}"
    ]
    
    for url in urls:
        try:
            async with session.get(url) as response:
                if response.status == 200:
                    content = await response.read()
                    content_type = response.headers.get('content-type', '')
                    
                    # Determine file extension
                    if 'svg' in content_type:
                        ext = "svg"
                    elif 'png' in content_type:
                        ext = "png"  
                    elif 'jpeg' in content_type or 'jpg' in content_type:
                        ext = "jpg"
                    else:
                        ext = "png"
                    
                    if len(content) > 500:  # More substantial size for API logos
                        return content, ext
        except Exception as e:
            logger.debug(f"Failed to fetch from {url}: {e}")
    
    return None, "png"

async def save_logo_to_file(logo_data: bytes, file_path: str) -> bool:
    """Save logo data to file"""
    try:
        # Ensure directory exists
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        with open(file_path, 'wb') as f:
            f.write(logo_data)
        return True
    except Exception as e:
        logger.error(f"Failed to save logo to {file_path}: {e}")
        return False

@app.call_tool()
async def handle_call_tool(name: str, arguments: dict[str, Any] | None) -> CallToolResult:
    """Handle tool calls"""
    if not arguments:
        arguments = {}
    
    if name == "fetch_logo":
        domain = arguments.get("domain")
        if not domain:
            return CallToolResult([TextContent(type="text", text="Error: domain is required")])
        
        size = arguments.get("size", 128)
        prefer_svg = arguments.get("prefer_svg", False)
        
        # Generate output path
        company_name = get_company_name(domain)
        output_path = arguments.get("output_path", f"./assets/logos/{company_name}.png")
        
        # Replace {domain} placeholder
        output_path = output_path.replace("{domain}", company_name)
        
        async with aiohttp.ClientSession() as session:
            # Try Free Logo API first (higher quality)
            logo_data, ext = await fetch_logo_from_freelogo(session, domain, size)
            source = "Free Logo API"
            
            # Fallback to Google if needed
            if not logo_data:
                logo_data, ext = await fetch_logo_from_google(session, domain, size)
                source = "Google Favicon"
            
            if not logo_data:
                return CallToolResult([
                    TextContent(type="text", text=f"Failed to fetch logo for domain: {domain}")
                ])
            
            # Update file extension if needed
            if not output_path.endswith(f".{ext}"):
                base_path = os.path.splitext(output_path)[0]
                output_path = f"{base_path}.{ext}"
            
            # Save to file
            if await save_logo_to_file(logo_data, output_path):
                return CallToolResult([
                    TextContent(
                        type="text", 
                        text=f"Successfully fetched and saved logo for {domain}\n"
                             f"Source: {source}\n"
                             f"Size: {len(logo_data)} bytes\n"
                             f"Format: {ext.upper()}\n"
                             f"Saved to: {output_path}"
                    )
                ])
            else:
                return CallToolResult([
                    TextContent(type="text", text=f"Failed to save logo for {domain}")
                ])
    
    elif name == "fetch_logos_batch":
        domains = arguments.get("domains", [])
        if not domains:
            return CallToolResult([TextContent(type="text", text="Error: domains list is required")])
        
        output_dir = arguments.get("output_dir", "./assets/logos/")
        size = arguments.get("size", 128)
        
        results = []
        async with aiohttp.ClientSession() as session:
            for domain in domains:
                company_name = get_company_name(domain)
                
                # Try Free Logo API first
                logo_data, ext = await fetch_logo_from_freelogo(session, domain, size)
                source = "Free Logo API"
                
                # Fallback to Google
                if not logo_data:
                    logo_data, ext = await fetch_logo_from_google(session, domain, size)
                    source = "Google Favicon"
                
                if logo_data:
                    output_path = os.path.join(output_dir, f"{company_name}.{ext}")
                    if await save_logo_to_file(logo_data, output_path):
                        results.append(f"✓ {domain} -> {output_path} ({source})")
                    else:
                        results.append(f"✗ {domain} -> Failed to save")
                else:
                    results.append(f"✗ {domain} -> No logo found")
        
        return CallToolResult([
            TextContent(type="text", text=f"Batch logo fetch completed:\n" + "\n".join(results))
        ])
    
    elif name == "get_logo_info":
        domain = arguments.get("domain")
        if not domain:
            return CallToolResult([TextContent(type="text", text="Error: domain is required")])
        
        clean = clean_domain(domain)
        
        info = f"Logo sources for {domain}:\n\n"
        info += f"1. Free Logo APIs:\n"
        info += f"   - Clearbit: https://logo.clearbit.com/{clean}\n"
        info += f"   - Logo.dev: https://img.logo.dev/{clean}\n"
        info += f"   - Uplead: https://logo.uplead.com/{clean}\n\n"
        info += f"2. Google Favicon (fallback):\n"
        info += f"   - Small: https://www.google.com/s2/favicons?domain={clean}&sz=32\n"
        info += f"   - Medium: https://www.google.com/s2/favicons?domain={clean}&sz=128\n"
        info += f"   - Large: https://www.google.com/s2/favicons?domain={clean}&sz=256\n\n"
        info += f"Company name extracted: {get_company_name(domain)}"
        
        return CallToolResult([TextContent(type="text", text=info)])
    
    else:
        return CallToolResult([TextContent(type="text", text=f"Unknown tool: {name}")])

async def main():
    """Run the MCP server"""
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream, 
            InitializationOptions(
                server_name="logo-fetcher",
                server_version="1.0.0",
                capabilities=app.get_capabilities(
                    notification_options=None,
                    experimental_capabilities=None
                )
            )
        )

if __name__ == "__main__":
    asyncio.run(main())
