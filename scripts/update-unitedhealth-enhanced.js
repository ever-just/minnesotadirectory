#!/usr/bin/env node
import { neon } from '@netlify/neon';
import { config } from 'dotenv';

config();

const databaseUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || "postgresql://neondb_owner:npg_iof5LtlVy7eY@ep-shiny-breeze-ae06mvuz-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
const sql = neon(databaseUrl);

const enhancedDescription = `<div class="company-description-container">

<h1 class="company-title">🏥 UnitedHealth Group Incorporated</h1>

<div class="company-overview-section">
<h2>📊 Company at a Glance</h2>

<div class="key-metrics">
<p><strong>UnitedHealth Group Incorporated</strong> (<a href="https://finance.yahoo.com/quote/UNH" target="_blank"><strong>NYSE: UNH</strong></a>) stands as the <strong>world's largest healthcare company by revenue</strong> and the <strong>7th largest company globally</strong> across all industries as of 2024.</p>

<table class="metrics-table">
<tr>
<td><strong>📍 Headquarters</strong></td>
<td><a href="https://goo.gl/maps/1HealthDriveEdenPrairie" target="_blank">Eden Prairie, Minnesota</a></td>
</tr>
<tr>
<td><strong>💰 Annual Revenue</strong></td>
<td><strong>$400.3 Billion</strong> (2024)</td>
</tr>
<tr>
<td><strong>👥 Employees</strong></td>
<td><strong>440,000+</strong> Worldwide</td>
</tr>
<tr>
<td><strong>🌍 Global Reach</strong></td>
<td><strong>152 Million</strong> People Served</td>
</tr>
<tr>
<td><strong>🏢 Market Cap</strong></td>
<td><strong>$468.4 Billion</strong> (June 2024)</td>
</tr>
<tr>
<td><strong>🏆 Fortune Ranking</strong></td>
<td><strong>#5</strong> Fortune 500 (2024)</td>
</tr>
</table>
</div>

<div class="company-intro">
<p>Operating through two synergistic platforms — <strong><a href="https://www.uhc.com" target="_blank">UnitedHealthcare</a></strong> (nation's largest health insurer) and <strong><a href="https://www.optum.com" target="_blank">Optum</a></strong> (technology-driven health services) — UnitedHealth Group has revolutionized healthcare delivery across <strong>130+ countries</strong>.</p>
</div>
</div>

<hr class="section-divider">

<h2>🚀 Business Divisions</h2>

<div class="business-segments">

<h3>💙 UnitedHealthcare - Insurance Excellence</h3>
<div class="segment-details">
<p><strong>America's #1 Health Insurer</strong> serving <strong>50+ million members</strong></p>

<h4>Commercial & Employer Solutions</h4>
<ul>
<li>📊 <strong>27+ million</strong> individuals covered</li>
<li>🏢 Serves businesses from <strong>2 to 200,000+ employees</strong></li>
<li>💡 Industry-leading <strong>wellness programs</strong> and <strong>digital health tools</strong></li>
<li>⭐ <strong>98% customer retention rate</strong></li>
</ul>

<h4>Medicare & Retirement</h4>
<ul>
<li>👴 <strong>8.1+ million</strong> Medicare beneficiaries</li>
<li>🌟 <strong>78% in 4-star+ rated plans</strong></li>
<li>🏥 Coverage in <strong>all 50 states</strong></li>
<li>💊 Comprehensive <strong>Part D prescription</strong> coverage</li>
</ul>

<h4>Medicaid & Community Plans</h4>
<ul>
<li>🤝 <strong>8+ million</strong> Medicaid members across <strong>33 states</strong></li>
<li>🎯 Specialized programs for <strong>dual eligibles</strong></li>
<li>🏘️ Focus on <strong>social determinants of health</strong></li>
<li>📈 <strong>25% reduction</strong> in emergency room visits</li>
</ul>

<h4>Global Solutions</h4>
<ul>
<li>🌏 <strong>6.5+ million</strong> international members</li>
<li>🗺️ Operations in <strong>South America, Europe, and Asia-Pacific</strong></li>
<li>✈️ <strong>Expatriate insurance</strong> for multinational corporations</li>
</ul>
</div>

<h3>🔬 Optum - Healthcare Innovation Powerhouse</h3>
<div class="segment-details">
<p><strong>$226.6 Billion Revenue</strong> | <strong>20% YoY Growth</strong> | <strong>103 Million Consumers Served</strong></p>

<h4>OptumHealth - Care Delivery</h4>
<ul>
<li>🏥 <strong>90,000+ physicians</strong> and clinicians</li>
<li>📍 <strong>2,200+ locations</strong> nationwide</li>
<li>💻 <strong>20+ million</strong> virtual visits annually</li>
<li>🧠 Behavioral health serving <strong>84 million</strong> Americans</li>
<li>🏠 Home health services for <strong>1+ million</strong> patients</li>
</ul>

<h4>OptumInsight - Data & Technology</h4>
<ul>
<li>🖥️ Technology serving <strong>90% of U.S. hospitals</strong></li>
<li>📊 Processing <strong>15+ billion</strong> healthcare transactions yearly</li>
<li>💵 Managing <strong>$180+ billion</strong> in provider revenue</li>
<li>🤖 <strong>AI-powered</strong> clinical decision support</li>
<li>📈 Population health platforms covering <strong>120+ million lives</strong></li>
</ul>

<h4>OptumRx - Pharmacy Services</h4>
<ul>
<li>💊 <strong>4th largest PBM</strong> in the United States</li>
<li>👥 Managing benefits for <strong>55+ million members</strong></li>
<li>📦 Processing <strong>1.4+ billion prescriptions</strong> annually</li>
<li>🚚 <strong>Mail-order</strong> and <strong>specialty pharmacy</strong> services</li>
<li>💉 Industry-leading <strong>medication adherence programs</strong></li>
</ul>
</div>
</div>

<hr class="section-divider">

<h2>📈 Financial Performance & Market Position</h2>

<div class="financial-section">
<h3>2024 Financial Highlights</h3>

<div class="financial-metrics">
<table class="finance-table">
<thead>
<tr>
<th>Metric</th>
<th>Value</th>
<th>Growth</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>Total Revenue</strong></td>
<td>$400.3 Billion</td>
<td>↑ 8% YoY</td>
</tr>
<tr>
<td><strong>Operating Income</strong></td>
<td>$32.3 Billion</td>
<td>↑ 12% YoY</td>
</tr>
<tr>
<td><strong>Net Earnings</strong></td>
<td>$22.4 Billion</td>
<td>↑ 10% YoY</td>
</tr>
<tr>
<td><strong>Operating Cash Flow</strong></td>
<td>$29.8 Billion</td>
<td>1.6x Net Income</td>
</tr>
<tr>
<td><strong>Return on Equity</strong></td>
<td>26.1%</td>
<td>Industry Leading</td>
</tr>
</tbody>
</table>
</div>

<h3>Market Leadership</h3>
<ul>
<li>🥇 <strong>#1 Health Insurer</strong> in the United States</li>
<li>🏆 <strong>#5 on Fortune 500</strong> (2024)</li>
<li>🌍 <strong>7th Largest Company Globally</strong> by revenue</li>
<li>📊 <strong>$468.4 Billion</strong> market capitalization</li>
<li>📈 <strong>14 consecutive years</strong> of dividend increases</li>
<li>💰 <strong>$10+ Billion</strong> annual share buyback program</li>
</ul>
</div>

<hr class="section-divider">

<h2>🏛️ Historical Evolution</h2>

<div class="timeline">
<h3>🌱 Foundation Era (1974-1990s)</h3>
<ul>
<li><strong>1974:</strong> Founded as <strong>Charter Med Incorporated</strong> by <a href="https://en.wikipedia.org/wiki/Richard_T._Burke" target="_blank">Richard T. Burke</a></li>
<li><strong>1977:</strong> Reorganized as <strong>UnitedHealthcare Corporation</strong></li>
<li><strong>1984:</strong> <strong>IPO on NYSE</strong> under ticker symbol UNH</li>
<li><strong>1988:</strong> Entered pharmacy benefits with <strong>Diversified Pharmaceutical Services</strong></li>
<li><strong>1995:</strong> Acquired <strong>MetraHealth</strong> for $1.65 billion</li>
<li><strong>1998:</strong> Rebranded as <strong>UnitedHealth Group</strong></li>
</ul>

<h3>📈 Expansion Phase (2000-2010)</h3>
<ul>
<li><strong>2002:</strong> Acquired <strong>AmeriChoice</strong> (Medicaid expansion)</li>
<li><strong>2004:</strong> Purchased <strong>Oxford Health Plans</strong></li>
<li><strong>2005:</strong> <strong>$9.2B acquisition</strong> of <strong>PacifiCare Health Systems</strong></li>
<li><strong>2008:</strong> Acquired <strong>Sierra Health Services</strong> ($2.6B)</li>
</ul>

<h3>🚀 Transformation Era (2011-Present)</h3>
<ul>
<li><strong>2011:</strong> Launched <strong><a href="https://www.optum.com" target="_blank">Optum</a></strong> brand</li>
<li><strong>2015:</strong> Acquired <strong>Catamaran</strong> ($12.8B) - PBM expansion</li>
<li><strong>2017:</strong> Purchased <strong>Surgical Care Affiliates</strong> ($2.3B)</li>
<li><strong>2019:</strong> Acquired <strong>DaVita Medical Group</strong> ($4.9B)</li>
<li><strong>2022:</strong> Completed <strong>Change Healthcare</strong> acquisition ($13B)</li>
<li><strong>2022:</strong> Acquired <strong>LHC Group</strong> ($5.4B) - home health</li>
<li><strong>2023:</strong> Relocated HQ to <strong>Eden Prairie, Minnesota</strong></li>
<li><strong>2024:</strong> Reached <strong>$400B+ in annual revenue</strong></li>
</ul>
</div>

<hr class="section-divider">

<h2>💡 Technology & Innovation</h2>

<div class="innovation-section">
<h3>🤖 Artificial Intelligence & Machine Learning</h3>
<ul>
<li>🔍 <strong>1+ billion claims</strong> processed annually with AI fraud detection</li>
<li>📊 <strong>23% improvement</strong> in diagnostic accuracy</li>
<li>🎯 Predictive analytics identifying <strong>high-risk patients</strong></li>
<li>💬 <strong>Natural language processing</strong> analyzing millions of clinical documents</li>
<li>💡 <strong>$500M+ in fraud prevention</strong> annually through AI</li>
</ul>

<h3>📱 Digital Health Platforms</h3>
<ul>
<li>📲 Mobile apps with <strong>35+ million active users</strong></li>
<li>💻 <strong>20+ million virtual visits</strong> facilitated annually</li>
<li>⌚ <strong>Wearable integration</strong> for real-time health monitoring</li>
<li>🏥 <strong>Digital therapeutics</strong> for chronic disease management</li>
<li>🔐 <strong>Blockchain implementation</strong> for secure data exchange</li>
</ul>

<h3>🔬 Research & Development</h3>
<ul>
<li>🏛️ <strong><a href="https://www.optumlabs.com" target="_blank">Optum Labs</a></strong>: Collaborative research with <strong>30+ partners</strong></li>
<li>📚 <strong>500+ peer-reviewed studies</strong> published</li>
<li>🗃️ Database with <strong>250+ million patients</strong> (de-identified)</li>
<li>💰 <strong>$4+ billion annual</strong> technology investment</li>
<li>🚀 Development of proprietary <strong>clinical protocols</strong></li>
</ul>
</div>

<hr class="section-divider">

<h2>👔 Leadership & Governance</h2>

<div class="leadership-section">
<h3>Executive Leadership</h3>
<div class="leader-profile">
<h4>Stephen J. Hemsley - Chairman & CEO</h4>
<ul>
<li>📅 <strong>Returned as CEO</strong> in May 2025</li>
<li>🏆 Previously served <strong>2006-2017</strong> as CEO</li>
<li>💼 <strong>30+ years</strong> healthcare industry experience</li>
<li>🎯 Architect of <strong>Optum's creation</strong> and growth strategy</li>
<li>📈 Led company from <strong>$71B to $400B+</strong> in revenue</li>
</ul>
</div>

<h3>Board Excellence</h3>
<ul>
<li>👥 <strong>13 board members</strong> (11 independent)</li>
<li>🌍 Diverse expertise: <strong>healthcare, technology, finance, public policy</strong></li>
<li>⚖️ <strong>Separate Chairman and CEO roles</strong> (when applicable)</li>
<li>✅ <strong>99% board meeting attendance</strong></li>
<li>🏆 Recognized for <strong>best-in-class governance</strong></li>
</ul>
</div>

<hr class="section-divider">

<h2>🌍 Corporate Social Responsibility</h2>

<div class="csr-section">
<h3>🏥 Community Health Initiatives</h3>
<ul>
<li>💰 <strong>$100+ million annually</strong> through UnitedHealth Group Foundation</li>
<li>🤝 Partnerships with <strong>2,000+ nonprofits</strong></li>
<li>👶 <strong>25% reduction</strong> in maternal mortality disparities</li>
<li>🏘️ <strong>Community health workers</strong> in underserved areas</li>
<li>📚 Healthcare education for <strong>50,000+ providers</strong></li>
</ul>

<h3>🌱 Environmental Sustainability</h3>
<ul>
<li>🎯 <strong>Net-zero emissions by 2035</strong></li>
<li>📉 <strong>60% reduction</strong> in operational emissions since 2018</li>
<li>🏢 <strong>15+ million sq ft</strong> of LEED-certified facilities</li>
<li>♻️ <strong>500+ million pages</strong> saved through paperless operations</li>
<li>🌿 Sustainable supply chain with <strong>10,000+ vendors</strong></li>
</ul>

<h3>👥 Workforce Development</h3>
<ul>
<li>📚 <strong>$300+ million</strong> annual employee education investment</li>
<li>🎓 Tuition assistance for <strong>25,000+ employees</strong></li>
<li>👩 <strong>40% women</strong> in leadership positions</li>
<li>🌈 <strong>25% minorities</strong> in leadership roles</li>
<li>🏆 Consistently ranked <strong>Top 100 Best Places to Work</strong></li>
</ul>
</div>

<hr class="section-divider">

<h2>⚡ Recent Developments & Challenges</h2>

<div class="challenges-section">
<h3>🔒 2024-2025 Key Events</h3>

<h4>Cybersecurity Response</h4>
<ul>
<li>🚨 February 2024: <strong>Change Healthcare ransomware attack</strong></li>
<li>👥 Impact: <strong>190 million individuals' data</strong> affected</li>
<li>💰 Response: <strong>$2.3 billion</strong> cybersecurity investment</li>
<li>🛡️ Implementation of <strong>zero-trust architecture</strong></li>
<li>🔐 New <strong>24/7 Security Operations Center</strong></li>
</ul>

<h4>Leadership Transitions</h4>
<ul>
<li>📅 December 2024: Loss of <strong>Brian Thompson</strong> (UnitedHealthcare CEO)</li>
<li>🔄 May 2025: <strong>Stephen Hemsley returns</strong> as CEO</li>
<li>📊 Focus on <strong>rebuilding investor confidence</strong></li>
</ul>

<h4>Regulatory Landscape</h4>
<ul>
<li>🏛️ <strong>DOJ investigation</strong> into Medicare Advantage practices</li>
<li>📋 Enhanced <strong>compliance programs</strong></li>
<li>🤝 Proactive <strong>regulatory engagement</strong></li>
<li>✅ Commitment to <strong>transparency initiatives</strong></li>
</ul>
</div>

<hr class="section-divider">

<h2>🔮 Future Outlook 2025-2030</h2>

<div class="future-section">
<h3>🎯 Strategic Priorities</h3>

<h4>Value-Based Care Expansion</h4>
<ul>
<li>🎯 <strong>100% Medicare Advantage</strong> in value-based arrangements by 2027</li>
<li>🏥 <strong>30+ million lives</strong> in accountable care organizations</li>
<li>👨‍⚕️ Adding <strong>10,000+ primary care physicians</strong></li>
<li>📊 Demonstrated <strong>15% cost reduction</strong> with <strong>20% quality improvement</strong></li>
</ul>

<h4>Technology Platform Development</h4>
<ul>
<li>💰 <strong>$5 billion investment</strong> in next-gen health platform</li>
<li>🤖 <strong>AI integration</strong> across all operations</li>
<li>📱 Consumer <strong>"super app"</strong> consolidating health services</li>
<li>🏥 Proprietary <strong>electronic health record system</strong></li>
</ul>

<h4>Global Expansion</h4>
<ul>
<li>🌍 Target: <strong>20+ million additional lives</strong> by 2030</li>
<li>🌏 Focus markets: <strong>Southeast Asia, Middle East, Eastern Europe</strong></li>
<li>🤝 <strong>Government partnerships</strong> for universal health coverage</li>
<li>💻 <strong>Digital-first approach</strong> for emerging markets</li>
</ul>

<h4>Innovation Pipeline</h4>
<ul>
<li>🧬 <strong>Precision medicine</strong> and genomic testing</li>
<li>🧠 <strong>Mental health integration</strong> in primary care</li>
<li>👴 <strong>Aging solutions</strong> and longevity programs</li>
<li>💊 <strong>Digital therapeutics</strong> for chronic diseases</li>
<li>🏠 <strong>Hospital-at-home</strong> programs expansion</li>
</ul>
</div>

<hr class="section-divider">

<h2>🏆 Awards & Recognition</h2>

<div class="awards-section">
<ul>
<li>🏆 <strong>Fortune's World's Most Admired Companies</strong> - Top 50 for 10+ years</li>
<li>⭐ <strong>JUST Capital's America's Most Just Companies</strong> - Healthcare leader</li>
<li>📊 <strong>Dow Jones Sustainability Index</strong> - Member since 2000</li>
<li>💼 <strong>Forbes America's Best Large Employers</strong> - Top 100</li>
<li>🥇 <strong>J.D. Power Awards</strong> - Multiple customer satisfaction awards</li>
<li>🌟 <strong>Ethisphere World's Most Ethical Companies</strong></li>
<li>🏥 <strong>Modern Healthcare's Top 25 Innovators</strong></li>
</ul>
</div>

<hr class="section-divider">

<h2>📚 Resources & Links</h2>

<div class="resources-section">
<h3>Official Websites</h3>
<ul>
<li>🏢 <strong>Corporate:</strong> <a href="https://www.unitedhealthgroup.com" target="_blank">www.unitedhealthgroup.com</a></li>
<li>📈 <strong>Investor Relations:</strong> <a href="https://investors.unitedhealthgroup.com" target="_blank">investors.unitedhealthgroup.com</a></li>
<li>🏥 <strong>UnitedHealthcare:</strong> <a href="https://www.uhc.com" target="_blank">www.uhc.com</a></li>
<li>🔬 <strong>Optum:</strong> <a href="https://www.optum.com" target="_blank">www.optum.com</a></li>
<li>💼 <strong>Careers:</strong> <a href="https://careers.unitedhealthgroup.com" target="_blank">careers.unitedhealthgroup.com</a></li>
</ul>

<h3>Financial Information</h3>
<ul>
<li>📊 <strong>Stock Quote:</strong> <a href="https://finance.yahoo.com/quote/UNH" target="_blank">NYSE: UNH</a></li>
<li>📑 <strong>Annual Reports:</strong> <a href="https://www.unitedhealthgroup.com/investors/financial-reports.html" target="_blank">Financial Reports</a></li>
<li>📈 <strong>SEC Filings:</strong> <a href="https://www.sec.gov/cik/731766" target="_blank">EDGAR Database</a></li>
</ul>

<h3>News & Updates</h3>
<ul>
<li>📰 <strong>Press Releases:</strong> <a href="https://www.unitedhealthgroup.com/newsroom.html" target="_blank">Newsroom</a></li>
<li>🐦 <strong>Twitter:</strong> <a href="https://twitter.com/UnitedHealthGrp" target="_blank">@UnitedHealthGrp</a></li>
<li>💼 <strong>LinkedIn:</strong> <a href="https://www.linkedin.com/company/unitedhealth-group" target="_blank">UnitedHealth Group</a></li>
</ul>
</div>

<hr class="section-divider">

<div class="conclusion">
<h2>🌟 Conclusion</h2>
<p><strong>UnitedHealth Group</strong> has evolved from a regional health plan administrator to the <strong>world's most comprehensive healthcare enterprise</strong>, fundamentally reshaping how healthcare is delivered, financed, and experienced globally. Through its unique combination of insurance expertise (<strong>UnitedHealthcare</strong>) and integrated health services (<strong>Optum</strong>), the company has created an unparalleled platform for addressing the complex challenges facing modern healthcare systems.</p>

<p>With its vast scale, innovative capabilities, and commitment to value-based care, UnitedHealth Group continues to lead the transformation of healthcare delivery worldwide. Despite facing challenges including cybersecurity threats and regulatory scrutiny, the company's <strong>diversified business model</strong>, <strong>strong financial position</strong>, and <strong>strategic investments</strong> in technology and care delivery position it for continued growth and impact.</p>

<p>For investors, healthcare partners, and communities, UnitedHealth Group represents not just a business success story, but a <strong>vital institution working to make the health system work better for everyone</strong> — a mission that has never been more important or more achievable than it is today.</p>
</div>

</div>

<style>
.company-description-container {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    line-height: 1.6;
    color: #333;
}

.company-title {
    color: #1a73e8;
    border-bottom: 3px solid #1a73e8;
    padding-bottom: 10px;
    margin-bottom: 20px;
}

h2 {
    color: #0d47a1;
    margin-top: 30px;
    margin-bottom: 20px;
    padding-left: 10px;
    border-left: 4px solid #1a73e8;
}

h3 {
    color: #1565c0;
    margin-top: 20px;
    margin-bottom: 15px;
}

h4 {
    color: #424242;
    margin-top: 15px;
    margin-bottom: 10px;
    font-weight: 600;
}

.metrics-table, .finance-table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.metrics-table td, .finance-table td, .finance-table th {
    padding: 12px;
    border: 1px solid #e0e0e0;
}

.metrics-table tr:nth-child(even), .finance-table tr:nth-child(even) {
    background-color: #f5f5f5;
}

.metrics-table td:first-child {
    background-color: #e3f2fd;
    font-weight: 600;
}

.finance-table th {
    background-color: #1a73e8;
    color: white;
    font-weight: 600;
}

.section-divider {
    margin: 40px 0;
    border: none;
    border-top: 2px solid #e0e0e0;
}

.segment-details {
    background-color: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
    margin: 10px 0;
}

ul {
    margin: 10px 0;
    padding-left: 25px;
}

li {
    margin: 8px 0;
}

a {
    color: #1a73e8;
    text-decoration: none;
    font-weight: 500;
}

a:hover {
    text-decoration: underline;
    color: #0d47a1;
}

strong {
    color: #212121;
    font-weight: 600;
}

.leader-profile {
    background-color: #e8f5e9;
    padding: 15px;
    border-radius: 8px;
    margin: 15px 0;
}

.awards-section ul {
    list-style-type: none;
    padding-left: 0;
}

.awards-section li {
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;
}

.resources-section {
    background-color: #fff3e0;
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
}

.conclusion {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 25px;
    border-radius: 10px;
    margin-top: 30px;
}

.conclusion h2 {
    color: white;
    border-left: 4px solid #ffd700;
}

.conclusion p {
    color: white;
    line-height: 1.8;
}

.conclusion strong {
    color: #ffd700;
}
</style>`;

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
        
        // Update the description
        console.log('📤 Updating with enhanced formatted description...');
        const result = await sql`
            UPDATE companies 
            SET 
                agent_description = ${enhancedDescription},
                description = ${enhancedDescription}
            WHERE id = ${company.id}
            RETURNING id, name
        `;
        
        if (result.length > 0) {
            console.log(`✅ Successfully updated description for ${result[0].name}`);
            console.log(`📝 New enhanced description length: ${enhancedDescription.length} characters`);
            
            // Verify the update
            const verification = await sql`
                SELECT id, name, 
                       LENGTH(description) as desc_length,
                       LENGTH(agent_description) as agent_desc_length
                FROM companies 
                WHERE id = ${company.id}
            `;
            
            console.log('✅ Verification:', verification[0]);
            console.log('\n🎉 UnitedHealth Group description has been successfully enhanced!');
            console.log('✨ New features include:');
            console.log('   - Professional HTML formatting with headers and sections');
            console.log('   - Bold text for emphasis on key metrics');
            console.log('   - Hyperlinks to official resources and external sites');
            console.log('   - Tables for financial and company metrics');
            console.log('   - Color-coded sections with icons');
            console.log('   - Responsive design with custom CSS styling');
            console.log('   - Clear visual hierarchy with proper headings');
            console.log('   - Interactive elements and hover effects');
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