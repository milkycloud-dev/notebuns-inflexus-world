# NoteBuns — Minecraft Server Website

A static landing page for the **NoteBuns** Minecraft survival server (Season 1, Version 1.21.1).

## Project Structure

```
├── index.html              — Main page (hero, features, launcher, agreement)
├── rules.html              — Server rules
├── team.html               — Project team
├── vtubers.html            — VTubers page
├── styles.css              — All website styles
├── script.js               — Logic: particles, tilt-cards, modals, Twitch integration
├── site-config.js          — Configuration for store URL and launcher paths
├── images/                 — VTuber avatars and backgrounds
├── downloads/              — Launcher files (place manually)
│   └── README.md           — File naming instructions
└── AGENTS.md               — Instructions for AI agents
```

## Quick Start

The website is fully static — no build, transpilation, or dependency installation is required. You only need an HTTP server.

### Linux

**Option 1 — Python (pre-installed almost everywhere):**

```bash
cd /path/to/project
python3 -m http.server 8000
```

Open in your browser: `http://localhost:8000`

**Option 2 — Node.js (npx serve):**

```bash
cd /path/to/project
npx serve -l 8000
```

**Option 3 — Nginx:**

```nginx
server {
    listen 80;
    server_name notebuns.ru;
    root /var/www/notebuns;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

```bash
sudo cp -r /path/to/project /var/www/notebuns
sudo systemctl reload nginx
```

### Windows

**Option 1 — Python:**

```cmd
cd C:\path\to\project
python -m http.server 8000
```

**Option 2 — Node.js:**

```cmd
cd C:\path\to\project
npx serve -l 8000
```

**Option 3 — XAMPP / Open Server:**

Copy the project files into the `htdocs` (XAMPP) or `domains/notebuns.local` (Open Server) folder and start the panel.

## Configuration

### Store Link

File `site-config.js`:

```js
window.NOTEBUNS_CONFIG = {
    externalStoreUrl: 'https://notebuns.easydonate.ru/',
    launcherWindowsPath: 'downloads/NoteBuns Launcher.exe',
    launcherLinuxPath: 'downloads/NoteBuns-Launcher-Linux.tar.gz'
};
```

- **externalStoreUrl** — Donation store URL. All "Store" and "Buy" buttons redirect here.
- **launcherWindowsPath / launcherLinuxPath** — relative paths to the launcher files.

### Launcher Files

Place the launcher files in the `downloads/` folder:

- `NoteBuns Launcher.exe` — Windows version
- `NoteBuns-Launcher-Linux.tar.gz` — Linux version

If file names differ, update the paths in `site-config.js`.

## Common Tasks

### Change Store Link

1. Open `site-config.js`.
2. Change the `externalStoreUrl` value.
3. All links on the site will update automatically via JavaScript.

### Add/Change Team Member

1. Open `team.html`.
2. Copy a `<div class="tilt-card team-member ...">` block and modify the data.
3. Avatars are loaded from `minotar.net` using the Minecraft nickname: `https://minotar.net/helm/NICKNAME/128.png`.

### Add New VTuber

1. Open `vtubers.html`.
2. Copy one of the `<a href="..." class="vtuber-card ...">` blocks.
3. Replace the Twitch channel link, avatar, and description.
4. Add an entry to the `streamers` array in `script.js` for stream integration.

### Change Rules

Open `rules.html` and edit the corresponding `<div class="rule-group">` block.

### Change Color Scheme

All colors are defined in CSS variables at the top of `styles.css`:

```css
:root {
    --primary: #FFAA00;       /* Primary (Gold) */
    --secondary: #AA00AA;     /* Secondary (Purple) */
    --accent: #55FF55;        /* Accent (Green) */
    --bg-dark: #050505;       /* Background */
    --text-main: #F3F4F6;     /* Main text */
    --text-muted: #9CA3AF;    /* Muted text */
}
```

## Technologies

- **HTML5** — Semantic markup
- **CSS3** — Flexbox, Grid, animations, glassmorphism
- **Vanilla JavaScript (ES6+)** — No frameworks or dependencies
- **Google Fonts** — Outfit and Inter fonts
- **Minotar.net** — Minecraft skin avatars
- **DecAPI** — Twitch integration (stream titles)

## External Dependencies (CDN/API)

| Service | Purpose | Required? |
|--------|-----------|-------------|
| Google Fonts | Outfit, Inter fonts | Yes (otherwise fallback sans-serif) |
| minotar.net | Minecraft avatars | Yes (for the team page) |
| decapi.me | Twitch API (stream titles) | No (VTubers work without it) |
| EasyDonate | Donation store | No (external link) |

## License

© 2026 NoteBuns / inflexus. **All Rights Reserved.**
Copying, distribution, or creation of derivative works without the explicit permission of the developers is prohibited.

Minecraft is a trademark of Mojang AB / Microsoft Corporation. The NoteBuns project is not affiliated with Mojang AB or Microsoft.
