-- Migration: Populate Custom Values with Existing People Data
-- This migration connects the existing seed data in the people table to our progressive properties system

-- First, let's populate custom_values for properties that map to existing people columns
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
        WHEN cp.name = 'date_of_birth' THEN to_jsonb(p.date_of_birth::text)
        WHEN cp.name = 'nationality' THEN to_jsonb(p.nationality)
        WHEN cp.name = 'address_line1' THEN to_jsonb(p.address_line1)
        WHEN cp.name = 'address_line2' THEN to_jsonb(p.address_line2)
        WHEN cp.name = 'city' THEN to_jsonb(p.city)
        WHEN cp.name = 'postcode' THEN to_jsonb(p.postcode)
        WHEN cp.name = 'country' THEN to_jsonb(p.country)
        WHEN cp.name = 'phone_country_code' THEN to_jsonb(p.phone_country_code)
        WHEN cp.name = 'phone_number' THEN to_jsonb(p.phone_number)
        WHEN cp.name = 'phone_extension' THEN to_jsonb(p.phone_extension)
        WHEN cp.name = 'preferred_contact_method' THEN to_jsonb(p.preferred_contact_method)
        
        -- Scoring properties
        WHEN cp.name = 'lead_score' THEN to_jsonb(p.lead_score)
        WHEN cp.name = 'engagement_score' THEN to_jsonb(p.engagement_score)
        WHEN cp.name = 'conversion_probability' THEN to_jsonb(p.conversion_probability)
        
        -- Engagement properties
        WHEN cp.name = 'touchpoint_count' THEN to_jsonb(p.touchpoint_count)
        WHEN cp.name = 'last_engagement_date' THEN to_jsonb(p.last_engagement_date::text)
        
        -- Other properties that might have values
        ELSE NULL
    END as value,
    NOW() as created_at
FROM people p
CROSS JOIN custom_properties cp
WHERE cp.entity = 'people' 
  AND cp.org_id = p.org_id
  AND cp.is_system_managed = true
  AND (
    -- Only insert for properties that have corresponding data in people table
    (cp.name = 'first_name' AND p.first_name IS NOT NULL) OR
    (cp.name = 'last_name' AND p.last_name IS NOT NULL) OR
    (cp.name = 'email' AND p.email IS NOT NULL) OR
    (cp.name = 'phone' AND p.phone IS NOT NULL) OR
    (cp.name = 'date_of_birth' AND p.date_of_birth IS NOT NULL) OR
    (cp.name = 'nationality' AND p.nationality IS NOT NULL) OR
    (cp.name = 'address_line1' AND p.address_line1 IS NOT NULL) OR
    (cp.name = 'address_line2' AND p.address_line2 IS NOT NULL) OR
    (cp.name = 'city' AND p.city IS NOT NULL) OR
    (cp.name = 'postcode' AND p.postcode IS NOT NULL) OR
    (cp.name = 'country' AND p.country IS NOT NULL) OR
    (cp.name = 'phone_country_code' AND p.phone_country_code IS NOT NULL) OR
    (cp.name = 'phone_number' AND p.phone_number IS NOT NULL) OR
    (cp.name = 'phone_extension' AND p.phone_extension IS NOT NULL) OR
    (cp.name = 'preferred_contact_method' AND p.preferred_contact_method IS NOT NULL) OR
    (cp.name = 'lead_score' AND p.lead_score IS NOT NULL) OR
    (cp.name = 'engagement_score' AND p.engagement_score IS NOT NULL) OR
    (cp.name = 'conversion_probability' AND p.conversion_probability IS NOT NULL) OR
    (cp.name = 'touchpoint_count' AND p.touchpoint_count IS NOT NULL) OR
    (cp.name = 'last_engagement_date' AND p.last_engagement_date IS NOT NULL)
  )
ON CONFLICT (org_id, entity, entity_id, property_id) DO NOTHING;

-- Verify the data was populated
SELECT 
    'Total custom values created' as metric,
    COUNT(*) as count
FROM custom_values 
WHERE entity = 'people'
UNION ALL
SELECT 
    'People with custom values' as metric,
    COUNT(DISTINCT entity_id) as count
FROM custom_values 
WHERE entity = 'people'
UNION ALL
SELECT 
    'Properties with values' as metric,
    COUNT(DISTINCT property_id) as count
FROM custom_values 
WHERE entity = 'people';
