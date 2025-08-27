import { useEffect } from 'react';
import { Company, LogoMetadata } from '../lib/types';
import { formatSales, formatNumber } from '../lib/utils';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CompanyLogo from './CompanyLogo';
import WebsiteStructure from './WebsiteStructure';
import './CompanyDetail.css';

interface CompanyDetailProps {
  company: Company;
}

const CompanyDetail = ({ company }: CompanyDetailProps) => {
  // Scroll to top when component loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [company.name]); // Re-scroll when company changes

  // Extract clean domain from URL (remove www. and protocol)
  const getCleanDomain = (url: string): string => {
    if (!url) return '';
    
    try {
      // Remove protocol if present
      let cleanUrl = url.replace(/^https?:\/\//, '');
      // Remove www. if present
      cleanUrl = cleanUrl.replace(/^www\./, '');
      // Remove trailing slash if present
      cleanUrl = cleanUrl.replace(/\/$/, '');
      
      return cleanUrl;
    } catch {
      return url;
    }
  };

  // Format business description into readable paragraphs
  const formatBusinessDescription = (description: string): string[] => {
    if (!description) return ['No description available.'];
    
    // Split on multiple sentence endings that suggest new topics/paragraphs
    let paragraphs = description
      .split(/(?<=[.!?])\s+(?=[A-Z]|The\s|In\s|For\s|During\s|Additionally\s|Furthermore\s|Moreover\s|However\s|Currently\s|Recently\s|Today\s)/)
      .filter(para => para.trim().length > 0);
    
    // If we don't get good natural breaks, try splitting on certain phrases
    if (paragraphs.length === 1) {
      paragraphs = description
        .split(/(?:\.\s*)(?=The company|In addition|Additionally|Furthermore|Moreover|Currently|Recently|Today|The business|Operations|Products|Services)/)
        .filter(para => para.trim().length > 0);
    }
    
    // If still one long paragraph, split by length (every ~300-400 characters at sentence boundaries)
    if (paragraphs.length === 1 && description.length > 400) {
      const sentences = description.split(/(?<=[.!?])\s+/);
      paragraphs = [];
      let currentParagraph = '';
      
      sentences.forEach(sentence => {
        if (currentParagraph.length + sentence.length > 350 && currentParagraph.length > 100) {
          paragraphs.push(currentParagraph.trim());
          currentParagraph = sentence;
        } else {
          currentParagraph += (currentParagraph ? ' ' : '') + sentence;
        }
      });
      
      if (currentParagraph.trim()) {
        paragraphs.push(currentParagraph.trim());
      }
    }
    
    // Clean up paragraphs and ensure they end with punctuation
    return paragraphs.map(para => {
      para = para.trim();
      if (para && !para.match(/[.!?]$/)) {
        para += '.';
      }
      return para;
    }).filter(para => para.length > 10); // Filter out very short fragments
  };

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
      <div className="back-button-container">
        <Button asChild variant="outline" size="icon">
          <Link to="/" aria-label="Back to Directory">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      </div>

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

      <div className="detail-container">
        <div className="info-sections">
          <div className="info-section">
            <h3>Company Overview</h3>
            <div className="info-grid">
              <div className="info-label">Industry:</div>
              <div className="info-value">{company.industry}</div>
              
              <div className="info-label">Ownership:</div>
              <div className="info-value">{company.ownership || 'N/A'}</div>
              
              {company.ticker && (
                <>
                  <div className="info-label">Ticker:</div>
                  <div className="info-value">{company.ticker}</div>
                </>
              )}
              
              <div className="info-label">Employees (Site):</div>
              <div className="info-value">{formatNumber(company.employeesSite || '') || 'N/A'}</div>
              
              <div className="info-label">Employees (Total):</div>
              <div className="info-value">{formatNumber(company.employees) || 'N/A'}</div>
              
              <div className="info-label">Annual Revenue:</div>
              <div className="info-value">{formatSales(company.sales || '') || 'N/A'}</div>
            </div>
          </div>

          <div className="info-section">
            <h3>Company Office</h3>
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
                  <div className="website-display">
                    <span className="website-url">{getCleanDomain(company.url)}</span>
                    <Button 
                      asChild 
                      variant="ghost" 
                      size="icon"
                      className="website-button"
                    >
                      <a 
                        href={company.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        aria-label="Visit website"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                ) : (
                  'N/A'
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="description-section">
          <h3>Business Description</h3>
          <div className="description-content">
            {formatBusinessDescription(company.description || '').map((paragraph, index) => (
              <p key={index} className="description-paragraph">
                {paragraph}
              </p>
            ))}
          </div>
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

        {/* Website Structure Analysis - Separate Component */}
        {company.url && (
          <WebsiteStructure 
            companyUrl={company.url} 
            companyName={company.name}
          />
        )}
      </div>
    </div>
  );
};

export default CompanyDetail;
