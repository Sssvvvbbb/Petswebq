// Carrusel de Instagram (sección Homenajes): lee /instagram.json, que actualiza
// el bot cada 12 h. Lo usan la home (inicio/Homenajes) y nosotros.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CARRUSEL DE INSTAGRAM
// Lee /instagram.json (generado cada 12 h por GitHub Actions).
// Muestra imágenes como <img> nativo — SEO real, sin iframes,
// sin SDK externo, carga instantánea.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function () {
    const container = document.getElementById('igSlidesContainer');
    const dotsEl    = document.getElementById('igDots');
    const prevBtn   = document.getElementById('igPrev');
    const nextBtn   = document.getElementById('igNext');
    const wrapEl    = document.getElementById('igCarouselWrap');
    if (!container) return;

    let igCurrent = 0;
    let igTotal   = 0;
    let igAutoplay;

    function igShowSlide(n) {
        const slides = container.querySelectorAll('.ig-slide');
        const dots   = dotsEl.querySelectorAll('.dot');
        if (!slides.length) return;
        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));
        igCurrent = (n + igTotal) % igTotal;
        slides[igCurrent].classList.add('active');
        dots[igCurrent].classList.add('active');
    }
    function startAutoplay() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; // sin avance automático
        igAutoplay = setInterval(() => igShowSlide(igCurrent + 1), 6500);
    }
    function stopAutoplay() { clearInterval(igAutoplay); }

    function buildCarousel(posts) {
        const isDesktop = () => window.innerWidth >= 769;

        // Función para crear el bloque de un post (imagen + caption)
        function makePostBlock(post, eager) {
            const postEl = document.createElement('div');
            postEl.className = 'ig-post';

            const imgWrap = document.createElement('div');
            imgWrap.className = 'ig-img-wrap';

            const link = document.createElement('a');
            link.href   = post.permalink;
            link.target = '_blank';
            link.rel    = 'noopener';
            link.style.cssText = 'display:block;line-height:0;height:100%;';

            const img = document.createElement('img');
            img.src      = post.src;
            img.alt      = post.alt || 'Homenaje en Instagram de PetsAlCielo — crematorio de mascotas en Puerto Montt';
            img.loading  = eager ? 'eager' : 'lazy';
            img.decoding = 'async';

            link.appendChild(img);
            imgWrap.appendChild(link);
            postEl.appendChild(imgWrap);

            if (post.caption) {
                const cap = document.createElement('div');
                cap.className = 'ig-caption';
                cap.textContent = post.caption;
                postEl.appendChild(cap);
            }
            return postEl;
        }

        // ── Desktop: slides de 2 posts agrupados ──
        // ── Mobile: slides de 1 post ──
        // Construimos ambas versiones y las alternamos con JS en resize.

        function build(desktop) {
            container.innerHTML = '';
            dotsEl.innerHTML = '';

            if (desktop) {
                // Agrupar de a 2
                const pairs = [];
                for (let i = 0; i < posts.length; i += 2) {
                    pairs.push([posts[i], posts[i + 1]].filter(Boolean));
                }
                igTotal = pairs.length;

                pairs.forEach((pair, i) => {
                    const slide = document.createElement('div');
                    slide.className = 'ig-slide' + (i === 0 ? ' active' : '');
                    slide.setAttribute('role', 'tabpanel');
                    slide.setAttribute('aria-label', 'Publicaciones ' + (i * 2 + 1) + '–' + (i * 2 + pair.length));

                    pair.forEach((post, j) => {
                        if (j === 1) {
                            const div = document.createElement('div');
                            div.className = 'ig-post-divider';
                            slide.appendChild(div);
                        }
                        slide.appendChild(makePostBlock(post, i === 0));
                    });

                    container.appendChild(slide);

                    const dot = document.createElement('button');
                    dot.className = 'dot' + (i === 0 ? ' active' : '');
                    dot.setAttribute('aria-label', 'Par de publicaciones ' + (i + 1));
                    dot.setAttribute('role', 'tab');
                    dot.addEventListener('click', () => { stopAutoplay(); igShowSlide(i); });
                    dotsEl.appendChild(dot);
                });

            } else {
                // Mobile: 1 post por slide
                igTotal = posts.length;
                posts.forEach((post, i) => {
                    const slide = document.createElement('div');
                    slide.className = 'ig-slide' + (i === 0 ? ' active' : '');
                    slide.setAttribute('role', 'tabpanel');
                    slide.setAttribute('aria-label', 'Publicación ' + (i + 1));
                    slide.style.cssText = 'position:absolute;inset:0;bottom:32px;display:flex;';

                    const imgWrap = document.createElement('div');
                    imgWrap.className = 'ig-img-wrap';
                    imgWrap.style.cssText = 'width:100%;height:100%;overflow:hidden;';
                    const link = document.createElement('a');
                    link.href   = post.permalink;
                    link.target = '_blank';
                    link.rel    = 'noopener';
                    link.style.cssText = 'display:block;width:100%;height:100%;line-height:0;';
                    const img = document.createElement('img');
                    img.src      = post.src;
                    img.alt      = post.alt || 'Homenaje en Instagram de PetsAlCielo — crematorio de mascotas en Puerto Montt';
                    img.loading  = i === 0 ? 'eager' : 'lazy';
                    img.decoding = 'async';
                    img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;';
                    link.appendChild(img);
                    imgWrap.appendChild(link);
                    slide.appendChild(imgWrap);
                    container.appendChild(slide);

                    const dot = document.createElement('button');
                    dot.className = 'dot' + (i === 0 ? ' active' : '');
                    dot.setAttribute('aria-label', 'Publicación ' + (i + 1));
                    dot.setAttribute('role', 'tab');
                    dot.addEventListener('click', () => { stopAutoplay(); igShowSlide(i); });
                    dotsEl.appendChild(dot);
                });

                // Mobile: altura fija basada en CSS (no sobreescribir con altura natural de imagen)
                // No hacemos nada: el CSS ya controla la altura del wrap.
            }

            igCurrent = 0;
        }

        // Construir según tamaño inicial
        let lastDesktop = isDesktop();
        build(lastDesktop);

        // Reconstruir si cambia entre mobile y desktop
        window.addEventListener('resize', () => {
            const d = isDesktop();
            if (d !== lastDesktop) {
                lastDesktop = d;
                stopAutoplay();
                build(d);
                startAutoplay();
            }
        });

        prevBtn.addEventListener('click', () => { stopAutoplay(); igShowSlide(igCurrent - 1); });
        nextBtn.addEventListener('click', () => { stopAutoplay(); igShowSlide(igCurrent + 1); });
        startAutoplay();
    }

    // Sin feed: enlace al perfil. Se arma con elementos y elemento.style (no con
    // style="..." en innerHTML, que la CSP bloquea).
    function showFallback() {
        wrapEl.style.minHeight = '180px';
        const slide = document.createElement('div');
        slide.className = 'ig-slide active';
        slide.style.cssText = 'flex-direction:column;gap:1rem;';
        const a = document.createElement('a');
        a.href = 'https://www.instagram.com/_petsalcielo/';
        a.target = '_blank';
        a.rel = 'noopener';
        a.style.cssText = "display:inline-flex;align-items:center;gap:0.5rem;background:linear-gradient(135deg,#f9c8a0,#e06090,#9060d0);color:white;text-decoration:none;font-family:'DM Sans',sans-serif;font-size:0.85rem;font-weight:500;padding:0.55rem 1.4rem;border-radius:50px;";
        a.textContent = 'Ver @_petsalcielo en Instagram ↗';
        slide.appendChild(a);
        container.replaceChildren(slide);
    }

    // Cargar instagram.json solo cuando la sección sea visible
    const igSection = document.getElementById('Biblioteca');
    const igObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            igObserver.disconnect();
            fetch('/instagram.json')
                .then(r => r.json())
                .then(data => {
                    const posts = data.posts || [];
                    if (posts.length === 0) { showFallback(); return; }
                    buildCarousel(posts);
                })
                .catch(() => showFallback());
        }
    }, { rootMargin: '200px' });
    if (igSection) igObserver.observe(igSection);
    else fetch('/instagram.json').then(r=>r.json()).then(d=>{ const p=d.posts||[]; if(!p.length){showFallback();return;} buildCarousel(p); }).catch(()=>showFallback());

})();
