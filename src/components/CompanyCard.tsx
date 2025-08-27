import { Company, LogoMetadata } from '../lib/types';
import { formatSales } from '../lib/utils';
import CompanyLogo from './CompanyLogo';

interface CompanyCardProps {
  company: Company;
  priority?: boolean; // For above-the-fold cards
  showLogoQuality?: boolean; // Dev mode feature
}

const CompanyCard = ({ company, priority = false, showLogoQuality = false }: CompanyCardProps) => {
  const handleLogoLoad = (metadata: LogoMetadata) => {
    // Track successful logo loads for analytics
    if (process.env.NODE_ENV === 'development') {
      console.log(`Logo loaded for ${company.name}:`, {
        source: metadata.bestSource?.name,
        quality: metadata.qualityScore,
        cached: metadata.sources.some(s => s.lastTested)
      });
    }
  };

  const handleLogoError = (error: Error) => {
    // Track logo errors for monitoring
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Logo error for ${company.name}:`, error.message);
    }
  };

  return (
    <div className="company-card">
      <div className="company-header">
        <CompanyLogo
          company={company}
          size="medium"
          priority={priority}
          className="flex-shrink-0"
          onLoad={handleLogoLoad}
          onError={handleLogoError}
          showQualityIndicator={showLogoQuality}
        />
        <div className="company-title-section flex-1 min-w-0 ml-4">
          <h2 className="company-name">{company.name}</h2>
          {company.isHeadquarters && <span className="hq-badge">HQ</span>}
        </div>
      </div>
      <div className="company-industry">{company.industry}</div>
      <div className="company-details">
        <div className="detail-item">
          <span className="detail-label">Location:</span> {company.city}, {company.state}
        </div>
        <div className="detail-item">
          <span className="detail-label">Employees:</span> {company.employees}
        </div>
        <div className="detail-item">
          <span className="detail-label">Sales:</span> {formatSales(company.sales || '')}
        </div>
      </div>
      <div className="company-description">
        {company.description && company.description.length > 300 
          ? `${company.description.substring(0, 300)}...` 
          : company.description}
      </div>
      <div className="view-details">
        <a href="#" className="view-details-link">View Details →</a>
      </div>
    </div>
  );
};

export default CompanyCard;
