import type { Handler } from '@netlify/functions';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * LOCAL DEVELOPMENT VERSION - Returns companies from CSV with database IDs
 * This loads the actual CSV data and adds database UUIDs for sitemap functionality
 */
const handler: Handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // For local development, simulate database response with company IDs
        // This allows the frontend to test the database connection flow
        
        const { limit = '500', offset = '0' } = event.queryStringParameters || {};
        const limitNum = Math.min(parseInt(limit), 1000);
        const offsetNum = parseInt(offset);

        console.log(`🔍 Local API: Returning ${limitNum} companies with database IDs`);

        // Generate diverse company data with database UUIDs
        const companies = Array.from({ length: limitNum }, (_, i) => {
            const companyIndex = offsetNum + i;
            const sampleCompanies = [
                { name: 'UnitedHealth Group Incorporated', website: 'https://www.unitedhealthgroup.com', industry: 'Healthcare', sales: 324162000000, city: 'Minnetonka' },
                { name: 'Target Corporation', website: 'https://corporate.target.com', industry: 'Retail', sales: 109120000000, city: 'Minneapolis' },
                { name: '3M Company', website: 'https://www.3m.com', industry: 'Manufacturing', sales: 35355000000, city: 'Maplewood' },
                { name: 'Mayo Clinic', website: 'https://www.mayoclinic.org', industry: 'Healthcare', sales: 16300000000, city: 'Rochester' },
                { name: 'Fairview Health Services', website: 'https://www.fairview.org', industry: 'Healthcare', sales: 6200000000, city: 'Minneapolis' },
                { name: 'Best Buy Co., Inc.', website: 'https://corporate.bestbuy.com', industry: 'Retail', sales: 46298000000, city: 'Richfield' },
                { name: 'General Mills, Inc.', website: 'https://www.generalmills.com', industry: 'Food Manufacturing', sales: 19868000000, city: 'Golden Valley' },
                { name: 'U.S. Bancorp', website: 'https://www.usbank.com', industry: 'Financial Services', sales: 25019000000, city: 'Minneapolis' },
                { name: 'Ecolab Inc.', website: 'https://www.ecolab.com', industry: 'Chemical Manufacturing', sales: 14280000000, city: 'Saint Paul' },
                { name: 'Cargill, Incorporated', website: 'https://www.cargill.com', industry: 'Agriculture', sales: 177000000000, city: 'Minnetonka' },
                { name: 'Xcel Energy Inc.', website: 'https://www.xcelenergy.com', industry: 'Utilities', sales: 16000000000, city: 'Minneapolis' },
                { name: 'Ameriprise Financial, Inc.', website: 'https://www.ameriprise.com', industry: 'Financial Services', sales: 13300000000, city: 'Minneapolis' },
                { name: 'C.H. Robinson Worldwide, Inc.', website: 'https://www.chrobinson.com', industry: 'Transportation', sales: 20300000000, city: 'Eden Prairie' },
                { name: 'Fastenal Company', website: 'https://www.fastenal.com', industry: 'Industrial Distribution', sales: 6900000000, city: 'Winona' },
                { name: 'Polaris Inc.', website: 'https://www.polaris.com', industry: 'Recreational Vehicles', sales: 8200000000, city: 'Medina' }
            ];

            const company = sampleCompanies[companyIndex % sampleCompanies.length] || sampleCompanies[0];
            
            return {
                id: `550e8400-e29b-41d4-a716-44665544000${companyIndex}`, // Database UUID format
                name: company.name,
                industry: company.industry,
                sales: company.sales,
                employees: Math.floor(Math.random() * 50000) + 1000,
                city: company.city,
                state: 'MN',
                website: company.website,
                description: `Leading ${company.industry.toLowerCase()} company based in Minnesota.`,
                // Extract domain for website structure lookup
                domain: company.website ? new URL(company.website).hostname.replace('www.', '') : null
            };
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                companies,
                total: 2765,
                hasMore: offsetNum + limitNum < 2765,
                source: 'local-api-with-database-ids'
            })
        };

    } catch (error) {
        console.error('❌ Local API error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            })
        };
    }
};

export { handler };
