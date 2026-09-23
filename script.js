// ==========================================================
// Mobile menu
// ==========================================================
const toggle = document.querySelector('.nav-toggle');
const menu = document.getElementById('nav-menu');

function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('open', open);
}

toggle.addEventListener('click', () => {
    setMenu(toggle.getAttribute('aria-expanded') !== 'true');
});

menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMenu(false));
});

// ==========================================================
// Navbar border on scroll + highlight the current section
// ==========================================================
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });

const navLinks = menu.querySelectorAll('a');
const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
        });
    });
}, { rootMargin: '-45% 0px -50% 0px' });

document.querySelectorAll('main section').forEach((s) => sectionObserver.observe(s));

// ==========================================================
// Project demo videos
// ==========================================================
const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

document.querySelectorAll('.project-demo video').forEach((video) => {
    const figure = video.closest('.project-demo');
    const hide = () => { figure.hidden = true; };

    // Hide the frame until you add the video file, instead of showing an empty box
    video.addEventListener('error', hide);
    if (video.error || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) hide();

    // No autoplay for people who ask for reduced motion: give them play controls instead
    if (reduceMotionQuery.matches) {
        video.removeAttribute('autoplay');
        video.pause();
        video.controls = true;
        return;
    }

    // Only play while on screen, to save battery and bandwidth
    new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
            video.play().catch(() => { video.controls = true; });
        } else {
            video.pause();
        }
    }).observe(video);
});

// ==========================================================
// Resume viewer
// Desktop: opens the PDF in a pop-up with a download button.
// Phones and browsers without a built-in PDF viewer: the link
// opens the PDF in a new tab instead, where it displays properly.
// ==========================================================
const resumeDialog = document.getElementById('resume-dialog');
const resumeFrame = resumeDialog.querySelector('.resume-frame');
const canShowPdfInline =
    typeof resumeDialog.showModal === 'function' &&
    navigator.pdfViewerEnabled !== false &&
    window.matchMedia('(min-width: 700px)').matches;

document.querySelectorAll('.js-open-resume').forEach((link) => {
    link.addEventListener('click', (e) => {
        if (!canShowPdfInline) return; // fall back to opening in a new tab
        e.preventDefault();
        if (!resumeFrame.src) resumeFrame.src = 'resume.pdf#view=FitH';
        setMenu(false);
        resumeDialog.showModal();
    });
});

resumeDialog.querySelector('.resume-close').addEventListener('click', () => resumeDialog.close());

// Clicking the dark area outside the resume closes it
resumeDialog.addEventListener('click', (e) => {
    if (e.target === resumeDialog) resumeDialog.close();
});

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// ==========================================================
// Three.js hero: a wireframe ball (truncated icosahedron) with an orbit ring
// ==========================================================
(function initHeroBall() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas || typeof THREE === 'undefined') return; // page still works without WebGL

    const wrapper = canvas.parentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (err) {
        return; // WebGL not supported
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 7;

    // tilt = follows the mouse, spin = constant rotation
    const tilt = new THREE.Group();
    const spin = new THREE.Group();
    tilt.add(spin);
    scene.add(tilt);

    const BLUE = 0x3a7be0;
    const GARNET = 0xa50044;
    const GOLD = 0xedbb00;
    const RADIUS = 2.1;

    // --- Vertices: cyclic permutations of three coordinate patterns, all sign combinations
    const phi = (1 + Math.sqrt(5)) / 2;
    const patterns = [
        [0, 1, 3 * phi],
        [1, 2 + phi, 2 * phi],
        [phi, 2, 2 * phi + 1],
    ];
    const verts = [];
    const seen = new Set();
    for (const [a, b, c] of patterns) {
        for (const [x, y, z] of [[a, b, c], [b, c, a], [c, a, b]]) {
            for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1]) {
                const v = new THREE.Vector3(x * sx, y * sy, z * sz);
                const key = v.toArray().map((n) => n.toFixed(3)).join(',');
                if (!seen.has(key)) {
                    seen.add(key);
                    verts.push(v);
                }
            }
        }
    }
    const scale = RADIUS / verts[0].length();
    verts.forEach((v) => v.multiplyScalar(scale));

    // --- Edges: every pair of vertices one edge-length apart (edge length is 2 before scaling)
    const edgeLen = 2 * scale;
    const edgePts = [];
    for (let i = 0; i < verts.length; i++) {
        for (let k = i + 1; k < verts.length; k++) {
            if (Math.abs(verts[i].distanceTo(verts[k]) - edgeLen) < 1e-3) {
                edgePts.push(verts[i], verts[k]);
            }
        }
    }
    spin.add(new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(edgePts),
        new THREE.LineBasicMaterial({ color: BLUE, transparent: true, opacity: 0.75 })
    ));

    // --- Pentagon patches in garnet: the 5 vertices nearest each of the 12 icosahedron directions
    const pentagonTris = [];
    const dirs = [];
    for (const [x, y, z] of [[0, 1, phi], [1, phi, 0], [phi, 0, 1]]) {
        for (const s1 of [1, -1]) for (const s2 of [1, -1]) {
            const d = [x, y, z].map((n, idx) => n * (idx === 0 ? 1 : 1));
            const v = new THREE.Vector3(...d);
            // flip the signs of the two non-zero components
            const comps = v.toArray();
            let flipped = 0;
            for (let q = 0; q < 3; q++) {
                if (comps[q] !== 0) comps[q] *= flipped++ === 0 ? s1 : s2;
            }
            dirs.push(new THREE.Vector3(...comps).normalize());
        }
    }
    for (const d of dirs) {
        const ring = verts
            .map((v) => ({ v, dot: v.dot(d) }))
            .sort((p, q) => q.dot - p.dot)
            .slice(0, 5)
            .map((p) => p.v);
        const center = ring.reduce((acc, v) => acc.add(v), new THREE.Vector3()).divideScalar(5);
        // order the 5 corners around the centre so the fan is clean
        const u = ring[0].clone().sub(center).normalize();
        const w = new THREE.Vector3().crossVectors(d, u);
        ring.sort((p, q) => {
            const a1 = Math.atan2(p.clone().sub(center).dot(w), p.clone().sub(center).dot(u));
            const a2 = Math.atan2(q.clone().sub(center).dot(w), q.clone().sub(center).dot(u));
            return a1 - a2;
        });
        for (let t = 0; t < 5; t++) {
            pentagonTris.push(center, ring[t], ring[(t + 1) % 5]);
        }
    }
    spin.add(new THREE.Mesh(
        new THREE.BufferGeometry().setFromPoints(pentagonTris),
        new THREE.MeshBasicMaterial({
            color: GARNET, transparent: true, opacity: 0.55,
            side: THREE.DoubleSide, depthWrite: false,
        })
    ));

    // --- Small vertex points, a few picked out in gold
    const vertColors = [];
    const gold = new THREE.Color(GOLD);
    const white = new THREE.Color(0xdfe6ff);
    verts.forEach((_, i) => {
        const col = i % 12 === 0 ? gold : white;
        vertColors.push(col.r, col.g, col.b);
    });
    const vertGeo = new THREE.BufferGeometry().setFromPoints(verts);
    vertGeo.setAttribute('color', new THREE.Float32BufferAttribute(vertColors, 3));
    spin.add(new THREE.Points(vertGeo, new THREE.PointsMaterial({
        size: 0.06, vertexColors: true, transparent: true, opacity: 0.9,
    })));

    // --- Garnet orbit ring
    const ringCurve = new THREE.EllipseCurve(0, 0, 2.75, 2.75, 0, Math.PI * 2);
    const orbit = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(ringCurve.getPoints(160)),
        new THREE.LineBasicMaterial({ color: GARNET, transparent: true, opacity: 0.8 })
    );
    orbit.rotation.x = Math.PI / 2.4;
    orbit.rotation.y = -0.35;
    tilt.add(orbit);

    spin.rotation.x = 0.35;

    // --- Mouse tracking (smoothed in the render loop)
    let targetX = 0;
    let targetY = 0;
    window.addEventListener('pointermove', (e) => {
        targetX = (e.clientX / window.innerWidth - 0.5) * 0.6;
        targetY = (e.clientY / window.innerHeight - 0.5) * 0.4;
    }, { passive: true });

    // --- Keep canvas sized to its wrapper
    function resize() {
        const size = wrapper.clientWidth;
        renderer.setSize(size, size, false);
        camera.aspect = 1;
        camera.updateProjectionMatrix();
        if (reduceMotion) renderer.render(scene, camera);
    }
    window.addEventListener('resize', resize);
    resize();

    // --- Only animate while the hero is on screen
    let visible = true;
    new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
    }).observe(wrapper);

    function animate() {
        requestAnimationFrame(animate);
        if (!visible || document.hidden) return;

        spin.rotation.y += 0.003;
        orbit.rotation.z += 0.0025;
        tilt.rotation.y += (targetX - tilt.rotation.y) * 0.05;
        tilt.rotation.x += (targetY - tilt.rotation.x) * 0.05;

        renderer.render(scene, camera);
    }

    if (reduceMotion) {
        renderer.render(scene, camera); // one still frame, no animation
    } else {
        animate();
    }
})();
