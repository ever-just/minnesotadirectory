import { useEffect } from 'react';
import { Company, LogoMetadata } from '../lib/types';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CompanyLogo from './CompanyLogo';
import './CompanyDetail.css';

interface CompanyDetailProps {
  company: Company;
}

const CompanyDetail = ({ company }: CompanyDetailProps) => {
  // Scroll to top when component loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [company.name]); // Re-scroll when company changes

  // Smart function to split company name into two lines for header display
  const splitCompanyName = (name: string): { line1: string; line2: string } => {
    const businessSuffixes = [
      'Corporation', 'Corp', 'Incorporated', 'Inc', 'Company', 'Co', 
      'Group', 'LLC', 'LLP', 'LP', 'Ltd', 'Limited', 'Associates', 
      'Partners', 'Enterprises', 'Industries', 'Systems', 'Services',
      'Solutions', 'Technologies', 'Holdings', 'International', 'Worldwide'
    ];
    
    const words = name.trim().split(' ');
    
    // If name is short (1-2 words), keep on one line, pad with empty second line
    if (words.length <= 2) {
      return { line1: name, line2: '' };
    }
    
    // Look for business suffixes to create natural split
    for (let i = businessSuffixes.length - 1; i >= 0; i--) {
      const suffix = businessSuffixes[i];
      const suffixIndex = words.findIndex(word => 
        word.toLowerCase() === suffix.toLowerCase() || 
        word.toLowerCase() === suffix.toLowerCase() + '.'
      );
      
      if (suffixIndex > 0) {
        const line1 = words.slice(0, suffixIndex).join(' ');
        const line2 = words.slice(suffixIndex).join(' ');
        return { line1, line2 };
      }
    }
    
    // Fallback: split roughly in the middle
    const midPoint = Math.ceil(words.length / 2);
    const line1 = words.slice(0, midPoint).join(' ');
    const line2 = words.slice(midPoint).join(' ');
    
    return { line1, line2 };
  };

  const { line1, line2 } = splitCompanyName(company.name);
  
  const handleLogoLoad = (metadata: LogoMetadata) => {
    // Track successful logo loads for analytics
    if (process.env.NODE_ENV === 'development') {
      console.log(`Detail logo loaded for ${company.name}:`, {
        source: metadata.bestSource?.name,
        quality: metadata.qualityScore,
        fromCache: metadata.sources.some(s => s.lastTested && 
          new Date(metadata.lastUpdated).getTime() - new Date(s.lastTested).getTime() < 1000)
      });
    }
  };

  const handleLogoError = (error: Error) => {
    // Track logo errors for monitoring
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Detail logo error for ${company.name}:`, error.message);
    }
  };

  return (
    <div className="detail-page">
      <header className="header">
        <div className="header-company-info">
          <CompanyLogo
            company={company}
            size="large"
            priority={true}
            lazy={false}
            className="header-company-logo"
            onLoad={handleLogoLoad}
            onError={handleLogoError}
          />
          <h1 className="header-company-name">
            <span className="company-name-line1">{line1}</span>
            {line2 && <span className="company-name-line2">{line2}</span>}
          </h1>
        </div>
      </header>

      <div className="back-button-container">
        <Button asChild variant="outline" size="icon">
          <Link to="/directory" aria-label="Back to Directory">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="detail-container">
        <div className="info-sections">
          <div className="info-section">
            <h3>Company Information</h3>
            <div className="info-grid">
              <div className="info-label">Industry:</div>
              <div className="info-value">{company.industry}</div>
              
              <div className="info-label">Ownership:</div>
              <div className="info-value">{company.ownership || 'N/A'}</div>
              
              <div className="info-label">Type:</div>
              <div className="info-value">
                <div className="badges">
                  {company.isHeadquarters && <span className="badge headquarters-badge">Headquarters</span>}
                  {company.ownership && <span className="badge ownership-badge">{company.ownership}</span>}
                </div>
              </div>
              
              {company.ticker && (
                <>
                  <div className="info-label">Ticker:</div>
                  <div className="info-value">{company.ticker}</div>
                </>
              )}
              
              <div className="info-label">Employees (Site):</div>
              <div className="info-value">{company.employeesSite || 'N/A'}</div>
              
              <div className="info-label">Employees (Total):</div>
              <div className="info-value">{company.employees || 'N/A'}</div>
              
              <div className="info-label">Annual Sales:</div>
              <div className="info-value">{company.sales || 'N/A'}</div>
            </div>
          </div>

          <div className="info-section">
            <h3>Contact Information</h3>
            <div className="info-grid">
              <div className="info-label">Address:</div>
              <div className="info-value">{company.address || 'N/A'}</div>
              
              <div className="info-label">City:</div>
              <div className="info-value">{company.city || 'N/A'}</div>
              
              <div className="info-label">State:</div>
              <div className="info-value">{company.state || 'N/A'}</div>
              
              <div className="info-label">Postal Code:</div>
              <div className="info-value">{company.postalCode || 'N/A'}</div>
              
              <div className="info-label">Phone:</div>
              <div className="info-value">{company.phone || 'N/A'}</div>
              
              <div className="info-label">Website:</div>
              <div className="info-value">
                {company.url ? (
                  <a 
                    href={company.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="company-website-link"
                  >
                    Visit Website →
                  </a>
                ) : (
                  'N/A'
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="description-section">
          <h3>Business Description</h3>
          <p className="full-description">{company.description || 'No description available.'}</p>
        </div>

        <div className="additional-section">
          <h3>Additional Information</h3>
          <div className="info-grid wide-grid">
            <div className="info-label">NAICS Description:</div>
            <div className="info-value">{company.naicsDescription || 'N/A'}</div>
            
            <div className="info-label">SIC Description:</div>
            <div className="info-value">{company.sicDescription || 'N/A'}</div>
            
            <div className="info-label">Tradestyle:</div>
            <div className="info-value">{company.tradestyle || 'N/A'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetail;
