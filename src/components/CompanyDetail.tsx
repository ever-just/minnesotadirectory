import { Company } from '../lib/types';
import { Link } from 'react-router-dom';
import {
  Building2,
  Factory,
  MapPin,
  Users,
  DollarSign,
  Phone,
  Globe,
} from 'lucide-react';
import './CompanyDetail.css';

interface CompanyDetailProps {
  company: Company;
}

const CompanyDetail = ({ company }: CompanyDetailProps) => {
  return (
    <div className="detail-page">
      <header className="header">
        <h1>Local Companies Catalog</h1>
        <p>Explore businesses in your area</p>
      </header>

      <div className="back-button-container">
        <Link to="/" className="back-button">
          ← Back to Catalog
        </Link>
      </div>

      <div className="detail-container">
        <div className="company-header">
          <h2 className="company-name">{company.name}</h2>
          <div className="badges">
            {company.isHeadquarters && (
              <span className="badge headquarters-badge flex items-center gap-1">
                <Building2 size={16} aria-hidden="true" /> Headquarters
              </span>
            )}
            {company.ownership && <span className="badge ownership-badge">{company.ownership}</span>}
          </div>
        </div>

        <div className="info-sections">
          <div className="info-section">
            <h3>Company Information</h3>
            <div className="info-grid">
              <div className="info-label flex items-center gap-1">
                <Factory size={16} aria-hidden="true" /> Industry:
              </div>
              <div className="info-value">{company.industry}</div>
              
              <div className="info-label">Ownership:</div>
              <div className="info-value">{company.ownership || 'N/A'}</div>
              
              {company.ticker && (
                <>
                  <div className="info-label">Ticker:</div>
                  <div className="info-value">{company.ticker}</div>
                </>
              )}
              
              <div className="info-label flex items-center gap-1">
                <Users size={16} aria-hidden="true" /> Employees (Site):
              </div>
              <div className="info-value">{company.employeesSite || 'N/A'}</div>
              
              <div className="info-label flex items-center gap-1">
                <Users size={16} aria-hidden="true" /> Employees (Total):
              </div>
              <div className="info-value">{company.employees || 'N/A'}</div>
              
              <div className="info-label flex items-center gap-1">
                <DollarSign size={16} aria-hidden="true" /> Annual Sales:
              </div>
              <div className="info-value">{company.sales || 'N/A'}</div>
            </div>
          </div>

          <div className="info-section">
            <h3>Contact Information</h3>
            <div className="info-grid">
              <div className="info-label flex items-center gap-1">
                <MapPin size={16} aria-hidden="true" /> Address:
              </div>
              <div className="info-value">{company.address || 'N/A'}</div>
              
              <div className="info-label flex items-center gap-1">
                <MapPin size={16} aria-hidden="true" /> City:
              </div>
              <div className="info-value">{company.city || 'N/A'}</div>
              
              <div className="info-label flex items-center gap-1">
                <MapPin size={16} aria-hidden="true" /> State:
              </div>
              <div className="info-value">{company.state || 'N/A'}</div>
              
              <div className="info-label flex items-center gap-1">
                <MapPin size={16} aria-hidden="true" /> Postal Code:
              </div>
              <div className="info-value">{company.postalCode || 'N/A'}</div>
              
              <div className="info-label flex items-center gap-1">
                <Phone size={16} aria-hidden="true" /> Phone:
              </div>
              <div className="info-value">{company.phone || 'N/A'}</div>
              
              <div className="info-label flex items-center gap-1">
                <Globe size={16} aria-hidden="true" /> Website:
              </div>
              <div className="info-value">
                {company.url ? (
                  <a href={company.url} target="_blank" rel="noopener noreferrer" className="website-link">
                    Visit Website
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
