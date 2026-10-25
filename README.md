# webrtc-via-qr : local p2p

> WEBRTC / QR • P2P • NO SIGNALING
> Host creates offer → QR → Joiner scans → accept QR → direct encrypted dataChannel. No relay after handshake.

Fully self-contained. No CDN. No external stylesheet. No external imports. All QR, WebRTC, and UI inlined.

[DEMO](https://ericeisaman.github.io/pair/example/host.html)

---

## the story

It started with a simple question: can two devices in the same room talk directly without a server, without an account, without the internet?

Sigma Scholar Alliance: WebRTC

**Situation 1 — Same room.** You're on the same WiFi, same router, you can see each other. You don't need Google's STUN, you don't need a signaling server. The browser already knows your local IPs — host candidates. So `iceServers: []`. No external request. Generate an offer, btoa it, put it in a QR that points to `join.html?invite=...`. The other person scans. Done. Offline. Works from `file://`.

That was v1.

Then people tried it across town. Different NATs. Host candidates alone don't cut it. You need `srflx`.

**Situation 2 — Internet / NAT.** Same flow, but now `iceServers: [{urls:"stun:stun.l.google.com:19302"}]`. STUN just asks "what's my public IP?" — no relay, no TURN. The QR now encodes an absolute URL: `https://ericeisaman.github.io/pair/examples/join.html?invite=...` — shareable across the internet. You can paste the link in Signal, email, whatever. It still has no server. After ICE, it's direct P2P dataChannel, DTLS encrypted.

But that link is gross. Base64 SDP leaks ICE candidates, IPs, fingerprint. If you post it in a group chat, it's readable.

**Situation 3 — Remote folks need a clean link.** So I added AES.

When you hit "Create invite" in Internet mode, we now generate *two* things:

1. Plain link: `?invite=BASE64`
2. AES encrypted link: `?e=ENCRYPTED#k=KEY`

How: `crypto.subtle.generateKey({name:"AES-GCM", length:256})`, random 12-byte IV, encrypt `JSON.stringify(offer)`. Bundle `IV + ciphertext` as base64url `e`, export raw key as base64url `k`. Final URL: `join.html?e=...#k=...`

Key in `#k=` fragment — fragment never hits the server, never logged. The page at `ericeisaman.github.io` never sees it. Joiner opens the link, we parse `e` from query and `k` from hash, `crypto.subtle.importKey` + `decrypt`, get the offer back, and continue as normal.

You can share the encrypted link in the open. It looks opaque. Without `#k=`, it's useless.

Toggle in UI: **Same Room** vs **Internet (NAT)**. User chooses. Same code, both situations work. Same-room stays offline. Internet gets STUN + plain link + AES link + QR for both.

This is a serious local P2P solution, not a demo toy. Real offer, real answer, real dataChannel.

---

## style

This README mirrors the pages:

- bg #0a0a0b • card rgba(255,255,255,0.04) • border rgba(255,255,255,0.08) • radius 20px
- system font: -apple-system, BlinkMacSystemFont, Inter, SF Pro Display, Segoe UI
- mono: ui-monospace, SFMono-Regular, Menlo
- status dot: idle #71717a • waiting #3b82f6 • connecting #eab308 • connected #22c55e

```css
.shell { max-width:720px; margin:0 auto; padding:32px 20px }
.card  { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:20px }
.toggle { background:#18181b; border-radius:9999px; padding:4px }
.toggle button.active { background:#fff; color:#000 }
```

Eyebrow: 11px mono uppercase • Title: 34px weight 650 tracking -0.03em • Desc: 14px muted

---

## files

- host.html — Host — toggle Same Room / Internet, creates RTCPeerConnection, createDataChannel('fromhost'), createOffer(), encodes as base64 QR + AES-GCM encrypted link `?e=...#k=...`, QR links to join
- join.html — Join — parses `?invite=` plain OR `?e=...#k=...` AES, setRemoteDescription(), createAnswer(), encodes answer as base64 QR, supports same toggle
- README.md — this file

No style.css. No vendor folder. Single file each.

Canonical hosted:
- Host: https://ericeisaman.github.io/pair/examples/host.html
- Join: https://ericeisaman.github.io/pair/examples/join.html?invite=...

Demo (keep dammit): https://ericeisaman.github.io/pair/example/host.html

---

## how it works

Host
1. mode = same-room ? {iceServers:[]} : {iceServers:[{urls:"stun:stun.l.google.com:19302"}]}
2. pc = new RTCPeerConnection(mode)
3. sendCh = pc.createDataChannel('fromhost')
4. offer = await pc.createOffer(); await pc.setLocalDescription(offer)
5. wait iceGatheringState === 'complete' or 1500ms timeout
6. invite = btoa(JSON.stringify(pc.localDescription))
   plainUrl = join.html?invite= + encodeURIComponent(invite)
   encrypted: key=generateKey AES-GCM 256, iv=random 12, ct=encrypt(JSON.stringify(offer)), e=b64url(iv+ct), k=b64url(key)
   encUrl = join.html?e= + e + #k= + k
   drawQRToCanvas(qr, plainUrl) + drawQRToCanvas(qrEnc, encUrl)

Join
1. parse location: if ?e= && (#k= or ?k=) → await decryptOfferJson(e,k) → remoteDesc = JSON.parse(decrypted)
   else if ?invite= → remoteDesc = JSON.parse(atob(invite))
   else manual paste (raw or full URL)
2. pc = new RTCPeerConnection(mode)
3. sendCh = pc.createDataChannel('fromuser')
4. await pc.setRemoteDescription(remoteDesc)
5. answer = await pc.createAnswer(); await pc.setLocalDescription(answer)
6. wait gathering → accept = btoa(JSON.stringify(pc.localDescription)) → QR for host

Connect
- Host scans accept QR → setRemoteDescription(accept)
- connectionState: connecting → connected
- dataChannel.onmessage → chat enabled

QR lib: Kazuhiko Arase MIT inlined. No CDN. BarcodeDetector for scanning with manual paste fallback. AES via Web Crypto subtle.

---

## usage

**Same room:**
Open host.html (or file://) → Mode: Same Room → Create invite → QR appears (host candidates only, no STUN). Joiner scans → join.html?invite=... → accept QR → host Scan accept → Live.

**Internet:**
Open https://ericeisaman.github.io/pair/example/host.html → Mode: Internet (NAT) → Create invite → Two QRs + two links:
- Plain link: `https://ericeisaman.github.io/pair/examples/join.html?invite=...`
- AES link: `https://ericeisaman.github.io/pair/examples/join.html?e=...#k=...` (for remote folks)

Copy link → send via chat/email. Remote opens → auto-decrypts AES if `e` + `#k=` present, or plain if `invite`. Generates accept QR → host scans.

Both see:

Connected successfully @ <timestamp>
Live

Chat: Me: white/right • Peer: translucent/left • system: dashed center.

---

## security

- Offer/answer are standard SDP. Plain mode: base64 only. AES mode: AES-GCM 256, IV random 12, key in fragment #k= never sent to server.
- After ICE, direct P2P RTCDataChannel — encrypted by DTLS (browser built-in).
- Same-room: iceServers:[] — zero external requests, works offline.
- Internet: STUN stun.l.google.com:19302 used only for NAT traversal to get srflx, not relay. No TURN.
- AES link: e=IV+CT base64url, k=key base64url in hash. Without k, e is useless. Share e+k together = one link, but server never sees k if you use #.

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
- AES: 256 GCM, 12-byte IV. Change in encryptOfferJson / decryptOfferJson

---

## license

QR generator MIT Kazuhiko Arase — inlined.
WebRTC + AES toggle code — public domain, local only. Demo link stays: https://ericeisaman.github.io/pair/example/host.html
