#!/usr/bin/env python3
"""
Generate realistic lead data for university CRM
Creates 150+ leads with varied timestamps, demographics, and engagement patterns
"""

import random
from datetime import datetime, timedelta
import json

# Realistic first names
FIRST_NAMES = [
    'Emma', 'James', 'Sophie', 'Oliver', 'Isabella', 'William', 'Charlotte', 'Harry', 'Amelia', 'George',
    'Grace', 'Jack', 'Mia', 'Noah', 'Ava', 'Oscar', 'Ella', 'Arthur', 'Poppy', 'Charlie',
    'Lily', 'Henry', 'Freya', 'Leo', 'Isla', 'Freddie', 'Sophia', 'Theo', 'Evie', 'Archie',
    'Florence', 'Joshua', 'Matilda', 'Ethan', 'Harper', 'Mason', 'Willow', 'Lucas', 'Evelyn', 'Alexander',
    'Chloe', 'Max', 'Luna', 'Sebastian', 'Violet', 'Adam', 'Zoe', 'Isaac', 'Aria', 'Benjamin',
    'Layla', 'Daniel', 'Nora', 'Samuel', 'Hazel', 'Joseph', 'Ivy', 'David', 'Penelope', 'Thomas',
    'Elsie', 'Edward', 'Maya', 'Finn', 'Alice', 'Jake', 'Ruby', 'Ryan', 'Sofia', 'Nathan',
    'Aurora', 'Caleb', 'Vera', 'Luke', 'Clara', 'Owen', 'Stella', 'Connor', 'Lydia', 'Carter',
    'Natalie', 'Wyatt', 'Hannah', 'Jayden', 'Lucy', 'Grayson', 'Eleanor', 'Lincoln', 'Madison', 'Eli',
    'Scarlett', 'Gabriel', 'Victoria', 'Julian', 'Aubrey', 'Aaron', 'Grace', 'Hunter', 'Chloe', 'Eliot'
]

# Realistic last names
LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
    'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
    'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
    'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes',
    'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper',
    'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson',
    'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes',
    'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross', 'Foster', 'Jimenez'
]

# Realistic email domains
EMAIL_DOMAINS = [
    'gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'icloud.com', 'btinternet.com', 'sky.com',
    'virginmedia.com', 'talktalk.net', 'web.de', 'orange.fr', 'libero.it', 'telenet.be', 'ziggo.nl',
    'tiscali.it', 'wanadoo.fr', 'gmx.de', 'freenet.de', 'alice.it', 'tin.it'
]

# Realistic UK cities and postcodes
UK_CITIES = [
    ('Manchester', 'M13 9PL'), ('Birmingham', 'B15 2TT'), ('Leeds', 'LS2 9JT'), ('Liverpool', 'L69 3BX'),
    ('Sheffield', 'S10 2TN'), ('Bristol', 'BS8 1TH'), ('Newcastle', 'NE1 7RU'), ('Nottingham', 'NG7 2RD'),
    ('Cardiff', 'CF10 3AT'), ('Belfast', 'BT1 5GS'), ('Edinburgh', 'EH1 1YZ'), ('Glasgow', 'G1 1XQ'),
    ('Leicester', 'LE1 7RH'), ('Coventry', 'CV1 5FB'), ('Bradford', 'BD1 1HY'), ('Stoke-on-Trent', 'ST1 5AB'),
    ('Wolverhampton', 'WV1 1LY'), ('Plymouth', 'PL1 2AA'), ('Southampton', 'SO14 2AY'), ('Reading', 'RG1 3EU')
]

# International cities
INTL_CITIES = [
    ('Berlin', '10115', 'Germany'), ('Paris', '75001', 'France'), ('Milan', '20121', 'Italy'),
    ('Amsterdam', '1012 JS', 'Netherlands'), ('Brussels', '1000', 'Belgium'), ('Dublin', 'D01', 'Ireland'),
    ('Madrid', '28001', 'Spain'), ('Vienna', '1010', 'Austria'), ('Zurich', '8001', 'Switzerland'),
    ('Copenhagen', '1050', 'Denmark'), ('Stockholm', '111 22', 'Sweden'), ('Oslo', '0150', 'Norway')
]

# University programmes
PROGRAMMES = [
    'BA (Hons) Business Management', 'BSc (Hons) Computer Science', 'BA (Hons) Psychology',
    'BEng (Hons) Mechanical Engineering', 'BA (Hons) English Literature', 'BSc (Hons) Mathematics',
    'BA (Hons) History', 'BSc (Hons) Biology', 'BA (Hons) Economics', 'BSc (Hons) Physics',
    'BA (Hons) Sociology', 'BSc (Hons) Chemistry', 'BA (Hons) Politics', 'BSc (Hons) Geography',
    'BA (Hons) Philosophy', 'BSc (Hons) Environmental Science', 'BA (Hons) Modern Languages',
    'BSc (Hons) Accounting and Finance', 'BA (Hons) Art and Design', 'BSc (Hons) Sports Science',
    'BA (Hons) Journalism', 'BSc (Hons) Nursing', 'BA (Hons) Law', 'BSc (Hons) Architecture',
    'BA (Hons) Music'
]

# Campus names
CAMPUSES = [
    'Main Campus', 'City Centre Campus', 'Park Campus', 'Riverside Campus', 'Hillside Campus',
    'West Campus', 'East Campus'
]

# Academic years
ACADEMIC_YEARS = ['2025/26', '2026/27', '2027/28']

# Status options
STATUSES = ['new', 'contacted', 'qualified', 'nurturing', 'cold', 'converted', 'lost']

# Lifecycle states
LIFECYCLE_STATES = ['lead', 'applicant', 'enrolled', 'alumni']

def generate_phone_number():
    """Generate realistic UK phone number"""
    return f"+44 7{random.randint(100, 999)} {random.randint(100000, 999999)}"

def generate_international_phone(country):
    """Generate realistic international phone number"""
    if country == 'Germany':
        return f"+49 {random.randint(150, 179)} {random.randint(1000000, 9999999)}"
    elif country == 'France':
        return f"+33 6 {random.randint(10, 99)} {random.randint(100000, 999999)}"
    elif country == 'Italy':
        return f"+39 3{random.randint(10, 99)} {random.randint(1000000, 9999999)}"
    else:
        return f"+{random.randint(30, 99)} {random.randint(100000000, 999999999)}"

def generate_realistic_timestamp():
    """Generate realistic timestamp within last 6 months"""
    now = datetime.now()
    # Random date within last 6 months
    days_ago = random.randint(0, 180)
    base_date = now - timedelta(days=days_ago)
    
    # Add random time within the day
    random_hours = random.randint(8, 20)  # Business hours
    random_minutes = random.randint(0, 59)
    random_seconds = random.randint(0, 59)
    
    return base_date.replace(hour=random_hours, minute=random_minutes, second=random_seconds)

def generate_lead_score():
    """Generate realistic lead score with some correlation to engagement"""
    base_score = random.randint(20, 95)
    # Add some variation based on recency
    return min(100, max(10, base_score))

def generate_conversion_probability(lead_score):
    """Generate conversion probability correlated with lead score"""
    base_prob = lead_score / 100.0
    # Add some noise
    noise = random.uniform(-0.1, 0.1)
    return max(0.1, min(0.95, base_prob + noise))

def generate_engagement_score(lead_score, days_ago):
    """Generate engagement score based on lead score and recency"""
    base_engagement = lead_score * 0.8
    # Reduce engagement for older leads
    recency_factor = max(0.3, 1.0 - (days_ago / 180.0))
    return int(base_engagement * recency_factor)

def generate_touchpoint_count(days_ago, engagement_score):
    """Generate realistic touchpoint count"""
    # More recent leads have more touchpoints
    base_touchpoints = max(1, int(engagement_score / 20))
    # Add some random variation
    return base_touchpoints + random.randint(0, 5)

def generate_leads(count=125):
    """Generate specified number of realistic leads"""
    leads = []
    
    for i in range(count):
        lead_id = f"550e8400-e29b-41d4-a716-446655440{100 + i:03d}"
        
        # Basic info
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)
        email = f"{first_name.lower()}.{last_name.lower()}@{random.choice(EMAIL_DOMAINS)}"
        
        # Location (80% UK, 20% international)
        if random.random() < 0.8:
            city, postcode = random.choice(UK_CITIES)
            country = 'United Kingdom'
            phone = generate_phone_number()
            phone_country_code = '+44'
            phone_number = phone.replace('+44 ', '')
        else:
            city, postcode, country = random.choice(INTL_CITIES)
            phone = generate_international_phone(country)
            phone_country_code = phone.split(' ')[0]
            phone_number = phone.split(' ', 1)[1]
        
        # Timestamps
        created_at = generate_realistic_timestamp()
        days_ago = (datetime.now() - created_at).days
        
        # Lead characteristics
        lead_score = generate_lead_score()
        conversion_prob = generate_conversion_probability(lead_score)
        engagement_score = generate_engagement_score(lead_score, days_ago)
        touchpoint_count = generate_touchpoint_count(days_ago, engagement_score)
        
        # Last engagement (more recent than creation for active leads)
        if random.random() < 0.7:  # 70% have recent engagement
            last_engagement = created_at + timedelta(days=random.randint(0, min(30, days_ago)))
        else:
            last_engagement = created_at
        
        # Demographics
        birth_year = random.randint(1980, 2005)
        date_of_birth = f"{birth_year}-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}"
        
        # Status and lifecycle
        status = random.choices(STATUSES, weights=[30, 25, 20, 15, 5, 3, 2])[0]
        lifecycle_state = random.choices(LIFECYCLE_STATES, weights=[70, 20, 8, 2])[0]
        
        # Programme assignment
        programme = random.choice(PROGRAMMES)
        campus = random.choice(CAMPUSES)
        academic_year = random.choice(ACADEMIC_YEARS)
        
        # Address
        address_line1 = f"{random.randint(1, 999)} {random.choice(['University Road', 'Campus Lane', 'Student Street', 'College Close', 'University Avenue', 'Campus Way', 'University Place'])}"
        address_line2 = random.choice([None, f"Flat {random.randint(1, 20)}{random.choice(['A', 'B', 'C'])}", f"Apt {random.randint(1, 10)}", f"Suite {random.randint(1, 5)}"])
        
        # Contact preferences
        preferred_contact = random.choice(['email', 'phone', 'email', 'phone'])  # Slight bias to email
        
        lead = {
            'id': lead_id,
            'org_id': '550e8400-e29b-41d4-a716-446655440000',
            'first_name': first_name,
            'last_name': last_name,
            'email': email,
            'phone': phone,
            'lifecycle_state': lifecycle_state,
            'lead_score': lead_score,
            'conversion_probability': round(conversion_prob, 2),
            'date_of_birth': date_of_birth,
            'nationality': 'British' if country == 'United Kingdom' else country,
            'address_line1': address_line1,
            'address_line2': address_line2,
            'city': city,
            'postcode': postcode,
            'country': country,
            'phone_country_code': phone_country_code,
            'phone_number': phone_number,
            'phone_extension': None,
            'preferred_contact_method': preferred_contact,
            'touchpoint_count': touchpoint_count,
            'last_engagement_date': last_engagement.strftime('%Y-%m-%d %H:%M:%S'),
            'engagement_score': engagement_score,
            'created_at': created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'latest_programme_name': programme,
            'latest_campus_name': campus,
            'latest_academic_year': academic_year,
            'status': status
        }
        
        leads.append(lead)
    
    return leads

def generate_sql_insert(leads):
    """Generate SQL INSERT statement for leads"""
    sql = "-- Generated realistic leads data\n\n"
    sql += "INSERT INTO people (id, org_id, first_name, last_name, email, phone, lifecycle_state, lead_score, conversion_probability, \n"
    sql += "                   date_of_birth, nationality, address_line1, address_line2, city, postcode, country,\n"
    sql += "                   phone_country_code, phone_number, phone_extension, preferred_contact_method,\n"
    sql += "                   touchpoint_count, last_engagement_date, engagement_score, created_at, updated_at) VALUES\n"
    
    for i, lead in enumerate(leads):
        sql += f"('{lead['id']}', '{lead['org_id']}', '{lead['first_name']}', '{lead['last_name']}', "
        sql += f"'{lead['email']}', '{lead['phone']}', '{lead['lifecycle_state']}', {lead['lead_score']}, "
        sql += f"{lead['conversion_probability']}, '{lead['date_of_birth']}', '{lead['nationality']}', "
        sql += f"'{lead['address_line1']}', "
        address_line2_value = 'NULL' if lead['address_line2'] is None else f"'{lead['address_line2']}'"
        sql += f"{address_line2_value}, "
        sql += f"'{lead['city']}', '{lead['postcode']}', '{lead['country']}', "
        sql += f"'{lead['phone_country_code']}', '{lead['phone_number']}', NULL, "
        sql += f"'{lead['preferred_contact_method']}', {lead['touchpoint_count']}, "
        sql += f"'{lead['last_engagement_date']}', {lead['engagement_score']}, "
        sql += f"'{lead['created_at']}', '{lead['updated_at']}')"
        
        if i < len(leads) - 1:
            sql += ",\n"
        else:
            sql += ";\n\n"
    
    # Add programme assignments
    sql += "-- Update people with programme assignments\n"
    sql += "UPDATE people SET \n"
    sql += "  latest_programme_name = CASE id\n"
    
    for lead in leads:
        sql += f"    WHEN '{lead['id']}' THEN '{lead['latest_programme_name']}'\n"
    
    sql += "  END,\n"
    sql += "  latest_campus_name = CASE id\n"
    
    for lead in leads:
        sql += f"    WHEN '{lead['id']}' THEN '{lead['latest_campus_name']}'\n"
    
    sql += "  END,\n"
    sql += "  latest_academic_year = CASE id\n"
    
    for lead in leads:
        sql += f"    WHEN '{lead['id']}' THEN '{lead['latest_academic_year']}'\n"
    
    sql += "  END,\n"
    sql += "  status = CASE id\n"
    
    for lead in leads:
        sql += f"    WHEN '{lead['id']}' THEN '{lead['status']}'\n"
    
    sql += "  END\n"
    sql += "WHERE id::text LIKE '550e8400-e29b-41d4-a716-446655440%';\n"
    
    return sql

if __name__ == "__main__":
    print("Generating 125 realistic leads...")
    leads = generate_leads(125)
    
    print("Generating SQL...")
    sql = generate_sql_insert(leads)
    
    with open('0028_leads_data_generated.sql', 'w') as f:
        f.write(sql)
    
    print(f"Generated {len(leads)} leads")
    print("SQL written to 0028_leads_data_generated.sql")
    
    # Print some statistics
    print("\nStatistics:")
    print(f"Lead scores: {min(l['lead_score'] for l in leads)}-{max(l['lead_score'] for l in leads)}")
    print(f"Conversion probabilities: {min(l['conversion_probability'] for l in leads):.2f}-{max(l['conversion_probability'] for l in leads):.2f}")
    print(f"Engagement scores: {min(l['engagement_score'] for l in leads)}-{max(l['engagement_score'] for l in leads)}")
    print(f"Touchpoint counts: {min(l['touchpoint_count'] for l in leads)}-{max(l['touchpoint_count'] for l in leads)}")
    
    # Status distribution
    status_counts = {}
    for lead in leads:
        status = lead['status']
        status_counts[status] = status_counts.get(status, 0) + 1
    
    print("\nStatus distribution:")
    for status, count in sorted(status_counts.items()):
        print(f"  {status}: {count}")
