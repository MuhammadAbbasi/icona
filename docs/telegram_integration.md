# ICONA Telegram / WhatsApp Integration - Plan

Planning doc only - nothing here is built yet. Written 2026-07-21, grounded in
the actual code (`src/app/api/assistant/route.ts`, `src/lib/assistant.ts`,
`src/lib/apiAuth.ts`, `src/app/api/measurements/route.ts`,
`src/app/api/projects/[id]/photos/route.ts`).

## The one insight that shrinks this whole feature

**The "answer questions with knowledge of the user's complete data" engine
already exists and works.** `POST /api/assistant` already:

- resolves the signed-in user and their `orgId`,
- fences every read to that tenant via `withTenantContext`,
- runs a tool loop over the user's data (`runChat`),
- speaks English / Urdu script / Roman Urdu and understands PKR, Lakh, Crore,
  "Thekedar", "Kharcha", "Hazri", etc.

It is **read-only** today - five tools in `src/lib/assistant.ts`:
`list_projects`, `get_project_finances`, `get_project_workflow`,
`list_photos`, `view_photo`. No write tools.

**So Telegram and WhatsApp are new *transports* in front of a brain that
already exists - not a second brain.** The Q&A part is done. What is genuinely
new is: identity binding, one webhook per channel, two write tools (photos +
measurements), and voice→text. Everything else is reuse.

## Confirmed scope

| Decision | Answer |
|---|---|
| First channel | **Telegram.** WhatsApp and the eventual own-app come later; Telegram is the get-started step. |
| Read | Any data about a project the user is allowed to see. |
| Write | **Site photos** and **measurements per task/subtask**, from the field. |
| Voice | Voice messages drive updates (voice → text → same assistant). |
| Writes must be | **Authenticated first** - no mutation from an unbound chat. |

## Reuse map - what already exists vs what is actually new

| Capability | Reuse | New work |
|---|---|---|
| Q&A over user data | `runChat` + the 5 read tools + tenant scoping | Extract `runChat` into a lib (below) |
| Multilingual / Roman Urdu | `buildSystemPrompt` - already done | none |
| Identity + revocation | `getApiUser`'s live-DB re-read pattern | A `chatId → userId` link table |
| Photo storage | `uploadImage` (`src/lib/storage.ts`, Cloudinary), EXIF via `exifr` | Extract a `savePhoto()` core (see 6a) |
| Measurement math | `normalizeMeasurement` (`src/lib/measurements.ts`) | An **append** path (see 6b) |
| Auth for bot writes | project-access rules in `projectAccess.ts` | Call them from the tool, server-side |

## 0. Precondition - the app does not build right now

`next build` currently fails on the calendar work (`Project.color` selected but
not a field, in `src/app/api/calendar/route.ts`). A Telegram webhook is dead
weight on a host that will not build. Clear that blocker first (it is a
~4-line fix) or ship them together, but do not layer this on top of a red
build.

## 1. Refactor first (no behaviour change): extract the chat brain

`runChat`, `getLLMConfig`, `buildSystemPrompt` currently live *inside*
`src/app/api/assistant/route.ts` and are not exported. Move them to
`src/lib/assistant-chat.ts`. The existing route becomes a thin caller; the
Telegram webhook imports the same function. One brain, two front doors - not a
copy. This is a pure move, so it ships with the existing route still green.

```ts
// src/lib/assistant-chat.ts
export async function runChat(user: ApiUser, history: {role,content}[]): Promise<string>
```

## 2. Identity binding - the security crux

A Telegram `chat_id` must map to exactly one ICONA `User`, or the bot leaks a
tenant's financials and site photos to whoever controls that chat. **Never
trust the chat_id or a phone number as identity.** Prove it through the login
that already exists:

```prisma
model TelegramLink {
  id        String   @id @default(cuid())
  chatId    String   @unique          // Telegram chat/user id
  userId    String   @unique          // one ICONA user per chat
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  lastSeen  DateTime @updatedAt
}
```

**Link flow** (mirrors the existing `MobileRefreshToken` per-user-token idea):

1. Logged-in user on the web clicks "Connect Telegram" → server issues a
   short-lived one-time code (5 min, single use).
2. User sends `/link <code>` to the bot.
3. Webhook validates the code, writes the `TelegramLink`, replies "Connected as
   <name>."
4. Web has an "Unlink" button (deletes the row). Revocation is immediate.

**Resolver** - build the `ApiUser` the *same way* `getApiUser` does, a live DB
read, so a deactivated or role-changed user loses bot access on the next
message with zero extra code:

```ts
// resolveTelegramUser(chatId): ApiUser | null
//   link = TelegramLink.findUnique({ chatId })
//   fresh = user.findUnique({ where: link.userId, select: {role,status,companyId,orgId,...} })
//   if !fresh || fresh.status === 'INACTIVE' return null   // same gate as getApiUser
```

## 3. Webhook

`POST /api/telegram/webhook`:

1. **Authenticity**: verify the `X-Telegram-Bot-Api-Secret-Token` header
   against a secret set at `setWebhook` time. Reject anything else - this is
   the only thing standing between the internet and the assistant.
2. `resolveTelegramUser(chatId)`. Unbound → reply "Send /link <code> from your
   ICONA account to connect." and stop. **No data, no tools, until bound.**
3. Dispatch:
   - `/start`, `/link <code>` → binding logic only.
   - text → `runChat(user, [...])`, reply with the answer.
   - photo → photo write tool (section 6a).
   - voice → STT (section 7) → treat transcript as text.
4. Reply via Telegram `sendMessage` / `sendChatAction: typing` while thinking.

**Commands are mostly unnecessary.** The assistant already understands "Canal
Plaza ka kharcha dikhao" as free text. Only `/start` and `/link` need to exist;
do not build a command framework.

## 4. Read Q&A - essentially free

Bound user → `runChat` → reply. Reuses the whole engine. This is the first
working slice and it carries almost no new code beyond the webhook itself.

## 5. Rate limiting

Every message is an LLM call (compute + possibly cost) and a spam vector. Cap
per bound user (e.g. N messages/minute) before calling `runChat`. A simple
in-memory or DB counter keyed on `userId` is enough at SME scale.
`ponytail: in-memory token bucket; move to the DB only if you run multiple instances.`

## 6. Writes - two landmines, both must be handled

Both write paths are **staff-only** today (`ADMIN | MANAGER | EMPLOYEE`); the
bot tool must re-check the same role gate and `canAccessProject` server-side,
using the resolved `ApiUser` - not trust that a message arrived.

### 6a. Photos: the route is cookie-only, so don't call it over HTTP

`POST /api/projects/[id]/photos` authenticates with `getServerSession`
(cookie only) - a bot with a token cannot call it. Extract the core into a
shared helper and call it directly from the webhook (server-side, no HTTP):

```ts
// src/lib/photos.ts
export async function savePhoto(user, { parentType, parentId, buffer, filename }): Promise<TaskPhoto>
//   role gate (staff) + canAccessProject + uploadImage + thumbnail + prisma.taskPhoto.create
```

Telegram sends the photo without a thumbnail; generate one server-side with
`sharp` (or reuse whatever the web client uses). The HTTP route then also calls
`savePhoto` - one implementation, two callers.

### 6b. Measurements: PUT is a FULL REPLACE - a naive "add" wipes the sheet

`PUT /api/measurements` does `deleteMany` + `createMany` for the whole parent
(`measurements/route.ts:56`). If the Telegram tool naively "adds a
measurement" by calling PUT with one row, **it deletes every existing row for
that task/subtask.** The field tool must append:

```ts
// src/lib/measurements-append.ts
export async function appendMeasurement(user, { parentType, parentId, row }) {
  // role gate + access check
  // read current rows → push normalizeMeasurement(row, order) → write back
}
```

This is the single most dangerous line in the whole feature. It needs its own
test: append to a parent with existing rows, assert the old rows survive.

### 6c. DECISION NEEDED - who is allowed to write?

Both writes are **staff-only; CLIENT is explicitly excluded** (CLIENT can only
GET measurements). The ask said "a **client** should be able to upload photos
and insert measurements," but on a real site the person measuring and
photographing is the **employee / site engineer**, not the building owner
(the CLIENT role).

**Recommendation:** keep writes staff-only (matches every existing rule);
reads follow project access and include CLIENT. If literally the CLIENT role
must write, that is a policy change - clients editing measurement data and
project photos - and should be a deliberate decision, not a side effect of the
bot. **Confirm before building 6a/6b.**

## 7. Voice → text - the one genuinely new dependency

Telegram voice messages are OGG/Opus files. Speech-to-text is required.

- **Recommended: local `faster-whisper` (or `whisper.cpp`).** The LLM already
  defaults to **local Ollama**, so today no tenant data leaves the server;
  a local STT keeps that property. Consistent with the privacy posture.
- Cloud alternative (OpenAI/Google STT) is less setup but sends site audio off
  the box. Only if a local model is too slow on the target hardware.

Flow: download the file via Telegram `getFile` → STT → hand the transcript to
the same dispatcher as a typed message. Voice adds no new *logic*, only a
transcription step in front. `ponytail: skip STT entirely in the first cut - text + photos already deliver field updates; add voice once the write tools are proven.`

## 8. Security non-negotiables (do not simplify away)

- Identity is proven by the web login (the link flow), never by chat_id/phone.
- Webhook rejects any request without the correct secret-token header.
- No tool runs - read or write - for an unbound chat.
- Writes re-check role + project access server-side, every time.
- Every write replies with a confirmation echo ("Added 3.5m to <task> ✓") so a
  misfire is visible immediately.
- **A reply is an external publish.** Even with a local LLM, the *answer*
  (financials, photos) transits Telegram's servers to reach the phone. That is
  inherent to using Telegram at all and is the main reason the eventual
  own-app matters - it removes this hop. Worth stating to the client, not
  hiding.

## 9. WhatsApp - later, and it is a business project not a code task

The only legitimate path is Meta's **WhatsApp Business Cloud API**: verified
Meta Business account, an approved phone number, and pre-approved message
templates for anything outside a 24-hour reply window, billed per conversation.
The unofficial libraries (Baileys/venom) violate WhatsApp's ToS and get the
number banned - not an option. When it comes, it is a second transport adapter
in front of the *same* `runChat` + tools; the core built for Telegram is
reused wholesale. Gate it on the Meta onboarding, not on engineering.

## 10. Build order

1. Fix the calendar build blocker (precondition, section 0).
2. Extract `runChat` → `src/lib/assistant-chat.ts` (pure move, route stays green).
3. `TelegramLink` schema + web "Connect/Unlink" + one-time code. `db push`.
4. Webhook + `/link` + **read Q&A**. ← first working, shippable slice.
5. Rate limiting.
6. Confirm 6c, then photo write tool (`savePhoto` extraction).
7. Measurement **append** tool (+ its survive-existing-rows test).
8. Voice STT.
9. WhatsApp adapter (separate, gated on Meta onboarding).

## Deliberately not building

- No command framework - free text already works; only `/start`, `/link`.
- No write tools beyond photos + measurements until asked.
- No WhatsApp code until the Meta business account exists.
- No cloud STT/LLM by default - stay on the local models already configured.
