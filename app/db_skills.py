from app.mcp_server import get_schema_info, execute_readonly_query

def get_database_schema() -> str:
    """Retrieves the list of tables, fields, and descriptions in the CRM database.
    
    Use this to see the structure of tables before running queries.
    """
    return get_schema_info()

def execute_query(sql: str) -> str:
    """Executes a safe read-only SQL query against the CRM database.
    
    Args:
        sql: The SELECT statement to run.
        
    Returns:
        A markdown table of results, or an error/security violation message.
    """
    return execute_readonly_query(sql)
