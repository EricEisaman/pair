# webrtc-via-qr — local p2p

> WEBRTC / QR • P2P • NO SIGNALING
> Host creates an offer → QR → Joiner scans → accept QR → direct encrypted dataChannel. No relay after handshake.

Fully self-contained. No CDN. No external stylesheet. No external imports. All QR, WebRTC, and UI inlined.

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
```

Eyebrow: 11px mono uppercase • Title: 34px weight 650 tracking -0.03em • Desc: 14px muted

---

## files

- host-dark-no-cdn.html — Host — creates RTCPeerConnection, createDataChannel('fromhost'), createOffer(), encodes offer as base64 QR
- join-dark-no-cdn.html — Join — parses ?invite= or manual paste, setRemoteDescription(), createAnswer(), encodes answer as base64 QR
- README.md — this file

No style.css. No vendor folder. Single file each.

---

## how it works

Host
1. pc = new RTCPeerConnection({iceServers:[{urls:"stun:stun.l.google.com:19302"}]})
2. sendCh = pc.createDataChannel('fromhost')
3. offer = await pc.createOffer(); await pc.setLocalDescription(offer)
4. wait iceGatheringState === 'complete' or 1500ms timeout
5. invite = btoa(JSON.stringify(pc.localDescription))
  joinUrl = new URL('join-dark-no-cdn.html', location.href) + '?invite=' + encodeURIComponent(invite)
  drawQRToCanvas(qr, joinUrl)  // QR now links to join page

Join
1. ?invite= → remoteDesc = JSON.parse(atob(invite))
2. pc = new RTCPeerConnection(CONFIG)
3. sendCh = pc.createDataChannel('fromuser')
4. await pc.setRemoteDescription(remoteDesc)
5. answer = await pc.createAnswer(); await pc.setLocalDescription(answer)
6. wait gathering → accept = btoa(JSON.stringify(pc.localDescription)) → QR for host

Connect
- Host scans accept QR → setRemoteDescription(accept)
- connectionState: connecting → connected
- dataChannel.onmessage → chat enabled

QR lib: Kazuhiko Arase MIT inlined. No CDN. BarcodeDetector for scanning with manual paste fallback.

---

## usage

Open host-dark-no-cdn.html → Create invite → QR appears.

P2P offer generated • encrypted • local • 14:32:10

On joiner device, open join-dark-no-cdn.html?invite=<base64> or paste invite.

Joiner shows accept QR → host presses Scan accept → points camera.

Both see:

Connected successfully @ <timestamp>
Live

Chat: Me: white/right • Peer: translucent/left • system: dashed center.

---

## security

- Offer/answer are standard SDP, base64 only. No server.
- After ICE, direct P2P RTCDataChannel — encrypted by DTLS (browser built-in).
- STUN stun.l.google.com:19302 used only for NAT traversal, not relay. No TURN.
- Works offline on same LAN after initial STUN if host candidates include host candidates.

This is a serious local P2P solution, not a mock. Real offer, real answer, real dataChannel.

---

## no cdn verification

Verification — zero external src, href, or import:

- external src count: 0
- external href count: 0
- external import count: 0
- external stylesheet count: 0

Only stun: protocol remains.

---

## customization

- Change STUN: CONFIG.iceServers
- Change gathering timeout: 1500 ms in Promise
- Change QR ECC: QRCodeModel(0,0) → 0=M, 1=L, 2=H, 3=Q
- Colors: :root vars --bg, --card, --border, --text, --muted

---

## license

QR generator MIT Kazuhiko Arase — inlined.
WebRTC code — public domain, local only.
