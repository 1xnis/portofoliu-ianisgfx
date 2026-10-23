// Prisma de la Despre, după „Prism triangle motion study” (recent.design/i/c0hwaph): un triunghi de sticlă cu margini
// irizate; un fascicul alb intră din stânga-jos, se frânge în sticlă (legea lui Snell, calculată aici) și iese în dreapta
// ca un evantai de culori care se curbează și se lărgește. Spectrul e în culorile site-ului (crem → chihlimbar → coral →
// roșu → vișiniu). Unghiul luminii se plimbă lent. Fragment shader WebGL pe tot canvas-ul, desenat doar cât se vede.
// window.prism.grow (0..1, din main.js la scroll) aprinde lumina: întâi fasciculul, apoi raza din sticlă, apoi evantaiul.
// Pe ecrane late (.about.is-wide) descrierea (.prism__glass) e pusă peste triunghi.
window.prism = { grow: 0 };
(() => {
  const cv = document.querySelector(".prism__cv");
  if (!cv) return;
  // alpha: true = canvas transparent (culori premultiplicate), în jurul luminii se vede fundalul lichid al site-ului
  const gl = cv.getContext("webgl", { antialias: false, alpha: true });
  if (!gl) return;
  const about = cv.closest(".about"), glass = about.querySelector(".prism__glass");

  const frag = `
    precision highp float;
    uniform vec2 uR;            // mărimea canvas-ului (px reali)
    uniform float uD, uT, uGrow; // densitatea pixelilor, timpul, aprinderea
    uniform vec2 uA, uB, uC;    // vârfurile triunghiului (px CSS, y în jos)
    uniform vec2 uS, uE, uX;    // sursa, intrarea în sticlă, ieșirea din sticlă
    uniform vec2 uDir;          // direcția evantaiului
    uniform float uW0, uTan, uBend; // jumătatea lățimii la ieșire, cât se deschide, cât se curbează
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float seg(vec2 p, vec2 a, vec2 b, out float h) {
      vec2 pa = p - a, ba = b - a; h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.);
      return length(pa - ba * h);
    }
    // distanța până la conturul triunghiului (cele trei laturi)
    float tri(vec2 p) { float h; return min(min(seg(p, uA, uB, h), seg(p, uB, uC, h)), seg(p, uC, uA, h)); }
    float inside(vec2 p) {
      vec2 e0 = uB - uA, e1 = uC - uB, e2 = uA - uC;
      float s0 = e0.x * (p.y - uA.y) - e0.y * (p.x - uA.x), s1 = e1.x * (p.y - uB.y) - e1.y * (p.x - uB.x), s2 = e2.x * (p.y - uC.y) - e2.y * (p.x - uC.x);
      return step(0., s0) * step(0., s1) * step(0., s2) + step(s0, 0.) * step(s1, 0.) * step(s2, 0.);
    }
    vec3 pal(float k) { // spectrul site-ului
      vec3 c = mix(vec3(1., .94, .86), vec3(1., .68, .36), smoothstep(0., .25, k));
      c = mix(c, vec3(1., .36, .27), smoothstep(.2, .5, k));
      c = mix(c, vec3(.92, .1, .12), smoothstep(.45, .75, k));
      return mix(c, vec3(.62, .06, .3), smoothstep(.7, 1., k));
    }
    void main() {
      vec2 p = vec2(gl_FragCoord.x, uR.y - gl_FragCoord.y) / uD;
      vec3 col = vec3(0.);
      float g1 = clamp(uGrow / .55, 0., 1.), g2 = clamp((uGrow - .55) / .12, 0., 1.), g3 = clamp((uGrow - .67) / .33, 0., 1.);
      float h;
      // fasciculul alb care intră (crește dinspre sursă)
      vec2 Eg = mix(uS, uE, g1);
      float d1 = seg(p, uS, Eg, h);
      float w = 5. + 7. * h;
      col += vec3(1., .95, .9) * (exp(-d1 * d1 / (w * w)) * 1.4 + exp(-d1 / 70.) * .22) * step(.001, g1);
      // raza din sticlă
      float d2 = seg(p, uE, mix(uE, uX, g2), h);
      col += vec3(1., .93, .88) * (exp(-d2 * d2 / 9.) * 1.2 + exp(-d2 / 30.) * .25) * step(.001, g2);
      // evantaiul de culori: o bandă care pleacă din punctul de ieșire, se lărgește și se curbează în sus.
      // al = cât de departe e pixelul pe direcția benzii, lat = cât de departe lateral; k = locul în spectru (0 sus, 1 jos)
      vec2 v = p - uX, nrm = vec2(-uDir.y, uDir.x);
      float al = dot(v, uDir), lat = dot(v, nrm) - uBend * al * al;
      float hw = uW0 + max(al, 0.) * uTan, k = lat / (2. * hw) + .5;
      float soft = .07 + 2.5 / max(hw, 2.5);
      float band = smoothstep(-soft, soft * .5, k) * smoothstep(1. + soft, 1. - soft * .5, k) * step(0., al);
      float reach = smoothstep(0., 24., al) * exp(-al / 2400.) * step(al, 60. + g3 * 2600.);
      vec3 fan = pal(clamp(k, 0., 1.)) * band * reach * (1.3 - .4 * smoothstep(0., 1., abs(k - .5) * 2.));
      fan *= .94 + .06 * sin(k * 46. + uT * .6); // dâre fine în lumină
      col += fan * (1. - inside(p)) * g3;
      // strălucirea largă din jurul benzii
      col += pal(.5) * exp(-abs(k - .5) * 1.8) * exp(-al / 1100.) * .16 * g3 * step(0., al) * smoothstep(0., 80., al);
      // conturul triunghiului: linie fină cu franjuri cromatice (roșu/crem decalate puțin)
      float dt = tri(p), dr = tri(p + vec2(.9, .4)), db = tri(p - vec2(.9, .4));
      vec3 edge = vec3(exp(-dr * dr / 1.1), exp(-dt * dt / 1.1) * .92, exp(-db * db / 1.1) * .86);
      float hot = exp(-length(p - uE) / 60.) * g1 + exp(-length(p - uX) / 70.) * g2;
      col += edge * (.55 + 1.6 * hot) + vec3(1., .5, .4) * exp(-dt / 14.) * (.06 + .3 * hot);
      // în sticlă: puțin mai întunecat, cu o reflexie slabă a spectrului
      float ins = inside(p);
      col = mix(col, col * .7 + pal(.4) * .02, ins * .6);
      // ton, vignetă, granulație
      col = 1. - exp(-col * 1.15);
      vec2 q = gl_FragCoord.xy / uR - .5;
      col *= 1. - .55 * dot(q, q) * 1.6;
      // transparență: opacă doar unde e lumină; sticla e un geam fumuriu peste fundal (alpha .45, culoare 0 = întunecă)
      float a = clamp(max(col.r, max(col.g, col.b)) * 1.15, 0., 1.);
      a = max(a, ins * .45);
      col += (hash(gl_FragCoord.xy + fract(uT) * 100.) - .5) * .035 * a; // granulația doar pe lumină
      gl_FragColor = vec4(min(col, vec3(a)), a); // premultiplicat: culoarea nu poate depăși alpha
    }`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, "attribute vec2 a; void main() { gl_Position = vec4(a, 0, 1); }"));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { console.warn("prism", gl.getProgramInfoLog(pr)); return; }
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  ["uR", "uD", "uT", "uGrow", "uA", "uB", "uC", "uS", "uE", "uX", "uDir", "uW0", "uTan", "uBend"].forEach((n) => (U[n] = gl.getUniformLocation(pr, n)));

  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    W = cv.clientWidth; H = cv.clientHeight;
    dpr = Math.min(devicePixelRatio, 1.25);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    gl.viewport(0, 0, cv.width, cv.height);
  };

  // ——— geometria luminii (px CSS, y în jos) ———
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], add = (a, b) => [a[0] + b[0], a[1] + b[1]], mul = (a, s) => [a[0] * s, a[1] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1], norm = (a) => mul(a, 1 / Math.hypot(a[0], a[1]));
  // refracția unei raze (I) la o suprafață cu normala N (spre partea din care vine raza); eta = n1 / n2
  const refract = (I, N, eta) => {
    const c = -dot(N, I), k = 1 - eta * eta * (1 - c * c);
    return k < 0 ? null : norm(add(mul(I, eta), mul(N, eta * c - Math.sqrt(k))));
  };
  // unde iese raza (punct + latură) din triunghi
  const hit = (P, d, a, b) => {
    const e = sub(b, a), den = d[0] * e[1] - d[1] * e[0];
    if (Math.abs(den) < 1e-6) return null;
    const w = sub(a, P), t = (w[0] * e[1] - w[1] * e[0]) / den, u = (w[0] * d[1] - w[1] * d[0]) / den;
    return t > 1 && u >= 0 && u <= 1 ? [t, a, b] : null;
  };
  const geo = (t) => {
    const wide = W / H > 1.05;
    const s = wide ? Math.min(H * 0.44, W * 0.27) : Math.min(W * 0.5, H * 0.42), h = (s * Math.sqrt(3)) / 2;
    const cx = W * 0.5, cy = H * (wide ? 0.6 : 0.52);
    const A = [cx, cy - (h * 2) / 3], B = [cx - s / 2, cy + h / 3], C = [cx + s / 2, cy + h / 3];
    // lumina se plimbă lent: unghiul de intrare și locul unde lovește latura stângă
    const deg = Math.PI / 180, ang = (13 + 9 * Math.sin(t * 0.21) + 3 * Math.sin(t * 0.53)) * deg;
    const d = [Math.cos(ang), -Math.sin(ang)], u = 0.5 + 0.12 * Math.sin(t * 0.17 + 1);
    const E = add(A, mul(sub(B, A), u)), S = sub(E, mul(d, Math.max(W, H) * 1.4));
    // raza din sticlă: refracție reală la latura stângă, apoi până unde iese
    const nL = norm([-(B[1] - A[1]), B[0] - A[0]]);
    const NL = dot(nL, sub(E, [cx, cy])) > 0 ? nL : mul(nL, -1);
    const t1 = refract(d, NL, 1 / 1.5) || d;
    const ex = hit(E, t1, A, C) || hit(E, t1, B, C) || [s * 0.5];
    const X = add(E, mul(t1, ex[0]));
    // evantaiul (regizat ca în animație, nu strict fizic): urcă puțin mai abrupt decât lumina care intră și se deschide
    const out = ang + (7 + 4 * Math.sin(t * 0.3)) * deg, dir = [Math.cos(out), -Math.sin(out)];
    return { A, B, C, S, E, X, dir, w0: s * 0.05, tan: Math.tan((11 + 2 * Math.sin(t * 0.25)) * deg), bend: wide ? -0.00009 : -0.00016 };
  };

  let raf = 0, smooth = 0;
  const t0 = performance.now();
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    if (!W) return;
    const t = (now - t0) / 1000, G = geo(t);
    smooth += (prism.grow - smooth) * 0.12;
    gl.uniform2f(U.uR, cv.width, cv.height);
    gl.uniform1f(U.uD, dpr); gl.uniform1f(U.uT, t); gl.uniform1f(U.uGrow, smooth);
    ["A", "B", "C", "S", "E", "X"].forEach((n) => gl.uniform2f(U["u" + n], G[n][0], G[n][1]));
    gl.uniform2f(U.uDir, G.dir[0], G.dir[1]); gl.uniform1f(U.uW0, G.w0); gl.uniform1f(U.uTan, G.tan); gl.uniform1f(U.uBend, G.bend);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    placeGlass(G);
  };
  // descrierea stă exact peste triunghi (doar pe ecrane late); triunghiul se schimbă doar la redimensionare
  let glassKey = "";
  const placeGlass = (G) => {
    const wide = about.classList.contains("is-wide"), key = wide ? [G.B[0], G.A[1], G.C[0] - G.B[0], G.B[1] - G.A[1]].map(Math.round).join() : "";
    if (!glass || key === glassKey) return;
    glassKey = key;
    const [l, t, w, h] = key ? key.split(",") : [];
    Object.assign(glass.style, key ? { left: l + "px", top: t + "px", width: w + "px", height: h + "px" } : { left: "", top: "", width: "", height: "" });
  };
  new ResizeObserver(resize).observe(cv);
  resize();
  new IntersectionObserver(([e]) => {
    cancelAnimationFrame(raf);
    if (e.isIntersecting) raf = requestAnimationFrame(frame);
  }).observe(cv);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) prism.grow = 1;
})();
