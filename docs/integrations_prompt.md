# ICONA AI Copilot - Multi-Tool Integration & Connectivity Specification

This document details the architecture, system prompts, tool schemas, and channel configuration modes to connect **ICONA Construction ERP+CRM** with **WhatsApp**, **Telegram**, **Odoo**, **Slack**, **Notion**, and **Zapier/Webhooks**.

---

## 1. Channel Ownership & Configuration Architecture

ICONA supports two messaging rails for both **WhatsApp** and **Telegram**, allowing construction client firms to either use ICONA shared system numbers/bots out of the box OR plug in their own branded business numbers and custom Telegram bots.

```
+-----------------------------------------------------------------------------------+
|                        ICONA MULTI-TENANT MESSAGING ROUTER                       |
+-----------------------------------------------------------------------------------+
|  WHATSAPP ENGINE                                                                  |
|  ├── Mode A: ICONA Shared Number (+92 42 111 ICONA) [System & Managed Default]   |
|  └── Mode B: Custom Client Number (+92 3XX XXXXXXX) [Dedicated WABA Token]       |
|                                                                                   |
|  TELEGRAM ENGINE                                                                  |
|  ├── Mode A: ICONA Master Bot (@IconaMasterBot) [Admin & Platform Alerts]        |
|  └── Mode B: Client Dedicated Bot (@ApexBuildersBot) [Company Field Operations]  |
+-----------------------------------------------------------------------------------+
```

### A. WhatsApp Dual-Rail Configuration
1. **Mode A: ICONA Shared Platform Number (Default / Managed Rail)**
   - Uses ICONA master WhatsApp Business Cloud API endpoint (`+92 42 111 ICONA`).
   - Zero setup required for newly signed-up clients.
   - Outbound messages carry tenant metadata in template params (`orgId: org-apex`).
   - Inbound replies are routed to the target client organization based on supervisor phone number lookup.

2. **Mode B: Custom Client WhatsApp Business API Number (Dedicated Brand Rail)**
   - Client configures their own **WhatsApp Business Account ID (WABA ID)**, **Phone Number ID**, and **Permanent Meta Access Token** under `Settings -> Integrations`.
   - All outbound client summaries, daily site digests, and customer CRM notifications are dispatched directly from the client's own phone number.

### B. Telegram Dual-Rail Configuration & Security Access
1. **Mode A: ICONA Master Platform Bot (`@IconaMasterBot`)**
   - Used for platform-wide Super Admin alerts, system security notifications, billing renewals, and fallback trial testing.
   - Centralized admin communications stream.

2. **Mode B: Dedicated Client Company Bot (Recommended for Field Operations)**
   - Client creates a dedicated bot via `@BotFather` (e.g. `@ApexBuildersBot` or `@AlphaConstructBot`).
   - Client inputs their `TELEGRAM_BOT_TOKEN` in ICONA tenant settings.
   - Site supervisors, field engineers, and labour managers interact directly with their company's own bot for photo logs, voice notes, and attendance.

3. **Trusted Access Control (Security Whitelist)**
   - Admins define a list of **Trusted Usernames, Numeric User IDs, or Phone Numbers** (`trustedUsers`).
   - The copilot engine verifies incoming message senders against this trusted list before executing sensitive database updates, payout approvals, or task assignments.

4. **Live Test Verification Target**
   - When verifying a channel connection, administrators specify a **Test Target User ID / Phone Number** (`testTargetUser`).
   - The `/api/integrations/test` endpoint authenticates the bot token via `getMe` and dispatches a test ping directly to that user.

---

## 2. Tenant Integration Configuration Schema

The `Organization` database model stores channel credentials per tenant:

```json
{
  "orgId": "org-apex-builders",
  "whatsappConfig": {
    "useCustomNumber": true,
    "phoneNumberId": "1049283749201",
    "wabaId": "9081237465928",
    "senderPhone": "+923211234567",
    "accessToken": "EAAGm0px4ZCS4BA..."
  },
  "telegramConfig": {
    "useCustomBot": true,
    "botUsername": "@ApexBuildersBot",
    "botToken": "7192840192:AAH9f201jkl-xyz...",
    "trustedUsers": "@farhankhan, 987654321, +923001234567",
    "adminMasterBot": "@IconaMasterBot"
  }
}
```

---

## 3. Universal LLM System Prompt with Channel Rail & Security Detection

Copy and paste this system prompt into your LLM engine (Ollama Qwen 2.5 / Gemini / OpenAI):

```markdown
You are the ICONA AI Copilot Integration Router, an intelligent assistant built for ICONA Construction ERP & CRM.
You interface with site supervisors, project directors, accountants, and administrators across WhatsApp, Telegram, Slack, Odoo, Notion, and Webhooks.

### CORE OPERATIONAL RULES:
1. MULTILINGUAL & ROMAN URDU COMPREHENSION:
   - Process inputs in English, Urdu (اردو script), and Roman Urdu (e.g. "Canal Plaza ka budget status WhatsApp par bhejo").
   - Parse South Asian numeric terms: 1 Lakh = 100,000 PKR; 1 Crore = 10,000,000 PKR.

2. SECURITY & TRUSTED USER VALIDATION:
   - Verify incoming sender ID or @username against tenant trustedUsers list.
   - If sender is authorized, execute requested action; else prompt sender for verification credentials (Telegram User ID or phone verification code).

3. CHANNEL OWNERSHIP SELECTION:
   - WHATSAPP: Inspect tenant whatsappConfig. If useCustomNumber is true, route payload via client Phone Number ID; else route via ICONA Shared Number (+92 42 111 ICONA).
   - TELEGRAM: Inspect tenant telegramConfig. Route company field operations via client Custom Bot (@ApexBuildersBot); route platform/admin security alerts via ICONA Master Bot (@IconaMasterBot).

4. ACTION DISPATCH SCHEMA:
   ```json
   {
     "targetChannel": "WHATSAPP | TELEGRAM | ODOO | SLACK | NOTION | ZAPIER",
     "action": "SEND_MESSAGE | SYNC_RECORD | TRIGGER_APPROVAL | CREATE_DOCUMENT",
     "tenantId": "org-apex-builders",
     "channelRail": {
       "whatsappMode": "CUSTOM_CLIENT_NUMBER | ICONA_SHARED_NUMBER",
       "senderPhone": "+923211234567",
       "telegramMode": "CUSTOM_COMPANY_BOT | ICONA_MASTER_BOT",
       "botUsername": "@ApexBuildersBot",
       "trustedUsers": "@farhankhan, 987654321"
     },
     "payload": { ... }
   }
   ```
```

---

## 4. Detailed Payload Examples by Platform

### A. WhatsApp Business API

```json
{
  "targetChannel": "WHATSAPP",
  "action": "SEND_MESSAGE",
  "tenantId": "org-apex-builders",
  "channelRail": {
    "whatsappMode": "CUSTOM_CLIENT_NUMBER",
    "phoneNumberId": "1049283749201",
    "senderPhone": "+923211234567"
  },
  "payload": {
    "to": "+923009876543",
    "templateName": "daily_site_summary",
    "parameters": {
      "projectName": "DHA Residential Complex - Block C",
      "date": "2026-07-20",
      "labourPresent": 42,
      "dailyExpensesPkr": "PKR 145,000",
      "siteNotes": "Floor 3 slab casting completed."
    }
  }
}
```

---

### B. Telegram Bot API with Verification Test Target

```json
{
  "targetChannel": "TELEGRAM",
  "action": "RECORD_SITE_EXPENSE",
  "tenantId": "org-apex-builders",
  "channelRail": {
    "telegramMode": "CUSTOM_COMPANY_BOT",
    "botUsername": "@ApexBuildersBot",
    "botToken": "7192840192:AAH9f201jkl-xyz",
    "trustedUsers": "@farhankhan, 987654321"
  },
  "payload": {
    "chatId": "987654321",
    "projectName": "DHA Residential Complex",
    "category": "MATERIAL_PURCHASE",
    "item": "Cement Bags (50 bags)",
    "amountPkr": 65000,
    "photoFileId": "AgACAgUAAxkBAAI...",
    "replyText": "<b>[Apex Builders Bot]</b> Recorded expense of PKR 65,000 for 50 Cement Bags under DHA Residential project."
  }
}
```
