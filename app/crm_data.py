import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "crm_pipeline.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Create Sales Reps table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sales_reps (
        rep_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        region TEXT NOT NULL,
        quarterly_target REAL NOT NULL
    )
    """)
    
    # 2. Create Opportunities/Deals table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS deals (
        deal_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        stage TEXT NOT NULL,
        close_date TEXT NOT NULL,
        rep_id INTEGER,
        FOREIGN KEY (rep_id) REFERENCES sales_reps(rep_id)
    )
    """)
    
    # 3. Create Interactions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS interactions (
        interaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
        deal_id INTEGER,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (deal_id) REFERENCES deals(deal_id)
    )
    """)
    
    # Seed data if tables are empty
    cursor.execute("SELECT COUNT(*) FROM sales_reps")
    if cursor.fetchone()[0] == 0:
        reps = [
            ("Alice Smith", "North America", 150000.00),
            ("Bob Jones", "North America", 120000.00),
            ("Charlie Brown", "Europe", 180000.00),
            ("Diana Prince", "Europe", 160000.00),
            ("Ethan Hunt", "Asia Pacific", 140000.00)
        ]
        cursor.executemany("INSERT INTO sales_reps (name, region, quarterly_target) VALUES (?, ?, ?)", reps)
        
        deals = [
            ("Acme Corp Cloud Migration", 85000.00, "Closed Won", "2026-04-15", 1),
            ("Beta Industries License Renew", 30000.00, "Proposal", "2026-07-10", 1),
            ("Gamma Systems Security Suite", 120000.00, "Closed Won", "2026-05-20", 2),
            ("Delta Co Training Services", 15000.00, "Closed Lost", "2026-03-01", 2),
            ("Epsilon Gmbh ERP Upgrade", 210000.00, "Closed Won", "2026-06-02", 3),
            ("Zeta Sarl CRM Integration", 45000.00, "Prospecting", "2026-08-15", 3),
            ("Eta Corp Data Warehouse", 175000.00, "Proposal", "2026-07-30", 4),
            ("Theta Inc Consultancy Contract", 60000.00, "Closed Won", "2026-06-18", 4),
            ("Iota Ltd Mobile Application", 95000.00, "Closed Won", "2026-05-12", 5),
            ("Kappa Co Logistics Platform", 110000.00, "Prospecting", "2026-09-05", 5)
        ]
        cursor.executemany("INSERT INTO deals (name, amount, stage, close_date, rep_id) VALUES (?, ?, ?, ?, ?)", deals)
        
        interactions = [
            (1, "2026-04-10", "Meeting", "Final negotiation meeting, contract signed!"),
            (2, "2026-06-20", "Email", "Sent formal proposal for license renewal."),
            (3, "2026-05-18", "Call", "Follow up call on security suite implementation."),
            (5, "2026-05-30", "Meeting", "Demoed the new ERP workflows to German stakeholders."),
            (7, "2026-06-21", "Call", "Diana called to discuss customization requirements.")
        ]
        cursor.executemany("INSERT INTO interactions (deal_id, date, type, notes) VALUES (?, ?, ?, ?)", interactions)
        
        conn.commit()
        
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
