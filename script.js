
// --- Launcher Environment & Immediate Cache Purge Engine ---
(function() {
    try {
        const isLauncher = window.self !== window.top || 
                           window.location.search.includes('launcher=') || 
                           window.location.search.includes('in_app=');
        if (isLauncher) {
            document.documentElement.classList.add('in-launcher');
            if (document.body) document.body.classList.add('in-launcher');
            else document.addEventListener('DOMContentLoaded', () => document.body && document.body.classList.add('in-launcher'));
        }

        // Automatic Cache Purge on every page entrance
        if ('caches' in window) {
            caches.keys().then(names => names.forEach(name => caches.delete(name)));
        }
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => {
                regs.forEach(reg => reg.unregister());
            });
        }
        sessionStorage.clear();

        // Hard reload if served from BFCache
        window.addEventListener('pageshow', function(e) {
            if (e.persisted) {
                window.location.reload();
            }
        });
    } catch(e) {
        console.debug('Launcher/Cache init:', e);
    }
})();

// Iframe environment detection for launcher embedded views
(function detectIframe() {
    try {
        if (window.self !== window.top) {
            document.documentElement.classList.add('in-iframe');
            if (document.body) document.body.classList.add('in-iframe');
            else document.addEventListener('DOMContentLoaded', () => document.body && document.body.classList.add('in-iframe'));
        }
    } catch (e) {
        document.documentElement.classList.add('in-iframe');
    }
})();

function getNotebunsConfig() {
    return {
        externalStoreUrl: '/store',
        launcherWindowsPath: 'downloads/NoteBuns Launcher.exe',
        launcherLinuxPath: 'downloads/NoteBuns-Launcher-Linux.AppImage',
        newsUrl: 'https://download.inflexus.world/cloud/news/news_v3.json',
        ...(typeof window !== 'undefined' && window.NOTEBUNS_CONFIG ? window.NOTEBUNS_CONFIG : {})
    };
}

/**
 * LiteMediaPlayer — минимальный просмотрщик image/video без библиотек.
 * Слайды: строка URL, или { type: 'image'|'video', src, poster? }.
 */
class LiteMediaPlayer {
    constructor(root) {
        this.root = root;
        this.imageEl = root.querySelector('#lite-player-image');
        this.videoEl = root.querySelector('#lite-player-video');
        this.prevBtn = root.querySelector('#lite-player-prev');
        this.nextBtn = root.querySelector('#lite-player-next');
        this.counterEl = root.querySelector('#lite-player-counter');
        this.controlsEl = root.querySelector('.lite-player-controls');
        this.slides = [];
        this.index = 0;

        this.prevBtn?.addEventListener('click', () => this.show(this.index - 1));
        this.nextBtn?.addEventListener('click', () => this.show(this.index + 1));
    }

    static normalizeSlides(item) {
        const raw = Array.isArray(item?.slides) ? item.slides.filter(Boolean) : [];
        const slides = raw.map((slide) => {
            if (typeof slide === 'string') {
                return { type: LiteMediaPlayer.guessType(slide), src: slide };
            }
            const src = slide.src || slide.url || slide.image || '';
            const type = (slide.type || LiteMediaPlayer.guessType(src)).toLowerCase();
            return {
                type: type.startsWith('video') ? 'video' : 'image',
                src,
                poster: slide.poster || ''
            };
        }).filter((s) => s.src);

        if (!slides.length && item?.image) {
            slides.push({ type: 'image', src: item.image });
        }
        return slides;
    }

    static guessType(src = '') {
        return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(src) ? 'video' : 'image';
    }

    open(item) {
        this.slides = LiteMediaPlayer.normalizeSlides(item);
        if (!this.slides.length) {
            this.root.hidden = true;
            this.stop();
            return false;
        }
        this.root.hidden = false;
        this.controlsEl?.setAttribute('data-single', this.slides.length < 2 ? 'true' : 'false');
        this.show(0);
        return true;
    }

    show(index) {
        if (!this.slides.length) return;
        this.index = (index + this.slides.length) % this.slides.length;
        const slide = this.slides[this.index];

        this.stop();

        if (slide.type === 'video') {
            this.imageEl.hidden = true;
            this.videoEl.hidden = false;
            this.videoEl.poster = slide.poster || '';
            this.videoEl.src = slide.src;
        } else {
            this.videoEl.hidden = true;
            this.imageEl.hidden = false;
            this.imageEl.src = slide.src;
            this.imageEl.alt = '';
        }

        if (this.counterEl) {
            this.counterEl.textContent = `${this.index + 1} / ${this.slides.length}`;
        }
        if (this.prevBtn) this.prevBtn.disabled = this.slides.length < 2;
        if (this.nextBtn) this.nextBtn.disabled = this.slides.length < 2;
    }

    stop() {
        if (!this.videoEl) return;
        this.videoEl.pause();
        this.videoEl.removeAttribute('src');
        this.videoEl.load();
    }

    close() {
        this.stop();
        this.slides = [];
        this.index = 0;
        if (this.imageEl) this.imageEl.removeAttribute('src');
        this.root.hidden = true;
    }
}

/**
 * SkinManager — надежный сервис загрузки, кэширования и кэш-фолбэка скинов Minecraft.
 * Обеспечивает отказоустойчивость при недоступности Mojang API / Crafatar / Visage / Minotar.
 */
class SkinManager {
    constructor() {
        this.CACHE_PREFIX = 'notebuns_skin_v1_';
        this.CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 часа
    }

    static getSteveSvg() {
        return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" fill="%232b2b2b"/><rect x="32" y="32" width="64" height="64" fill="%23c68a59"/><rect x="40" y="32" width="48" height="24" fill="%23563921"/><rect x="40" y="64" width="16" height="8" fill="%23ffffff"/><rect x="44" y="64" width="8" height="8" fill="%232b50bb"/><rect x="72" y="64" width="16" height="8" fill="%23ffffff"/><rect x="76" y="64" width="8" height="8" fill="%232b50bb"/><rect x="48" y="80" width="32" height="8" fill="%236e3926"/></svg>';
    }

    static getAlexSvg() {
        return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" fill="%232b2b2b"/><rect x="32" y="32" width="64" height="64" fill="%23e5a77d"/><rect x="32" y="32" width="64" height="24" fill="%23b85d26"/><rect x="40" y="64" width="16" height="8" fill="%23ffffff"/><rect x="44" y="64" width="8" height="8" fill="%232b8c50"/><rect x="72" y="64" width="16" height="8" fill="%23ffffff"/><rect x="76" y="64" width="8" height="8" fill="%232b8c50"/><rect x="48" y="80" width="32" height="8" fill="%23aa5039"/></svg>';
    }

    getProviders(username) {
        return [
            `https://crafatar.com/avatars/${encodeURIComponent(username)}?size=128&overlay`,
            `https://visage.surgeplay.com/face/128/${encodeURIComponent(username)}`,
            `https://minotar.net/helm/${encodeURIComponent(username)}/128.png`
        ];
    }

    getFallback(username) {
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = (hash << 5) - hash + username.charCodeAt(i);
            hash |= 0;
        }
        return (Math.abs(hash) % 2 === 0) ? SkinManager.getSteveSvg() : SkinManager.getAlexSvg();
    }

    getCachedSkin(username) {
        try {
            const raw = localStorage.getItem(this.CACHE_PREFIX + username.toLowerCase());
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (Date.now() - parsed.timestamp < this.CACHE_TTL_MS && parsed.url) {
                return parsed.url;
            }
        } catch (e) {}
        return null;
    }

    setCachedSkin(username, url) {
        try {
            localStorage.setItem(this.CACHE_PREFIX + username.toLowerCase(), JSON.stringify({
                url,
                timestamp: Date.now()
            }));
        } catch (e) {}
    }

    initSkins() {
        const avatars = document.querySelectorAll('img.skin-avatar');
        avatars.forEach((img) => {
            const username = img.dataset.minecraftUsername || img.alt || '';
            if (!username) return;

            const cached = this.getCachedSkin(username);
            const providers = this.getProviders(username);
            const fallback = this.getFallback(username);

            let providerIndex = 0;

            if (cached) {
                img.src = cached;
            } else {
                img.src = providers[0];
            }

            img.onerror = () => {
                providerIndex++;
                if (providerIndex < providers.length) {
                    img.src = providers[providerIndex];
                } else {
                    img.src = fallback;
                    img.onerror = null;
                }
            };

            img.onload = () => {
                if (img.src !== fallback && !img.src.startsWith('data:')) {
                    this.setCachedSkin(username, img.src);
                }
            };
        });
    }
}

class NoteBunsApp {
    constructor() {
        this.initStoreLinks();
        this.initCursor();
        this.initCanvasParticles();
        this.initTiltEffects();
        this.initScrollReveal();
        this.initNavbar();
        this.initClipboard();
        this.initMobileMenu();
        this.simulateOnline();
        this.initTwitchIntegration();
        this.initModal();
        this.initNews();
        this.skinManager = new SkinManager();
        this.skinManager.initSkins();
    }

    initStoreLinks() {
        const cfg = getNotebunsConfig();
        const storeUrl = cfg.externalStoreUrl || '/store';
        document.querySelectorAll('a.external-store-link, a.btn-store').forEach((a) => {
            a.href = storeUrl;
            if (storeUrl.startsWith('/') || storeUrl.includes('notebuns.inflexus.world')) {
                a.removeAttribute('target');
                a.removeAttribute('rel');
            }
        });
    }

    // 1. Soft Glow Cursor Fix
    initCursor() {
        if (window.matchMedia("(pointer: coarse)").matches) return;

        const cursor = document.createElement('div');
        cursor.classList.add('custom-cursor');
        document.body.appendChild(cursor);

        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        let cursorX = mouseX;
        let cursorY = mouseY;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;

            // Separate reads and writes to avoid layout thrashing
            const cards = document.querySelectorAll('.tilt-card');
            if (cards.length > 0) {
                const rects = Array.from(cards).map(card => card.getBoundingClientRect());
                requestAnimationFrame(() => {
                    cards.forEach((card, index) => {
                        const rect = rects[index];
                        const x = mouseX - rect.left;
                        const y = mouseY - rect.top;
                        card.style.setProperty('--mouse-x', `${x}px`);
                        card.style.setProperty('--mouse-y', `${y}px`);
                    });
                });
            }
        }, { passive: true });

        // Loop for ultra-smooth tracking with lerping (linear interpolation)
        const renderCursor = () => {
            cursorX += (mouseX - cursorX) * 0.15; // smooth delay
            cursorY += (mouseY - cursorY) * 0.15;

            cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%)`;
            requestAnimationFrame(renderCursor);
        };
        requestAnimationFrame(renderCursor);

        const hoverElements = document.querySelectorAll('a, button, .click-to-copy, .tilt-card');
        hoverElements.forEach(el => {
            el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
            el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
        });

        document.addEventListener('mouseleave', () => cursor.style.opacity = '0');
        document.addEventListener('mouseenter', () => cursor.style.opacity = '1');
    }

    // 2. HTML5 Canvas Particles
    initCanvasParticles() {
        const canvas = document.createElement('canvas');
        canvas.id = 'canvas-container';
        document.body.prepend(canvas);

        const ctx = canvas.getContext('2d');
        let width, height, particles;

        const resize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            initParticles();
        };

        const drawNote = (ctx, x, y, size, color, opacity, angle) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle * Math.PI / 180);
            ctx.scale(size / 20, size / 20);

            ctx.globalAlpha = opacity;
            ctx.fillStyle = color;

            ctx.fillRect(8, -10, 3, 15);
            ctx.fillRect(18, -12, 3, 15);
            ctx.fillRect(8, -12, 13, 4);
            ctx.fillRect(2, 2, 7, 5);
            ctx.fillRect(12, 0, 7, 5);

            ctx.restore();
        };

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = height + Math.random() * 100;
                this.size = Math.random() * 8 + 8;
                this.speedY = Math.random() * 1.5 + 0.5;
                this.speedX = (Math.random() - 0.5) * 1;
                const colors = ['#55FF55', '#FF5555', '#FF55FF', '#FFAA00', '#55FFFF'];
                this.color = colors[Math.floor(Math.random() * colors.length)];
                this.opacity = Math.random() * 0.4 + 0.1;
                this.angle = Math.random() * 360;
                this.spin = (Math.random() - 0.5) * 1.5;
            }
            update() {
                this.y -= this.speedY;
                this.x += this.speedX + Math.sin(this.y * 0.01) * 0.5;
                this.angle += this.spin;

                if (this.y < -50) {
                    this.y = height + 50;
                    this.x = Math.random() * width;
                }
            }
            draw() {
                drawNote(ctx, this.x, this.y, this.size, this.color, this.opacity, this.angle);
            }
        }

        const initParticles = () => {
            const count = window.innerWidth < 768 ? 15 : 30;
            particles = Array(count).fill().map(() => new Particle());
        };

        window.addEventListener('resize', resize);
        resize();

        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            requestAnimationFrame(animate);
        };
        animate();
    }

    // 3. 3D Tilt Effect
    initTiltEffects() {
        const cards = document.querySelectorAll('.tilt-card');

        cards.forEach(card => {
            if (window.matchMedia("(pointer: coarse)").matches) return;

            let isRafScheduled = false;

            card.addEventListener('mousemove', e => {
                if (!isRafScheduled) {
                    isRafScheduled = true;
                    requestAnimationFrame(() => {
                        const rect = card.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;

                        const centerX = rect.width / 2;
                        const centerY = rect.height / 2;

                        const rotateX = ((y - centerY) / centerY) * -8;
                        const rotateY = ((x - centerX) / centerX) * 8;

                        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
                        isRafScheduled = false;
                    });
                }
            }, { passive: true });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
            });
        });
    }

    // 4. Scroll Reveal
    initScrollReveal() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    // Remove transition delay after animation completes so hover effects don't lag
                    setTimeout(() => {
                        entry.target.style.transitionDelay = '0s';
                    }, 800);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

        document.querySelectorAll('.reveal').forEach((el, index) => {
            const parent = el.parentElement;
            if (parent && (parent.classList.contains('tilt-grid') ||
                parent.classList.contains('store-grid') ||
                parent.classList.contains('vtuber-grid') ||
                parent.classList.contains('news-grid'))) {
                const delay = window.innerWidth < 768 ? 0 : (index % 3) * 0.15;
                el.style.transitionDelay = `${delay}s`;
            }
            observer.observe(el);
        });
    }

    observeReveal(elements) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    setTimeout(() => {
                        entry.target.style.transitionDelay = '0s';
                    }, 800);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

        elements.forEach((el, index) => {
            const delay = window.innerWidth < 768 ? 0 : (index % 4) * 0.08;
            el.style.transitionDelay = `${delay}s`;
            observer.observe(el);
        });
    }

    // 5. Navbar
    initNavbar() {
        const nav = document.querySelector('.navbar');
        if (!nav) return;
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
        });
    }

    // 6. Copy IP
    initClipboard() {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = '<span class="toast-text"></span>';
        document.body.appendChild(toast);

        document.querySelectorAll('.click-to-copy').forEach(box => {
            box.addEventListener('click', () => {
                const ip = box.dataset.clipboard;
                navigator.clipboard.writeText(ip).then(() => {
                    toast.querySelector('.toast-text').innerText = `IP ${ip} скопирован!`;
                    toast.classList.add('show');

                    setTimeout(() => toast.classList.remove('show'), 3500);
                });
            });
        });
    }

    // 7. Mobile Menu
    initMobileMenu() {
        const hamburger = document.querySelector('.hamburger');
        const navLinks = document.querySelector('.nav-links');
        const body = document.body;

        if (hamburger && navLinks) {
            hamburger.addEventListener('click', () => {
                navLinks.classList.toggle('active');
                hamburger.classList.toggle('active');

                if (navLinks.classList.contains('active')) {
                    body.style.overflow = 'hidden';
                } else {
                    body.style.overflow = 'auto';
                }
            });

            navLinks.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    if (window.innerWidth <= 900) {
                        hamburger.click();
                    }
                });
            });
        }
    }

    // 8. Simulated Online
    simulateOnline() {
        const el = document.getElementById('online-count');
        if (!el) return;

        let count = 158;
        setInterval(() => {
            count += Math.floor(Math.random() * 5) - 2;
            count = Math.max(0, count);

            el.style.transform = 'scale(1.2)';
            setTimeout(() => el.style.transform = 'scale(1)', 200);

            el.innerText = count;
        }, 6000);
    }

    // 9. Twitch Integration
    async initTwitchIntegration() {
        const streamers = [
            { id: 'cinaminnie-stream', username: 'cinaminnie' },
            { id: 'meowlody-stream', username: 'meowlody_note' }
        ];

        for (const streamer of streamers) {
            const container = document.getElementById(streamer.id);
            if (!container) continue;

            try {
                const response = await fetch(`https://decapi.me/twitch/title/${streamer.username}`);
                const title = await response.text();

                if (title && !title.includes('could not be found') && !title.includes('Error')) {
                    const titleEl = container.querySelector('.stream-title');
                    if (!titleEl) continue;
                    titleEl.innerText = title;
                    // Add hover tooltip for full title if it gets truncated
                    titleEl.title = title;
                    container.style.display = 'flex';
                }
            } catch (error) {
                console.error(`Error fetching Twitch data for ${streamer.username}:`, error);
            }
        }
    }

    showLauncherDownloadToast(message) {
        const toast = document.querySelector('.toast');
        const textEl = toast && toast.querySelector('.toast-text');
        if (toast && textEl) {
            textEl.textContent = message;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3500);
        }
    }

    triggerLauncherDownload(href, filename) {
        const downloadLink = document.createElement('a');
        downloadLink.href = encodeURI(href);
        downloadLink.download = filename;
        downloadLink.rel = 'noopener';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }

    detectOS() {
        const userAgent = (navigator.userAgent || navigator.vendor || window.opera || '').toLowerCase();
        if (userAgent.includes('win')) return 'windows';
        if (userAgent.includes('mac')) return 'mac';
        if (userAgent.includes('linux') || userAgent.includes('x11')) return 'linux';
        return 'windows';
    }

    // 10. TOS Modal + выбор платформы лаунчера (index.html)
    initModal() {
        const downloadBtn = document.querySelector('.ip-wrapper');
        const tosModal = document.getElementById('tos-modal');
        const openTosLink = document.getElementById('open-tos-link');
        const closeTosBtn = document.getElementById('close-tos-btn');

        const platformModal = document.getElementById('launcher-platform-modal');
        const winBtn = document.getElementById('launcher-win-btn');
        const linuxBtn = document.getElementById('launcher-linux-btn');
        const macBtn = document.getElementById('launcher-mac-btn');
        const platformCancel = document.getElementById('launcher-platform-cancel');

        const thanksModal = document.getElementById('download-thanks-modal');
        const thanksCloseTop = document.getElementById('download-thanks-close-top');
        const thanksCloseBtn = document.getElementById('download-thanks-close-btn');
        const thanksOpenPlatformBtn = document.getElementById('thanks-open-platform-btn');
        const thanksRetryBtn = document.getElementById('thanks-retry-download-btn');

        const winBadge = document.getElementById('win-recommend-badge');
        const macBadge = document.getElementById('mac-recommend-badge');
        const linuxBadge = document.getElementById('linux-recommend-badge');

        const cfg = getNotebunsConfig();
        const githubReleasesUrl = cfg.launcherGithubReleasesUrl || 'https://github.com/milkycloud-dev/melody-launcher-minecraft/releases';
        const userOS = this.detectOS();
        let lastDownloadAction = null;

        // Highlight detected OS badge
        if (userOS === 'windows' && winBadge) winBadge.hidden = false;
        if (userOS === 'mac' && macBadge) macBadge.hidden = false;
        if (userOS === 'linux' && linuxBadge) linuxBadge.hidden = false;

        const closeTos = () => {
            if (!tosModal) return;
            tosModal.classList.remove('active');
            document.body.style.overflow = '';
        };

        const openTos = (e) => {
            if (e) e.preventDefault();
            if (!tosModal) return;
            tosModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        };

        if (window.location.hash === '#open-tos' || window.location.hash === '#tos') {
            openTos();
        }

        if (openTosLink) {
            openTosLink.addEventListener('click', openTos);
        }

        if (closeTosBtn) {
            closeTosBtn.addEventListener('click', closeTos);
        }

        if (tosModal) {
            tosModal.addEventListener('click', (e) => {
                if (e.target === tosModal) closeTos();
            });
        }

        const closePlatformModal = () => {
            if (!platformModal) return;
            platformModal.classList.remove('active');
            document.body.style.overflow = '';
        };

        const openPlatformModal = () => {
            if (!platformModal) return;
            closeThanksModal();
            platformModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        };

        const closeThanksModal = () => {
            if (!thanksModal) return;
            thanksModal.classList.remove('active');
            document.body.style.overflow = '';
        };

        const openThanksModal = () => {
            if (!thanksModal) return;
            closePlatformModal();
            thanksModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        };

        if (thanksCloseTop) thanksCloseTop.addEventListener('click', closeThanksModal);
        if (thanksCloseBtn) thanksCloseBtn.addEventListener('click', closeThanksModal);
        if (thanksOpenPlatformBtn) thanksOpenPlatformBtn.addEventListener('click', openPlatformModal);
        if (thanksModal) {
            thanksModal.addEventListener('click', (e) => {
                if (e.target === thanksModal) closeThanksModal();
            });
        }

        const startWindowsDownload = (showToast = true) => {
            const path = cfg.launcherWindowsPath;
            const name = path.split('/').pop() || 'NoteBuns Launcher.exe';
            this.triggerLauncherDownload(path, name);
            lastDownloadAction = { type: 'file', href: path, filename: name };
            if (showToast) this.showLauncherDownloadToast('Загрузка лаунчера для Windows началась...');
        };

        const startGithubRedirect = (osLabel, showToast = true) => {
            window.open(githubReleasesUrl, '_blank', 'noopener,noreferrer');
            lastDownloadAction = { type: 'url', href: githubReleasesUrl };
            if (showToast) this.showLauncherDownloadToast(`Переход на GitHub Releases (${osLabel})...`);
        };

        const retryLastDownload = () => {
            if (!lastDownloadAction || lastDownloadAction.type === 'file') {
                startWindowsDownload(true);
                return;
            }
            window.open(lastDownloadAction.href || githubReleasesUrl, '_blank', 'noopener,noreferrer');
            this.showLauncherDownloadToast('Повторный переход на страницу загрузки...');
        };

        if (thanksRetryBtn) {
            thanksRetryBtn.addEventListener('click', retryLastDownload);
        }

        // Download Launcher button logic (Auto OS Selection)
        if (downloadBtn) {
            downloadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const os = this.detectOS();
                if (os === 'windows') {
                    startWindowsDownload(true);
                    openThanksModal();
                } else if (os === 'mac') {
                    startGithubRedirect('macOS', true);
                    openThanksModal();
                } else if (os === 'linux') {
                    startGithubRedirect('Linux', true);
                    openThanksModal();
                } else {
                    openPlatformModal();
                }
            });
        }

        if (winBtn) {
            winBtn.addEventListener('click', () => {
                startWindowsDownload(true);
                closePlatformModal();
                openThanksModal();
            });
        }

        if (linuxBtn) {
            linuxBtn.addEventListener('click', () => {
                startGithubRedirect('Linux', true);
                closePlatformModal();
                openThanksModal();
            });
        }

        if (macBtn) {
            macBtn.addEventListener('click', () => {
                startGithubRedirect('macOS', true);
                closePlatformModal();
                openThanksModal();
            });
        }

        if (platformCancel && platformModal) {
            platformCancel.addEventListener('click', () => {
                closePlatformModal();
            });
            platformModal.addEventListener('click', (e) => {
                if (e.target === platformModal) closePlatformModal();
            });
        }
    }

    // 11. News grid from remote news_v3.json
    async initNews() {
        const grid = document.getElementById('news-grid');
        const modal = document.getElementById('news-modal');
        if (!grid || !modal) return;

        const playerRoot = document.getElementById('lite-player');
        this.newsPlayer = playerRoot ? new LiteMediaPlayer(playerRoot) : null;
        this.newsItems = [];

        const closeBtn = document.getElementById('news-modal-close');
        closeBtn?.addEventListener('click', () => this.closeNewsModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeNewsModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                this.closeNewsModal();
            }
        });

        const cfg = getNotebunsConfig();
        const bust = (url) => `${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}`;

        const applyNews = (data) => {
            this.newsItems = Array.isArray(data) ? data : (data.items || data.news || []);
            if (!this.newsItems.length) return false;
            this.renderNewsGrid(grid);
            return true;
        };

        // 1) Встроенный news-data.js — работает без CORS на любом хостинге
        if (Array.isArray(window.NOTEBUNS_NEWS) && applyNews(window.NOTEBUNS_NEWS)) {
            // На localhost дополнительно обновим с live API, если доступен
            if (cfg.newsUrl === '/api/news') {
                fetch(bust('/api/news'), { cache: 'no-store' })
                    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
                    .then((data) => applyNews(data))
                    .catch(() => {});
            }
            return;
        }

        // 2) Fetch-фолбэки
        const candidates = [];
        if (cfg.newsUrl) candidates.push(cfg.newsUrl);
        if (cfg.newsUrl !== 'news.json') candidates.push('news.json');

        let loaded = false;
        let lastError = null;
        for (const url of candidates) {
            try {
                const response = await fetch(bust(url), { cache: 'no-store' });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                if (applyNews(data)) {
                    loaded = true;
                    break;
                }
            } catch (error) {
                lastError = error;
                console.warn(`News load failed for ${url}:`, error);
            }
        }

        if (!loaded) {
            console.error('News load failed:', lastError);
            grid.innerHTML = '<div class="news-error">Не удалось загрузить новости. Попробуйте позже.</div>';
        }
    }

    formatNewsDate(value) {
        if (!value) return '';
        // YYYY-MM-DD — без сдвига часового пояса
        const isoDay = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
        const date = isoDay
            ? new Date(Number(isoDay[1]), Number(isoDay[2]) - 1, Number(isoDay[3]))
            : new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    parseSpan(span) {
        const match = String(span || '1x1').toLowerCase().match(/^(\d+)\s*[x×]\s*(\d+)$/);
        if (!match) return { cols: 1, rows: 1, key: '1x1' };
        const cols = Math.min(4, Math.max(1, parseInt(match[1], 10)));
        const rows = Math.min(2, Math.max(1, parseInt(match[2], 10)));
        return { cols, rows, key: `${cols}x${rows}` };
    }

    renderNewsGrid(grid) {
        if (!this.newsItems.length) {
            grid.innerHTML = '<div class="news-empty">Пока нет новостей — загляните позже.</div>';
            return;
        }

        grid.innerHTML = '';
        const tiles = this.newsItems.map((item, index) => {
            const span = this.parseSpan(item.span);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `news-tile news-tile-span-${span.key} reveal`;
            btn.dataset.newsIndex = String(index);

            const media = document.createElement('div');
            media.className = 'news-tile-media';
            if (item.image) {
                media.style.backgroundImage = `url(${JSON.stringify(String(item.image))})`;
            }

            const shade = document.createElement('div');
            shade.className = 'news-tile-shade';

            const body = document.createElement('div');
            body.className = 'news-tile-body';

            const dateText = this.formatNewsDate(item.date);
            if (dateText) {
                const dateEl = document.createElement('time');
                dateEl.className = 'news-tile-date';
                dateEl.dateTime = item.date || '';
                dateEl.textContent = dateText;
                body.appendChild(dateEl);
            }

            const title = document.createElement('h3');
            title.className = 'news-tile-title';
            title.textContent = item.title || 'Новость';
            body.appendChild(title);

            if (item.description) {
                const desc = document.createElement('p');
                desc.className = 'news-tile-desc';
                desc.textContent = item.description;
                body.appendChild(desc);
            }

            btn.append(media, shade, body);
            btn.addEventListener('click', () => this.openNewsModal(item));
            return btn;
        });

        tiles.forEach((tile) => grid.appendChild(tile));
        this.observeReveal(tiles);

        const cursor = document.querySelector('.custom-cursor');
        if (cursor) {
            tiles.forEach((tile) => {
                tile.addEventListener('mouseenter', () => cursor.classList.add('hover'));
                tile.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
            });
        }
    }

    openNewsModal(item) {
        const modal = document.getElementById('news-modal');
        if (!modal || !item) return;

        const dateEl = document.getElementById('news-modal-date');
        const titleEl = document.getElementById('news-modal-title');
        const descEl = document.getElementById('news-modal-description');
        const linkEl = document.getElementById('news-modal-link');

        const dateText = this.formatNewsDate(item.date);
        if (dateEl) {
            dateEl.textContent = dateText;
            dateEl.dateTime = item.date || '';
            dateEl.hidden = !dateText;
        }
        if (titleEl) titleEl.textContent = item.title || 'Новость';
        if (descEl) descEl.textContent = item.description || '';

        if (linkEl) {
            const href = String(item.link || '').trim();
            if (href) {
                linkEl.href = href;
                linkEl.hidden = false;
            } else {
                linkEl.hidden = true;
                linkEl.removeAttribute('href');
            }
        }

        this.newsPlayer?.open(item);
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeNewsModal() {
        const modal = document.getElementById('news-modal');
        if (!modal) return;
        modal.classList.remove('active');
        this.newsPlayer?.close();
        document.body.style.overflow = '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new NoteBunsApp();
});


// --- Принудительный сброс устаревшего кэша браузера при входе на сайт ---
(function autoFlushBrowserCache() {
    try {
        const CURRENT_DEPLOY = 'notebuns-2026-09-04-v10';
        const lastDeploy = localStorage.getItem('notebuns_deploy_sig');
        if (lastDeploy !== CURRENT_DEPLOY) {
            localStorage.setItem('notebuns_deploy_sig', CURRENT_DEPLOY);
            if ('caches' in window) {
                caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
            }
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(regs => {
                    regs.forEach(r => r.unregister());
                });
            }
            sessionStorage.clear();
        }
    } catch (err) {
        console.debug('Cache auto-flush:', err);
    }
})();
