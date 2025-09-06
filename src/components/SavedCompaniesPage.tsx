import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  Calendar,
  Building2,
  Users,
  DollarSign,
  MapPin,
  ExternalLink,
  Tag,
  MessageSquare,
  ArrowLeft
} from 'lucide-react';
// Removed Link import - using buttons instead for modal context
import { savedCompaniesService, SavedCompany } from '../services/savedCompaniesService';
import CompanyLogo from './CompanyLogo';
import FavoriteButton from './FavoriteButton';
import SkeletonLoader from './SkeletonLoader';
import './SavedCompaniesPage.css';

interface SavedCompaniesPageProps {
  onBack?: () => void;
}

const SavedCompaniesPage: React.FC<SavedCompaniesPageProps> = ({ onBack }) => {
  const [savedCompanies, setSavedCompanies] = useState<SavedCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('All Industries');
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
      
      const response = await savedCompaniesService.getSavedCompanies(1, 1000); // Load all
      
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
    // Remove from local state immediately for instant feedback
    setSavedCompanies(prev => prev.filter(saved => saved.company.id !== companyId));
  };

  const filteredAndSortedCompanies = savedCompanies
    .filter(saved => {
      const matchesSearch = searchTerm === '' || 
        saved.company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        saved.company.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
        saved.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        saved.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
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

  if (loading) {
    return (
      <div className="saved-companies-page">
        <div className="saved-header">
          <div className="header-content">
            <button onClick={onBack} className="back-button">
              <ArrowLeft size={20} />
              Back
            </button>
            <div className="header-title">
              <Heart size={24} />
              <h1>Saved Companies</h1>
            </div>
          </div>
        </div>
        
        <div className="saved-content">
          <SkeletonLoader count={6} variant="company-card" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="saved-companies-page">
        <div className="saved-header">
          <div className="header-content">
            <button onClick={onBack} className="back-button">
              <ArrowLeft size={20} />
              Back
            </button>
            <div className="header-title">
              <Heart size={24} />
              <h1>Saved Companies</h1>
            </div>
          </div>
        </div>
        
        <div className="error-state">
          <Heart size={48} className="error-icon" />
          <h3>Unable to load saved companies</h3>
          <p>{error}</p>
          <button onClick={loadSavedCompanies} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (savedCompanies.length === 0) {
    return (
      <div className="saved-companies-page">
        <div className="saved-header">
          <div className="header-content">
            <button onClick={onBack} className="back-button">
              <ArrowLeft size={20} />
              Back
            </button>
            <div className="header-title">
              <Heart size={24} />
              <h1>Saved Companies</h1>
            </div>
          </div>
        </div>
        
        <div className="empty-state">
          <Heart size={64} className="empty-icon" />
          <h3>No saved companies yet</h3>
          <p>Start exploring companies and save your favorites by clicking the heart icon</p>
          <button onClick={onBack} className="explore-button">
            Explore Companies
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="saved-companies-page">
      <div className="saved-header">
        <div className="header-content">
          <button onClick={onBack} className="back-button">
            <ArrowLeft size={20} />
            Back
          </button>
          <div className="header-title">
            <Heart size={24} />
            <h1>Saved Companies</h1>
            <span className="saved-count-badge">{savedCompanies.length}</span>
          </div>
        </div>
        
        {/* Search and Filter Controls */}
        <div className="controls-section">
          <div className="search-filter-row">
            <div className="search-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search saved companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="filter-wrapper">
              <Filter size={18} className="filter-icon" />
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="filter-select"
              >
                <option value="All Industries">All Industries</option>
                {industries.map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>
            
            <div className="sort-wrapper">
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="sort-button"
                title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
              >
                {sortOrder === 'asc' ? <SortAsc size={18} /> : <SortDesc size={18} />}
              </button>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="sort-select"
              >
                <option value="savedAt">Date Saved</option>
                <option value="name">Company Name</option>
                <option value="industry">Industry</option>
                <option value="employees">Employees</option>
                <option value="sales">Revenue</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="results-summary">
        Showing {filteredAndSortedCompanies.length} of {savedCompanies.length} saved companies
      </div>
      
      {/* Saved Companies Grid */}
      <div className="saved-content">
        <div className="saved-companies-grid">
          {filteredAndSortedCompanies.map((savedCompany) => (
            <div key={savedCompany.savedCompanyId} className="saved-company-card">
              <div className="card-header">
                <div className="company-logo-section">
                  <CompanyLogo
                    company={savedCompany.company}
                    size="medium"
                    className="company-logo"
                  />
                </div>
                <div className="favorite-section">
                  <FavoriteButton
                    companyId={savedCompany.company.id}
                    companyName={savedCompany.company.name}
                    size="small"
                    onSaved={(saved) => {
                      if (!saved) handleUnsave(savedCompany.company.id);
                    }}
                  />
                </div>
              </div>
              
              <div className="card-content">
                <button 
                  onClick={() => {
                    // For now, just show company info in console
                    console.log('🏢 Company clicked:', savedCompany.company.name);
                    // TODO: Add company detail modal or navigation
                  }}
                  className="company-link"
                >
                  <h3 className="company-name">{savedCompany.company.name}</h3>
                </button>
                
                <div className="company-industry">{savedCompany.company.industry}</div>
                
                <div className="company-details">
                  <div className="detail-item">
                    <MapPin size={14} />
                    <span>{savedCompany.company.city}, {savedCompany.company.state}</span>
                  </div>
                  <div className="detail-item">
                    <Users size={14} />
                    <span>{savedCompany.company.employees?.toLocaleString() || 'N/A'} employees</span>
                  </div>
                  <div className="detail-item">
                    <DollarSign size={14} />
                    <span>${(parseFloat(savedCompany.company.sales) / 1000000).toFixed(1)}M revenue</span>
                  </div>
                </div>
                
                {savedCompany.tags.length > 0 && (
                  <div className="tags-section">
                    <Tag size={12} />
                    <div className="tags">
                      {savedCompany.tags.map((tag, index) => (
                        <span key={index} className="tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
                
                {savedCompany.notes && (
                  <div className="notes-section">
                    <MessageSquare size={12} />
                    <p className="notes">{savedCompany.notes}</p>
                  </div>
                )}
                
                <div className="saved-meta">
                  <Calendar size={12} />
                  <span className="saved-date">
                    Saved {new Date(savedCompany.savedAt).toLocaleDateString()}
                  </span>
                </div>
                
                {savedCompany.company.website && (
                  <a 
                    href={savedCompany.company.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="visit-website"
                  >
                    <ExternalLink size={14} />
                    Visit Website
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {filteredAndSortedCompanies.length === 0 && savedCompanies.length > 0 && (
          <div className="no-results">
            <Search size={48} className="no-results-icon" />
            <h3>No companies match your search</h3>
            <p>Try adjusting your search term or industry filter</p>
            <button 
              onClick={() => {
                setSearchTerm('');
                setSelectedIndustry('All Industries');
              }}
              className="clear-filters-button"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedCompaniesPage;
