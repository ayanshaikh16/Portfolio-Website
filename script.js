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

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// ==========================================================
// Three.js hero: a particle globe with an orbit ring around your photo
// ==========================================================
(function initHeroGlobe() {
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
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.z = 6;

    // tilt = follows the mouse, spin = constant rotation
    const tilt = new THREE.Group();
    const spin = new THREE.Group();
    tilt.add(spin);
    scene.add(tilt);

    // --- Particle sphere (Fibonacci distribution = evenly spaced points)
    const COUNT = 1600;
    const RADIUS = 2.25;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const blue = new THREE.Color('#3a4dff');
    const red = new THREE.Color('#c01818');
    const golden = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < COUNT; i++) {
        const y = 1 - (i / (COUNT - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const theta = i * golden;
        const jitter = 1 + (Math.random() - 0.5) * 0.1;

        positions[i * 3] = Math.cos(theta) * r * RADIUS * jitter;
        positions[i * 3 + 1] = y * RADIUS * jitter;
        positions[i * 3 + 2] = Math.sin(theta) * r * RADIUS * jitter;

        const c = Math.random() < 0.07 ? red : blue;
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
    }

    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointsGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const pointsMat = new THREE.PointsMaterial({
        size: 0.035,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
    });
    spin.add(new THREE.Points(pointsGeo, pointsMat));

    // --- Red orbit ring
    const ringCurve = new THREE.EllipseCurve(0, 0, 2.65, 2.65, 0, Math.PI * 2);
    const ringGeo = new THREE.BufferGeometry().setFromPoints(ringCurve.getPoints(160));
    const ring = new THREE.LineLoop(
        ringGeo,
        new THREE.LineBasicMaterial({ color: 0x880808, transparent: true, opacity: 0.9 })
    );
    ring.rotation.x = Math.PI / 2.4;
    ring.rotation.y = -0.35;
    tilt.add(ring);

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

        spin.rotation.y += 0.0018;
        ring.rotation.z += 0.0025;
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
