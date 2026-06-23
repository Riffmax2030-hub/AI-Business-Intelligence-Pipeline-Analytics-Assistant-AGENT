import sys
import json
import sqlite3
import os
from app.security import is_sql_safe

DB_PATH = os.path.join(os.path.dirname(__file__), "crm_pipeline.db")

def get_schema_info() -> str:
    """Returns database schema details."""
    if not os.path.exists(DB_PATH):
        return "Error: CRM Database is not initialized."
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get list of tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = [t[0] for t in cursor.fetchall()]
        
        schema_output = "CRM Database Schema:\n"
        for table in tables:
            schema_output += f"\nTable: {table}\n"
            cursor.execute(f"PRAGMA table_info({table})")
            columns = cursor.fetchall()
            for col in columns:
                # col[1] = name, col[2] = type
                schema_output += f" - {col[1]} ({col[2]})\n"
                
        conn.close()
        return schema_output
    except Exception as e:
        return f"Error retrieving schema: {str(e)}"

def execute_readonly_query(sql: str) -> str:
    """Safely executes a query and returns the tabular result."""
    if not is_sql_safe(sql):
        return "Security Violation: Query rejected because it is not a safe, read-only SELECT statement."
        
    if not os.path.exists(DB_PATH):
        return "Error: CRM Database is not initialized."
        
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(sql)
        
        # Get column names
        cols = [description[0] for description in cursor.description]
        rows = cursor.fetchall()
        
        if not rows:
            return "Query executed successfully. Result: (no rows returned)"
            
        # Format results as a readable markdown table
        header = " | ".join(cols)
        divider = " | ".join(["---"] * len(cols))
        markdown_rows = []
        for r in rows:
            markdown_rows.append(" | ".join(str(val) for val in r))
            
        result_table = f"{header}\n{divider}\n" + "\n".join(markdown_rows)
        conn.close()
        return result_table
    except Exception as e:
        return f"Database Error: {str(e)}"

def main():
    # Direct stdio loop for Model Context Protocol JSON-RPC
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
                
            request = json.loads(line)
            req_id = request.get("id")
            method = request.get("method")
            params = request.get("params", {})
            
            # MCP Protocol Handlers
            if method == "initialize":
                response = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {
                            "tools": {}
                        },
                        "serverInfo": {
                            "name": "crm-pipeline-mcp-server",
                            "version": "1.0.0"
                        }
                    }
                }
            elif method == "tools/list":
                response = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "tools": [
                            {
                                "name": "get_database_schema",
                                "description": "Returns the list of tables, fields, and types in the CRM pipeline database.",
                                "inputSchema": {
                                    "type": "object",
                                    "properties": {}
                                }
                            },
                            {
                                "name": "execute_query",
                                "description": "Executes a safe read-only SQL query against the database and returns tabular results.",
                                "inputSchema": {
                                    "type": "object",
                                    "properties": {
                                        "sql": {
                                            "type": "string",
                                            "description": "The SELECT statement to run."
                                        }
                                    },
                                    "required": ["sql"]
                                }
                            }
                        ]
                    }
                }
            elif method == "tools/call":
                tool_name = params.get("name")
                args = params.get("arguments", {})
                
                if tool_name == "get_database_schema":
                    content_text = get_schema_info()
                elif tool_name == "execute_query":
                    sql = args.get("sql", "")
                    content_text = execute_readonly_query(sql)
                else:
                    content_text = f"Error: Tool '{tool_name}' not found."
                    
                response = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "content": [
                            {
                                "type": "text",
                                "text": content_text
                            }
                        ]
                    }
                }
            else:
                response = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {
                        "code": -32601,
                        "message": f"Method {method} not found"
                    }
                }
                
            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()
        except Exception as e:
            # Silence error or write a JSON error response to stay RPC compliant
            error_response = {
                "jsonrpc": "2.0",
                "error": {
                    "code": -32603,
                    "message": f"Internal error: {str(e)}"
                }
            }
            sys.stdout.write(json.dumps(error_response) + "\n")
            sys.stdout.flush()

if __name__ == "__main__":
    main()
