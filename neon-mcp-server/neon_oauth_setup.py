#!/usr/bin/env python3
"""
Neon OAuth/API setup for automatic database URL retrieval
"""
import requests
import json
import os
import webbrowser
from urllib.parse import urlencode
import time

class NeonAuth:
    def __init__(self):
        self.api_base = "https://console.neon.tech/api/v2"
        self.auth_base = "https://console.neon.tech"
        
    def setup_api_key(self):
        """Setup using Neon API key (easiest method)"""
        print("🔑 Neon API Key Setup")
        print("=" * 30)
        print()
        print("1. Go to: https://console.neon.tech/app/settings/api-keys")
        print("2. Click 'Create API Key'")
        print("3. Give it a name (e.g., 'Minnesota Directory MCP')")
        print("4. Copy the generated API key")
        print()
        
        api_key = input("Paste your Neon API key here: ").strip()
        
        if not api_key:
            print("❌ No API key provided")
            return None
            
        return api_key
    
    def get_projects(self, api_key):
        """Get all Neon projects"""
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json"
        }
        
        try:
            response = requests.get(f"{self.api_base}/projects", headers=headers)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"❌ Failed to fetch projects: {e}")
            return None
    
    def get_connection_uri(self, api_key, project_id, database_name="neondb"):
        """Get connection URI for a specific project"""
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json"
        }
        
        try:
            # Get project details
            response = requests.get(f"{self.api_base}/projects/{project_id}", headers=headers)
            response.raise_for_status()
            project = response.json()
            
            # Get connection URI
            response = requests.get(f"{self.api_base}/projects/{project_id}/connection_uri", 
                                  headers=headers, 
                                  params={"database_name": database_name})
            response.raise_for_status()
            connection_data = response.json()
            
            return connection_data.get("uri")
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Failed to get connection URI: {e}")
            return None

def main():
    """Main setup function"""
    print("🚀 Neon Authentication Setup for MCP Server")
    print("=" * 50)
    print()
    print("Choose authentication method:")
    print("1. API Key (Recommended - Easiest)")
    print("2. Manual URL entry")
    print()
    
    choice = input("Enter choice (1 or 2): ").strip()
    
    if choice == "1":
        auth = NeonAuth()
        
        # Get API key
        api_key = auth.setup_api_key()
        if not api_key:
            return
        
        # Get projects
        print("\n🔍 Fetching your Neon projects...")
        projects_data = auth.get_projects(api_key)
        
        if not projects_data or "projects" not in projects_data:
            print("❌ Could not fetch projects")
            return
        
        projects = projects_data["projects"]
        
        if not projects:
            print("❌ No projects found")
            return
        
        print(f"\n📋 Found {len(projects)} project(s):")
        for i, project in enumerate(projects):
            print(f"{i+1}. {project['name']} (ID: {project['id']})")
        
        if len(projects) == 1:
            selected_project = projects[0]
            print(f"\n✅ Using project: {selected_project['name']}")
        else:
            try:
                choice_idx = int(input(f"\nSelect project (1-{len(projects)}): ")) - 1
                selected_project = projects[choice_idx]
            except (ValueError, IndexError):
                print("❌ Invalid selection")
                return
        
        # Get connection URI
        print(f"\n🔗 Getting connection URI for {selected_project['name']}...")
        
        # Try common database names
        database_names = ["minnesotadirectory", "neondb", "main"]
        connection_uri = None
        
        for db_name in database_names:
            uri = auth.get_connection_uri(api_key, selected_project["id"], db_name)
            if uri:
                connection_uri = uri
                print(f"✅ Found database: {db_name}")
                break
        
        if not connection_uri:
            print("❌ Could not get connection URI")
            return
        
        # Save to .env file
        with open('.env', 'w') as f:
            f.write(f"NETLIFY_DATABASE_URL={connection_uri}\n")
            f.write(f"NEON_API_KEY={api_key}\n")
        
        print(f"\n✅ Saved connection URI to .env file!")
        print("🧪 Testing connection...")
        
        # Test the connection
        os.system("python test_server.py")
        
    elif choice == "2":
        database_url = input("\nPaste your NETLIFY_DATABASE_URL: ").strip()
        
        if database_url and database_url.startswith('postgresql://'):
            with open('.env', 'w') as f:
                f.write(f"NETLIFY_DATABASE_URL={database_url}\n")
            print("✅ Saved database URL to .env file!")
            print("🧪 Testing connection...")
            os.system("python test_server.py")
        else:
            print("❌ Invalid database URL")
    else:
        print("❌ Invalid choice")

if __name__ == "__main__":
    main()
