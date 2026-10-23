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
let lenisRef = null; // scroll-ul lin (lipsește fără animații); oprit cât e deschis portofoliul unei categorii
let refreshCursor = () => {}; // cercul cursorului își recalculează forma după ce ceva apare/dispare sub mouse
let heroRubik = { build() {}, revert() {} }; // titlul hero ca litere-cub (mai jos); refăcut după schimbarea limbii
let introDone = Promise.resolve(); // munca grea (pozele din Showcase, site-ul din telefon) așteaptă finalul intro-ului

if (reduce) {
  document.querySelector(".preloader").remove(); // bg.js își setează singur intensitatea în modul fără animații
} else {
  // Scroll lin
  const lenis = (lenisRef = new Lenis());
  // pe telefon bara de adresă apare/dispare la scroll și schimbă înălțimea ferestrei: fără asta, toate animațiile
  // de scroll s-ar recalcula de fiecare dată (sacadat)
  ScrollTrigger.config({ ignoreMobileResize: true });
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
  // rar, câte 1-2 litere alăturate sau 2-3 litere răzlețe deodată (fiecare pe axa ei). După rotire cubul revine
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
    // o felie de 1-2 litere libere, aleasă cu prioritate pentru literele rotite cel mai demult
    const slice = () => {
      const now = performance.now(), opts = [];
      rows.forEach((row) => {
        const len = Math.min(row.length, pick([1, 1, 2]));
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
    // 2-3 litere singure, din părți diferite ale textului, deodată - fiecare cu axa și sensul ei
    const scatter = () => {
      const ids = [], n = Math.random() < 0.6 ? 2 : 3;
      for (const id of gsap.utils.shuffle(cubes.map((_, i) => i)))
        if (ids.length < n && !busy[id] && ids.every((j) => Math.abs(j - id) > 3)) ids.push(id);
      ids.forEach((id) => turn([id], Math.random() < 0.5 ? "X" : "Y", Math.random() < 0.5 ? 1 : -1, gsap.utils.random(0.65, 0.9)));
    };
    const step = () => {
      Math.random() < 0.35 ? scatter() : slice();
      timer = gsap.delayedCall(gsap.utils.random(2, 3.5), step);
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
        showCookie();
        timer = gsap.delayedCall(1, step);
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

  // Hover pe titlu: o pată lichidă care e o fereastră spre „interiorul” textului: prin ea se văd aceleași litere,
  // mărite (zoom spre spate, mai mult în centru, ca o lentilă) și umplute cu dungi topografice roșii, pe un fond
  // adânc care se întunecă spre margini. Pata = un „cap” pe un resort spre cursor (amortizat, fără oscilații),
  // trei picături care îl orbitează și o coadă. Când cursorul iese de pe text, pata rămâne pe loc și se strânge.
  const blobCv = document.createElement("canvas");
  const blob = matchMedia("(hover: hover)").matches && blobCv.getContext("webgl2", { antialias: false });
  if (blob) {
    blobCv.className = "hero__blob";
    blobCv.setAttribute("aria-hidden", "true");
    heroTitle.after(blobCv);
    const frag = `#version 300 es
      precision highp float;
      uniform vec2 res, c; uniform float t, dpr, z, R; uniform vec3 b[8]; uniform sampler2D tx;
      out vec4 o;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + 1.), f.x), f.y); }
      float fbm(vec2 p) { float v = 0., a = .5; for (int i = 0; i < 4; i++) { v += a * n(p); p = p * 2.03 + 1.7; a *= .5; } return v; }
      void main() {
        vec2 p = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y) / dpr; // px CSS, de sus-stânga
        float md = 1e9;                                               // departe de toate picăturile: nimic de desenat (ieftin)
        for (int i = 0; i < 8; i++) md = min(md, length(p - b[i].xy) - b[i].z);
        if (md > R * 2.4) { o = vec4(0); return; }
        // spațiul e deformat de un zgomot lent și moale: picăturile rotunde devin o formă lichidă, cu lobi care curg
        vec2 wq = p / (R * 2.6);
        vec2 wp = p + (vec2(n(wq + vec2(0., t * .22)) + .5 * n(wq * 1.9 + t * .3),
                            n(wq + vec2(7.3, 2.1) - t * .2) + .5 * n(wq * 1.9 + 4.4 - t * .3)) - .75) * R * 1.1;
        float f = 0.;                                                 // metaballs: picăturile se contopesc
        for (int i = 0; i < 8; i++) { vec2 d = wp - b[i].xy; f += b[i].z * b[i].z / (dot(d, d) + 1.); }
        float aa = fwidth(f);
        float m = smoothstep(1. - aa, 1. + aa, f);
        if (m <= 0.) { o = vec4(0); return; }
        float deep = smoothstep(1., 2.6, f);                          // 0 pe margine, 1 în miez
        // interiorul: textul mărit spre centrul petei, puțin unduit
        vec2 iq = c + (p - c) / (z * (1. + .12 * deep));
        iq += (vec2(n(p * .012 + t * .3), n(p * .012 - t * .3 + 4.)) - .5) * 12.;
        float txt = texture(tx, iq * dpr / res).a;
        // dungi topografice: zgomot deformat de el însuși, tăiat în benzi care curg încet
        vec2 q = iq / 140.;
        vec2 w = vec2(fbm(q + vec2(0., t * .05)), fbm(q + vec2(5.2, 1.3) - t * .05));
        float s = fbm(q * .9 + w * 1.7) * 10.;
        float g = fwidth(s) * 1.4;
        float band = smoothstep(.5 - g, .5 + g, abs(fract(s) - .5) * 2.);
        vec3 ink = mix(vec3(.95, .22, .17), vec3(.36, .05, .04), band);
        vec3 col = mix(vec3(.035, .012, .012), ink, txt);
        col *= mix(.3, 1., deep);                                     // marginile mai întunecate: adâncime
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
    const [uRes, uT, uDpr, uB, uC, uZ, uR] = ["res", "t", "dpr", "b", "c", "z", "R"].map((nm) => blob.getUniformLocation(pr, nm));
    const DPR = Math.min(devicePixelRatio, 1.5);
    // textura cu literele titlului, desenate exact unde sunt pe ecran; refăcută doar când se mută (scroll, resize)
    blob.bindTexture(blob.TEXTURE_2D, blob.createTexture());
    blob.texParameteri(blob.TEXTURE_2D, blob.TEXTURE_MIN_FILTER, blob.LINEAR);
    blob.texParameteri(blob.TEXTURE_2D, blob.TEXTURE_WRAP_S, blob.CLAMP_TO_EDGE);
    blob.texParameteri(blob.TEXTURE_2D, blob.TEXTURE_WRAP_T, blob.CLAMP_TO_EDGE);
    const tc = document.createElement("canvas"), tg = tc.getContext("2d");
    let txKey = "";
    const paintText = (c) => {
      const chars = [...heroTitle.querySelectorAll(".rb")], rs = chars.map((ch) => ch.getBoundingClientRect());
      const key = blobCv.width + "x" + blobCv.height + rs.map((r) => Math.round(r.left - c.left) + "," + Math.round(r.top - c.top)).join();
      if (key === txKey) return;
      txKey = key;
      tc.width = blobCv.width; tc.height = blobCv.height;
      const cs = getComputedStyle(heroTitle);
      tg.setTransform(DPR, 0, 0, DPR, 0, 0);
      tg.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const fm = tg.measureText("H"), A = fm.fontBoundingBoxAscent, D = fm.fontBoundingBoxDescent;
      chars.forEach((ch, i) => tg.fillText(ch.querySelector(".rb__f").textContent.toUpperCase(),
        rs[i].left - c.left, rs[i].top - c.top + (rs[i].height - A - D) / 2 + A));
      blob.texImage2D(blob.TEXTURE_2D, 0, blob.RGBA, blob.RGBA, blob.UNSIGNED_BYTE, tc);
    };
    const fit = () => {
      blobCv.width = blobCv.offsetWidth * DPR; blobCv.height = blobCv.offsetHeight * DPR;
      blob.viewport(0, 0, blobCv.width, blobCv.height);
    };
    new ResizeObserver(fit).observe(blobCv);
    // un desen gol la pornire: driverul compilează shaderul acum, nu la primul hover (altfel prima apariție sacadează)
    blob.drawArrays(blob.TRIANGLES, 0, 3);
    blob.clear(blob.COLOR_BUFFER_BIT);

    const mouse = { x: -1e4, y: -1e4 }, aim = { x: 0, y: 0 }, hot = { v: 0 }, head = { x: 0, y: 0, vx: 0, vy: 0 };
    const tail = Array.from({ length: 4 }, () => ({ x: 0, y: 0 }));
    const balls = new Float32Array(24);
    let inside = false, drawn = false, moved = 0, act = 0, mt = 0;
    addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; moved = performance.now(); }, { passive: true });
    document.addEventListener("pointerleave", () => (mouse.x = -1e4));
    gsap.ticker.add((time, dtMs) => {
      // activă cât cursorul e pe unul din rânduri
      // (abia după ce s-a terminat intrarea titlului, adică după loading screen)
      const over = !swapping && heroTitle.classList.contains("is-live") && gsap.utils.toArray(".hero__line").some((l) => {
        const r = l.getBoundingClientRect();
        return mouse.x > r.left && mouse.x < r.right && mouse.y > r.top && mouse.y < r.bottom;
      });
      const c = blobCv.getBoundingClientRect();
      if (over) { aim.x = mouse.x - c.left; aim.y = mouse.y - c.top; } // în afara textului ținta rămâne pe loc
      const want = over && performance.now() - moved < 700; // cursorul stă pe loc: pata se strânge și dispare
      if (want !== inside) {
        inside = want;
        if (want && hot.v < 0.02) { Object.assign(head, { x: aim.x, y: aim.y, vx: 0, vy: 0 }); tail.forEach((p) => Object.assign(p, aim)); }
        gsap.to(hot, { v: want ? 1 : 0, duration: want ? 0.3 : 0.5, ease: want ? "power2.out" : "power2.inOut", overwrite: true });
      }
      if (!txKey && heroTitle.classList.contains("is-live")) paintText(c); // textura gata înainte de primul hover
      if (hot.v < 0.002) { if (drawn) { blob.clear(blob.COLOR_BUFFER_BIT); drawn = false; } return; }
      paintText(c);
      const dt = Math.min(dtMs / 1000, 0.033);
      // timpul petei curge doar cât se mișcă cursorul: când stă pe loc, pata se liniștește și îngheață
      act += ((performance.now() - moved < 150 ? 1 : 0) - act) * (1 - Math.exp(-dt * 2.5));
      const t = (mt += dt * act);
      const R = parseFloat(getComputedStyle(heroTitle).fontSize) * 0.6;
      // capul: resort amortizat critic spre cursor + o derivă proprie (doar în mișcare)
      const tx = aim.x + R * 0.3 * (Math.sin(t * 0.6) + 0.6 * Math.sin(t * 1.3 + 1.3));
      const ty = aim.y + R * 0.2 * (Math.sin(t * 0.75 + 2.1) + 0.6 * Math.sin(t * 1.6));
      head.vx += ((tx - head.x) * 14 - head.vx * 7.5) * dt; head.vy += ((ty - head.y) * 14 - head.vy * 7.5) * dt;
      head.x += head.vx * dt; head.y += head.vy * dt;
      tail.forEach((p, i) => {
        const to = i ? tail[i - 1] : head, k = 1 - Math.exp(-dt * (5 - i * 0.8)); // coada rămâne în urmă: pata se alungește și curge
        p.x += (to.x - p.x) * k; p.y += (to.y - p.y) * k;
      });
      const put = (i, x, y, r) => { balls[i * 3] = x; balls[i * 3 + 1] = y; balls[i * 3 + 2] = Math.max(r * hot.v, 0); };
      put(0, head.x, head.y, R * 0.8);
      for (let i = 0; i < 3; i++) { // picăturile care orbitează, se depărtează și revin
        const a = t * (0.45 + i * 0.2) + i * 2.1, d = R * (0.6 + 0.4 * Math.sin(t * (0.6 + i * 0.2) + i));
        put(1 + i, head.x + Math.cos(a) * d * 1.3, head.y + Math.sin(a) * d * 0.8, R * (0.36 + 0.08 * Math.sin(t * 1.3 + i * 2)));
      }
      tail.forEach((p, i) => put(4 + i, p.x, p.y, R * (0.55 - i * 0.1)));
      blob.uniform2f(uRes, blobCv.width, blobCv.height);
      blob.uniform1f(uT, t); blob.uniform1f(uDpr, DPR); blob.uniform1f(uR, R);
      blob.uniform2f(uC, head.x, head.y); blob.uniform1f(uZ, 1 + 0.4 * hot.v); // zoom-ul crește cât se deschide pata
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
  const intro = gsap.timeline({ paused: true })
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
  introDone = new Promise((r) => intro.eventCallback("onComplete", r));
  // pornește după fonturi (max 0.8 s) și după primele cadre grele de la încărcare, altfel logo-ul sacadează la urcare
  Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 800))])
    .then(() => requestAnimationFrame(() => requestAnimationFrame(() => intro.play())));

  // Titluri și rânduri care apar la scroll
  gsap.utils.toArray(".work__title, .contact__lead, .contact__row").forEach((el) =>
    gsap.from(el, { y: 50, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 97%" } })
  );

  // Servicii pe ecrane late: pagina curge normal; fiecare card vine de jos, din adâncime, ușor înclinat spre latura lui
  // (legat de scroll, deci nu oprește nimic), apoi îi urcă textele. Simbolul 3D îl urmează singur (svx3d.js). Pe telefon doar urcă.
  const svcCards = gsap.utils.toArray(".svc__card");
  const svcText = (c) => c.querySelectorAll(".svc__top, h3, .svc__desc, .svc__list li, .svc__cta");
  // (gsap.matchMedia: la trecerea peste prag, de ex. la rotirea ecranului, animația potrivită o înlocuiește pe cealaltă)
  const svcMM = gsap.matchMedia();
  svcMM.add("(min-width: 861px)", () => {
    svcCards.forEach((c, i) => {
      const side = [-1, 1, 0][i]; // stânga, dreapta, mijloc
      gsap.fromTo(c, { y: 110, z: -180, rotationX: 14, rotationY: side * -10, rotation: side * 2.5, opacity: 0 },
        { y: 0, z: 0, rotationX: 0, rotationY: 0, rotation: 0, opacity: 1, ease: "power2.out",
          scrollTrigger: { trigger: c, start: "top bottom", end: "top 78%", scrub: 0.8 } });
      // textele pornesc cât cardul abia intră, ca titlul următorului serviciu să fie deja citibil jos
      gsap.from(svcText(c), { y: 30, opacity: 0, duration: 1, stagger: 0.06, ease: "expo.out", scrollTrigger: { trigger: c, start: "top 92%" } });
      ScrollTrigger.create({ trigger: c, start: "top 55%", end: "bottom 45%", toggleClass: "is-on" });
    });
    // după ultimul card simbolul se stinge, ca să nu urce peste Showcase
    gsap.to(".svx-wrap", { opacity: 0, ease: "none", scrollTrigger: { trigger: ".svc", start: "bottom 95%", end: "bottom 55%", scrub: true } });
  });
  svcMM.add("(max-width: 860px)", () => svcCards.forEach((c) => {
    gsap.from(c, { y: 70, opacity: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: c, start: "top 90%" } });
    gsap.from(svcText(c), { y: 24, opacity: 0, duration: 0.9, stagger: 0.05, ease: "expo.out", scrollTrigger: { trigger: c, start: "top 75%" } });
  }));
  // Despre: pe ecrane late prisma umple ecranul, iar pagina curge normal (fără fixare). Cât secțiunea intră în ecran,
  // legat de scroll: lumina se aprinde (prism.grow: fasciculul, raza din sticlă, evantaiul), urcă textul din stânga,
  // descrierea din triunghi e „scanată” de sus în jos (--r) după ce raza trece prin sticlă, apoi etichetele de pe raze.
  // Pe telefon: la intrarea în ecran.
  const aboutEl = document.querySelector(".about"), rayEls = gsap.utils.toArray(".prism__ray");
  const aboutMM = gsap.matchMedia();
  aboutMM.add("(min-width: 861px)", () => {
    aboutEl.classList.add("is-wide");
    gsap.timeline({ defaults: { ease: "power3.out" }, scrollTrigger: { trigger: ".prism", start: "top 90%", end: "bottom 95%", scrub: 0.8 } })
      .fromTo(prism, { grow: 0 }, { grow: 1, duration: 1.4, ease: "none" }, 0)
      .from(".prism__lead", { y: 50, opacity: 0, duration: 0.6 }, 0.2)
      .fromTo(".prism__glass", { "--r": "0%", "--l": 1 }, { "--r": "100%", duration: 0.6, ease: "none" }, 0.85)
      .to(".prism__glass", { "--l": 0, duration: 0.1, ease: "none" }, 1.35)
      .fromTo(rayEls, { "--s": 0 }, { "--s": 1, stagger: 0.12, duration: 0.5, ease: "power2.inOut" }, 1.0)
      .from(rayEls.map((r) => r.children), { y: 24, opacity: 0, stagger: 0.04, duration: 0.4 }, 1.1);
    return () => { aboutEl.classList.remove("is-wide"); prism.grow = 1; };
  });
  aboutMM.add("(max-width: 860px)", () => {
    gsap.timeline({ scrollTrigger: { trigger: ".prism__cv", start: "top 75%", toggleActions: "play none none none" } })
      .fromTo(prism, { grow: 0.08 }, { grow: 1, duration: 2.2, ease: "power1.inOut" });
    gsap.from([".prism__lead", ".prism__sub", ...rayEls], { y: 40, opacity: 0, stagger: 0.12, duration: 1, ease: "expo.out", scrollTrigger: { trigger: ".prism", start: "top 80%" } });
  });

  svcCards.forEach((c) => {
    // lumina de pe card urmărește mouse-ul (doar variabile CSS, fără re-layout)
    c.addEventListener("pointermove", (e) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty("--mx", e.clientX - r.left + "px");
      c.style.setProperty("--my", e.clientY - r.top + "px");
    });
  });

  // Showcase: fiecare card urcă (doar transform și opacitate, ieftine), scena din el se așază dintr-un zoom,
  // apoi urcă textele; cardurile vin unul după altul
  const showIn = gsap.timeline({ scrollTrigger: { trigger: ".show", start: "top 80%" } });
  gsap.utils.toArray(".show__card").forEach((c, i) => showIn
    .fromTo(c, { y: 120, opacity: 0 }, { y: 0, opacity: 1, duration: 1.4, ease: "expo.out", clearProps: "transform,opacity" }, i * 0.12)
    .fromTo(c.querySelector(".show__stage"), { scale: 1.35 }, { scale: 1, duration: 1.8, ease: "expo.out", clearProps: "transform" }, i * 0.14 + 0.2)
    .fromTo(c.querySelectorAll(".show__head > *, .show__foot > *"), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.06, ease: "power3.out", clearProps: "transform,opacity" }, i * 0.14 + 0.55));

  // Cursor rotund și butoane magnetice (doar cu mouse)
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const cur = document.querySelector(".cursor");
    document.documentElement.classList.add("has-cursor");
    const xTo = gsap.quickTo(cur, "x", { duration: 0.35, ease: "power3" });
    const yTo = gsap.quickTo(cur, "y", { duration: 0.35, ease: "power3" });
    // forma cursorului e calculată din ce e sub mouse la fiecare mișcare (nu din intrări/ieșiri, care se pierd când
    // un element dispare sau e acoperit, de ex. de galerie): peste poza site-ului și peste galerii cercul dispare și
    // apare o săgeată mică ↗, peste linkuri cercul crește. Tween-urile de mărime nu au voie să le oprească pe cele de
    // poziție (quickTo).
    const tag = document.querySelector(".cursor-tag");
    const tX = gsap.quickTo(tag, "x", { duration: 0.35, ease: "power3" });
    const tY = gsap.quickTo(tag, "y", { duration: 0.35, ease: "power3" });
    let curMode = "";
    const setMode = (t) => {
      const icon = t?.closest?.("[data-cursor]"), mode = icon ? icon.dataset.cursor : t?.closest?.("a") ? "link" : "";
      if (mode === curMode) return;
      curMode = mode;
      gsap.to(cur, { scale: icon ? 0 : mode ? 3 : 1, duration: 0.5, ease: "expo.out", overwrite: "auto" });
      gsap.to(tag, icon ? { scale: 1, rotation: 0, opacity: 1, duration: 0.5, ease: "expo.out", overwrite: "auto" }
        : { scale: 0.4, rotation: -45, opacity: 0, duration: 0.25, ease: "power2.out", overwrite: "auto" });
    };
    let mx = -1, my = -1;
    refreshCursor = () => setMode(document.elementFromPoint(mx, my));
    addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      if (!cur.style.opacity || cur.style.opacity === "0") gsap.set(cur, { x: e.clientX, y: e.clientY, opacity: 1 }); // apare la primul mouse move
      if (!tag.style.transform) gsap.set(tag, { x: e.clientX, y: e.clientY, scale: 0.4, rotation: -45 });
      xTo(e.clientX); yTo(e.clientY); tX(e.clientX); tY(e.clientY);
      setMode(e.target);
    });
    // un click poate schimba ce e sub mouse fără mișcare (galeria se deschide, pagina categoriei se închide)
    addEventListener("click", () => requestAnimationFrame(refreshCursor));
    document.addEventListener("mouseleave", () => { gsap.set([cur, tag], { opacity: 0 }); curMode = "-"; }); // mouse-ul a ieșit din fereastră
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
const TEXTS = "[data-ro], .btn__label > span, .svc__list li, " +
  ".contact__row span, .contact__row strong, .footer > span";
const setLangText = (el, lang) => {
  const t = el.querySelector(":scope > .line__in") || el; // titlurile .line au conținutul într-un înveliș animat
  el.dataset.en ??= t.innerHTML; // text fără traducere: îl ținem minte o dată, înainte de prima împărțire
  t.innerHTML = el.dataset[lang] ?? el.dataset.en;
  if (t.dataset.text) t.dataset.text = t.textContent; // butoanele: textul care urcă la hover
  return t;
};
const splitWords = (el, lang) => new SplitText(setLangText(el, lang), { type: "words", mask: "words" }).words;
langBtn.addEventListener("click", () => {
  if (swapping) return;
  const from = document.documentElement.lang, to = from === "ro" ? "en" : "ro";
  heroRubik.revert(from);
  document.documentElement.lang = to;
  document.querySelectorAll(".lang").forEach((b) => b.setAttribute("aria-label", to === "ro" ? "Switch language to English" : "Schimbă limba în română"));

  const onScreen = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight; };
  const all = [...document.querySelectorAll(TEXTS)];
  const shown = reduce ? [] : all.filter(onScreen);
  all.filter((el) => !shown.includes(el)).forEach((el) => setLangText(el, to));
  const done = () => { heroRubik.build(); ScrollTrigger.refresh(); swapping = false; };
  let left = shown.length;
  if (!left) return done();
  const finish = () => --left || done();

  swapping = true;
  // fiecare element intră imediat ce a ieșit (nu așteaptă restul), cu mică întârziere față de cel de deasupra.
  // Ieșirea e dreaptă și pornește imediat (rotit, un colț rămânea în mască; un ease lent părea blocat).
  shown.forEach((el, i) => {
    const old = splitWords(el, from);
    gsap.to(old, {
      yPercent: -120, duration: 0.26, stagger: 0.008, ease: "power1.in", delay: i * 0.02,
      onComplete: () => {
        const fresh = splitWords(el, to);
        gsap.from(fresh, { yPercent: 120, rotate: 6, duration: 0.7, stagger: 0.014, ease: "expo.out", onComplete: finish });
      },
    });
  });
});

// Cookie-uri și informații legale. Bannerul apare o singură dată, după intrarea titlului; alegerea stă în localStorage
// (poate lipsi, de ex. în fereastră privată: atunci bannerul pur și simplu reapare)
const cookieBar = document.querySelector(".cookie"), legal = document.querySelector(".legal");
function showCookie() {
  try { if (localStorage.getItem("cookies")) return; } catch {}
  setTimeout(() => cookieBar.classList.add("is-in"), 600);
}
cookieBar.querySelector(".cookie__ok").addEventListener("click", () => {
  try { localStorage.setItem("cookies", "ok"); } catch {}
  cookieBar.classList.remove("is-in");
});
// fereastra stă în „top layer”, deasupra oricărui z-index: cursorul rotund e mutat în ea cât e deschisă, altfel nu s-ar vedea
const cursorEl = document.querySelector(".cursor");
document.querySelectorAll("[data-legal]").forEach((b) => b.addEventListener("click", () => { legal.showModal(); legal.append(cursorEl); }));
legal.querySelector(".legal__close").addEventListener("click", () => legal.close()); // se închide doar din X
legal.addEventListener("cancel", (e) => e.preventDefault()); // nici cu Esc
legal.addEventListener("close", () => document.body.prepend(cursorEl));
if (reduce) showCookie();



// ——— Showcase ———
const work = document.querySelector(".work"), track = work.querySelector(".show");
const showCards = [...track.querySelectorAll(".show__card")], dots = [...work.querySelectorAll(".show__dots i")];
const cat = document.querySelector(".cat"), catPages = [...cat.querySelectorAll(".cat__page")];
// în pagina categoriei, același comutator RO/EN ca în meniu (apasă butonul din meniu)
const catLang = langBtn.cloneNode(true);
catLang.querySelector("clipPath")?.removeAttribute("id"); // steagul din copie folosește clipPath-ul din meniu
catLang.addEventListener("click", () => langBtn.click());
cat.querySelector(".cat__actions").prepend(catLang);

// Mockup-urile foto: scena (poza clară) e mărită cât cere data-zoom și centrată pe dispozitiv, fără margini goale când
// e mai mare decât cardul. Ecranul nostru (site-ul în iframe, interfața Premiere) e întins peste ecranul din poză
// cu o homografie: dreptunghiul ecranului → cele 4 colțuri măsurate în poză (data-quad, în pixelii pozei).
const quadMatrix = (w, h, q) => {
  const A = [], v = [];
  [[0, 0], [w, 0], [w, h], [0, h]].forEach(([x, y], i) => {
    const [X, Y] = q[i];
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]); v.push(X);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]); v.push(Y);
  });
  for (let c = 0; c < 8; c++) { // eliminare Gauss cu pivot
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p], v[c], v[p]] = [A[p], A[c], v[p], v[c]];
    for (let r = 0; r < 8; r++) if (r !== c) {
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
      v[r] -= f * v[c];
    }
  }
  const [a, b, c, d, e, f, g, k] = v.map((x, i) => x / A[i][i]);
  return [a, d, 0, g, b, e, 0, k, 0, 0, 1, 0, c, f, 0, 1]; // ordinea din matrix3d (pe coloane)
};
// Blurul și filtrele de culoare ale pozelor sunt scumpe la fiecare redesenare (apariția cardurilor, cioburile): le aplicăm
// o singură dată, pe un canvas, și înlocuim poza cu rezultatul. Fără ctx.filter, rămân filtrele CSS.
const bake = async (img, w, filter, tint) => {
  await img.decode().catch(() => {});
  const c = document.createElement("canvas"), g = c.getContext("2d");
  if (!img.naturalWidth || !("filter" in g)) return;
  c.width = w; c.height = Math.round((w * img.naturalHeight) / img.naturalWidth);
  g.filter = filter;
  const m = filter.includes("blur") ? c.width * 0.08 : 0; // la blur desenăm puțin mai mare: marginile nu se mai estompează
  g.drawImage(img, -m, -m, c.width + 2 * m, c.height + 2 * m);
  g.filter = "none";
  if (tint) { g.globalCompositeOperation = "soft-light"; g.fillStyle = tint; g.fillRect(0, 0, c.width, c.height); }
  c.toBlob(async (blob) => {
    // decodată dinainte (în afara firului principal): la primul scroll până la carduri poza e gata de desenat
    const url = URL.createObjectURL(blob), pre = new Image();
    pre.src = url;
    await pre.decode().catch(() => {});
    img.src = url; img.classList.add("is-baked"); if (tint) img.parentElement.classList.add("is-baked");
  }, "image/jpeg", 0.9);
};
const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200));
// după intro + intrarea hero-ului (titlul devine cuburi): abia atunci, la primul moment liber
const later = (f) => introDone.then(() => setTimeout(() => idle(f), 1500));
// câte o poză pe moment liber (toate odată blocau ~100 ms)
const bakes = [
  ...[...document.querySelectorAll(".show__bg")].map((i) => () => bake(i, 480, "blur(9px) brightness(.5) saturate(.8)")),
  () => bake(document.querySelector(".show__card--video .show__photo"), 1600, "brightness(.85) contrast(1.05)"),
  () => bake(document.querySelector(".show__card--web .show__photo"), 1600, "saturate(.55) brightness(.85) contrast(1.05)", "rgba(255, 70, 55, .22)"),
];
const nextBake = () => bakes.length && bakes.shift()().finally(() => idle(nextBake));
later(nextBake);
const scenes = [...document.querySelectorAll(".show__scene")];
const placeScenes = () => scenes.forEach((sc) => {
  const card = sc.closest(".show__card"), W = card.clientWidth, H = card.clientHeight;
  if (!W) return;
  const [iw, ih] = sc.dataset.size.split(" ").map(Number), [fx, fy] = sc.dataset.focus.split(" ").map(Number);
  const s = (W * sc.dataset.zoom) / iw, w = iw * s, h = ih * s;
  const fit = (size, box, at) => (size > box ? gsap.utils.clamp(box - size, 0, at) : at);
  Object.assign(sc.style, { width: w + "px", height: h + "px", transform: `translate(${fit(w, W, W / 2 - fx * s)}px, ${fit(h, H, H / 2 - fy * s)}px)` });
  const scr = sc.querySelector(".show__screen"), sw = +scr.dataset.w, sh = +scr.dataset.h;
  const q = JSON.parse(sc.dataset.quad).map(([px, py]) => [px * s, py * s]);
  const m = quadMatrix(sw, sh, q);
  Object.assign(scr.style, { width: sw + "px", height: sh + "px", transform: `matrix3d(${m.join(",")})` });
  // verificare: colțul dreapta-jos al ecranului cade exact pe colțul măsurat
  const p = new DOMMatrix(m).transformPoint(new DOMPoint(sw, sh));
  console.assert(Math.abs(p.x / p.w - q[2][0]) < 0.5 && Math.abs(p.y / p.w - q[2][1]) < 0.5, "quadMatrix");
});
new ResizeObserver(placeScenes).observe(track);

// Caruselul (când cardurile nu încap toate): punctul activ urmează derularea, săgețile mută câte un card
const step = () => showCards[1].offsetLeft - showCards[0].offsetLeft;
const syncNav = () => {
  const max = track.scrollWidth - track.clientWidth;
  work.classList.toggle("is-static", max < 4);
  const i = track.scrollLeft >= max - 4 ? dots.length - 1 : Math.round(track.scrollLeft / step());
  dots.forEach((d, k) => d.classList.toggle("is-on", k === i));
};
track.addEventListener("scroll", syncNav, { passive: true });
new ResizeObserver(syncNav).observe(track);
work.querySelectorAll(".show__btn").forEach((b) => b.addEventListener("click", () => track.scrollBy({ left: b.dataset.dir * step(), behavior: "smooth" })));

// Click pe card (prima variantă, cerută înapoi): cardul vine în centrul ecranului, crapă, apoi cioburile zboară
// spre cameră și pe lângă ea, iar portofoliul categoriei apare din spatele lor, ca și cum ai trece prin card.
// Cioburile = copii ale cardului tăiate în triunghiuri (grilă 3×5 cu puncte deplasate aleator).
const shatter = (card, r) => {
  const C = 3, R = 5, pts = [];
  const j = () => (Math.random() - 0.5) * 0.7;
  for (let y = 0; y <= R; y++) for (let x = 0; x <= C; x++)
    pts.push([((x + (x % C ? j() : 0)) / C) * 100, ((y + (y % R ? j() : 0)) / R) * 100]); // marginile rămân drepte
  const P = (x, y) => pts[y * (C + 1) + x];
  const stage = document.createElement("div");
  stage.className = "shatter";
  Object.assign(stage.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
  const copy = card.cloneNode(true);
  const parts = [];
  for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
    const a = P(x, y), b = P(x + 1, y), c = P(x + 1, y + 1), d = P(x, y + 1);
    for (const t of Math.random() < 0.5 ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]]) {
      const el = document.createElement("div");
      el.className = "shard";
      el.style.clipPath = `polygon(${t.map((p) => `${p[0]}% ${p[1]}%`).join(",")})`;
      el.append(copy.cloneNode(true));
      stage.append(el);
      parts.push({ el, x: (t[0][0] + t[1][0] + t[2][0]) / 3, y: (t[0][1] + t[1][1] + t[2][1]) / 3 });
    }
  }
  const dim = document.createElement("div");
  dim.className = "shatter__dim";
  document.body.append(dim, stage);
  return { stage, dim, parts };
};
let catBusy = false, lastCard = null;
const openCat = (card, e) => {
  if (catBusy || !cat.hidden) return;
  catBusy = true;
  lastCard = card;
  const page = catPages.find((p) => p.dataset.cat === card.dataset.cat);
  catPages.forEach((p) => (p.hidden = p !== page));
  lenisRef?.stop();
  cat.scrollTop = 0;
  const done = () => {
    catBusy = false;
    bg.paused = true; // pagina categoriei acoperă tot: fundalul lichid de dedesubt nu mai trebuie desenat
    cat.querySelector(".cat__close").focus({ preventScroll: true });
  };
  if (reduce) { cat.hidden = false; return gsap.fromTo(cat, { opacity: 0 }, { opacity: 1, duration: 0.3, onComplete: done }); }

  const r = card.getBoundingClientRect(), { stage, dim, parts } = shatter(card, r), els = parts.map((p) => p.el);
  card.style.visibility = "hidden";
  // punctul de impact: unde ai dat click (cu tastatura: centrul)
  const ix = e.clientX ? ((e.clientX - r.left) / r.width) * 100 : 50, iy = e.clientY ? ((e.clientY - r.top) / r.height) * 100 : 50;
  const dist = (p) => Math.hypot(p.x - ix, p.y - iy);
  const k = Math.min((innerHeight * 0.86) / r.height, (innerWidth * 0.9) / r.width);
  gsap.set(els, { transformPerspective: 900 });
  stage.getBoundingClientRect(); // stilurile și layout-ul cioburilor se calculează acum, nu în primul cadru al mișcării
  requestAnimationFrame(() => requestAnimationFrame(() => gsap.timeline({ onComplete: () => { stage.remove(); dim.remove(); card.style.visibility = ""; done(); } })
    // fondul plin acoperă site-ul (aceeași culoare ca portofoliul)
    .to(dim, { opacity: 1, duration: 0.75, ease: "power2.out" }, 0)
    // 1. cardul vine spre tine, în centrul ecranului
    .to(stage, { x: innerWidth / 2 - (r.left + r.width / 2), y: innerHeight / 2 - (r.top + r.height / 2), scale: k, duration: 0.75, ease: "expo.inOut" }, 0)
    // 2. crapă: cioburile se desprind puțin, întâi cele de lângă impact
    .to(els, { x: (i) => (parts[i].x - ix) * 0.04, y: (i) => (parts[i].y - iy) * 0.04, rotate: () => gsap.utils.random(-2, 2), duration: 0.22, ease: "power2.out", stagger: (i) => dist(parts[i]) * 0.0015 })
    // 3. cioburile zboară spre tine și pe lângă tine
    .to(els, {
      x: (i) => (parts[i].x - ix) * gsap.utils.random(4, 9), y: (i) => (parts[i].y - iy) * gsap.utils.random(4, 9) + 80,
      z: () => gsap.utils.random(250, 700), rotationX: () => gsap.utils.random(-70, 70), rotationY: () => gsap.utils.random(-70, 70),
      rotate: () => gsap.utils.random(-40, 40), opacity: 0, duration: 1.1, ease: "power3.in", stagger: (i) => dist(parts[i]) * 0.003,
    }, "+=0.05")
    // 4. din spatele lor apare portofoliul, ca și cum ai trece prin card
    .add(() => (cat.hidden = false), "<0.15")
    .fromTo(cat, { opacity: 0, scale: 1.15, willChange: "transform, opacity" }, { opacity: 1, scale: 1, duration: 1.2, ease: "expo.out", clearProps: "opacity,transform,willChange" }, "<")));
};
const closeCat = (then) => {
  if (catBusy || cat.hidden) return;
  catBusy = true;
  bg.paused = false;
  const page = catPages.find((p) => !p.hidden);
  const outro = [cat.querySelector(".cat__top"), ...page.querySelectorAll(".cat__head > *, .piece")];
  const end = () => {
    cat.hidden = true;
    gsap.set([cat, ...outro], { clearProps: "opacity,transform" });
    lenisRef?.start();
    catBusy = false;
    refreshCursor();
    then?.();
  };
  if (reduce) return gsap.to(cat, { opacity: 0, duration: 0.2, onComplete: end });
  // întâi pleacă conținutul, apoi fondul se stinge și se vede iar site-ul; cardul revine cât se stinge fondul
  // (dacă ar reveni după, s-ar vedea întâi întreg prin fond, apoi ar dispărea și ar apărea din nou)
  gsap.timeline({ onComplete: end })
    .to(outro, { opacity: 0, y: -40, duration: 0.45, stagger: 0.04, ease: "power2.in" })
    .to(cat, { opacity: 0, duration: 0.6, ease: "power2.inOut" }, "-=0.15")
    .fromTo(lastCard, { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.1, ease: "expo.out", clearProps: "transform,opacity" }, "<");
};
showCards.forEach((c) => c.addEventListener("click", (e) => openCat(c, e)));
cat.querySelector(".cat__close").addEventListener("click", () => closeCat());
addEventListener("keydown", (e) => e.key === "Escape" && (lb.hidden ? closeCat() : closeLb()));

// Galeria unei lucrări cu mai multe imagini (Everest): imaginea de pe card zboară în locul ei din rând,
// celelalte urcă lângă ea, apoi apare textul. Se închide din X, cu Esc sau cu click pe fundal.
const lb = cat.querySelector(".lb"), lbImgs = [...lb.querySelectorAll(".lb__row img")];
let lbFrom = null;
const openLb = async (btn) => {
  lbFrom = btn;
  lb.hidden = false;
  if (reduce) return;
  // imaginile se încarcă abia acum (lazy): așteptăm să aibă mărimea, altfel zborul pornește din locul greșit
  gsap.set(lb, { visibility: "hidden" });
  await Promise.all(lbImgs.map((im) => im.decode().catch(() => {})));
  gsap.set(lb, { visibility: "visible" });
  refreshCursor();
  const from = btn.getBoundingClientRect(), hero = lbImgs.find((im) => im.src === btn.querySelector("img").src), to = hero.getBoundingClientRect();
  gsap.timeline()
    .fromTo(lb, { backgroundColor: "rgba(8,6,6,0)" }, { backgroundColor: "rgba(8,6,6,.94)", duration: 0.5, ease: "power2.out" })
    .fromTo(hero, { x: from.left - to.left, y: from.top - to.top, scale: from.width / to.width, transformOrigin: "0 0" },
      { x: 0, y: 0, scale: 1, duration: 1, ease: "expo.inOut", clearProps: "transform" }, 0)
    .fromTo(lbImgs.filter((im) => im !== hero), { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.08, ease: "expo.out", clearProps: "transform,opacity" }, 0.45)
    .fromTo([lb.querySelector(".lb__cap"), lb.querySelector(".lb__close")], { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.06, ease: "expo.out", clearProps: "transform,opacity" }, 0.75);
};
const closeLb = () => {
  if (lb.hidden) return;
  const end = () => { lb.hidden = true; gsap.set(lb, { clearProps: "opacity" }); lbFrom?.focus(); refreshCursor(); };
  if (reduce) return end();
  gsap.to(lb, { opacity: 0, duration: 0.35, ease: "power2.in", onComplete: end });
};
cat.querySelectorAll(".piece__open").forEach((b) => b.addEventListener("click", () => openLb(b)));
lb.querySelector(".lb__close").addEventListener("click", closeLb);
lb.addEventListener("click", (e) => e.target === lb && closeLb());
// „Hai să vorbim”: închide portofoliul, apoi coboară la contact (cu scroll-ul pornit din nou)
let passing = false;
cat.addEventListener("click", (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || passing) return;
  e.preventDefault();
  e.stopPropagation();
  closeCat(() => { passing = true; a.click(); passing = false; });
}, true);
