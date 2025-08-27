import { useState, useEffect } from 'react';
import { Globe, FileText, ExternalLink, ChevronDown, ChevronRight, Loader2, Folder, FolderOpen, File, Home } from 'lucide-react';
import { WebsiteStructureService, WebsiteStructure, SiteMapNode, WebsitePage, Subdomain, ProgressCallback } from '../services/WebsiteStructureService';

interface WebsiteStructureProps {
  companyUrl: string;
  companyName: string;
}

const WebsiteStructureComponent = ({ companyUrl, companyName }: WebsiteStructureProps) => {
  const [structure, setStructure] = useState<WebsiteStructure | null>(null);
  const [loading, setLoading] = useState(false);
  const [siteMap, setSiteMap] = useState<SiteMapNode | null>(null);
  const [showSubdomains, setShowSubdomains] = useState(false);
  const [progressText, setProgressText] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [discoveredPages, setDiscoveredPages] = useState<WebsitePage[]>([]);
  const [discoveredSubdomains, setDiscoveredSubdomains] = useState<Subdomain[]>([]);

  useEffect(() => {
    if (companyUrl) {
      fetchWebsiteStructure();
    }
  }, [companyUrl]);

  const fetchWebsiteStructure = async () => {
    if (!companyUrl) return;
    
    setLoading(true);
    setProgressText('Initializing analysis...');
    setProgressPercent(0);
    setDiscoveredPages([]);
    setDiscoveredSubdomains([]);
    setSiteMap(null);
    
    // Progress callbacks for real-time updates
    const callbacks: ProgressCallback = {
      onPageFound: (page: WebsitePage) => {
        setDiscoveredPages(prev => {
          const updated = [...prev, page];
          // Build sitemap incrementally
          const newSiteMap = WebsiteStructureService.buildSiteMap(updated);
          setSiteMap(newSiteMap);
          return updated;
        });
      },
      onSubdomainFound: (subdomain: Subdomain) => {
        setDiscoveredSubdomains(prev => [...prev, subdomain]);
      },
      onSitemapFound: (sitemapUrl: string) => {
        setProgressText(`Found sitemap: ${new URL(sitemapUrl).pathname}`);
      },
      onProgress: (status: string, completed: number, total?: number) => {
        setProgressText(status);
        setProgressPercent(completed);
      },
      onError: (error: string) => {
        console.error('Real-time analysis error:', error);
      }
    };
    
    try {
      const result = await WebsiteStructureService.analyzeWebsiteRealTime(companyUrl, callbacks);
      setStructure(result);
      
      // Final sitemap build with all discovered pages
      if (result.pages.length > 0) {
        const siteMapTree = WebsiteStructureService.buildSiteMap(result.pages);
        setSiteMap(siteMapTree);
      }
    } catch (error) {
      console.error('Failed to analyze website structure:', error);
      setStructure({
        domain: companyUrl.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0],
        pages: discoveredPages,
        subdomains: discoveredSubdomains,
        totalPages: discoveredPages.length,
        lastUpdated: new Date().toISOString(),
        error: 'Unable to analyze website structure. This may be due to CORS restrictions or the website not having a public sitemap.'
      });
      setSiteMap(null);
    } finally {
      setLoading(false);
      setProgressText('');
      setProgressPercent(100);
    }
  };

  const toggleNode = (node: SiteMapNode) => {
    node.isExpanded = !node.isExpanded;
    setSiteMap({ ...siteMap! }); // Force re-render
  };

  const renderSiteMapNode = (node: SiteMapNode): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const isDirectory = hasChildren || !node.page;
    const indent = node.level * 20;

    return (
      <div key={node.path} className="sitemap-node">
        <div 
          className="sitemap-node-content" 
          style={{ paddingLeft: `${indent}px` }}
        >
          <div className="node-main">
            {hasChildren && (
              <button
                className="expand-button"
                onClick={() => toggleNode(node)}
                aria-label={node.isExpanded ? 'Collapse' : 'Expand'}
              >
                {node.isExpanded ? 
                  <ChevronDown size={14} /> : 
                  <ChevronRight size={14} />
                }
              </button>
            )}
            
            {!hasChildren && <div className="expand-spacer" />}
            
            <div className="node-icon">
              {node.path === '/' && node.page ? (
                <Home size={16} className="home-icon" />
              ) : isDirectory ? (
                node.isExpanded ? 
                  <FolderOpen size={16} className="folder-icon" /> :
                  <Folder size={16} className="folder-icon" />
              ) : (
                <File size={16} className="file-icon" />
              )}
            </div>

            <div className="node-info">
              <span className="node-name" title={node.page ? node.page.url : node.path}>
                {node.name}
              </span>
              
              {node.page && (
                <div className="node-metadata">
                  {node.priority && (
                    <span className="priority-badge">
                      Priority: {node.priority}
                    </span>
                  )}
                  {node.lastModified && (
                    <span className="last-modified">
                      Modified: {new Date(node.lastModified).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
            </div>

            {node.page && (
              <a
                href={node.page.url}
                target="_blank"
                rel="noopener noreferrer"
                className="visit-link"
                title={`Visit ${node.page.url}`}
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>

        {hasChildren && node.isExpanded && (
          <div className="node-children">
            {node.children.map(child => renderSiteMapNode(child))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="sitemap-directory-card">
        <div className="directory-loading">
          <Loader2 size={20} className="animate-spin" />
          <div className="loading-content">
            <h3>Discovering Website Directory</h3>
            <p>{progressText || 'Parsing sitemap and building site structure...'}</p>
            
            {/* Progress bar */}
            <div className="progress-bar-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="progress-text">{progressPercent}%</span>
            </div>
            
            {/* Real-time discovered content */}
            {(discoveredPages.length > 0 || discoveredSubdomains.length > 0) && (
              <div className="discovery-stats">
                {discoveredPages.length > 0 && (
                  <span className="discovery-stat">
                    📄 {discoveredPages.length} pages found
                  </span>
                )}
                {discoveredSubdomains.length > 0 && (
                  <span className="discovery-stat">
                    🌐 {discoveredSubdomains.length} subdomains found
                  </span>
                )}
              </div>
            )}
            
            {/* Show discovered sitemap tree in real-time */}
            {siteMap && discoveredPages.length > 0 && (
              <div className="real-time-preview">
                <h4>Live Directory Preview:</h4>
                <div className="mini-tree">
                  {renderSiteMapNode(siteMap)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!structure) return null;

  if (structure.error) {
    return (
      <div className="sitemap-directory-card">
        <div className="directory-header">
          <div className="header-content">
            <Globe size={20} className="header-icon" />
            <div className="header-text">
              <h3>Website Directory</h3>
              <p className="header-subtitle">Unable to access sitemap structure</p>
            </div>
          </div>
        </div>
        
        <div className="directory-error">
          <div className="error-content">
            <p className="error-message">{structure.error}</p>
            <div className="error-help">
              <p><strong>Common Issues:</strong></p>
              <ul>
                <li>Website doesn't have a public sitemap.xml file</li>
                <li>CORS (Cross-Origin) security restrictions</li>
                <li>Private or restricted sitemap access</li>
                <li>Dynamic content that isn't indexed in sitemap</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasPages = structure.pages.length > 0;
  const hasSubdomains = structure.subdomains.length > 0;
  const siteStats = siteMap ? WebsiteStructureService.countTotalNodes(siteMap) : { directories: 0, pages: 0 };

  return (
    <div className="sitemap-directory-card">
      <div className="directory-header">
        <div className="header-content">
          <Globe size={20} className="header-icon" />
          <div className="header-text">
            <h3>Website Directory</h3>
            <p className="header-subtitle">Site directory structure</p>
          </div>
        </div>
        
        <div className="directory-stats">
          {hasPages && (
            <>
              <div className="stat">
                <span className="stat-value">{structure.totalPages}</span>
                <span className="stat-label">Total Pages</span>
              </div>
              <div className="stat">
                <span className="stat-value">{siteStats.directories}</span>
                <span className="stat-label">Directories</span>
              </div>

            </>
          )}
          {hasSubdomains && (
            <div className="stat">
              <span className="stat-value">{structure.subdomains.length}</span>
              <span className="stat-label">Subdomains</span>
            </div>
          )}
        </div>
      </div>

      {structure.sitemapUrl && (
        <div className="sitemap-source">
          <FileText size={14} className="sitemap-icon" />
          <span className="source-label">Source:</span>
          <a 
            href={structure.sitemapUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="source-link"
          >
            {new URL(structure.sitemapUrl).pathname} <ExternalLink size={12} />
          </a>
        </div>
      )}

      {hasPages && siteMap && (
        <div className="directory-tree">
          <div className="tree-container">
            {renderSiteMapNode(siteMap)}
          </div>
        </div>
      )}

      {hasSubdomains && (
        <div className="subdomains-section">
          <button
            className="subdomains-header"
            onClick={() => setShowSubdomains(!showSubdomains)}
          >
            <div className="subdomains-title">
              <Globe size={16} />
              <span>Subdomains ({structure.subdomains.length})</span>
            </div>
            {showSubdomains ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          
          {showSubdomains && (
            <div className="subdomains-list">
              {structure.subdomains.map(subdomain => (
                <div key={subdomain.domain} className="subdomain-item">
                  <div className="subdomain-details">
                    <Globe size={14} className="subdomain-icon" />
                    <span className="subdomain-name">{subdomain.domain}</span>
                    <span className="subdomain-status">Active</span>
                  </div>
                  <a 
                    href={`https://${subdomain.domain}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="subdomain-link"
                    title={`Visit ${subdomain.domain}`}
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!hasPages && !hasSubdomains && (
        <div className="no-directory-data">
          <div className="no-data-content">
            <FileText size={48} className="no-data-icon" />
            <h4>No Directory Structure Available</h4>
            <p>Unable to discover the website directory structure for <strong>{companyName}</strong></p>
            <div className="suggestions">
              <p>This could mean:</p>
              <ul>
                <li>The website doesn't publish a sitemap.xml file</li>
                <li>The sitemap is private or requires authentication</li>
                <li>The website uses dynamic routing without a traditional sitemap</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="directory-footer">
        <div className="footer-info">
          <span className="scan-date">Scanned: {new Date(structure.lastUpdated).toLocaleDateString()}</span>
          <span className="footer-note">Website directory structure • Sitemap analysis</span>
        </div>
      </div>
    </div>
  );
};

export default WebsiteStructureComponent;
