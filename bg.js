// Fundal lichid WebGL (în stilul cromat al logo-ului). main.js animează bg.k (intensitate) și bg.z (zoom) la intro.
window.bg = { k: 0, z: 3 };
(() => {
  const cv = document.querySelector(".bg");
  const gl = cv.getContext("webgl", { preserveDrawingBuffer: true }); // cub.html copiază fundalul în snapshot()
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!gl) return cv.remove();

  const frag = `
    precision highp float;
    uniform vec2 r; uniform vec2 m; uniform float t, k, z, o;
    float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p) {
      vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y);
    }
    float fbm(vec2 p) {
      float v = 0., a = .5; mat2 R = mat2(.8, .6, -.6, .8);
      for (int i = 0; i < 5; i++) { v += a * n(p); p = R * p * 2.; a *= .5; }
      return v;
    }
    void main() {
      vec2 uv = (gl_FragCoord.xy - .5 * r) / r.y;
      vec2 mp = (m - .5) * vec2(r.x / r.y, 1.);
      vec2 p = uv * z + mp * .25;
      float s = t * .05;
      vec2 q = vec2(fbm(p + s), fbm(p + vec2(5.2, 1.3) - s));
      vec2 w = vec2(fbm(p + 4. * q + vec2(1.7, 9.2) + s * 1.5), fbm(p + 4. * q + vec2(8.3, 2.8) - s));
      float f = fbm(p + 4. * w);
      // o = cât din pagină ai parcurs (0 sus, 1 jos): roșu-coral → vișiniu-rose → jar → grena, toate din aceeași familie
      float o3 = o * 3., e = smoothstep(0., 1., fract(o3));
      vec3 dA = vec3(.48, .05, .086), aA = vec3(1., .31, .27), dB = vec3(.42, .035, .15), aB = vec3(.96, .27, .42);
      vec3 dC = vec3(.5, .11, .04), aC = vec3(1., .45, .25), dD = vec3(.34, .03, .07), aD = vec3(.9, .2, .26);
      vec3 deep = o3 < 1. ? mix(dA, dB, e) : o3 < 2. ? mix(dB, dC, e) : o3 < 3. ? mix(dC, dD, e) : dD;
      vec3 acc = o3 < 1. ? mix(aA, aB, e) : o3 < 2. ? mix(aB, aC, e) : o3 < 3. ? mix(aC, aD, e) : aD;
      vec3 bg = vec3(.055, .039, .039);
      vec3 c = mix(bg, deep, smoothstep(.45, 1., f) * .75);
      c = mix(c, acc, smoothstep(.7, 1., f + length(w) * .15) * .55);
      // dungi cromate, ca în logo
      float band = pow(abs(sin(f * 22. + length(q) * 6.)), 24.) * smoothstep(.45, .8, f);
      c += acc * band * .45 + vec3(1., .88, .84) * band * .12;
      // lumină care urmărește cursorul
      float d = length(uv - mp);
      c += acc * .3 * exp(-d * d * 7.) * smoothstep(.35, .75, f);
      c *= 1. - .45 * dot(uv * .7, uv * .7);
      gl_FragColor = vec4(clamp(mix(bg, c, k), 0., 1.), 1.);
    }`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, "attribute vec2 a; void main() { gl_Position = vec4(a, 0, 1); }"));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return cv.remove();
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const a = gl.getAttribLocation(pr, "a");
  gl.enableVertexAttribArray(a);
  gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  const u = (name) => gl.getUniformLocation(pr, name);
  const [uR, uM, uT, uK, uZ, uO] = ["r", "m", "t", "k", "z", "o"].map(u);

  // Randăm la rezoluție redusă: fundalul e difuz, iar așa merge fluid și pe laptopuri slabe.
  // pe telefon e și mai mică (ecranul e mic, iar placa video slabă); înălțimea are o rezervă de 15%, ca bara de adresă
  // care apare/dispare la scroll să nu realoce canvas-ul de fiecare dată
  const SCALE = innerWidth < 700 ? 0.4 : 0.5;
  let lastW = 0, lastH = 0;
  const size = () => {
    if (innerWidth === lastW && Math.abs(innerHeight - lastH) < innerHeight * 0.15) return;
    lastW = innerWidth; lastH = innerHeight;
    cv.width = Math.ceil(innerWidth * SCALE); cv.height = Math.ceil(innerHeight * SCALE);
    gl.viewport(0, 0, cv.width, cv.height);
  };
  let tx = 0.5, ty = 0.5, mx = 0.5, my = 0.5, tone = 0;
  addEventListener("pointermove", (e) => { tx = e.clientX / innerWidth; ty = 1 - e.clientY / innerHeight; });

  const draw = (ms) => {
    mx += (tx - mx) * 0.04; my += (ty - my) * 0.04;
    // mai estompat după hero, ca textul să rămână lizibil
    const dim = 1 - 0.5 * Math.min(scrollY / innerHeight, 1);
    gl.uniform2f(uR, cv.width, cv.height);
    gl.uniform2f(uM, mx, my);
    gl.uniform1f(uT, ms / 1000);
    gl.uniform1f(uK, bg.k * dim);
    gl.uniform1f(uZ, bg.z);
    // nuanța urmează scroll-ul cu întârziere (fără salturi când sari la o secțiune din meniu)
    tone += (Math.min(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight), 1) - tone) * 0.03;
    gl.uniform1f(uO, tone);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  size();
  if (reduce) {
    bg.k = 0.75; bg.z = 1.4;
    draw(20000);
    addEventListener("resize", () => { size(); draw(20000); });
  } else {
    addEventListener("resize", size);
    // bg.paused: în mockup-ul de telefon, cât cardul nu se vede, fundalul nu se mai desenează
    const loop = (ms) => { if (!bg.paused) draw(ms); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
})();
