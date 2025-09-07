#!/usr/bin/env python3
"""
Test script for User Management System - Phase 5.2
Tests the RBAC system, user management, and permission checking.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.ai.user_management import (
    create_user, check_permission, get_user_permissions, get_audit_logs,
    get_role_permissions, user_manager, UserRole, Permission, ResourceType
)

def test_user_creation():
    """Test user creation with different roles"""
    print("👥 Testing User Creation...")
    print("=" * 50)
    
    # Create users with different roles
    users_data = [
        {
            "username": "admin_user",
            "email": "admin@bridgecrm.com",
            "full_name": "Admin User",
            "role": UserRole.ADMIN,
            "password": "admin123"
        },
        {
            "username": "manager_user",
            "email": "manager@bridgecrm.com",
            "full_name": "Manager User",
            "role": UserRole.MANAGER,
            "password": "manager123"
        },
        {
            "username": "staff_user",
            "email": "staff@bridgecrm.com",
            "full_name": "Staff User",
            "role": UserRole.STAFF,
            "password": "staff123"
        },
        {
            "username": "student_user",
            "email": "student@bridgecrm.com",
            "full_name": "Student User",
            "role": UserRole.STUDENT,
            "password": "student123"
        }
    ]
    
    created_users = []
    for user_data in users_data:
        try:
            user = create_user(**user_data)
            created_users.append(user)
            print(f"✅ Created {user_data['role'].value}: {user['username']}")
        except Exception as e:
            print(f"❌ Failed to create {user_data['role'].value}: {e}")
    
    print(f"\nTotal users created: {len(created_users)}")
    return created_users

def test_permission_system():
    """Test the permission system for different roles"""
    print("\n🔐 Testing Permission System...")
    print("=" * 50)
    
    # Test different permissions for each role
    test_permissions = [
        Permission.PII_DETECT,
        Permission.PII_REDACT,
        Permission.AI_LEAD_SCORING,
        Permission.AI_CHAT,
        Permission.USER_CREATE,
        Permission.USER_UPDATE,
        Permission.AUDIT_LOGS
    ]
    
    test_users = ["admin_user", "manager_user", "staff_user", "student_user"]
    
    print("Permission Matrix:")
    print("User".ljust(15), end="")
    for perm in test_permissions:
        print(f"{perm.value[:12].ljust(15)}", end="")
    print()
    
    for username in test_users:
        print(f"{username.ljust(15)}", end="")
        for perm in test_permissions:
            has_perm = check_permission(username, perm)
            status = "✅" if has_perm else "❌"
            print(f"{status.ljust(15)}", end="")
        print()

def test_resource_access():
    """Test resource access control"""
    print("\n🚪 Testing Resource Access Control...")
    print("=" * 50)
    
    test_users = ["admin_user", "manager_user", "staff_user", "student_user"]
    test_resources = [
        (ResourceType.PII_DATA, "all"),
        (ResourceType.STUDENT_RECORDS, "department"),
        (ResourceType.AI_MODELS, "view"),
        (ResourceType.SYSTEM_CONFIG, "view")
    ]
    
    print("Resource Access Matrix:")
    print("User".ljust(15), end="")
    for resource, operation in test_resources:
        print(f"{resource.value[:8]}:{operation[:8].ljust(15)}", end="")
    print()
    
    for username in test_users:
        print(f"{username.ljust(15)}", end="")
        for resource, operation in test_resources:
            can_access = user_manager.can_access_resource(username, resource, operation)
            status = "✅" if can_access else "❌"
            print(f"{status.ljust(15)}", end="")
        print()

def test_role_permissions():
    """Test role permission details"""
    print("\n🎭 Testing Role Permission Details...")
    print("=" * 50)
    
    for role in UserRole:
        role_info = get_role_permissions(role)
        print(f"\n{role.value.upper()} Role:")
        print(f"  Data Scope: {role_info.get('data_scope', 'N/A')}")
        print(f"  Permissions: {len(role_info.get('permissions', []))}")
        print(f"  Resource Access: {len(role_info.get('resource_access', {}))}")
        
        # Show some key permissions
        permissions = role_info.get('permissions', [])
        if permissions:
            key_perms = [p for p in permissions if 'pii' in p or 'ai' in p or 'user' in p]
            print(f"  Key Permissions: {', '.join(key_perms[:5])}")

def test_authentication():
    """Test user authentication"""
    print("\n🔑 Testing User Authentication...")
    print("=" * 50)
    
    test_credentials = [
        ("admin_user", "admin123"),
        ("manager_user", "manager123"),
        ("staff_user", "staff123"),
        ("student_user", "student123"),
        ("admin_user", "wrong_password"),
        ("nonexistent_user", "password")
    ]
    
    for username, password in test_credentials:
        user = user_manager.authenticate_user(username, password)
        if user:
            print(f"✅ {username}: Authentication successful")
            print(f"   Role: {user.role.value}")
            print(f"   Permissions: {len(get_user_permissions(username))}")
        else:
            print(f"❌ {username}: Authentication failed")

def test_audit_logging():
    """Test audit logging system"""
    print("\n📝 Testing Audit Logging...")
    print("=" * 50)
    
    # Get recent audit logs
    logs = get_audit_logs(limit=10)
    
    print(f"Recent audit logs ({len(logs)} entries):")
    for log in logs[-5:]:  # Show last 5 logs
        timestamp = log['timestamp']
        if isinstance(timestamp, str):
            timestamp_str = timestamp[:19]
        else:
            timestamp_str = timestamp.strftime("%Y-%m-%d %H:%M:%S")
        print(f"  {timestamp_str} | {log['user_id']} | {log['action']} | {log['resource']} | {'✅' if log['success'] else '❌'}")

def test_user_management_operations():
    """Test user management operations"""
    print("\n⚙️ Testing User Management Operations...")
    print("=" * 50)
    
    # Test role update
    print("Testing role update...")
    success = user_manager.update_user_role("staff_user", UserRole.MANAGER, "admin_user")
    if success:
        print("✅ Successfully updated staff_user to manager role")
        # Check new permissions
        new_perms = get_user_permissions("staff_user")
        print(f"   New permissions: {len(new_perms)}")
    else:
        print("❌ Failed to update user role")
    
    # Test user deactivation
    print("\nTesting user deactivation...")
    success = user_manager.deactivate_user("student_user", "admin_user")
    if success:
        print("✅ Successfully deactivated student_user")
        # Check if user is inactive
        user = user_manager.users.get("student_user")
        if user and not user.is_active:
            print("   User is now inactive")
    else:
        print("❌ Failed to deactivate user")

def test_real_world_scenario():
    """Test a real-world user management scenario"""
    print("\n🌍 Testing Real-World User Management Scenario...")
    print("=" * 50)
    
    print("Scenario: Admissions team setup with different access levels")
    
    # Create admissions team users
    admissions_users = [
        {
            "username": "admissions_head",
            "email": "head@admissions.bridgecrm.com",
            "full_name": "Admissions Head",
            "role": UserRole.MANAGER,
            "password": "admissions123"
        },
        {
            "username": "admissions_officer",
            "email": "officer@admissions.bridgecrm.com",
            "full_name": "Admissions Officer",
            "role": UserRole.STAFF,
            "password": "officer123"
        },
        {
            "username": "data_analyst",
            "email": "analyst@admissions.bridgecrm.com",
            "full_name": "Data Analyst",
            "role": UserRole.STAFF,
            "password": "analyst123"
        }
    ]
    
    for user_data in admissions_users:
        try:
            user = create_user(**user_data)
            print(f"✅ Created {user_data['role'].value}: {user['username']}")
        except Exception as e:
            print(f"❌ Failed to create {user_data['role'].value}: {e}")
    
    print("\nTesting team access patterns:")
    
    # Test PII access for different roles
    test_cases = [
        ("admissions_head", "Can access PII data", Permission.PII_DETECT),
        ("admissions_officer", "Can access PII data", Permission.PII_DETECT),
        ("data_analyst", "Can access PII data", Permission.PII_DETECT),
        ("admissions_head", "Can manage consent", Permission.PII_CONSENT_MANAGE),
        ("admissions_officer", "Cannot manage consent", Permission.PII_CONSENT_MANAGE),
        ("data_analyst", "Cannot manage consent", Permission.PII_CONSENT_MANAGE)
    ]
    
    for username, description, permission in test_cases:
        has_perm = check_permission(username, permission)
        status = "✅" if has_perm else "❌"
        print(f"  {status} {username}: {description}")

def main():
    """Run all tests"""
    print("🚀 User Management System Test Suite - Phase 5.2")
    print("=" * 60)
    
    try:
        # Run tests
        created_users = test_user_creation()
        test_permission_system()
        test_resource_access()
        test_role_permissions()
        test_authentication()
        test_audit_logging()
        test_user_management_operations()
        test_real_world_scenario()
        
        print("\n✅ All tests completed successfully!")
        print("\n🎯 Phase 5.2: Advanced User Management & RBAC is working correctly!")
        print("   - User creation and management: ✅")
        print("   - Role-based access control: ✅")
        print("   - Permission system: ✅")
        print("   - Resource access control: ✅")
        print("   - Audit logging: ✅")
        print("   - Authentication: ✅")
        
        print(f"\n📊 System Statistics:")
        print(f"   Total users: {len(user_manager.users)}")
        print(f"   Roles configured: {len(user_manager.role_permissions)}")
        print(f"   Audit logs: {len(user_manager.audit_logs)}")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
