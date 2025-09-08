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
    
    console.log(`🗺️ MapBoundsController: ${validCompanies.length} companies with coordinates:`, 
      validCompanies.map(c => ({ name: c.name, lat: c.latitude, lng: c.longitude }))
    );
    
    if (validCompanies.length === 0) return;
    
    if (validCompanies.length === 1) {
      // Single company - center on it
      const company = validCompanies[0];
      console.log(`🎯 Centering map on ${company.name} at [${company.latitude}, ${company.longitude}]`);
      map.setView([company.latitude!, company.longitude!], 14);
    } else if (validCompanies.length > 1) {
      // Multiple companies - fit bounds with Minnesota focus
      const bounds = L.latLngBounds(
        validCompanies.map(c => [c.latitude!, c.longitude!] as [number, number])
      );
      console.log(`🗺️ Fitting bounds for ${validCompanies.length} companies`);
      map.fitBounds(bounds, { 
        padding: [40, 40], 
        maxZoom: 9,   // Default closer zoom for Minnesota
        minZoom: 8    // Keep focus on Minnesota
      });
    } else {
      // No companies - show Minnesota business centers
      map.setView([44.9778, -93.2650], 9); // Minneapolis-Saint Paul focus
    }
  }, [map, companies]);
  
  return null;
};

// Create reliable company logo marker
const createLogoMarker = (company: Company): L.DivIcon => {
  // Extract domain for logo
  const domain = company.domain || (company.url ? 
    company.url.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '') : 
    null
  );
  
  // Determine industry color
  const industryColors = {
    'Life and Health Insurance': '#10b981', // Green
    'Department Stores': '#ef4444', // Red  
    'Grocery Wholesale': '#f59e0b', // Orange
    'Commercial Banking': '#3b82f6', // Blue
    'Industrial Manufacturing': '#8b5cf6', // Purple
    'default': '#6b7280' // Gray
  };
  
  const color = industryColors[company.industry as keyof typeof industryColors] || industryColors.default;
  
  // Create marker with immediate logo attempt
  const logoHtml = `
    <div class="company-logo-marker" style="
      width: 48px; 
      height: 48px; 
      background: white;
      border: 3px solid ${color}; 
      border-radius: 50%; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      box-shadow: 0 6px 12px rgba(0,0,0,0.3);
      overflow: hidden;
      position: relative;
      z-index: 1000;
    ">
      <img 
        src="https://logo.clearbit.com/${domain || 'example.com'}" 
        alt="${company.name}"
        style="
          width: 38px; 
          height: 38px; 
          border-radius: 50%; 
          object-fit: cover;
        "
        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
      />
      <div style="
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: linear-gradient(135deg, ${color}, ${color}aa);
        display: none;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 16px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      ">
        ${company.name.charAt(0).toUpperCase()}
      </div>
    </div>
  `;
  
  return L.divIcon({
    html: logoHtml,
    className: 'reliable-company-logo-marker',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24]
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
  const [mapReady, setMapReady] = useState(true);
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
  
  // Minnesota business center coordinates (Minneapolis-Saint Paul metro focus)
  const minnesotaCenter: [number, number] = [45.0000, -93.2650];
  const defaultZoom = 8;
  
  console.log(`🗺️ CompanyMapView: ${mappableCompanies.length}/${companies.length} companies with coordinates`);
  console.log(`📍 Raw coordinate sample:`, companies.slice(0, 3).map(c => ({
    name: c.name,
    lat: c.latitude,
    lng: c.longitude,
    latType: typeof c.latitude,
    lngType: typeof c.longitude
  })));
  console.log(`📍 Companies with coordinates:`, mappableCompanies.map(c => ({
    name: c.name,
    lat: c.latitude,
    lng: c.longitude,
    hasCoords: !!(c.latitude && c.longitude)
  })));
  
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
              
              {/* Company Logo Markers with Clustering */}
              <MarkerClusterGroup
                chunkedLoading
                maxClusterRadius={12}
                disableClusteringAtZoom={8}
                spiderfyOnMaxZoom={true}
                showCoverageOnHover={false}
                zoomToBoundsOnClick={true}
                spiderLegPolylineOptions={{
                  weight: 2,
                  color: '#3b82f6',
                  opacity: 0.8
                }}
              >
                {mappableCompanies.map((company) => {
                  console.log(`🚩 Rendering marker for ${company.name} at [${company.latitude}, ${company.longitude}]`);
                  
                  // Validate coordinates
                  const lat = Number(company.latitude);
                  const lng = Number(company.longitude);
                  
                  if (isNaN(lat) || isNaN(lng)) {
                    console.warn(`❌ Invalid coordinates for ${company.name}: lat=${company.latitude}, lng=${company.longitude}`);
                    return null;
                  }
                  
                  console.log(`✅ Valid coordinates for ${company.name}: [${lat}, ${lng}]`);
                  
                  return (
                    <Marker
                      key={company.id}
                      position={[lat, lng]}
                      icon={createLogoMarker(company)}
                      eventHandlers={{
                        click: () => {
                          console.log(`🖱️ Marker clicked: ${company.name}`);
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
                  );
                })}
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
