# Favicon Assets - Generation Required

## ⚠️ Action Required: Generate Favicon Files

The HTML head and configuration files have been set up for comprehensive favicon support, but the actual image files need to be generated from your Minnesota Directory branding/logo.

## Required Favicon Files

You need to create these files in the `public/` directory:

### Core Favicon Files
- `favicon.ico` (16x16, 32x32 multi-size) - Replace or supplement existing favicon.svg
- `favicon-16x16.png` - 16×16 PNG version  
- `favicon-32x32.png` - 32×32 PNG version

### Mobile and PWA Icons
- `apple-touch-icon.png` - 180×180 for iOS Safari
- `android-chrome-192x192.png` - 192×192 for Android Chrome
- `android-chrome-512x512.png` - 512×512 for Android Chrome  
- `mstile-150x150.png` - 150×150 for Windows tiles

### Social Media Images (Optional but Recommended)
- `og-image.png` - 1200×630 for Open Graph (Facebook, LinkedIn)
- `twitter-image.png` - 1200×600 for Twitter Cards

## How to Generate These Files

### Option 1: Use Online Favicon Generators (Recommended)
1. **[RealFaviconGenerator](https://realfavicongenerator.net/)**
   - Upload your logo (512×512 recommended)
   - Download the generated package
   - Extract all files to `public/` directory

2. **[favicon.io](https://favicon.io/)**
   - Simple interface for quick generation
   - Supports text-to-icon, image-to-icon, and emoji options

### Option 2: Manual Creation
Use design software like:
- Adobe Illustrator/Photoshop
- Figma
- Canva Pro
- GIMP (free)

## Current Status

✅ **HTML head configured** - All favicon links are ready
✅ **PWA manifest created** - References all icon sizes  
✅ **Browser config created** - Windows tile configuration ready
⚠️ **Image files missing** - Need to be generated from your branding

## Design Recommendations

### Logo Requirements
- **High contrast** - Works well at small sizes (16×16)
- **Simple design** - Avoid fine details that blur at small sizes  
- **Square format** - Will be cropped to square for most formats
- **Scalable** - Should look good from 16×16 to 512×512

### Brand Colors
The current configuration uses:
- **Background**: `#ffffff` (white)
- **Theme**: `#2b5797` (blue) - Update to match your brand colors

### File Size Optimization
- Keep individual favicon files under 32KB
- Use PNG for detailed icons, ICO for simple designs
- Optimize images for web (tools like TinyPNG)

## Testing After Generation

Once you've added the favicon files:

1. **Clear browser cache completely**
2. **Test in multiple browsers** (Chrome, Firefox, Safari, Edge)
3. **Test mobile "Add to Home Screen"** (iOS Safari, Android Chrome)  
4. **Verify manifest validation** at [PWA Builder](https://www.pwabuilder.com/)
5. **Check favicon in bookmarks**

## Placeholder Status

Currently, your site references favicon files that don't exist yet. Browsers will show:
- Default browser icon in tabs
- Missing icon warnings in browser console
- Broken images for PWA installation prompts

This won't break functionality, but should be resolved for production deployment.

## Next Steps

1. Create or commission a Minnesota Directory logo
2. Generate all required favicon formats
3. Replace existing `favicon.svg` with branded version  
4. Test across devices and browsers
5. Update brand colors in `site.webmanifest` and `browserconfig.xml` if needed
