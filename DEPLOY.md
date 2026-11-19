# Deploying Lavet Wellness

This is a static site (HTML/CSS/JS), so it deploys anywhere. Files provided:

| File | Purpose |
|------|---------|
| `Dockerfile` | nginx (non-root) image containing only the site |
| `nginx/default.conf.template` | Server config: gzip, caching, security headers, `/healthz` |
| `docker-compose.yml` | One-command local/VPS run |
| `.dockerignore` | Keeps docs and config out of the image |
| `render.yaml` | Render Blueprint (free Static Site) |

## Docker

```bash
# Compose (recommended)
docker compose up -d --build
# open http://localhost:8080        health: http://localhost:8080/healthz

# or plain Docker
docker build -t lavet-wellness .
docker run -d -p 8080:8080 --name lavet lavet-wellness

# different port inside the container (the config follows $PORT)
docker run -d -e PORT=3000 -p 3000:3000 lavet-wellness
```

Stop: `docker compose down`. Check health: `docker inspect --format '{{.State.Health.Status}}' lavet-wellness`.

## Render

**Option A: Blueprint (easiest)**
1. Push this folder to a GitHub/GitLab repo (the project files must be at the repo root).
2. Render dashboard > **New +** > **Blueprint** > select the repo.
3. Render reads `render.yaml` and deploys a free Static Site. Every `git push` redeploys.

**Option B: manual Static Site**
- New + > Static Site > connect repo
- Build command: `mkdir -p dist && cp *.html dist/ && cp -r css js images dist/`
- Publish directory: `dist`

**Option C: Docker on Render**
Use the commented Docker block at the bottom of `render.yaml` (paid plan). The image reads Render's `PORT` automatically, and `/healthz` is the health check path.

## Other hosts
- **Netlify / Vercel / Cloudflare Pages / GitHub Pages:** no build command, publish the repo root (or the same `dist` folder).
- **Fly.io / Railway / Cloud Run:** deploy the Dockerfile as-is; they set `PORT`.

## Notes
- Hosting does not change the prototype's limits: no real payments or accounts (see README).
- Add HTTPS and a custom domain in your host's dashboard; Render, Netlify and Vercel do this automatically.
- Cart and the loader's "seen" flag use browser storage, so they're per-visitor and need no server.


## Deepgram voice (optional)

The assistant can use **Deepgram** for speech-to-text via a secure server proxy.
The API key never reaches the browser.

1. Create a free key at https://console.deepgram.com/
2. Set the environment variable:

```bash
export DEEPGRAM_API_KEY=your_key_here
# or put it in a .env file next to docker-compose.yml
```

3. Start with Docker Compose:

```bash
docker compose up -d --build
```

Or locally:

```bash
npm install
DEEPGRAM_API_KEY=your_key npm start
```

If `DEEPGRAM_API_KEY` is unset, the assistant falls back to the browser’s built-in
SpeechRecognition (no key required). Check status at `/api/config`.
