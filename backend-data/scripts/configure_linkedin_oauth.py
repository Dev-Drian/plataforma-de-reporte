#!/usr/bin/env python
"""
Script para configurar y validar LinkedIn OAuth 2.0
Guía paso a paso para obtener el authorization code y tokens
"""

import sys
import os
import asyncio
import json
from urllib.parse import urlencode, parse_qs, urlparse

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.config import settings
from app.api.oauth.linkedin.functions import (
    generate_linkedin_auth_url,
    exchange_linkedin_code_for_token,
    get_linkedin_user_info,
    get_linkedin_access_token
)


def print_header(text: str):
    """Print formatted header"""
    print(f"\n{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}\n")


async def main():
    print_header("LinkedIn OAuth 2.0 Configuration")
    
    # Load configuration
    client_id = settings.LINKEDIN_CLIENT_ID
    client_secret = settings.LINKEDIN_CLIENT_SECRET
    
    if not client_id or not client_secret:
        print("❌ ERROR: LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET not set in .env")
        print("\nPlease set the following environment variables in infrastructure/.env:")
        print("  LINKEDIN_CLIENT_ID=7828fyexpeo40b")
        print("  LINKEDIN_CLIENT_SECRET=WPL_AP1.qQOn6uXaX8yByZYB.39uVRw==")
        return
    
    print("✅ Credentials loaded successfully")
    print(f"   Client ID: {client_id[:20]}...")
    
    # Step 1: Generate Authorization URL
    print_header("Step 1: Generate Authorization URL")
    
    redirect_uri = "http://localhost:4000/api/oauth/callback/linkedin"
    scopes = ["openid", "profile", "email"]
    
    auth_url = generate_linkedin_auth_url(
        client_id=client_id,
        redirect_uri=redirect_uri,
        scopes=scopes
    )
    
    print(f"✅ Authorization URL generated")
    print(f"\nOpen this URL in your browser:")
    print(f"  {auth_url}\n")
    
    print("After authorizing, you'll be redirected with a code in the URL.")
    print("Copy the 'code' parameter from the URL and paste it here:")
    
    authorization_code = input("\nAuthorization Code: ").strip()
    
    if not authorization_code:
        print("❌ No authorization code provided")
        return
    
    # Step 2: Exchange code for token
    print_header("Step 2: Exchange Authorization Code for Token")
    
    try:
        token_response = await exchange_linkedin_code_for_token(
            client_id=client_id,
            client_secret=client_secret,
            code=authorization_code,
            redirect_uri=redirect_uri
        )
        
        print("✅ Token exchange successful!")
        print(f"\nToken Response:")
        print(json.dumps(token_response, indent=2))
        
        access_token = token_response.get("access_token")
        expires_in = token_response.get("expires_in", 5184000)
        
        print(f"\n📊 Token Information:")
        print(f"   Token Type: {token_response.get('token_type', 'Bearer')}")
        print(f"   Expires In: {expires_in} seconds ({expires_in // 3600 // 24} days)")
        print(f"   Scopes: {token_response.get('scope')}")
        
        # Step 3: Get user information
        print_header("Step 3: Get User Information")
        
        user_info = await get_linkedin_user_info(access_token)
        print("✅ User information retrieved!")
        print(f"\nUser Info:")
        print(json.dumps(user_info, indent=2))
        
        # Step 4: Test Client Credentials Flow (opcional)
        print_header("Step 4: Test Client Credentials Flow (Server-to-Server)")
        
        try:
            credentials_token = await get_linkedin_access_token(
                client_id=client_id,
                client_secret=client_secret
            )
            print("✅ Client Credentials token obtained!")
            print(f"\nToken Info:")
            print(json.dumps(credentials_token, indent=2))
        except Exception as e:
            print(f"⚠️  Client Credentials flow not available: {str(e)}")
            print("   (This may be expected - verify your app has access to this grant type)")
        
        # Final Summary
        print_header("Configuration Summary")
        
        print("✅ LinkedIn OAuth 2.0 is properly configured!")
        print("\n📝 Credentials to save in the system:")
        print(f"   Client ID: {client_id}")
        print(f"   Client Secret: {client_secret[:20]}...")
        print(f"   Redirect URI: {redirect_uri}")
        print(f"   Scopes: {', '.join(scopes)}")
        print(f"\n   Access Token (Sample): {access_token[:30]}...")
        print(f"   Token Expires In: {expires_in} seconds")
        
        print("\n🔐 Security Notes:")
        print("   • Store tokens securely (encrypted in database)")
        print("   • Refresh tokens are NOT supported by LinkedIn")
        print("   • Tokens expire in 2 months (5,184,000 seconds)")
        print("   • Re-authorize the app when tokens expire")
        
    except Exception as e:
        print(f"❌ Error during token exchange: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
