# Neon MCP Server for Minnesota Directory

This MCP (Model Control Protocol) server provides database operations for the Minnesota Directory project using Neon PostgreSQL database.

## Features

- **Company Management**: Query, create, update, and delete companies
- **Industry Analytics**: Get statistics and insights about different industries
- **Website Analysis**: Manage website structure analysis and sitemap processing
- **Custom Queries**: Execute safe SQL queries for advanced operations
- **Database Statistics**: Comprehensive database metrics and insights

## Available Tools

### Company Operations
- `query_companies` - Query companies with flexible filters
- `get_company_by_id` - Get specific company details
- `create_company` - Create new company records
- `update_company` - Update existing companies
- `delete_company` - Remove company records

### Industry & Analytics
- `get_industries_stats` - Get industry statistics and metrics
- `get_database_stats` - Comprehensive database statistics

### Website Analysis
- `get_website_structure` - Get website structure analysis
- `queue_sitemap_analysis` - Queue companies for sitemap analysis

### Advanced Operations
- `execute_sql_query` - Execute custom SQL queries (SELECT only for security)

## Setup

### 1. Install Dependencies
```bash
cd neon-mcp-server
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Environment Configuration
Create a `.env` file in this directory:
```bash
NETLIFY_DATABASE_URL=your_neon_database_connection_string
```

Or use the same environment variable that your Netlify functions use.

### 3. Test the Server
```bash
python test_server.py
```

### 4. Configure Cursor MCP
Add this server to your Cursor MCP configuration:

```json
{
  "mcpServers": {
    "neon-minnesota-directory": {
      "command": "python",
      "args": ["/Users/cloudaistudio/Documents/EVERJUST PROJECTS/minnesotadirectory/neon-mcp-server/server.py"],
      "env": {
        "NETLIFY_DATABASE_URL": "your_neon_database_connection_string"
      }
    }
  }
}
```

## Usage Examples

### Query Companies
```python
# Get all companies in Technology industry
query_companies(industry="Technology", limit=100)

# Get companies with 100+ employees
query_companies(min_employees=100, max_employees=1000)

# Search companies by name
query_companies(search="Microsoft")
```

### Industry Analysis
```python
# Get industry statistics
get_industries_stats(include_company_count=True)
```

### Database Statistics
```python
# Get comprehensive database stats
get_database_stats()
```

## Database Schema

The server works with the following main tables:
- `companies` - Main company information
- `industries` - Industry categories and statistics
- `website_structures` - Website analysis data
- `website_pages` - Individual page data from sitemap analysis
- `analysis_queue` - Queue for sitemap analysis tasks

## Security

- SQL injection protection through parameterized queries
- Custom SQL queries limited to SELECT statements only
- Connection pooling for optimal performance
- SSL-required connections to Neon database

## Development

### Adding New Tools
1. Add tool definition to `handle_list_tools()`
2. Add handler function
3. Add case in `handle_call_tool()`
4. Test with `test_server.py`

### Database Migrations
This server uses the existing database schema from the main project. For schema changes, update the main project's Drizzle migrations.

## Troubleshooting

### Connection Issues
- Verify `NETLIFY_DATABASE_URL` is correctly set
- Check network connectivity to Neon
- Ensure SSL is properly configured

### Performance Issues
- Review connection pool settings
- Check query efficiency with EXPLAIN
- Monitor database performance in Neon dashboard

### Tool Errors
- Check tool arguments match the schema
- Verify database permissions
- Review server logs for detailed error messages
