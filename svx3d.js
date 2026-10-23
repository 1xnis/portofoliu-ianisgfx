// Simbolul 3D de la Servicii, adaptat după „Ownit symbol motion study” (recent.design/i/sxy775a): steaua din logo,
// extrudată, se rotește și trece în buclă prin cinci tratamente, cu tăieturi scurte între ele:
// CRT (linii de scanare, ușor neclar) → detecție de obiect (chenare pe vârfuri cu coordonate) → blueprint (wireframe,
// grilă, cartuș, cote) → nor de puncte LiDAR (cutie 3D, date, histogramă) → tracking (orbite și markere).
// Culorile site-ului (roșu, cremă, vișiniu) în loc de albastru. Three.js se încarcă abia când secțiunea se apropie,
// iar scena se desenează doar cât e pe ecran. Pe ecrane late simbolul urmează cardurile (follow).
(() => {
  const cv = document.querySelector(".svx"), hud = document.querySelector(".svx-hud");
  if (!cv || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const near = new IntersectionObserver(async ([e]) => {
    if (!e.isIntersecting) return;
    near.disconnect();
    try {
      const [THREE, { MeshSurfaceSampler }] = await Promise.all([import("three"), import("three/addons/math/MeshSurfaceSampler.js")]);
      init(THREE, MeshSurfaceSampler);
    } catch (err) { console.warn("svx3d", err); }
  }, { rootMargin: "150% 0px" });
  near.observe(cv);

  function init(THREE, Sampler) {
    const RED = new THREE.Color("#ff4f45"), CREAM = new THREE.Color("#f5ede6"), DEEP = new THREE.Color("#7a0d16"), HOT = new THREE.Color(1, 0.94, 0.9);
    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: "high-performance" });
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0, 10);
    const g = hud.getContext("2d");
    let W = 0, H = 0, dpr = 1;
    const resize = () => {
      W = cv.clientWidth; H = cv.clientHeight;
      if (!W) return;
      dpr = Math.min(devicePixelRatio, 1.5);
      renderer.setPixelRatio(dpr);
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      // pe ecrane înguste camera se dă înapoi, ca simbolul să încapă
      camera.position.z = W / H < 1 ? 13 : 10;
      camera.updateProjectionMatrix();
      hud.width = W * dpr; hud.height = H * dpr;
    };

    // ——— simbolul: steaua mare din logo + una mică, extrudate ———
    const K = 0.62;
    const star = (s, cx, cy) => {
      const q = s * 0.06, sh = new THREE.Shape();
      sh.moveTo(cx, cy + s);
      sh.quadraticCurveTo(cx + q, cy + q, cx + s * K, cy);
      sh.quadraticCurveTo(cx + q, cy - q, cx, cy - s);
      sh.quadraticCurveTo(cx - q, cy - q, cx - s * K, cy);
      sh.quadraticCurveTo(cx - q, cy + q, cx, cy + s);
      return sh;
    };
    const BIG = [-0.22, 0.18, 1.15], SMALL = [0.92, -0.86, 0.42], DEPTH = 0.38;
    const geo = new THREE.ExtrudeGeometry([star(BIG[2], BIG[0], BIG[1]), star(SMALL[2], SMALL[0], SMALL[1])], {
      depth: DEPTH, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.02, bevelSegments: 3, curveSegments: 28,
    });
    geo.computeBoundingBox();
    const ctr = geo.boundingBox.getCenter(new THREE.Vector3());
    geo.translate(-ctr.x, -ctr.y, -ctr.z);
    // vârfurile (pentru chenarele de detecție), în coordonatele simbolului
    const tipsOf = ([cx, cy, s]) => [[0, s], [s * K, 0], [0, -s], [-s * K, 0]].map(([x, y]) => new THREE.Vector3(cx + x - ctr.x, cy + y - ctr.y, 0));
    const TIPS = [...tipsOf(BIG), ...tipsOf(SMALL)];

    // rig = tot ce ține de simbol (stea, aură, orbite, axe), mutat împreună în golul de lângă cardul din față
    const rig = new THREE.Group(), sym = new THREE.Group();
    scene.add(rig);
    rig.add(sym);
    // material „lumină”: centrul spre cremă/roșu, marginile spre culoarea de contur; liniile de scanare din ecran
    const solidMat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uCore: { value: RED.clone() }, uRim: { value: DEEP.clone() }, uOp: { value: 1 }, uScan: { value: 0 } },
      vertexShader: `varying vec3 vN; varying vec3 vV;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uCore, uRim; uniform float uOp, uScan; varying vec3 vN; varying vec3 vV;
        void main() {
          float f = clamp(abs(dot(normalize(vN), normalize(vV))), 0., 1.);
          vec3 c = mix(uRim, uCore, pow(f, 1.3));
          c *= mix(1., .62 + .38 * step(.5, fract(gl_FragCoord.y / 4.)), uScan);
          gl_FragColor = vec4(c, uOp);
        }`,
    });
    const solid = new THREE.Mesh(geo, solidMat);
    sym.add(solid);
    // aura din spatele simbolului (sprite cu gradient radial)
    const glowTex = (() => {
      const c = Object.assign(document.createElement("canvas"), { width: 128, height: 128 }), x = c.getContext("2d");
      const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, "rgba(255,90,70,.9)"); gr.addColorStop(0.35, "rgba(255,60,50,.35)"); gr.addColorStop(1, "rgba(255,40,40,0)");
      x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    })();
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.set(5.5, 5.5, 1);
    glow.position.z = -0.6;
    rig.add(glow);
    // blueprint: muchiile
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 24), new THREE.LineBasicMaterial({ color: RED, transparent: true }));
    sym.add(edges);
    // LiDAR: puncte luate de pe suprafață + cutia 3D
    const N = 9000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const sampler = new Sampler(solid).build(), p = new THREE.Vector3(), tmp = new THREE.Color();
    for (let i = 0; i < N; i++) {
      sampler.sample(p);
      p.toArray(pos, i * 3);
      tmp.copy(CREAM).lerp(RED, Math.random() * 0.85).toArray(col, i * 3);
    }
    const cloudGeo = new THREE.BufferGeometry();
    cloudGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    cloudGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const cloud = new THREE.Points(cloudGeo, new THREE.PointsMaterial({ size: 0.024, vertexColors: true, transparent: true, depthWrite: false }));
    sym.add(cloud);
    const box = new THREE.Box3Helper(new THREE.Box3().setFromBufferAttribute(geo.attributes.position).expandByScalar(0.16), RED);
    box.material.transparent = true;
    sym.add(box);
    // tracking: orbite (elipse înclinate) în jurul simbolului
    const orbits = new THREE.Group();
    [[2.3, 1.2, 0.3, 0.2], [2.7, 1.6, -0.5, 1.1], [1.9, 2.3, 0.9, -0.4]].forEach(([a, b, rx, rz]) => {
      const pts = new THREE.EllipseCurve(0, 0, a, b).getPoints(160).map((v) => new THREE.Vector3(v.x, v.y, 0));
      const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: CREAM, transparent: true }));
      l.rotation.set(rx, 0, rz);
      orbits.add(l);
    });
    rig.add(orbits);
    // detecție: axe lungi care trec prin simbol
    const axes = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.1, -7, -1), new THREE.Vector3(-0.3, 7, 1), new THREE.Vector3(-7, -2.2, -2), new THREE.Vector3(7, 0.6, 1),
    ]), new THREE.LineBasicMaterial({ color: CREAM, transparent: true }));
    rig.add(axes);

    // pe ecrane late simbolul stă în golul de lângă cardul cel mai apropiat de mijlocul ecranului:
    // card 1 (stânga) → dreapta, card 2 (dreapta) → stânga, card 3 (mijloc) → în spatele lui, mai mare.
    // Poziția = media ponderată după distanța fiecărui card față de mijloc, urmată lin (fără salturi).
    const cards = [...document.querySelectorAll(".svc__card")], wide = matchMedia("(min-width: 861px)");
    const SPOT = [[0.5, 1], [-0.5, 1], [0, 1.3]]; // [x ca fracție din jumătatea lățimii, scară], în ordinea cardurilor
    const at = { x: SPOT[0][0], s: 1 };
    let prev = 0;
    const follow = (now) => {
      const dt = Math.min(0.1, (now - prev) / 1000);
      prev = now;
      let tx = 0, ts = 1;
      if (wide.matches) {
        let sx = 0, ss = 0, sw = 0;
        cards.forEach((c, i) => {
          const r = c.getBoundingClientRect(), w = Math.max(0, 1 - Math.abs(r.top + r.height / 2 - H / 2) / H) ** 2;
          sx += w * SPOT[i][0]; ss += w * SPOT[i][1]; sw += w;
        });
        if (sw < 1e-3) return; // niciun card aproape: rămâne unde era
        tx = sx / sw; ts = ss / sw;
      }
      const k = 1 - Math.exp(-dt * 4);
      at.x += (tx - at.x) * k; at.s += (ts - at.s) * k;
      rig.position.x = at.x * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z * camera.aspect;
      rig.scale.setScalar(at.s);
    };
    // markerele de tracking (puncte în jurul simbolului, proiectate în HUD)
    const MARK = Array.from({ length: 14 }, (_, i) => {
      const a = i * 2.4, r = 1.6 + (i % 4) * 0.35;
      return new THREE.Vector3(Math.cos(a) * r, Math.sin(a * 1.3) * 1.9, Math.sin(a) * r * 0.6);
    });

    // ——— tratamentele, în buclă (secunde) ———
    const PH = [["scan", 2.2], ["detect", 2.3], ["blueprint", 2.6], ["lidar", 2.6], ["track", 2.4]];
    const LOOP = PH.reduce((s, [, d]) => s + d, 0);
    const NAMES = { scan: "CRT / SCANLINE", detect: "OBJECT DETECTION", blueprint: "BLUEPRINT", lidar: "LIDAR POINT CLOUD", track: "SKELETON TRACKING" };
    const phaseAt = (t) => {
      let x = t % LOOP;
      for (let i = 0; i < PH.length; i++) { if (x < PH[i][1]) return [i, x / PH[i][1], x]; x -= PH[i][1]; }
      return [0, 0, 0];
    };
    const show = (o, v) => { o.visible = v > 0.001; (o.material || {}).opacity = v; };

    // ——— HUD 2D ———
    const v = new THREE.Vector3();
    const proj = (p3, obj) => {
      v.copy(p3);
      if (obj) v.applyMatrix4(obj.matrixWorld);
      v.project(camera);
      return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H];
    };
    const C = (a) => `rgba(245,237,230,${a})`, R = (a) => `rgba(255,79,69,${a})`;
    const text = (s, x, y, a = 0.75, align = "left") => { g.fillStyle = C(a); g.textAlign = align; g.fillText(s, x, y); };
    const cross = (x, y, s = 5) => { g.beginPath(); g.moveTo(x - s, y); g.lineTo(x + s, y); g.moveTo(x, y - s); g.lineTo(x, y + s); g.stroke(); };
    const tc = (t) => { const f = Math.floor(t * 24); return `00:00:${String(Math.floor(f / 24) % 60).padStart(2, "0")}:${String(f % 24).padStart(2, "0")}`; };
    const hist = Array.from({ length: 28 }, (_, i) => Math.exp(-((i - 15) ** 2) / 18) + Math.random() * 0.15);

    const drawHud = (t, name, u, cut) => {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      const small = W < 520; // pe telefon: text mai mic și fără cartuș
      g.font = `500 ${small ? 8 : 10}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      g.textBaseline = "middle";
      g.lineWidth = 1;
      const m = Math.min(W, H) * 0.06, top = W / H > 1 ? Math.max(m, 96) : m, cx = W / 2, cy = H / 2; // sus: sub meniu
      // colțurile cadrului, ca în referință
      g.strokeStyle = C(0.3);
      [[m, top], [W - m, top], [m, H - m], [W - m, H - m]].forEach(([x, y]) => cross(x, y, 4));
      const [x0, y0] = [m + 14, top + 4];
      if (name === "scan") {
        if (Math.floor(t * 1.6) % 2) { g.fillStyle = R(1); g.beginPath(); g.arc(x0 + 3, y0 + 12, 3.5, 0, 6.28); g.fill(); }
        text("REC", x0 + 12, y0 + 12, 0.8);
        text(tc(t), W - m - 14, H - m - 16, 0.6, "right");
      }
      if (name === "detect") {
        g.strokeStyle = C(0.9);
        TIPS.forEach((p3) => {
          const [x, y] = proj(p3, sym);
          g.fillStyle = R(0.25); g.fillRect(x - 7, y - 7, 14, 14); g.strokeRect(x - 7, y - 7, 14, 14);
          text(`x: ${Math.round(x)} y: ${Math.round(y)}`, x + 12, y - 12, 0.85);
        });
        const [sx, sy] = proj(new THREE.Vector3(), sym);
        g.strokeStyle = R(0.9); cross(sx, sy, 7);
        text(`symbol  ${(0.962 + 0.03 * Math.sin(t * 4)).toFixed(3)}`, sx + 12, sy + 14, 0.9);
      }
      if (name === "blueprint") {
        // grilă de fond
        g.strokeStyle = R(0.07);
        g.beginPath();
        for (let x = cx % 40; x < W; x += 40) { g.moveTo(x, 0); g.lineTo(x, H); }
        for (let y = cy % 40; y < H; y += 40) { g.moveTo(0, y); g.lineTo(W, y); }
        g.stroke();
        // cote pe vârfurile stelei mari
        g.strokeStyle = C(0.5);
        TIPS.slice(0, 4).forEach((p3, i) => {
          const [x, y] = proj(p3, sym);
          g.beginPath(); g.arc(x, y, 3, 0, 6.28); g.stroke();
          text(["Y 1.15", "X 0.71", "Y -1.15", "X -0.71"][i], x + 10, y + (i % 2 ? 12 : -10), 0.7);
        });
        // cartușul din dreapta-jos
        const bw = 240, bh = 64, bx = W - m - 14 - bw, by = H - m - 14 - bh - 14;
        if (!small) {
          g.strokeStyle = C(0.4); g.strokeRect(bx, by, bw, bh);
          g.beginPath(); g.moveTo(bx, by + 22); g.lineTo(bx + bw, by + 22); g.moveTo(bx + bw / 2, by + 22); g.lineTo(bx + bw / 2, by + bh); g.stroke();
          text("IANISGFX — SYMBOL", bx + 10, by + 11, 0.85);
          text("SCALE 1:1", bx + 10, by + 34, 0.6); text(`DEPTH ${DEPTH.toFixed(2)}`, bx + 10, by + 50, 0.6);
          text("SHEET 01", bx + bw / 2 + 10, by + 34, 0.6); text("REV A", bx + bw / 2 + 10, by + 50, 0.6);
        }
        // unghiurile, sus-dreapta
        text(`ROT ${((sym.rotation.y * 57.3) % 360).toFixed(1)}°   PITCH ${(sym.rotation.x * 57.3).toFixed(1)}°`, W - m - 14, y0 + 12, 0.6, "right");
      }
      if (name === "lidar") {
        ["LIDAR · IANISGFX SYMBOL", `PTS      ${N.toLocaleString("en")}`, "RANGE    10.0 m", `SWEEP    ${(u * 360).toFixed(0)}°`, "FPS      60"]
          .forEach((s, i) => text(s, x0, y0 + 12 + i * 15, i ? 0.6 : 0.9));
        // histograma întoarcerilor, jos-dreapta
        const hs = small ? 0.55 : 1, hw = 170 * hs, hx = W - m - 14 - hw, hy = small ? top + 60 : H - m - 24; // pe telefon: mică, sus-dreapta
        g.fillStyle = R(0.85);
        hist.forEach((h, i) => { const hh = (h * 0.8 + 0.2 * Math.abs(Math.sin(t * 3 + i))) * 46 * hs; g.fillRect(hx + i * 6 * hs, hy - hh, 4 * hs, hh); });
        g.strokeStyle = C(0.35); g.beginPath(); g.moveTo(hx, hy + 1); g.lineTo(hx + hw, hy + 1); g.stroke();
        text("RETURNS BY RANGE", hx, hy + 12, 0.6);
      }
      if (name === "track") {
        g.strokeStyle = C(0.8);
        const [sx, sy] = proj(new THREE.Vector3(), sym);
        MARK.forEach((p3, i) => {
          const [x, y] = proj(p3, orbits);
          g.strokeStyle = C(0.18); g.beginPath(); g.moveTo(sx, sy); g.lineTo(x, y); g.stroke();
          g.strokeStyle = C(0.85); g.fillStyle = R(0.3);
          g.fillRect(x - 5, y - 5, 10, 10); g.strokeRect(x - 5, y - 5, 10, 10);
          if (i % 2 === 0) text(`x: ${Math.round(x)} y: ${Math.round(y)}`, x + 9, y - 9, 0.7);
        });
        text(`TRACKING · ${MARK.length} JOINTS · ${tc(t)}`, x0, y0 + 12, 0.75);
      }
      // jos-stânga: tratamentul curent, ca în fișele de studiu
      const num = String(PH.findIndex(([n]) => n === name) + 1).padStart(2, "0");
      text(`${small ? "" : "IANISGFX · SYMBOL STUDY — "}${num} / 05 ${NAMES[name]}`, x0, H - m - 16, 0.55);
      // tăietura dintre tratamente: o bandă luminoasă care trece rapid
      if (cut < 1) {
        const by = cut * H;
        const gr = g.createLinearGradient(0, by - 40, 0, by + 40);
        gr.addColorStop(0, R(0)); gr.addColorStop(0.5, R(0.35)); gr.addColorStop(1, R(0));
        g.fillStyle = gr; g.fillRect(0, by - 40, W, 80);
      }
    };

    // ——— bucla ———
    let raf = 0, last = -1;
    const t0 = performance.now();
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (!W) return;
      const t = (now - t0) / 1000, [i, u, local] = phaseAt(t), name = PH[i][0];
      const cut = Math.min(1, local / 0.28); // primele ~0.3 s după tăietură
      if (i !== last) { cv.classList.toggle("is-soft", name === "scan"); last = i; }
      const flick = cut < 1 ? (Math.random() > 0.35 ? 1 : 0.35) : 1;
      follow(now);
      // se leagănă mult (până aproape de profil) dar stă mai mult cu fața, ca simbolul să se recunoască
      sym.rotation.set(Math.sin(t * 0.5) * 0.2, Math.sin(t * 0.42) * 1.05 + Math.sin(t * 0.13) * 0.3, Math.sin(t * 0.35) * 0.05);
      orbits.rotation.y = t * 0.25;
      // ce se vede în fiecare tratament
      const solidOn = { scan: 1, detect: 1, blueprint: 0, lidar: 0, track: 1 }[name];
      show(solid, solidOn * flick);
      solidMat.uniforms.uScan.value = name === "scan" ? 1 : 0;
      solidMat.uniforms.uCore.value.copy(name === "scan" ? RED : HOT);
      solidMat.uniforms.uRim.value.copy(name === "scan" ? DEEP : RED);
      show(glow, ({ scan: 0.55, detect: 0.9, blueprint: 0.15, lidar: 0.3, track: 0.8 }[name]) * flick);
      show(edges, (name === "blueprint" ? 0.95 : 0) * flick);
      show(cloud, (name === "lidar" ? 1 : 0) * flick);
      show(box, (name === "lidar" ? 0.6 : 0) * flick);
      orbits.children.forEach((l) => show(l, (name === "track" ? 0.35 : 0) * flick));
      show(axes, (name === "detect" ? 0.35 : name === "track" ? 0.12 : 0) * flick);
      if (name === "lidar") cloud.material.size = 0.013 + 0.003 * Math.sin(t * 6);
      renderer.render(scene, camera);
      drawHud(t, name, u, cut);
    };
    // desenează doar cât canvas-ul e pe ecran
    new IntersectionObserver(([e]) => {
      cancelAnimationFrame(raf);
      if (e.isIntersecting) raf = requestAnimationFrame(frame);
    }).observe(cv);
    new ResizeObserver(resize).observe(cv);
    resize();
  }
})();
