import { Company } from '../lib/types';
import { formatSales } from '../lib/utils';
import {
  Building2,
  Factory,
  MapPin,
  Users,
  DollarSign,
} from 'lucide-react';

interface CompanyCardProps {
  company: Company;
}

const CompanyCard = ({ company }: CompanyCardProps) => {
  return (
    <div className="company-card">
      <div className="company-header">
        <h2 className="company-name">{company.name}</h2>
        {company.isHeadquarters && (
          <span className="hq-badge flex items-center gap-1">
            <Building2 size={14} aria-hidden="true" /> HQ
          </span>
        )}
      </div>
      <div className="company-industry flex items-center gap-1">
        <Factory size={14} aria-hidden="true" /> {company.industry}
      </div>
      <div className="company-details">
        <div className="detail-item flex items-center gap-1">
          <MapPin size={14} aria-hidden="true" />
          <span className="detail-label">Location:</span> {company.city}, {company.state}
        </div>
        <div className="detail-item flex items-center gap-1">
          <Users size={14} aria-hidden="true" />
          <span className="detail-label">Employees:</span> {company.employees}
        </div>
        <div className="detail-item flex items-center gap-1">
          <DollarSign size={14} aria-hidden="true" />
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
