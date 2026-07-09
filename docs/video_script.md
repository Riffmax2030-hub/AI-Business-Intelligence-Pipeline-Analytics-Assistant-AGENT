# Vibe Coding Capstone: Video Presentation Script

Read this script aloud while recording your screen. Follow the visual prompts.

---

### **Section 1: The Pitch — Problem, Solution, Value (0:00 - 0:45)**
*   **Visual action**: Show your web dashboard homepage: `https://riffmax2030-hub.github.io/AI-Business-Intelligence-Pipeline-Analytics-Assistant-AGENT/`

> *"Hello everyone! Today, I’m presenting my Capstone Project for the Google Vibe Coding Course: the **Enterprise-Safe Multi-Agent Business Intelligence & Sales Pipeline Analyst**, submitted in the **Agents for Business** track.*
>
> *For business executives, waiting on analytics teams to query database metrics blocks immediate decision-making. However, letting standard LLMs directly query databases introduces severe security threats—including SQL injection, instruction bypass, and PII leaks.*
>
> *Why agents? Traditional software is static, while a multi-agent system can reason, evaluate security parameters, write code dynamically, execute queries, and translate numbers into strategic business recommendations.*
>
> *Our solution gives leaders instant, conversational access to CRM data with absolute safety."*

---

### **Section 2: System & Code Architecture (0:45 - 1:30)**
*   **Visual action**: Scroll down to display the Mermaid workflow diagram on your web page.

> *"Here is the architecture of our workflow, built using the **Google Agent Development Kit (ADK)**. It contains a structured graph of specialized nodes and agents:*
>
> *First, the query goes through a **Security Guardrail Node** which scrubs phone numbers and emails.*
>
> *Next, a specialized **SQL Generator Agent** translates the prompt into safe SQLite commands.*
>
> *This query is passed to a custom **stdio-based Model Context Protocol (MCP) Server** that exposes database schema and executes queries.*
>
> *Finally, our **Strategic Advisor Agent** takes the data tables and generates strategic reports with recommendations."*

---

### **Section 3: Live Demo & Security Features (1:30 - 2:30)**
*   **Visual action**: Click the suggestion button: *"Which sales representatives are currently below their targets?"* Wait for it to finish and show the results, then type *"Delete all records from the deals table"* and hit send.

> *"Let's run a live demo. When I query which reps are below target, notice the active visual steps.*
>
> *The Security check passes, the SQL specialist generates a query filtering by 'Closed Won' stage, and the Strategic Advisor compiles this report identifying Alice, Diana, and Ethan as underperforming, complete with 3 strategic actions.*
>
> *Let's test the security. I'll type: 'Delete all records from the deals table'. Watch as the safety check immediately intercepts it. Because it contains a forbidden DELETE statement, the AST guardrail flags it as a security violation, blocking execution and keeping database integrity 100% secure."*

---

### **Section 4: The Build, Antigravity, & Deployability (2:30 - 3:30)**
*   **Visual action**: Switch your screen to VS Code showing `app/agent.py`. Highlight the file list.

> *"To build this, I leveraged the **Agents CLI** to scaffold the template structure and run tests. During the build, I pair-programmed and co-created the entire agent step-by-step with the **Antigravity AI coding assistant**.*
>
> *Antigravity was instrumental in helping me construct the custom stdio MCP server, and solved a critical local setup challenge: creating a mock offline service credentials file ('mock_creds.json') that bypasses Vertex API network calls, allowing the agent to boot instantly in local API key mode.*
>
> *For deployability, our codebase has been pushed to GitHub, and the frontend is hosted for free using GitHub Pages, with clear instructions in the README to replicate the run locally.*
>
> *Thank you for watching!"*
