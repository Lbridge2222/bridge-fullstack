#!/usr/bin/env python3
"""
Advanced User Management System - Phase 5.2
Provides Role-Based Access Control (RBAC) for AI features and PII operations.
"""

import hashlib
import secrets
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum
from functools import wraps

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class UserRole(Enum):
    """User roles with different permission levels"""
    STUDENT = "student"           # Basic access, own data only
    STAFF = "staff"               # Limited AI features, basic PII access
    MANAGER = "manager"           # Full AI features, PII management
    ADMIN = "admin"               # Complete system access
    SUPER_ADMIN = "super_admin"   # System administration

class Permission(Enum):
    """System permissions for different operations"""
    # PII Operations
    PII_DETECT = "pii_detect"
    PII_REDACT = "pii_redact"
    PII_CONSENT_VIEW = "pii_consent_view"
    PII_CONSENT_MANAGE = "pii_consent_manage"
    PII_GDPR_REPORT = "pii_gdpr_report"
    
    # AI Features
    AI_LEAD_SCORING = "ai_lead_scoring"
    AI_CHAT = "ai_chat"
    AI_FORECASTING = "ai_forecasting"
    AI_ANALYTICS = "ai_analytics"
    AI_MODEL_TRAINING = "ai_model_training"
    
    # User Management
    USER_VIEW = "user_view"
    USER_CREATE = "user_create"
    USER_UPDATE = "user_update"
    USER_DELETE = "user_delete"
    ROLE_MANAGE = "role_manage"
    
    # System Operations
    SYSTEM_HEALTH = "system_health"
    SYSTEM_CONFIG = "system_config"
    AUDIT_LOGS = "audit_logs"
    BACKUP_RESTORE = "backup_restore"

class ResourceType(Enum):
    """Types of resources that can be accessed"""
    PII_DATA = "pii_data"
    STUDENT_RECORDS = "student_records"
    LEAD_DATA = "lead_data"
    AI_MODELS = "ai_models"
    SYSTEM_CONFIG = "system_config"
    AUDIT_LOGS = "audit_logs"
    BACKUP_RESTORE = "backup_restore"

@dataclass
class User:
    """User entity with role and permissions"""
    user_id: str
    username: str
    email: str
    full_name: str
    role: UserRole
    is_active: bool = True
    created_at: datetime = None
    last_login: Optional[datetime] = None
    password_hash: Optional[str] = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.metadata is None:
            self.metadata = {}

@dataclass
class RolePermission:
    """Role-based permission configuration"""
    role: UserRole
    permissions: Set[Permission]
    resource_access: Dict[ResourceType, Set[str]]  # resource_type -> allowed_operations
    data_scope: str  # "own", "team", "department", "all"

@dataclass
class AuditLog:
    """Audit log entry for user actions"""
    log_id: str
    user_id: str
    action: str
    resource: str
    resource_type: ResourceType
    timestamp: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    details: Dict[str, Any] = None
    success: bool = True

class UserManager:
    """Manages users, roles, and permissions"""
    
    def __init__(self):
        self.users: Dict[str, User] = {}
        self.role_permissions: Dict[UserRole, RolePermission] = {}
        self.audit_logs: List[AuditLog] = []
        self._initialize_role_permissions()
    
    def _initialize_role_permissions(self):
        """Initialize default role permissions"""
        
        # Student Role - Basic access, own data only
        self.role_permissions[UserRole.STUDENT] = RolePermission(
            role=UserRole.STUDENT,
            permissions={
                Permission.PII_CONSENT_VIEW,
                Permission.AI_CHAT
            },
            resource_access={
                ResourceType.PII_DATA: {"own"},
                ResourceType.STUDENT_RECORDS: {"own"}
            },
            data_scope="own"
        )
        
        # Staff Role - Limited AI features, basic PII access
        self.role_permissions[UserRole.STAFF] = RolePermission(
            role=UserRole.STAFF,
            permissions={
                Permission.PII_DETECT,
                Permission.PII_REDACT,
                Permission.PII_CONSENT_VIEW,
                Permission.AI_LEAD_SCORING,
                Permission.AI_CHAT,
                Permission.AI_FORECASTING,
                Permission.USER_VIEW
            },
            resource_access={
                ResourceType.PII_DATA: {"own", "team"},
                ResourceType.STUDENT_RECORDS: {"own", "team"},
                ResourceType.LEAD_DATA: {"own", "team"}
            },
            data_scope="team"
        )
        
        # Manager Role - Full AI features, PII management
        self.role_permissions[UserRole.MANAGER] = RolePermission(
            role=UserRole.MANAGER,
            permissions={
                Permission.PII_DETECT,
                Permission.PII_REDACT,
                Permission.PII_CONSENT_VIEW,
                Permission.PII_CONSENT_MANAGE,
                Permission.PII_GDPR_REPORT,
                Permission.AI_LEAD_SCORING,
                Permission.AI_CHAT,
                Permission.AI_FORECASTING,
                Permission.AI_ANALYTICS,
                Permission.USER_VIEW,
                Permission.USER_UPDATE,
                Permission.AUDIT_LOGS
            },
            resource_access={
                ResourceType.PII_DATA: {"own", "team", "department"},
                ResourceType.STUDENT_RECORDS: {"own", "team", "department"},
                ResourceType.LEAD_DATA: {"own", "team", "department"},
                ResourceType.AI_MODELS: {"view", "use"}
            },
            data_scope="department"
        )
        
        # Admin Role - Complete system access
        self.role_permissions[UserRole.ADMIN] = RolePermission(
            role=UserRole.ADMIN,
            permissions={
                Permission.PII_DETECT,
                Permission.PII_REDACT,
                Permission.PII_CONSENT_VIEW,
                Permission.PII_CONSENT_MANAGE,
                Permission.PII_GDPR_REPORT,
                Permission.AI_LEAD_SCORING,
                Permission.AI_CHAT,
                Permission.AI_FORECASTING,
                Permission.AI_ANALYTICS,
                Permission.AI_MODEL_TRAINING,
                Permission.USER_VIEW,
                Permission.USER_CREATE,
                Permission.USER_UPDATE,
                Permission.USER_DELETE,
                Permission.ROLE_MANAGE,
                Permission.SYSTEM_HEALTH,
                Permission.SYSTEM_CONFIG,
                Permission.AUDIT_LOGS
            },
            resource_access={
                ResourceType.PII_DATA: {"own", "team", "department", "all"},
                ResourceType.STUDENT_RECORDS: {"own", "team", "department", "all"},
                ResourceType.LEAD_DATA: {"own", "team", "department", "all"},
                ResourceType.AI_MODELS: {"view", "use", "train", "delete"},
                ResourceType.SYSTEM_CONFIG: {"view", "update"},
                ResourceType.AUDIT_LOGS: {"view", "export"}
            },
            data_scope="all"
        )
        
        # Super Admin Role - System administration
        self.role_permissions[UserRole.SUPER_ADMIN] = RolePermission(
            role=UserRole.SUPER_ADMIN,
            permissions=set(Permission),  # All permissions
            resource_access={
                ResourceType.PII_DATA: {"own", "team", "department", "all", "system"},
                ResourceType.STUDENT_RECORDS: {"own", "team", "department", "all", "system"},
                ResourceType.LEAD_DATA: {"own", "team", "department", "all", "system"},
                ResourceType.AI_MODELS: {"view", "use", "train", "delete", "system"},
                ResourceType.SYSTEM_CONFIG: {"view", "update", "system"},
                ResourceType.AUDIT_LOGS: {"view", "export", "system"},
                ResourceType.BACKUP_RESTORE: {"backup", "restore", "system"}
            },
            data_scope="system"
        )
    
    def create_user(self, username: str, email: str, full_name: str, 
                   role: UserRole, password: str = None) -> User:
        """Create a new user"""
        if username in self.users:
            raise ValueError(f"User {username} already exists")
        
        user = User(
            user_id=self._generate_user_id(),
            username=username,
            email=email,
            full_name=full_name,
            role=role,
            password_hash=self._hash_password(password) if password else None
        )
        
        self.users[username] = user
        self._audit_log(user.user_id, "user_create", "user", ResourceType.SYSTEM_CONFIG, 
                       {"username": username, "role": role.value}, True)
        
        logger.info(f"Created user: {username} with role: {role.value}")
        return user
    
    def update_user_role(self, username: str, new_role: UserRole, 
                        updated_by: str) -> bool:
        """Update user role (requires role management permission)"""
        if username not in self.users:
            return False
        
        user = self.users[username]
        old_role = user.role
        user.role = new_role
        
        self._audit_log(updated_by, "user_role_update", "user", ResourceType.SYSTEM_CONFIG,
                       {"username": username, "old_role": old_role.value, "new_role": new_role.value}, True)
        
        logger.info(f"Updated user {username} role from {old_role.value} to {new_role.value}")
        return True
    
    def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """Authenticate user with password"""
        if username not in self.users:
            return None
        
        user = self.users[username]
        if not user.is_active:
            return None
        
        if user.password_hash and self._verify_password(password, user.password_hash):
            user.last_login = datetime.utcnow()
            self._audit_log(user.user_id, "user_login", "auth", ResourceType.SYSTEM_CONFIG, 
                           {"username": username}, True)
            return user
        
        self._audit_log(username, "user_login_failed", "auth", ResourceType.SYSTEM_CONFIG, 
                       {"username": username}, False)
        return None
    
    def has_permission(self, username: str, permission: Permission) -> bool:
        """Check if user has specific permission"""
        if username not in self.users:
            return False
        
        user = self.users[username]
        if not user.is_active:
            return False
        
        role_perm = self.role_permissions.get(user.role)
        if not role_perm:
            return False
        
        return permission in role_perm.permissions
    
    def can_access_resource(self, username: str, resource_type: ResourceType, 
                          operation: str) -> bool:
        """Check if user can access specific resource operation"""
        if username not in self.users:
            return False
        
        user = self.users[username]
        if not user.is_active:
            return False
        
        role_perm = self.role_permissions.get(user.role)
        if not role_perm:
            return False
        
        allowed_operations = role_perm.resource_access.get(resource_type, set())
        return operation in allowed_operations
    
    def get_user_permissions(self, username: str) -> Set[Permission]:
        """Get all permissions for a user"""
        if username not in self.users:
            return set()
        
        user = self.users[username]
        role_perm = self.role_permissions.get(user.role)
        return role_perm.permissions if role_perm else set()
    
    def get_users_by_role(self, role: UserRole) -> List[User]:
        """Get all users with specific role"""
        return [user for user in self.users.values() if user.role == role]
    
    def deactivate_user(self, username: str, deactivated_by: str) -> bool:
        """Deactivate a user"""
        if username not in self.users:
            return False
        
        user = self.users[username]
        user.is_active = False
        
        self._audit_log(deactivated_by, "user_deactivate", "user", ResourceType.SYSTEM_CONFIG,
                       {"username": username}, True)
        
        logger.info(f"Deactivated user: {username}")
        return True
    
    def _generate_user_id(self) -> str:
        """Generate unique user ID"""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        random_suffix = secrets.token_hex(4)
        return f"USER_{timestamp}_{random_suffix}"
    
    def _hash_password(self, password: str) -> str:
        """Hash password using SHA-256"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def _verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password against hash"""
        return self._hash_password(password) == password_hash
    
    def _audit_log(self, user_id: str, action: str, resource: str, 
                   resource_type: ResourceType, details: Dict[str, Any], success: bool):
        """Create audit log entry"""
        log_entry = AuditLog(
            log_id=self._generate_log_id(),
            user_id=user_id,
            action=action,
            resource=resource,
            resource_type=resource_type,
            timestamp=datetime.utcnow(),
            details=details,
            success=success
        )
        
        self.audit_logs.append(log_entry)
        
        # Keep only last 1000 audit logs
        if len(self.audit_logs) > 1000:
            self.audit_logs = self.audit_logs[-1000:]
    
    def _generate_log_id(self) -> str:
        """Generate unique log ID"""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        random_suffix = secrets.token_hex(4)
        return f"LOG_{timestamp}_{random_suffix}"

class PermissionDecorator:
    """Decorator for checking user permissions"""
    
    def __init__(self, permission: Permission, resource_type: ResourceType = None):
        self.permission = permission
        self.resource_type = resource_type
    
    def __call__(self, func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # This would be implemented in the actual API endpoints
            # For now, just return the function
            return func(*args, **kwargs)
        return wrapper

# Global user manager instance
user_manager = UserManager()

# Convenience functions
def create_user(username: str, email: str, full_name: str, 
               role: UserRole, password: str = None) -> Dict[str, Any]:
    """Convenience function to create user"""
    user = user_manager.create_user(username, email, full_name, role, password)
    return asdict(user)

def check_permission(username: str, permission: Permission) -> bool:
    """Convenience function to check permission"""
    return user_manager.has_permission(username, permission)

def get_user_permissions(username: str) -> List[str]:
    """Convenience function to get user permissions"""
    permissions = user_manager.get_user_permissions(username)
    return [perm.value for perm in permissions]

def get_audit_logs(username: str = None, limit: int = 100) -> List[Dict[str, Any]]:
    """Convenience function to get audit logs"""
    logs = user_manager.audit_logs
    if username:
        logs = [log for log in logs if log.user_id == username]
    
    # Return last N logs
    recent_logs = logs[-limit:] if len(logs) > limit else logs
    return [asdict(log) for log in recent_logs]

def get_role_permissions(role: UserRole) -> Dict[str, Any]:
    """Convenience function to get role permissions"""
    role_perm = user_manager.role_permissions.get(role)
    if not role_perm:
        return {}
    
    return {
        "role": role_perm.role.value,
        "permissions": [perm.value for perm in role_perm.permissions],
        "resource_access": {
            resource_type.value: list(operations) 
            for resource_type, operations in role_perm.resource_access.items()
        },
        "data_scope": role_perm.data_scope
    }
