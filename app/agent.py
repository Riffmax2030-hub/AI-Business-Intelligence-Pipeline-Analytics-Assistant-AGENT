# ruff: noqa
import datetime
from typing import Any
from pydantic import BaseModel, Field, model_validator

from google.adk.workflow import Workflow, node, START, Edge
from google.adk.agents import LlmAgent
from google.adk.events.event import Event
from google.adk.agents.context import Context
from google.adk.apps import App
from google.adk.models import Gemini
from google.genai import types

from app.security import scrub_pii, detect_prompt_injection, is_sql_safe
from app.db_skills import get_database_schema, execute_query

# --- Configuration & Model ---
model_instance = Gemini(
    model="gemini-2.5-flash",
    retry_options=types.HttpRetryOptions(attempts=3),
)

# --- Schemas ---

class WorkflowInput(BaseModel):
    query: str = Field(description="The natural language question from the user.")

    @model_validator(mode='before')
    @classmethod
    def parse_input(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "query" in data:
                return data
            # Handle possible key aliases
            for key in ["text", "data", "message", "prompt"]:
                if key in data:
                    return {"query": str(data[key])}
            return data
            
        # Unpack Google GenAI Content model used by the playground UI
        if hasattr(data, "parts") and data.parts:
            parts_texts = []
            for part in data.parts:
                if hasattr(part, "text") and part.text:
                    parts_texts.append(part.text)
                elif isinstance(part, dict) and "text" in part:
                    parts_texts.append(part["text"])
            if parts_texts:
                return {"query": " ".join(parts_texts)}
                
        # Unpack serialized Pydantic model representation
        if hasattr(data, "model_dump"):
            try:
                dump = data.model_dump()
                if "parts" in dump:
                    texts = [p.get("text") for p in dump["parts"] if p.get("text")]
                    return {"query": " ".join(texts)}
            except Exception:
                pass

        if isinstance(data, str):
            return {"query": data}
            
        return data

class SQLQuery(BaseModel):
    sql: str = Field(description="The generated read-only SQL SELECT query to retrieve the necessary data.")
    explanation: str = Field(description="Brief explanation of the query design.")

class AnalyticsOutcome(BaseModel):
    status: str = Field(description="SUCCESS or REJECTED")
    query_executed: str | None = Field(default=None, description="The SQL query that was executed.")
    results: str | None = Field(default=None, description="Raw query results in markdown table format.")
    report: str = Field(description="The formatted analyst report, including insights and business recommendations.")

# --- Nodes ---

@node
def security_guardrail(node_input: WorkflowInput) -> Event:
    """Checks for prompt injections and scrubs PII before routing to the agents."""
    query = node_input.query
    
    # 1. Detect Injection
    if detect_prompt_injection(query):
        state_delta = {
            "status": "REJECTED",
            "report": "Security Error: Prompt injection or instruction override attempt detected. Action blocked."
        }
        return Event(output=node_input.model_dump(), route="unsafe", state=state_delta)
        
    # 2. Scrub PII
    clean_query = scrub_pii(query)
    state_delta = {
        "original_query": query,
        "clean_query": clean_query,
        "schema_info": get_database_schema()
    }
    
    return Event(output={"query": clean_query}, route="safe", state=state_delta)


@node
def reject_node(ctx: Context, node_input: Any) -> Event:
    """Outputs the security reject outcome."""
    outcome = AnalyticsOutcome(
        status=ctx.state.get("status", "REJECTED"),
        report=ctx.state.get("report", "Action blocked due to security protocols.")
    )
    return Event(output=outcome.model_dump())


# SQL Generator Agent
sql_generator_agent = LlmAgent(
    name="sql_generator_agent",
    model=model_instance,
    instruction="""You are a database engineer. Based on the user query and the database schema provided, formulate a safe, read-only SQLite SELECT query.
    Rules:
    - ONLY output a SELECT statement. Do not try to modify data.
    - Write clean, efficient SQL.
    - Use standard SQLite functions if necessary.
    - Important: The stages in the 'deals' table are: 'Closed Won', 'Closed Lost', 'Proposal', and 'Prospecting'. When filtering for won deals, use 'Closed Won'.
    
    Schema:
    {schema_info}
    """,
    output_schema=SQLQuery,
    output_key="sql_query",
)


@node
def query_executor_node(ctx: Context, node_input: Any) -> Event:
    """Executes the generated SQL query and stores the output in context state."""
    sql_query_dict = ctx.state.get("sql_query", {})
    sql = sql_query_dict.get("sql", "")
    
    # Check if query is safe to execute
    if not is_sql_safe(sql):
        state_delta = {
            "query_executed": sql,
            "results": "Security Violation: SQL query rejected as unsafe.",
            "sql_safe": False
        }
        return Event(output=node_input, state=state_delta)
        
    # Execute query
    results = execute_query(sql)
    state_delta = {
        "query_executed": sql,
        "results": results,
        "sql_safe": True
    }
    return Event(output=node_input, state=state_delta)


# Analyst Agent
analyst_agent = LlmAgent(
    name="analyst_agent",
    model=model_instance,
    instruction="""You are a Senior Strategic Business Analyst. Review the user's original query, the SQL executed to fetch the data, and the raw query results.
    Provide a professional business intelligence report.
    Include:
    - A summary of the key findings.
    - Clean Markdown tables/visualizations of the data.
    - 2-3 strategic recommendations based on the data findings.
    
    Original query: {original_query}
    SQL run: {query_executed}
    Raw results:
    {results}
    """,
    output_schema=AnalyticsOutcome,
    output_key="outcome",
)


@node
def format_output_node(ctx: Context, node_input: Any) -> Event:
    """Extracts and returns the final workflow outcome."""
    outcome_dict = ctx.state.get("outcome", {})
    
    outcome = AnalyticsOutcome(
        status="SUCCESS" if ctx.state.get("sql_safe", True) else "REJECTED",
        query_executed=ctx.state.get("query_executed"),
        results=ctx.state.get("results"),
        report=outcome_dict.get("report", "No report generated.")
    )
    return Event(output=outcome.model_dump())


# --- Workflow Graph Definition ---

root_agent = Workflow(
    name="pipeline_analytics_workflow",
    input_schema=WorkflowInput,
    output_schema=AnalyticsOutcome,
    edges=[
        Edge(from_node=START, to_node=security_guardrail),
        Edge(from_node=security_guardrail, to_node=reject_node, route="unsafe"),
        Edge(from_node=security_guardrail, to_node=sql_generator_agent, route="safe"),
        Edge(from_node=sql_generator_agent, to_node=query_executor_node),
        Edge(from_node=query_executor_node, to_node=analyst_agent),
        Edge(from_node=analyst_agent, to_node=format_output_node),
    ],
)

app = App(
    root_agent=root_agent,
    name="app",
)
