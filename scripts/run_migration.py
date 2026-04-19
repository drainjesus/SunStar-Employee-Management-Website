#!/usr/bin/env python3
import os
import sys

# Read connection string from env or first arg
conn_str = os.environ.get('DATABASE_URL') or (sys.argv[1] if len(sys.argv) > 1 else None)
if not conn_str:
    print('ERROR: DATABASE_URL not provided', file=sys.stderr)
    sys.exit(2)

# Sanitize bracketed password if user wrapped it in []
if ':[' in conn_str and ']@' in conn_str:
    conn_str = conn_str.replace(':[', ':').replace(']@', '@')

sql_path = os.path.join(os.path.dirname(__file__), '..', 'backend-database', '09_add_history_fields.sql')
if not os.path.exists(sql_path):
    print('ERROR: migration SQL file not found at', sql_path, file=sys.stderr)
    sys.exit(3)

sql_text = open(sql_path, 'r', encoding='utf-8').read()

# Use psycopg2 if available, otherwise fail with helpful message
try:
    import psycopg2
except Exception as e:
    print('ERROR: psycopg2 not installed. Run: python -m pip install psycopg2-binary', file=sys.stderr)
    print('Detail:', e, file=sys.stderr)
    sys.exit(4)

# Split statements on semicolon (naive) and execute
statements = [s.strip() for s in sql_text.split(';') if s.strip()]

print('Connecting to database...')
try:
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()
    for i, stmt in enumerate(statements, 1):
        try:
            print(f'Executing statement {i}/{len(statements)}...')
            cur.execute(stmt)
        except Exception as e:
            print(f'Failed executing statement {i}:', e, file=sys.stderr)
            conn.rollback()
            cur.close()
            conn.close()
            sys.exit(5)
    conn.commit()
    cur.close()
    conn.close()
    print('Migration applied successfully.')
    sys.exit(0)
except Exception as e:
    print('ERROR: could not connect or execute migration:', e, file=sys.stderr)
    sys.exit(6)
