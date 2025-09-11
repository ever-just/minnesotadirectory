#!/usr/bin/env python3
"""
Neon MCP Server for Minnesota Directory
Provides database operations for companies, industries, and website analysis
"""

import asyncio
import json
import os
import sys
from typing import Any, Dict, List, Optional, Sequence
from urllib.parse import urlparse

import asyncpg
from dotenv import load_dotenv
from mcp.server import Server
from mcp.server.models import InitializationOptions
from mcp.server.stdio import stdio_server
from mcp.types import (
    Resource,
    Tool,
    TextContent,
    ImageContent,
    EmbeddedResource,
    LoggingLevel,
)

# Load environment variables
load_dotenv()

# Initialize MCP server
server = Server("neon-minnesota-directory")

# Database connection pool
_db_pool: Optional[asyncpg.Pool] = None

async def get_db_pool() -> asyncpg.Pool:
    """Get or create database connection pool"""
    global _db_pool
    if _db_pool is None:
        database_url = os.getenv('NETLIFY_DATABASE_URL')
        if not database_url:
            raise ValueError("NETLIFY_DATABASE_URL environment variable not set")
        
        # Parse the URL to handle Neon-specific connection
        parsed = urlparse(database_url)
        
        _db_pool = await asyncpg.create_pool(
            host=parsed.hostname,
            port=parsed.port or 5432,
            user=parsed.username,
            password=parsed.password,
            database=parsed.path[1:] if parsed.path else None,
            ssl='require',
            min_size=1,
            max_size=10,
            command_timeout=30
        )
    return _db_pool

@server.list_tools()
async def handle_list_tools() -> List[Tool]:
    """List available database tools"""
    return [
        Tool(
            name="query_companies",
            description="Query companies from the database with optional filters",
            inputSchema={
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "Maximum number of results", "default": 50},
                    "offset": {"type": "integer", "description": "Number of results to skip", "default": 0},
                    "industry": {"type": "string", "description": "Filter by industry"},
                    "min_employees": {"type": "integer", "description": "Minimum number of employees"},
                    "max_employees": {"type": "integer", "description": "Maximum number of employees"},
                    "min_sales": {"type": "number", "description": "Minimum sales amount"},
                    "max_sales": {"type": "number", "description": "Maximum sales amount"},
                    "city": {"type": "string", "description": "Filter by city"},
                    "has_website": {"type": "boolean", "description": "Filter companies with/without websites"},
                    "search": {"type": "string", "description": "Search in company name or description"}
                }
            }
        ),
        Tool(
            name="get_company_by_id",
            description="Get a specific company by ID",
            inputSchema={
                "type": "object",
                "properties": {
                    "company_id": {"type": "string", "description": "Company UUID"}
                },
                "required": ["company_id"]
            }
        ),
        Tool(
            name="get_industries_stats",
            description="Get statistics about industries",
            inputSchema={
                "type": "object",
                "properties": {
                    "include_company_count": {"type": "boolean", "default": True}
                }
            }
        ),
        Tool(
            name="create_company",
            description="Create a new company record",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Company name"},
                    "industry": {"type": "string", "description": "Industry category"},
                    "sales": {"type": "number", "description": "Annual sales"},
                    "employees": {"type": "integer", "description": "Number of employees"},
                    "address": {"type": "string", "description": "Company address"},
                    "city": {"type": "string", "description": "City"},
                    "state": {"type": "string", "default": "Minnesota"},
                    "postal_code": {"type": "string", "description": "Postal code"},
                    "phone": {"type": "string", "description": "Phone number"},
                    "website": {"type": "string", "description": "Company website"},
                    "description": {"type": "string", "description": "Company description"},
                    "tradestyle": {"type": "string", "description": "Trade style name"},
                    "ticker": {"type": "string", "description": "Stock ticker"},
                    "ownership": {"type": "string", "description": "Ownership type"}
                },
                "required": ["name"]
            }
        ),
        Tool(
            name="update_company",
            description="Update an existing company record",
            inputSchema={
                "type": "object",
                "properties": {
                    "company_id": {"type": "string", "description": "Company UUID"},
                    "name": {"type": "string", "description": "Company name"},
                    "industry": {"type": "string", "description": "Industry category"},
                    "sales": {"type": "number", "description": "Annual sales"},
                    "employees": {"type": "integer", "description": "Number of employees"},
                    "address": {"type": "string", "description": "Company address"},
                    "city": {"type": "string", "description": "City"},
                    "state": {"type": "string"},
                    "postal_code": {"type": "string", "description": "Postal code"},
                    "phone": {"type": "string", "description": "Phone number"},
                    "website": {"type": "string", "description": "Company website"},
                    "description": {"type": "string", "description": "Company description"},
                    "tradestyle": {"type": "string", "description": "Trade style name"},
                    "ticker": {"type": "string", "description": "Stock ticker"},
                    "ownership": {"type": "string", "description": "Ownership type"}
                },
                "required": ["company_id"]
            }
        ),
        Tool(
            name="delete_company",
            description="Delete a company record",
            inputSchema={
                "type": "object",
                "properties": {
                    "company_id": {"type": "string", "description": "Company UUID"}
                },
                "required": ["company_id"]
            }
        ),
        Tool(
            name="execute_sql_query",
            description="Execute a custom SQL query (use with caution)",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "SQL query to execute"},
                    "params": {"type": "array", "description": "Query parameters", "default": []}
                },
                "required": ["query"]
            }
        ),
        # Commented out - these tables don't exist in current database
        # Tool(
        #     name="get_website_structure",
        #     description="Get website structure analysis for a company",
        #     inputSchema={
        #         "type": "object",
        #         "properties": {
        #             "company_id": {"type": "string", "description": "Company UUID"},
        #             "domain": {"type": "string", "description": "Domain to analyze (optional)"}
        #         }
        #     }
        # ),
        # Tool(
        #     name="queue_sitemap_analysis",
        #     description="Queue a company for sitemap analysis",
        #     inputSchema={
        #         "type": "object",
        #         "properties": {
        #             "company_id": {"type": "string", "description": "Company UUID"},
        #             "priority": {"type": "integer", "description": "Priority (1-10)", "default": 5}
        #         },
        #         "required": ["company_id"]
        #     }
        # ),
        Tool(
            name="get_database_stats",
            description="Get comprehensive database statistics",
            inputSchema={"type": "object", "properties": {}}
        ),
        # Commented out - these tools rely on website_structures and website_pages tables that don't exist
        # Tool(
        #     name="get_business_intelligence_summary",
        #     description="Get business intelligence summary with careers-first prioritization",
        #     inputSchema={
        #         "type": "object",
        #         "properties": {
        #             "tier": {"type": "integer", "description": "Filter by BI tier (1=Critical, 2=High Value, etc.)", "minimum": 1, "maximum": 6},
        #             "classification": {"type": "string", "description": "Filter by BI classification (careers, services, products, etc.)"},
        #             "limit": {"type": "integer", "description": "Maximum number of results", "default": 100}
        #         }
        #     }
        # ),
        # Tool(
        #     name="analyze_hiring_activity",
        #     description="Analyze company hiring activity and growth indicators (Tier 1 BI)",
        #     inputSchema={
        #         "type": "object", 
        #         "properties": {
        #             "industry": {"type": "string", "description": "Filter by industry"},
        #             "min_career_pages": {"type": "integer", "description": "Minimum number of career pages", "default": 1},
        #             "company_size": {"type": "string", "description": "Filter by company size (small, medium, large)"},
        #             "limit": {"type": "integer", "description": "Maximum number of results", "default": 50}
        #         }
        #     }
        # ),
        # Tool(
        #     name="get_high_value_pages",
        #     description="Get high-value business intelligence pages (Tiers 1-2 only)",
        #     inputSchema={
        #         "type": "object",
        #         "properties": {
        #             "company_domain": {"type": "string", "description": "Filter by specific company domain"},
        #             "page_types": {"type": "array", "items": {"type": "string"}, "description": "Filter by page types (careers, services, products, about, team, news)"},
        #             "tier": {"type": "integer", "description": "BI tier (1=Critical, 2=High Value)", "minimum": 1, "maximum": 2},
        #             "limit": {"type": "integer", "description": "Maximum number of results", "default": 100}
        #         }
        #     }
        # )
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: dict) -> Sequence[TextContent]:
    """Handle tool calls"""
    try:
        pool = await get_db_pool()
        
        if name == "query_companies":
            return await query_companies(pool, arguments)
        elif name == "get_company_by_id":
            return await get_company_by_id(pool, arguments)
        elif name == "get_industries_stats":
            return await get_industries_stats(pool, arguments)
        elif name == "create_company":
            return await create_company(pool, arguments)
        elif name == "update_company":
            return await update_company(pool, arguments)
        elif name == "delete_company":
            return await delete_company(pool, arguments)
        elif name == "execute_sql_query":
            return await execute_sql_query(pool, arguments)
        # elif name == "get_website_structure":
        #     return await get_website_structure(pool, arguments)
        # elif name == "queue_sitemap_analysis":
        #     return await queue_sitemap_analysis(pool, arguments)
        elif name == "get_database_stats":
            return await get_database_stats(pool, arguments)
        # elif name == "get_business_intelligence_summary":
        #     return await get_business_intelligence_summary(pool, arguments)
        # elif name == "analyze_hiring_activity":
        #     return await analyze_hiring_activity(pool, arguments)
        # elif name == "get_high_value_pages":
        #     return await get_high_value_pages(pool, arguments)
        else:
            raise ValueError(f"Unknown tool: {name}")
            
    except Exception as e:
        return [TextContent(type="text", text=f"Error: {str(e)}")]

async def query_companies(pool: asyncpg.Pool, args: dict) -> Sequence[TextContent]:
    """Query companies with filters"""
    limit = args.get('limit', 50)
    offset = args.get('offset', 0)
    
    # Build WHERE clause
    where_conditions = []
    query_params = []
    param_count = 0
    
    if args.get('industry'):
        param_count += 1
        where_conditions.append(f"industry ILIKE ${param_count}")
        query_params.append(f"%{args['industry']}%")
    
    if args.get('min_employees'):
        param_count += 1
        where_conditions.append(f"employees >= ${param_count}")
        query_params.append(args['min_employees'])
    
    if args.get('max_employees'):
        param_count += 1
        where_conditions.append(f"employees <= ${param_count}")
        query_params.append(args['max_employees'])
    
    if args.get('min_sales'):
        param_count += 1
        where_conditions.append(f"sales >= ${param_count}")
        query_params.append(args['min_sales'])
    
    if args.get('max_sales'):
        param_count += 1
        where_conditions.append(f"sales <= ${param_count}")
        query_params.append(args['max_sales'])
    
    if args.get('city'):
        param_count += 1
        where_conditions.append(f"city ILIKE ${param_count}")
        query_params.append(f"%{args['city']}%")
    
    if args.get('has_website') is not None:
        if args['has_website']:
            where_conditions.append("website IS NOT NULL AND website != ''")
        else:
            where_conditions.append("(website IS NULL OR website = '')")
    
    if args.get('search'):
        param_count += 1
        where_conditions.append(f"(name ILIKE ${param_count} OR description ILIKE ${param_count})")
        query_params.append(f"%{args['search']}%")
    
    where_clause = f"WHERE {' AND '.join(where_conditions)}" if where_conditions else ""
    
    param_count += 1
    limit_param = param_count
    param_count += 1
    offset_param = param_count
    
    query_params.extend([limit, offset])
    
    query = f"""
        SELECT id, name, industry, sales, employees, city, state, website, description,
               tradestyle, ticker, ownership, phone, address, postal_code,
               naics_description, sic_description,
               is_headquarters, employees_site,
               created_at, latitude, longitude, geocodedat
        FROM companies 
        {where_clause}
        ORDER BY sales DESC NULLS LAST
        LIMIT ${limit_param} OFFSET ${offset_param}
    """
    
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *query_params)
        
        companies = [dict(row) for row in rows]
        
        # Get total count for pagination
        count_query = f"SELECT COUNT(*) FROM companies {where_clause}"
        count_params = query_params[:-2]  # Exclude limit and offset
        total_count = await conn.fetchval(count_query, *count_params)
    
    result = {
        "companies": companies,
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "success": True
    }
    
    return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]

async def get_company_by_id(pool: asyncpg.Pool, args: dict) -> Sequence[TextContent]:
    """Get a specific company by ID"""
    company_id = args['company_id']
    
    query = """
        SELECT id, name, industry, sales, employees, city, state, website, description,
               tradestyle, ticker, ownership, phone, address, postal_code,
               naics_description, sic_description,
               is_headquarters, employees_site,
               created_at, latitude, longitude, geocodedat
        FROM companies 
        WHERE id = $1
    """
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, company_id)
        
        if not row:
            return [TextContent(type="text", text=json.dumps({"error": "Company not found", "success": False}))]
        
        company = dict(row)
    
    return [TextContent(type="text", text=json.dumps({"company": company, "success": True}, indent=2, default=str))]

async def get_industries_stats(pool: asyncpg.Pool, args: dict) -> Sequence[TextContent]:
    """Get industry statistics"""
    include_company_count = args.get('include_company_count', True)
    
    if include_company_count:
        query = """
            SELECT industry, COUNT(*) as company_count, 
                   AVG(sales) as avg_sales, AVG(employees) as avg_employees
            FROM companies 
            WHERE industry IS NOT NULL 
            GROUP BY industry 
            ORDER BY company_count DESC
        """
    else:
        query = "SELECT DISTINCT industry FROM companies WHERE industry IS NOT NULL ORDER BY industry"
    
    async with pool.acquire() as conn:
        rows = await conn.fetch(query)
        
        if include_company_count:
            industries = [dict(row) for row in rows]
        else:
            industries = [row['industry'] for row in rows]
    
    result = {"industries": industries, "success": True}
    return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]

async def create_company(pool: asyncpg.Pool, args: dict) -> Sequence[TextContent]:
    """Create a new company"""
    query = """
        INSERT INTO companies (name, industry, sales, employees, address, city, state, 
                             postal_code, phone, website, description, tradestyle, ticker, ownership)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id, name
    """
    
    params = [
        args['name'],
        args.get('industry'),
        args.get('sales'),
        args.get('employees'),
        args.get('address'),
        args.get('city'),
        args.get('state', 'Minnesota'),
        args.get('postal_code'),
        args.get('phone'),
        args.get('website'),
        args.get('description'),
        args.get('tradestyle'),
        args.get('ticker'),
        args.get('ownership')
    ]
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, *params)
        result = {"company": dict(row), "success": True}
    
    return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]

async def update_company(pool: asyncpg.Pool, args: dict) -> Sequence[TextContent]:
    """Update an existing company"""
    company_id = args.pop('company_id')
    
    # Build dynamic UPDATE query
    set_clauses = []
    params = []
    param_count = 0
    
    for field, value in args.items():
        if value is not None:
            param_count += 1
            set_clauses.append(f"{field} = ${param_count}")
            params.append(value)
    
    if not set_clauses:
        return [TextContent(type="text", text=json.dumps({"error": "No fields to update", "success": False}))]
    
    param_count += 1
    params.append(company_id)
    
    query = f"""
        UPDATE companies 
        SET {', '.join(set_clauses)}, updated_at = NOW()
        WHERE id = ${param_count}
        RETURNING id, name
    """
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, *params)
        if not row:
            return [TextContent(type="text", text=json.dumps({"error": "Company not found", "success": False}))]
        
        result = {"company": dict(row), "success": True}
    
    return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]

async def delete_company(pool: asyncpg.Pool, args: dict) -> Sequence[TextContent]:
    """Delete a company"""
    company_id = args['company_id']
    
    query = "DELETE FROM companies WHERE id = $1 RETURNING id, name"
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, company_id)
        if not row:
            return [TextContent(type="text", text=json.dumps({"error": "Company not found", "success": False}))]
        
        result = {"deleted_company": dict(row), "success": True}
    
    return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]

async def execute_sql_query(pool: asyncpg.Pool, args: dict) -> Sequence[TextContent]:
    """Execute custom SQL query"""
    query = args['query']
    params = args.get('params', [])
    
    # Safety check - only allow SELECT statements for now
    if not query.strip().upper().startswith('SELECT'):
        return [TextContent(type="text", text=json.dumps({
            "error": "Only SELECT queries are allowed for security reasons", 
            "success": False
        }))]
    
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)
        results = [dict(row) for row in rows]
    
    result = {"results": results, "count": len(results), "success": True}
    return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]

async def get_website_structure(pool: asyncpg.Pool, args: dict) -> Sequence[TextContent]:
    """Get website structure analysis"""
    company_id = args.get('company_id')
    domain = args.get('domain')
    
    if company_id:
        query = """
            SELECT ws.*, c.name as company_name
            FROM website_structures ws
            JOIN companies c ON c.id = ws.company_id
            WHERE ws.company_id = $1
            ORDER BY ws.last_analyzed DESC
        """
        params = [company_id]
    elif domain:
        query = """
            SELECT ws.*, c.name as company_name
            FROM website_structures ws
            JOIN companies c ON c.id = ws.company_id
            WHERE ws.domain = $1
            ORDER BY ws.last_analyzed DESC
        """
        params = [domain]
    else:
        return [TextContent(type="text", text=json.dumps({
            "error": "Either company_id or domain must be provided", 
            "success": False
        }))]
    
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)
        structures = [dict(row) for row in rows]
    
    result = {"website_structures": structures, "success": True}
    return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]

async def queue_sitemap_analysis(pool: asyncpg.Pool, args: dict) -> Sequence[TextContent]:
    """Queue a company for sitemap analysis"""
    company_id = args['company_id']
    priority = args.get('priority', 5)
    
    # Get company domain first
    company_query = "SELECT website FROM companies WHERE id = $1"
    
    async with pool.acquire() as conn:
        company_row = await conn.fetchrow(company_query, company_id)
        
        if not company_row or not company_row['website']:
            return [TextContent(type="text", text=json.dumps({
                "error": "Company not found or has no website", 
                "success": False
            }))]
        
        website = company_row['website']
        # Extract domain from website URL
        if '://' in website:
            domain = website.split('://')[1].split('/')[0]
        else:
            domain = website.split('/')[0]
        
        # Insert into analysis queue
        queue_query = """
            INSERT INTO analysis_queue (company_id, domain, priority, scheduled_for)
            VALUES ($1, $2, $3, NOW())
            RETURNING id, status
        """
        
        queue_row = await conn.fetchrow(queue_query, company_id, domain, priority)
        result = {"queued_analysis": dict(queue_row), "domain": domain, "success": True}
    
    return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]

async def get_database_stats(pool: asyncpg.Pool, args: dict) -> Sequence[TextContent]:
    """Get comprehensive database statistics"""
    async with pool.acquire() as conn:
        # Get table counts
        companies_count = await conn.fetchval("SELECT COUNT(*) FROM companies")
        industries_count = await conn.fetchval("SELECT COUNT(DISTINCT industry) FROM companies WHERE industry IS NOT NULL")
        users_count = await conn.fetchval("SELECT COUNT(*) FROM users")
        saved_companies_count = await conn.fetchval("SELECT COUNT(*) FROM saved_companies")
        
        # Get companies with websites
        companies_with_websites = await conn.fetchval("SELECT COUNT(*) FROM companies WHERE website IS NOT NULL AND website != ''")
        
        # Get companies with coordinates
        companies_with_coords = await conn.fetchval("SELECT COUNT(*) FROM companies WHERE latitude IS NOT NULL AND longitude IS NOT NULL")
        
        # Get top industries
        top_industries = await conn.fetch("""
            SELECT industry, COUNT(*) as count 
            FROM companies 
            WHERE industry IS NOT NULL 
            GROUP BY industry 
            ORDER BY count DESC 
            LIMIT 10
        """)
        
        # Get sales statistics
        sales_stats = await conn.fetchrow("""
            SELECT 
                AVG(sales) as avg_sales,
                MIN(sales) as min_sales,
                MAX(sales) as max_sales,
                COUNT(sales) as companies_with_sales
            FROM companies 
            WHERE sales IS NOT NULL
        """)
        
        # Get employee statistics
        employee_stats = await conn.fetchrow("""
            SELECT 
                AVG(employees) as avg_employees,
                MIN(employees) as min_employees,
                MAX(employees) as max_employees,
                COUNT(employees) as companies_with_employees
            FROM companies 
            WHERE employees IS NOT NULL
        """)
    
    stats = {
        "database_statistics": {
            "companies_total": companies_count,
            "companies_with_websites": companies_with_websites,
            "companies_with_coordinates": companies_with_coords,
            "unique_industries": industries_count,
            "users_total": users_count,
            "saved_companies_total": saved_companies_count,
            "top_industries": [dict(row) for row in top_industries],
            "sales_statistics": dict(sales_stats) if sales_stats else {},
            "employee_statistics": dict(employee_stats) if employee_stats else {}
        },
        "success": True
    }
    
    return [TextContent(type="text", text=json.dumps(stats, indent=2, default=str))]

async def get_business_intelligence_summary(pool: asyncpg.Pool, args: dict) -> Sequence[TextContent]:
    """Get Business Intelligence summary with careers-first prioritization"""
    tier_filter = args.get('tier')
    classification_filter = args.get('classification')
    limit = args.get('limit', 100)
    
    # Build WHERE clause for filters
    where_conditions = ["business_value_tier <= 6"]  # Exclude unclassified (tier 7)
    params = []
    param_count = 0
    
    if tier_filter:
        param_count += 1
        where_conditions.append(f"business_value_tier = ${param_count}")
        params.append(tier_filter)
    
    if classification_filter:
        param_count += 1  
        where_conditions.append(f"bi_classification = ${param_count}")
        params.append(classification_filter)
    
    where_clause = "WHERE " + " AND ".join(where_conditions)
    
    async with pool.acquire() as conn:
        # Get BI summary by tier and classification
        param_count += 1
        summary_query = f"""
            SELECT 
                business_value_tier as tier,
                bi_classification,
                COUNT(*) as page_count,
                COUNT(DISTINCT ws.company_id) as company_count,
                intelligence_value
            FROM website_pages wp
            JOIN website_structures ws ON wp.website_structure_id = ws.id
            {where_clause}
            GROUP BY business_value_tier, bi_classification, intelligence_value
            ORDER BY business_value_tier, page_count DESC
            LIMIT ${param_count}
        """
        params.append(limit)
        
        summary_results = await conn.fetch(summary_query, *params)
        
        # Format results by tier
        tier_names = {
            1: "TIER 1 - CRITICAL BUSINESS INTELLIGENCE", 
            2: "TIER 2 - HIGH-VALUE INTELLIGENCE",
            3: "TIER 3 - BUSINESS OPERATIONS", 
            4: "TIER 4 - MARKET INTELLIGENCE",
            5: "TIER 5 - FINANCIAL INTELLIGENCE",
            6: "TIER 6 - ADMINISTRATIVE"
        }
        
        formatted_results = {}
        for row in summary_results:
            tier = row['tier']
            tier_name = tier_names.get(tier, f"TIER {tier}")
            
            if tier_name not in formatted_results:
                formatted_results[tier_name] = []
            
            formatted_results[tier_name].append({
                'classification': row['bi_classification'],
                'page_count': row['page_count'],
                'company_count': row['company_count'], 
                'intelligence_value': row['intelligence_value']
            })
    
    result = {
        "business_intelligence_summary": formatted_results,
        "total_results": len(summary_results),
        "filters_applied": {
            "tier": tier_filter,
            "classification": classification_filter
        },
        "success": True
    }
    
    return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]

async def analyze_hiring_activity(pool: asyncpg.Pool, args: dict) -> Sequence[TextContent]:
    """Analyze company hiring activity and growth indicators (CAREERS-FIRST BI)"""
    industry_filter = args.get('industry')
    min_career_pages = args.get('min_career_pages', 1)
    company_size_filter = args.get('company_size')
    limit = args.get('limit', 50)
    
    # Build size filter condition
    size_condition = ""
    if company_size_filter:
        if company_size_filter.lower() == 'small':
            size_condition = "AND c.employees <= 100"
        elif company_size_filter.lower() == 'medium': 
            size_condition = "AND c.employees > 100 AND c.employees <= 1000"
        elif company_size_filter.lower() == 'large':
            size_condition = "AND c.employees > 1000"
    
    industry_condition = ""
    params = [min_career_pages]
    param_num = 1
    
    if industry_filter:
        param_num += 1
        industry_condition = f"AND c.industry ILIKE ${param_num}"
        params.append(f"%{industry_filter}%")
    
    param_num += 1
    limit_param_num = param_num
    params.append(limit)
    
    async with pool.acquire() as conn:
        hiring_query = f"""
            SELECT 
                c.name as company_name,
                c.industry,
                c.employees,
                c.sales,
                ws.domain,
                COUNT(wp.id) as career_pages,
                ROUND(COUNT(wp.id)::numeric / GREATEST(c.employees, 1) * 100, 2) as hiring_ratio,
                ARRAY_AGG(DISTINCT wp.url ORDER BY wp.url LIMIT 5) as sample_career_urls
            FROM companies c
            JOIN website_structures ws ON c.id = ws.company_id
            JOIN website_pages wp ON ws.id = wp.website_structure_id
            WHERE wp.bi_classification = 'careers'
            AND wp.business_value_tier = 1
            {industry_condition}
            {size_condition}
            GROUP BY c.id, c.name, c.industry, c.employees, c.sales, ws.domain
            HAVING COUNT(wp.id) >= $1
            ORDER BY career_pages DESC, hiring_ratio DESC
            LIMIT ${limit_param_num}
        """
        
        hiring_results = await conn.fetch(hiring_query, *params)
        
        # Get industry hiring summary
        industry_summary = await conn.fetch("""
            SELECT 
                c.industry,
                COUNT(DISTINCT c.id) as companies_hiring,
                COUNT(wp.id) as total_career_pages,
                AVG(c.employees) as avg_company_size,
                AVG(c.sales) as avg_sales
            FROM companies c
            JOIN website_structures ws ON c.id = ws.company_id
            JOIN website_pages wp ON ws.id = wp.website_structure_id  
            WHERE wp.bi_classification = 'careers'
            AND wp.business_value_tier = 1
            GROUP BY c.industry
            HAVING COUNT(DISTINCT c.id) >= 3
            ORDER BY companies_hiring DESC
            LIMIT 10
        """)
        
        hiring_analysis = []
        for company in hiring_results:
            analysis = dict(company)
            # Add hiring intensity analysis
            career_pages = company['career_pages']
            employees = company['employees'] or 0
            
            if career_pages >= 10:
                intensity = "VERY HIGH"
            elif career_pages >= 5:
                intensity = "HIGH" 
            elif career_pages >= 3:
                intensity = "MODERATE"
            else:
                intensity = "LOW"
                
            analysis['hiring_intensity'] = intensity
            analysis['growth_signal'] = "EXPANDING" if career_pages >= 5 else "STABLE"
            hiring_analysis.append(analysis)
    
    result = {
        "hiring_activity_analysis": {
            "companies_actively_hiring": hiring_analysis,
            "industry_hiring_summary": [dict(row) for row in industry_summary],
            "analysis_methodology": "Based on Tier 1 careers pages - highest business intelligence priority"
        },
        "filters_applied": {
            "industry": industry_filter,
            "min_career_pages": min_career_pages,
            "company_size": company_size_filter
        },
        "success": True
    }
    
    return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]

async def get_high_value_pages(pool: asyncpg.Pool, args: dict) -> Sequence[TextContent]:
    """Get high-value business intelligence pages (Tiers 1-2 only)"""
    company_domain = args.get('company_domain')
    page_types = args.get('page_types', [])
    tier = args.get('tier')
    limit = args.get('limit', 100)
    
    # Build WHERE conditions
    where_conditions = ["wp.business_value_tier <= 2"]  # Only Tiers 1-2
    params = []
    param_count = 0
    
    if company_domain:
        param_count += 1
        where_conditions.append(f"ws.domain = ${param_count}")
        params.append(company_domain)
    
    if page_types:
        param_count += 1
        where_conditions.append(f"wp.bi_classification = ANY(${param_count})")
        params.append(page_types)
    
    if tier:
        param_count += 1
        where_conditions.append(f"wp.business_value_tier = ${param_count}")
        params.append(tier)
    
    param_count += 1
    where_clause = "WHERE " + " AND ".join(where_conditions)
    
    async with pool.acquire() as conn:
        pages_query = f"""
            SELECT 
                c.name as company_name,
                c.industry,
                c.employees,
                ws.domain,
                wp.url,
                wp.title,
                wp.bi_classification,
                wp.business_value_tier as tier,
                wp.intelligence_value,
                wp.discovered_at
            FROM website_pages wp
            JOIN website_structures ws ON wp.website_structure_id = ws.id
            JOIN companies c ON ws.company_id = c.id
            {where_clause}
            ORDER BY wp.business_value_tier, c.employees DESC, wp.discovered_at DESC
            LIMIT ${param_count}
        """
        params.append(limit)
        
        pages = await conn.fetch(pages_query, *params)
        
        # Group by tier and classification for better organization
        organized_results = {}
        for page in pages:
            tier_key = f"TIER {page['tier']}"
            if tier_key not in organized_results:
                organized_results[tier_key] = {}
                
            classification = page['bi_classification']
            if classification not in organized_results[tier_key]:
                organized_results[tier_key][classification] = []
                
            page_info = dict(page)
            del page_info['tier']  # Remove redundant field
            organized_results[tier_key][classification].append(page_info)
    
    result = {
        "high_value_pages": organized_results,
        "total_results": len(pages),
        "business_intelligence_focus": "Careers-first prioritization - only Tiers 1-2 shown",
        "filters_applied": {
            "company_domain": company_domain,
            "page_types": page_types,
            "tier": tier
        },
        "success": True
    }
    
    return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]

async def main():
    """Run the MCP server"""
    # Setup logging
    import logging
    logging.basicConfig(level=logging.INFO)
    
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="neon-minnesota-directory",
                server_version="1.0.0",
                capabilities=server.get_capabilities(),
            ),
        )

if __name__ == "__main__":
    asyncio.run(main())
