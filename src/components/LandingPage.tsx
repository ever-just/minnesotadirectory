import { Link } from 'react-router-dom';
import { Building2, Search, MapPin, Users } from 'lucide-react';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <header className="header">
        <h1>MINNESOTA DIRECTORY</h1>
        <p>Your comprehensive guide to Minnesota businesses</p>
      </header>
      
      <main className="landing-content">
        <section className="hero-section">
          <div className="hero-content">
            <h2>Discover Minnesota's Business Landscape</h2>
            <p className="hero-description">
              Explore a curated directory of Minnesota companies with over $10M in revenue 
              and 10+ employees. Find detailed information about local businesses, 
              their industries, locations, and key details all in one place.
            </p>
            
            <div className="cta-section">
              <Link to="/directory" className="cta-button primary">
                <Search size={20} />
                Browse Directory
              </Link>
            </div>
          </div>
        </section>

        <section className="features-section">
          <h3>What You'll Find</h3>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <Building2 size={32} />
              </div>
              <h4>2,700+ Companies</h4>
              <p>Comprehensive database of established Minnesota businesses</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <MapPin size={32} />
              </div>
              <h4>Statewide Coverage</h4>
              <p>Companies from Minneapolis to Duluth and everywhere in between</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <Users size={32} />
              </div>
              <h4>Detailed Profiles</h4>
              <p>Employee counts, revenue data, industry classifications, and contact information</p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <div className="about-content">
            <h3>About This Directory</h3>
            <p>
              This directory showcases Minnesota's thriving business ecosystem, featuring companies 
              that have demonstrated significant growth and stability. Our data includes publicly 
              available business information sourced from D&B (Dun & Bradstreet) records, ensuring 
              accuracy and reliability.
            </p>
            <p>
              Whether you're looking for potential business partners, researching competitors, 
              or exploring Minnesota's economic landscape, this directory provides the insights 
              you need to make informed decisions.
            </p>
          </div>
        </section>

        <section className="navigation-section">
          <div className="nav-content">
            <h3>Ready to Explore?</h3>
            <p>Start browsing Minnesota's business directory today</p>
            <Link to="/directory" className="cta-button secondary">
              <Building2 size={20} />
              View All Companies
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>&copy; 2024 Minnesota Directory. Data sourced from D&B records.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
