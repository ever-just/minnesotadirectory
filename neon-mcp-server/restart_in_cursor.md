# How to Restart the Neon MCP Server in Cursor

The Neon MCP server has been fixed and is now working correctly. To get it working in Cursor, follow these steps:

## Quick Fix

1. **Restart Cursor completely** (Quit and reopen the application)
2. The MCP server should now show tools

## If that doesn't work:

1. Open Cursor Settings (Cmd+,)
2. Search for "MCP" in settings
3. Look for the MCP servers section
4. Toggle the "neon-minnesota-directory" server OFF and then ON again
5. You should see the tools appear

## Available Tools

Once working, you'll have access to these tools:
- `query_companies` - Query companies with filters (industry, employees, sales, etc.)
- `get_company_by_id` - Get specific company details
- `create_company` - Create new company records
- `update_company` - Update existing companies
- `delete_company` - Remove company records
- `get_industries_stats` - Get industry statistics
- `get_database_stats` - Get comprehensive database statistics
- `execute_sql_query` - Execute custom SQL queries (SELECT only)

## Test the Connection

Try asking Cursor to:
- "Use neon MCP to get database statistics"
- "Query companies in the Technology industry"
- "Show me the top 10 companies by sales"

## Troubleshooting

If still not working:
1. Check that the database is awake: Run `python wake_database.py` in the neon-mcp-server directory
2. Verify the server works: Run `python test_server.py`
3. Check Cursor logs for any MCP errors

## Current Status

✅ Database connection: Working (2762 companies)
✅ All tests passing
✅ Server configuration correct in settings.json


