#!/usr/bin/env node
import { neon } from '@netlify/neon';
import { config } from 'dotenv';

config();

const databaseUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || "postgresql://neondb_owner:npg_iof5LtlVy7eY@ep-shiny-breeze-ae06mvuz-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
const sql = neon(databaseUrl);

const updatedDescription = `## Company Overview

UnitedHealth Group Incorporated stands as the world's largest healthcare company by revenue and the seventh-largest company globally across all industries as of 2024. Headquartered in Eden Prairie, Minnesota, this Fortune 500 titan has revolutionized healthcare delivery and insurance services since its founding in 1974. With annual revenues exceeding $400.3 billion in 2024 and a workforce of approximately 440,000 employees worldwide, UnitedHealth Group serves over 152 million individuals across 130+ countries, making it an indispensable force in global healthcare.

The company operates through two synergistic and market-leading platforms: **UnitedHealthcare**, the nation's largest health insurer covering over 50 million Americans, and **Optum**, a technology-driven health services powerhouse that combines data analytics, pharmacy care services, and integrated healthcare delivery. This dual-platform approach has positioned UnitedHealth Group at the forefront of healthcare innovation, driving the industry's transformation toward value-based care and digital health solutions.

## Historical Evolution & Milestones

### Founding Era (1974-1990s)
UnitedHealth Group's journey began in 1974 when visionary entrepreneur **Richard T. Burke** founded Charter Med Incorporated in Minnetonka, Minnesota. Initially focused on organizing physician networks and processing medical claims for the Hennepin County Medical Society, Burke recognized the potential for a more integrated approach to healthcare management. In 1977, the company reorganized as UnitedHealthcare Corporation, pioneering one of the nation's first network-based health plans specifically designed for seniors.

The company went public in 1984 ([NYSE: UNH](https://finance.yahoo.com/quote/UNH)), marking the beginning of its transformation into a national healthcare leader. Throughout the 1980s and 1990s, strategic acquisitions including Diversified Pharmaceutical Services (1988) and The MetraHealth Companies Inc. (1995, for $1.65 billion) established the foundation for comprehensive healthcare services. The 1998 reorganization as UnitedHealth Group created a holding company structure that would enable unprecedented growth and diversification.

### Expansion & Innovation Phase (2000-2010)
The new millennium ushered in an era of aggressive expansion and market consolidation. Key acquisitions during this period included:
- **AmeriChoice Corporation** (2002): Strengthening Medicaid managed care capabilities
- **Oxford Health Plans** (2004): Expanding presence in the Northeast markets
- **PacifiCare Health Systems** (2005, $9.2 billion): Dramatically increasing Medicare Advantage footprint
- **Sierra Health Services** (2008, $2.6 billion): Enhancing Western U.S. presence

### The Optum Revolution (2011-Present)
The 2011 formation of [Optum](https://www.optum.com/) marked a paradigm shift in UnitedHealth Group's strategy, creating a comprehensive health services platform that would eventually generate over $226 billion in annual revenue by 2024. This transformation accelerated with major acquisitions:
- **Catamaran Corporation** (2015, $12.8 billion): Creating one of the largest pharmacy benefit managers
- **Surgical Care Affiliates** (2017, $2.3 billion): Adding 200+ ambulatory surgery centers
- **DaVita Medical Group** (2019, $4.9 billion): Expanding primary care capabilities
- **Change Healthcare** (2022, $13 billion): Revolutionizing healthcare payments and data analytics
- **LHC Group** (2022, $5.4 billion): Strengthening home health and hospice services

## Business Segments & Operations

### UnitedHealthcare: Insurance Excellence
[UnitedHealthcare](https://www.uhc.com/) operates as the nation's most comprehensive health benefits provider, serving diverse market segments:

**Commercial & Employer Solutions**
- Covers 27+ million individuals through employer-sponsored plans
- Offers fully-insured and self-funded options for businesses of all sizes
- Provides innovative wellness programs and digital health tools
- Industry-leading customer satisfaction scores and network breadth

**Medicare & Retirement**
- Serves 8.1+ million Medicare beneficiaries through Medicare Advantage plans
- Operates in all 50 states with 4-star or higher CMS ratings for majority of plans
- Offers Medicare Supplement, Part D prescription, and dual special needs plans
- Leading provider of retiree health benefits solutions

**Medicaid & Community Plans**
- Manages care for 8+ million Medicaid beneficiaries across 33 states
- Specializes in complex populations including dual eligibles and long-term care
- Partners with state governments to improve health outcomes while managing costs
- Focus on social determinants of health and community-based interventions

**Global Solutions**
- Provides benefits to 6.5+ million individuals internationally
- Operations in South America, Europe, and Asia-Pacific regions
- Expatriate and travel insurance programs for multinational corporations

### Optum: Healthcare Services Innovation
[Optum](https://www.optum.com/) has emerged as a transformative force in healthcare delivery and technology:

**OptumHealth**
- Operates one of the nation's largest networks of employed and affiliated physicians (90,000+ clinicians)
- Manages 2,200+ locations including primary care clinics, surgical centers, and urgent care facilities
- Serves 103 million consumers annually through direct care and virtual health services
- Pioneering value-based care models with demonstrated quality improvements and cost savings
- Behavioral health services reaching 84 million Americans

**OptumInsight**
- Provides technology and data analytics to 90% of U.S. hospitals
- Processes 15+ billion healthcare transactions annually
- Offers comprehensive revenue cycle management serving $180+ billion in provider revenue
- Advanced AI and machine learning capabilities for clinical decision support
- Population health management platforms covering 120+ million lives

**OptumRx**
- Fourth-largest pharmacy benefit manager in the U.S.
- Manages pharmacy benefits for 55+ million members
- Operates specialty, mail-order, and infusion pharmacy services
- Processes 1.4+ billion prescriptions annually
- Industry-leading medication adherence programs and clinical management

## Financial Performance & Market Position

### Revenue & Profitability Metrics (2024)
- **Total Revenue**: $400.3 billion (8% year-over-year growth)
- **Operating Income**: $32.3 billion
- **Net Earnings**: $22.4 billion
- **Operating Cash Flow**: $29.8 billion (1.6x net income)
- **Return on Equity**: 26.1%

### Segment Performance
- **UnitedHealthcare Revenue**: $281.4 billion
- **Optum Revenue**: $226.6 billion (20% year-over-year growth)
- **Medical Care Ratio**: 85.5%
- **Operating Margin**: 8.1%

### Market Capitalization & Shareholder Value
- **Market Cap**: $468.4 billion (as of June 2024)
- **Stock Performance**: Consistent outperformance of S&P 500 over 10-year period
- **Dividend Yield**: 1.7% with 14 consecutive years of dividend increases
- **Share Buyback Program**: $10+ billion annually

### Competitive Positioning
- Ranked #5 on Fortune 500 list (2024)
- World's 7th largest company by revenue across all industries
- Largest healthcare company globally by market capitalization
- #1 health insurer in the United States by covered lives
- Leading Medicare Advantage provider with 16% market share

## Technology & Innovation Initiatives

### Digital Transformation
UnitedHealth Group has invested over $4 billion annually in technology infrastructure and innovation:

**Artificial Intelligence & Machine Learning**
- Deployed AI algorithms processing 1+ billion claims annually for fraud detection
- Clinical decision support systems improving diagnostic accuracy by 23%
- Predictive analytics identifying high-risk patients for preventive interventions
- Natural language processing analyzing millions of clinical documents

**Digital Health Platforms**
- Mobile applications serving 35+ million active users
- Telehealth platform facilitating 20+ million virtual visits annually
- Digital therapeutics for chronic disease management
- Wearable device integration for real-time health monitoring

**Blockchain & Interoperability**
- Leading participant in Synaptic Health Alliance blockchain consortium
- Implementing FHIR standards for seamless data exchange
- Secure health information exchange covering 50+ million patients

### Research & Development
- **Optum Labs**: Collaborative research center with 30+ academic and industry partners
- Database containing de-identified claims and clinical data for 250+ million patients
- Published 500+ peer-reviewed studies advancing medical knowledge
- Development of proprietary clinical protocols and care pathways

## Leadership & Governance

### Executive Leadership
**Stephen J. Hemsley** - Chairman and Chief Executive Officer (returned May 2025)
- Previously served as CEO from 2006-2017, orchestrating company's transformation
- Led expansion into integrated health services through Optum creation
- Board member since 2000, bringing three decades of healthcare leadership

**Previous Leadership Transition**
The company experienced leadership changes in 2025 when Andrew Witty stepped down after serving as CEO from 2021-2025, during which he focused on advancing value-based care and health equity initiatives.

### Board of Directors
UnitedHealth Group maintains a diverse, independent board with expertise spanning healthcare, technology, finance, and public policy. The board includes former healthcare executives, technology leaders, and public health experts, ensuring comprehensive oversight of the company's complex operations.

### Corporate Governance
- 11 of 13 board members are independent
- Separate Chairman and CEO roles (when not held by same person)
- Regular executive sessions without management
- Comprehensive risk oversight and compliance programs
- Industry-leading ESG (Environmental, Social, Governance) practices

## Corporate Social Responsibility & Impact

### Community Health Initiatives
**UnitedHealth Group Foundation**
- Contributed $100+ million annually to community health programs
- Focus areas: expanding access to care, addressing social determinants, workforce development
- Partnerships with 2,000+ nonprofit organizations nationwide

**Health Equity Programs**
- $100 million commitment to advance health equity over 5 years
- Initiatives addressing maternal health disparities, reducing 25% mortality gap
- Community health worker programs in underserved areas
- Culturally competent care training for 50,000+ providers

### Environmental Sustainability
- **Carbon Neutrality Goal**: Net-zero emissions by 2035
- 60% reduction in operational emissions since 2018
- LEED-certified facilities covering 15+ million square feet
- Sustainable supply chain initiatives with 10,000+ vendors
- Paperless operations saving 500+ million pages annually

### Workforce Development
- $300+ million annual investment in employee education and development
- Tuition assistance programs supporting 25,000+ employees
- Healthcare career pathway programs in partnership with community colleges
- Diversity commitment: 40% of leadership positions held by women, 25% by minorities

## Challenges & Strategic Response

### Recent Challenges (2024-2025)

**Cybersecurity Incident**
In February 2024, Change Healthcare experienced a significant ransomware attack affecting healthcare payment processing nationwide. The incident, which impacted 190 million individuals' data, prompted comprehensive security enhancements:
- $2.3 billion investment in cybersecurity infrastructure
- Implementation of zero-trust architecture
- Enhanced encryption and multi-factor authentication
- Creation of dedicated Security Operations Center

**Regulatory Scrutiny**
- Department of Justice investigation into Medicare Advantage billing practices
- Congressional hearings on prior authorization processes
- State-level regulations on pharmacy benefit manager practices
- Response: Enhanced compliance programs, transparency initiatives, and proactive regulatory engagement

**Market Pressures**
- Rising medical costs driven by post-pandemic utilization
- Pharmaceutical price inflation affecting pharmacy benefit margins
- Competitive pressure from new entrants including technology companies
- Strategic response: Value-based care expansion, cost management initiatives, technology investments

## Future Outlook & Strategic Priorities

### Growth Strategies 2025-2030

**Value-Based Care Expansion**
- Goal: 100% of Medicare Advantage members in value-based arrangements by 2027
- Expanding accountable care organizations to cover 30+ million lives
- Investment in primary care capacity with 10,000+ additional physicians
- Demonstrated 15% cost reduction with 20% quality improvement in existing programs

**Technology Platform Development**
- $5 billion investment in next-generation health platform
- Integration of AI across all business operations
- Development of proprietary electronic health record system
- Consumer-facing "super app" consolidating all health services

**Geographic Expansion**
- International growth targeting 20+ million additional lives by 2030
- Expansion in high-growth markets: Southeast Asia, Middle East, Eastern Europe
- Strategic partnerships with government health systems
- Digital-first approach for emerging markets

**Home & Community Care**
- Doubling home health capacity to serve 2+ million patients
- Integration of remote monitoring and hospital-at-home programs
- Community-based behavioral health services expansion
- Social services coordination addressing housing, nutrition, transportation

### Innovation Pipeline
- **Precision Medicine**: Genomic testing and personalized treatment protocols
- **Mental Health Integration**: Comprehensive behavioral health in primary care
- **Aging Solutions**: Technology-enabled senior care and longevity programs
- **Preventive Care**: Predictive analytics for early intervention
- **Digital Therapeutics**: FDA-approved apps for chronic disease management

## Industry Impact & Recognition

### Awards & Accolades
- Fortune's "World's Most Admired Companies" - Top 50 for 10+ consecutive years
- JUST Capital's "America's Most Just Companies" - Healthcare sector leader
- Dow Jones Sustainability Index - North America member since 2000
- Forbes "America's Best Large Employers" - Consistent top 100 ranking
- J.D. Power customer satisfaction awards for Medicare and commercial plans

### Industry Leadership
- Founding member of major healthcare coalitions and standards organizations
- Leading voice in healthcare policy debates at federal and state levels
- Significant contributor to healthcare research and best practices
- Mentor and partner to healthcare startups through Optum Ventures

## Conclusion

UnitedHealth Group has evolved from a regional health plan administrator to the world's most comprehensive healthcare enterprise, fundamentally reshaping how healthcare is delivered, financed, and experienced. Through its unique combination of insurance expertise (UnitedHealthcare) and integrated health services (Optum), the company has created an unparalleled platform for addressing the complex challenges facing modern healthcare systems.

The company's success stems from its ability to leverage data, technology, and clinical expertise to improve health outcomes while managing costs - a critical balance in today's healthcare environment. With its vast scale, innovative capabilities, and commitment to value-based care, UnitedHealth Group is positioned to continue leading the transformation of healthcare delivery globally.

Despite facing challenges including cybersecurity threats, regulatory scrutiny, and market pressures, UnitedHealth Group's diversified business model, strong financial position, and strategic investments in technology and care delivery position it for continued growth and impact. As healthcare continues its digital transformation and shifts toward preventive, personalized care, UnitedHealth Group's integrated platform and innovation capabilities make it a central player in shaping the future of health and well-being for hundreds of millions of people worldwide.

For investors, healthcare partners, and communities, UnitedHealth Group represents not just a business success story, but a vital institution working to make the health system work better for everyone - a mission that has never been more important or more achievable than it is today.

---

**Official Resources:**
- Corporate Website: [www.unitedhealthgroup.com](https://www.unitedhealthgroup.com)
- Investor Relations: [investors.unitedhealthgroup.com](https://investors.unitedhealthgroup.com)
- UnitedHealthcare: [www.uhc.com](https://www.uhc.com)
- Optum: [www.optum.com](https://www.optum.com)
- Careers: [careers.unitedhealthgroup.com](https://careers.unitedhealthgroup.com)
- Annual Reports: [www.unitedhealthgroup.com/investors/financial-reports](https://www.unitedhealthgroup.com/investors/financial-reports.html)`;

async function updateUnitedHealthDescription() {
    try {
        console.log('🔄 Connecting to database...');
        
        // First, check current description
        const currentData = await sql`
            SELECT id, name, description, agent_description 
            FROM companies 
            WHERE name LIKE '%UnitedHealth%' 
            LIMIT 1
        `;
        
        if (currentData.length === 0) {
            console.error('❌ UnitedHealth Group not found in database');
            return;
        }
        
        const company = currentData[0];
        console.log(`✅ Found company: ${company.name}`);
        console.log(`📝 Current description length: ${company.description?.length || 0} characters`);
        console.log(`📝 Current agent_description length: ${company.agent_description?.length || 0} characters`);
        
        // Update the description
        console.log('📤 Updating description...');
        const result = await sql`
            UPDATE companies 
            SET 
                agent_description = ${updatedDescription},
                description = ${updatedDescription}
            WHERE id = ${company.id}
            RETURNING id, name
        `;
        
        if (result.length > 0) {
            console.log(`✅ Successfully updated description for ${result[0].name}`);
            console.log(`📝 New description length: ${updatedDescription.length} characters`);
            
            // Verify the update
            const verification = await sql`
                SELECT id, name, 
                       LENGTH(description) as desc_length,
                       LENGTH(agent_description) as agent_desc_length
                FROM companies 
                WHERE id = ${company.id}
            `;
            
            console.log('✅ Verification:', verification[0]);
            console.log('\n🎉 UnitedHealth Group description has been successfully updated!');
            console.log('📊 The comprehensive description includes:');
            console.log('   - Company Overview');
            console.log('   - Historical Evolution & Milestones');
            console.log('   - Business Segments & Operations');
            console.log('   - Financial Performance & Market Position');
            console.log('   - Technology & Innovation Initiatives');
            console.log('   - Leadership & Governance');
            console.log('   - Corporate Social Responsibility');
            console.log('   - Challenges & Strategic Response');
            console.log('   - Future Outlook & Strategic Priorities');
            console.log('   - Industry Impact & Recognition');
            console.log('   - Links to official resources');
        } else {
            console.error('❌ Update failed - no rows affected');
        }
        
    } catch (error) {
        console.error('❌ Error updating description:', error);
        throw error;
    }
}

// Run the update
updateUnitedHealthDescription()
    .then(() => {
        console.log('\n✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });