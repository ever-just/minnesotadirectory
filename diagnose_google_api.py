#!/usr/bin/env python3
"""
Google Maps API Diagnostic Tool
Identifies specific configuration issues
"""
import requests
import json

def test_google_api():
    api_key = 'AIzaSyDtR2sZLXQ4l-P33jS70r9OEQFStSa3ikA'
    
    print("🔍 GOOGLE MAPS API DIAGNOSTIC")
    print("=" * 60)
    print(f"🔑 API Key: {api_key[:20]}...{api_key[-10:]}")
    
    # Test 1: Simple geocoding request
    print("\n📍 TEST 1: Basic Geocoding Request")
    url = 'https://maps.googleapis.com/maps/api/geocode/json'
    params = {
        'address': '1600 Amphitheatre Parkway, Mountain View, CA',
        'key': api_key
    }
    
    try:
        response = requests.get(url, params=params)
        data = response.json()
        
        print(f"   HTTP Status: {response.status_code}")
        print(f"   API Status: {data.get('status', 'UNKNOWN')}")
        
        if data.get('error_message'):
            print(f"   ❌ Error: {data['error_message']}")
        elif data.get('status') == 'OK':
            print(f"   ✅ Success! API working correctly")
            return True
        else:
            print(f"   ❓ Unexpected status: {data.get('status')}")
            
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
    
    # Test 2: Check specific error types
    print(f"\n🔍 ERROR ANALYSIS:")
    status = data.get('status', '')
    error_msg = data.get('error_message', '')
    
    if status == 'REQUEST_DENIED':
        if 'API key not valid' in error_msg:
            print("   🚨 ISSUE: Invalid API Key")
            print("   💡 FIX: Regenerate API key in Google Cloud Console")
            
        elif 'API project is not authorized' in error_msg:
            print("   🚨 ISSUE: API Not Enabled for Project")
            print("   💡 FIX: Enable Geocoding API in Google Cloud Console")
            print("   📝 Steps:")
            print("      1. Go to APIs & Services → Library")
            print("      2. Search 'Geocoding API'")
            print("      3. Click Enable (wait 2-3 minutes)")
            
        elif 'referrer' in error_msg.lower():
            print("   🚨 ISSUE: API Key has HTTP referrer restrictions")
            print("   💡 FIX: Remove referrer restrictions or add your domain")
            
        elif 'IP address' in error_msg:
            print("   🚨 ISSUE: API Key has IP address restrictions")
            print("   💡 FIX: Remove IP restrictions or add your IP")
            
        else:
            print("   🚨 ISSUE: Generic REQUEST_DENIED error")
            print("   💡 POSSIBLE FIXES:")
            print("      - Check API key restrictions")
            print("      - Verify billing is enabled")
            print("      - Check project permissions")
            
    elif status == 'OVER_DAILY_LIMIT':
        print("   🚨 ISSUE: Daily quota exceeded")
        print("   💡 FIX: Increase quota or wait until tomorrow")
        
    elif status == 'OVER_QUERY_LIMIT':
        print("   🚨 ISSUE: Query rate limit exceeded")
        print("   💡 FIX: Slow down requests or increase quota")
        
    elif status == 'UNKNOWN_ERROR':
        print("   🚨 ISSUE: Server error")
        print("   💡 FIX: Try again later")
    
    # Test 3: Check if billing is enabled
    print(f"\n💳 TEST 2: Billing Check")
    print("   ℹ️  Geocoding API requires billing to be enabled")
    print("   📝 To check billing:")
    print("      1. Go to Google Cloud Console")
    print("      2. Navigate to Billing")
    print("      3. Ensure project is linked to billing account")
    print("      4. Verify billing account is active")
    
    # Test 4: API key restrictions
    print(f"\n🔒 TEST 3: API Key Restrictions Check")
    print("   📝 To check/fix restrictions:")
    print("      1. Go to APIs & Services → Credentials")
    print("      2. Click your API key")
    print("      3. Check 'Application restrictions':")
    print("         - NONE = No restrictions (recommended for testing)")
    print("         - HTTP referrers = Must add your domain")
    print("         - IP addresses = Must add your IP")
    print("      4. Check 'API restrictions':")
    print("         - Should include 'Geocoding API'")
    
    return False

def get_recommended_fixes():
    print(f"\n🛠️  RECOMMENDED QUICK FIXES:")
    print("=" * 60)
    print("1. 🔓 REMOVE ALL API KEY RESTRICTIONS (for testing):")
    print("   - Go to Console → APIs & Services → Credentials")
    print("   - Edit your API key")
    print("   - Set Application restrictions to 'None'")
    print("   - Save and wait 1-2 minutes")
    
    print("\n2. 💳 VERIFY BILLING:")
    print("   - Go to Console → Billing")
    print("   - Link project to billing account")
    print("   - Ensure billing account is active")
    
    print("\n3. ⚡ TEST IMMEDIATELY:")
    print("   python diagnose_google_api.py")
    
    print("\n4. 🚀 IF FIXED, RUN GEOCODING:")
    print("   cd neon-mcp-server")
    print("   export GOOGLE_MAPS_API_KEY='AIzaSyDtR2sZLXQ4l-P33jS70r9OEQFStSa3ikA'")
    print("   python ultra_fast_parallel_geocoder.py")

if __name__ == "__main__":
    success = test_google_api()
    if not success:
        get_recommended_fixes()
    else:
        print(f"\n🎉 API WORKING! Ready to geocode remaining companies!")
        print(f"🚀 Run: cd neon-mcp-server && python ultra_fast_parallel_geocoder.py")

