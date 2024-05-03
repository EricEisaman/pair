const DEFAULT_GATHERING_TIMEOUT = 1000

export default class BaseConnection extends RTCPeerConnection {
	constructor(config) {
		super(config)
		// Extend config with timeout for candidate gathering
		this.timeout = DEFAULT_GATHERING_TIMEOUT
		if (Object.hasOwn(config, "gatheringTimeout")) {
			this.timeout = config.gatheringTimeout	// Don't convert because the user might rely on exact type coercion of setTimeout
		}
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
			setTimeout(() => resolve(candidates), this.timeout)
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