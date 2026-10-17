// Fundal lichid WebGL (în stilul cromat al logo-ului). main.js animează bg.k (intensitate) și bg.z (zoom) la intro.
window.bg = { k: 0, z: 3 };
(() => {
  const cv = document.querySelector(".bg");
  const gl = cv.getContext("webgl");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!gl) return cv.remove();

  const frag = `
    precision highp float;
    uniform vec2 r; uniform vec2 m; uniform float t, k, z;
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
      vec3 bg = vec3(.055, .039, .039), deep = vec3(.48, .05, .086), acc = vec3(1., .31, .27);
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
  const [uR, uM, uT, uK, uZ] = ["r", "m", "t", "k", "z"].map(u);

  // Randăm la rezoluție redusă: fundalul e difuz, iar așa merge fluid și pe laptopuri slabe.
  const SCALE = 0.5;
  const size = () => {
    cv.width = Math.ceil(innerWidth * SCALE); cv.height = Math.ceil(innerHeight * SCALE);
    gl.viewport(0, 0, cv.width, cv.height);
  };
  let tx = 0.5, ty = 0.5, mx = 0.5, my = 0.5;
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
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  size();
  if (reduce) {
    bg.k = 0.75; bg.z = 1.4;
    draw(20000);
    addEventListener("resize", () => { size(); draw(20000); });
  } else {
    addEventListener("resize", size);
    const loop = (ms) => { draw(ms); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
})();
