# webrtc-via-qr : local p2p

> WEBRTC / QR • P2P • NO SIGNALING
> Host creates offer → QR → Joiner scans → accept QR → direct encrypted dataChannel. No relay after handshake.

Fully self-contained. No CDN. No external stylesheet. No external imports. All QR, WebRTC, and UI inlined.

[DEMO](https://ericeisaman.github.io/pair/example/host.html)

---

## the story

It started with a simple question: can two devices in the same room talk directly without a server, without an account, without the internet?

*Sigma Scholar Alliance : WebRTC*

**Situation 1 — Same room.** You're on the same WiFi, same router, you can see each other. You don't need Google's STUN. The browser already knows your local IPs — host candidates. So `iceServers: []`. No external request. Generate an offer, btoa it, QR points to `join.html?invite=...`. Done. Offline. Works from `file://`.

**Situation 2 — Internet / NAT.** Across town, different NATs, host candidates fail. Need `srflx`. So `iceServers: [{urls:"stun:stun.l.google.com:19302"}]`. STUN only asks "what's my public IP?" — no relay. QR now encodes absolute URL `https://ericeisaman.github.io/pair/example/join.html?invite=...` — shareable across internet.

**Situation 3 — Remote folks want a clean link.** Base64 SDP leaks IPs. So AES-GCM 256: `?e=ENCRYPTED#k=KEY`. IV+CT in `e`, key in `#k=` fragment (never sent to server). Looks opaque.

Toggle in UI: **Same Room** vs **Internet (NAT)**. User chooses. Same code, all scenarios work.

---

## scenarios — every way this can be used

This is why the toggle and AES and URL accept exist. Every combination is real:

### 1) Same Room — QR + QR (offline, file://)
The original. No internet.
- Host: open `host.html` or `file:///host.html` → Mode: Same Room → Create invite → `iceServers:[]`
- QR = `join.html?invite=BASE64` (relative, works offline)
- Joiner: scans QR with phone camera → opens `join.html?invite=...` → auto-creates answer → shows accept QR
- Host: Scan accept → `setRemoteDescription(accept)` → Connected
- Zero network requests. Chat via dataChannel.

### 2) Same Room — QR + URL (no camera on host)
Same as above but host camera broken / permission denied.
- Host creates invite QR as before
- Joiner scans, generates accept
- Joiner now shows **two things**: accept QR *and* link `host.html?accept=BASE64` (relative, offline)
- Joiner: taps Copy → sends via AirDrop, nearby share, or just shows link
- Host: opens link or pastes into manual box → `extractAccept()` → `setRemoteDescription` → Connected
- Host stores last offer in `localStorage` so new tab with `?accept=` can restore PC.

### 3) Same Room — Hosted but still same LAN
You opened `https://ericeisaman.github.io/pair/example/host.html` but both devices are on same WiFi.
- Mode: Same Room still works — host candidates include `192.168.x.x` and mDNS `.local`
- QR = relative `join.html?invite=...` resolved against current origin, but still host-only candidates
- Works even though page is hosted, because ICE doesn't need STUN.

### 4) Internet — Plain link sharing (NAT traversal)
Different networks, different cities.
- Host: open https://ericeisaman.github.io/pair/example/host.html → Mode: Internet (NAT) → Create invite
- Config = STUN + host candidates. Gathering waits for `srflx`.
- Generates:
  - QR = `https://ericeisaman.github.io/pair/example/join.html?invite=BASE64` (absolute)
  - Link = same URL, Copy button
- Host sends link via Signal / email / Discord
- Joiner opens link → `?invite=` auto-parsed → creates answer → shows accept QR + `host.html?accept=BASE64` link
- Host scans accept QR OR opens accept link (`?accept=` handling) → Connected via srflx → direct P2P

### 5) Internet — AES encrypted link (for remote folks)
Same as (4) but you don't want to leak SDP.
- Host in Internet mode also generates AES pair:
  ```js
  key = crypto.subtle.generateKey({name:"AES-GCM", length:256})
  iv = random 12 bytes
  e = b64url(iv + encrypt(JSON.stringify(offer)))
  k = b64url(key)
  url = join.html?e=ENCODED#k=KEY
  ```
- QR Enc = `?e=...#k=...`
- Link Enc = same, key in fragment `#k=` — fragment never sent to server, not logged
- Share Enc link in public channel — without `#k=`, `e` is useless
- Joiner opens Enc link → `extractEncryptedFromUrl()` gets `e` from query, `k` from hash or `?k=` → `decryptOfferJson(e,k)` → remoteDesc → answer → accept link as before
- Works for both QR and link sharing.

### 6) Internet — QR still works across internet if together
You're in same room but choose Internet mode for better NAT fallback.
- Both QRs work (plain + AES) — same as same-room QR+QR but with srflx candidates included
- Useful if router has AP isolation and host candidates fail.

### 7) Joiner entry points — all accepted
Join.html accepts:
- `?invite=BASE64` raw
- Full URL `https://.../join.html?invite=BASE64`
- Pasted raw BASE64
- Pasted full URL containing `invite=`
- AES: `?e=ENCODED#k=KEY`
- AES: `?e=ENCODED&k=KEY` (query variant for copy-paste where fragment stripped)
- Manual paste of any of above into textarea → Generate accept QR

### 8) Host entry points — all accepted
Host.html accepts joiner's answer as:
- QR scan via BarcodeDetector (camera)
- Manual paste raw BASE64
- Manual paste full URL `host.html?accept=BASE64`
- Direct open `host.html?accept=BASE64` — auto-applies on load, restores PC from localStorage if needed
- Same for same-room relative `host.html?accept=...`

### 9) No camera fallback — fully manual
Both sides can work without camera:
- Host: Create invite → Copy plain or Enc link → send
- Joiner: Paste link → Generate accept → Copy `host.html?accept=...` link → send
- Host: Paste accept link into manual box → Confirm → Connected
- 100% text-only signaling, still no server.

### 10) File:// vs Hosted
- `file:///host.html` → relative `join.html?invite=...` links, Same Room mode recommended, works airplane mode
- `https://ericeisaman.github.io/pair/example/host.html` (demo, keep dammit) and `https://ericeisaman.github.io/pair/example/host.html` → absolute links, both modes work, Internet mode adds STUN

### 11) Mom's symmetrical — same page, AES creds only e.k (NEW primary)
Both know the site `host.html`. No URL sharing needed.
- A creates offer → copies `e.k` (dot in middle) + QR for `e.k`
- B goes to same page → Section 2 Paste Offer → pastes `e.k` (or `e` + `k` fields or full URL) → Generate Accept → copies its own `e.k`
- A → Section 3 Paste Accept → pastes B's `e.k` → Connect
- Both pages identical — `host.html` == `join.html` now. Offer and answer both AES encrypted.
- Fixes: dec() handles base64url, clear error if only e pasted.

Every scenario ends the same: `Connected successfully @ timestamp`, `Live`, dataChannel chat.

---

## style

This README mirrors the pages:

- bg #0a0a0b • card rgba(255,255,255,0.04) • border rgba(255,255,255,0.08) • radius 20px
- system font: -apple-system, BlinkMacSystemFont, Inter, SF Pro Display, Segoe UI
- mono: ui-monospace, SFMono-Regular, Menlo
- status dot: idle #71717a • waiting #3b82f6 • connecting #eab308 • connected #22c55e
- toggle: bg #18181b, radius 9999px, active bg #fff

```css
.shell { max-width:720px; margin:0 auto; padding:32px 20px }
.card  { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:20px }
.toggle { background:#18181b; border-radius:9999px; padding:4px }
.toggle button.active { background:#fff; color:#000 }
```

Eyebrow: 11px mono uppercase • Title: 34px weight 650 tracking -0.03em • Desc: 14px muted

---

## files

- host.html — Host — toggle Same Room / Internet, creates RTCPeerConnection, createDataChannel('fromhost'), createOffer(), encodes as base64 QR + AES-GCM link `?e=...#k=...`, accepts joiner answer via QR scan OR `?accept=` URL, stores offer in localStorage for URL accept restoration
- join.html — Join — parses `?invite=` plain OR `?e=...#k=...` AES, setRemoteDescription(), createAnswer(), encodes answer as base64 QR + `host.html?accept=...` link for same-room URL accept
- README.md — this file

No style.css. No vendor folder. Single file each.

Canonical hosted:
- Host: https://ericeisaman.github.io/pair/example/host.html
- Join: https://ericeisaman.github.io/pair/example/join.html?invite=...

Demo (keep dammit): https://ericeisaman.github.io/pair/example/host.html

---

## how it works

Host (now symmetrical — can also act as joiner)
1. mode = same-room ? {iceServers:[]} : {iceServers:[{urls:"stun:stun.l.google.com:19302"}]}
2. pc = new RTCPeerConnection(mode)
3. sendCh = pc.createDataChannel('fromhost')
4. offer = await pc.createOffer(); await pc.setLocalDescription(offer)
5. wait iceGatheringState === 'complete' or 1500ms timeout
6. invite = btoa(JSON.stringify(pc.localDescription))
   plainUrl = join.html?invite= + encodeURIComponent(invite)
   encrypted: key=generateKey AES-GCM 256, iv=random 12, ct=encrypt(JSON.stringify(offer)), e=b64url(iv+ct), k=b64url(key)
   encUrl = join.html?e= + e + #k= + k
   credsOnly = e + '.' + k  (Mom's short form, QR for e.k)
   drawQRToCanvas(qr, plainUrl) + drawQRToCanvas(qrEnc, encUrl) + drawQRToCanvas(qrCreds, credsOnly)
   saveOffer() → localStorage + sessionStorage {offer, mode, ts}
7. Can also paste offer (any format) in Section 2 → createAnswerFromAny() → answer + encrypt answer to e.k too

Join (now identical to Host — symmetrical)
1. parse location: if ?e= && (#k= or ?k=) → decryptJson(e,k) → remoteDesc
   else if ?invite= → remoteDesc = JSON.parse(atob(invite) with base64url fallback)
   else manual paste Section 2: accepts plain, ?invite= URL, ?e=...#k=... URL, e.k, e + k fields, JSON {e,k}
2. pc = new RTCPeerConnection(mode)
3. sendCh = pc.createDataChannel('fromuser')
4. await pc.setRemoteDescription(remoteDesc)
5. answer = await pc.createAnswer(); await pc.setLocalDescription(answer)
6. wait gathering → accept = btoa(JSON.stringify(pc.localDescription))
   hostUrl = host.html?accept= + encodeURIComponent(accept)
   acceptEnc: encryptJson(accept) → e2,k2 → e2.k2 + QR
   QR + link + credsOnly

Connect
- Host: Section 3 Paste Accept — accepts plain accept, ?accept= URL, e.k creds, e + k fields, JSON
  - scan accept QR OR open host.html?accept=... OR paste into manual box OR paste e.k → extractAccept() / parseAesCreds() / decryptJson() → setRemoteDescription()
- If pc null on host with ?accept=, restorePcFromStoredOffer() from localStorage (restores mode too)
- Pending accept: if ?accept= opened in new tab before offer exists, saved to pending-accept and auto-applied after Create invite
- dec() now handles both base64 and base64url (fixes InvalidCharacterError when pasting e)
- isProbablyEOnly() detects pasting only e without k and shows helpful message
- connectionState: connecting → connected → dataChannel.onmessage

QR lib: Kazuhiko Arase MIT inlined. No CDN. BarcodeDetector for scanning with manual fallback. AES via Web Crypto subtle.

---

## usage — quick reference by scenario

- **Same Room QR+QR:** Host Same Room → Create → Joiner scans → Joiner accept QR → Host Scan accept
- **Same Room QR+URL:** Host Same Room → Create → Joiner scans → Joiner copies host.html?accept=... → Host opens link → Connected (no camera)
- **Internet Plain Link:** Host Internet → Create → Copy plain link → Send → Joiner opens → Joiner accept link → Host opens accept link
- **Internet AES Link:** Host Internet → Create → Copy Enc link `?e=...#k=...` → Send → Joiner auto-decrypts → accept link back
- **Manual Only:** No camera → copy/paste invite and accept as text
- **Mom's Symmetrical AES creds e.k (NEW primary):** Both go to same page `host.html` → A Create → copy `e.k` → B Section 2 Paste Offer `e.k` → Generate Accept → copy its `e.k` → A Section 3 Paste Accept `e.k` → Connect. No URL needed, same page, both roles.

All end with:

Connected successfully @ <timestamp>
Live

Chat: Me white/right • Peer translucent/left • system dashed center.

---

## security

- Offer/answer are standard SDP. Plain: base64 only. AES: AES-GCM 256, IV random 12, key in fragment #k= never sent to server.
- After ICE, direct P2P RTCDataChannel — encrypted by DTLS (browser built-in).
- Same-room: iceServers:[] — zero external requests, works offline.
- Internet: STUN stun.l.google.com:19302 only for NAT traversal to get srflx, not relay. No TURN.
- AES: e=IV+CT base64url, k=key base64url in hash. Without k, e useless. Fragment stays client-side.
- localStorage only stores last offer JSON locally, never sent.

---

## no cdn verification

Verification — zero external src, href, or import:

- external src count: 0
- external href count: 0
- external import count: 0
- external stylesheet count: 0

Only stun: protocol remains in Internet mode. Same-room mode: zero network.

---

## customization

- Change STUN: getConfig().iceServers
- Gathering timeout: 1500 ms
- QR ECC: QRCodeModel(0,0) → 0=M, 1=L, 2=H, 3=Q
- Colors: :root vars --bg, --card, --border, --text, --muted
- AES: 256 GCM, 12-byte IV in encryptOfferJson / decryptOfferJson
- Toggle default: setMode('internet') or 'same-room'

---

## license

QR generator MIT Kazuhiko Arase — inlined.
WebRTC + AES toggle code — public domain, local only. Demo link stays: https://ericeisaman.github.io/pair/example/host.html


---

## Mom's symmetrical scenario — AES creds only, same page you know (NEW + FIXED)

> Mom said: users should just be able to exchange the AES encoded ICE candidate credentials since they may already know the site to get the chat page from.

This is now the primary flow and the pages are **identical** — `host.html` and `join.html` do the same thing, both can create offer or answer.

**Both know the site:** `https://ericeisaman.github.io/pair/example/host.html` — no need to share full URL.

1. Person A → host.html → Mode: Same Room or Internet → **Create invite** (Section 1)
   - Dialog shows:
     - Plain link `.../join.html?invite=...`
     - AES link `.../join.html?e=...#k=...`
     - **Mom's creds only:** `e`, `k`, and combined `e.k` + QR for `e.k` — short, no URL needed
   - Shows QR of `e.k`. Person B in same room scans or copies `e.k`.

2. Person B → **same page they know** → Section 2 **Paste Offer (Invite) — I am Joiner**
   - Pastes any format into big textarea OR `e` + `k` fields:
     - `?invite=` URL, raw base64 invite, `?e=...#k=...` URL, `e.k` (with dot), `e k` (space), JSON `{"e":...,"k":...}`
   - Click **Generate Accept from Offer**
   - Generates answer, **also encrypts answer with AES-GCM** (symmetrical)
   - Dialog **Accept — Answer** shows:
     - Plain accept `host.html?accept=...`
     - AES link `host.html?e=...#k=...`
     - Creds only: accept `e`, `k`, `e.k` + QR for `e.k`

3. Person A → Section 3 **Paste Accept (Answer) — I am Host** on same page
   - Pastes B's accept `e.k` (or plain or URL) into big textarea OR `e` + `k` fields
   - Click **Connect with Accept** → `setRemoteDescription` → Connected

**Why symmetrical:**
- Same page = both roles. No host vs join confusion.
- `e.k` is opaque, short, offline-friendly. QR / NFC / show screen.
- Still supports all old flows: `?invite=`, `?e=...#k=...`, `?accept=`, QR scan, manual.

**2026-10-25 fixes applied (your screenshot bug):**
- `dec()` / `atob` now handles **both base64 and base64url** (`+ /` vs `- _`) with auto-padding. Previously pasting `e` (base64url) into accept box threw `InvalidCharacterError: Failed to execute 'atob'... not correctly encoded`.
- `parseAesCreds()` now strips whitespace/newlines, handles `e.k`, `e#k`, `?e=...&k=...`, `?e=...#k=...`, space-separated, and JSON.
- If you paste **only `e`** (long blob with `- _`) without `k`, you now get clear error:
  > You pasted only e (encrypted data). Need both e and k. Copy combined e.k from other phone — it has a dot in middle — or paste e and k into separate fields.
  Instead of `Failed accept: InvalidCharacterError`.
- `isProbablyEOnly()` detects single `e` paste and explains.
- Offer and accept both generate AES creds — fully symmetrical.

**Implementation:**
- `encryptJson(jsonStr)` / `decryptJson(e,k)` — AES-GCM 256, 12-byte IV, `e = b64url(IV+CT)`, `k = b64url(key)` — used for both offer and answer
- `parseAesCreds()` accepts: `?e=...#k=...`, `?e=...&k=...`, `e.k`, `e#k`, `e k`, `{"e":...,"k":...}`
- `saveOffer()` stores offer + mode in localStorage + sessionStorage; `restorePcFromStoredOffer()` restores mode
- Pending accept queue: if you open `host.html?accept=...` in new tab before creating offer, it saves to `localStorage.pending-accept` and auto-applies after you click Create invite
- Both offer and answer dialogs have QR for `e.k` creds only — ideal for same-room where you know the site.

This is the flow Mom approved.
