# WebRTC via QR
Establish a WebRTC connection without requiring a signalling server (like TURN- or dedicated server). Instead, initial signalling is achieved by scanning QR codes in person.

**WIP Don't use this yet - there are no tests, no error handling and functionality might change!!!**

## Motivation
Intended for local games. Setting up a WebRTC connection requires some way of exchanging description- and candidate-data between clients ("signalling"). Usually this is achieved by paying for a TURN server or hosting a dedicated server yourself. However, since everyone is available in-person anyway, the signalling might as well be done via some local exchange - in this case by scanning QR codes.

## Flow
1. Host creates invite as QR code
2. Joinee scans invite, which creates accept as QR code
3. Host scans accept
4. Connection will be established

## Example
Check out the [example](https://ericeisaman.github.io/webrtc-via-qr/example/host.html). It requires two devices with a camera to scan the QR codes (smartphones recommended). After the connection is established you can chat via a `RTCDataChannel`.

## Installation
Download using NPM:
```
npm install webrtc-via-qr
```
Embed using [esm.run](https://esm.run):
```js
import { HostConnection, UserConnection } from "https://esm.run/webrtc-via-qr"
```

## Usage
The module exposes two classes:
```js
class HostConnection extends RTCPeerConnection
class UserConnection extends RTCPeerConnection
```
Both are subclasses of [RTCPeerConnection](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection), which is at the core of WebRTC. Their only purpose is to simplify the connection process. The actual RTC functionality is inherited - whether you want to add tracks or just require a simple RTCDataChannel.

The `config` parameter of the [constructor](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/RTCPeerConnection#configuration) of these subclasses includes one additional optional value: `gatheringTimeout`. It defines the upper time limit for the (now hidden) candidate gathering phase in ms and defaults to 1000. Only touch this if the QR code generation fails with no candidates.

Now onto the actual connection process, which is asymmetrical. The peer trying to connect uses a `HostConnection`, the responding peer uses a `UserConnection`.

### Host
```js
const h = new HostConnection(config)
// Step 4
h.addEventListener("connectionstatechange", event => {
	if (h.connectionState === "connected") console.log("connected")
})
// Step 1
const inviteCode = await h.createInvite()
// Step 3
h.confirmAccept(acceptCode)
```

### Joinee
```js
let u = new UserConnection(config)
// Step 4
u.addEventListener("connectionstatechange", event => {
	if (u.connectionState === "connected") console.log("connected")
})
// Step 2
const acceptCode = await u.acceptInvite(inviteCode)
```

Both of these codes `inviteCode` & `acceptCode` are Strings! The encoding to & decoding from a QR matrix is **not included** because this should be **your choice**. QR codes can be customized in so many different ways - error levels, colors, embedded logos, rounded pixels, or even [video](https://x.com/i/status/1782342900644188171)! Including a certain en-/decoder would be considered bloat by some, while not including enough functionality for others, which is why they are excluded from the scope of this package. The [example](https://ericeisaman.github.io/webrtc-via-qr/example/host.html) uses [qrcode](https://www.npmjs.com/package/qrcode) & [jsQR](https://www.npmjs.com/package/jsqr).

## Problems & limitations
- Symmetric NAT. This scenario will still require a TURN server, because there is just no way of exchanging ever-changing combinations of IP + port. This will most likely apply to peers connected by cellular network or if just one peer is behind a local router.
- Topology. Connecting everyone with everyone is infeasable when each connection is initialized by hand. A star topology with a dedicated host-player solves this (but requires additional logic not implemented here).
- Capacity. QR codes can be too small to contain all data. Either some candidates are omitted or multiple codes must be scanned.
- Tight timeout. Some browsers fail the connection on purpose after a set amount of time, making manual exchange unnecessary difficult. Firefox only allows 5 secondy by default (customizable at `media.peerconnection.ice.trickle_grace_period`)

## Inspiration
Several other repos already use this mechanism:
- [serverless-webrtc-qrcode](https://github.com/fta2012/serverless-webrtc-qrcode)
- [webrtc-qr](https://github.com/AquiGorka/webrtc-qr)
- [webrtc-qr-signaling-channel](https://github.com/TomasHubelbauer/webrtc-qr-signaling-channel)

However they only provide proof of concept and not a simple package anyone can use.