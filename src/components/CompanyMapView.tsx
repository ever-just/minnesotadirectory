import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { Company } from '../lib/types';
import CompanyLogo from './CompanyLogo';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { MapPin, Users, DollarSign, ExternalLink, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './CompanyMapView.css';

// Fix Leaflet default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface CompanyMapViewProps {
  companies: Company[];
  loading?: boolean;
  selectedIndustry?: string;
  searchTerm?: string;
  onCompanySelect?: (company: Company) => void;
  className?: string;
}

// Custom hook to fit map bounds to markers
const MapBoundsController: React.FC<{ companies: Company[] }> = ({ companies }) => {
  const map = useMap();
  
  useEffect(() => {
    const validCompanies = companies.filter(c => c.latitude && c.longitude);
    
    if (validCompanies.length === 0) return;
    
    if (validCompanies.length === 1) {
      // Single company - center on it
      const company = validCompanies[0];
      map.setView([company.latitude!, company.longitude!], 12);
    } else {
      // Multiple companies - fit bounds
      const bounds = L.latLngBounds(
        validCompanies.map(c => [c.latitude!, c.longitude!] as [number, number])
      );
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [map, companies]);
  
  return null;
};

// Create custom logo marker
const createLogoMarker = (company: Company): L.DivIcon => {
  const logoHtml = `
    <div class="company-map-marker">
      <div class="marker-logo-container">
        <div class="marker-logo" data-company-id="${company.id}">
          <img 
            src="data:image/svg+xml;base64,${btoa(`
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="15" fill="#3b82f6" stroke="#ffffff" stroke-width="2"/>
                <text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">
                  ${company.name.charAt(0).toUpperCase()}
                </text>
              </svg>
            `)}" 
            alt="${company.name}" 
            style="width: 32px; height: 32px; border-radius: 50%;"
            onerror="this.style.display='none'"
          />
        </div>
      </div>
      <div class="marker-pulse"></div>
    </div>
  `;
  
  return L.divIcon({
    html: logoHtml,
    className: 'custom-company-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 35],
    popupAnchor: [0, -35]
  });
};

// Company popup component
const CompanyMapCard: React.FC<{ company: Company }> = ({ company }) => {
  const formatSales = (sales: string) => {
    const num = parseFloat(sales);
    if (isNaN(num)) return 'N/A';
    return `$${(num / 1000000).toFixed(1)}M`;
  };
  
  const formatEmployees = (employees: string) => {
    const num = parseInt(employees);
    if (isNaN(num)) return 'N/A';
    return num.toLocaleString();
  };
  
  return (
    <Card className="company-map-popup">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="company-logo-container">
              <CompanyLogo
                company={company}
                size="small"
                priority={false}
                lazy={false}
                className="map-popup-logo"
              />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight">{company.name}</h3>
              <p className="text-sm text-gray-600 mt-1">{company.industry}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span>{formatEmployees(company.employees)} employees</span>
            </div>
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span>{formatSales(company.sales)} revenue</span>
            </div>
          </div>
          
          <div className="flex items-start space-x-2 text-sm">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <span className="text-gray-600">
              {company.address}<br />
              {company.city}, {company.state} {company.postalCode}
            </span>
          </div>
          
          <div className="flex items-center space-x-2 pt-2">
            <Button asChild size="sm" className="flex-1">
              <Link to={`/company/${encodeURIComponent(company.name)}`}>
                <Building2 className="w-4 h-4 mr-1" />
                View Details
              </Link>
            </Button>
            
            {company.url && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="flex-shrink-0"
              >
                <a 
                  href={company.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const CompanyMapView: React.FC<CompanyMapViewProps> = ({
  companies,
  loading = false,
  selectedIndustry,
  searchTerm,
  onCompanySelect,
  className
}) => {
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  
  // Filter companies with valid coordinates
  const mappableCompanies = useMemo(() => {
    return companies.filter(company => 
      company.latitude && 
      company.longitude && 
      !isNaN(Number(company.latitude)) && 
      !isNaN(Number(company.longitude))
    );
  }, [companies]);
  
  // Minnesota center coordinates
  const minnesotaCenter: [number, number] = [46.7296, -94.6859];
  const defaultZoom = 7;
  
  console.log(`🗺️ CompanyMapView: ${mappableCompanies.length}/${companies.length} companies with coordinates`);
  
  if (loading) {
    return (
      <div className={`company-map-loading ${className}`}>
        <div className="map-skeleton">
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Loading map...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (mappableCompanies.length === 0) {
    return (
      <div className={`company-map-empty ${className}`}>
        <div className="empty-map-state">
          <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Mapped Companies</h3>
          <p className="text-gray-500 text-center max-w-md">
            {companies.length > 0 
              ? 'Companies need to be geocoded before they can appear on the map. Run the geocoding process to add location data.'
              : 'No companies match your current filters.'
            }
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`company-map-container ${className}`}>
      <div className="map-header">
        <h2 className="map-title">
          Company Locations Map
          <span className="map-count">({mappableCompanies.length} companies)</span>
        </h2>
        {selectedIndustry && (
          <p className="map-filter-info">Showing: {selectedIndustry}</p>
        )}
      </div>
      
      <div className="map-wrapper">
        <MapContainer
          center={minnesotaCenter}
          zoom={defaultZoom}
          className="company-leaflet-map"
          ref={mapRef}
          whenCreated={() => setMapReady(true)}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {mapReady && (
            <>
              <MapBoundsController companies={mappableCompanies} />
              
              <MarkerClusterGroup
                chunkedLoading
                maxClusterRadius={50}
                spiderfyOnMaxZoom={true}
                showCoverageOnHover={false}
                zoomToBoundsOnClick={true}
              >
                {mappableCompanies.map((company) => (
                  <Marker
                    key={company.id}
                    position={[company.latitude!, company.longitude!]}
                    icon={createLogoMarker(company)}
                    eventHandlers={{
                      click: () => {
                        if (onCompanySelect) {
                          onCompanySelect(company);
                        }
                      }
                    }}
                  >
                    <Popup 
                      maxWidth={400}
                      closeButton={true}
                      autoClose={false}
                      closeOnEscapeKey={true}
                    >
                      <CompanyMapCard company={company} />
                    </Popup>
                  </Marker>
                ))}
              </MarkerClusterGroup>
            </>
          )}
        </MapContainer>
      </div>
      
      <div className="map-footer">
        <p className="map-stats text-sm text-gray-600">
          Displaying {mappableCompanies.length} of {companies.length} companies on map
        </p>
      </div>
    </div>
  );
};

export default CompanyMapView;
