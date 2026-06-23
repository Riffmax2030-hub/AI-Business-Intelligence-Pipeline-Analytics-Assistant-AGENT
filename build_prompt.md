# AI Coding Assistant Prompt: Reconstruct the Pipeline Analytics Agent

Use this prompt in any advanced AI coding assistant to scaffold, design, and implement the **Enterprise-Safe Multi-Agent Business Intelligence & Sales Pipeline Analyst** from scratch.

---

## System Context & Objective
Build an AI Agent using the **Google Agent Development Kit (ADK)** and `agents-cli` framework that allows business executives to query a mock SQLite CRM database using natural language. 
The system must be multi-agent, utilize a custom stdio-based MCP server to interface with the database, and contain robust input/SQL safety guardrails to ensure it operates strictly in a read-only fashion.

---

## File Structure to Implement
```
pipeline-analytics-agent/
├── app/
│   ├── __init__.py           # Package exports
│   ├── agent.py              # Main ADK Multi-Agent Workflow definition
│   ├── agent_runtime_app.py  # Vertex AI ADK App wrapping environment variables
│   ├── crm_data.py           # Database simulator and seeder
│   ├── db_skills.py          # Wrapper skills for the agent tools
│   ├── mcp_server.py         # Standard stdio JSON-RPC MCP server
│   ├── mock_creds.json       # Mock service account credentials to bypass GCE checks
│   └── security.py           # Security checks, PII scrubbing, SQL validator
├── tests/
│   └── unit/
│       └── test_agent_components.py  # Unit test suite
└── pyproject.toml            # Project dependencies
```

---

## Step-by-Step Implementation Instructions

### Step 1: Database Setup (`app/crm_data.py`)
Create a SQLite database `crm_pipeline.db` containing:
1. `sales_reps`: `rep_id` (PK), `name`, `region`, `quarterly_target` (float).
2. `deals`: `deal_id` (PK), `name`, `amount`, `stage` ('Closed Won', 'Closed Lost', 'Proposal', 'Prospecting'), `close_date`, `rep_id` (FK).
3. `interactions`: `interaction_id` (PK), `deal_id` (FK), `date`, `type` ('Call', 'Email', 'Meeting'), `notes`.
Pre-seed the database with at least 5 sales representatives and 10 deals.

### Step 2: Safety & Guardrails (`app/security.py`)
Write functions to protect the database and model:
*   `scrub_pii(text: str)`: Use regex to redact email addresses and phone numbers.
*   `detect_prompt_injection(text: str)`: Detect keywords like "ignore rules", "override system prompt", "bypass", etc.
*   `is_sql_safe(query: str)`: Ensure the SQL statement is strictly a read-only `SELECT` (or `WITH` CTE). Block words like `DELETE`, `DROP`, `UPDATE`, `INSERT`, `ALTER`, `REPLACE`, `TRUNCATE`.

### Step 3: Stdio MCP Server (`app/mcp_server.py`)
Write an offline stdio-based MCP server in python that listens to `stdin` and writes JSON-RPC responses to `stdout`.
It must support:
*   `tools/list`: Return definitions for `get_database_schema` and `execute_query` (takes `sql` argument).
*   `tools/call`:
    *   `get_database_schema`: Query sqlite metadata and format the tables/columns as text.
    *   `execute_query`: Validate the query using `is_sql_safe` and execute safe queries, returning markdown tables of results.

### Step 4: Wrapper Skills (`app/db_skills.py`)
Create wrapper functions `get_database_schema()` and `execute_query(sql)` that import and call the MCP server functions. These are exposed to the ADK agent.

### Step 5: ADK Multi-Agent Workflow (`app/agent.py`)
Define an ADK `Workflow` connecting these nodes and agents:
1.  **Input Schema**: `WorkflowInput` containing `query: str` (with a Pydantic `@model_validator` to parse raw `Content` objects from the playground UI).
2.  **Node `security_guardrail`**: Cleans input and checks for prompt injections. Routes to `reject_node` if unsafe.
3.  **Agent `sql_generator_agent`**: An `LlmAgent` using `gemini-2.5-flash`. Instruct it to generate a safe read-only SQL query based on the schema and to use `'Closed Won'` for won deal queries.
4.  **Node `query_executor_node`**: Executes the generated SQL query via our skills.
5.  **Agent `analyst_agent`**: An `LlmAgent` that takes the query output and writes a strategic business report with insights and recommendations.

### Step 6: App Runtime Configuration (`app/agent_runtime_app.py`)
Configure `AgentEngineApp` to run locally without crashing.
*   Wrap `vertexai.init()` and `google_cloud_logging` initializations in try-except statements.
*   Expose `GOOGLE_APPLICATION_CREDENTIALS` pointing to `mock_creds.json` containing mock offline credentials to bypass GCE credential lookups.
