from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from utils.db import get_db, Session as DBSession

def get_session_id_from_request(request: Request) -> str:
    # Try to get from Authorization header (Bearer <session_id>)
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ")[1]
    
    # Try to get from cookies
    session_id = request.cookies.get("session_id")
    if session_id:
        return session_id
        
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
    )

def get_current_user_token(
    session_id: str = Depends(get_session_id_from_request),
    db: Session = Depends(get_db)
) -> str:
    session = db.query(DBSession).filter(DBSession.session_id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )
    return session.github_token
