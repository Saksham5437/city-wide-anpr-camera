import sys
from sqlalchemy import create_engine, text
from app.core.config import settings

def show_table(table_name: str, limit: int = 10):
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        try:
            result = conn.execute(text(f"SELECT * FROM {table_name} LIMIT {limit}"))
            keys = result.keys()
            rows = result.fetchall()
            
            print(f"\n=== TABLE: {table_name.upper()} (Showing {len(rows)} records) ===")
            if not rows:
                print("No records found.")
                return
                
            # Column headers
            header = " | ".join([f"{k}" for k in keys])
            print(header)
            print("-" * len(header))
            
            # Row contents
            for r in rows:
                print(" | ".join([str(val) if val is not None else "NULL" for val in r]))
            print("===================================================\n")
        except Exception as e:
            print(f"Error querying table {table_name}: {e}")

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "all"
    if target == "all":
        for tbl in ["cameras", "vehicles", "detections", "vehicle_passages", "violations", "alerts", "videos", "watchlist", "users"]:
            show_table(tbl)
    else:
        show_table(target)

