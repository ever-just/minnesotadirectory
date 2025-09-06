#!/usr/bin/env python3
"""
Get Neon database connection details using correct API endpoints
"""
import requests
import json

def get_neon_connection_details(api_key):
    """Get all project details to build connection URI"""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json"
    }
    
    try:
        # Get projects
        response = requests.get("https://console.neon.tech/api/v2/projects", headers=headers)
        response.raise_for_status()
        projects_data = response.json()
        
        if not projects_data or "projects" not in projects_data:
            print("❌ No projects found")
            return None
        
        project = projects_data["projects"][0]  # Use first project
        project_id = project["id"]
        
        print(f"✅ Found project: {project['name']} (ID: {project_id})")
        
        # Get project details including connection info
        response = requests.get(f"https://console.neon.tech/api/v2/projects/{project_id}", headers=headers)
        response.raise_for_status()
        project_details = response.json()["project"]
        
        # Get databases
        response = requests.get(f"https://console.neon.tech/api/v2/projects/{project_id}/databases", headers=headers)
        response.raise_for_status()
        databases = response.json()["databases"]
        
        if not databases:
            print("❌ No databases found")
            return None
            
        database = databases[0]  # Use first database
        print(f"✅ Found database: {database['name']}")
        
        # Get the connection details from the project
        connection_details = project_details.get("connection_uris", [])
        if connection_details:
            # Use the first connection URI
            connection_uri = connection_details[0]["connection_uri"]
            print(f"✅ Connection URI found!")
            return connection_uri
            
        # If no direct connection URI, build it from project details
        # Get the endpoint info
        default_branch = project_details.get("default_branch_id")
        endpoints = project_details.get("endpoints", [])
        
        if not endpoints:
            print("❌ No endpoints found")
            return None
            
        endpoint = endpoints[0]  # Use first endpoint
        host = endpoint["host"]
        
        # Get role (username)
        response = requests.get(f"https://console.neon.tech/api/v2/projects/{project_id}/branches/{default_branch}/roles", headers=headers)
        response.raise_for_status()
        roles = response.json()["roles"]
        
        if not roles:
            print("❌ No roles found")
            return None
            
        role = roles[0]  # Use first role
        username = role["name"]
        
        print(f"✅ Connection details:")
        print(f"   Host: {host}")
        print(f"   Username: {username}")
        print(f"   Database: {database['name']}")
        
        # We can't get the password via API for security reasons
        print("\n⚠️  Note: Password cannot be retrieved via API for security.")
        print("    You'll need to get it from your Neon dashboard or reset it.")
        
        # Build partial connection string
        partial_uri = f"postgresql://{username}:<PASSWORD>@{host}/{database['name']}?sslmode=require"
        print(f"\n�� Connection string template:")
        print(f"   {partial_uri}")
        
        return partial_uri
        
    except requests.exceptions.RequestException as e:
        print(f"❌ API Error: {e}")
        return None

# Use the API key from previous run
api_key = "napi_s1wutc5fxn58kbyhj8h0z9dcfm3km6662ueet3c526yinw3zzj9c7jxqn3abwfme"

print("🔍 Getting detailed connection information...")
connection_uri = get_neon_connection_details(api_key)

if connection_uri:
    print("\n💡 To complete setup:")
    print("1. Go to: https://console.neon.tech/app/projects")
    print("2. Select your project")
    print("3. Go to 'Connection Details' or 'Database'")
    print("4. Find/reset your password")
    print("5. Replace <PASSWORD> in the connection string above")
    print("6. Create .env file: echo 'NETLIFY_DATABASE_URL=your_full_connection_string' > .env")
