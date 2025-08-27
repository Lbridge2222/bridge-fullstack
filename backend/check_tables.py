#!/usr/bin/env python3
"""
Check Database Tables
Simple script to see what tables exist
"""

import asyncio
from app.db.db import fetch

async def check_tables():
    """Check what tables exist in the database"""
    
    print("🔍 Checking database tables...")
    
    try:
        # Get all tables
        tables_query = """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
        """
        
        tables = await fetch(tables_query)
        print(f"📊 Found {len(tables)} tables:")
        
        for table in tables:
            print(f"  📋 {table['table_name']}")
        
        # Check for applications table specifically
        print("\n🎯 Looking for applications data...")
        
        # Check if there's a separate applications table
        app_check = await fetch("SELECT table_name FROM information_schema.tables WHERE table_name = 'applications'")
        if app_check:
            print("✅ Found 'applications' table")
            
            # Check applications table structure
            app_schema = await fetch("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'applications'
                ORDER BY ordinal_position
            """)
            print("📋 Applications table columns:")
            for col in app_schema:
                print(f"  {col['column_name']:<20} {col['data_type']}")
                
            # Check if applications are linked to people
            app_count = await fetch("SELECT COUNT(*) as total FROM applications")
            print(f"📊 Total applications: {app_count[0]['total'] if app_count else 0}")
            
        else:
            print("❌ No 'applications' table found")
            
        # Check for any other relevant tables
        relevant_tables = ['enrollments', 'registrations', 'courses', 'programmes']
        for table_name in relevant_tables:
            exists = await fetch("SELECT table_name FROM information_schema.tables WHERE table_name = %s", (table_name,))
            if exists:
                print(f"✅ Found '{table_name}' table")
            else:
                print(f"❌ No '{table_name}' table")
        
    except Exception as e:
        print(f"❌ Error checking tables: {e}")
        import traceback
        print(f"📋 Full traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    asyncio.run(check_tables())
