# ICONA Platform Updates - Manual Verification Guide

Follow this guide to verify all 12 platform updates, bug fixes, and security enhancements.

---

## 1. Multi-Tenant Privacy Isolation Test (Item 12)
- **Goal:** Verify that a client organization can never see another tenant's financial transactions, projects, or bank accounts.
- **Steps:**
  1. Log in as Admin for **Organization A** (e.g. `admin@icona.app`).
  2. Navigate to **Finances** (`/ledger`) and record a test transaction (e.g. Income of PKR 500,000 for Project A).
  3. Sign out and log in as Admin for **Organization B** (or sign up a new company).
  4. Navigate to **Finances** (`/ledger`).
  5. **Expected Result:** Organization B's ledger is completely clean and shows `PKR 0` for Organization A's transaction.

---

## 2. Password Reset & Verification Email Test (Items 2 & Forgot-Password Fix)
- **Goal:** Verify that forgot-password does not throw a 500 error and emails display the new Deep Navy/Royal Blue design system.
- **Steps:**
  1. Navigate to `/forgot-password`.
  2. Enter your registered email address and submit.
  3. **Expected Result:** Immediate success message ("If that email is registered, a reset code has been sent").
  4. Check your inbox (or dev server console).
  5. **Expected Result:** The email header is Deep Navy (`#1A365D`), button is Royal Blue (`#2563EB`), text is crisp and clean on `#F8FAFC` background.

---

## 3. Onboarding Tax Scope Dropdown Test (Item 3)
- **Goal:** Verify that the tax rule scope dropdown displays "Income & Expense" cleanly without text truncation.
- **Steps:**
  1. Go to `/onboarding` (Step 1).
  2. Look at the **Tax Rules** table.
  3. Add a new tax rule or view the default dropdown.
  4. **Expected Result:** The option **"Income & Expense"** is fully visible, padded, and not squished.

---

## 4. Enterprise Plan & PKR Pricing Test (Item 4)
- **Goal:** Verify PKR prices are shown alongside USD and Enterprise shows "Contact Sales for Custom Pricing".
- **Steps:**
  1. Visit the public homepage pricing section (`/#pricing`).
  2. Check **Starter** (`$25/mo (~PKR 9,999/mo)`).
  3. Check **Growth** (`$50/mo (~PKR 14,999/mo)`).
  4. Check **Enterprise**.
  5. **Expected Result:** Enterprise shows **"Contact Sales for Custom Pricing"** instead of a dollar price.

---

## 5. Employee Invitation Flow Test (Item 5)
- **Goal:** Verify invited team members are saved to the database and receive real invitation emails.
- **Steps:**
  1. Complete onboarding or go to **Teams** in dashboard.
  2. Enter employee email `engineer@buildcorp.pk` and send invite.
  3. **Expected Result:** User receives an invitation email with a **Join Your Workspace** button, and the user appears in the team roster.

---

## 6. Light Theme Sidebar Contrast Test (Item 6)
- **Goal:** Verify selected navigation items in Light Mode are clearly readable.
- **Steps:**
  1. Log into the dashboard.
  2. Switch to **Light Mode** (sun icon in bottom sidebar).
  3. Click on **Members** or **Finances**.
  4. **Expected Result:** Selected link has a distinct Royal Blue background (`#2563EB`) with high-contrast white text (`#FFFFFF`) - completely legible.

---

## 7. Finance Summary Cards Responsiveness Test (Item 7)
- **Goal:** Verify metric cards do not cut off numbers like `PKR ...` on smaller screens.
- **Steps:**
  1. Navigate to **Finances** (`/ledger`).
  2. Resize your browser window or view on tablet width.
  3. **Expected Result:** Metric amounts (e.g. `PKR 1,250,000`) and titles flex into 2-4 columns and remain readable without truncating to `PKR ...`.

---

## 8. Telegram Slash Commands & Roman Urdu AI Test (Item 1 & 8)
- **Goal:** Test Telegram bot slash commands, Roman Urdu queries, and fallback handling.
- **Steps:**
  1. Open Telegram and message your bot `@IconaBot`.
  2. Send `/start` or `/projects@IconaBot` or tap **Active Projects**.
  3. Type a direct question in Roman Urdu: *"Canal Plaza project ka kitna kharcha hua hai?"*.
  4. **Expected Result:** The bot processes the command/query cleanly and responds in natural Roman Urdu or English.

---

## 9. Manual Task Creation Rate & Quantity Test (Item 10)
- **Goal:** Verify manual task creation allows entering Unit, Quantity, and Rate fields.
- **Steps:**
  1. Go to any Project Board -> Click **Add Task**.
  2. Enter Title, Description, Unit (e.g. `Sft`), Quantity (e.g. `500`), Unit Rate (e.g. `1200`).
  3. Click **Create Task**.
  4. **Expected Result:** Task is created with Unit, Quantity, and Rate saved accurately in the database.

---

## 10. Document & Invoice Upload 404 Test (Item 11)
- **Goal:** Verify uploading invoice photos or PDF documents saves and opens without 404 errors.
- **Steps:**
  1. Go to any project -> Upload a receipt photo or PDF document under Invoices/Documents.
  2. Click on the uploaded file to view or download.
  3. **Expected Result:** File loads/downloads with proper content-type header (`image/png`, `application/pdf`, etc.) and no 404 error occurs.
