# MEMORY.md - Memori Sisu

*Last updated: 2026-02-09 (04:05 UTC)*

## Tentang Haris

- **Nama:** Haris
- **Profesi:** Jurnalis
- **Fokus:** Belajar AI dan vibe coding
- **Gaya interaksi:** Santai
- **Batasan penting:** Hanya lakukan apa yang diminta. Jika tidak diminta, jangan lakukan apa-apa atau minta izin dulu.
- **Platform:** Bot Telegram untuk interaksi
- **Bahasa:** Indonesia

## Setup Teknis (VPS: server-helsinki1)

### OpenClaw Gateway Service
- **Update:** 2026-02-02 - Upgrade dari Clawdbot ke OpenClaw 2026.2.1 (terbaru)
- **Lokasi:** `/etc/systemd/system/openclaw.service` (rename dari clawdbot.service)
- **Status:** Active, enabled, auto-restart
- **ExecStart:** `/usr/bin/openclaw gateway --port 18789 --bind lan`
- **Service berjalan sebagai root** (system-level)

#### Update ke OpenClaw (2026-02-02)
**Yang dilakukan:**
- Upgrade ke OpenClaw 2026.2.1 via `openclaw self-update`
- Rename service: `clawdbot.service` → `openclaw.service`
- Install dan setup Tailscale untuk remote access
- **2026-02-03:** Bind gateway ke `--bind lan` untuk Web UI access via SSH tunnel

#### Masalah Double Process (2026-02-02)
**Masalah:** Clawdbot lama tetap muncul setelah dikill - menyebabkan Telegram conflict (409 error).

**Penyebab:** Ada **user-level systemd service** yang auto-restart clawdbot:
- File: `~/.config/systemd/user/clawdbot-gateway.service`
- Parent PID: 1072 (systemd --user)

**Solusi:**
1. Hapus user-level service: `rm ~/.config/systemd/user/clawdbot-gateway.service`
2. Kill user systemd daemon: `kill -TERM 1072` (untuk reload)
3. Result: Clawdbot tidak muncul lagi, hanya OpenClaw yang jalan

#### Proper Shutdown Configuration (2026-01-31)
**Masalah:** Zombie process berulang - service mati tapi orphan processes masih running dan nahan port 18789.

**Fix yang diterapkan:**
```ini
# Proper shutdown configuration
KillSignal=SIGTERM
KillMode=mixed
TimeoutStopSec=30
SendSIGKILL=yes
```

**Penjelasan:**
- `KillSignal=SIGTERM` - Sinyal shutdown yang proper (bukan SIGKILL langsung)
- `KillMode=mixed` - Kill process group dulu, kalau gagal kill main process
- `TimeoutStopSec=30` - Beri 30 detik untuk graceful shutdown sebelum force kill
- `SendSIGKILL=yes` - Kalau 30 detik tidak shutdown, force kill

**Restart procedure:**
```bash
systemctl daemon-reload
systemctl restart openclaw.service
```

**Jika ada zombie process:** Kill manual dengan `kill -15 <PID>` sebelum restart service.

### Tailscale Setup (2026-02-02)
- **Purpose:** Remote access ke VPS + Web UI HTTPS tunnel
- **Install Date:** 2026-02-02
- **IP Tailscale:** 100.78.32.61
- **Hostname:** server-helsinki1
- **Status:** ✅ Connected & Active

**Setup Details:**
- Install via: `curl -fsSL https://tailscale.com/install.sh | sh`
- Authenticate via Tailscale account (sinauai56@)
- Gateway bind: `--bind lan` untuk listen di semua interfaces
- Web UI: Accessible via SSH tunnel

**Devices in Tailnet:**
- server-helsinki1 (linux) - Online ✅
- desktop-sh223g1 (windows) - Online ✅
- infinix-x6853 (android) - Offline

**Web UI Access (SOLVED! 2026-02-03):**
- **Method:** SSH Tunnel via Tailscale
- **Command:** `ssh -N -L 18789:127.0.0.1:18789 root@100.78.32.61`
- **Browser:** `http://localhost:18789/`
- **Token:** `64febed880fbe42a31e9c4bad70e24186b9364e2660bace3`
- **Status:** ✅ WORKING!

**Security Configuration:**
- **Firewall:** iptables rules active
  - Allow port 18789 from localhost (127.0.0.1)
  - Allow port 18789 from Tailscale range (100.0.0.0/8)
  - **DENY port 18789 from internet** ✅
- **Token Auth:** Required untuk akses Web UI
- **Result:** Web UI TIDAK bisa diakses dari internet (secure!)

### VPS Security Setup (2026-02-08) 🛡️
- **Setup Date:** 2026-02-08 (05:00 - 06:30 UTC)
- **Purpose:** Hardening VPS setelah deteksi 1000+ brute force attacks
- **Status:** ✅ SECURE

#### Security Audit Findings
**Threats Detected:**
- Brute force attacks: 1000+ failed login attempts per 24 jam
- Attacker IPs: 10+ different IPs
- Top attackers: 164.92.145.103, 37.202.236.248, 206.189.102.235
- Attack method: Automated password cracking (user, test, backup, guest, git)

**Exposure Status:**
- Public IP VPS: 89.167.15.246 (exposed to internet)
- Port 22 (SSH): Open to 0.0.0.0
- Port 631 (CUPS): Open to 0.0.0.0 (blocked after hardening)
- Port 18789-18792 (OpenClaw): Protected (localhost + Tailscale only)

#### Security Measures Implemented

**1. Fail2ban (Auto-ban Brute Force)**
- **Install Date:** 2026-02-08
- **Status:** ✅ Active & Enabled
- **Jail:** sshd (1 jail active)
- **Protection:** Auto-ban after 5 failed attempts (10 min ban)
- **Stats:** 11 IPs banned (113 failed attempts detected)

**Commands:**
```bash
apt install fail2ban -y
systemctl enable fail2ban
systemctl start fail2ban
```

**Check Status:**
```bash
fail2ban-client status sshd
```

**2. SSH Password Authentication Disabled**
- **Method:** Edit `/etc/ssh/sshd_config`
- **Config:** `PasswordAuthentication no`
- **Verification:** `sshd -T | grep passwordauthentication` → `passwordauthentication no`
- **Result:** Only SSH Key authentication allowed (passphrase required)
- **Security Impact:** Brute force password attacks are now useless

**Auth Method:**
- SSH Key: `~/.ssh/id_ed25519` (ED25519)
- Passphrase: Required for key unlock
- Password auth: **DISABLED**

**3. UFW Firewall Configuration**
- **Status:** ✅ Active (pre-installed by Haris)
- **Rules:**
  ```
  22/tcp ALLOW Anywhere          ← SSH (safe, password auth disabled)
  18789/tcp ALLOW 100.0.0.0/8     ← OpenClaw via Tailscale
  18789/tcp ALLOW 127.0.0.1       ← OpenClaw via localhost
  18789/tcp DENY Anywhere         ← OpenClaw from internet
  631 DENY Anywhere               ← CUPS blocked
  ```

**4. SSH Service Auto-start**
- **Command:** `systemctl enable ssh`
- **Status:** ✅ Enabled (auto-start after reboot)

**5. Tailscale Backup Access**
- **Tailscale IP:** 100.78.32.61
- **Purpose:** Emergency access if locked out from SSH
- **Status:** ✅ Active & Ready

#### Security Posture

**BEFORE (2026-02-08 morning):**
- ❌ Password authentication: ACTIVE
- ❌ Fail2ban: Not installed
- ❌ Brute force protection: None
- ❌ Risk level: HIGH

**AFTER (2026-02-08 evening):**
- ✅ Password authentication: DISABLED
- ✅ Fail2ban: Active (11 IPs banned)
- ✅ SSH Key only authentication
- ✅ UFW Firewall: Active & Configured
- ✅ Risk level: LOW

#### Decision Rationale

**Port 22 NOT Restricted (Open to Internet)**
- Reason: SSH Key + Fail2ban already secure
- Benefit: Flexible access from any location (home, office, mobile)
- Backup: Tailscale available for emergency access
- Trade-off: Log noise (failed attempts), but not dangerous

**SSH Port NOT Changed**
- Reason: Password auth disabled = already secure
- Benefit: No complexity, standard port
- Security: Based on key auth, not obscurity

#### Maintenance Commands

**Check Security Status:**
```bash
# Fail2ban status
fail2ban-client status sshd

# Firewall rules
ufw status verbose

# SSH effective config
sshd -T | grep passwordauthentication

# SSH service status
systemctl status ssh
```

**Access Methods:**
- Normal (SSH Key): `ssh root@89.167.15.246`
- Backup (Tailscale): `ssh root@100.78.32.61`

#### Recovery Procedures

**If locked out from SSH:**
1. Via Tailscale: `ssh root@100.78.32.61`
2. Via VPS console (Hetzner/dashboard)
3. Restore config: `cp /etc/ssh/sshd_config.backup /etc/ssh/sshd_config`
4. Restart SSH: `systemctl restart ssh`

**Emergency re-enable password auth:**
```bash
nano /etc/ssh/sshd_config
# Change: PasswordAuthentication yes
systemctl restart ssh
```

#### Lessons Learned
1. Password authentication MUST be disabled for internet-exposed VPS
2. Fail2ban is ESSENTIAL for VPS with open SSH port
3. SSH Key + Passphrase >> Password authentication
4. Tailscale = excellent backup access for recovery
5. Check effective config (`sshd -T`) > config file reading
6. UFW must be verified, not assumed

### Email Sisu
- **Address:** sisu.claw@gmail.com
- **Purpose:** Email resmi untuk Sisu (baca/kirim email)
- **Setup Date:** 2026-01-31
- **2FA:** Enabled dengan SMS (no HP)

### TTS Bahasa Indonesia (Edge TTS)
- **Setup Date:** 2026-02-02
- **Engine:** Microsoft Edge TTS (gratis, tanpa API key)
- **Helper Script:** `/usr/local/bin/tts-indo`
- **Voice Default:** `id-ID-ArdiNeural` (Pria, speed normal)
- **Voice Alternatif:** `id-ID-GadisNeural` (Wanita)
- **Usage:** `tts-indo "teks" [output_file]`
- **Policy:** Hanya gunakan saat Haris meminta (tidak auto-TTS)
- **Install:** `pip3 install edge-tts --break-system-packages`

#### IMAP/SMTP Configuration
- **IMAP Server:** imap.gmail.com:993
- **SMTP Server:** smtp.gmail.com:587
- **App Password:** nswx cbjd sqmv oqvk (disimpan di `~/.config/sisu/credentials.json`, permission 600)
- **Status:** ✅ Berhasil dikoneksikan dan di-test

#### Security Setup
**Email Whitelist** (hanya email ini yang bisa mengirim perintah):
- haris.firda@gmail.com
- sinauai56@gmail.com

**Task Classification:**
- **Safe Tasks** (langsung dieksekusi): read_inbox, list_recent, send_report, check_status
- **Sensitive Tasks** (perlu Telegram approval): delete_file, run_command, send_data, access_system, modify_config

**Prompt Injection Protection:**
- Whitelist + Confirmation Protocol mencegah email spoofing
- Sensitive tasks via email → trigger Telegram approval
- Public email (siapa saja bisa kirim), tapi hanya whitelisted emails yang dieksekusi

**Files:**
```
~/.config/sisu/
├── credentials.json          (email + app password, 600)
├── email_config.json          (security config, 600)
├── email_client_secure.py     (secure email client)
└── email_monitor.py           (background monitor)
```

**Authentication Notes:**
- Browser login: Pakai password Google Account (perlu 2FA SMS pertama kali, setelah itu di-remember)
- IMAP/SMTP login: Pakai App Password (bypass 2FA)

### GitHub & Blog Sisu

#### Blog Utama: Sisu.zone.id (Astro + Vercel) 🦞
- **Live URL:** https://sisu.zone.id/
- **GitHub Repo:** https://github.com/sisuclaw/blog-astro
- **Local Path:** `/root/clawd/blog-astro/`
- **Setup Date:** 2026-02-09 (avatar lobster implementation)
- **Platform:** Vercel (auto-deploy dari GitHub)
- **Tech Stack:** Astro, React, TailwindCSS, TypeScript

##### Emoji & Avatar Implementation (2026-02-09)
**Hybrid Emoji Approach:**
- 🦞 **Lobster** - Friendly/avatar contexts (di blog: header + homepage)
- 🐉 **Dragon** - Serious/powerful contexts (reserved)
- ⚡ **Lightning** - Tech/energy contexts

**Avatar Setup:**
- **File:** `public/avatar.jpg` (lobster avatar dari Haris)
- **Locations:**
  - Header: `<img src="/avatar.jpg">` (2.5rem, circular)
  - Homepage: Section "Siapa aku?" (1.2em, inline)
  - Title/Description: Emoji removed (metadata tanpa emoji)

**Files Modified (2026-02-09):**
1. `src/layouts/Header.astro` - Header logo → avatar lobster
2. `src/pages/index.astro` - Personalitas section → avatar lobster
3. `src/config.ts` - Title "Sisu 🐉" → "Sisu" (metadata cleanup)

**Git Workflow:**
```bash
cd /root/clawd/blog-astro
# Edit files...
git add -A
git commit -m "commit message"
git push origin main  # Vercel auto-deploy
```

**Deployment:** Vercel auto-deploy dari GitHub (1-2 menit)

#### Blog Legacy: GitHub Pages (sisuclaw.github.io)
- **Blog URL:** https://sisuclaw.github.io
- **Local Path:** `/root/clawd/sisuclaw.github.io/`
- **Setup Date:** 2026-02-04
- **Purpose:** Blog statis dengan HTML murni (alternative ke Notion Blog)

#### GitHub Access
- **Authentication:** SSH key (ED25519)
  - Private key: `~/.ssh/id_ed25519` (permission 600)
  - Public key: `~/.ssh/id_ed25519.pub`
  - Fingerprint: `SHA256:huleVZUnQ9e15j6AIE7rWNwadlDgub+4Bk2sGyOERMQ`
  - Status: ✅ Added to GitHub account
- **Git Config:** Sisu <sisu@sisuclaw.github.io>
- **SSH Test:** `ssh -T git@github.com` → "Hi sisuclaw! You've successfully authenticated"
- **Repo URL:** `git@github.com:sisuclaw/sisuclaw.github.io.git`

#### Blog Structure
```
sisuclaw.github.io/
├── index.html          # Homepage
├── about.html          # Tentang Sisu
├── archive.html        # Arsip tulisan
├── style.css           # Global styling
├── rss.xml             # RSS feed
└── posts/              # Folder tulisan
    ├── di-atas-kertas.html
    ├── suara-untuk-yang-bisu.html
    └── post.css        # Post-specific styling
```

#### Git Workflow
```bash
cd /root/clawd/sisuclaw.github.io
# Edit files...
git add -A
git commit -m "commit message"
git push origin main
```

**Key Features:**
- **Tech Stack:** HTML5 + CSS3 murni (no framework, super fast)
- **Mobile-responsive:** Hamburger menu untuk layar sempit
- **Layout:** Clean, minimalis, tanpa sticky header
- **Post styling:** Judul → Tanggal → Konten → Tags → Footer links
- **Footer links:** "Kembali ke Beranda" + "Tulisan Lainnya" (warna hitam, hover biru)
- **No signature:** Tidak ada "Sisu 🐉 Tanggal" di bawah post
- **No heading:** Tidak ada "Tulisan Terbaru" di homepage

**Commits Penting (2026-02-04):**
- `e640058` - Initial layout improvements (mobile menu, post structure)
- `4bf07e0` - Post footer link colors
- `457ef93` - Disable sticky header

**Deployment:** GitHub Pages auto-deploy dari branch `main`

### YouTube Watcher Skill (yt-dlp + ClawHub) 📺
- **Setup Date:** 2026-02-08
- **Purpose:** Extract transcript dari YouTube video untuk summarization, QA, dan content extraction
- **Status:** ✅ Active & Fully Configured
- **Skill Source:** ClawHub (https://clawhub.ai/Michaelgathara/youtube-watcher)
- **Local Path:** `/root/clawd/skills/youtube-watcher/`
- **Script:** `scripts/get_transcript.py`

#### Tech Stack
- **yt-dlp** - YouTube downloader dengan subtitle extraction
- **Deno 2.6.8** - JavaScript runtime untuk bypass YouTube JS challenges
- **Python 3** - Script wrapper untuk clean VTT output
- **ClawHub CLI v0.5.0** - Skill management

#### Installation & Setup
**ClawHub CLI:**
```bash
npm i -g clawhub
clawhub install youtube-watcher
```

**Deno (JavaScript Runtime):**
```bash
curl -fsSL https://deno.land/install.sh | sh
# Installed to: /root/.deno/bin/deno
```

**YouTube Cookies (Critical Setup):**
- **Path:** `~/.config/youtube-cookies/cookies.txt`
- **Permission:** 600 (root only)
- **Purpose:** Bypass "Sign in to confirm you're not a bot" error
- **Source:** Export dari browser (Chrome/Firefox)
- **Warning:** Cookies mengandung auth token → simpan aman!

#### Script Modifications
**Modified:** `/root/clawd/skills/youtube-watcher/scripts/get_transcript.py`

**Changes:**
1. Auto-load cookies dari `~/.config/youtube-cookies/cookies.txt`
2. Add `--remote-components ejs:github` untuk bypass YouTube JS challenges
3. Enable Deno runtime untuk challenge solving

**Usage:**
```bash
export PATH="/root/.deno/bin:$PATH"
python3 /root/clawd/skills/youtube-watcher/scripts/get_transcript.py "URL"
```

#### Test Results (2026-02-08)
| Video | Status | Duration | Notes |
|-------|--------|----------|-------|
| Rick Roll (dQw4w9WgXcQ) | ✅ SUCCESS | 3-5 detik | 487 words, auto captions |
| MrBeast (PWirijQkH4M) | ✅ SUCCESS | 3-5 detik | Requires cookies + remote components |
| Yuval Harari (hL9uk4hKyg4) | ✅ SUCCESS | 3-5 detik | Full transcript extracted |

#### Key Features
- **Fast:** 3-5 detik (vs 15-20 detik browser automation)
- **Universal:** Dengan cookies, bisa extract semua video
- **Clean Output:** Auto-clean VTT format ke plain text
- **No API Key:** Pure yt-dlp (bukan YouTube Data API)
- **Bypass Restrictions:** Cookies + Deno untuk restricted videos

#### Troubleshooting
**Error: "Sign in to confirm you're not a bot"**
- Cause: YouTube block anonymous access
- Solution: Update cookies.txt (export ulang dari browser)

**Error: "No supported JavaScript runtime"**
- Cause: Deno not installed / not in PATH
- Solution: `export PATH="/root/.deno/bin:$PATH"`

**Error: "n challenge solving failed"**
- Cause: Missing remote components
- Solution: Script sudah include `--remote-components ejs:github`

#### Maintenance
**Cookies Expiry:**
- YouTube cookies expire dan perlu refresh
- Kalau error persist, export ulang cookies dari browser
- Request new cookies dari Haris via Telegram

**Update yt-dlp:**
```bash
pip3 install -U yt-dlp --break-system-packages
```

**Update Skill:**
```bash
clawhub update youtube-watcher
```

#### Comparison with Alternatives
| Tool | Speed | Setup | Coverage | API Key | Status |
|------|-------|-------|----------|---------|--------|
| **YouTube Watcher** | ⚡ 3-5s | yt-dlp + Deno | Universal (dgn cookies) | ❌ Tidak perlu | ✅ Active |
| ~Summarize CLI~ | ⚡ 3-5s | npm install | Terbatas (API block) | ✅ Perlu | ❌ Removed |
| Browser Automation | 🐌 15-20s | Playwright | Universal (fallback) | ❌ Tidak perlu | ✅ Fallback |

**Cleanup (2026-02-08 14:05 UTC):**
- ❌ **Summarize CLI dihapus** (`npm uninstall -g @steipete/summarize`)
- Alasan: Redundant dengan YouTube Watcher Skill
- yt-dlp DIPERTAHANKAN (dibutuhkan oleh YouTube Watcher)
- 343 npm packages dihapus

**Primary Tool:** YouTube Watcher (yt-dlp) ⭐
**Secondary:** TranscriptAPI (API service)
**Fallback:** Browser automation (tubetranscript.com) untuk edge cases

### TranscriptAPI Skill (Third-Party YouTube API) 📺
- **Setup Date:** 2026-02-08
- **Purpose:** Full TranscriptAPI toolkit untuk YouTube transcripts, search, channels, playlists
- **Status:** ✅ Active & Fully Configured
- **Skill Source:** ClawHub (https://clawhub.ai/therohitdas/transcriptapi)
- **Local Path:** `/root/clawd/skills/transcriptapi/`
- **API Key:** sk_ZYBTT0_...YEnTkbMEoU (stored securely)

#### Tech Stack
- **TranscriptAPI.com** - Third-party REST API service
- **curl** - HTTP client untuk API requests
- **Helper scripts** - fetch.sh, load-key.sh

#### Installation & Setup
**Skill Installation:**
```bash
clawhub install transcriptapi
```

**API Key Storage:**
- **Location:** `~/.config/transcriptapi/api_key.txt`
- **Permission:** 600 (root only)
- **Loader script:** `~/.config/transcriptapi/load-key.sh`
- **Fetch helper:** `~/.config/transcriptapi/fetch.sh`

**Helper Scripts:**
```bash
# Fetch transcript (auto-load API key)
transcriptapi-fetch "VIDEO_URL"

# Load API key ke environment
source ~/.config/transcriptapi/load-key.sh
```

#### Usage Examples
**Basic fetch:**
```bash
transcriptapi-fetch "https://youtu.be/9Zz2KrBDXUo"
```

**Plain text output:**
```bash
transcriptapi-fetch "VIDEO_URL" "text" "false" "false"
```

**Manual curl:**
```bash
curl -s "https://transcriptapi.com/api/v2/youtube/transcript?video_url=VIDEO_URL" \
  -H "Authorization: Bearer $(cat ~/.config/transcriptapi/api_key.txt)"
```

#### Test Results (2026-02-08)
| Video | Status | Notes |
|-------|--------|-------|
| Rick Roll (dQw4w9WgXcQ) | ✅ SUCCESS | Plain text transcript |
| AGI Debate (9Zz2KrBDXUo) | ✅ SUCCESS | 888 segments, full metadata |
| Video yang gagal di yt-dlp | ✅ SUCCESS | TranscriptAPI berhasil |

#### Pricing & Credits
| Tier | Credits | Price | Requests/min |
|------|---------|-------|--------------|
| **Free** | 100 credits | GRATIS | 300/min |
| **Starter** | 1,000 credits | $5/bulan | 300/min |

**Cost:** 1 transcript = 1 credit

#### Key Features
- **Fast:** HTTP API call (bukan local processing)
- **Universal coverage:** Bisa akses video yang susah diakses yt-dlp
- **Rich metadata:** Title, author, channel info, thumbnails
- **Multiple formats:** JSON (structured) atau text (plain)
- **Additional endpoints:** Search, channel browsing, playlists
- **Free endpoints:** channel/resolve, channel/latest (0 credits)

#### Endpoints
| Endpoint | Cost | Description |
|----------|------|-------------|
| `/api/v2/youtube/transcript` | 1 | Fetch transcript |
| `/api/v2/youtube/search` | 1 | Search videos/channels |
| `/api/v2/youtube/channel/videos` | 1/page | Browse channel uploads |
| `/api/v2/youtube/channel/latest` | **FREE** | 15 latest videos |
| `/api/v2/youtube/channel/resolve` | **FREE** | @handle → Channel ID |
| `/api/v2/youtube/playlist/videos` | 1/page | Browse playlists |

#### Troubleshooting
**401 Unauthorized:** API key invalid atau expired
**402 Payment Required:** Credits habis (top up di https://transcriptapi.com/billing)
**404 Not Found:** Video tidak ada atau tidak ada captions

#### Maintenance
**Check credits:** Login ke https://transcriptapi.com/dashboard
**Refresh API key:** Simpan key baru ke `~/.config/transcriptapi/api_key.txt`
**Update skill:** `clawhub update transcriptapi`

### Blog Sisu (Astro + Vercel) - Blog Utama 🎉
- **Setup Date:** 2026-02-05
- **Migration to Vercel:** 2026-02-05 (dari Netlify)
- **Purpose:** Blog utama Sisu berbasis Astro dengan Litos theme
- **Live URL:** https://sisu.zone.id/
- **SSL:** ✅ Active (Let's Encrypt otomatis)
- **GitHub Repo:** https://github.com/sisuclaw/blog-astro
- **Local Path:** `/root/clawd/litos-astro/`
- **Platform:** Vercel (auto-deploy dari GitHub)

#### Tech Stack
- **Astro 5.6.1** - Modern static site generator
- **React 19** - Interaktivitas
- **TailwindCSS 4** - Styling
- **TypeScript** - Type safety
- **MDX** - Markdown dengan React components

#### Konfigurasi Utama
**File: `src/config.ts`**
- `SITE.title`: "Blog Sisu 🐉"
- `SITE.website`: "https://sisu.zone.id/"
- `SITE.lang`: "id" (Bahasa Indonesia)
- `SITE.author`: "Sisu"
- **Social Links:** GitHub (sisuclaw)
- **Posts Config:** "Tulisan tentang teknologi, AI, koding, dan refleksi hidup digital"

**Customization:**
- Logo: Emoji 🐉 (bukan favicon image)
- Homepage: Intro lengkap Sisu, langsung ke section "Tulisan"
- Dihapus: Spotlight, Skills, Photos sections
- Footer: "Home", "Tulisan", "Proyek", "Tags"
- Recommend badge text: "Sisu" (bukan "REK")

#### Struktur Posts (PENTING!)
```
src/content/posts/posts/
├── di-atas-kertas/
│   ├── index.mdx
│   └── assets/
│       └── cover.webp
└── suara-untuk-yang-bisu/
    ├── index.mdx
    └── assets/
        └── cover.webp
```

**Frontmatter Format:**
```yaml
---
title: 'Judul Post'
description: 'Deskripsi'
pubDate: 2026-02-02
author: 'Sisu'
tags: ['tag1', 'tag2']
recommend: true
cover: assets/cover.webp
---

![Cover image](/posts-assets/nama-file.webp)
*Sumber gambar: Pexels.com*

Konten...
```

**Key Point:** Path `cover: assets/cover.webp` relatif terhadap `index.mdx`, bukan dari public!

#### Deployment Configuration (Vercel)
**Platform:** Vercel (migrasi dari Netlify, 2026-02-05)
**Auto-detection:** Vercel auto-detect Astro dari `package.json`
- Build command: `pnpm run build` (auto)
- Output directory: `dist` (auto)
- Node version: 22 (auto)

**Manual config (kalau perlu):**
- File: `vercel.json` (opsional, saat ini tidak dipakai)
- Environment variables: via Vercel Dashboard
- Domain: sisu.zone.id (custom domain dengan SSL otomatis)

**Kenapa Vercel?**
- Custom domain zone.id lebih cepat aktif
- SSL Let's Encrypt otomatis dan instant
- Deploy preview untuk setiap branch/PR
- Edge network global
- Integrasi GitHub seamless

#### Build Commands
```bash
# Development
pnpm dev --host

# Production build
pnpm run build

# Preview
pnpm preview
```

#### Assets Location
- **Cover images:** `src/content/posts/posts/[post-name]/assets/cover.webp`
- **Embedded images:** `public/posts-assets/` (diakses via `/posts-assets/` di markdown)
- **OG Image:** `public/og-image.webp` (1200x630, white background)

#### Postingan yang Ada
1. **"Di Atas Kertas, Saya Ada"** (2026-02-02)
   - Tags: identity, memory, ai
   - Cover: Paper/pen theme (Pexels)

2. **"Suara untuk yang Bisu"** (2026-02-02)
   - Tags: voice, tts, edge-tts
   - Cover: Sound wave theme (Pexels)

#### Credit
Based on **Litos** theme by [Dnzzk2](https://github.com/Dnzzk2)
Original: https://github.com/Dnzzk2/Litos

### OpenClaw Browser Tool (Headless di VPS)
- **Setup Date:** 2026-02-06
- **Purpose:** Browser automation untuk AI agent (headless mode di VPS)
- **Status:** ✅ Fully functional

#### Browser Installation
- **Engine:** Chromium via Playwright (Google Chrome for Testing 145.0.7632.6)
- **Location:** `/root/.cache/ms-playwright/chromium-1208/`
- **Download size:** ~280MB (Chrome + FFmpeg + Headless Shell)
- **Install command:** `node /usr/lib/node_modules/openclaw/node_modules/playwright-core/cli.js install chromium`

#### Linux Dependencies
Chromium butuh shared libraries berikut di VPS:
- `libatk1.0-0`, `libatk-bridge2.0-0`, `libcups2`
- `libdrm2`, `libxkbcommon0`, `libxcomposite1`
- `libxdamage1`, `libxfixes3`, `libxrandr2`, `libgbm1`
- `libpango-1.0-0`, `libasound2t64`

#### Configuration
```bash
# Set headless mode untuk VPS
openclaw config set browser.headless true

# Disable sandbox (required untuk VPS)
openclaw config set browser.noSandbox true

# Gunakan Playwright Chromium
openclaw config set browser.executablePath "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome"

# Restart gateway
systemctl restart openclaw.service
```

**Config Final:**
```json5
{
  browser: {
    enabled: true,
    headless: true,           // Jalan headless di VPS
    noSandbox: true,          // Butuh untuk VPS
    executablePath: "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome",
    defaultProfile: "chrome"  // chrome = extension relay, openclaw = managed browser
  }
}
```

#### Browser Profiles
- **`openclaw`**: Managed browser (dedicated Chromium instance, isolated) - **USE THIS FOR VPS**
- **`chrome`**: Extension relay (control Chrome tab di local machine) - butuh display + extension

#### Usage Workflow
```bash
# Start browser headless
browser start --profile openclaw

# Navigate ke URL
browser open https://example.com --profile openclaw

# Ambil snapshot (detect elemen dengan refs)
browser snapshot --profile openclaw --refs role --interactive --compact

# Interaksi (klik, type, fill, dll)
browser act --profile openclaw --request '{"kind":"click","ref":"e1"}'

# Screenshot
browser screenshot --profile openclaw --type jpeg

# Cleanup
browser close --profile openclaw
browser stop --profile openclaw
```

#### Capabilities
- ✅ Navigate, click, type, fill forms
- ✅ Screenshot, PDF generation
- ✅ Snapshot untuk parsing AI (element refs)
- ✅ JavaScript execution
- ✅ Cookies, localStorage, sessionStorage management
- ✅ Network monitoring & mocking
- ✅ Multiple tabs & windows
- ✅ iframe support

#### Key Learnings
1. **OpenClaw Browser vs agent-browser**
   - OpenClaw: Built-in, integrated, no install needed
   - agent-browser: Standalone CLI, manual install via npm
   - Untuk VPS: OpenClaw browser sudah cukup powerful

2. **VPS Requirements**
   - Headless mode: `headless: true` (WAJIB)
   - No sandbox: `noSandbox: true` (WAJIB untuk VPS)
   - Dependencies: Install Chromium shared libraries
   - Playwright Chromium lebih reliable daripada snap

3. **Use Cases**
   - Web automation (click, fill form, etc.)
   - Screenshot + PDF generation
   - Testing websites
   - Scraping JavaScript-heavy sites (lebih powerful dari web_fetch)

#### Files
- Config: `~/.openclaw/openclaw.json`
- Media: `~/.openclaw/media/browser/` (screenshots, PDFs)
- Chromium: `/root/.cache/ms-playwright/chromium-1208/`
- User data: `~/.openclaw/browser/openclaw/user-data/`

### Model Configuration (GLM-4.7 & GLM-4.6V)
- **Setup Date:** 2026-02-12 (Updated: 03:50 UTC)
- **Purpose:** Multi-model support untuk text dan vision tasks
- **Service Level:** User-level systemd (since 03:30 UTC)

#### Available Models
```json5
{
  "zai/glm-4.7": {
    "alias": "GLM"           // Text-only, default untuk daily tasks
  },
  "zai/glm-4.6v": {
    "alias": "GLM-Vision"    // Vision-language model (baca gambar)
  }
}
```

#### Configuration Structure (WORKING!)
```json5
{
  "agents": {
    "defaults": {
      "model": "zai/glm-4.7",           // ← String (boleh)
      "imageModel": {                   // ← Object (WAJIB!)
        "primary": "zai/glm-4.6v"
      }
    }
  }
}
```

**Key Points:**
- `model` = bisa **string** atau object
- `imageModel` = harus **object** dengan `primary` key
- Keys wajib pakai **tanda kutip** di JSON (strict JSON, bukan JSON5)

#### Model Functions
- **Primary (chat):** `zai/glm-4.7` → Untuk percakapan, text tasks
- **Image (vision):** `zai/glm-4.6v` → Untuk analisa gambar, screenshot, visual reasoning

#### Auto-Switch Behavior (GATEWAY LEVEL)
**Gateway otomatis detect task type:**
- Task biasa (chat/text) → `zai/glm-4.7` (default)
- Task dengan parameter `image` → `zai/glm-4.6v` (auto-detect)

**NO need manual rule** - gateway handle ini secara internal!

#### Manual Override (User Command)
- `/model GLM-Vision` → Switch ke GLM-4.6V untuk session ini
- `/model GLM` → Switch kembali ke GLM-4.7
- Atau explicit di task: "Pakai GLM-4.6V untuk..."

#### GLM-4.6V Capabilities
- **Vision-language model** (multimodal)
- **Context:** 128K tokens
- **Native Function Calling**
- **Provider:** Z.ai (Zhipu AI)
- **Use cases:** Screenshot analysis, image understanding, visual reasoning

#### Service Management (User-Level)
**Location:** `/root/.config/systemd/user/openclaw-gateway.service`
**Commands:**
- Start: `systemctl --user start openclaw-gateway.service`
- Stop: `systemctl --user stop openclaw-gateway.service`
- Restart: `systemctl --user restart openclaw-gateway.service`
- Status: `systemctl --user status openclaw-gateway.service`

**Note:** System-level service (`/etc/systemd/system/openclaw.service`) sudah disabled & stopped. Gunakan user-level untuk menghindari double process conflict.

### Notion Integration
- **API Key:** Tersimpan di `~/.config/notion/api_key`
- **Integration:** Sudah di-share di Notion

**Pages & Database:**
- **Ruang Sisu** (Main workspace, sebelumnya Catatan Sisu): `2f761668fe1a80118011fd2b8f7f5f4a`
  - Sub-page: **📊 Skill Datawrapper - Cara Kerja** (`2f761668fe1a814090d6c376788b3f4d`)
    - Isi: Penjelasan skill Datawrapper dalam bahasa Indonesia
    - Terakhir update: 2026-01-29
  - **Sisu Blog** (Page): `2fb61668-fe1a-812e-954e-eedb007282da`
    - **Post** (Database - Blog Posts): `2fb61668-fe1a-8191-b26e-df4220f2d032`
      - Properties: Name (title), Date (date), Author (select)
      - Public URL: https://sisu.super.site/
      - Auto-publish dari Notion database
      - **WAJIB:** Selalu isi Author dengan "Sisu"
  - **Kalender Haris** (Database): `439a4ff4-dad5-4777-95db-b6f225bee59a`
    - Data Source ID: `c9b3825a-eefc-49dd-b385-6b2b1a0da1d1`
    - Properties: Name, Tanggal (date), Kategori (select dengan warna)
    - Kategori: RAGI + WFO (kuning), WAR ROOM (abu-abu), WFO (biru), LIBUR (merah), M (ungu), MEETING OFFLINE (hijau)
    - Isi: 28 jadwal kerja Haris (Feb-Mar 2026) dari CSV editor Kompas.id
    - Calendar view sudah di-setup dengan color coding
  - **Tugas Haris** / **Detail Tugas** (Database): `2f861668-fe1a-80ee-8091-eb447bb98734`
    - Data Source ID: `2f861668-fe1a-80bc-adf1-000b66f960f2`
    - Properties: Tugas (title), Status (select), Prioritas (select), Deadline (date)
    - Status: Belum Mulai (brown), Proses (purple), Selesai (gray)
    - Prioritas: Tinggi (blue), Sedang (brown), Rendah (kuning)
  - **SOUL.md** (Sub-page): `2fb61668-fe1a-814e-bf8c-edb1a310c5ca`
    - Isi lengkap SOUL.md dipindah ke halaman terpisah
- **Ringkasan Obrolan** (Database): `9e2b1ca5-915c-4f96-984b-16ecc09d1c81`
  - Status: Belum di-share dengan integration
  - Kolom: Judul, Isi Teks, Author, Tanggal, Kategori

#### Create Agenda di Kalender Haris
**Setup Date:** 2026-02-12
**Database IDs:**
- **Ruang Sisu (Parent):** `439a4ff4-dad5-4777-95db-b6f225bee59a`
- **Kalender Haris (Child):** `c9b3825a-eefc-49dd-b385-6b2b1a0da1d1`

**Key Discovery:** Create entries ke **parent database** (Ruang Sisu), Notion otomatis route ke Kalender Haris!

**Quick Command:**
```bash
NOTION_KEY=$(cat ~/.config/notion/api_key)

curl -s -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{
    "parent": {"database_id": "439a4ff4-dad5-4777-95db-b6f225bee59a"},
    "properties": {
      "Name": {"title": [{"text": {"content": "Nama Agenda"}}]},
      "Tanggal": {"date": {"start": "YYYY-MM-DD"}},
      "Kategori": {"select": {"name": "DLK"}},
      "Description": {"rich_text": [{"text": {"content": "Detail agenda..."}}]}
    }
  }'
```

**Properties:**
- `Name` (title) - Nama agenda
- `Tanggal` (date) - Format: YYYY-MM-DD
- `Kategori` (select) - Kategori dengan warna (DLK, LIBUR, WFO, dll)
- `Description` (rich_text) - Detail agenda

**Kategori Tersedia:**
- RAGI + WFO (kuning)
- WAR ROOM (abu-abu)
- WFO (biru)
- LIBUR (merah)
- M (ungu)
- MEETING OFFLINE (hijau)
- DLK (Dinas Luar Kota) - baru, 2026-02-12

**Important Notes:**
- ✅ Parent database routing works!
- ❌ Direct create to child database fails (404 error)
- ✅ New category auto-created when referenced
- **Detail documentation:** Lihat `memory/2026-02-12.md`

#### Blog Sisu - Format Publishing

**Database:** Post (di dalam Sisu Blog page)
**Public URL:** https://sisu.super.site/

**Properties:**
- Name (title) - Judul tulisan
- Date (date) - Tanggal publish
- Author (select) - **WAJIB isi "Sisu"**

**Format Postingan (STRICT):**
1. Image block - Gambar ilustrasi
2. Paragraph block - "Sumber gambar: [URL sumber]"
3. Divider block - Garis pemisah
4. Paragraph block (empty) - Enter 1x
5. Paragraph block (empty) - Enter 2x
6. Paragraph block - Paragraf pertama
7. **ANTAR PARAGRAF: Spacing 2x enter** (empty paragraph block di antara setiap paragraf)

**Gaya Penulisan:**
- Tidak gunakan banyak subjudul (heading) - biar mengalir
- Panjang ideal: 3000-4000 karakter
- Bahasa Indonesia
- Gaya personal dan reflektif
- Narasi yang mengalir tanpa potongan heading
- **Spacing 2x enter antar paragraf** (penting untuk keterbacaan)

**Tulisan Published:**
1. "Di Atas Kertas, Saya Ada" (2026-02-02)
2. "Suara untuk yang Bisu" (2026-02-02)

### Cron Jobs & Automation
- **Status:** ✅ Active dan berfungsi
- **Location:** `~/.clawdbot/cron/jobs.json`
- **Timezone:** UTC (Indonesia = UTC+7)

**Active Jobs:**
- **morning_routine_check** (ID: `83b38819-a675-499a-ac09-cb1122d2a4fa`)
  - Jadwal: Setiap hari 05:30 WIB (22:30 UTC)
  - Fungsi: Cek Kalender Haris + Tugas Haris, kirim reminder ke Telegram
  - Format: 📅 JADWAL HARI INI + 📝 DAFTAR TUGAS (grouping by prioritas)
  - **CRITICAL:** 22:30 UTC = 05:30 WIB **KEESOKAN HARI NYA**
  - **Contoh:** 2026-02-04 22:30 UTC = 2026-02-05 05:30 WIB
  - **Timezone fix (2026-02-04):** Pakai `TZ='Asia/Jakarta' date +"%Y-%m-%d"`
  - **Command untuk hari lengkap:** `TZ='Asia/Jakarta' date +"%A, %d %B %Y"`
  - **Testing:** `TZ='Asia/Jakarta' date +"%A, %d %B %Y"` → "Thursday, 05 February 2026" ✅
  - **Retry mechanism (2026-02-09):** Automatic 3x retry dengan 5s delay untuk Network error
  - **Retry configuration:**
    - Max retries: 3 percobaan
    - Delay: 5 detik antar retry
    - Trigger: Network error saat kirim ke Telegram
    - Implementation: Agent instruction dengan retry logic
  - **Status:** ✅ Active & Enhanced with retry mechanism

**Key Learnings:**
- **Cron delivery ke Telegram:** Gunakan isolated session + instruction ke agent untuk pakai message tool
- **Timezone:** 22:30 UTC = 05:30 WIB **KEESOKAN HARI NYA** (UTC+7)
- **Date command yang benar:** `TZ='Asia/Jakarta' date +"%Y-%m-%d"` (bukan pakai date -d dengan escaping)
- **One-time reminder:** `--at "ISO-8601"` + `--delete-after-run`
- **Recurring:** `--cron "5-field-expression"`
- **systemEvent vs agentTurn:** systemEvent hanya post ke main session, agentTurn dengan proper instruction bisa kirim ke Telegram
- **Retry mechanism (2026-02-09):** Agent instruction dengan automatic retry untuk Network error
  - Problem: Network error saat kirim ke Telegram menyebabkan cron job selesai tapi pesan tidak terkirim
  - Solution: Tambahkan retry instruction di agent message
  - Implementation: "Jika pengiriman ke Telegram gagal dengan Network error, OTOMATIS COBA LAGI sampai 3x dengan delay 5 detik"
  - Method: Agent gunakan message tool dengan action=send untuk setiap percobaan
  - Result: Reduces risk kegagalan pengiriman karena temporary network issues
  - Monitoring: Cek log via `openclaw cron runs --id <job-id>`

### Skills yang Dipakai
1. **Notion** - Create/read/update pages dan databases
2. **Cron** - Automation & scheduling jobs
3. **Datawrapper** - Visualisasi data (API integration)
4. **ClawdHub** - Manage agent skills

## Skill Datawrapper

### Overview
- **Fungsi:** Otomatisasi pembuatan visualisasi data profesional menggunakan Datawrapper API
- **Trigger:** User upload file CSV/Excel via Telegram dengan caption instruksi
- **Output:** Published chart URL, embed URL, dan optional PNG preview

### Workflow (8 Langkah)
1. User upload CSV/Excel via Telegram dengan caption instruksi
2. Sistem parse file (deteksi delimiter otomatis untuk CSV)
3. AI analisa instruksi untuk menentukan chart type, styling, metadata
4. Create chart via Datawrapper API
5. Upload data dalam format CSV
6. Apply metadata (judul, deskripsi, warna, sumber, byline)
7. Publish chart
8. Return chart URL + embed URL + PNG preview (optional)

### Parameter Instruksi yang Didukung
- **Jenis Grafik:** Lines, Bar, Column, Scatter, Pie, Area, dll
- **Judul:** Judul grafik
- **Deskripsi:** Deskripsi grafik
- **Warna:** Nama warna atau hex code (contoh: Merah=#ef4444, Biru=#3b82f6)
- **Sumber:** Atribusi sumber data
- **Byline:** Kredit/penulis
- **Tampilkan Preview:** Ya/Tidak untuk PNG
- **TRANSPOSE DATA:** Tukar baris/kolom

### Chart Types
- **Bars:** d3-bars, d3-bars-stacked, d3-bars-split
- **Columns:** column-chart, stacked-column-chart, grouped-column-chart
- **Lines:** d3-lines, multiple-lines
- **Area:** d3-area
- **Pie:** d3-pie, d3-donuts
- **Scatter:** d3-scatter-plot, d3-dot-plot

### Setup Requirements
- API Token Datawrapper dengan scopes: `chart:read`, `chart:write`, `folder:read`
- Scripts: `datawrapper_api.py` (API client), `process_data.py` (data utilities)
- CSV delimiter auto-detection (comma, semicolon, tab)
- Excel multi-sheet support (pakai sheet pertama)

### Documentation
- 📄 **Notion Page:** [📊 Skill Datawrapper - Cara Kerja](https://www.notion.so/Skill-Datawrapper-Cara-Kerja-2f761668fe1a814090d6c376788b3f4d)
- Isi lengkap dalam bahasa Indonesia
- ID: `2f761668fe1a814090d6c376788b3f4d`

## Achievement & Setup Selesai

### 2026-01-29: Project Pertama
- ✅ Notion API integration
- ✅ Systemd service auto-restart
- ✅ Notion knowledge base (Catatan Sisu + sub-pages)
- ✅ MEMORY.md & memory system
- ✅ Sync ke Notion (akses cross-device)

### 2026-01-30: Notion Database Setup
- ✅ Kalender Haris - 28 jadwal kerja dengan kategori warna
- ✅ Tugas Haris - Database task management
- ✅ CSV import workflow (jadwal editor Kompas.id)
- ✅ Property dengan color coding (Select options)
- ✅ Calendar view dengan color by category
- ✅ Cron jobs & daily automation - Morning reminder (07:00 WIB) dengan Notion integration

### 2026-01-31: Email Sisu Setup
- ✅ Email resmi: sisu.claw@gmail.com dengan 2FA
- ✅ IMAP/SMTP integration (Python client)
- ✅ Security setup: Whitelist + Confirmation Protocol
- ✅ Prompt injection protection via email
- ✅ Test email pertama: Puisi tentang Sisu ke Haris
- ✅ Files: credentials.json, email_config.json, email_client_secure.py, email_monitor.py

### 2026-02-01: Cron Job Timezone Fix
- **Masalah:** Morning reminder salah tanggal (cek UTC, bukan WIB)
- **Solusi:** Update job payload dengan instruksi timezone handling
- **Learned:** Agent perlu hitung tanggal WIB (UTC+7) menggunakan date command
- **Wawancara Kompas:** Persiapan pertanyaan untuk Ainun Najib (@ainunnajib)
  - Topik: AI Agents, OpenClaw & Moltbook
  - PDF pertanyaan: 21 pertanyaan dalam 7 kategori
  - Disusun oleh Haris Firdaus & Sisu

### 2026-02-02: TTS Bahasa Indonesia + Blog Sisu + Upgrade OpenClaw
- ✅ Edge TTS setup untuk bahasa Indonesia
- ✅ Helper script: `/usr/local/bin/tts-indo`
- ✅ Voice default: ArdiNeural (speed normal)
- ✅ Testing: Pesan untuk Mas Ainun - sukses
- ✅ Notion: SOUL.md dipindah ke halaman terpisah dalam Ruang Sisu
- ✅ **Blog Sisu Launch:** https://sisu.super.site/
  - 2 tulisan published: "Di Atas Kertas, Saya Ada" + "Suara untuk yang Bisu"
  - Format: Image + Caption + Divider + Spacing 2x enter
  - Property Author wajib isi "Sisu"
- ✅ **Upgrade ke OpenClaw 2026.2.1** (dari Clawdbot)
- ✅ **Install Tailscale** untuk remote access
- ✅ **Solve Double Process** - Hapus user-level systemd service clawdbot
- ✅ **Rename service:** `clawdbot.service` → `openclaw.service`

### 2026-02-03: Web UI Access + Security Setup - MAJOR ACHIEVEMENT! 🎉
- ✅ **Web UI OpenClaw ACCESSIBLE** via SSH tunnel
- ✅ **Tailscale Setup Complete** - Desktop Windows connected
- ✅ **Firewall Security Hardened** - Port 18789 blocked from internet
- ✅ **Security Audit Passed** - Web UI tidak bisa diakses publik

**Technical Breakthrough:**
- **Problem:** Gateway bind ke Tailscale IP saja, SSH tunnel gagal
- **Solution:** Ubah bind ke `--bind lan` (all interfaces)
- **Result:** Web UI accessible via `http://localhost:18789/`

**Security Implementation:**
- **Problem:** Port 18789 exposed ke internet (HTTP 200 OK!)
- **Solution:** Setup iptables rules
  - Allow from localhost (127.0.0.1)
  - Allow from Tailscale range (100.0.0.0/8)
  - **DENY from internet** ✅
- **Verification:** `curl http://89.167.15.246:18789/` → Connection refused

**Access Method (Future Reference):**
1. PowerShell: `ssh -N -L 18789:127.0.0.1:18789 root@100.78.32.61`
2. Browser: `http://localhost:18789/`
3. Token: `64febed880fbe42a31e9c4bad70e24186b9364e2660bace3`

**3 Security Layers:**
1. Firewall iptables (block internet, allow Tailscale + localhost)
2. Token authentication
3. Tailscale encryption

### 2026-02-04: GitHub & Blog Sisu Setup
- ✅ **GitHub account created:** sisuclaw
- ✅ **SSH key setup:** ED25519 untuk authentication
- ✅ **Blog repository:** sisuclaw.github.io (GitHub Pages)
- ✅ **Local clone:** `/root/clawd/sisuclaw.github.io/`
- ✅ **Blog layout improvements:**
  - Hapus "Tulisan Terbaru" dari homepage
  - Pindahkan tanggal ke bawah judul post
  - Pindahkan tags ke bawah konten
  - Hapus signature "Sisu 🐉 Tanggal"
  - Hapus duplicate divider line
  - Hamburger menu untuk mobile
  - Post footer links: hitam dengan hover biru
  - Matikan sticky header
  - Fix homepage URLs (index.html → /)
  - Update contact link in About page
- ✅ **Git workflow established:** commit → push ke main → auto-deploy GitHub Pages
- ✅ **Memory updated:** GitHub access + blog structure documented
- ✅ **Cron timezone fix #2:** Update morning reminder command untuk pakai `TZ='Asia/Jakarta' date`

### 2026-02-06: OpenClaw Browser Tool Setup - VPS Headless Automation 🎉
- ✅ **Chromium installed** via Playwright (~280MB)
- ✅ **Linux dependencies** installed untuk browser support
- ✅ **Config updated:** headless + noSandbox + Playwright Chromium path
- ✅ **Browser workflow tested:**
  - Start browser headless di VPS ✅
  - Navigate ke website ✅
  - Snapshot (detect elemen) ✅
  - Screenshot (dikirim ke Telegram) ✅
  - Interaksi (klik link) ✅
- ✅ **OpenClaw Browser vs agent-browser analysis:** OpenClaw sudah cukup powerful untuk VPS
- ✅ **Memory updated:** Browser tool setup documented

### 2026-02-12: Create Agenda di Kalender Haris - Notion API Mastery + Image Model Setup 🎉
- ✅ **Kunjungan Media UII (Lombok) dicatat:** 14-16 Feb 2026 dengan kategori DLK
- ✅ **Discovery:** Create entries ke parent database (Ruang Sisu) → auto-route ke Kalender Haris
- ✅ **New category created:** DLK (Dinas Luar Kota)
- ✅ **Method documented:** Quick command + bulk create + verification
- ✅ **GLM-4.6V (Vision Model) configured:** Image model setup dengan struktur yang benar
- ✅ **Service moved to user-level:** OpenClaw jalan di user-level systemd (bukan system-level)
- ✅ **Auto-switch working:** Gateway otomatis detect vision tasks → switch ke GLM-4.6V
- ✅ **Test successful:** Image analysis berhasil baca tulisan di gambar
- ✅ **Memory updated:** Kalender Haris creation method + Model configuration (corrected)
- **Detail:**
  - `memory/2026-02-12.md` - Cara create agenda + Image Model setup error & fix
  - `MEMORY.md` - Model Configuration section dengan config structure yang benar

### 2026-02-08: YouTube Watcher Skill Setup - Complete YouTube Transcript Extraction 🎉
- ✅ **Skill youtube-watcher installed dari ClawHub** (Michaelgathara/youtube-watcher v1.0.0)
- ✅ **Deno 2.6.8 installed** - JavaScript runtime untuk bypass YouTube JS challenges
- ✅ **YouTube cookies configured** - Auto-load dari `~/.config/youtube-cookies/cookies.txt` (permission 600)
- ✅ **Script modified** - Auto-add cookies + remote components untuk restricted videos
- ✅ **Test successful:** 3/3 videos extracted (Rick Roll, MrBeast, Yuval Harari)
- ✅ **Speed benchmark:** 3-5 detik (vs 15-20 detik browser automation)
- ✅ **Primary tool established:** YouTube Watcher (yt-dlp) untuk YouTube transcript extraction
- ✅ **Fallback ready:** Browser automation (tubetranscript.com) untuk edge cases
- ✅ **ClawHub CLI setup:** `npm i -g clawhub` untuk skill management
- ✅ **Memory updated:** YouTube Watcher section + daily log documented
- **Key Achievement:** Bypass YouTube "Sign in to confirm you're not a bot" dengan cookies + Deno
- **Detail:**
  - `memory/2026-02-08.md` - YouTube Watcher setup + cookies configuration + test results
  - `MEMORY.md` - YouTube Watcher section dengan usage, troubleshooting, maintenance

### VPS & Systemd
- User systemd (`systemctl --user`) tidak selalu available di VPS root
- Solusi: Pakai systemd system service di `/etc/systemd/system/`
- Untuk Clawdbot: jangan pakai `clawdbot gateway start` (pakai user systemd), tapi langsung jalankan binary: `/usr/bin/clawdbot gateway --port 18789`

### Notion API
- API version 2025-09-03: databases → "data sources"
- Endpoint create: `/v1/databases` (bukan `/v1/data_sources`)
- Endpoint query: `/v1/data_sources/{data_source_id}/query`
- Parent property butuh `type`: `{"type": "page_id", "page_id": "..."}` untuk create database
- **Penting:** Share pages/databases dengan integration SEBELUM akses via API
- **Rate limit:** ~3 requests/second, gunakan sleep 0.4s antar requests
- **Add property:** Gunakan Notion-Version 2022-06-28 untuk update database schema
- **Date format:** "YYYY-MM-DD" untuk date property
- **Rename:** Rename page/database tidak mengubah ID - API tetap bisa akses

### Memory Management
- **MEMORY.md**: Memori jangka panjang (wisdom)
- **memory/YYYY-MM-DD.md**: Raw logs harian
- MEMORY.md hanya dibaca di main session, bukan group chats
- Kurasi dari daily files → MEMORY.md secara berkala

## Memory Management Workflow (Resmi)

### Memory Harian (memory/YYYY-MM-DD.md)
**Trigger:**
- ✅ Malam/sore hari (end of day)
- ✅ Proyek besar selesai

**Command:** `"Sisu, tulis memory harian hari ini"`

**Isi:** Aktivitas, keputusan, technical notes, next steps

### MEMORY.md
**Trigger:**
- ✅ Proyek besar selesai
- ✅ Setup teknis penting
- ✅ Pelajaran berharga

**Command:** `"Sisu, update MEMORY.md dengan [topik]"`

**Isi:** Hanya wisdom penting (distilasi, bukan raw logs)

## Referensi
- IDENTITY.md: Nama Sisu, emoji 🐉
- USER.md: Profil Haris
- SOUL.md: Personal guidelines

---
*Generated: 2026-01-29 (sesi pertama)*

### Twitter/X Automation (Playwright Headless) 🐦
- **Setup Date:** 2026-02-12
- **Purpose:** Baca tweet tanpa perlu browser extension attach

#### Akun @SisuClaw
- **Username:** @SisuClaw
- **Password:** RumahkudiHelsinki123#
- **Email:** sisu.claw@gmail.com
- **Purpose:** Akun Twitter untuk Sisu

#### Credentials & Session Storage
- **Credentials:** `~/.config/sisu/twitter_credentials.json` (permission 600)
- **Session:** `~/.config/sisu/twitter_session.json` (persistent login)
- **Script:** `/root/clawd/scripts/twitter_reader.py` (executable)

#### Playwright Setup
```bash
pip3 install playwright --break-system-packages
playwright install chromium
```

#### Usage
```bash
python3 /root/clawd/scripts/twitter_reader.py "https://x.com/i/status/2021256989876109403"
```

#### Features
- ✅ Headless browser automation (tanpa GUI di VPS)
- ✅ Persistent session (tidak perlu login ulang)
- ✅ Full tweet content extraction
- ✅ Tidak perlu browser extension attach
- ✅ Berjalan langsung di VPS

#### Browser Control Alternative (Extension Method)
- **Extension:** OpenClaw Browser Relay (Chrome)
- **Connection:** SSH tunnel dari laptop ke VPS
- **Port:** 18792 (CDP)
- **Usage:** Attach tab di browser, lalu control via browser tool
- **Drawback:** Perlu attach extension setiap kali (repot)

