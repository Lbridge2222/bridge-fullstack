#!/usr/bin/env python3
"""
Sample Lead Data Generator for ML Testing
Adds realistic lead data to test the Advanced ML system
"""

import asyncio
import random
from datetime import datetime, timedelta
from app.db.db import execute

# Sample lead data
SAMPLE_LEADS = [
    {
        "first_name": "Emma",
        "last_name": "Thompson",
        "email": "emma.thompson@email.com",
        "phone": "+44 7700 900123",
        "lead_score": 85,
        "lifecycle_state": "lead",
        "has_application": True,
        "source": "UCAS",
        "course_declared": "Computer Science",
        "campus_preference": "London",
        "engagement_level": "high",
        "created_at": datetime.now() - timedelta(days=5)
    },
    {
        "first_name": "James",
        "last_name": "Wilson",
        "email": "james.wilson@email.com",
        "phone": "+44 7700 900124",
        "lead_score": 72,
        "lifecycle_state": "lead",
        "has_application": False,
        "source": "organic_search",
        "course_declared": "Business Management",
        "campus_preference": "Manchester",
        "engagement_level": "medium",
        "created_at": datetime.now() - timedelta(days=12)
    },
    {
        "first_name": "Sophie",
        "last_name": "Brown",
        "email": "sophie.brown@email.com",
        "phone": "+44 7700 900125",
        "lead_score": 93,
        "lifecycle_state": "lead",
        "has_application": True,
        "source": "social_media",
        "course_declared": "Psychology",
        "campus_preference": "Birmingham",
        "engagement_level": "high",
        "created_at": datetime.now() - timedelta(days=3)
    },
    {
        "first_name": "Michael",
        "last_name": "Davis",
        "email": "michael.davis@email.com",
        "phone": "+44 7700 900126",
        "lead_score": 65,
        "lifecycle_state": "lead",
        "has_application": False,
        "source": "referral",
        "course_declared": "Engineering",
        "campus_preference": "Leeds",
        "engagement_level": "low",
        "created_at": datetime.now() - timedelta(days=20)
    },
    {
        "first_name": "Olivia",
        "last_name": "Miller",
        "email": "olivia.miller@email.com",
        "phone": "+44 7700 900127",
        "lead_score": 88,
        "lifecycle_state": "lead",
        "has_application": True,
        "source": "UCAS",
        "course_declared": "Medicine",
        "campus_preference": "London",
        "engagement_level": "high",
        "created_at": datetime.now() - timedelta(days=7)
    }
]

async def add_sample_leads():
    """Add sample lead data to the database"""
    
    print("🚀 Adding sample lead data for ML testing...")
    
    for i, lead in enumerate(SAMPLE_LEADS, 1):
        try:
            # Insert lead data
            query = """
            INSERT INTO people (
                first_name, last_name, email, phone, lead_score, 
                lifecycle_state, has_application, source, course_declared,
                campus_preference, engagement_level, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            values = (
                lead["first_name"], lead["last_name"], lead["email"], 
                lead["phone"], lead["lead_score"], lead["lifecycle_state"],
                lead["has_application"], lead["source"], lead["course_declared"],
                lead["campus_preference"], lead["engagement_level"], lead["created_at"]
            )
            
            await execute(query, values)
            print(f"✅ Added lead {i}: {lead['first_name']} {lead['last_name']} (Score: {lead['lead_score']})")
            
        except Exception as e:
            print(f"❌ Failed to add lead {i}: {e}")
    
    print(f"\n🎯 Added {len(SAMPLE_LEADS)} sample leads for ML training!")
    print("💡 You can now test the Advanced ML system with this data")

if __name__ == "__main__":
    asyncio.run(add_sample_leads())
