# ICONA AI Copilot - Agent Definition & Architecture Document

## 1. Overview & Objectives

**ICONA AI Copilot** is an intelligent assistant integrated into the ICONA Construction ERP & CRM SaaS platform. It enables construction managers, accountants, project directors, and site supervisors to interact with their firm's operational data using natural language.

### Primary Goals
- **Natural Language Data Access**: Query projects, BOQ rollups, financial ledgers, budget vs actuals, site attendance, and CRM leads.
- **Multilingual & Roman Urdu Understanding**: Seamlessly process queries and commands in English, Urdu (اردو script), and Roman Urdu (e.g. *"Canal Plaza ka budget kitna bacha hai?"*).
- **Form Automation & Modal Pre-Filling**: Detect user intent in chat and automatically launch creation modals pre-filled with relevant context for 1-click user confirmation.
- **Privacy-First & Self-Hosted Foundation**: Support zero-leakage, offline local model deployment while maintaining a flexible adapter for ultra-cheap cloud models when needed.
- **Zero Cross-Tenant Data Leakage**: Architecturally guarantee that no user or model can access or query another tenant's data.

---

## 2. Infrastructure & Deployment Strategy

### Phase 1: Self-Hosted Offline Model (Dedicated Local PC / GPU Server)
To ensure 100% data privacy and eliminate third-party data training concerns, ICONA Copilot is initially built to run against a self-hosted local model server.

- **Hosting Engine**: **Ollama** or **vLLM** deployed on a local dedicated PC or GPU server (e.g. NVIDIA RTX 3090/4090 or Apple Silicon Mac Studio).
- **Recommended Open-Source Models**:
  - **Qwen 2.5 7B / 14B (Instruct)**: Top recommendation. Outstanding performance in multilingual Urdu/Roman Urdu comprehension, structured JSON output, function calling, and tabular data reasoning.
  - **Llama 3.1 8B (Instruct)**: Fast execution, reliable tool usage, low memory footprint.
- **Connection**: Next.js connects via standard HTTP API (`http://<local-gpu-ip>:11434/v1/chat/completions`) inside the private network.
- **Privacy Assurance**: Zero data leaves the local network. No external API calls, zero third-party training.

### Phase 2: Hybrid & Provider-Agnostic Abstraction Layer
The application uses a unified LLM Provider Adapter pattern. Switching between offline self-hosted models and cloud providers requires zero application code changes:

```env
# Local Self-Hosted (Default / Privacy Mode)
LLM_PROVIDER="ollama"
LLM_BASE_URL="http://192.168.1.40:11434/v1"
LLM_MODEL="qwen2.5:7b-instruct"

# Cloud Provider Option (Cheap / High-Scale Mode)
# LLM_PROVIDER="gemini"
# LLM_API_KEY="your-gemini-api-key"
# LLM_MODEL="gemini-1.5-flash"
```

---

## 3. Security Architecture & Zero-Data-Leak Enforcement

### Scoped Context Resolution Pipeline
The LLM is **never given direct database access or raw SQL query execution capabilities**. All data access is governed by the following pipeline:

```
[ User Query ]
      │
      ▼
[ NextAuth Authentication ] (Validates Session & Role)
      │
      ▼
[ Context Extractor via tenantPrisma ] (Scopes query strictly to user's orgId)
      │
      ▼
[ Context Sanitizer & System Prompt Builder ] (Formats tenant-only JSON context)
      │
      ▼
[ LLM Provider API ] (Local Ollama or Cloud Model)
      │
      ▼
[ Response & Action Parser ] (Validates JSON Function Calls & Text Output)
      │
      ▼
[ Client Application UI ] (Displays answer or triggers pre-filled Modal)
```

### Key Security Safeguards
1. **Org-Scoped Data Ingestion**: The API endpoint uses `tenantPrisma` (which automatically injects `where: { orgId }`) to retrieve candidate records before passing them to the LLM.
2. **Role-Based Filtering**: If an Employee asks for executive salary details, the context extractor filters out restricted records based on `user.role`.
3. **No Cross-Tenant Storage**: Prompts, context embeddings, and conversation histories are strictly partitioned by `orgId` in the database.

---

## 4. Operational Domains & Capabilities

ICONA Copilot is strictly bounded to the following business domains:

### A. CRM & Client Management
- Query active client proposals, lead statuses, enquiry logs, and client company profiles.
- Summarize client communication histories and project commitments.

### B. Project Control & BOQ Tracking
- Query project completion percentages, milestone statuses, and domain/task hierarchies.
- Inspect BOQ item rollups, unit rates, and variation order histories.
- Identify overdue tasks and subtasks behind schedule.

### C. Financial Management & Ledger
- Analyze cash position, total income, expenses, overheads, and active loans.
- Perform live Budget vs Actual variance checks per project or category.
- List outstanding subcontractor balances and pending vendor invoices.

### D. Labour & Site Attendance
- Summarize daily site attendance counts by project, crew, or supervisor.
- Check worker daily rates and weekly payroll totals.
- Surface site visit notes and photo log counts.

### E. Multilingual & Roman Urdu Natural Processing
- **Roman Urdu & Urdu Comprehension**: Automatically parses queries typed in Roman Urdu (e.g. *"Is maheenay labour ka kitna kharcha hua hai?"*, *"Gulberg Heights project par kinna kaam baaqi hai?"*) or standard Urdu script (اردو).
- **South Asian Numeric Unit Parsing**: System prompt instructs the LLM to understand local currency units:
  - `1 Lakh` = `100,000 PKR`
  - `1 Crore` = `10,000,000 PKR`
  - `50 Lac` = `5,000,000 PKR`
- **Domain Term Mapping**: Maps local construction terms (e.g. *Mistry*, *Mazdoor*, *Thekedar*, *Kharcha*, *Advance*, *Hisaab*) directly to their corresponding ERP entities (`Labour`, `Subcontractor`, `Expense`, `Drawing`).

---

## 5. Intent Detection & UI Modal Pre-Filling Engine

When the user asks to perform an action (e.g. adding a project, recording a payout, or adding a subcontractor), the LLM generates a structured JSON function call instead of plain text.

### JSON Action Schema
```json
{
  "type": "ACTION_TRIGGER",
  "action": "OPEN_MODAL",
  "targetModal": "CREATE_TRANSACTION",
  "prefilledData": {
    "projectId": "cmrnopvrx00037jmzm29zn57u",
    "projectName": "Canal Road Plaza",
    "category": "SUBCONTRACTOR_PAYOUT",
    "amount": 500000,
    "description": "Payout for Steel Fixers crew (Floor 3)",
    "paymentMethod": "BANK_TRANSFER"
  },
  "message": "I have set up the transaction window for Canal Road Plaza with PKR 500,000 pre-filled. Please review and confirm."
}
```

### Supported Modal Actions
- `OPEN_CREATE_PROJECT`: Pre-fills project name, client ID, budget, and estimated start/end dates.
- `OPEN_CREATE_TRANSACTION`: Pre-fills project, category (income/expense/loan/draw), amount, description, and vendor.
- `OPEN_ADD_SUBCONTRACTOR`: Pre-fills trade, firm name, contract amount, and assigned project.
- `OPEN_RECORD_ATTENDANCE`: Pre-fills project, crew type, present count, and date.

### Frontend Workflow
1. The frontend assistant component (`AssistantWidget.tsx`) receives the structured response.
2. It dispatches a custom UI event (e.g., `window.dispatchEvent(new CustomEvent('trigger-prefilled-modal', ...))`).
3. The target modal dialog opens instantly with all input fields populated.
4. The user reviews the data and clicks **Confirm & Save** to commit.

---

## 6. Business Model & Subscription Integration

### Pricing Strategy
- **Starter ($25/mo)**: Optional +$10/month AI Copilot Add-On.
- **Growth ($50/mo)**: Optional +$10/month AI Copilot Add-On.
- **Enterprise ($75/mo)**: **Included FREE** as a core platform feature (`SITE_CONFIG.pricing`).

### Usage Limits & Safeguards
- Starter / Growth add-on capped at 1,000 queries per month per tenant.
- Enterprise tier included with fair-use limit of 5,000 queries per month per tenant.
- Rate-limiting enforced per tenant to prevent runaway GPU / API resource consumption.
