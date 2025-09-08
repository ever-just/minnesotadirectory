# Business Description Generation Prompt Template

## Overview
This prompt template is designed for LLM APIs (OpenAI GPT-4, Claude, etc.) to generate structured business descriptions for Minnesota companies in the directory.

## Prompt Template

```
Generate a comprehensive business description for the company "{COMPANY_NAME}" based on the following information:

**Company Details:**
- Name: {COMPANY_NAME}
- Industry: {INDUSTRY}
- Website: {WEBSITE}
- Location: {CITY}, {STATE}
- Revenue: ${SALES}
- Employees: {EMPLOYEES}
- Current Description: {EXISTING_DESCRIPTION}

**Additional Research Context:**
{WIKIPEDIA_INFO}
{WEBSITE_SUMMARY}

**Instructions:**
Create a business description with exactly this structure:

## Quick Overview
Provide a 2-3 sentence explanation of what this company does in simple, clear terms that anyone can understand. Focus on their core business and value to customers.

## Business Model Canvas

### Customer Segments
Who are the primary customer groups this company serves? Be specific about demographics, industries, or market segments.

### Value Propositions  
What unique value does this company offer to its customers? What problems do they solve or needs do they meet?

### Channels
How does this company reach and deliver value to its customers? Include sales channels, distribution methods, and customer touchpoints.

### Customer Relationships
What type of relationships does this company establish with different customer segments? (e.g., personal assistance, self-service, automated services)

### Revenue Streams
How does this company generate revenue? Include pricing models, revenue sources, and monetization strategies.

### Key Resources
What are the most important assets required to make this business model work? (physical, intellectual, human, financial resources)

### Key Activities
What are the most important activities this company must perform to execute their value proposition?

### Key Partnerships
Who are the key partners and suppliers that help this business model work? What resources are acquired and activities performed by partners?

### Cost Structure
What are the most important costs inherent in this business model? Which key resources and activities are most expensive?

**Response Guidelines:**
- Keep each section concise but informative (2-4 sentences per section)
- Use factual, professional language
- Base responses on available information; if uncertain, use appropriate qualifiers
- Focus on the company's core business model, not speculation
- Ensure the description is valuable for business professionals researching Minnesota companies
- If information is limited, acknowledge this and provide the best analysis possible with available data
```

## Customization Variables

The following variables should be replaced with actual company data:

- `{COMPANY_NAME}`: Company name from database
- `{INDUSTRY}`: Industry classification
- `{WEBSITE}`: Company website URL
- `{CITY}`: Company city location
- `{STATE}`: Company state (typically Minnesota)
- `{SALES}`: Annual revenue/sales figures
- `{EMPLOYEES}`: Number of employees
- `{EXISTING_DESCRIPTION}`: Current description from database
- `{WIKIPEDIA_INFO}`: Relevant Wikipedia information (if found)
- `{WEBSITE_SUMMARY}`: Summary of company website content

## Example Usage

For 3M Company:
```
Generate a comprehensive business description for the company "3M" based on the following information:

**Company Details:**
- Name: 3M
- Industry: Manufacturing
- Website: https://www.3m.com
- Location: St. Paul, Minnesota
- Revenue: $35,000,000,000
- Employees: 95000
- Current Description: Diversified technology company

**Additional Research Context:**
3M is a multinational conglomerate corporation operating in the fields of industry, worker safety, health care, and consumer goods...

[Rest of prompt follows template structure]
```

## Quality Assurance

Generated descriptions should be evaluated on:
1. **Accuracy**: Information matches known company facts
2. **Completeness**: All Business Model Canvas sections are addressed
3. **Clarity**: Language is professional and accessible
4. **Structure**: Follows the exact format specified
5. **Relevance**: Content is valuable for business research purposes

## API Integration Notes

- Use with temperature setting of 0.3-0.7 for balanced creativity and consistency
- Set max tokens to 1500-2000 to allow for comprehensive responses
- Include system message emphasizing accuracy and professional tone
- Consider using few-shot examples for consistency across generations
