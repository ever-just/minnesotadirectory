# Business Description Rewrite Implementation Guide

## Overview

This comprehensive guide outlines the strategy to rewrite all business descriptions in the Minnesota Directory while preserving existing descriptions until new ones are ready. The new descriptions follow a structured Business Model Canvas approach for consistent, professional content.

## 🎯 Goals

1. **Preserve existing descriptions** during the rewrite process
2. **Generate structured descriptions** using Business Model Canvas framework
3. **Automate the process** using LLM APIs for consistency and efficiency
4. **Enable review workflow** before replacing original descriptions
5. **Track progress** and maintain quality control

## 📊 LLM API Analysis & Recommendations

### OpenAI GPT-4
- **Cost**: ~$0.03/1k input tokens, ~$0.06/1k output tokens
- **Quality**: Excellent for business analysis
- **Speed**: Fast responses (2-5 seconds)
- **Pros**: Reliable, consistent formatting, good business knowledge
- **Cons**: Higher cost, requires API key management

### Anthropic Claude 3 Sonnet
- **Cost**: ~$0.003/1k input tokens, ~$0.015/1k output tokens
- **Quality**: Excellent analytical capabilities
- **Speed**: Fast responses (2-5 seconds)  
- **Pros**: Lower cost, excellent at structured analysis
- **Cons**: Newer API, less established

### Cost Estimation (for ~2,765 companies)

**Per Description Estimates:**
- Input tokens: ~800 (prompt + company data)
- Output tokens: ~1,200 (structured description)

**Total Costs:**
- **OpenAI GPT-4**: ~$200-250 for all companies
- **Anthropic Claude**: ~$50-75 for all companies
- **Hybrid approach**: Use Claude for cost efficiency with GPT-4 fallback

**Recommendation**: Start with **Anthropic Claude 3 Sonnet** for cost efficiency, with OpenAI GPT-4 as fallback.

## 🏗️ Implementation Architecture

### Database Schema Changes

New columns added to `companies` table:
- `new_description`: TEXT - Stores generated descriptions
- `description_status`: VARCHAR(50) - Tracks status (original, generated, reviewed, approved, active)
- `description_generated_at`: TIMESTAMP - When generated
- `description_approved_at`: TIMESTAMP - When approved
- `description_source`: VARCHAR(50) - Source of information (llm_api, wikipedia, etc.)
- `description_version`: INTEGER - Version tracking

### Process Flow

```
1. [Database Migration] → Add new columns
2. [Data Enrichment] → Fetch Wikipedia/web data
3. [LLM Generation] → Generate structured descriptions
4. [Review Process] → Human review and approval
5. [Activation] → Replace original descriptions
6. [Cleanup] → Archive old descriptions
```

## 🚀 Quick Start Guide

### Prerequisites

```bash
# Install required dependencies
npm install openai @anthropic-ai/sdk axios

# Set environment variables
export OPENAI_API_KEY="your-openai-key"          # Optional
export ANTHROPIC_API_KEY="your-anthropic-key"    # Recommended
export DATABASE_URL="your-neon-database-url"     # Required
export PREFERRED_LLM="anthropic"                 # or "openai" or "both"
```

### Step 1: Run Database Migration

```bash
# Apply the database migration
psql $DATABASE_URL -f migrations/add-enhanced-descriptions.sql
```

### Step 2: Test with a Single Company

```bash
# Test with a specific company
COMPANY_ID_FILTER="company-uuid-here" BATCH_SIZE=1 node scripts/generate-enhanced-descriptions.js
```

### Step 3: Run Batch Generation

```bash
# Generate descriptions for all companies
BATCH_SIZE=10 DELAY_MS=2000 SAVE_TO_FILE=true node scripts/generate-enhanced-descriptions.js

# Or filter by industry
INDUSTRY_FILTER="Technology" BATCH_SIZE=5 node scripts/generate-enhanced-descriptions.js

# Or filter by revenue
MIN_REVENUE=1000000 BATCH_SIZE=10 node scripts/generate-enhanced-descriptions.js
```

## 📋 Generated Description Structure

Each description follows this exact format:

```markdown
## Quick Overview
A 2-3 sentence explanation of what the company does in simple terms.

## Business Model Canvas

### Customer Segments
Who the company serves - specific demographics, industries, or market segments.

### Value Propositions
Unique value offered to customers and problems solved.

### Channels
How the company reaches and delivers value to customers.

### Customer Relationships
Types of relationships established with different customer segments.

### Revenue Streams
How the company generates revenue - pricing models and monetization.

### Key Resources
Most important assets required for the business model.

### Key Activities
Critical activities the company must perform.

### Key Partnerships
Key partners and suppliers that help the business function.

### Cost Structure
Most important costs inherent in the business model.
```

## 🔧 Configuration Options

### Environment Variables

```bash
# LLM Configuration
PREFERRED_LLM=anthropic           # 'openai', 'anthropic', or 'both'
OPENAI_API_KEY=sk-xxx            # OpenAI API key
ANTHROPIC_API_KEY=sk-ant-xxx     # Anthropic API key

# Processing Configuration
BATCH_SIZE=10                     # Companies per batch
DELAY_MS=2000                     # Delay between API calls (rate limiting)
MAX_RETRIES=3                     # Retry attempts per company

# Filtering Options
INDUSTRY_FILTER="Technology"      # Process only specific industry
MIN_REVENUE=1000000              # Minimum revenue threshold
COMPANY_ID_FILTER=uuid           # Process single company

# Output Configuration
SAVE_TO_FILE=true                # Save descriptions to files
OUTPUT_DIR=./generated-descriptions  # Output directory
```

### Quality Control Settings

The script includes several quality measures:
- **Rate limiting**: Configurable delays between API calls
- **Retry logic**: Automatic retries for failed generations
- **Fallback APIs**: Switch between LLM providers
- **Progress tracking**: Detailed statistics and logging
- **File backup**: Optional file storage of all generated content

## 📝 Review and Approval Workflow

### Step 1: Generate Descriptions
```bash
# Generate descriptions (status: 'generated')
node scripts/generate-enhanced-descriptions.js
```

### Step 2: Review Generated Content
```sql
-- View generated descriptions awaiting review
SELECT 
    name, 
    industry, 
    LEFT(description, 100) as old_desc,
    LEFT(new_description, 100) as new_desc,
    description_source,
    description_generated_at
FROM companies 
WHERE description_status = 'generated'
ORDER BY description_generated_at DESC;
```

### Step 3: Approve Descriptions
```sql
-- Approve specific descriptions
UPDATE companies 
SET 
    description_status = 'approved',
    description_approved_at = NOW()
WHERE id IN ('company-id-1', 'company-id-2', '...');

-- Or approve all descriptions from a specific source
UPDATE companies 
SET 
    description_status = 'approved',
    description_approved_at = NOW()
WHERE description_status = 'generated' 
  AND description_source = 'claude-3-sonnet';
```

### Step 4: Activate New Descriptions
```sql
-- Replace old descriptions with approved new ones
UPDATE companies 
SET 
    description = new_description,
    description_status = 'active'
WHERE description_status = 'approved';
```

## 🔍 Monitoring and Analytics

### Progress Tracking
```sql
-- Check generation progress
SELECT 
    description_status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM companies), 2) as percentage
FROM companies 
GROUP BY description_status;
```

### Quality Metrics
```sql
-- Analyze description sources and quality
SELECT 
    description_source,
    AVG(LENGTH(new_description)) as avg_length,
    COUNT(*) as count
FROM companies 
WHERE new_description IS NOT NULL
GROUP BY description_source;
```

### Cost Tracking
```sql
-- Estimate API costs (approximate)
SELECT 
    description_source,
    COUNT(*) as descriptions,
    -- Rough cost estimates
    CASE 
        WHEN description_source LIKE 'openai%' THEN COUNT(*) * 0.08
        WHEN description_source LIKE 'claude%' THEN COUNT(*) * 0.02
    END as estimated_cost_usd
FROM companies 
WHERE new_description IS NOT NULL
GROUP BY description_source;
```

## 🛡️ Error Handling and Recovery

### Common Issues and Solutions

1. **API Rate Limits**
   ```bash
   # Increase delay between requests
   DELAY_MS=5000 node scripts/generate-enhanced-descriptions.js
   ```

2. **API Key Issues**
   ```bash
   # Verify API keys
   curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
   ```

3. **Database Connection Issues**
   ```bash
   # Test database connection
   node -e "console.log('DB URL:', process.env.DATABASE_URL?.substring(0, 30) + '...')"
   ```

4. **Resume Interrupted Process**
   ```bash
   # The script automatically skips companies with existing new_description
   # Just run again to continue where it left off
   node scripts/generate-enhanced-descriptions.js
   ```

## 📈 Rollback Strategy

If you need to rollback changes:

```sql
-- Rollback to original descriptions
UPDATE companies 
SET 
    description_status = 'original',
    new_description = NULL,
    description_generated_at = NULL,
    description_approved_at = NULL
WHERE description_status IN ('generated', 'approved', 'active');

-- Or rollback specific companies
UPDATE companies 
SET description_status = 'original'
WHERE id IN ('company-id-1', 'company-id-2');
```

## 🎯 Next Steps

1. **Test the migration**: Apply database changes in development
2. **Start small**: Test with 5-10 companies first  
3. **Review quality**: Evaluate generated descriptions
4. **Scale up**: Process in batches of 50-100 companies
5. **Monitor costs**: Track API usage and costs
6. **Implement review**: Set up approval workflow
7. **Deploy**: Replace original descriptions after approval

## 💡 Pro Tips

- **Cost Optimization**: Use Anthropic Claude for initial generation, GPT-4 for refinements
- **Quality Control**: Review a sample of descriptions before bulk processing
- **Rate Limiting**: Start with longer delays, reduce as you monitor API limits
- **Backup Strategy**: Always save generated content to files as backup
- **Progressive Rollout**: Process by industry or company size for manageable batches
- **Wikipedia Enhancement**: The script automatically fetches Wikipedia data for context

## 📞 Support

If you encounter issues:
1. Check the console logs for detailed error messages
2. Verify API keys and database connections
3. Review the generated file outputs in the `generated-descriptions` folder
4. Check the database status using the SQL queries above

This implementation provides a robust, scalable solution for rewriting business descriptions while maintaining data integrity and enabling quality control throughout the process.
