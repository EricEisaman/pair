const DATA_URL_PREFIX = "data:application/octet-stream;base64,"

// Inspired by https://dev.to/samternent/json-compression-in-the-browser-with-gzip-and-the-compression-streams-api-4135
function pipeBlobThrough(blob, transformStream) {
	return new Response(blob.stream().pipeThrough(transformStream)).blob()
}

function compressBlob(blob, method) {
	return pipeBlobThrough(blob, new CompressionStream(method))
}

function uncompressBlob(blob, method) {
	return pipeBlobThrough(blob, new DecompressionStream(method))
}

// From https://stackoverflow.com/a/18650249
function blobToBase64(blob) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onloadend = () => {
			const result = reader.result
			resolve(result.substring(result.indexOf(",") + 1))
		}
		reader.readAsDataURL(blob)
	})
}

// From https://stackoverflow.com/a/36183085
function base64ToBlob(str) {
	return new Promise((resolve, reject) => {
		fetch(DATA_URL_PREFIX + str)
			.then(res => res.blob())
			.then(blob => resolve(blob))
	})
}

function urlEncodeBase64(str) {
	// Replace reserved chars according to base64url
	let replaced = str.replaceAll("+", "-").replaceAll("/", "_")
	// Encode remaining reserved chars (should only be =)
	return encodeURIComponent(replaced)
}

function urlDecodeBase64(str) {
	let decoded = decodeURIComponent(str)
	return decoded.replaceAll("_", "/").replaceAll("-", "+")
}

function encodeSignal(signal) {
	return new Promise((resolve, reject) => {
		const signalString = JSON.stringify(signal)
		compressBlob(new Blob([signalString]), "deflate-raw")
			.then(blob => blobToBase64(blob))
			.then(base64 => urlEncodeBase64(base64))
			.then(encodedSignal => resolve(encodedSignal))
	})
}

function decodeSignal(code) {
	return new Promise((resolve, reject) => {
		const base64 = urlDecodeBase64(code)
		base64ToBlob(base64)
			.then(blob => uncompressBlob(blob, "deflate-raw"))
			.then(blob => blob.text())
			.then(str => resolve(JSON.parse(str)))
	})
}

export {
	encodeSignal,
	decodeSignal
}