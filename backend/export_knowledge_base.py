#!/usr/bin/env python3
"""
Export knowledge base from Supabase to JSON/CSV formats
"""

import asyncio
import json
import csv
from datetime import datetime
from app.db.db import fetch

async def export_knowledge_base():
    """Export all knowledge documents to multiple formats"""
    try:
        # Get all knowledge documents
        documents = await fetch("""
            SELECT 
                id,
                title,
                content,
                document_type,
                category,
                tags,
                metadata,
                created_at,
                updated_at,
                is_active
            FROM knowledge_documents
            ORDER BY created_at DESC
        """)
        
        print(f"📊 Found {len(documents)} knowledge documents")
        
        # Prepare export data
        export_data = {
            'export_info': {
                'export_date': datetime.now().isoformat(),
                'total_documents': len(documents),
                'export_format': 'knowledge_base_v1'
            },
            'documents': []
        }
        
        for doc in documents:
            export_data['documents'].append({
                'id': str(doc['id']),
                'title': doc['title'],
                'content': doc['content'],
                'document_type': doc['document_type'],
                'category': doc['category'],
                'tags': doc['tags'] or [],
                'metadata': doc['metadata'] or {},
                'created_at': doc['created_at'].isoformat() if doc['created_at'] else None,
                'updated_at': doc['updated_at'].isoformat() if doc['updated_at'] else None,
                'is_active': doc['is_active']
            })
        
        # Export to JSON
        json_filename = f"knowledge_base_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(json_filename, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)
        
        print(f"✅ JSON export: {json_filename}")
        
        # Export to CSV
        csv_filename = f"knowledge_base_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        with open(csv_filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            
            # Write header
            writer.writerow([
                'id', 'title', 'content', 'document_type', 'category', 
                'tags', 'metadata', 'created_at', 'updated_at', 'is_active'
            ])
            
            # Write data
            for doc in export_data['documents']:
                writer.writerow([
                    doc['id'],
                    doc['title'],
                    doc['content'],
                    doc['document_type'],
                    doc['category'],
                    '|'.join(doc['tags']) if doc['tags'] else '',
                    json.dumps(doc['metadata']),
                    doc['created_at'],
                    doc['updated_at'],
                    doc['is_active']
                ])
        
        print(f"✅ CSV export: {csv_filename}")
        
        # Show summary
        doc_types = {}
        categories = {}
        for doc in documents:
            doc_type = doc['document_type']
            category = doc['category'] or 'Uncategorized'
            
            doc_types[doc_type] = doc_types.get(doc_type, 0) + 1
            categories[category] = categories.get(category, 0) + 1
        
        print('\n📈 Knowledge Base Summary:')
        print('Document Types:')
        for doc_type, count in sorted(doc_types.items()):
            print(f'  - {doc_type}: {count} documents')
        
        print('\nCategories:')
        for category, count in sorted(categories.items()):
            print(f'  - {category}: {count} documents')
        
        # Show sample documents
        print('\n📄 Sample Documents:')
        for i, doc in enumerate(documents[:3], 1):
            print(f'{i}. {doc["title"]} ({doc["document_type"]})')
            print(f'   Content: {doc["content"][:100]}...')
            print()
            
    except Exception as e:
        print(f"❌ Export failed: {e}")
        print("Make sure your DATABASE_URL is set in .env file")

if __name__ == "__main__":
    asyncio.run(export_knowledge_base())
