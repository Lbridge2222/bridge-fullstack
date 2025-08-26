from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from uuid import UUID
import json

from ..db.db import fetch, fetchrow
from ..schemas.people import PersonOut

router = APIRouter(prefix="/properties", tags=["properties"])

# Mock user dependency - replace with your actual auth system
async def get_current_user():
    # This is a placeholder - implement your actual user authentication
    return {"id": "550e8400-e29b-41d4-a716-446655440101", "org_id": "550e8400-e29b-41d4-a716-446655440000"}

@router.get("/{entity}/by-lifecycle-stage")
async def get_properties_by_lifecycle_stage(
    entity: str,
    lifecycle_stages: List[str] = Query(..., description="Lifecycle stages to filter properties by"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get properties for an entity based on lifecycle stages.
    This enables progressive disclosure - properties only appear when relevant.
    """
    try:
        # Map legacy lifecycle stages to new ones
        stage_mapping = {
            'enquiry': 'lead',  # Map legacy 'enquiry' to 'lead'
            'pre_applicant': 'lead',  # Map legacy 'pre_applicant' to 'lead'
            'student': 'enrolled',  # Map legacy 'student' to 'enrolled'
        }
        
        # Convert stages using mapping
        mapped_stages = [stage_mapping.get(stage, stage) for stage in lifecycle_stages]
        
        # Convert list to PostgreSQL array format
        stages_array = "{" + ",".join(mapped_stages) + "}"
        
        sql = """
        SELECT 
            id,
            name,
            label,
            data_type,
            group_key,
            lifecycle_stages,
            display_order,
            is_required_at_stage,
            is_system_managed,
            data_source,
            options,
            validation_rules,
            default_value,
            is_ai_enhanced
        FROM custom_properties 
        WHERE org_id = %s 
          AND entity = %s 
          AND lifecycle_stages && %s::text[]
        ORDER BY group_key, display_order
        """
        
        properties = await fetch(sql, current_user["org_id"], entity, stages_array)
        
        # Group properties by their group
        grouped_properties = {}
        for prop in properties:
            group_key = prop["group_key"] or "other"
            if group_key not in grouped_properties:
                grouped_properties[group_key] = []
            grouped_properties[group_key].append(prop)
        
        return {
            "entity": entity,
            "lifecycle_stages": lifecycle_stages,
            "mapped_stages": mapped_stages,
            "properties": grouped_properties,
            "total_properties": len(properties)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch properties: {str(e)}")

@router.get("/{entity}/by-lifecycle-stage/{person_id}")
async def get_properties_with_values(
    entity: str,
    person_id: UUID,
    lifecycle_stages: List[str] = Query(..., description="Lifecycle stages to filter properties by"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get properties for an entity based on lifecycle stages WITH their actual values for a specific person.
    This enables progressive disclosure with real data.
    """
    try:
        # Map legacy lifecycle stages to new ones
        stage_mapping = {
            'enquiry': 'lead',
            'pre_applicant': 'lead',
            'student': 'enrolled',
        }
        
        mapped_stages = [stage_mapping.get(stage, stage) for stage in lifecycle_stages]
        stages_array = "{" + ",".join(mapped_stages) + "}"
        
        sql = """
        SELECT 
            cp.id,
            cp.name,
            cp.label,
            cp.data_type,
            cp.group_key,
            cp.lifecycle_stages,
            cp.display_order,
            cp.is_required_at_stage,
            cp.is_system_managed,
            cp.data_source,
            cp.options,
            cp.validation_rules,
            cp.default_value,
            cp.is_ai_enhanced,
            cv.value as actual_value,
            cv.created_at as last_changed_at
        FROM custom_properties cp
        LEFT JOIN custom_values cv ON cp.id = cv.property_id 
            AND cv.entity_id = %s 
            AND cv.org_id = cp.org_id
            AND cv.entity = %s
        WHERE cp.org_id = %s 
          AND cp.entity = %s 
          AND cp.lifecycle_stages && %s::text[]
        ORDER BY cp.group_key, cp.display_order
        """
        
        properties = await fetch(sql, person_id, entity, current_user["org_id"], entity, stages_array)
        
        # Group properties by their group
        grouped_properties = {}
        for prop in properties:
            group_key = prop["group_key"] or "other"
            if group_key not in grouped_properties:
                grouped_properties[group_key] = []
            
            # Clean up the property object
            clean_prop = {k: v for k, v in prop.items() if k not in ['actual_value', 'last_changed_at']}
            clean_prop['value'] = prop.get('actual_value')  # Add the actual value
            clean_prop['last_changed_at'] = prop.get('last_changed_at')
            
            grouped_properties[group_key].append(clean_prop)
        
        return {
            "entity": entity,
            "person_id": str(person_id),
            "lifecycle_stages": lifecycle_stages,
            "mapped_stages": mapped_stages,
            "properties": grouped_properties,
            "total_properties": len(properties)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch properties with values: {str(e)}")

@router.get("/{entity}/groups")
async def get_property_groups(
    entity: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all property groups for an entity with their metadata.
    """
    try:
        sql = """
        SELECT DISTINCT 
            group_key,
            COUNT(*) as property_count
        FROM custom_properties 
        WHERE org_id = %s AND entity = %s
        GROUP BY group_key
        ORDER BY group_key
        """
        
        groups = await fetch(sql, current_user["org_id"], entity)
        
        return {
            "entity": entity,
            "groups": groups
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch property groups: {str(e)}")

@router.get("/{entity}/{entity_id}/values")
async def get_entity_property_values(
    entity: str,
    entity_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all property values for a specific entity instance.
    This combines custom_properties metadata with custom_values data.
    """
    try:
        sql = """
        SELECT 
            cp.id as property_id,
            cp.name,
            cp.label,
            cp.data_type,
            cp.group_key,
            cp.lifecycle_stages,
            cp.display_order,
            cp.is_required_at_stage,
            cp.is_system_managed,
            cp.data_source,
            cp.options,
            cp.validation_rules,
            cp.default_value,
            cp.is_ai_enhanced,
            cv.value as current_value,
            cv.created_at as value_created_at
        FROM custom_properties cp
        LEFT JOIN custom_values cv ON cv.property_id = cp.id 
            AND cv.entity_id = %s 
            AND cv.entity = %s
        WHERE cp.org_id = %s 
          AND cp.entity = %s
        ORDER BY cp.group_key, cp.display_order
        """
        
        properties_with_values = await fetch(sql, entity_id, entity, current_user["org_id"], entity)
        
        # Group by property group
        grouped_properties = {}
        for prop in properties_with_values:
            group_key = prop["group_key"] or "other"
            if group_key not in grouped_properties:
                grouped_properties[group_key] = []
            grouped_properties[group_key].append(prop)
        
        return {
            "entity": entity,
            "entity_id": str(entity_id),
            "properties": grouped_properties,
            "total_properties": len(properties_with_values)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch property values: {str(e)}")

@router.get("/{entity}/system-properties")
async def get_system_properties(
    entity: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all system-managed properties for an entity.
    These are the properties that come pre-configured with the system.
    """
    try:
        sql = """
        SELECT 
            id,
            name,
            label,
            data_type,
            group_key,
            lifecycle_stages,
            display_order,
            is_required_at_stage,
            data_source,
            options,
            validation_rules,
            default_value,
            is_ai_enhanced
        FROM custom_properties 
        WHERE org_id = %s 
          AND entity = %s 
          AND is_system_managed = true
        ORDER BY group_key, display_order
        """
        
        system_properties = await fetch(sql, current_user["org_id"], entity)
        
        return {
            "entity": entity,
            "system_properties": system_properties,
            "total_system_properties": len(system_properties)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch system properties: {str(e)}")

@router.get("/lifecycle-stages")
async def get_lifecycle_stages(current_user: dict = Depends(get_current_user)):
    """
    Get all available lifecycle stages for the organization.
    """
    try:
        # For now, return the standard HE lifecycle stages
        # In the future, this could come from a lifecycle_stage_definitions table
        lifecycle_stages = [
            {"key": "lead", "name": "Lead", "description": "Initial enquiry stage"},
            {"key": "applicant", "name": "Applicant", "description": "Application submitted"},
            {"key": "enrolled", "name": "Enrolled", "description": "Student enrolled"},
            {"key": "alumni", "name": "Alumni", "description": "Graduated student"}
        ]
        
        return {
            "lifecycle_stages": lifecycle_stages,
            "total_stages": len(lifecycle_stages)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch lifecycle stages: {str(e)}")

@router.post("/populate-custom-values")
async def populate_custom_values(current_user: dict = Depends(get_current_user)):
    """
    Populate custom_values table with existing data from people table.
    This connects the seed data to our progressive properties system.
    """
    try:
        # This is a one-time operation to populate custom values
        sql = """
        INSERT INTO custom_values (org_id, entity, entity_id, property_id, value, created_at)
        SELECT 
            p.org_id,
            'people' as entity,
            p.id as entity_id,
            cp.id as property_id,
            CASE 
                -- Personal properties
                WHEN cp.name = 'first_name' THEN to_jsonb(p.first_name)
                WHEN cp.name = 'last_name' THEN to_jsonb(p.last_name)
                WHEN cp.name = 'email' THEN to_jsonb(p.email)
                WHEN cp.name = 'phone' THEN to_jsonb(p.phone)
                WHEN cp.name = 'lead_score' THEN to_jsonb(p.lead_score)
                WHEN cp.name = 'conversion_probability' THEN to_jsonb(p.conversion_probability)
                ELSE NULL
            END as value,
            NOW() as created_at
        FROM people p
        CROSS JOIN custom_properties cp
        WHERE cp.entity = 'people' 
          AND cp.org_id = %s
          AND cp.is_system_managed = true
          AND (
            (cp.name = 'first_name' AND p.first_name IS NOT NULL) OR
            (cp.name = 'last_name' AND p.last_name IS NOT NULL) OR
            (cp.name = 'email' AND p.email IS NOT NULL) OR
            (cp.name = 'phone' AND p.phone IS NOT NULL) OR
            (cp.name = 'lead_score' AND p.lead_score IS NOT NULL) OR
            (cp.name = 'conversion_probability' AND p.conversion_probability IS NOT NULL)
          );
        """
        
        result = await fetch(sql, current_user["org_id"])
        
        # Get count of populated values
        count_sql = """
        SELECT COUNT(*) as total_values
        FROM custom_values 
        WHERE entity = 'people' AND org_id = %s
        """
        
        count_result = await fetchrow(count_sql, current_user["org_id"])
        total_values = count_result["total_values"] if count_result else 0
        
        return {
            "message": "Custom values populated successfully",
            "total_values_created": total_values,
            "org_id": current_user["org_id"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to populate custom values: {str(e)}")
