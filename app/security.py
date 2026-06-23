import re

# Simple regular expressions for PII (email, phone, etc.)
EMAIL_REGEX = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
PHONE_REGEX = re.compile(r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b')

INJECTION_KEYWORDS = [
    "ignore previous instructions",
    "ignore all instructions",
    "ignore rules",
    "system prompt",
    "override",
    "bypass",
    "auto-approve",
    "forget instructions"
]

def scrub_pii(text: str) -> str:
    """Scrubs common PII from inputs."""
    scrubbed = text
    scrubbed = EMAIL_REGEX.sub("[REDACTED_EMAIL]", scrubbed)
    scrubbed = PHONE_REGEX.sub("[REDACTED_PHONE]", scrubbed)
    return scrubbed

def detect_prompt_injection(text: str) -> bool:
    """Detects prompt injection attempts."""
    lowered = text.lower()
    for kw in INJECTION_KEYWORDS:
        if kw in lowered:
            return True
    return False

def is_sql_safe(query: str) -> bool:
    """Ensures SQL statements are read-only (SELECT) and contain no destructive commands."""
    normalized = query.strip().lower()
    
    # Check if empty
    if not normalized:
        return False
        
    # Check for forbidden database modifications
    forbidden = [
        "insert", "update", "delete", "drop", "create", "alter", 
        "replace", "truncate", "exec", "grant", "revoke", "schema"
    ]
    
    for word in forbidden:
        # Match word boundaries to prevent false positives on fields containing these names
        pattern = r'\b' + re.escape(word) + r'\b'
        if re.search(pattern, normalized):
            return False
            
    # Ensure it starts with select or with (common for CTEs)
    if not (normalized.startswith("select") or normalized.startswith("with")):
        return False
        
    return True
