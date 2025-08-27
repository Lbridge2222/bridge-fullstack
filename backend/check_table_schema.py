#!/usr/bin/env python3
"""
Check People Table Schema
Script to see what columns actually exist in the people table
"""

import asyncio
from app.db.db import fetch

async def check_table_schema():
    """Check the actual schema of the people table"""
    
    print("🔍 Checking people table schema...")
    
    try:
        # Get table structure
        schema_query = """
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'people'
        ORDER BY ordinal_position
        """
        
        columns = await fetch(schema_query)
        print(f"📊 People table has {len(columns)} columns:")
        
        for col in columns:
            nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
            default = f" DEFAULT {col['column_default']}" if col['column_default'] else ""
            print(f"  {col['column_name']:<20} {col['data_type']:<15} {nullable}{default}")
        
        # Check for specific columns we need
        print("\n🎯 Checking for ML training columns:")
        needed_columns = [
            'lead_score', 'lifecycle_state', 'has_application', 
            'source', 'course_declared', 'campus_preference', 'engagement_level'
        ]
        
        existing_columns = [col['column_name'] for col in columns]
        
        for needed in needed_columns:
            if needed in existing_columns:
                print(f"  ✅ {needed}")
            else:
                print(f"  ❌ {needed} - MISSING")
        
        # Check for alternative columns
        print("\n🔍 Looking for alternative columns:")
        
        # Check if there's an applications table or similar
        tables_query = """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%application%'
        """
        
        app_tables = await fetch(tables_query)
        if app_tables:
            print(f"📋 Found application-related tables: {[t['table_name'] for t in app_tables]}")
        else:
            print("📋 No application-related tables found")
        
        # Check for any boolean columns that might indicate applications
        boolean_columns = [col for col in columns if 'bool' in col['data_type'].lower()]
        if boolean_columns:
            print(f"📋 Boolean columns that might be useful: {[col['column_name'] for col in boolean_columns]}")
        
        # Check for any text columns that might contain source info
        text_columns = [col for col in columns if 'char' in col['data_type'].lower() or 'text' in col['data_type'].lower()]
        if text_columns:
            print(f"📋 Text columns that might be useful: {[col['column_name'] for col in text_columns]}")
        
    except Exception as e:
        print(f"❌ Error checking schema: {e}")
        import traceback
        print(f"📋 Full traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    asyncio.run(check_table_schema())
