import React from 'react';
import { 
  Youtube, 
  Linkedin, 
  Instagram, 
  MapPin, 
  Phone, 
  Globe,
  Bell,
  MessageCircle
} from 'lucide-react';
import { Company } from '../lib/types';
import XIcon from './XIcon';
import wikipediaLogo from '../assets/Wikipedia-Logo.wine.png';
import tiktokLogo from '../assets/TikTok-Logo-2016-present.png';
import './SocialMediaLinks.css';

interface SocialMediaLinksProps {
  company: Company;
}

const SocialMediaLinks: React.FC<SocialMediaLinksProps> = ({ company }) => {
  // Generate search URLs with company details pre-filled
  const generateSearchUrl = (platform: string, companyName: string, address?: string): string => {
    const encodedName = encodeURIComponent(companyName);
    const encodedAddress = address ? encodeURIComponent(address) : '';
    
    switch (platform) {
      case 'youtube':
        return `https://www.youtube.com/results?search_query=${encodedName}`;
      
      case 'linkedin':
        return `https://www.linkedin.com/search/results/all/?keywords=${encodedName}`;
      
      case 'twitter':
        return `https://twitter.com/search?q=${encodedName}`;
      
      case 'tiktok':
        return `https://www.tiktok.com/search?q=${encodedName}`;
      
      case 'instagram':
        return `https://www.instagram.com/explore/tags/${encodedName.replace(/\s+/g, '')}`;
      
      case 'google':
        return `https://www.google.com/search?q=${encodedName}`;
      
      case 'maps':
        const query = address ? `${encodedName} ${encodedAddress}` : encodedName;
        return `https://www.google.com/maps/search/?api=1&query=${query}`;
      
      case 'reddit':
        return `https://www.reddit.com/search/?q=${encodedName}`;
      
      case 'google-alerts':
        return `https://www.google.com/alerts/create?query=${encodedName}`;
      
      case 'wikipedia':
        return `https://en.wikipedia.org/wiki/Special:Search?search=${encodedName}`;
      
      default:
        return '#';
    }
  };

  // Handle phone call
  const handlePhoneClick = (phone: string) => {
    if (phone && phone !== 'N/A') {
      // Clean the phone number (remove formatting)
      const cleanPhone = phone.replace(/[^\d]/g, '');
      window.location.href = `tel:+1${cleanPhone}`;
    }
  };

  // Social media icon configurations
  const socialIcons = [
    {
      name: 'YouTube',
      icon: Youtube,
      platform: 'youtube',
      color: '#FF0000',
      hoverColor: '#CC0000'
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      platform: 'linkedin',
      color: '#0077B5',
      hoverColor: '#005885'
    },
    {
      name: 'X (Twitter)',
      icon: XIcon,
      platform: 'twitter',
      color: '#000000',
      hoverColor: '#333333'
    },
    {
      name: 'TikTok',
      icon: 'tiktok-logo', // Special identifier for TikTok logo
      platform: 'tiktok',
      color: '#000000',
      hoverColor: '#333333'
    },
    {
      name: 'Instagram',
      icon: Instagram,
      platform: 'instagram',
      color: '#E4405F',
      hoverColor: '#d1354d'
    },
    {
      name: 'Google',
      icon: Globe,
      platform: 'google',
      color: '#4285F4',
      hoverColor: '#3367d6'
    },
    {
      name: 'Google Maps',
      icon: MapPin,
      platform: 'maps',
      color: '#34A853',
      hoverColor: '#2d8f47'
    },
    {
      name: 'Reddit',
      icon: MessageCircle, // Using MessageCircle as substitute for Reddit
      platform: 'reddit',
      color: '#FF4500',
      hoverColor: '#e03e00'
    },
    {
      name: 'Google Alerts',
      icon: Bell,
      platform: 'google-alerts',
      color: '#FBBC04',
      hoverColor: '#f1b000'
    },
    {
      name: 'Wikipedia',
      icon: 'wikipedia-logo', // Special identifier for Wikipedia logo
      platform: 'wikipedia',
      color: '#000000',
      hoverColor: '#333333'
    }
  ];

  const fullAddress = [
    company.address,
    company.city,
    company.state,
    company.postalCode
  ].filter(Boolean).join(', ');

  return (
    <div className="social-media-links">
      <h4 className="social-links-title">Quick Links & Social Media</h4>
      <div className="social-icons-grid">
        {/* Social Media Icons */}
        {socialIcons.map((social) => {
          const IconComponent = social.icon;
          return (
            <a
              key={social.platform}
              href={generateSearchUrl(social.platform, company.name, fullAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon-link"
              title={`Search ${company.name} on ${social.name}`}
              style={{
                '--icon-color': social.color,
                '--icon-hover-color': social.hoverColor,
              } as React.CSSProperties}
            >
              {social.platform === 'twitter' ? (
                <XIcon className="social-icon" size={20} />
              ) : social.platform === 'wikipedia' ? (
                <img 
                  src={wikipediaLogo} 
                  alt="Wikipedia" 
                  className="social-icon wikipedia-logo" 
                  style={{ width: '20px', height: '20px' }}
                />
              ) : social.platform === 'tiktok' ? (
                <img 
                  src={tiktokLogo} 
                  alt="TikTok" 
                  className="social-icon tiktok-logo" 
                  style={{ width: '20px', height: '20px' }}
                />
              ) : (
                <IconComponent className="social-icon" size={20} />
              )}
              <span className="social-icon-label">{social.name}</span>
            </a>
          );
        })}

        {/* Phone Icon (if phone number available) */}
        {company.phone && company.phone !== 'N/A' && (
          <button
            onClick={() => handlePhoneClick(company.phone)}
            className="social-icon-link phone-link"
            title={`Call ${company.name}`}
            style={{
              '--icon-color': '#25D366',
              '--icon-hover-color': '#1ea952',
            } as React.CSSProperties}
          >
            <Phone className="social-icon" size={20} />
            <span className="social-icon-label">Call</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default SocialMediaLinks;
