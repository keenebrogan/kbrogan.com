/* ============================================
   TouchDesigner-Inspired Interactive Visuals
   Green + Orange / Dark + Sleek + Weird
   ============================================ */

// ===== 3D Simplex Noise =====
const noise3D = (() => {
    const F3 = 1 / 3, G3 = 1 / 6;
    const grad3 = [
        [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
        [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
        [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ];
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
        const j = Math.random() * (i + 1) | 0;
        const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
    }
    const perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

    return function (x, y, z) {
        const s = (x + y + z) * F3;
        const i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
        const t = (i + j + k) * G3;
        const x0 = x - (i - t), y0 = y - (j - t), z0 = z - (k - t);

        let i1, j1, k1, i2, j2, k2;
        if (x0 >= y0) {
            if (y0 >= z0)      { i1=1;j1=0;k1=0;i2=1;j2=1;k2=0; }
            else if (x0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=0;k2=1; }
            else               { i1=0;j1=0;k1=1;i2=1;j2=0;k2=1; }
        } else {
            if (y0 < z0)       { i1=0;j1=0;k1=1;i2=0;j2=1;k2=1; }
            else if (x0 < z0)  { i1=0;j1=1;k1=0;i2=0;j2=1;k2=1; }
            else               { i1=0;j1=1;k1=0;i2=1;j2=1;k2=0; }
        }

        const x1 = x0-i1+G3,   y1 = y0-j1+G3,   z1 = z0-k1+G3;
        const x2 = x0-i2+2*G3, y2 = y0-j2+2*G3, z2 = z0-k2+2*G3;
        const x3 = x0-1+3*G3,  y3 = y0-1+3*G3,  z3 = z0-1+3*G3;
        const ii = i & 255, jj = j & 255, kk = k & 255;

        function c(gi, x, y, z) {
            let t = 0.6 - x*x - y*y - z*z;
            if (t < 0) return 0;
            t *= t;
            const g = grad3[perm[gi] % 12];
            return t * t * (g[0]*x + g[1]*y + g[2]*z);
        }

        return 32 * (
            c(ii + perm[jj + perm[kk]],             x0, y0, z0) +
            c(ii+i1 + perm[jj+j1 + perm[kk+k1]],   x1, y1, z1) +
            c(ii+i2 + perm[jj+j2 + perm[kk+k2]],   x2, y2, z2) +
            c(ii+1  + perm[jj+1  + perm[kk+1]],     x3, y3, z3)
        );
    };
})();


// ===== Full-Page Flow Field =====
(function initFlowField() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches;
    const COUNT = IS_TOUCH ? 250 : 650;
    const TRAIL_FADE = 0.032;

    let W, H;
    function resize() {
        // preserve existing trails on resize
        const img = ctx.getImageData(0, 0, canvas.width || 1, canvas.height || 1);
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, W, H);
        ctx.putImageData(img, 0, 0);
    }
    window.addEventListener('resize', resize);
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);

    let mx = -9999, my = -9999;
    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

    const COLORS = [
        [0, 255, 136],
        [0, 255, 136],
        [0, 255, 136],
        [255, 107, 0],
        [255, 170, 0],
    ];

    class P {
        constructor() { this.reset(); }
        reset() {
            this.x  = Math.random() * W;
            this.y  = Math.random() * H;
            this.ox = this.x;
            this.oy = this.y;
            this.speed = Math.random() * 2.2 + 0.4;
            const c = COLORS[Math.random() * COLORS.length | 0];
            this.cr = c[0]; this.cg = c[1]; this.cb = c[2];
            this.life = (Math.random() * 280 + 80) | 0;
            this.max  = this.life;
        }
        step(t) {
            this.ox = this.x;
            this.oy = this.y;
            const angle = noise3D(this.x * 0.0018, this.y * 0.0018, t * 0.00012) * Math.PI * 4;
            let vx = Math.cos(angle) * this.speed;
            let vy = Math.sin(angle) * this.speed;

            // Mouse attraction
            const dx = mx - this.x, dy = my - this.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < 300 && d > 1) {
                const f = (1 - d / 300) * 4;
                vx += (dx / d) * f;
                vy += (dy / d) * f;
            }

            this.x += vx;
            this.y += vy;
            this.life--;
            if (this.x < -20 || this.x > W + 20 || this.y < -20 || this.y > H + 20 || this.life <= 0) {
                this.reset();
            }
        }
        draw() {
            const a = (this.life / this.max) * 0.55;
            ctx.beginPath();
            ctx.moveTo(this.ox, this.oy);
            ctx.lineTo(this.x, this.y);
            ctx.strokeStyle = `rgba(${this.cr},${this.cg},${this.cb},${a})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }
    }

    const ps = [];
    for (let i = 0; i < COUNT; i++) ps.push(new P());

    let t = 0;
    (function loop() {
        ctx.fillStyle = `rgba(5,5,5,${TRAIL_FADE})`;
        ctx.fillRect(0, 0, W, H);
        t++;
        for (let i = 0; i < ps.length; i++) {
            ps[i].step(t);
            ps[i].draw();
        }
        requestAnimationFrame(loop);
    })();
})();


// ===== Custom Cursor =====
(function initCursor() {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const dot  = document.querySelector('.cursor-dot');
    const ring = document.querySelector('.cursor-ring');
    if (!dot || !ring) return;

    let cx = -100, cy = -100;
    let dx = -100, dy = -100;
    let rx = -100, ry = -100;

    document.addEventListener('mousemove', e => { cx = e.clientX; cy = e.clientY; });

    (function tick() {
        dx += (cx - dx) * 0.35;
        dy += (cy - dy) * 0.35;
        rx += (cx - rx) * 0.1;
        ry += (cy - ry) * 0.1;
        dot.style.transform  = `translate(${dx}px, ${dy}px)`;
        ring.style.transform = `translate(${rx}px, ${ry}px)`;
        requestAnimationFrame(tick);
    })();

    // Grow ring on interactive elements
    document.addEventListener('mouseover', e => {
        if (e.target.closest('a, button, .btn, .tilt-card')) {
            ring.style.width       = '64px';
            ring.style.height      = '64px';
            ring.style.marginLeft  = '-32px';
            ring.style.marginTop   = '-32px';
            ring.style.borderColor = 'rgba(255,107,0,0.55)';
        }
    });
    document.addEventListener('mouseout', e => {
        if (e.target.closest('a, button, .btn, .tilt-card')) {
            ring.style.width       = '';
            ring.style.height      = '';
            ring.style.marginLeft  = '';
            ring.style.marginTop   = '';
            ring.style.borderColor = '';
        }
    });
})();


// ===== 3D Card Tilt =====
(function initTilt() {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    document.querySelectorAll('.tilt-card').forEach(card => {
        // Inject glow layer
        const glow = document.createElement('div');
        glow.className = 'tilt-glow';
        card.appendChild(glow);

        card.addEventListener('mousemove', e => {
            const r  = card.getBoundingClientRect();
            const x  = e.clientX - r.left;
            const y  = e.clientY - r.top;
            const cx = r.width / 2, cy = r.height / 2;
            const rx = ((y - cy) / cy) * -7;
            const ry = ((x - cx) / cx) * 7;

            card.style.transform =
                `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
            card.style.transition = 'none';

            const px = (x / r.width * 100);
            const py = (y / r.height * 100);
            glow.style.background =
                `radial-gradient(circle at ${px}% ${py}%, rgba(0,255,136,0.12) 0%, transparent 55%)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transition = 'transform 0.5s cubic-bezier(0.22,1,0.36,1)';
            card.style.transform  = '';
            glow.style.background = '';
        });
    });
})();


// ===== Scroll Reveal =====
(function initReveal() {
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) e.target.classList.add('visible');
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
})();


// ===== Text Scramble =====
(function initScramble() {
    const chars = '!<>-_\\/[]{}—=+*^?#01';

    function scramble(el) {
        const final = el.textContent;
        const len = final.length;
        const maxFrames = 45;
        let frame = 0;

        function tick() {
            let out = '';
            for (let i = 0; i < len; i++) {
                const progress = frame / maxFrames;
                const threshold = i / len;
                if (progress > threshold + 0.3) {
                    out += final[i];
                } else if (progress > threshold - 0.15) {
                    out += '<span class="scramble-char">' +
                           chars[Math.random() * chars.length | 0] + '</span>';
                } else {
                    out += final[i];
                }
            }
            el.innerHTML = out;
            frame++;
            if (frame <= maxFrames) requestAnimationFrame(tick);
            else el.textContent = final; // clean up spans
        }
        tick();
    }

    // Hero heading: scramble on load
    const heroH1 = document.querySelector('.hero-card h1');
    if (heroH1) setTimeout(() => scramble(heroH1), 500);

    // Section headings: scramble when scrolled into view
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting && !e.target.dataset.scrambled) {
                e.target.dataset.scrambled = '1';
                scramble(e.target);
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.gradient-heading').forEach(el => obs.observe(el));
})();
