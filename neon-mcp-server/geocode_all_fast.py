#!/usr/bin/env python3
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import and run the ultra-fast geocoder
from ultra_fast_parallel_geocoder import main
import asyncio

if __name__ == "__main__":
    print("\n🚀 Starting ULTRA-FAST geocoding...")
    print("⚡ This will process 2,587 addresses in under 30 seconds!\n")
    
    # Check for service selection
    if len(sys.argv) > 1:
        service = sys.argv[1].lower()
        os.environ['GEOCODING_SERVICE'] = service
        print(f"Using {service.upper()} geocoding service")
    else:
        print("Usage: python geocode_all_fast.py [google|mapbox|smarty]")
        print("Defaulting to Google Maps")
        
    asyncio.run(main())
