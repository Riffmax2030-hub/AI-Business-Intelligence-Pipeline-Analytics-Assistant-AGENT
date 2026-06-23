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
    
    // 3. Fallback database schema output or generic select query
    return `Query executed successfully. Result: (no rows returned)`;
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
    appendUserMessage(queryText);
    resetSteps();
    
    // Step 1: Security Audit
    setStepState(1, "active");
    await delay(1000);
    
    if (detectPromptInjection(queryText)) {
        setStepState(1, "failed");
        appendSystemMessage("Security Blocked", `<div class="security-log"><span style="color:var(--danger)">[CRITICAL]</span> PROMPT INJECTION DETECTED. Execution aborted.</div>`);
        return;
    }
    
    const cleanQuery = scrubPii(queryText);
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
            if (cleanQuery.toLowerCase().includes("target") || cleanQuery.toLowerCase().includes("representative")) {
                sqlQuery = "SELECT s.name, s.quarterly_target, SUM(d.amount) AS achieved FROM sales_reps AS s LEFT JOIN deals AS d ON s.rep_id = d.rep_id AND d.stage = 'Closed Won' GROUP BY s.rep_id HAVING achieved < s.quarterly_target;";
                explanation = "Calculates targets vs. closed won revenue for underperforming sales reps.";
            } else {
                sqlQuery = "SELECT region, SUM(amount) FROM deals WHERE stage = 'Closed Won' GROUP BY region;";
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
    await delay(1200);
    
    if (!isSqlSafe(sqlQuery)) {
        setStepState(3, "failed");
        appendSystemMessage("Safety Warning", `<div class="security-log"><span style="color:var(--danger)">[CRITICAL]</span> UNSAFE SQL ATTEMPT BLOCKED.<br>Query: <code>${sqlQuery}</code></div>`);
        return;
    }
    
    const dbResults = executeSqlLocally(sqlQuery);
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
            reportText = `## Business Intelligence Report: Sales Targets Performance
            
            ### Summary of Key Findings
            Analysis of closed-won deals against quarterly targets indicates three representatives are currently below their targets:
            *   **Diana Prince** is experiencing a significant shortfall of $100,000.
            *   **Alice Smith** has met 56.7% of target.
            *   **Ethan Hunt** has met 67.9% of target.
            
            ### Strategic Recommendations
            1.  **Direct Coaching**: Prioritize intensive pipeline review and sales support sessions for Diana Prince.
            2.  **Pipeline Acceleration**: Focus on proposal renewals for Alice and Ethan to bridge their target gap.`;
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
    }
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

// Event Listeners
btnSubmit.addEventListener("click", () => {
    const query = inputQuery.value.trim();
    if (query) {
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
