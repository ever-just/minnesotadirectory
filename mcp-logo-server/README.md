# Logo Fetcher MCP Server

A Model Context Protocol (MCP) server that fetches company logos by domain and saves them directly to your workspace.

## Features

- **No API Keys Required**: Uses free services like Google Favicon and Free Logo APIs
- **Smart Fallback**: Tries multiple sources for best quality logos
- **Batch Processing**: Fetch multiple logos at once
- **Workspace Integration**: Automatically saves logos to your specified directory
- **Multiple Formats**: Supports PNG, SVG, and JPG formats

## Available Tools

### `fetch_logo`
Fetch a single company logo by domain.

**Parameters:**
- `domain` (required): Company domain (e.g., 'acme.com')
- `output_path` (optional): Path to save the logo (default: './assets/logos/{domain}.png')
- `size` (optional): Logo size in pixels, 16-512 (default: 128)
- `prefer_svg` (optional): Try to get SVG format if available (default: false)

**Example:**
```
domain: microsoft.com
output_path: ./assets/logos/microsoft.png
size: 256
```

### `fetch_logos_batch`
Fetch multiple company logos at once.

**Parameters:**
- `domains` (required): Array of company domains
- `output_dir` (optional): Directory to save logos (default: './assets/logos/')
- `size` (optional): Logo size in pixels (default: 128)

**Example:**
```
domains: ["microsoft.com", "apple.com", "google.com"]
output_dir: ./assets/logos/
size: 128
```

### `get_logo_info`
Get information about available logo sources for a domain.

**Parameters:**
- `domain` (required): Company domain to analyze

## Logo Sources

1. **Free Logo APIs** (Primary):
   - Clearbit Logo API
   - Logo.dev
   - Uplead Logo API

2. **Google Favicon Service** (Fallback):
   - Reliable but smaller images
   - Always available

## Installation

The server is already configured in your Cursor settings. Just restart Cursor to activate it!

## Usage in Your Project

Perfect for:
- Company directories
- Business listings
- Contact management systems
- Any app that needs company logos

## File Naming

Logos are automatically saved with clean filenames:
- `microsoft.com` → `microsoft.png`
- `www.apple.com` → `apple.png`
- `https://google.com` → `google.png`
