import BaseConnection from "./BaseConnection.js"
import { decodeSignal, encodeSignal } from "../encoding.js"

export default class HostConnection extends BaseConnection {
	constructor(config) {
		super(config)
	}

	createInvite() {
		// Initialize offer + candidate gathering
		const offerPromise = this.createOffer()
			.then(offer => this.setLocalDescription(offer))	// Without this the candidate gathering WILL NOT START -> Has to happen here and not after Promise.all!
			.then(() => this.localDescription)
		const candidatePromise = this.awaitCandidates()
		// Await offer + candidates
		return Promise.all([offerPromise, candidatePromise])
			.then(results => {
				const [offer, candidates] = results
				// Encode Invite (description + candidates)
				return encodeSignal({
					sdp: offer.sdp,
					candidates: candidates
				})
			})
	}

	confirmAccept(code) {
		// Keep track of information included in accept
		let candidates = undefined
		// Decode accept (remote description + candidates)
		decodeSignal(code)
			.then(accept => {
				candidates = accept.candidates
				const answer = {
					type: "answer",
					sdp: accept.sdp
				}
				// Set remote description
				return this.setRemoteDescription(answer)
			})
			.then(() => this.setRemoteCandidates(candidates))	// Can only be done AFTER remote description was set
	}
}