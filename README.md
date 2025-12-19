# The Lounge – Custom Docker Image

This repository provides a modern, optimized **Docker image** for  
[tetrahydroc / TheLounge](https://github.com/tetrahydroc/thelounge), built using:

- **Multi‑stage Docker build** for a smaller runtime image
- Optional **nginx reverse proxy** with built‑in image upload support, defaults to enabled, docker-compose file needs to be adjusted if not wanted
- Optional **upload helper script** (`catbox` or `imgbb`), default to enabled, needs to be removed from `nginx.conf` if not used

This setup is ideal for self‑hosting The Lounge with clean separation between:

- TheLounge (Node.js app)
- Nginx (reverse proxy, WebSocket support, script injection)
- Optional upload helper script

---

## Features

- ✔ Much smaller final Docker image  
- ✔ WebSocket proxying through nginx  
- ✔ Easy imgbb/catbox upload integration  
- ✔ Clean container layout according to Docker best practices  
- ✔ Data persisted via volume at `/var/opt/thelounge`

---

## Repository Structure

```
.
├── thelounge-build
|   └── Dockerfile             # Multi‑stage image build
├── docker-compose.yml         # Orchestration for The Lounge + optional nginx
├── nginx/
│   └── nginx.conf             # Reverse proxy + upload script injector
|   └── uploadScript/
|   |   └── image-upload.js    # Upload helper script (imgbb/catbox)
```

---

## Quick Start (docker-compose)

Build the full stack:

```
docker compose build
```

Spin up the full stack:

```
docker compose up -d 
```

View logs:

```
docker compose logs -f
docker compose logs -f thelounge
docker compose logs -f nginx
```

By default, The Lounge will be available at:

```
http://localhost:9000/
```

Your persistent configuration and logs live at:

```
/var/opt/thelounge
```

Update theLounge `config.js` if using proxy

```
reverseProxy: true
```

---

## Docker Image

This repository builds a fully compliant Node 24 + Yarn 4 image.  
Key features:

- Uses **multi‑stage build**: dependencies installed in builder stage, runtime stays slim
- Yarn 4 configured to create `node_modules` (not PnP)
- Exposes port **9000**

Build locally:

```
docker compose build
```

Run:

```
docker compose up -d 
```

---

## Reverse Proxy Setup (nginx)

The repo includes an example nginx configuration for:

- Script injection  
- WebSocket proxying  
- catbox/imgbb upload support  

Example included in:

```
nginx/nginx.conf
```

---

## Upload Script Integration

The upload helper script lives at:

```
/nginx/uploadScript/image-upload.js
```

Nginx injects it automatically on every page load:

```
<script src="/image-upload.js?provider=imgbb&auth=apikey"></script>
```

Supported providers:

- `imgbb`
- `catbox`

To adjust provider/auth values, modify:

```
nginx/nginx.conf
```

---

## Configuration Directory

The Lounge stores persistent configuration in:

```
/var/opt/thelounge
```

Your compose file mounts it:

```
volumes:
  - ./data:/var/opt/thelounge
```

Inside you will find:

- `config.js`
- Logs

---

## Updating The Lounge

Since this build uses the master branch (or branch you specify):

```
docker compose pull
```
or

```
docker compose up -d --build
```

---

## Troubleshooting

### The Lounge won’t start
Run:

```
docker compose logs -f thelounge
```

---

## Why Nginx is Separate

The Lounge is a Node.js application.  
Nginx is a TLS/websocket proxy and static server.

Running both in the same container is an anti‑pattern:

- Larger image  
- Harder updates  
- Harder debugging  
- No process isolation  
- Cannot replace nginx with Caddy/Traefik/Cloudflare Tunnel later

With Docker Compose you keep everything modular and maintainable.

---

## License

This repository is MIT‑licensed.  
The Lounge is licensed under MIT by its original authors.

---

## Contributions

Open PRs or issues to:

- Improve the Dockerfile  
- Add nginx presets  
- Add more upload providers  
- Add health checks or CI/CD workflows  

Happy hosting!
