function getNotebunsConfig() {
    return {
        externalStoreUrl: 'https://notebuns.easydonate.ru/',
        launcherWindowsPath: 'downloads/NoteBuns Launcher.exe',
        launcherLinuxPath: 'downloads/NoteBuns-Launcher-Linux.AppImage',
        ...(typeof window !== 'undefined' && window.NOTEBUNS_CONFIG ? window.NOTEBUNS_CONFIG : {})
    };
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
    }

    initStoreLinks() {
        const cfg = getNotebunsConfig();
        document.querySelectorAll('a.external-store-link').forEach((a) => {
            a.href = cfg.externalStoreUrl;
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
                parent.classList.contains('vtuber-grid'))) {
                const delay = window.innerWidth < 768 ? 0 : (index % 3) * 0.15;
                el.style.transitionDelay = `${delay}s`;
            }
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

    // 10. TOS Modal + выбор платформы лаунчера (index.html)
    initModal() {
        const downloadBtn = document.querySelector('.ip-wrapper');
        const modal = document.getElementById('tos-modal');
        const platformModal = document.getElementById('launcher-platform-modal');
        const agreeBtn = document.getElementById('agree-btn');
        const winBtn = document.getElementById('launcher-win-btn');
        const linuxBtn = document.getElementById('launcher-linux-btn');
        const platformCancel = document.getElementById('launcher-platform-cancel');

        const closePlatformModal = () => {
            if (!platformModal) return;
            platformModal.classList.remove('active');
            document.body.style.overflow = '';
        };

        const openPlatformModal = () => {
            if (!platformModal) return;
            platformModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        };

        if (downloadBtn && modal) {
            downloadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        }

        if (agreeBtn && modal) {
            agreeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
                if (platformModal) {
                    openPlatformModal();
                } else {
                    document.body.style.overflow = '';
                    const cfg = getNotebunsConfig();
                    const path = cfg.launcherWindowsPath;
                    const name = path.split('/').pop() || 'launcher';
                    this.triggerLauncherDownload(path, name);
                    this.showLauncherDownloadToast('Загрузка лаунчера началась...');
                }
            });
        }

        const cfg = getNotebunsConfig();

        if (winBtn && platformModal) {
            winBtn.addEventListener('click', () => {
                const path = cfg.launcherWindowsPath;
                const name = path.split('/').pop() || 'NoteBuns Launcher.exe';
                this.triggerLauncherDownload(path, name);
                closePlatformModal();
                this.showLauncherDownloadToast('Загрузка лаунчера для Windows началась...');
            });
        }

        if (linuxBtn && platformModal) {
            linuxBtn.addEventListener('click', () => {
                const path = cfg.launcherLinuxPath;
                const name = path.split('/').pop() || 'NoteBuns-Launcher-Linux.AppImage';
                this.triggerLauncherDownload(path, name);
                closePlatformModal();
                this.showLauncherDownloadToast('Загрузка лаунчера для Linux началась...');
            });
        }

        if (platformCancel && platformModal) {
            platformCancel.addEventListener('click', () => {
                closePlatformModal();
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new NoteBunsApp();
});
