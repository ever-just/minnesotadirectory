import { Company } from '../lib/types';
import { Link } from 'react-router-dom';
import CompanyCard from './CompanyCard';

interface CompanyGridProps {
  companies: Company[];
  loading: boolean;
}

const CompanyGrid = ({ companies, loading }: CompanyGridProps) => {
  if (loading) {
    return <div className="loading-container">Loading companies...</div>;
  }

  if (companies.length === 0) {
    return <div className="no-results">No companies found matching your criteria.</div>;
  }

  return (
    <div className="company-grid">
      {companies.map((company, index) => (
        <Link 
          key={index}
          to={`/company/${encodeURIComponent(company.name)}`} 
          className="company-card-link"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <CompanyCard 
            company={company} 
            priority={index < 6} // First 6 companies get priority loading
          />
        </Link>
      ))}
    </div>
  );
};

export default CompanyGrid;
