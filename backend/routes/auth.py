from dotenv import load_dotenv
load_dotenv()

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import RedirectResponse
import httpx
import os
import urllib.parse
from sqlalchemy.orm import Session
from utils.db import get_db, Session as DBSession
from models.schemas import AuthResponse
from utils.auth_helpers import get_session_id_from_request

router = APIRouter(prefix="/auth", tags=["auth"])

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
print(f"CLIENT_ID loaded: {os.getenv('GITHUB_CLIENT_ID', 'NOT FOUND')}")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
GITHUB_REDIRECT_URI = os.getenv("GITHUB_REDIRECT_URI")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5500")

@router.get("/me")
async def get_current_user_profile(
    session_id: str = Depends(get_session_id_from_request),
    db: Session = Depends(get_db)
):
    session = db.query(DBSession).filter(DBSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
        
    email = None
    if session.github_token:
        try:
            headers = {
                "Authorization": f"Bearer {session.github_token}",
                "Accept": "application/vnd.github.v3+json"
            }
            async with httpx.AsyncClient() as client:
                user_res = await client.get("https://api.github.com/user", headers=headers, timeout=5.0)
                if user_res.status_code == 200:
                    email = user_res.json().get("email")
                
                if not email:
                    emails_res = await client.get("https://api.github.com/user/emails", headers=headers, timeout=5.0)
                    if emails_res.status_code == 200:
                        emails = emails_res.json()
                        primary = next((e for e in emails if e.get("primary")), None)
                        if primary:
                            email = primary.get("email")
                        elif emails:
                            email = emails[0].get("email")
        except Exception as e:
            print(f"Error fetching user email: {e}")
            
    return {
        "username": session.github_username or "Unknown User",
        "email": email or f"{session.github_username or 'user'}@users.noreply.github.com"
    }

@router.get("/github")
def github_login():
    print("=== /auth/github CALLED ===")
    if not GITHUB_CLIENT_ID:
        # Fallback for demo if env vars are missing
        print("GITHUB_CLIENT_ID missing, returning demo fallback")
        return RedirectResponse(f"{FRONTEND_URL}/frontend/dashboard.html?session_id=demo_session")
        
    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": GITHUB_REDIRECT_URI,
        "scope": "repo read:user",
        "response_type": "code",
    }
    url = f"https://github.com/login/oauth/authorize?{urllib.parse.urlencode(params)}"
    print(f"REDIRECTING TO URL: {url}")
    print(f"USING REDIRECT_URI PARAM: {GITHUB_REDIRECT_URI}")
    return RedirectResponse(url)

@router.get("/github/callback")
async def github_callback(code: str, db: Session = Depends(get_db)):
    print("=== /auth/github/callback CALLED ===")
    print(f"Received authorization code: {code}")
    if not code:
        raise HTTPException(status_code=400, detail="Code not provided")
        
    async with httpx.AsyncClient() as client:
        # Exchange code for token
        token_response = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": GITHUB_REDIRECT_URI,
            },
            headers={"Accept": "application/json"}
        )
        token_data = token_response.json()
        access_token = token_data.get("access_token")
        
        if not access_token:
            raise HTTPException(status_code=400, detail="Failed to get access token")
            
        # Get user info
        user_response = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json"
            }
        )
        user_data = user_response.json()
        username = user_data.get("login")
        
    # Create session
    new_session = DBSession(github_token=access_token, github_username=username)
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    # Redirect to frontend with session ID
    return RedirectResponse(f"{FRONTEND_URL}/frontend/dashboard.html?session_id={new_session.session_id}")
