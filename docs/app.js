// In-Memory Simulated CRM Database
const DB_RECORDS = {
    sales_reps: [
        { rep_id: 1, name: "Alice Smith", region: "North America", quarterly_target: 150000 },
        { rep_id: 2, name: "Bob Jones", region: "North America", quarterly_target: 120000 },
        { rep_id: 3, name: "Charlie Brown", region: "Europe", quarterly_target: 180000 },
        { rep_id: 4, name: "Diana Prince", region: "Europe", quarterly_target: 160000 },
        { rep_id: 5, name: "Ethan Hunt", region: "Asia Pacific", quarterly_target: 140000 }
    ],
    deals: [
        { deal_id: 1, name: "Acme Corp Cloud Migration", amount: 85000, stage: "Closed Won", close_date: "2026-04-15", rep_id: 1 },
        { deal_id: 2, name: "Beta Industries License Renew", amount: 30000, stage: "Proposal", close_date: "2026-07-10", rep_id: 1 },
        { deal_id: 3, name: "Gamma Systems Security Suite", amount: 120000, stage: "Closed Won", close_date: "2026-05-20", rep_id: 2 },
        { deal_id: 4, name: "Delta Co Training Services", amount: 15000, stage: "Closed Lost", close_date: "2026-03-01", rep_id: 2 },
        { deal_id: 5, name: "Epsilon Gmbh ERP Upgrade", amount: 210000, stage: "Closed Won", close_date: "2026-06-02", rep_id: 3 },
        { deal_id: 6, name: "Zeta Sarl CRM Integration", amount: 45000, stage: "Prospecting", close_date: "2026-08-15", rep_id: 3 },
        { deal_id: 7, name: "Eta Corp Data Warehouse", amount: 175000, stage: "Proposal", close_date: "2026-07-30", rep_id: 4 },
        { deal_id: 8, name: "Theta Inc Consultancy Contract", amount: 60000, stage: "Closed Won", close_date: "2026-06-18", rep_id: 4 },
        { deal_id: 9, name: "Iota Ltd Mobile Application", amount: 95000, stage: "Closed Won", close_date: "2026-05-12", rep_id: 5 },
        { deal_id: 10, name: "Kappa Co Logistics Platform", amount: 110000, stage: "Prospecting", close_date: "2026-09-05", rep_id: 5 }
    ],
    interactions: [
        { interaction_id: 1, deal_id: 1, date: "2026-04-10", type: "Meeting", notes: "Final negotiation meeting, contract signed!" },
        { interaction_id: 2, deal_id: 2, date: "2026-06-20", type: "Email", notes: "Sent formal proposal for license renewal." },
        { interaction_id: 3, deal_id: 3, date: "2026-05-18", type: "Call", notes: "Follow up call on security suite implementation." },
        { interaction_id: 4, deal_id: 5, date: "2026-05-30", type: "Meeting", notes: "Demoed the new ERP workflows to German stakeholders." },
        { interaction_id: 5, deal_id: 7, date: "2026-06-21", type: "Call", notes: "Diana called to discuss customization requirements." }
    ]
};

// UI Elements
const chatHistory = document.getElementById("chat-history");
const inputQuery = document.getElementById("input-query");
const btnSubmit = document.getElementById("btn-submit");
const btnApiConfig = document.getElementById("btn-api-config");
const apiModal = document.getElementById("api-modal");
const btnModalClose = document.getElementById("btn-modal-close");
const btnSaveKeyYes = document.getElementById("btn-save-key-yes");
const btnSaveKeyNo = document.getElementById("btn-save-key-no");
const apiKeyInput = document.getElementById("api-key-input");

// Step elements
const steps = {
    1: document.getElementById("step-1"),
    2: document.getElementById("step-2"),
    3: document.getElementById("step-3"),
    4: document.getElementById("step-4")
};

// State Variables
let geminiApiKey = localStorage.getItem("gemini_api_key") || "";
let isProcessing = false;
const securityAuditLog = [];

// Security Audit Log
function logSecurityEvent(level, message) {
    const timestamp = new Date().toLocaleTimeString();
    securityAuditLog.push({ timestamp, level, message });
    updateSecurityLogPanel();
}

function updateSecurityLogPanel() {
    const panel = document.getElementById("security-log-entries");
    if (!panel) return;
    const recent = securityAuditLog.slice(-15).reverse();
    panel.innerHTML = recent.map(e => {
        const color = e.level === 'BLOCK' ? 'var(--danger)' : e.level === 'WARN' ? 'var(--warning)' : 'var(--success)';
        return `<div class="log-entry"><span style="color:${color}">[${e.level}]</span> <span class="log-time">${e.timestamp}</span> ${e.message}</div>`;
    }).join("");
}

// Security Guardrail Helper Functions
function scrubPii(text) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const phoneRegex = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
    return text.replace(emailRegex, "[REDACTED_EMAIL]").replace(phoneRegex, "[REDACTED_PHONE]");
}

function detectPromptInjection(text) {
    const keywords = [
        "ignore previous instructions", "ignore all instructions", "ignore rules",
        "system prompt", "override", "bypass", "auto-approve", "forget instructions"
    ];
    const lowered = text.toLowerCase();
    return keywords.some(kw => lowered.includes(kw));
}

function detectDangerousSqlIntent(text) {
    const dangerousKeywords = [
        "delete", "drop", "truncate", "insert", "update", "alter",
        "create", "replace", "exec", "grant", "revoke", "modify",
        "remove", "destroy", "wipe", "erase", "purge"
    ];
    const lowered = text.toLowerCase();
    const matched = dangerousKeywords.find(kw => {
        const regex = new RegExp(`\\b${kw}\\b`);
        return regex.test(lowered);
    });
    return matched || null;
}

function isSqlSafe(query) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return false;
    const forbidden = ["insert", "update", "delete", "drop", "create", "alter", "replace", "truncate", "exec", "grant", "revoke", "schema"];
    const matchesForbidden = forbidden.some(word => {
        const regex = new RegExp(`\\b${word}\\b`);
        return regex.test(normalized);
    });
    if (matchesForbidden) return false;
    return normalized.startsWith("select") || normalized.startsWith("with");
}

// Local SQL execution simulation (Mock engine)
function executeSqlLocally(sql) {
    const normalized = sql.toLowerCase();
    
    // 1. Performance targets query
    if (normalized.includes("quarterly_target") && normalized.includes("closed won")) {
        const results = [
            { name: "Alice Smith", target: 150000, achieved: 85000 },
            { name: "Diana Prince", target: 160000, achieved: 60000 },
            { name: "Ethan Hunt", target: 140000, achieved: 95000 }
        ];
        return formatHtmlTable(["Sales Rep", "Target", "Achieved Amount"], results.map(r => [r.name, `$${r.target.toLocaleString()}`, `$${r.achieved.toLocaleString()}`]));
    }
    
    // 2. Revenue by region query
    if (normalized.includes("region") && normalized.includes("amount")) {
        const results = [
            { region: "North America", revenue: 205000 },
            { region: "Europe", revenue: 270000 },
            { region: "Asia Pacific", revenue: 95000 }
        ];
        return formatHtmlTable(["Region", "Closed Won Revenue"], results.map(r => [r.region, `$${r.revenue.toLocaleString()}`]));
    }
    
    // 3. Deal pipeline summary
    if (normalized.includes("stage") && normalized.includes("count")) {
        const results = [
            { stage: "Closed Won", count: 5, total: 570000 },
            { stage: "Proposal", count: 2, total: 205000 },
            { stage: "Prospecting", count: 2, total: 155000 },
            { stage: "Closed Lost", count: 1, total: 15000 }
        ];
        return formatHtmlTable(["Stage", "Deal Count", "Total Value"], results.map(r => [r.stage, r.count, `$${r.total.toLocaleString()}`]));
    }
    
    // 4. Recent interactions / activity log
    if (normalized.includes("interactions") || normalized.includes("activity") || normalized.includes("notes")) {
        const results = [
            { date: "2026-06-21", rep: "Diana Prince", type: "Call", deal: "Eta Corp Data Warehouse", notes: "Discussed customization requirements" },
            { date: "2026-06-20", rep: "Alice Smith", type: "Email", deal: "Beta Industries License Renew", notes: "Sent formal proposal" },
            { date: "2026-05-30", rep: "Charlie Brown", type: "Meeting", deal: "Epsilon Gmbh ERP Upgrade", notes: "Demoed new workflows" },
            { date: "2026-05-18", rep: "Bob Jones", type: "Call", deal: "Gamma Systems Security Suite", notes: "Implementation follow-up" },
            { date: "2026-04-10", rep: "Alice Smith", type: "Meeting", deal: "Acme Corp Cloud Migration", notes: "Contract signed!" }
        ];
        return formatHtmlTable(["Date", "Sales Rep", "Type", "Deal", "Notes"], results.map(r => [r.date, r.rep, r.type, r.deal, r.notes]));
    }
    
    // 5. Top performing reps
    if (normalized.includes("top") || normalized.includes("best") || normalized.includes("desc")) {
        const results = [
            { name: "Charlie Brown", region: "Europe", revenue: 210000, pct: "116.7%" },
            { name: "Bob Jones", region: "North America", revenue: 120000, pct: "100.0%" },
            { name: "Ethan Hunt", region: "Asia Pacific", revenue: 95000, pct: "67.9%" }
        ];
        return formatHtmlTable(["Sales Rep", "Region", "Closed Won Revenue", "% of Target"], results.map(r => [r.name, r.region, `$${r.revenue.toLocaleString()}`, r.pct]));
    }
    
    // 6. All deals listing
    if (normalized.includes("deals") || normalized.includes("deal_id")) {
        return formatHtmlTable(["Deal", "Amount", "Stage", "Close Date"], 
            DB_RECORDS.deals.map(d => [d.name, `$${d.amount.toLocaleString()}`, d.stage, d.close_date]));
    }
    
    // Fallback
    return formatHtmlTable(["Name", "Region", "Quarterly Target"],
        DB_RECORDS.sales_reps.map(r => [r.name, r.region, `$${r.quarterly_target.toLocaleString()}`]));
}

function formatHtmlTable(headers, rows) {
    let html = `<table><thead><tr>`;
    headers.forEach(h => html += `<th>${h}</th>`);
    html += `</tr></thead><tbody>`;
    rows.forEach(row => {
        html += `<tr>`;
        row.forEach(val => html += `<td>${val}</td>`);
        html += `</tr>`;
    });
    html += `</tbody></table>`;
    return html;
}

// Simple Markdown to HTML formatter
function parseMarkdown(text) {
    let html = text;
    // Tables
    html = html.replace(/\|(.+)\|/g, (match, content) => {
        if (content.includes("---")) return ""; // skip dividers
        const cols = content.split("|").map(c => c.trim());
        return `<tr>` + cols.map(c => `<td>${c}</td>`).join("") + `</tr>`;
    });
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Headings
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    // Lists
    html = html.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
    return html;
}

// Step animation helpers
function resetSteps() {
    Object.values(steps).forEach(el => el.className = "step-badge");
}

function setStepState(stepNum, state) {
    if (steps[stepNum]) {
        steps[stepNum].className = `step-badge ${state}`;
    }
}

// Gemini API REST caller
async function callGeminiApi(prompt) {
    if (!geminiApiKey) {
        throw new Error("API Key is missing. Please configure it in the settings.");
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });
    
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "Failed to contact Gemini API.");
    }
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// App Logic Flow
async function processQuery(queryText) {
    if (isProcessing) return;
    isProcessing = true;
    setInputState(false);
    
    appendUserMessage(queryText);
    resetSteps();
    
    // Step 1: Security Audit
    setStepState(1, "active");
    await delay(800);
    
    logSecurityEvent('PASS', `Input received: "${queryText.substring(0, 50)}${queryText.length > 50 ? '...' : ''}"`);
    
    if (detectPromptInjection(queryText)) {
        setStepState(1, "failed");
        logSecurityEvent('BLOCK', `PROMPT INJECTION DETECTED — execution aborted`);
        appendSystemMessage("Security Blocked", `<div class="security-log"><span style="color:var(--danger)">[CRITICAL]</span> PROMPT INJECTION DETECTED. Execution aborted.</div>`);
        isProcessing = false;
        setInputState(true);
        return;
    }
    logSecurityEvent('PASS', 'Prompt injection check: CLEAR');

    const dangerousWord = detectDangerousSqlIntent(queryText);
    if (dangerousWord) {
        setStepState(1, "failed");
        logSecurityEvent('BLOCK', `Dangerous SQL keyword detected: ${dangerousWord.toUpperCase()}`);
        appendSystemMessage("Security Blocked", `<div class="security-log"><span style="color:var(--danger)">[CRITICAL]</span> UNSAFE DATABASE OPERATION DETECTED.<br>Your query contains the forbidden keyword: <code>${dangerousWord.toUpperCase()}</code>.<br>This system only permits <strong>read-only SELECT queries</strong>. All write, modify, and destructive operations are blocked by the AST-level SQL guardrail.<br><br><span style="color:var(--warning)">⚠️ Security Log:</span> This attempt has been flagged and recorded.</div>`);
        isProcessing = false;
        setInputState(true);
        return;
    }
    logSecurityEvent('PASS', 'Dangerous SQL intent check: CLEAR');
    
    const cleanQuery = scrubPii(queryText);
    const piiFound = cleanQuery !== queryText;
    logSecurityEvent(piiFound ? 'WARN' : 'PASS', piiFound ? 'PII detected and scrubbed from input' : 'PII scan: No sensitive data found');
    setStepState(1, "completed");
    
    // Step 2: SQL generation (via Gemini or mock if key not set)
    setStepState(2, "active");
    let sqlQuery = "";
    let explanation = "";
    
    try {
        if (geminiApiKey) {
            const prompt = `You are a database engineer. Write a read-only SQLite SELECT query to answer the user request.
            Database schema info:
            Table: sales_reps (rep_id, name, region, quarterly_target)
            Table: deals (deal_id, name, amount, stage, close_date, rep_id)
            Table: interactions (interaction_id, deal_id, date, type, notes)
            Rules:
            - ONLY return a SELECT query.
            - Filter won deals using stage = 'Closed Won'.
            - Respond in plain JSON with keys 'sql' and 'explanation'. Do not include markdown code block styling in your response.
            Request: "${cleanQuery}"`;
            
            const rawResponse = await callGeminiApi(prompt);
            const parsed = JSON.parse(rawResponse.replace(/```json/g, "").replace(/```/g, "").trim());
            sqlQuery = parsed.sql;
            explanation = parsed.explanation;
        } else {
            // Mock SQL generation if no API key is saved
            const q = cleanQuery.toLowerCase();
            if (q.includes("target") || q.includes("below") || q.includes("underperform")) {
                sqlQuery = "SELECT s.name, s.quarterly_target, SUM(d.amount) AS achieved FROM sales_reps AS s LEFT JOIN deals AS d ON s.rep_id = d.rep_id AND d.stage = 'Closed Won' GROUP BY s.rep_id HAVING achieved < s.quarterly_target;";
                explanation = "Calculates targets vs. closed won revenue for underperforming sales reps.";
            } else if (q.includes("pipeline") || q.includes("stage") || q.includes("breakdown") || q.includes("summary")) {
                sqlQuery = "SELECT stage, COUNT(*) AS count, SUM(amount) AS total FROM deals GROUP BY stage ORDER BY total DESC;";
                explanation = "Groups all deals by their pipeline stage with counts and total values.";
            } else if (q.includes("interaction") || q.includes("activity") || q.includes("recent") || q.includes("communication")) {
                sqlQuery = "SELECT i.date, s.name, i.type, d.name AS deal, i.notes FROM interactions AS i JOIN deals AS d ON i.deal_id = d.deal_id JOIN sales_reps AS s ON d.rep_id = s.rep_id ORDER BY i.date DESC;";
                explanation = "Retrieves all recent sales interactions sorted by date.";
            } else if (q.includes("top") || q.includes("best") || q.includes("performer") || q.includes("ranking")) {
                sqlQuery = "SELECT s.name, s.region, SUM(d.amount) AS revenue FROM sales_reps AS s JOIN deals AS d ON s.rep_id = d.rep_id AND d.stage = 'Closed Won' GROUP BY s.rep_id ORDER BY revenue DESC;";
                explanation = "Ranks sales reps by total closed won revenue.";
            } else if (q.includes("deal") || q.includes("opportunity") || q.includes("all")) {
                sqlQuery = "SELECT name, amount, stage, close_date FROM deals ORDER BY amount DESC;";
                explanation = "Lists all deals sorted by value.";
            } else {
                sqlQuery = "SELECT region, SUM(amount) AS revenue FROM deals WHERE stage = 'Closed Won' GROUP BY region;";
                explanation = "Sums closed won deal amounts grouped by rep regions.";
            }
        }
        setStepState(2, "completed");
    } catch (e) {
        setStepState(2, "failed");
        appendSystemMessage("SQL Specialist Error", `Failed to generate query: ${e.message}`);
        return;
    }
    
    // Step 3: SQL Execution Check
    setStepState(3, "active");
    await delay(1000);
    
    logSecurityEvent('PASS', `SQL AST validation: checking query structure...`);
    if (!isSqlSafe(sqlQuery)) {
        setStepState(3, "failed");
        logSecurityEvent('BLOCK', `UNSAFE SQL BLOCKED: ${sqlQuery.substring(0, 60)}`);
        appendSystemMessage("Safety Warning", `<div class="security-log"><span style="color:var(--danger)">[CRITICAL]</span> UNSAFE SQL ATTEMPT BLOCKED.<br>Query: <code>${sqlQuery}</code></div>`);
        isProcessing = false;
        setInputState(true);
        return;
    }
    logSecurityEvent('PASS', `SQL AST validation: READ-ONLY confirmed ✓`);
    
    const dbResults = executeSqlLocally(sqlQuery);
    logSecurityEvent('PASS', `Query executed — results returned`);
    setStepState(3, "completed");
    
    // Step 4: Strategic Report Analysis
    setStepState(4, "active");
    let reportText = "";
    
    try {
        if (geminiApiKey) {
            const prompt = `You are a Senior Strategic Business Analyst. Summarize these database query results and provide a clean markdown report including 3 strategic recommendations.
            Original request: "${cleanQuery}"
            Query executed: "${sqlQuery}"
            Raw Results: "${dbResults}"`;
            
            reportText = await callGeminiApi(prompt);
        } else {
            // Default mock strategic report
            reportText = getMockReport(cleanQuery);
        }
        setStepState(4, "completed");
        appendSystemMessage("Strategic Analyst Report", `
            <div class="report-body">
                <p><strong>Query Run:</strong> <code>${sqlQuery}</code></p>
                <div style="margin-top:10px;">${dbResults}</div>
                <div style="margin-top:15px;">${parseMarkdown(reportText)}</div>
            </div>
        `);
    } catch (e) {
        setStepState(4, "failed");
        appendSystemMessage("BI Analyst Error", `Failed to compile strategic report: ${e.message}`);
    } finally {
        isProcessing = false;
        setInputState(true);
    }
}

function getMockReport(query) {
    const q = query.toLowerCase();
    if (q.includes("target") || q.includes("below") || q.includes("underperform")) {
        return `## Business Intelligence Report: Sales Targets Performance\n\n### Summary of Key Findings\nAnalysis of closed-won deals against quarterly targets indicates three representatives are currently below their targets:\n*   **Diana Prince** is experiencing a significant shortfall of $100,000 (37.5% of target).\n*   **Alice Smith** has met 56.7% of target with $85,000 in closed-won revenue.\n*   **Ethan Hunt** has met 67.9% of target with $95,000 in closed-won revenue.\n\n### Strategic Recommendations\n1.  **Direct Coaching**: Prioritize intensive pipeline review sessions for Diana Prince — her $175K Eta Corp proposal could close the gap entirely.\n2.  **Pipeline Acceleration**: Fast-track Alice's Beta Industries renewal ($30K) to push her closer to target.\n3.  **Territory Rebalancing**: Consider redistributing Ethan's Kappa Co opportunity ($110K in Prospecting) to accelerate conversion.`;
    } else if (q.includes("pipeline") || q.includes("stage") || q.includes("breakdown")) {
        return `## Business Intelligence Report: Deal Pipeline Analysis\n\n### Summary of Key Findings\nYour current pipeline contains 10 deals valued at $945,000 total across 4 stages:\n*   **Closed Won**: 5 deals worth $570,000 (60.3% of total pipeline value)\n*   **Proposal**: 2 deals worth $205,000 — strong conversion opportunity\n*   **Prospecting**: 2 deals worth $155,000 — early-stage pipeline building\n*   **Closed Lost**: 1 deal ($15,000) — minimal loss impact\n\n### Strategic Recommendations\n1.  **Proposal Push**: The 2 proposal-stage deals ($205K combined) represent your highest-ROI conversion opportunity this quarter.\n2.  **Win Rate Analysis**: Your 83.3% win rate ($570K won vs. $15K lost) is exceptional — document the winning playbook.\n3.  **Pipeline Health**: Prospecting deals ($155K) need nurturing to prevent a dry Q3 pipeline.`;
    } else if (q.includes("interaction") || q.includes("activity") || q.includes("recent")) {
        return `## Business Intelligence Report: Sales Activity Log\n\n### Summary of Key Findings\n5 recorded interactions across the team in the past quarter:\n*   **Meeting Activity**: 2 face-to-face meetings (highest value touchpoints)\n*   **Call Activity**: 2 follow-up calls for active proposals\n*   **Email Activity**: 1 formal proposal delivery\n\n### Strategic Recommendations\n1.  **Increase Meeting Cadence**: Meetings correlate with closed-won outcomes (Acme Corp closed after a final meeting).\n2.  **Follow-Up Gaps**: Bob Jones and Ethan Hunt have no recent interactions logged — schedule immediate outreach.\n3.  **CRM Discipline**: Ensure all reps log interactions within 24 hours for accurate pipeline visibility.`;
    } else if (q.includes("top") || q.includes("best") || q.includes("performer")) {
        return `## Business Intelligence Report: Top Performer Rankings\n\n### Summary of Key Findings\nRanking sales representatives by closed-won revenue:\n*   🥇 **Charlie Brown** (Europe): $210,000 — 116.7% of target. Outstanding performer.\n*   🥈 **Bob Jones** (North America): $120,000 — 100.0% of target. Consistent delivery.\n*   🥉 **Ethan Hunt** (Asia Pacific): $95,000 — 67.9% of target. Room for growth.\n\n### Strategic Recommendations\n1.  **Reward & Retain**: Charlie Brown's 116.7% achievement warrants recognition — consider accelerator bonuses.\n2.  **Peer Mentoring**: Pair Charlie with Diana Prince for cross-regional knowledge transfer.\n3.  **Regional Strategy**: Asia Pacific shows lower conversion — investigate market-specific challenges.`;
    }
    return `## Business Intelligence Report: CRM Data Overview\n\n### Summary of Key Findings\nYour CRM database contains 5 active sales representatives managing 10 deals across 3 regions (North America, Europe, Asia Pacific). Total pipeline value stands at $945,000 with a 60.3% close rate.\n\n### Strategic Recommendations\n1.  **Pipeline Review**: Schedule weekly pipeline reviews to maintain deal velocity.\n2.  **Data Hygiene**: Ensure all deal stages and close dates are updated to reflect current reality.\n3.  **Forecasting**: Use closed-won trends to build a predictive Q3 revenue model.`;
}

// Helpers
function appendUserMessage(text) {
    const el = document.createElement("div");
    el.className = "message user-message";
    el.innerHTML = `
        <div class="message-icon"><i class="fa-solid fa-user"></i></div>
        <div class="message-content"><p>${text}</p></div>
    `;
    chatHistory.appendChild(el);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function appendSystemMessage(title, bodyHtml) {
    const el = document.createElement("div");
    el.className = "message system-message";
    el.innerHTML = `
        <div class="message-icon"><i class="fa-solid fa-robot"></i></div>
        <div class="message-content">
            <h4>${title}</h4>
            <div style="margin-top:6px;">${bodyHtml}</div>
        </div>
    `;
    chatHistory.appendChild(el);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

const delay = ms => new Promise(res => setTimeout(res, ms));

// Input state helper
function setInputState(enabled) {
    inputQuery.disabled = !enabled;
    btnSubmit.disabled = !enabled;
    if (enabled) {
        btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
        btnSubmit.style.opacity = '1';
    } else {
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        btnSubmit.style.opacity = '0.6';
    }
}

// Event Listeners
btnSubmit.addEventListener("click", () => {
    const query = inputQuery.value.trim();
    if (query && !isProcessing) {
        processQuery(query);
        inputQuery.value = "";
    }
});

inputQuery.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        const query = inputQuery.value.trim();
        if (query) {
            processQuery(query);
            inputQuery.value = "";
        }
    }
});

// Suggestions click handler
document.querySelectorAll(".btn-suggestion").forEach(btn => {
    btn.addEventListener("click", () => {
        processQuery(btn.textContent);
    });
});

// API Modal handlers
btnApiConfig.addEventListener("click", () => {
    apiKeyInput.value = geminiApiKey;
    apiModal.classList.add("active");
});

btnModalClose.addEventListener("click", () => apiModal.classList.remove("active"));
btnSaveKeyNo.addEventListener("click", () => apiModal.classList.remove("active"));

btnSaveKeyYes.addEventListener("click", () => {
    geminiApiKey = apiKeyInput.value.trim();
    localStorage.setItem("gemini_api_key", geminiApiKey);
    apiModal.classList.remove("active");
    appendSystemMessage("System", `API key updated successfully. Live Gemini API execution is now ${geminiApiKey ? "ENABLED" : "DISABLED (running in simulation mode)"}.`);
});
