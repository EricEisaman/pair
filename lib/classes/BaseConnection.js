const GATHERING_TIMEOUT = 1000
const customConfig = {
	iceServers: [
		{urls:"stun:stun.l.google.com:19302"}
	]
}

export default class BaseConnection extends RTCPeerConnection {
	constructor(config) {
		super(customConfig)	// Todo: Extend config with gatheringTimeout, move customConfig to example
	}

	awaitCandidates() {
		return new Promise((resolve, reject) => {
			const candidates = []
			// Collect candidates
			this.addEventListener("icecandidate", e => {
				if (e.candidate != null) {
					candidates.push(e.candidate)
				}
			})
			// Resolve when all candidates are gathered
			this.addEventListener("icegatheringstatechange", e => {
				if (e.target.iceGatheringState === "complete") {
					resolve(candidates)
				}
			})
			// Failsafe: Resolve a few seconds after no (more) candidate was gathered
			setTimeout(() => resolve(candidates), GATHERING_TIMEOUT)
			// Todo: Do these EventListeners have to be removed?
		})
	}

	setRemoteCandidates(candidates) {
		let promises = []
		for (let candidate of candidates) {
			promises.push(this.addIceCandidate(candidate))
		}
		return Promise.all(promises)
	}
}