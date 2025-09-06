import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Search, 
  Filter, 
  Grid3X3,
  List,
  ArrowLeft,
  Home,
  Building2,
  Users,
  DollarSign,
  MapPin,
  ExternalLink,
  Tag,
  Calendar,
  SortAsc,
  SortDesc,
  Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { savedCompaniesService, SavedCompany } from '../services/savedCompaniesService';
import CompanyLogo from './CompanyLogo';
import FavoriteButton from './FavoriteButtonFixed';
import SkeletonLoader from './SkeletonLoader';
import './SavedCompaniesPageRedesigned.css';

const SavedCompaniesPageRedesigned: React.FC = () => {
  const [savedCompanies, setSavedCompanies] = useState<SavedCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('All Industries');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'savedAt' | 'name' | 'industry' | 'employees' | 'sales'>('savedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [industries, setIndustries] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSavedCompanies();
  }, []);

  const loadSavedCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await savedCompaniesService.getSavedCompanies(1, 1000);
      
      if (response.success) {
        setSavedCompanies(response.savedCompanies);
        
        // Extract unique industries
        const uniqueIndustries = [...new Set(response.savedCompanies.map(saved => saved.company.industry))];
        setIndustries(uniqueIndustries.sort());
      } else {
        setError(response.error || 'Failed to load saved companies');
      }
    } catch (error) {
      console.error('Error loading saved companies:', error);
      setError('Failed to load saved companies');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = (companyId: string) => {
    setSavedCompanies(prev => prev.filter(saved => saved.company.id !== companyId));
  };

  const filteredAndSortedCompanies = savedCompanies
    .filter(saved => {
      const matchesSearch = searchTerm === '' || 
        saved.company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        saved.company.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
        saved.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesIndustry = selectedIndustry === 'All Industries' || 
        saved.company.industry === selectedIndustry;
      
      return matchesSearch && matchesIndustry;
    })
    .sort((a, b) => {
      let valueA, valueB;
      
      switch (sortBy) {
        case 'name':
          valueA = a.company.name.toLowerCase();
          valueB = b.company.name.toLowerCase();
          break;
        case 'industry':
          valueA = a.company.industry.toLowerCase();
          valueB = b.company.industry.toLowerCase();
          break;
        case 'employees':
          valueA = a.company.employees || 0;
          valueB = b.company.employees || 0;
          break;
        case 'sales':
          valueA = parseFloat(a.company.sales) || 0;
          valueB = parseFloat(b.company.sales) || 0;
          break;
        case 'savedAt':
        default:
          valueA = new Date(a.savedAt).getTime();
          valueB = new Date(b.savedAt).getTime();
          break;
      }
      
      if (sortOrder === 'asc') {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      }
    });

  const formatRevenue = (sales: string) => {
    const num = parseFloat(sales) || 0;
    if (num >= 1000000000) return `$${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  if (loading) {
    return (
      <div className="saved-page-redesigned">
        <div className="saved-page-header">
          <div className="header-nav">
            <Link to="/" className="nav-link home-link">
              <Home size={18} />
              <span>Directory</span>
            </Link>
            <span className="nav-separator">/</span>
            <span className="nav-current">Saved Companies</span>
          </div>
          
          <div className="header-title-section">
            <div className="title-with-icon">
              <Heart size={28} className="title-heart" />
              <h1>My Saved Companies</h1>
            </div>
          </div>
        </div>
        
        <div className="saved-page-content">
          <div className="loading-state-redesigned">
            <div className="loading-skeleton-container">
              <div className="skeleton-card-redesigned"></div>
              <div className="skeleton-card-redesigned"></div>
              <div className="skeleton-card-redesigned"></div>
              <div className="skeleton-card-redesigned"></div>
              <div className="skeleton-card-redesigned"></div>
              <div className="skeleton-card-redesigned"></div>
            </div>
            <div className="loading-text-redesigned">
              <Heart size={20} className="loading-heart" />
              Loading your saved companies...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="saved-page-redesigned">
        <div className="saved-page-header">
          <div className="header-nav">
            <Link to="/" className="nav-link home-link">
              <Home size={18} />
              <span>Directory</span>
            </Link>
          </div>
          
          <div className="header-title-section">
            <div className="title-with-icon">
              <Heart size={28} className="title-heart error" />
              <h1>My Saved Companies</h1>
            </div>
          </div>
        </div>
        
        <div className="saved-page-content">
          <div className="error-state-redesigned">
            <Heart size={64} className="error-heart" />
            <h3>Unable to load saved companies</h3>
            <p>{error}</p>
            <button onClick={loadSavedCompanies} className="retry-button-redesigned">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (savedCompanies.length === 0) {
    return (
      <div className="saved-page-redesigned">
        <div className="saved-page-header">
          <div className="header-nav">
            <Link to="/" className="nav-link home-link">
              <Home size={18} />
              <span>Directory</span>
            </Link>
            <span className="nav-separator">/</span>
            <span className="nav-current">Saved Companies</span>
          </div>
          
          <div className="header-title-section">
            <div className="title-with-icon">
              <Heart size={28} className="title-heart" />
              <h1>My Saved Companies</h1>
            </div>
          </div>
        </div>
        
        <div className="saved-page-content">
          <div className="empty-state-redesigned">
            <Heart size={80} className="empty-heart" />
            <h2>No saved companies yet</h2>
            <p>Start exploring companies and save your favorites by clicking the heart icon on any company card.</p>
            <Link to="/" className="explore-button-redesigned">
              <Building2 size={20} />
              Explore Companies
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="saved-page-redesigned">
      {/* Header Section */}
      <div className="saved-page-header">
        <div className="header-nav">
          <Link to="/" className="nav-link home-link">
            <Home size={18} />
            <span>Directory</span>
          </Link>
          <span className="nav-separator">/</span>
          <span className="nav-current">Saved Companies</span>
        </div>
        
        <div className="header-title-section">
          <div className="title-with-icon">
            <Heart size={28} className="title-heart" />
            <h1>My Saved Companies</h1>
            <span className="saved-count-redesigned">{savedCompanies.length}</span>
          </div>
          <div className="header-subtitle">
            Your curated collection of Minnesota businesses
          </div>
        </div>

        {/* Controls Section */}
        <div className="controls-section-redesigned">
          <div className="controls-left">
            <div className="search-container-redesigned">
              <Search size={20} className="search-icon-redesigned" />
              <input
                type="text"
                placeholder="Search your saved companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input-redesigned"
              />
            </div>
            
            <div className="filter-container">
              <Filter size={18} />
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="filter-select-redesigned"
              >
                <option value="All Industries">All Industries</option>
                {industries.map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>
            
            <div className="sort-container">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="sort-select-redesigned"
              >
                <option value="savedAt">Date Saved</option>
                <option value="name">Company Name</option>
                <option value="industry">Industry</option>
                <option value="employees">Employees</option>
                <option value="sales">Revenue</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="sort-direction-button"
                title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
              >
                {sortOrder === 'asc' ? <SortAsc size={18} /> : <SortDesc size={18} />}
              </button>
            </div>
          </div>
          
          <div className="controls-right">
            <div className="view-toggle">
              <button
                onClick={() => setViewMode('grid')}
                className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
                title="Grid view"
              >
                <Grid3X3 size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
                title="List view"
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="results-summary-redesigned">
          <span>Showing {filteredAndSortedCompanies.length} of {savedCompanies.length} saved companies</span>
          {selectedIndustry !== 'All Industries' && (
            <span className="filter-indicator">in {selectedIndustry}</span>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="saved-page-content">
        {filteredAndSortedCompanies.length === 0 && savedCompanies.length > 0 ? (
          <div className="no-results-redesigned">
            <Search size={48} />
            <h3>No companies match your search</h3>
            <p>Try adjusting your search term or industry filter</p>
            <button 
              onClick={() => {
                setSearchTerm('');
                setSelectedIndustry('All Industries');
              }}
              className="clear-filters-redesigned"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className={`companies-container ${viewMode}`}>
            {filteredAndSortedCompanies.map((savedCompany, index) => (
              <div key={savedCompany.savedCompanyId} className={`company-item ${viewMode}`}>
                
                {/* Company Logo & Basic Info */}
                <div className="company-main-info">
                  <div className="company-logo-container">
                    <CompanyLogo
                      company={savedCompany.company}
                      size={viewMode === 'grid' ? 'medium' : 'small'}
                      className="company-logo-redesigned"
                    />
                  </div>
                  
                  <div className="company-identity">
                    <div className="company-name-section">
                      <h3 className="company-name-redesigned">{savedCompany.company.name}</h3>
                      <FavoriteButton
                        companyId={savedCompany.company.id}
                        companyName={savedCompany.company.name}
                        size="small"
                        onSaved={(saved) => {
                          if (!saved) handleUnsave(savedCompany.company.id);
                        }}
                        className="favorite-redesigned"
                      />
                    </div>
                    <div className="company-industry-redesigned">{savedCompany.company.industry}</div>
                    <div className="company-location">
                      <MapPin size={14} />
                      {savedCompany.company.city}, {savedCompany.company.state}
                    </div>
                  </div>
                </div>

                {/* Company Metrics */}
                <div className="company-metrics">
                  <div className="metric">
                    <Users size={16} />
                    <span className="metric-value">
                      {savedCompany.company.employees?.toLocaleString() || 'N/A'}
                    </span>
                    <span className="metric-label">employees</span>
                  </div>
                  <div className="metric">
                    <DollarSign size={16} />
                    <span className="metric-value">
                      {formatRevenue(savedCompany.company.sales)}
                    </span>
                    <span className="metric-label">revenue</span>
                  </div>
                </div>

                {/* Saved Info & Actions */}
                <div className="company-saved-info">
                  <div className="saved-meta-redesigned">
                    <Calendar size={14} />
                    <span>Saved {new Date(savedCompany.savedAt).toLocaleDateString()}</span>
                  </div>
                  
                  {savedCompany.tags.length > 0 && (
                    <div className="tags-redesigned">
                      <Tag size={12} />
                      {savedCompany.tags.slice(0, 2).map((tag, idx) => (
                        <span key={idx} className="tag-redesigned">{tag}</span>
                      ))}
                      {savedCompany.tags.length > 2 && (
                        <span className="tag-count">+{savedCompany.tags.length - 2}</span>
                      )}
                    </div>
                  )}
                  
                  <div className="company-actions">
                    <Link 
                      to={`/company/${encodeURIComponent(savedCompany.company.name)}`}
                      className="action-button view-details"
                    >
                      <Eye size={14} />
                      <span>View Details</span>
                    </Link>
                    
                    {savedCompany.company.website && (
                      <a 
                        href={savedCompany.company.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="action-button visit-website"
                      >
                        <ExternalLink size={14} />
                        <span>Visit Website</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedCompaniesPageRedesigned;
