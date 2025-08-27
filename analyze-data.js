#!/usr/bin/env node

import fs from 'fs';

function parseCSV(csvText) {
  const lines = csvText.split('\n');
  const headers = lines[0].split('","').map(h => h.replace(/"/g, ''));
  
  // Find relevant column indexes
  const companyNameIndex = headers.findIndex(h => h.includes('Company Name'));
  const industryIndex = headers.findIndex(h => h.includes('D&B Hoovers Industry'));
  const salesIndex = headers.findIndex(h => h.includes('Sales'));
  const employeesIndex = headers.findIndex(h => h.includes('Employees (Total)'));
  
  console.log('📊 Column Analysis:');
  console.log(`Company Name: ${companyNameIndex}`);
  console.log(`Industry: ${industryIndex}`);
  console.log(`Sales: ${salesIndex}`);
  console.log(`Employees: ${employeesIndex}\n`);
  
  const companies = [];
  const industries = {};
  const salesData = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const row = lines[i].split('","').map(cell => cell.replace(/"/g, ''));
    if (row.length < headers.length) continue;
    
    const company = row[companyNameIndex];
    const industry = row[industryIndex] || 'Unknown';
    const sales = row[salesIndex];
    const employees = row[employeesIndex];
    
    companies.push({
      name: company,
      industry: industry,
      sales: sales,
      employees: employees,
      index: i - 1 // Position in dataset
    });
    
    // Track industry distribution
    if (!industries[industry]) {
      industries[industry] = [];
    }
    industries[industry].push(i - 1);
    
    // Track sales for sorting analysis
    if (sales && sales !== '') {
      salesData.push(parseFloat(sales) || 0);
    }
  }
  
  return { companies, industries, salesData };
}

async function analyzeData() {
  try {
    console.log('🔍 Loading CSV data...');
    const csvData = fs.readFileSync('public/ForMinnesotacompanies.org $10M + 10+ ppl + MN Only.csv', 'utf8');
    
    console.log('📈 Parsing data...');
    const { companies, industries, salesData } = parseCSV(csvData);
    
    console.log(`\n📊 Dataset Overview:`);
    console.log(`Total companies: ${companies.length}`);
    console.log(`Total industries: ${Object.keys(industries).length}`);
    console.log(`Companies with sales data: ${salesData.length}\n`);
    
    console.log('🏭 Top 10 Industries by Company Count:');
    const sortedIndustries = Object.entries(industries)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10);
    
    sortedIndustries.forEach(([industry, companies], index) => {
      console.log(`${index + 1}. ${industry}: ${companies.length} companies`);
    });
    
    console.log('\n🎯 Industry Distribution Analysis:');
    const firstChunk = companies.slice(0, 500);
    const firstChunkIndustries = {};
    
    firstChunk.forEach(company => {
      const industry = company.industry;
      if (!firstChunkIndustries[industry]) {
        firstChunkIndustries[industry] = 0;
      }
      firstChunkIndustries[industry]++;
    });
    
    console.log(`Industries in first 500 companies: ${Object.keys(firstChunkIndustries).length}`);
    console.log(`Total industries in dataset: ${Object.keys(industries).length}`);
    console.log(`Coverage: ${(Object.keys(firstChunkIndustries).length / Object.keys(industries).length * 100).toFixed(1)}%\n`);
    
    console.log('⚠️  Industries NOT in first 500 companies:');
    const missingIndustries = Object.keys(industries).filter(industry => 
      !Object.keys(firstChunkIndustries).includes(industry)
    );
    
    if (missingIndustries.length > 0) {
      missingIndustries.slice(0, 10).forEach(industry => {
        console.log(`- ${industry}: ${industries[industry].length} companies (starts at position ${Math.min(...industries[industry])})`);
      });
      
      if (missingIndustries.length > 10) {
        console.log(`... and ${missingIndustries.length - 10} more industries`);
      }
    } else {
      console.log('✅ All industries represented in first 500 companies!');
    }
    
    console.log('\n💰 Sales Data Analysis:');
    const validSales = salesData.filter(s => s > 0).sort((a, b) => b - a);
    if (validSales.length > 0) {
      console.log(`Companies with valid sales data: ${validSales.length}`);
      console.log(`Highest sales: $${(validSales[0] / 1e9).toFixed(1)}B`);
      console.log(`Median sales: $${(validSales[Math.floor(validSales.length / 2)] / 1e6).toFixed(1)}M`);
      console.log(`Lowest sales: $${(validSales[validSales.length - 1] / 1e6).toFixed(1)}M`);
    }
    
    console.log('\n🚨 CRITICAL FINDINGS FOR INFINITE SCROLL:');
    
    if (missingIndustries.length > 0) {
      console.log(`❌ PROBLEM: ${missingIndustries.length} industries missing from first 500 companies`);
      console.log('❌ IMPACT: Users filtering these industries will see "no results" initially');
      console.log('🔧 SOLUTION NEEDED: Smart chunking or industry-based reorganization required');
    } else {
      console.log('✅ All industries represented in first chunk - basic chunking should work');
    }
    
    const coveragePercentage = Object.keys(firstChunkIndustries).length / Object.keys(industries).length;
    if (coveragePercentage < 0.8) {
      console.log('❌ POOR INDUSTRY COVERAGE: < 80% of industries in first chunk');
    } else if (coveragePercentage < 0.95) {
      console.log('⚠️  MODERATE INDUSTRY COVERAGE: 80-95% of industries in first chunk');
    } else {
      console.log('✅ EXCELLENT INDUSTRY COVERAGE: >95% of industries in first chunk');
    }
    
  } catch (error) {
    console.error('Error analyzing data:', error);
  }
}

analyzeData();
