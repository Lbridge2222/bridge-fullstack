#!/usr/bin/env python3
"""
Import knowledge documents from CSV file
"""

import asyncio
import csv
import json
import uuid
from datetime import datetime
from app.db.db import execute

# Import bootstrap_env to ensure environment variables are loaded
from app.bootstrap_env import bootstrap_env

async def import_csv_documents():
    """Import knowledge documents from CSV file"""
    try:
        # Bootstrap environment first
        bootstrap_env()
        
        csv_file = "../knowledgebase_new_20.csv"
        documents = []
        
        print(f"📥 Reading knowledge documents from {csv_file}...")
        
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Skip if no title or content
                if not row.get('title') or not row.get('content'):
                    continue
                    
                # Parse tags from string to array
                tags = []
                if row.get('tags'):
                    try:
                        tags = json.loads(row['tags']) if row['tags'].startswith('[') else row['tags'].split(',')
                    except:
                        tags = row['tags'].split(',') if row['tags'] else []
                
                # Parse metadata
                metadata = {}
                if row.get('metadata'):
                    try:
                        metadata = json.loads(row['metadata']) if row['metadata'] else {}
                    except:
                        metadata = {}
                
                documents.append({
                    'id': row.get('id') or str(uuid.uuid4()),
                    'title': row['title'],
                    'content': row['content'],
                    'document_type': row.get('document_type', 'best_practice'),
                    'category': row.get('category', 'General'),
                    'tags': tags,
                    'metadata': metadata,
                    'is_active': row.get('is_active', 'true').lower() == 'true'
                })
        
        print(f"📊 Found {len(documents)} documents to import")
        
        # Show sample of what we're importing
        print("\n📄 Sample documents:")
        for i, doc in enumerate(documents[:5], 1):
            print(f"{i}. {doc['title']} ({doc['document_type']})")
            print(f"   Content: {doc['content'][:100]}...")
            print()
        
        # Import documents
        imported_count = 0
        skipped_count = 0
        
        for i, doc in enumerate(documents, 1):
            print(f"[{i}/{len(documents)}] Processing: {doc['title']}")
            
            try:
                # Check if document already exists (by title)
                existing = await execute("""
                    SELECT id FROM knowledge_documents WHERE title = %s
                """, doc['title'])
                
                if existing:
                    print(f"⏭️  Skipped (already exists): {doc['title']}")
                    skipped_count += 1
                    continue
                
                # Insert document
                await execute("""
                    INSERT INTO knowledge_documents (
                        id, title, content, document_type, category, tags, metadata, is_active
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, 
                    doc['id'],
                    doc['title'],
                    doc['content'],
                    doc['document_type'],
                    doc['category'],
                    doc['tags'],
                    json.dumps(doc['metadata']),
                    doc['is_active']
                )
                
                print(f"✅ Imported: {doc['title']}")
                imported_count += 1
                
            except Exception as e:
                print(f"❌ Failed to import {doc['title']}: {e}")
                skipped_count += 1
        
        print(f"\n🎉 Import complete!")
        print(f"✅ Imported: {imported_count} documents")
        print(f"⏭️  Skipped: {skipped_count} documents")
        print(f"💡 Run 'python generate_embeddings.py' to create embeddings for new documents")
        
        # Show summary
        doc_types = {}
        categories = {}
        for doc in documents:
            doc_type = doc['document_type']
            category = doc['category']
            
            doc_types[doc_type] = doc_types.get(doc_type, 0) + 1
            categories[category] = categories.get(category, 0) + 1
        
        print('\n📈 Document Types:')
        for doc_type, count in sorted(doc_types.items()):
            print(f'  - {doc_type}: {count} documents')
        
        print('\n📈 Categories:')
        for category, count in sorted(categories.items()):
            print(f'  - {category}: {count} documents')
            
    except Exception as e:
        print(f"❌ Import failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(import_csv_documents())
