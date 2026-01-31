"""Authentication and authorization dependencies for FastAPI routes."""

import os
from typing import Dict, List, Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError

from api.supabase_client import get_supabase


# OAuth2 scheme that reads Bearer token from Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, str]:
    """Get the current authenticated user from JWT token.
    
    Decodes the JWT, extracts the user ID from the 'sub' claim,
    and fetches the user's role from the profiles table.
    
    Args:
        token: Bearer token from Authorization header.
    
    Returns:
        Dict with user_id (UUID) and role.
    
    Raises:
        HTTPException: 401 if token is missing or invalid.
        HTTPException: 404 if user profile doesn't exist.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token is missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get JWT secret from environment
    jwt_secret = os.environ.get("SUPABASE_JWT_SECRET")
    if not jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT secret not configured",
        )
    
    # Decode the JWT
    try:
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False}  # Supabase JWTs may not have audience
        )
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Query the profiles table to get user's role
    supabase = get_supabase()
    try:
        response = supabase.table("profiles").select("role").eq("id", user_id).single().execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found",
            )
        
        role = response.data.get("role", "viewer")
        
    except Exception as e:
        # If it's already an HTTPException, re-raise it
        if isinstance(e, HTTPException):
            raise
        # Otherwise, profile doesn't exist
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found",
        )
    
    return {
        "user_id": user_id,
        "role": role
    }


def require_role(*allowed_roles: str) -> Callable:
    """Factory that creates a dependency requiring specific role(s).
    
    Usage:
        @app.get("/admin-only")
        async def admin_endpoint(user = Depends(require_role("admin"))):
            ...
        
        @app.get("/admin-or-analyst")
        async def privileged_endpoint(user = Depends(require_role("admin", "analyst"))):
            ...
    
    Args:
        *allowed_roles: One or more role strings that are allowed access.
    
    Returns:
        A FastAPI dependency function that checks the user's role.
    """
    async def role_checker(
        current_user: Dict[str, str] = Depends(get_current_user)
    ) -> Dict[str, str]:
        """Check if the current user has one of the allowed roles."""
        user_role = current_user.get("role")
        
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {', '.join(allowed_roles)}. Your role: {user_role}",
            )
        
        return current_user
    
    return role_checker
