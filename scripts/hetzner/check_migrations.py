"""
Run Prisma migrations by SSH port-forwarding to PgBouncer on db1,
then running prisma migrate deploy locally for each service.
"""
import paramiko
import subprocess
import os
import time
import threading

# Services with prisma migrations
prisma_services = [
    'auth-svc', 'session-svc', 'content-svc', 'profile-svc',
    'messaging-svc', 'goal-svc', 'life-skills-svc', 'baseline-svc',
    'assessment-svc', 'notify-svc', 'consent-svc', 'personalization-svc',
    'billing-svc', 'payments-svc', 'analytics-svc', 'focus-svc',
    'parent-svc'
]

# Database name mapping 
db_mapping = {
    'auth-svc': 'aivo_auth',
    'session-svc': 'aivo_sessions',
    'content-svc': 'aivo_content',
    'profile-svc': 'aivo_profiles',
    'messaging-svc': 'aivo_messaging',
    'goal-svc': 'aivo_goals',
    'life-skills-svc': 'aivo_life_skills',
    'baseline-svc': 'aivo_baseline',
    'assessment-svc': 'aivo_assessment',
    'notify-svc': 'aivo_notify',
    'consent-svc': 'aivo_consent',
    'personalization-svc': 'aivo_personalization',
    'billing-svc': 'aivo_billing',
    'payments-svc': 'aivo_billing',
    'analytics-svc': 'aivo_analytics',
    'focus-svc': 'aivo_focus',
    'parent-svc': 'aivo_parent',
}

workspace_root = r'c:\Users\ofema\aivo'
db_password = 'Sh74VCfR40tiFd^d5P5spAneUiK&vzpp'

# Check which services actually have migrations
services_with_migrations = []
for svc in prisma_services:
    schema_path = os.path.join(workspace_root, 'services', svc, 'prisma', 'schema.prisma')
    migrations_dir = os.path.join(workspace_root, 'services', svc, 'prisma', 'migrations')
    if os.path.exists(schema_path) and os.path.exists(migrations_dir):
        migration_count = len([d for d in os.listdir(migrations_dir) if os.path.isdir(os.path.join(migrations_dir, d))])
        services_with_migrations.append((svc, migration_count))
        print(f"  ✅ {svc}: {migration_count} migrations found")
    elif os.path.exists(schema_path):
        print(f"  ⚠️  {svc}: schema.prisma found but no migrations dir")
    else:
        print(f"  ❌ {svc}: No prisma schema found")

print(f"\nTotal: {len(services_with_migrations)} services with migrations")

# Check if parent-svc database exists
if 'parent-svc' not in [s for s, _ in services_with_migrations]:
    print("\nNote: parent-svc not found in services_with_migrations")
