/**
 * Lavet Wellness – zero-dependency static server + secure Deepgram proxy
 *
 * Env:
 *   PORT                 (default 8080)
 *   DEEPGRAM_API_KEY     secret – never sent to the browser
 *   DEEPGRAM_MODEL       default "nova-2"
 *   DEEPGRAM_LANGUAGE    default "en"
 */
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT) || 8080;
const DEEPGRAM_API_KEY = (process.env.DEEPGRAM_API_KEY || "").trim();
const DEEPGRAM_MODEL = process.env.DEEPGRAM_MODEL || "nova-2";
const DEEPGRAM_LANGUAGE = process.env.DEEPGRAM_LANGUAGE || "en";
const ROOT = path.join(__dirname, "..");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function send(res, status, body, headers = {}) {
  const data = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": headers["Content-Type"] || (typeof body === "object" && !Buffer.isBuffer(body) ? "application/json" : "text/plain"),
    "Cache-Control": headers["Cache-Control"] || "no-store",
    ...headers,
  });
  res.end(data);
}

function readBody(req, limit = 10 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/** Parse multipart/form-data enough to extract the "audio" file field */
function extractMultipartAudio(buf, contentType) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || "");
  if (!m) return null;
  const boundary = m[1] || m[2];
  const parts = buf.toString("binary").split("--" + boundary);
  for (const part of parts) {
    if (!/name="audio"/i.test(part)) continue;
    const idx = part.indexOf("\r\n\r\n");
    if (idx === -1) continue;
    let body = part.slice(idx + 4);
    if (body.endsWith("\r\n")) body = body.slice(0, -2);
    const header = part.slice(0, idx);
    const ct = /Content-Type:\s*([^\r\n]+)/i.exec(header);
    return {
      buffer: Buffer.from(body, "binary"),
      contentType: ct ? ct[1].trim() : "audio/webm",
    };
  }
  return null;
}

function proxyDeepgram(audioBuffer, contentType, language) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      model: DEEPGRAM_MODEL,
      language: language || DEEPGRAM_LANGUAGE,
      punctuate: "true",
      smart_format: "true",
    });
    const opts = {
      hostname: "api.deepgram.com",
      path: `/v1/listen?${params}`,
      method: "POST",
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": contentType || "audio/webm",
        "Content-Length": audioBuffer.length,
      },
    };
    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        let data = {};
        try { data = JSON.parse(raw); } catch {}
        resolve({ status: res.statusCode, data });
      });
    });
    req.on("error", reject);
    req.write(audioBuffer);
    req.end();
  });
}

function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath.split("?")[0]);
  if (rel === "/") rel = "/index.html";
  // clean URL: /products → products.html
  const clean = path.join(ROOT, rel);
  const withHtml = path.join(ROOT, rel.replace(/\/$/, "") + ".html");
  let file = null;
  if (fs.existsSync(clean) && fs.statSync(clean).isFile()) file = clean;
  else if (!path.extname(rel) && fs.existsSync(withHtml)) file = withHtml;
  if (!file) {
    send(res, 404, "Not found");
    return;
  }
  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  const cache =
    ext === ".html" ? "no-cache" :
    /\.(css|js)$/.test(ext) ? "public, max-age=3600" :
    /\.(jpg|jpeg|png|svg|webp|gif)$/.test(ext) ? "public, max-age=2592000" :
    "no-store";
  res.writeHead(200, { "Content-Type": type, "Cache-Control": cache });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const method = (req.method || "GET").toUpperCase();

  // CORS for same-origin only needed if ever cross-origin; keep simple
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  if (u.pathname === "/api/health") {
    return send(res, 200, "ok\n", { "Content-Type": "text/plain" });
  }

  if (u.pathname === "/api/config") {
    return send(res, 200, {
      deepgramEnabled: Boolean(DEEPGRAM_API_KEY),
      model: DEEPGRAM_API_KEY ? DEEPGRAM_MODEL : null,
    });
  }

  if (u.pathname === "/api/transcribe" && method === "POST") {
    if (!DEEPGRAM_API_KEY) {
      return send(res, 503, {
        error: "Deepgram is not configured. Set DEEPGRAM_API_KEY on the server.",
      });
    }
    try {
      const buf = await readBody(req);
      const ct = req.headers["content-type"] || "";
      let audio = null;
      let audioType = "audio/webm";

      if (ct.includes("multipart/form-data")) {
        const extracted = extractMultipartAudio(buf, ct);
        if (extracted) {
          audio = extracted.buffer;
          audioType = extracted.contentType;
        }
      } else if (ct.startsWith("audio/") || ct === "application/octet-stream") {
        audio = buf;
        audioType = ct.startsWith("audio/") ? ct : "audio/webm";
      } else if (buf.length) {
        // try raw
        audio = buf;
      }

      if (!audio || !audio.length) {
        return send(res, 400, {
          error: 'No audio provided. Send multipart field "audio" or raw audio body.',
        });
      }

      const language = (u.searchParams.get("language") || DEEPGRAM_LANGUAGE).slice(0, 8);
      const result = await proxyDeepgram(audio, audioType, language);

      if (result.status < 200 || result.status >= 300) {
        console.error("Deepgram error", result.status, result.data);
        return send(res, 502, {
          error: "Deepgram request failed",
          status: result.status,
          detail: result.data?.err_msg || result.data?.error || null,
        });
      }

      const transcript =
        result.data?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() || "";
      const confidence =
        result.data?.results?.channels?.[0]?.alternatives?.[0]?.confidence ?? null;

      return send(res, 200, { transcript, confidence, language });
    } catch (err) {
      console.error("Transcribe error", err);
      return send(res, 500, { error: "Transcription proxy failed" });
    }
  }

  if (method === "GET" || method === "HEAD") {
    return serveStatic(req, res, u.pathname);
  }

  send(res, 405, "Method not allowed");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Lavet Wellness on http://0.0.0.0:${PORT}`);
  console.log(
    DEEPGRAM_API_KEY
      ? `Deepgram proxy ON (model=${DEEPGRAM_MODEL})`
      : "Deepgram proxy OFF – set DEEPGRAM_API_KEY to enable"
  );
});
