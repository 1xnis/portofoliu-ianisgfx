// la reload browserul ar reveni la scroll-ul vechi; intro-ul și fundalul presupun că pornim de sus
history.scrollRestoration = "manual";
scrollTo(0, 0);
document.getElementById("year").textContent = new Date().getFullYear();

// Sclipirile din logo (doar în loading): [x%, y%, mărime în % din lățimea logo-ului], puse pe corpul literelor din logo.webp
const SPARKS = [[9.8, 14, 14], [32.8, 34.2, 14], [50, 34, 18], [69, 17, 11], [86.8, 22.8, 14], [9, 66, 10], [55, 72, 16], [79.5, 62.9, 10]];
const addSparks = (box) => SPARKS.forEach(([x, y, s], i) => {
  const el = document.createElement("i");
  el.className = "spark";
  el.style.cssText = `left:${x}%;top:${y}%;--s:${s}%;--t:${2 + (i % 3) * 0.7}s;--d:${-i * 0.55}s`;
  box.appendChild(el);
});

gsap.registerPlugin(ScrollTrigger, SplitText);
ScrollTrigger.clearScrollMemory("manual"); // altfel ScrollTrigger repune scrollRestoration pe "auto"
// animațiile de apariție rulează de fiecare dată când un element intră în ecran (în jos sau în sus), nu doar prima dată
ScrollTrigger.defaults({ toggleActions: "play reverse play reverse" });

// bara de sticlă din nav apare treptat, pe măsură ce dai scroll (0 sus, complet după 150px)
const nav = document.querySelector(".nav");
const setNav = () => nav.style.setProperty("--glass", Math.min(scrollY / 150, 1).toFixed(3));
setNav();
addEventListener("scroll", setNav, { passive: true });
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
let revealAbout = () => {}; // textul „Despre” (scrub la scroll); refăcut după schimbarea limbii
let aboutWords = [];
let heroRubik = { build() {}, revert() {} }; // titlul hero ca litere-cub (mai jos); refăcut după schimbarea limbii

if (reduce) {
  document.querySelector(".preloader").remove(); // bg.js își setează singur intensitatea în modul fără animații
} else {
  // Scroll lin
  const lenis = new Lenis();
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll('a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const href = a.getAttribute("href");
      if (href === "#contact") {
        // coborâm cât să se vadă toate canalele (inclusiv WhatsApp), nu doar începutul secțiunii
        const sec = document.querySelector("#contact").getBoundingClientRect();
        const list = document.querySelector(".contact__list").getBoundingClientRect();
        lenis.scrollTo(scrollY + Math.max(sec.top, list.bottom + 48 - innerHeight));
      } else lenis.scrollTo(href === "#top" ? 0 : href);
    })
  );

  // Liniile titlurilor glisează din mască: învelim conținutul fiecărei .line într-un span
  document.querySelectorAll(".line").forEach((l) => (l.innerHTML = `<span class="line__in" style="display:inline-block">${l.innerHTML}</span>`));

  // Intro: logo-ul cromat urcă dintr-o bucată cu o tăietură diagonală, trece o strălucire, apoi se „topește”:
  // cromul dispare și prin gaura în formă de logo din cortină se vede lichidul. Gaura crește până umple ecranul.
  const mark = document.querySelector(".preloader__mark");
  // sclipirile animate stau într-un strat separat, ca să apară abia după ce logo-ul a urcat
  const markSparks = document.createElement("div");
  // masca literelor: razele sclipirilor nu ies în afara textului
  markSparks.style.cssText = "position:absolute;inset:0;opacity:0;" +
    ["-webkit-mask", "mask"].map((p) => `${p}:url(logo-mask.webp) center / 100% 100% no-repeat`).join(";");
  mark.insertBefore(markSparks, mark.querySelector(".preloader__shine"));
  addSparks(markSparks);

  // Fundalul ecranului de încărcare: lumină roșie care respiră în spatele logo-ului + scântei care urcă
  const fx = document.createElement("canvas");
  fx.className = "preloader__fx";
  mark.before(fx);
  const ctx = fx.getContext("2d");
  const dpr = Math.min(devicePixelRatio, 2);
  const W = (fx.width = innerWidth * dpr), H = (fx.height = innerHeight * dpr);
  const ember = document.createElement("canvas"); // sprite pre-randat, mai ieftin decât shadowBlur
  ember.width = ember.height = 64;
  const eg = ember.getContext("2d"), grd = eg.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,240,230,1)"); grd.addColorStop(0.2, "rgba(255,110,80,.8)"); grd.addColorStop(1, "rgba(255,40,30,0)");
  eg.fillStyle = grd; eg.fillRect(0, 0, 64, 64);
  const parts = Array.from({ length: 110 }, () => ({
    x: Math.random() * W, y: Math.random() * H, v: (15 + Math.random() * 55) * dpr,
    r: (4 + Math.random() * 14) * dpr, p: Math.random() * 6.28, a: 0.25 + Math.random() * 0.75,
  }));
  let last = performance.now();
  const tick = (now) => {
    if (!fx.isConnected || fx.offsetParent === null) return; // preloader ascuns: oprim bucla
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    ctx.clearRect(0, 0, W, H);
    const pulse = 0.5 + 0.5 * Math.sin(now / 900);
    const aura = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.min(W, H) * (0.55 + 0.08 * pulse));
    aura.addColorStop(0, `rgba(170,20,30,${0.32 + 0.12 * pulse})`); aura.addColorStop(1, "rgba(14,10,10,0)");
    ctx.fillStyle = aura; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    for (const q of parts) {
      q.y -= q.v * dt; q.p += dt * 1.5; q.x += Math.sin(q.p) * 0.4 * dpr;
      if (q.y < -q.r) { q.y = H + q.r; q.x = Math.random() * W; }
      ctx.globalAlpha = q.a * (0.6 + 0.4 * Math.sin(q.p * 2)) * Math.min(1, q.y / (H * 0.3));
      ctx.drawImage(ember, q.x - q.r, q.y - q.r, q.r * 2, q.r * 2);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // Intrarea hero-ului: cuvintele urcă lin din masca fiecărui rând, apoi „viață” se colorează în roșu
  const heroLines = gsap.utils.toArray(".hero__line");
  const heroIn = gsap.timeline({ paused: true });
  heroLines.forEach((l, i) => {
    const words = new SplitText(l, { type: "words" }).words;
    gsap.set(words, { yPercent: 115 });
    heroIn.to(words, { yPercent: 0, duration: 1.5, stagger: 0.08, ease: "expo.out" }, i * 0.14);
  });
  heroIn.from(".hero__title em", { color: "#f5ede6", duration: 1.2, ease: "power2.inOut" }, 0.9);
  heroIn.eventCallback("onComplete", () => heroRubik.build());
  // rândurile se despart în direcții opuse la scroll
  heroLines.forEach((l, i) => gsap.to(l, {
    xPercent: i % 2 ? 14 : -14, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  }));

  // Titlul ca un cub Rubik: fiecare literă e un cub; mereu se rotește câte o „felie” de litere alăturate cu 90°,
  // pe verticală (sus/jos) sau pe orizontală (stânga/dreapta), ca straturile unui cub. Pe fața care vine e aceeași
  // literă, deci textul rămâne lizibil. Feliile aleg literele care nu s-au mai rotit de mult (se împart uniform),
  // mai multe se pot roti deodată, iar din când în când un val trece prin tot rândul. După rotire cubul revine
  // invizibil la 0° (fețele sunt identice).
  const heroTitle = document.querySelector(".hero__title");
  heroRubik = (() => {
    let rows = [], cubes = [], last = [], busy = [], timer;
    const live = new Set();
    const FACE = (c) => `<span class="rb__r"><span class="rb__f">${c}</span><span class="rb__f">${c}</span></span>`;
    // rotește cuburile `ids` pe axa X sau Y, în direcția d (±1); stagger > 0 = val
    const turn = (ids, axis, d, dur, stagger = 0) => {
      const fs = parseFloat(getComputedStyle(heroTitle).fontSize), now = performance.now();
      ids.forEach((id, k) => {
        busy[id] = true; last[id] = now;
        const r = cubes[id], [front, back] = r.children;
        // cubul se rotește în jurul centrului lui (adâncimea: înălțimea rândului pe X, lățimea literei pe Y)
        const D = axis === "X" ? fs * 0.42 : r.offsetWidth / 2;
        r.style.transformOrigin = `50% 50% ${-D}px`;
        back.style.transform = `translateZ(${-D}px) rotate${axis}(${-90 * d}deg) translateZ(${D}px)`;
        const st = { a: 0 };
        const tw = gsap.to(st, {
          a: 1, duration: dur, delay: k * stagger, ease: "power4.inOut",
          onUpdate: () => {
            r.style.transform = `rotate${axis}(${90 * d * st.a}deg)`;
            front.style.opacity = 1 - 0.8 * st.a; // fața care pleacă se umbrește, cea care vine se luminează
            back.style.opacity = 0.2 + 0.8 * st.a;
          },
          onComplete: () => {
            r.style.transform = r.style.transformOrigin = front.style.opacity = back.style.opacity = back.style.transform = "";
            busy[id] = false; live.delete(tw);
          },
        });
        live.add(tw);
      });
    };
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    // o felie de 1-5 litere libere, aleasă cu prioritate pentru literele rotite cel mai demult
    const slice = () => {
      const now = performance.now(), opts = [];
      rows.forEach((row) => {
        const len = Math.min(row.length, pick([1, 2, 2, 3, 3, 3, 4, 5]));
        for (let a = 0; a + len <= row.length; a++) {
          const ids = row.slice(a, a + len);
          if (ids.some((id) => busy[id])) continue;
          opts.push([ids, ids.reduce((w, id) => w + Math.min(now - last[id], 12000), 0) / len]);
        }
      });
      if (!opts.length) return;
      let x = Math.random() * opts.reduce((w, o) => w + o[1] ** 2, 0);
      const [ids] = opts.find((o) => (x -= o[1] ** 2) <= 0) || opts[0];
      turn(ids, Math.random() < 0.5 ? "X" : "Y", Math.random() < 0.5 ? 1 : -1, gsap.utils.random(0.65, 0.9));
    };
    // val: tot rândul se rotește literă cu literă (uneori ambele rânduri, în sensuri opuse)
    const wave = () => {
      const axis = Math.random() < 0.5 ? "X" : "Y", d = Math.random() < 0.5 ? 1 : -1;
      const both = Math.random() < 0.4, first = Math.floor(Math.random() * rows.length);
      rows.forEach((row, i) => {
        if (!both && i !== first) return;
        const ids = row.filter((id) => !busy[id]);
        turn(i % 2 ? ids.reverse() : ids, axis, i % 2 ? -d : d, 0.85, 0.045);
      });
    };
    let sinceWave = 0;
    const step = () => {
      if (++sinceWave > 9 && Math.random() < 0.35) { wave(); sinceWave = 0; } else slice();
      timer = gsap.delayedCall(gsap.utils.random(0.28, 0.6), step);
    };
    return {
      build() {
        if (rows.length) return;
        // fețele dublează literele: cititoarele de ecran primesc textul curat al rândurilor
        const lang = document.documentElement.lang;
        heroTitle.setAttribute("aria-label", gsap.utils.toArray(".hero__line").map((l) => (l.dataset[lang] ?? l.dataset.en).replace(/<[^>]+>/g, "")).join(" "));
        rows = gsap.utils.toArray(".hero__line").map((line) =>
          new SplitText(line, { type: "chars", charsClass: "rb" }).chars.map((c) => {
            c.innerHTML = FACE(c.textContent);
            cubes.push(c.firstChild); last.push(0); busy.push(false);
            return cubes.length - 1;
          }));
        heroTitle.classList.add("is-live");
        timer = gsap.delayedCall(0.4, step);
      },
      revert(lang) { // înainte de schimbarea limbii: textul simplu înapoi
        if (!rows.length) return;
        timer?.kill();
        live.forEach((t) => t.kill()); live.clear();
        gsap.utils.toArray(".hero__line").forEach((l) => (l.innerHTML = l.dataset[lang] ?? l.dataset.en));
        heroTitle.classList.remove("is-live");
        rows = []; cubes = []; last = []; busy = [];
      },
    };
  })();

  // Hover pe titlu: o pată lichidă cu dungi topografice roșu/negru (ca în referință) care se plimbă: un „cap” care
  // urmărește cursorul pe un resort (cu inerție) și o derivă proprie, trei picături care îl orbitează și se
  // despart / se contopesc cu el, și o coadă. Desenată în WebGL peste hero cu mix-blend-mode: multiply: pe litere
  // (deschise) modelul iese puternic, iar în afara lor, pe fundalul închis, curge mai discret - pata iese din text.
  const blobCv = document.createElement("canvas");
  const blob = matchMedia("(hover: hover)").matches && blobCv.getContext("webgl2", { antialias: false });
  if (blob) {
    blobCv.className = "hero__blob";
    blobCv.setAttribute("aria-hidden", "true");
    heroTitle.after(blobCv);
    const frag = `#version 300 es
      precision highp float;
      uniform vec2 res; uniform float t, dpr; uniform vec3 b[8];
      out vec4 o;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + 1.), f.x), f.y); }
      float fbm(vec2 p) { float v = 0., a = .5; for (int i = 0; i < 4; i++) { v += a * n(p); p = p * 2.03 + 1.7; a *= .5; } return v; }
      void main() {
        vec2 p = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y) / dpr; // px CSS, de sus-stânga
        float f = 0.;                                                 // metaballs: picăturile se contopesc
        for (int i = 0; i < 8; i++) { vec2 d = p - b[i].xy; f += b[i].z * b[i].z / (dot(d, d) + 1.); }
        f *= 1. + (n(p * .02 + t * .7) - .5) * .45;                   // marginea tremură ca un lichid
        float aa = fwidth(f);
        float m = smoothstep(1. - aa, 1. + aa, f);
        // dungi topografice: zgomot deformat de el însuși, tăiat în benzi care curg încet
        vec2 q = p / 160.;
        vec2 w = vec2(fbm(q + vec2(0., t * .05)), fbm(q + vec2(5.2, 1.3) - t * .05));
        float s = fbm(q * .9 + w * 1.7) * 10.;
        float g = fwidth(s) * 1.4;
        float band = smoothstep(.5 - g, .5 + g, abs(fract(s) - .5) * 2.);
        vec3 col = mix(vec3(1., .31, .27), vec3(.42, .1, .09), band); // în multiply: roșul aproape nu schimbă fundalul roșu, a doua dungă îl umbrește
        col *= mix(.82, 1., smoothstep(1., 1.6, f));                 // marginea puțin mai închisă: volum
        o = vec4(col * m, m);
      }`;
    const sh = (type, src) => { const x = blob.createShader(type); blob.shaderSource(x, src); blob.compileShader(x); return x; };
    const pr = blob.createProgram();
    blob.attachShader(pr, sh(blob.VERTEX_SHADER, "#version 300 es\nin vec2 a; void main() { gl_Position = vec4(a, 0, 1); }"));
    blob.attachShader(pr, sh(blob.FRAGMENT_SHADER, frag));
    blob.linkProgram(pr);
    blob.useProgram(pr);
    blob.bindBuffer(blob.ARRAY_BUFFER, blob.createBuffer());
    blob.bufferData(blob.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), blob.STATIC_DRAW);
    blob.enableVertexAttribArray(0);
    blob.vertexAttribPointer(0, 2, blob.FLOAT, false, 0, 0);
    const [uRes, uT, uDpr, uB] = ["res", "t", "dpr", "b"].map((nm) => blob.getUniformLocation(pr, nm));
    const DPR = Math.min(devicePixelRatio, 1.5);
    const fit = () => {
      blobCv.width = blobCv.offsetWidth * DPR; blobCv.height = blobCv.offsetHeight * DPR;
      blob.viewport(0, 0, blobCv.width, blobCv.height);
    };
    new ResizeObserver(fit).observe(blobCv);

    const mouse = { x: -1e4, y: -1e4 }, hot = { v: 0 }, head = { x: 0, y: 0, vx: 0, vy: 0 };
    const tail = Array.from({ length: 4 }, () => ({ x: 0, y: 0 }));
    const balls = new Float32Array(24);
    let inside = false, drawn = false;
    addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    document.addEventListener("pointerleave", () => (mouse.x = -1e4));
    gsap.ticker.add((time, dtMs) => {
      // activă cât cursorul e pe unul din rânduri
      const over = !swapping && gsap.utils.toArray(".hero__line").some((l) => {
        const r = l.getBoundingClientRect();
        return mouse.x > r.left && mouse.x < r.right && mouse.y > r.top && mouse.y < r.bottom;
      });
      const c = blobCv.getBoundingClientRect(), mx = mouse.x - c.left, my = mouse.y - c.top;
      if (over !== inside) {
        inside = over;
        if (over && hot.v < 0.02) { Object.assign(head, { x: mx, y: my, vx: 0, vy: 0 }); tail.forEach((p) => Object.assign(p, { x: mx, y: my })); }
        gsap.to(hot, { v: over ? 1 : 0, duration: over ? 0.9 : 1.2, ease: over ? "elastic.out(1, 0.75)" : "power3.inOut", overwrite: true });
      }
      if (hot.v < 0.002) { if (drawn) { blob.clear(blob.COLOR_BUFFER_BIT); drawn = false; } return; }
      const dt = Math.min(dtMs / 1000, 0.033), t = time;
      const R = parseFloat(getComputedStyle(heroTitle).fontSize) * 0.95;
      // capul: resort spre cursor + o derivă lentă proprie (pata se plimbă și când mouse-ul stă)
      const tx = mx + R * 0.5 * (Math.sin(t * 0.83) + 0.6 * Math.sin(t * 1.91 + 1.3));
      const ty = my + R * 0.32 * (Math.sin(t * 1.07 + 2.1) + 0.6 * Math.sin(t * 2.3));
      head.vx += ((tx - head.x) * 38 - head.vx * 8) * dt; head.vy += ((ty - head.y) * 38 - head.vy * 8) * dt;
      head.x += head.vx * dt; head.y += head.vy * dt;
      tail.forEach((p, i) => {
        const to = i ? tail[i - 1] : head, k = 1 - Math.exp(-dt * (14 - i * 2));
        p.x += (to.x - p.x) * k; p.y += (to.y - p.y) * k;
      });
      const put = (i, x, y, r) => { balls[i * 3] = x; balls[i * 3 + 1] = y; balls[i * 3 + 2] = Math.max(r * hot.v, 0); };
      put(0, head.x, head.y, R * 0.8);
      for (let i = 0; i < 3; i++) { // picăturile care orbitează, se depărtează și revin
        const a = t * (0.7 + i * 0.37) + i * 2.1, d = R * (0.6 + 0.45 * Math.sin(t * (0.9 + i * 0.31) + i));
        put(1 + i, head.x + Math.cos(a) * d * 1.3, head.y + Math.sin(a) * d * 0.8, R * (0.36 + 0.08 * Math.sin(t * 1.3 + i * 2)));
      }
      tail.forEach((p, i) => put(4 + i, p.x, p.y, R * (0.55 - i * 0.1)));
      blob.uniform2f(uRes, blobCv.width, blobCv.height);
      blob.uniform1f(uT, t); blob.uniform1f(uDpr, DPR);
      blob.uniform3fv(uB, balls);
      blob.drawArrays(blob.TRIANGLES, 0, 3);
      drawn = true;
    });
  }

  const curtain = document.querySelector(".preloader__curtain");
  const hole = { s: 1 };
  const setHole = () => {
    curtain.style.setProperty("--mw", mark.offsetWidth * hole.s + "px");
    curtain.classList.add("is-open");
  };
  lenis.stop();
  gsap.timeline()
    .from(fx, { opacity: 0, duration: 1.2, ease: "power2.out" }, 0)
    .to(".preloader__bar span", { scaleX: 1, duration: 2.6, ease: "power2.inOut" }, 0)
    .fromTo(".preloader__logo",
      { clipPath: "polygon(0% 0%, 0% 0%, -30% 100%, -30% 100%)", yPercent: 25 },
      { clipPath: "polygon(0% 0%, 130% 0%, 100% 100%, -30% 100%)", yPercent: 0, duration: 1.6, ease: "expo.inOut" }, 0.2)
    .to(markSparks, { opacity: 1, duration: 0.6, ease: "power2.out" }, 1.9)
    .to(".preloader__shine", { backgroundPosition: "-60% 0", duration: 1.3, ease: "power2.inOut" }, 1.3)
    // topirea: lichidul se aprinde în spatele literelor, cromul se stinge
    .addLabel("melt", 2.7)
    // prin gaura din logo se vede pagina: ne asigurăm că e sus, chiar dacă browserul a restaurat scroll-ul târziu
    .add(() => lenis.scrollTo(0, { immediate: true, force: true }), "melt")
    .add(setHole, "melt")
    .to(".preloader__bar", { opacity: 0, duration: 0.4 }, "melt")
    .to(bg, { k: 1.7, duration: 0.9, ease: "power2.out" }, "melt")
    .to(mark, { opacity: 0, duration: 0.9, ease: "power2.inOut" }, "melt+=0.15")
    .to(fx, { opacity: 0, duration: 0.9, ease: "power2.inOut" }, "melt")
    // zoom prin logo: gaura crește accelerat, lichidul se deschide și devine fundalul
    .addLabel("zoom", "melt+=1.2")
    .to(hole, { s: 40, duration: 1.6, ease: "expo.in", onUpdate: setHole }, "zoom")
    .to(curtain, { opacity: 0, duration: 0.5, ease: "power1.in" }, "zoom+=1.1")
    .to(bg, { k: 0.75, z: 1.4, duration: 2.6, ease: "expo.out" }, "zoom+=0.9")
    .set(".preloader", { display: "none" }, "zoom+=1.6")
    .add(() => heroIn.play(), "zoom+=1.1")
    .from([".nav", ".hero__lead", ".hero .btn"], { y: 40, opacity: 0, filter: "blur(10px)", duration: 1, stagger: 0.1, ease: "expo.out", clearProps: "filter" }, "zoom+=1.7")
    .add(() => lenis.start());

  // Textul "Despre" se aprinde cuvânt cu cuvânt
  // (cuvinte în mască, ca schimbarea limbii să le poată anima direct pe acestea)
  let about;
  revealAbout = () => {
    about?.revert(); // la schimbarea limbii: scoatem animația veche, textul e deja cel nou
    aboutWords = new SplitText(".reveal-words", { type: "words", mask: "words" }).words;
    about = gsap.context(() => gsap.fromTo(aboutWords, { opacity: 0.15 }, {
      opacity: 1, stagger: 0.1, ease: "none",
      scrollTrigger: { trigger: ".about__text", start: "top 80%", end: "bottom 45%", scrub: true },
    }));
    return aboutWords;
  };
  revealAbout();

  // Servicii și titluri apar la scroll
  gsap.utils.toArray(".step, .service, .work__title, .contact__lead, .contact__row").forEach((el) =>
    gsap.from(el, { y: 50, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 97%" } })
  );
  gsap.from(".contact__title .line > *", {
    yPercent: 110, duration: 1.1, stagger: 0.1, ease: "power4.out",
    scrollTrigger: { trigger: ".contact__title", start: "top 80%" },
  });

  // Lucrările: imaginea se deschide de jos în sus când intră în ecran, apoi apare textul de sub ea
  gsap.utils.toArray(".card").forEach((c) => {
    const st = { trigger: c, start: "top 85%" };
    gsap.from(c.querySelector(".card__media"), { clipPath: "inset(100% 0% 0% 0%)", duration: 1.3, ease: "expo.out", scrollTrigger: st });
    gsap.from(c.querySelector(".card__info"), { y: 24, opacity: 0, duration: 1, delay: 0.25, ease: "power3.out", scrollTrigger: st });
  });

  // Cursor rotund și butoane magnetice (doar cu mouse)
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const cur = document.querySelector(".cursor");
    document.documentElement.classList.add("has-cursor");
    const xTo = gsap.quickTo(cur, "x", { duration: 0.35, ease: "power3" });
    const yTo = gsap.quickTo(cur, "y", { duration: 0.35, ease: "power3" });
    addEventListener("mousemove", (e) => {
      if (!cur.style.opacity || cur.style.opacity === "0") gsap.set(cur, { x: e.clientX, y: e.clientY, opacity: 1 }); // apare la primul mouse move
      xTo(e.clientX); yTo(e.clientY);
    });
    document.addEventListener("mouseleave", () => gsap.set(cur, { opacity: 0 })); // mouse-ul a ieșit din fereastră
    document.querySelectorAll("a, .card").forEach((el) => {
      el.addEventListener("mouseenter", () => gsap.to(cur, { scale: el.classList.contains("card") ? 6 : 3, duration: 0.3 }));
      el.addEventListener("mouseleave", () => gsap.to(cur, { scale: 1, duration: 0.3 }));
    });
    document.querySelectorAll(".magnetic").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.4, duration: 0.4, ease: "power3.out" });
      });
      el.addEventListener("mouseleave", () => gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)" }));
    });
  }
}

// Schimbarea limbii, pe loc (fără reîncărcare): în ce se vede pe ecran, cuvintele vechi ies în sus din mască
// și cele noi urcă în locul lor, ca un val de sus în jos; textele din afara ecranului se schimbă direct.
// Textele: data-en / data-ro pe fiecare element (index.html).
const langBtn = document.querySelector(".lang");
let swapping = false;
// și textele care nu se traduc trec prin aceeași animație, ca tot ecranul să se miște unitar
const TEXTS = "[data-ro], .btn__label > span, .marquee__track span, .step__num, .step h3, .service__num, .service h3, " +
  ".card__media span, .card__info p, .contact__row span, .contact__row strong, .footer > span";
const setLangText = (el, lang) => {
  const t = el.querySelector(":scope > .line__in") || el; // titlurile .line au conținutul într-un înveliș animat
  el.dataset.en ??= t.innerHTML; // text fără traducere: îl ținem minte o dată, înainte de prima împărțire
  t.innerHTML = el.dataset[lang] ?? el.dataset.en;
  if (t.dataset.text) t.dataset.text = t.textContent; // butoanele: textul care urcă la hover
  return t;
};
const aboutEl = document.querySelector(".reveal-words"), marquee = document.querySelector(".marquee");
const splitWords = (el, lang) => new SplitText(setLangText(el, lang), { type: "words", mask: "words" }).words;
langBtn.addEventListener("click", () => {
  if (swapping) return;
  const from = document.documentElement.lang, to = from === "ro" ? "en" : "ro";
  heroRubik.revert(from);
  document.documentElement.lang = to;
  langBtn.setAttribute("aria-label", to === "ro" ? "Switch language to English" : "Schimbă limba în română");

  const onScreen = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight; };
  // și steluțele: banda e mutată cu -50% din lățimea ei, deci sare când se schimbă textul; nimic nu trebuie să se vadă atunci
  const marq = [...marquee.querySelector(".marquee__track").children];
  const marqShown = !reduce && onScreen(marquee);
  const all = [...document.querySelectorAll(TEXTS)].filter((el) => !marquee.contains(el));
  const shown = reduce ? [] : all.filter(onScreen);
  all.filter((el) => !shown.includes(el)).forEach((el) => setLangText(el, to));
  const marqText = marq.filter((el) => el.matches("span"));
  if (!marqShown) marqText.forEach((el) => setLangText(el, to));
  const done = () => { if (!shown.includes(aboutEl)) revealAbout(); heroRubik.build(); ScrollTrigger.refresh(); swapping = false; };
  let left = shown.length + (marqShown ? 1 : 0);
  if (!left) return done();
  const finish = () => --left || done();

  swapping = true;
  // fiecare element intră imediat ce a ieșit (nu așteaptă restul), cu mică întârziere față de cel de deasupra.
  // Ieșirea e dreaptă și pornește imediat (rotit, un colț rămânea în mască; un ease lent părea blocat).
  shown.forEach((el, i) => {
    const old = splitWords(el, from);
    // „Despre”: cuvintele pleacă cu culoarea dată de scroll, iar cele noi intră direct în efectul de scroll
    if (el === aboutEl) old.forEach((w, k) => (w.style.opacity = aboutWords[k]?.style.opacity ?? ""));
    gsap.to(old, {
      yPercent: -120, duration: 0.26, stagger: 0.008, ease: "power1.in", delay: i * 0.02,
      onComplete: () => {
        const fresh = el === aboutEl ? (setLangText(el, to), revealAbout()) : splitWords(el, to);
        gsap.from(fresh, { yPercent: 120, rotate: 6, duration: 0.7, stagger: 0.014, ease: "expo.out", onComplete: finish });
      },
    });
  });

  // banda care curge: cuvintele ies pe rând, iar textul (cu altă lățime) se schimbă abia când toate sunt ascunse,
  // altfel banda sare în timp ce se mișcă
  // (deplasare cât toată banda: steluțele sunt mici și altfel ar rămâne vizibile)
  const h = marquee.offsetHeight;
  if (marqShown) gsap.to(marq, {
    y: -h, duration: 0.28, stagger: 0.01, ease: "power1.in",
    onComplete: () => {
      marqText.forEach((el) => setLangText(el, to));
      gsap.fromTo(marq, { y: h }, { y: 0, duration: 0.7, stagger: 0.01, ease: "expo.out", onComplete: finish });
    },
  });
});
