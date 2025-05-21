import { createServer } from 'http'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

const serve = async (res, filePath, contentType) => {
	try {
		const data = await readFile(filePath, "utf-8")
		res.writeHead(200, {"Content-Type": contentType})
		res.end(data)
	} catch (err) {
		res.writeHead(404, {"Content-Type": contentType})
		res.end("404 Page not found")
	}
}

const getLinks = async () => {
	const filePath = path.join("data", "links.json")
	try {
		const res = await readFile(filePath, 'utf-8');
		return JSON.parse(res);
	} catch (err) {
		if (err.code === "ENOENT") {
			await writeFile(filePath, JSON.stringify({}), 'utf-8')
			return {}
		}
	}
}

const saveLinks = async (links) => {
	const filePath = path.join("data", "links.json")
	try {
		await writeFile(filePath, JSON.stringify(links, null, 2), 'utf-8');
	} catch (err) {
		
	}
}

const server = createServer(async (req, res) => {
		console.log(req.url)
	if (req.method === "GET") {
		if (req.url === "/") {
			return await serve(res, path.join("public", "index.html"), "text/html")
		} else if (req.url === "/style.css") {
			return await serve(res, path.join("public", "style.css"), "text/css")
		} else if (req.url === '/links') {
  const token = req.headers['authorization']
  if (token !== process.env.LINKS_TOKEN) {
    res.writeHead(403, {'Content-Type': 'application/json'})
    return res.end(JSON.stringify({ success: false, error: "Forbidden" }))
  }

  let links = await getLinks() || {}
  res.writeHead(200, {'Content-Type': 'application/json'})
  return res.end(JSON.stringify({links: {...links}, success: true}))
} else {
			let links = await getLinks() || {}
			const shortCode = req.url.slice(1)
			if (links[shortCode]) {
				res.writeHead(302, {location: links[shortCode]})
				return res.end()
			}
		return await serve(res, path.join("public", "404.html"), "text/html")
		}
	}
	if (req.method === "POST" && req.url === "/shorten") {
		let links = await getLinks() || {}
		let body = ''
		req.on('data', (chunk) => {
			body += chunk
		})
		req.on('end', async () => {
	let { url, customUrl } = JSON.parse(body);
	if (!url.includes("https://www.")) url = "https://www." + url
	const finalUrl = customUrl || crypto.randomBytes(4).toString("hex")

	// Fetch latest links to avoid overwriting
	let links = await getLinks() || {}

	if (links[finalUrl.toLowerCase()]) {
	  res.writeHead(400, { "Content-Type": "application/json" })
	  return res.end(JSON.stringify({
	    success: false,
	    error: "Custom URL already exists. Please use another one."
	  }))
	}

	links[finalUrl.toLowerCase()] = url
	await saveLinks(links)
	
	res.writeHead(200, {"Content-Type": "application/json"})
	res.end(JSON.stringify({success: true, finalUrl, url}))
})
	}
})

server.listen("3000", () => {
	console.log("Listening on PORT 3000")
})