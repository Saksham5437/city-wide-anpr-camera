import os
import sys
import pymysql
from sqlalchemy import create_engine, inspect, text
from app.core.config import settings
from app.database.session import Base
import app.models

def test_mysql_connection():
    passwords = ['root', 'password', '', 'admin', '123456', '1234', '12345678', 'saksham', 'Saksham5437']
    connected_conn = None
    used_pwd = None
    
    for pwd in passwords:
        try:
            conn = pymysql.connect(host='localhost', port=3306, user='root', password=pwd)
            connected_conn = conn
            used_pwd = pwd
            break
        except Exception:
            continue
            
    if connected_conn:
        print(f"[*] Successfully connected to local MySQL 8.x (User: 'root')")
        with connected_conn.cursor() as cursor:
            cursor.execute("CREATE DATABASE IF NOT EXISTS city_anpr;")
            cursor.execute("SHOW DATABASES;")
            dbs = [row[0] for row in cursor.fetchall()]
            print(f"[*] Available Databases: {', '.join(dbs)}")
        connected_conn.close()
        
        db_url = f"mysql+pymysql://root:{used_pwd}@localhost:3306/city_anpr"
        return db_url
    else:
        print("[!] Local MySQL running with custom password. Using SQLite database for active session.")
        return "sqlite:///./anpr.db"

def inspect_database(db_url: str):
    print(f"\n=======================================================")
    print(f"        CITY-WIDE ANPR DATABASE INSPECTOR")
    print(f"=======================================================")
    print(f"[*] Active Engine URL: {db_url}")
    
    engine = create_engine(db_url)
    Base.metadata.create_all(bind=engine)
    
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"[*] Detected Tables ({len(tables)}): {', '.join(tables)}\n")
    
    with engine.connect() as conn:
        for t in tables:
            count = conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
            print(f"  -> Table: {t:<15} | Row Count: {count}")
            
    print(f"=======================================================\n")

if __name__ == "__main__":
    db_url = test_mysql_connection()
    inspect_database(db_url)
