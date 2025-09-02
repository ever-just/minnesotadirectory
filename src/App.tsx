import { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import SearchBar from './components/SearchBar';
import CompanyGrid from './components/CompanyGrid';
import CompanyDetail from './components/CompanyDetail';
import VersionDisplay from './components/VersionDisplay';
import UserIcon from './components/UserIcon';
import { Company, IndustryOption, IndustryIndex } from './lib/types';
import { parseCSVData, getUniqueIndustries, buildIndustryIndex, createSmartChunk, validateIndustryCoverage } from './lib/utils';
import { CompanyService } from './services/companyService';
import './App.css';

interface DirectoryPageProps {
  allCompanies: Company[];
  filteredCompanies: Company[];
  visibleCompanies: Company[];
  industries: IndustryOption[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  handleSearch: (query: string) => void;
  handleIndustryChange: (industry: string) => void;
  handleLoadMore: () => void;
}

function DirectoryPage({ 
  filteredCompanies, 
  visibleCompanies,
  industries, 
  loading, 
  loadingMore,
  hasMore,
  handleSearch, 
  handleIndustryChange,
  handleLoadMore 
}: DirectoryPageProps) {
  return (
    <>
      <div className="hero-section">
        <div className="spacer-top"></div>
        
        <header className="header-expanded">
          <h1>MINNESOTA DIRECTORY</h1>
        </header>
        
        <div className="search-section">
          <SearchBar 
            onSearch={handleSearch}
            onIndustryChange={handleIndustryChange}
            industries={industries}
            totalCompanies={filteredCompanies.length}
            loading={loading}
          />
        </div>
        
        <div className="spacer-bottom"></div>
      </div>
      
      <main className="main-content">
        <CompanyGrid 
          companies={visibleCompanies}
          loading={loadingMore}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
        />
      </main>
    </>
  );
}

interface DetailPageWrapperProps {
  allCompanies: Company[];
}

function DetailPageWrapper({ allCompanies }: DetailPageWrapperProps) {
  const { companyName } = useParams<{ companyName: string }>();
  const company = allCompanies.find(c => c.name === decodeURIComponent(companyName || ''));
  
  if (!company) {
    return <div className="loading-container">Company not found</div>;
  }
  
  return <CompanyDetail company={company} />;
}

function App() {
  // Smart Chunking State Management
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [_industryIndex, setIndustryIndex] = useState<IndustryIndex>({});
  const [visibleCompanies, setVisibleCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loadedChunks, setLoadedChunks] = useState<number>(1);
  const [totalChunks, setTotalChunks] = useState<number>(0);
  
  // Keep existing filter state
  const [industries, setIndustries] = useState<IndustryOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');

  // Filter operation flag to prevent auto-loading interference
  const isFilteringRef = useRef<boolean>(false);

  // Fallback CSV loading function (for when API fails)
  const fallbackToCSVLoading = async () => {
    console.log('📄 Loading data from CSV fallback...');
    
    const response = await fetch('/ForMinnesotacompanies.org $10M + 10+ ppl + MN Only.csv');
    const csvText = await response.text();
    const parsedData = parseCSVData(csvText);
    
    console.log(`📊 Parsed ${parsedData.length} companies from CSV`);
    
    // Filter out null values and process data
    const validData = parsedData.filter((item: any) => item !== null);
    const processedData: Company[] = validData
      .filter(Boolean)
      .map((company: any) => ({
        name: company.name || '',
        address: company.address || '',
        city: company.city || '',
        state: company.state || '',
        postalCode: company.postalCode || '',
        sales: company.sales || '',
        employees: company.employees || '',
        description: company.description || '',
        industry: company.industry || '',
        isHeadquarters: Boolean(company.isHeadquarters),
        naicsDescription: company.naicsDescription || '',
        tradestyle: company.tradestyle || '',
        phone: company.phone || '',
        url: company.url || '',
        rawSales: company.sales || '',
        ownership: company.ownership || '',
        ticker: company.ticker || '',
        employeesSite: company.employeesSite || '',
        sicDescription: company.sicDescription || ''
      }));

    // Sort full dataset by sales for progressive loading FIRST
    const sortedAllCompanies = [...processedData].sort((a, b) => {
      const salesA = parseFloat(a.sales) || 0;
      const salesB = parseFloat(b.sales) || 0;
      return salesB - salesA;
    });
    
    // Build industry index from revenue-sorted data
    const industryMap = buildIndustryIndex(sortedAllCompanies);
    const industryCount = Object.keys(industryMap).length;
    console.log(`🏭 Built index for ${industryCount} industries`);
    
    // Create smart first chunk from revenue-sorted data
    const smartFirstChunk = createSmartChunk(sortedAllCompanies, industryMap, 500);
    console.log(`✅ Smart first chunk: ${smartFirstChunk.length} companies`);
    
    // Verify industry coverage
    const coverageStats = validateIndustryCoverage(smartFirstChunk, industryMap);
    if (coverageStats.missingIndustries.length > 0) {
      console.error('❌ CRITICAL: Not all industries covered in first chunk!');
      console.error('Missing industries:', coverageStats.missingIndustries);
    } else {
      console.log('✅ SUCCESS: All industries covered in first chunk');
    }
    
    // Calculate total chunks needed
    const chunks = Math.ceil(sortedAllCompanies.length / 500);
    
    // Extract unique industries for filter dropdown
    const uniqueIndustries = getUniqueIndustries(processedData);
    const industryOptions = uniqueIndustries.map(industry => ({
      value: industry,
      label: industry
    }));
    
    // Set state - ensure UI updates immediately when data loads
    setAllCompanies(sortedAllCompanies);
    setIndustryIndex(industryMap);
    setFilteredCompanies(sortedAllCompanies);
    setVisibleCompanies(smartFirstChunk);
    setTotalChunks(chunks);
    setIndustries(industryOptions);
    
    console.log('✅ CSV fallback loading complete');
    console.log(`📊 Stats: ${smartFirstChunk.length} visible, ${sortedAllCompanies.length} total, ${chunks} chunks`);
  };

  // Smart Chunking Data Loading (API-powered)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('🚀 Starting API-powered data load...');
        
        // Test API connection first
        const isAPIConnected = await CompanyService.testConnection();
        if (!isAPIConnected) {
          console.warn('⚠️ API connection failed, falling back to CSV loading...');
          return await fallbackToCSVLoading();
        }
        
        // Fetch all companies from API (replaces CSV fetch)
        const allCompaniesData = await CompanyService.fetchAllCompanies();
        console.log(`📊 Loaded ${allCompaniesData.length} companies from database`);
        
        // Ensure data is in the expected format
        const processedData: Company[] = allCompaniesData
          .filter(Boolean)
          .map((company: any) => ({
            name: company.name || '',
            address: company.address || '',
            city: company.city || '',
            state: company.state || '',
            postalCode: company.postalCode || company.postal_code || '',
            sales: company.sales?.toString() || '',
            employees: company.employees?.toString() || '',
            description: company.description || '',
            industry: company.industry || '',
            isHeadquarters: Boolean(company.isHeadquarters || company.is_headquarters),
            naicsDescription: company.naicsDescription || company.naics_description || '',
            tradestyle: company.tradestyle || '',
            phone: company.phone || '',
            url: company.website || company.url || '',
            rawSales: company.sales?.toString() || '',
            ownership: company.ownership || '',
            ticker: company.ticker || '',
            employeesSite: company.employeesSite || company.employees_site || '',
            sicDescription: company.sicDescription || company.sic_description || ''
          }));
        
        // Sort full dataset by sales for progressive loading FIRST
        const sortedAllCompanies = [...processedData].sort((a, b) => {
          const salesA = parseFloat(a.sales) || 0;
          const salesB = parseFloat(b.sales) || 0;
          return salesB - salesA;
        });
        
        // Build industry index from revenue-sorted data
        const industryMap = buildIndustryIndex(sortedAllCompanies);
        const industryCount = Object.keys(industryMap).length;
        console.log(`🏭 Built index for ${industryCount} industries`);
        
        // Create smart first chunk from revenue-sorted data (ensures all industries represented)
        const smartFirstChunk = createSmartChunk(sortedAllCompanies, industryMap, 500);
        console.log(`✅ Smart first chunk: ${smartFirstChunk.length} companies`);
        
        // Verify industry coverage
        const coverageStats = validateIndustryCoverage(smartFirstChunk, industryMap);
        if (coverageStats.missingIndustries.length > 0) {
          console.error('❌ CRITICAL: Not all industries covered in first chunk!');
          console.error('Missing industries:', coverageStats.missingIndustries);
        } else {
          console.log('✅ SUCCESS: All industries covered in first chunk');
        }
        
        // Calculate total chunks needed
        const chunks = Math.ceil(sortedAllCompanies.length / 500);
        
        // Fetch industries from API (more efficient than extracting from full dataset)
        const industryOptions = await CompanyService.fetchIndustries();
        
        // Set state - ensure UI updates immediately when data loads
        setAllCompanies(sortedAllCompanies);
        setIndustryIndex(industryMap);
        setFilteredCompanies(sortedAllCompanies); // Set BEFORE visibleCompanies to avoid race condition
        setVisibleCompanies(smartFirstChunk);
        setTotalChunks(chunks);
        setIndustries(industryOptions);
        
        console.log('✅ API-powered smart chunking initialization complete');
        console.log(`📊 Initial Stats: ${smartFirstChunk.length} visible, ${sortedAllCompanies.length} total, ${chunks} chunks`);
        console.log(`🎯 Auto-loading will begin automatically to load more companies...`);
        
      } catch (error) {
        console.error('Failed to load data from API:', error);
        console.log('🔄 Attempting fallback to CSV loading...');
        try {
          await fallbackToCSVLoading();
        } catch (fallbackError) {
          console.error('Fallback to CSV also failed:', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Progressive Loading Function
  const loadMoreCompanies = useCallback(() => {
    if (loadedChunks >= totalChunks || loadingMore) {
      console.log('✅ All chunks already loaded or loading in progress');
      return;
    }
    
    setLoadingMore(true);
    console.log(`📦 Loading chunk ${loadedChunks + 1}/${totalChunks}...`);
    
    // Add delay to prevent UI blocking
    setTimeout(() => {
      const currentData = selectedIndustry && selectedIndustry !== 'All Industries' 
        ? filteredCompanies 
        : allCompanies;
      
      if (!currentData || currentData.length === 0) {
        console.log('⚠️  No data available for loading more companies');
        setLoadingMore(false);
        return;
      }
      
      const startIndex = visibleCompanies.length;
      const endIndex = Math.min(startIndex + 500, currentData.length);
      const newCompanies = currentData.slice(startIndex, endIndex);
      
      if (newCompanies.length > 0) {
        setVisibleCompanies(prev => [...prev, ...newCompanies]);
        setLoadedChunks(prev => prev + 1);
        console.log(`✅ Loaded ${newCompanies.length} more companies (${startIndex + newCompanies.length} total visible)`);
      } else {
        console.log('✅ All companies loaded');
      }
      
      setLoadingMore(false);
    }, 100);
  }, [allCompanies, filteredCompanies, loadedChunks, totalChunks, loadingMore, visibleCompanies.length, selectedIndustry, searchQuery]);

  // Auto-Loading Strategy: Progressive background loading after initial 500
  useEffect(() => {
    // PREVENT auto-loading during filter operations
    if (isFilteringRef.current) {
      console.log('⏸️  Auto-loading paused during filter operation');
      return;
    }

    if (!loading && !loadingMore && visibleCompanies.length > 0 && visibleCompanies.length < filteredCompanies.length) {
      // Auto-load more batches until we reach 2000 companies or all data
      const shouldAutoLoad = visibleCompanies.length < Math.min(2000, filteredCompanies.length);
      
      if (shouldAutoLoad) {
        console.log(`🚀 Auto-loading: ${visibleCompanies.length} visible, ${filteredCompanies.length} total`);
        // Progressive delay - slower after initial burst
        const delay = visibleCompanies.length <= 500 ? 150 : 300;
        
        const autoLoadTimer = setTimeout(() => {
          // Double-check flag before executing auto-load
          if (!isFilteringRef.current) {
            loadMoreCompanies();
          } else {
            console.log('⚠️  Auto-loading cancelled - filter operation in progress');
          }
        }, delay);

        return () => clearTimeout(autoLoadTimer);
      }
    }
  }, [loading, loadingMore, visibleCompanies.length, filteredCompanies.length, loadMoreCompanies]);

  // Enhanced Filter Logic (works on full dataset)
  const handleIndustryChange = useCallback((industry: string) => {
    console.log(`🔍 Industry filter changed to: "${industry}"`);
    
    // SET filter flag to prevent auto-loading interference
    isFilteringRef.current = true;
    
    setSelectedIndustry(industry);
    
    let filtered = [...allCompanies]; // Always filter full dataset
    
    // Apply industry filter
    if (industry && industry !== 'All Industries') {
      filtered = filtered.filter(company => company.industry === industry);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(company =>
        company.name.toLowerCase().includes(query) ||
        company.city.toLowerCase().includes(query) ||
        company.industry.toLowerCase().includes(query) ||
        (company.description && company.description.toLowerCase().includes(query))
      );
    }
    
    setFilteredCompanies(filtered);
    console.log(`🔍 Filter applied: ${filtered.length} results for "${industry || 'All Industries'}"`);
    
    // Reset chunking when filter changes - show first 500 of filtered results
    setLoadedChunks(1);
    setVisibleCompanies(filtered.slice(0, 500));
    
    // RESET filter flag after filter operations complete
    setTimeout(() => {
      isFilteringRef.current = false;
      console.log('🎯 Filter operation complete, auto-loading re-enabled');
    }, 50); // Short delay to ensure state updates complete
    
  }, [allCompanies, searchQuery]);

  const handleSearch = useCallback((query: string) => {
    console.log(`🔍 Search query changed to: "${query}"`);
    
    // SET filter flag to prevent auto-loading interference
    isFilteringRef.current = true;
    
    setSearchQuery(query);
    
    let filtered = [...allCompanies]; // Always search full dataset
    
    // Apply industry filter
    if (selectedIndustry && selectedIndustry !== 'All Industries') {
      filtered = filtered.filter(company => company.industry === selectedIndustry);
    }
    
    // Apply search filter
    if (query) {
      const searchTerm = query.toLowerCase();
      filtered = filtered.filter(company =>
        company.name.toLowerCase().includes(searchTerm) ||
        company.city.toLowerCase().includes(searchTerm) ||
        company.industry.toLowerCase().includes(searchTerm) ||
        (company.description && company.description.toLowerCase().includes(searchTerm))
      );
    }
    
    setFilteredCompanies(filtered);
    console.log(`🔍 Search applied: ${filtered.length} results for "${query}"`);
    
    // Reset chunking when search changes - show first 500 of filtered results
    setLoadedChunks(1);
    setVisibleCompanies(filtered.slice(0, 500));
    
    // RESET filter flag after search operations complete
    setTimeout(() => {
      isFilteringRef.current = false;
      console.log('🎯 Search operation complete, auto-loading re-enabled');
    }, 50); // Short delay to ensure state updates complete
    
  }, [allCompanies, selectedIndustry]);

  const hasMore = visibleCompanies.length < filteredCompanies.length;

  return (
    <div className="app">
      <Router>
        <Routes>
          <Route 
            path="/" 
            element={
              <DirectoryPage 
                allCompanies={allCompanies}
                filteredCompanies={filteredCompanies}
                visibleCompanies={visibleCompanies}
                industries={industries}
                loading={loading}
                loadingMore={loadingMore}
                hasMore={hasMore}
                handleSearch={handleSearch}
                handleIndustryChange={handleIndustryChange}
                handleLoadMore={loadMoreCompanies}
              />
            } 
          />
          <Route 
            path="/company/:companyName" 
            element={<DetailPageWrapper allCompanies={allCompanies} />} 
          />
        </Routes>
      </Router>
      <UserIcon />
      <VersionDisplay />
    </div>
  );
}

export default App;
