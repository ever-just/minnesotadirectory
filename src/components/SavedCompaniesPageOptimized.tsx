import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Home,
  Building2,
  Users,
  DollarSign,
  MapPin,
  ExternalLink,
  Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { optimizedSavedCompaniesService, SavedCompany } from '../services/optimizedSavedCompaniesService';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import CompanyLogo from './CompanyLogo';
import './SavedCompaniesPageOptimized.css';

const SavedCompaniesPageOptimized: React.FC = () => {
  const [savedCompanies, setSavedCompanies] = useState<SavedCompany[]>([]);
  const [loading, setLoading] = useState(false); // Start with false for instant loading

  useEffect(() => {
    loadSavedCompaniesOptimized();
  }, []);

  const loadSavedCompaniesOptimized = async () => {
    try {
      // Step 1: Show cached data instantly (no loading state!)
      const cachedCompanies = optimizedSavedCompaniesService.getCachedSavedCompanies();
      if (cachedCompanies.length > 0) {
        setSavedCompanies(cachedCompanies);
        console.log('⚡ INSTANT: Loaded cached saved companies');
      }

      // Step 2: Load optimized data in background
      const response = await optimizedSavedCompaniesService.getSavedCompaniesOptimized();
      
      if (response.success) {
        setSavedCompanies(response.savedCompanies);
        
        
        console.log(`✅ OPTIMIZED: Updated with ${response.savedCompanies.length} companies`);
      }
    } catch (error) {
      console.error('Error loading saved companies:', error);
    } finally {
      setLoading(false); // Always false since we load instantly
    }
  };

  const handleUnsave = async (companyId: string, companyName: string) => {
    // Instantly remove from UI
    setSavedCompanies(prev => prev.filter(saved => saved.company.id !== companyId));
    
    // Update service
    await optimizedSavedCompaniesService.unsaveCompanyOptimized(companyId, companyName);
  };

  const filteredAndSortedCompanies = savedCompanies
    .sort((a, b) => {
      // Sort by most recently saved first
      return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
    });

  const formatRevenue = (sales: string) => {
    const num = parseFloat(sales) || 0;
    if (num >= 1000000000) return `$${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  // Only show loading skeleton if we have no data at all
  if (loading && savedCompanies.length === 0) {
    return (
      <div className="saved-page-optimized">
        {/* Header with ShadCN components */}
        <div className="saved-header-optimized">
          <div className="container mx-auto px-6 lg:px-8">
            <nav className="nav-optimized">
              <Link to="/" className="nav-item">
                <Home size={16} />
                <span>Directory</span>
              </Link>
              <span className="nav-separator">/</span>
              <span className="nav-current">Saved Companies</span>
            </nav>
            
            <div className="header-content-optimized">
              <div className="title-section-optimized">
                <Star size={32} className="title-heart-optimized" />
                <div>
                  <h1 className="title-optimized">My Saved Companies</h1>
                  <p className="subtitle-optimized">Your curated collection of Minnesota businesses</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="content-optimized">
          <div className="container mx-auto px-6 lg:px-8">
            <div className="loading-optimized">
              <div className="skeleton-grid-optimized">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="skeleton-card-optimized">
                    <CardHeader className="pb-4">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Skeleton className="h-4 w-full" />
                      <div className="flex gap-4">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Skeleton className="h-8 w-20 mr-2" />
                      <Skeleton className="h-8 w-24" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
              <div className="loading-message-optimized">
                <Star size={20} className="animate-pulse text-red-500" />
                Loading your saved companies...
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (savedCompanies.length === 0) {
    return (
      <div className="saved-page-optimized">
        <div className="saved-header-optimized">
          <div className="container mx-auto px-6 lg:px-8">
            <nav className="nav-optimized">
              <Link to="/" className="nav-item">
                <Home size={16} />
                <span>Directory</span>
              </Link>
              <span className="nav-separator">/</span>
              <span className="nav-current">Saved Companies</span>
            </nav>
            
            <div className="header-content-optimized">
              <div className="title-section-optimized">
                <Star size={32} className="title-heart-optimized" />
                <div>
                  <h1 className="title-optimized">My Saved Companies</h1>
                  <p className="subtitle-optimized">Your curated collection of Minnesota businesses</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="content-optimized">
          <div className="container mx-auto px-6 lg:px-8">
            <Card className="empty-state-optimized">
              <CardContent className="text-center py-16">
                <Star size={80} className="mx-auto mb-6 text-gray-300" />
                <h2 className="text-2xl font-semibold mb-4">No saved companies yet</h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Start exploring companies and save your favorites by clicking the heart icon on any company card.
                </p>
                <Button asChild className="gap-2">
                  <Link to="/">
                    <Building2 size={18} />
                    Explore Companies
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="saved-page-optimized">
      {/* Optimized Header with Better Spacing */}
      <div className="saved-header-optimized">
        <div className="container mx-auto px-6 lg:px-8">
          <nav className="nav-optimized">
            <Link to="/" className="nav-item">
              <Home size={16} />
              <span>Directory</span>
            </Link>
            <span className="nav-separator">/</span>
            <span className="nav-current">Saved Companies</span>
          </nav>
          
          <div className="header-content-optimized">
            <div className="title-section-optimized">
              <Star size={32} className="title-heart-optimized" />
              <div className="title-text-optimized">
                <h1 className="title-optimized">My Saved Companies</h1>
                <div className="title-badge-optimized">
                  <span className="count-badge">{savedCompanies.length}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Content with ShadCN Cards */}
      <div className="content-optimized">
        <div className="container mx-auto px-6 lg:px-8">
          {filteredAndSortedCompanies.length > 0 && (
            <div className="companies-grid-optimized grid">
              {filteredAndSortedCompanies.map((savedCompany, index) => (
                <Card 
                  key={savedCompany.savedCompanyId} 
                  className="company-card-optimized grid animate-slide-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardHeader className="card-header-optimized">
                    <div className="company-header-row">
                      <div className="company-identity-optimized">
                        <div className="logo-container-optimized">
                          <CompanyLogo
                            company={{
                              ...savedCompany.company,
                              url: savedCompany.company.website || '',
                              domain: savedCompany.company.website ? 
                                savedCompany.company.website.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '') : 
                                `${savedCompany.company.name.toLowerCase().replace(/\s+/g, '')}.com`
                            } as any}
                            size="medium"
                            priority={true}
                            lazy={false}
                            className="company-logo-optimized"
                          />
                        </div>
                        <div className="company-info-optimized">
                          <h3 className="company-name-optimized">{savedCompany.company.name}</h3>
                          <p className="company-industry-optimized">{savedCompany.company.industry}</p>
                          <div className="company-location-optimized">
                            <MapPin size={14} />
                            <span>{savedCompany.company.city}, {savedCompany.company.state}</span>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnsave(savedCompany.company.id, savedCompany.company.name)}
                        className="star-btn-optimized"
                      >
                        <Star size={18} className="fill-yellow-400 text-yellow-400" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="card-content-optimized">
                    <div className="metrics-optimized">
                      <div className="metric-optimized">
                        <Users size={16} className="metric-icon" />
                        <span className="metric-value">{savedCompany.company.employees?.toLocaleString() || 'N/A'}</span>
                        <span className="metric-label">employees</span>
                      </div>
                      <div className="metric-optimized">
                        <DollarSign size={16} className="metric-icon" />
                        <span className="metric-value">{formatRevenue(savedCompany.company.sales)}</span>
                        <span className="metric-label">revenue</span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="card-footer-optimized">
                    <div className="actions-optimized">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="action-optimized"
                        onClick={() => {
                          window.location.href = `/company/${encodeURIComponent(savedCompany.company.name)}`;
                        }}
                      >
                        <Eye size={14} />
                        View
                      </Button>
                      
                      {savedCompany.company.website && (
                        <Button variant="outline" size="sm" className="action-optimized" asChild>
                          <a href={savedCompany.company.website} target="_blank" rel="noopener noreferrer">
                            <ExternalLink size={14} />
                            Website
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedCompaniesPageOptimized;
