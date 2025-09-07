#!/usr/bin/env python3
"""
User Management API Endpoints - Phase 5.2
Provides REST API access to user management, role-based access control, and audit logging.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Header
from fastapi.responses import JSONResponse
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime
import logging

# Import our user management system
from ..ai.user_management import (
    create_user, check_permission, get_user_permissions, get_audit_logs,
    get_role_permissions, user_manager, UserRole, Permission, ResourceType
)

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai/users", tags=["User Management & RBAC"])

# Pydantic models for API requests/responses
class UserCreateRequest(BaseModel):
    username: str = Field(..., description="Unique username")
    email: str = Field(..., description="User email address")
    full_name: str = Field(..., description="User's full name")
    role: str = Field(..., description="User role: student, staff, manager, admin, super_admin")
    password: Optional[str] = Field(None, description="User password (optional)")

class UserUpdateRequest(BaseModel):
    role: Optional[str] = Field(None, description="New user role")
    is_active: Optional[bool] = Field(None, description="User active status")
    full_name: Optional[str] = Field(None, description="Updated full name")
    email: Optional[str] = Field(None, description="Updated email")

class UserResponse(BaseModel):
    user_id: str
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: str
    last_login: Optional[str]
    metadata: Dict[str, Any]

class PermissionCheckRequest(BaseModel):
    username: str = Field(..., description="Username to check")
    permission: str = Field(..., description="Permission to check")

class ResourceAccessRequest(BaseModel):
    username: str = Field(..., description="Username to check")
    resource_type: str = Field(..., description="Resource type to check")
    operation: str = Field(..., description="Operation to check")

class AuditLogResponse(BaseModel):
    log_id: str
    user_id: str
    action: str
    resource: str
    resource_type: str
    timestamp: str
    ip_address: Optional[str]
    user_agent: Optional[str]
    details: Optional[Dict[str, Any]]
    success: bool

class RolePermissionsResponse(BaseModel):
    role: str
    permissions: List[str]
    resource_access: Dict[str, List[str]]
    data_scope: str

class SystemHealthResponse(BaseModel):
    status: str
    timestamp: str
    total_users: int
    active_users: int
    roles_configured: int
    audit_logs_count: int
    system_health: str

# Authentication middleware (simplified for demo)
async def get_current_user(authorization: str = Header(None)) -> str:
    """Extract username from authorization header"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    # Simple token format: "Bearer username"
    try:
        scheme, username = authorization.split(" ", 1)
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authorization scheme")
        return username
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header format")

async def require_permission(permission: Permission, current_user: str = Depends(get_current_user)):
    """Check if current user has required permission"""
    if not check_permission(current_user, permission):
        raise HTTPException(
            status_code=403, 
            detail=f"Permission denied: {permission.value} required"
        )
    return current_user

@router.post("/create", response_model=UserResponse)
async def create_new_user(
    request: UserCreateRequest,
    current_user: str = Depends(lambda u: require_permission(Permission.USER_CREATE, u))
):
    """
    Create a new user with specified role and permissions.
    
    Requires USER_CREATE permission.
    """
    try:
        logger.info(f"User creation request by {current_user} for username: {request.username}")
        
        # Validate role
        try:
            role = UserRole(request.role.lower())
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid role: {request.role}. Must be one of: {[r.value for r in UserRole]}"
            )
        
        # Create user
        user_dict = create_user(
            username=request.username,
            email=request.email,
            full_name=request.full_name,
            role=role,
            password=request.password
        )
        
        logger.info(f"User {request.username} created successfully with role {role.value}")
        
        return user_dict
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")

@router.get("/list", response_model=List[UserResponse])
async def list_users(
    role: Optional[str] = Query(None, description="Filter by role"),
    active_only: bool = Query(True, description="Show only active users"),
    current_user: str = Depends(lambda u: require_permission(Permission.USER_VIEW, u))
):
    """
    List all users, optionally filtered by role and status.
    
    Requires USER_VIEW permission.
    """
    try:
        logger.info(f"User list request by {current_user}")
        
        users = []
        for user in user_manager.users.values():
            # Apply filters
            if role and user.role.value != role.lower():
                continue
            if active_only and not user.is_active:
                continue
            
            users.append(asdict(user))
        
        logger.info(f"Returned {len(users)} users")
        return users
        
    except Exception as e:
        logger.error(f"Error listing users: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list users: {str(e)}")

@router.get("/{username}", response_model=UserResponse)
async def get_user(
    username: str,
    current_user: str = Depends(lambda u: require_permission(Permission.USER_VIEW, u))
):
    """
    Get user details by username.
    
    Requires USER_VIEW permission.
    """
    try:
        if username not in user_manager.users:
            raise HTTPException(status_code=404, detail=f"User {username} not found")
        
        user = user_manager.users[username]
        return asdict(user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user {username}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get user: {str(e)}")

@router.put("/{username}", response_model=UserResponse)
async def update_user(
    username: str,
    request: UserUpdateRequest,
    current_user: str = Depends(lambda u: require_permission(Permission.USER_UPDATE, u))
):
    """
    Update user information.
    
    Requires USER_UPDATE permission.
    """
    try:
        logger.info(f"User update request by {current_user} for user: {username}")
        
        if username not in user_manager.users:
            raise HTTPException(status_code=404, detail=f"User {username} not found")
        
        user = user_manager.users[username]
        
        # Update fields
        if request.role is not None:
            try:
                new_role = UserRole(request.role.lower())
                user_manager.update_user_role(username, new_role, current_user)
            except ValueError:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid role: {request.role}"
                )
        
        if request.is_active is not None:
            user.is_active = request.is_active
        
        if request.full_name is not None:
            user.full_name = request.full_name
        
        if request.email is not None:
            user.email = request.email
        
        logger.info(f"User {username} updated successfully")
        return asdict(user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user {username}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update user: {str(e)}")

@router.delete("/{username}")
async def deactivate_user(
    username: str,
    current_user: str = Depends(lambda u: require_permission(Permission.USER_DELETE, u))
):
    """
    Deactivate a user (soft delete).
    
    Requires USER_DELETE permission.
    """
    try:
        logger.info(f"User deactivation request by {current_user} for user: {username}")
        
        if username not in user_manager.users:
            raise HTTPException(status_code=404, detail=f"User {username} not found")
        
        success = user_manager.deactivate_user(username, current_user)
        
        if success:
            return {"message": f"User {username} deactivated successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to deactivate user")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deactivating user {username}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to deactivate user: {str(e)}")

@router.post("/permissions/check", response_model=Dict[str, Any])
async def check_user_permission(request: PermissionCheckRequest):
    """
    Check if a user has a specific permission.
    
    No authentication required for permission checking.
    """
    try:
        # Validate permission
        try:
            permission = Permission(request.permission)
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid permission: {request.permission}"
            )
        
        has_perm = check_permission(request.username, permission)
        
        return {
            "username": request.username,
            "permission": request.permission,
            "has_permission": has_perm,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking permission: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check permission: {str(e)}")

@router.post("/resources/access", response_model=Dict[str, Any])
async def check_resource_access(request: ResourceAccessRequest):
    """
    Check if a user can access a specific resource operation.
    
    No authentication required for access checking.
    """
    try:
        # Validate resource type
        try:
            resource_type = ResourceType(request.resource_type)
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid resource type: {request.resource_type}"
            )
        
        can_access = user_manager.can_access_resource(
            request.username, resource_type, request.operation
        )
        
        return {
            "username": request.username,
            "resource_type": request.resource_type,
            "operation": request.operation,
            "can_access": can_access,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking resource access: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check resource access: {str(e)}")

@router.get("/permissions/{username}", response_model=List[str])
async def get_user_permissions_list(
    username: str,
    current_user: str = Depends(lambda u: require_permission(Permission.USER_VIEW, u))
):
    """
    Get all permissions for a specific user.
    
    Requires USER_VIEW permission.
    """
    try:
        permissions = get_user_permissions(username)
        return permissions
        
    except Exception as e:
        logger.error(f"Error getting permissions for {username}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get user permissions: {str(e)}")

@router.get("/roles/{role}/permissions", response_model=RolePermissionsResponse)
async def get_role_permissions_info(
    role: str,
    current_user: str = Depends(lambda u: require_permission(Permission.ROLE_MANAGE, u))
):
    """
    Get detailed permissions for a specific role.
    
    Requires ROLE_MANAGE permission.
    """
    try:
        # Validate role
        try:
            user_role = UserRole(role.lower())
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid role: {role}"
            )
        
        role_info = get_role_permissions(user_role)
        
        if not role_info:
            raise HTTPException(status_code=404, detail=f"Role {role} not found")
        
        return role_info
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting role permissions for {role}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get role permissions: {str(e)}")

@router.get("/audit/logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    username: Optional[str] = Query(None, description="Filter by username"),
    limit: int = Query(100, description="Maximum number of logs to return"),
    current_user: str = Depends(lambda u: require_permission(Permission.AUDIT_LOGS, u))
):
    """
    Get audit logs for system activities.
    
    Requires AUDIT_LOGS permission.
    """
    try:
        logs = get_audit_logs(username, limit)
        return logs
        
    except Exception as e:
        logger.error(f"Error getting audit logs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get audit logs: {str(e)}")

@router.get("/system/health", response_model=SystemHealthResponse)
async def get_system_health(
    current_user: str = Depends(lambda u: require_permission(Permission.SYSTEM_HEALTH, u))
):
    """
    Get system health and user statistics.
    
    Requires SYSTEM_HEALTH permission.
    """
    try:
        total_users = len(user_manager.users)
        active_users = sum(1 for u in user_manager.users.values() if u.is_active)
        roles_configured = len(user_manager.role_permissions)
        audit_logs_count = len(user_manager.audit_logs)
        
        # Determine system health
        if total_users > 0 and active_users / total_users > 0.8:
            system_health = "excellent"
        elif total_users > 0 and active_users / total_users > 0.6:
            system_health = "good"
        elif total_users > 0 and active_users / total_users > 0.4:
            system_health = "fair"
        else:
            system_health = "poor"
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "total_users": total_users,
            "active_users": active_users,
            "roles_configured": roles_configured,
            "audit_logs_count": audit_logs_count,
            "system_health": system_health
        }
        
    except Exception as e:
        logger.error(f"Error getting system health: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get system health: {str(e)}")

@router.post("/authenticate")
async def authenticate_user(username: str, password: str):
    """
    Authenticate user with username and password.
    
    Returns user information and permissions if successful.
    """
    try:
        user = user_manager.authenticate_user(username, password)
        
        if user:
            permissions = get_user_permissions(username)
            return {
                "authenticated": True,
                "user": asdict(user),
                "permissions": permissions,
                "message": "Authentication successful"
            }
        else:
            return {
                "authenticated": False,
                "message": "Invalid credentials"
            }
        
    except Exception as e:
        logger.error(f"Error during authentication: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")

@router.get("/roles", response_model=List[str])
async def get_available_roles():
    """
    Get list of available user roles.
    
    No authentication required.
    """
    try:
        return [role.value for role in UserRole]
        
    except Exception as e:
        logger.error(f"Error getting roles: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get roles: {str(e)}")

@router.get("/permissions", response_model=List[str])
async def get_available_permissions():
    """
    Get list of available system permissions.
    
    No authentication required.
    """
    try:
        return [perm.value for perm in Permission]
        
    except Exception as e:
        logger.error(f"Error getting permissions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get permissions: {str(e)}")

# Note: Exception handlers should be registered on the FastAPI app, not APIRouter
