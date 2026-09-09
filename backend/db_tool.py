import os
import sys
import getpass
import pymysql
from sqlalchemy import create_engine, inspect, text
from app.core.config import settings
from app.database.session import Base
import app.models

def test_and_init_mysql(user: str = "root", password: str = None, host: str = "127.0.0.1", port: int = 3306):
    """
    Tests connection to local MySQL 8.x, creates the database 'city_anpr' if needed,
    and initializes all tables with foreign keys and composite indexes.
    """
    print("==================================================================")
    print("      LOCAL MYSQL 8.x INITIALIZATION & WORKBENCH CONNECTOR       ")
    print("==================================================================")
    
    # Try password from .env / settings or provided parameter
    pwd_to_test = password
    if pwd_to_test is None:
        # Check settings.DATABASE_URL
        if "mysql+pymysql://" in settings.DATABASE_URL:
            try:
                part = settings.DATABASE_URL.split("mysql+pymysql://")[1]
                user_pass = part.split("@")[0]
                if ":" in user_pass:
                    pwd_to_test = user_pass.split(":")[1]
                    user = user_pass.split(":")[0]
            except Exception:
                pass

    passwords_to_try = [pwd_to_test] if pwd_to_test else []
    passwords_to_try.extend(['root', 'password', 'admin', '123456', '1234', '12345678', ''])

    connected_conn = None
    working_pwd = None

    for pwd in passwords_to_try:
        if pwd is None:
            continue
        try:
            conn = pymysql.connect(host=host, port=port, user=user, password=pwd, charset='utf8mb4')
            connected_conn = conn
            working_pwd = pwd
            break
        except Exception:
            continue

    if not connected_conn:
        print(f"[?] Could not connect to MySQL 8.x with default passwords on {host}:{port} for user '{user}'.")
        print("[!] Please enter your local MySQL root password below (or configure backend/.env):")
        try:
            working_pwd = getpass.getpass("Enter MySQL password: ")
            connected_conn = pymysql.connect(host=host, port=port, user=user, password=working_pwd, charset='utf8mb4')
        except Exception as e:
            print(f"[X] Connection failed: {e}")
            print("\nPlease ensure MySQL Server 8.0 service is running and credentials in backend/.env are correct.")
            return None

    print(f"[+] Successfully connected to local MySQL 8.x on {host}:{port} as user '{user}'!")

    # Create city_anpr database if not exists
    with connected_conn.cursor() as cursor:
        cursor.execute("CREATE DATABASE IF NOT EXISTS city_anpr CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        cursor.execute("SHOW DATABASES;")
        dbs = [row[0] for row in cursor.fetchall()]
        print(f"[+] Active Databases in MySQL: {', '.join(dbs)}")
    connected_conn.close()

    db_url = f"mysql+pymysql://{user}:{working_pwd}@{host}:{port}/city_anpr?charset=utf8mb4"
    
    # Create all tables & indexes via SQLAlchemy
    engine = create_engine(db_url)
    Base.metadata.create_all(bind=engine)
    
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"\n[+] Successfully verified/created {len(tables)} tables in 'city_anpr':")
    
    with engine.connect() as conn:
        for t in tables:
            count = conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
            print(f"    - Table: `{t:<15}` | Total Rows: {count}")

    print("\n==================================================================")
    print("  MYSQL WORKBENCH CONNECTION SETTINGS:")
    print(f"  Hostname: {host}")
    print(f"  Port:     {port}")
    print(f"  Username: {user}")
    print(f"  Database: city_anpr")
    print("==================================================================\n")

    return db_url

if __name__ == "__main__":
    test_and_init_mysql()
