// entity.js
// ═══════════════════════════════════════════════════════════════
// MATERIA SOLUTIONS — The Entity
// A living black orb that inhabits the background, hides,
// re-emerges, and rapidly evolves into different 3D nightmare
// forms. Fully black. Fully alive. Fully unsettling.
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ─── ENTITY VERTEX SHADER ───
    const entityVertex = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    // ─── ENTITY FRAGMENT SHADER ───
    // Raymarched SDF nightmare entity that morphs between forms
    const entityFragment = `
        precision highp float;

        uniform float u_time;
        uniform vec2  u_resolution;
        uniform float u_form;         // Current nightmare form (0-5)
        uniform float u_formBlend;    // Blend between current and next form
        uniform float u_nextForm;     // Next form to evolve into
        uniform float u_visibility;   // 0 = hidden, 1 = fully present
        uniform vec2  u_position;     // Entity wander position
        uniform float u_agitation;    // How disturbed/active the entity is
        uniform float u_scale;        // Entity scale (pulses)

        varying vec2 vUv;

        // ── Rotation ──
        mat2 rot(float a) {
            float s = sin(a), c = cos(a);
            return mat2(c, -s, s, c);
        }

        // ── Smooth min (gooey merge) ──
        float smin(float a, float b, float k) {
            float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
            return mix(b, a, h) - k * h * (1.0 - h);
        }

        // ── Smooth max ──
        float smax(float a, float b, float k) {
            return -smin(-a, -b, k);
        }

        // ── Gyroid noise ──
        float gyroid(vec3 p, float scale) {
            p *= scale;
            return abs(dot(sin(p), cos(p.zxy))) / scale;
        }

        // ── Hash ──
        float hash(float n) {
            return fract(sin(n) * 43758.5453);
        }

        // ── Noise ──
        float noise3d(vec3 p) {
            vec3 i = floor(p);
            vec3 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            float n = i.x + i.y * 57.0 + i.z * 113.0;
            return mix(
                mix(mix(hash(n), hash(n + 1.0), f.x),
                    mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y),
                mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
                    mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y),
                f.z
            );
        }

        // ═══════════════════════════════════════
        // FORM 0: THE ORB — Pulsating black sphere
        // with surface tendons and breathing motion
        // ═══════════════════════════════════════
        float formOrb(vec3 p) {
            float t = u_time;
            
            // Breathing sphere
            float breath = sin(t * 1.2) * 0.15 + sin(t * 0.7) * 0.08;
            float d = length(p) - (1.0 + breath);
            
            // Surface tendons — veiny ridges
            d += sin(p.x * 12.0 + t * 2.0) * sin(p.y * 12.0 - t) * sin(p.z * 12.0 + t * 0.5) * 0.04;
            
            // Pulsing sub-surface boils
            for (int i = 0; i < 3; i++) {
                float fi = float(i);
                vec3 bp = p;
                bp.xy *= rot(t * 0.3 + fi * 2.094);
                float boil = length(bp - vec3(0.7 + sin(t + fi) * 0.2, 0.0, 0.0)) - 0.25;
                d = smin(d, boil, 0.5);
            }
            
            // Surface corruption
            d += gyroid(p + vec3(t * 0.15), 6.0) * 0.06;
            
            return d;
        }

        // ═══════════════════════════════════════
        // FORM 1: THE SPIDER — Arachnid horror with
        // jointed limbs erupting from a central mass
        // ═══════════════════════════════════════
        float formSpider(vec3 p) {
            float t = u_time;
            
            // Flattened body
            vec3 bp = p;
            bp.y *= 1.4;
            float body = length(bp) - 0.8;
            
            // Head bulge
            vec3 hp = p - vec3(0.0, 0.3, -0.7);
            float head = length(hp) - 0.45;
            body = smin(body, head, 0.3);
            
            // Eight legs — jointed, twitching
            float legs = 1e10;
            for (int i = 0; i < 8; i++) {
                float fi = float(i);
                float angle = fi * 0.785 + sin(t * 2.0 + fi) * 0.15;
                vec3 lp = p;
                lp.xz *= rot(angle);
                
                // Upper segment
                float twitch = sin(t * 3.0 + fi * 1.7) * 0.2;
                vec3 upper = lp - vec3(0.8 + twitch, 0.3 + sin(t * 2.5 + fi) * 0.15, 0.0);
                float seg1 = length(upper) - 0.08;
                
                // Lower segment — extends further
                vec3 lower = lp - vec3(1.8 + twitch * 0.5, -0.4 + sin(t * 1.8 + fi * 0.9) * 0.3, 0.0);
                float seg2 = length(lower) - 0.05;
                
                // Joint connector
                float joint = length(vec3(
                    max(abs(lp.x) - 1.3, 0.0),
                    lp.y - 0.1 + sin(lp.x * 3.0 + t * 2.0 + fi) * 0.2,
                    lp.z
                )) - 0.06;
                
                float leg = min(seg1, min(seg2, joint));
                legs = min(legs, leg);
            }
            
            float d = smin(body, legs, 0.15);
            
            // Mandibles
            for (int i = 0; i < 2; i++) {
                float side = float(i) * 2.0 - 1.0;
                vec3 mp = p - vec3(side * 0.2, -0.1, -1.0);
                mp.xz *= rot(sin(t * 4.0) * 0.3 * side);
                float mandible = length(mp * vec3(1.0, 1.0, 0.3)) - 0.08;
                d = smin(d, mandible, 0.1);
            }
            
            // Chitinous texture
            d += gyroid(p * 2.0 + vec3(t * 0.1), 8.0) * 0.02;
            
            return d;
        }

        // ═══════════════════════════════════════
        // FORM 2: THE MASS — Writhing tentacle mass,
        // a ball of screaming appendages
        // ═══════════════════════════════════════
        float formMass(vec3 p) {
            float t = u_time;
            
            // Core mass
            float core = length(p) - 0.7;
            
            // Tentacles erupting in all directions
            float tentacles = 1e10;
            for (int i = 0; i < 12; i++) {
                float fi = float(i);
                vec3 tp = p;
                
                // Fibonacci-sphere distribution
                float phi = fi * 2.39996; // golden angle
                float cosTheta = 1.0 - 2.0 * (fi + 0.5) / 12.0;
                float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
                
                vec3 dir = vec3(sinTheta * cos(phi), sinTheta * sin(phi), cosTheta);
                
                // Writhing motion along the tentacle
                float wave = sin(t * 2.5 + fi * 1.3) * 0.4;
                float wave2 = cos(t * 1.8 + fi * 2.1) * 0.3;
                
                // Tentacle as displaced line segment
                vec3 base = dir * 0.6;
                vec3 tip = dir * (2.2 + wave) + vec3(wave2, sin(t + fi) * 0.3, cos(t * 0.7 + fi) * 0.3);
                
                // Distance to line segment
                vec3 pa = tp - base;
                vec3 ba = tip - base;
                float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
                float thick = mix(0.12, 0.02, h); // taper
                float tent = length(pa - ba * h) - thick;
                
                tentacles = min(tentacles, tent);
            }
            
            float d = smin(core, tentacles, 0.3);
            
            // Surface boiling
            d += sin(length(p) * 20.0 - t * 8.0) * 0.008;
            d += gyroid(p + vec3(t * 0.3), 5.0) * 0.04;
            
            return d;
        }

        // ═══════════════════════════════════════
        // FORM 3: THE SKULL — Amalgamation of fused
        // skulls protruding from a dark mass
        // ═══════════════════════════════════════
        float formSkull(vec3 p) {
            float t = u_time;
            
            // Central mass
            float mass = length(p) - 0.9;
            
            // Skull protrusions
            float skulls = 1e10;
            for (int i = 0; i < 6; i++) {
                float fi = float(i);
                vec3 sp = p;

                float angle1 = fi * 1.047 + sin(t * 0.5 + fi) * 0.2;
                float angle2 = fi * 0.618 + cos(t * 0.3 + fi * 1.5) * 0.3;
                sp.xy *= rot(angle1);
                sp.yz *= rot(angle2);
                
                // Each skull displaces outward
                float push = 0.8 + sin(t * 0.8 + fi * 2.0) * 0.2;
                sp -= vec3(push, 0.0, 0.0);
                
                // Cranium (elongated sphere)
                float cranium = length(sp * vec3(1.0, 1.2, 1.0)) - 0.35;
                
                // Eye sockets (subtracted spheres)
                vec3 eyeL = sp - vec3(-0.12, 0.08, -0.28);
                vec3 eyeR = sp - vec3(0.12, 0.08, -0.28);
                float socketL = length(eyeL) - 0.1;
                float socketR = length(eyeR) - 0.1;
                cranium = smax(cranium, -socketL, 0.05);
                cranium = smax(cranium, -socketR, 0.05);
                
                // Jaw
                vec3 jp = sp - vec3(0.0, -0.2, -0.15);
                jp.x = abs(jp.x);
                float jaw = length(jp * vec3(1.0, 0.8, 0.6)) - 0.2;
                float gapAngle = sin(t * 1.5 + fi * 3.0) * 0.15;
                jp = sp - vec3(0.0, -0.25 - gapAngle, -0.2);
                float lowerJaw = length(jp * vec3(1.0, 0.6, 0.5)) - 0.15;
                
                float skull = smin(cranium, jaw, 0.08);
                skull = smin(skull, lowerJaw, 0.06);
                skulls = min(skulls, skull);
            }
            
            float d = smin(mass, skulls, 0.25);
            
            // Bone texture
            d += gyroid(p + vec3(0.0, t * 0.1, 0.0), 12.0) * 0.015;
            
            return d;
        }

        // ═══════════════════════════════════════
        // FORM 4: THE CROWN — Spine-crowned beast,
        // a jagged mass of black bone spires
        // ═══════════════════════════════════════
        float formCrown(vec3 p) {
            float t = u_time;
            
            // Hunched body
            vec3 bp = p;
            bp.y += 0.3;
            float body = length(bp * vec3(1.0, 0.7, 0.9)) - 0.9;
            
            // Crown of spines
            float spines = 1e10;
            for (int i = 0; i < 10; i++) {
                float fi = float(i);
                vec3 sp = p;
                
                float a = fi * 0.628 + sin(t * 0.4 + fi) * 0.1;
                sp.xz *= rot(a);
                
                // Spine: elongated cone pointing up
                float sway = sin(t * 1.5 + fi * 1.1) * 0.15;
                sp -= vec3(0.3, 0.5, 0.0);
                sp.xy *= rot(-0.8 + sway);
                
                // Tapered cylinder (cone)
                float h = 1.5 + sin(fi * 1.7) * 0.5;
                float r1 = 0.08;
                float r2 = 0.01;
                vec2 q = vec2(length(sp.xz), sp.y);
                vec2 k1 = vec2(r2, h);
                vec2 k2 = vec2(r2 - r1, 2.0 * h);
                vec2 ca = vec2(q.x - min(q.x, (q.y < 0.0 ? r1 : r2)), abs(q.y) - h);
                vec2 cb = q - k1 + k2 * clamp(dot(k1 - q, k2) / dot(k2, k2), 0.0, 1.0);
                float spine = (cb.x < 0.0 && ca.y < 0.0) ? -1.0 : 1.0;
                spine *= sqrt(min(dot(ca, ca), dot(cb, cb)));
                
                spines = min(spines, spine);
            }
            
            float d = smin(body, spines, 0.15);
            
            // Jagged ridge texture
            d += sin(p.y * 30.0 + p.x * 10.0 + t) * 0.01;
            d += gyroid(p + vec3(t * 0.2, 0.0, t * 0.1), 7.0) * 0.03;
            
            return d;
        }

        // ═══════════════════════════════════════
        // FORM 5: THE PARASITE — Fractal cluster
        // of smaller orbs budding off the main body
        // ═══════════════════════════════════════
        float formParasite(vec3 p) {
            float t = u_time;
            
            // Mother orb
            float mother = length(p) - 0.8;
            
            // Budding children at various stages
            float buds = 1e10;
            for (int i = 0; i < 8; i++) {
                float fi = float(i);
                vec3 bp = p;
                
                float phase = t * 0.6 + fi * 0.785;
                float growthCycle = fract(phase * 0.15);
                float size = growthCycle * 0.4;
                
                vec3 dir;
                dir.x = sin(fi * 2.4 + t * 0.3) * cos(fi * 1.7);
                dir.y = cos(fi * 2.4 + t * 0.2) * sin(fi * 1.1 + t * 0.1);
                dir.z = sin(fi * 1.3 + t * 0.15);
                dir = normalize(dir);
                
                float dist = 0.9 + growthCycle * 0.8;
                vec3 budPos = dir * dist;
                
                // The bud itself
                float bud = length(bp - budPos) - size;
                
                // Connective stalk
                vec3 pa = bp;
                vec3 ba = budPos;
                float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
                float stalk = length(pa - ba * h) - mix(0.1, 0.03, h);
                
                buds = min(buds, min(bud, stalk));
            }
            
            // Sub-buds (fractal-like smaller parasites on larger ones)
            for (int i = 0; i < 4; i++) {
                float fi = float(i) + 8.0;
                float phase = t * 0.8 + fi * 1.2;
                vec3 dir = normalize(vec3(
                    sin(phase), cos(phase * 0.7), sin(phase * 1.3)
                ));
                float subBud = length(p - dir * 1.6) - 0.12;
                buds = min(buds, subBud);
            }
            
            float d = smin(mother, buds, 0.2);
            
            // Organic infection pattern
            d += gyroid(p + vec3(t * 0.2), 8.0) * 0.03;
            d += sin(length(p) * 15.0 - t * 3.0) * 0.01;
            
            return d;
        }

        // ═══════════════════════════════════════
        // MASTER SDF — Blends between nightmare forms
        // ═══════════════════════════════════════
        float mapEntity(vec3 p) {
            // Apply entity position offset
            p -= vec3(u_position, 0.0);
            
            // Global rotation — slow, eerie tumble
            float t = u_time;
            p.xy *= rot(t * 0.12 + sin(t * 0.07) * 0.5);
            p.yz *= rot(t * 0.09 + cos(t * 0.05) * 0.3);
            p.xz *= rot(sin(t * 0.11) * 0.4);
            
            // Scale with agitation pulse
            float pulse = 1.0 + sin(t * 3.0 * u_agitation) * 0.05 * u_agitation;
            p /= (u_scale * pulse);
            
            // Evaluate current and next form
            float d1 = 1e10;
            float d2 = 1e10;
            
            int form1 = int(u_form);
            int form2 = int(u_nextForm);
            
            // Current form
            if (form1 == 0) d1 = formOrb(p);
            else if (form1 == 1) d1 = formSpider(p);
            else if (form1 == 2) d1 = formMass(p);
            else if (form1 == 3) d1 = formSkull(p);
            else if (form1 == 4) d1 = formCrown(p);
            else d1 = formParasite(p);
            
            // Next form (for blending)
            if (form2 == 0) d2 = formOrb(p);
            else if (form2 == 1) d2 = formSpider(p);
            else if (form2 == 2) d2 = formMass(p);
            else if (form2 == 3) d2 = formSkull(p);
            else if (form2 == 4) d2 = formCrown(p);
            else d2 = formParasite(p);
            
            // Smooth morph blend
            float d = mix(d1, d2, u_formBlend);
            
            // During morph, add chaotic distortion
            if (u_formBlend > 0.01 && u_formBlend < 0.99) {
                float chaos = u_formBlend * (1.0 - u_formBlend) * 4.0; // peaks at 0.5
                d += gyroid(p + vec3(t * 2.0), 3.0) * 0.15 * chaos;
                d += sin(p.x * 20.0 + t * 10.0) * sin(p.y * 20.0) * 0.03 * chaos;
            }
            
            // Re-apply scale to distance
            d *= u_scale * pulse;
            
            return d * 0.6;
        }

        // ── Normal calculation ──
        vec3 calcNormal(vec3 p) {
            vec2 e = vec2(0.003, 0.0);
            return normalize(vec3(
                mapEntity(p + e.xyy) - mapEntity(p - e.xyy),
                mapEntity(p + e.yxy) - mapEntity(p - e.yxy),
                mapEntity(p + e.yyx) - mapEntity(p - e.yyx)
            ));
        }

        // ── Ambient occlusion ──
        float calcAO(vec3 p, vec3 n) {
            float occ = 0.0;
            float sca = 1.0;
            for (int i = 0; i < 5; i++) {
                float h = 0.01 + 0.12 * float(i) / 4.0;
                float d = mapEntity(p + h * n);
                occ += (h - d) * sca;
                sca *= 0.95;
            }
            return clamp(1.0 - 2.0 * occ, 0.0, 1.0);
        }

        void main() {
            // Discard if entity is fully hidden
            if (u_visibility < 0.01) discard;
            
            vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;

            vec3 ro = vec3(0.0, 0.0, 6.0);
            vec3 rd = normalize(vec3(uv, -1.2));
            
            float d0 = 0.0;
            float d;
            vec3 p;
            
            // Raymarching
            for (int i = 0; i < 80; i++) {
                p = ro + rd * d0;
                d = mapEntity(p);
                if (d < 0.002 || d0 > 20.0) break;
                d0 += d;
            }

            vec4 col = vec4(0.0); // Transparent background
            
            if (d0 < 20.0) {
                vec3 n = calcNormal(p);
                vec3 viewDir = normalize(ro - p);
                
                // Ambient occlusion for crevice darkness
                float ao = calcAO(p, n);
                
                // Fresnel rim — the only "light" on a void creature
                float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 4.0);
                
                // The entity is FULLY BLACK — 
                // only the faintest edge lighting distinguishes it
                vec3 black = vec3(0.0);
                
                // Subtle dark rim glow — barely visible dark purple/red
                vec3 rimColor = vec3(0.04, 0.0, 0.06); // near-black purple
                
                // During agitation, rim becomes slightly more visible
                rimColor += vec3(0.02, 0.0, 0.0) * u_agitation;
                
                vec3 finalColor = black + rimColor * fresnel * ao;
                
                // Deep crevices are absolute void
                finalColor *= mix(0.3, 1.0, ao);
                
                // Visibility fade — entity materializes/dissolves
                float alpha = u_visibility * (0.92 + fresnel * 0.08);
                
                // Edge dissolution effect when appearing/disappearing
                if (u_visibility < 0.95) {
                    float dissolve = noise3d(p * 5.0 + vec3(u_time * 0.5));
                    if (dissolve > u_visibility) {
                        alpha = 0.0;
                    }
                }
                
                col = vec4(finalColor, alpha);
            }

            gl_FragColor = col;
        }
    `;

    // ═══════════════════════════════════════════════════════════════
    // ENTITY AI — Autonomous behavior engine
    // ═══════════════════════════════════════════════════════════════

    const NUM_FORMS = 6;
    const FORM_NAMES = ['Orb', 'Spider', 'Mass', 'Skull', 'Crown', 'Parasite'];

    // Behavior states
    const STATE = {
        LURKING:     0,  // Drifting in the background
        HIDING:      1,  // Fading out / dissolving
        EMERGING:    2,  // Materializing from nothing
        EVOLVING:    3,  // Morphing between forms
        WATCHING:    4,  // Still, staring at the viewer
        FLEEING:     5,  // Rapidly retreating off-screen
    };

    class Entity {
        constructor() {
            this.mesh = null;
            this.material = null;
            this.uniforms = null;

            // Form state
            this.currentForm = 0;
            this.nextForm = 0;
            this.formBlend = 0;
            this.isEvolving = false;

            // Position & movement
            this.posX = 0;
            this.posY = 0;
            this.targetX = 0;
            this.targetY = 0;
            this.velX = 0;
            this.velY = 0;
            this.driftSpeed = 0.0003;

            // Visibility
            this.visibility = 0;
            this.targetVisibility = 0;

            // Scale
            this.scale = 0.8;
            this.targetScale = 0.8;

            // Agitation
            this.agitation = 0;
            this.targetAgitation = 0;

            // Behavior
            this.state = STATE.HIDING;
            this.stateTimer = 0;
            this.stateDuration = 0;
            this.evolutionCount = 0;

            // Timers
            this.hideTimer   = 3000 + Math.random() * 4000; // ms before first appearance
            this.evolveTimer = 0;
        }

        init(scene) {
            this.uniforms = {
                u_time:       { value: 0.0 },
                u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                u_form:       { value: 0.0 },
                u_formBlend:  { value: 0.0 },
                u_nextForm:   { value: 0.0 },
                u_visibility: { value: 0.0 },
                u_position:   { value: new THREE.Vector2(0, 0) },
                u_agitation:  { value: 0.0 },
                u_scale:      { value: 0.8 },
            };

            const geometry = new THREE.PlaneGeometry(2, 2);
            this.material = new THREE.ShaderMaterial({
                vertexShader: entityVertex,
                fragmentShader: entityFragment,
                uniforms: this.uniforms,
                transparent: true,
                depthWrite: false,
                depthTest: false,
            });

            this.mesh = new THREE.Mesh(geometry, this.material);
            // Render between background and the omen SDF
            this.mesh.renderOrder = -0.5;
            scene.add(this.mesh);

            // Start hidden, position randomly off to a side
            this.posX = (Math.random() - 0.5) * 2.0;
            this.posY = (Math.random() - 0.5) * 1.0;
            this.targetX = this.posX;
            this.targetY = this.posY;

            // Schedule first emergence
            this.setState(STATE.HIDING);
            this.stateDuration = 3000 + Math.random() * 5000;

            // Resize handler
            window.addEventListener('resize', () => {
                this.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
            });
        }

        setState(newState) {
            this.state = newState;
            this.stateTimer = 0;

            switch (newState) {
                case STATE.LURKING:
                    this.stateDuration = 6000 + Math.random() * 10000;
                    this.targetAgitation = Math.random() * 0.3;
                    this.pickNewDriftTarget();
                    break;

                case STATE.HIDING:
                    this.stateDuration = 4000 + Math.random() * 8000;
                    this.targetVisibility = 0;
                    this.targetAgitation = 0;
                    break;

                case STATE.EMERGING:
                    this.stateDuration = 2000 + Math.random() * 2000;
                    this.targetVisibility = 1;
                    this.targetAgitation = 0.5;
                    // Pick a new position to materialize at
                    this.posX = (Math.random() - 0.5) * 3.0;
                    this.posY = (Math.random() - 0.5) * 1.5;
                    this.targetX = this.posX;
                    this.targetY = this.posY;
                    // Maybe evolve on emergence
                    if (Math.random() < 0.4) {
                        this.startEvolution();
                    }
                    break;

                case STATE.EVOLVING:
                    this.stateDuration = 2500 + Math.random() * 1500;
                    this.targetAgitation = 1.0;
                    this.startEvolution();
                    break;

                case STATE.WATCHING:
                    this.stateDuration = 3000 + Math.random() * 5000;
                    this.targetAgitation = 0.1;
                    // Slowly drift toward center (watching user)
                    this.targetX = (Math.random() - 0.5) * 0.5;
                    this.targetY = (Math.random() - 0.5) * 0.3;
                    this.driftSpeed = 0.001;
                    break;

                case STATE.FLEEING:
                    this.stateDuration = 1500 + Math.random() * 1000;
                    this.targetAgitation = 0.8;
                    // Flee to a random edge
                    const edge = Math.floor(Math.random() * 4);
                    if (edge === 0) this.targetX = -4.0;
                    else if (edge === 1) this.targetX = 4.0;
                    else if (edge === 2) this.targetY = -3.0;
                    else this.targetY = 3.0;
                    this.driftSpeed = 0.008;
                    break;
            }
        }

        pickNewDriftTarget() {
            this.targetX = (Math.random() - 0.5) * 3.5;
            this.targetY = (Math.random() - 0.5) * 1.8;
            this.driftSpeed = 0.0003 + Math.random() * 0.0005;
        }

        startEvolution() {
            if (this.isEvolving) return;
            this.isEvolving = true;
            this.formBlend = 0;
            
            // Pick a different form
            let next;
            do {
                next = Math.floor(Math.random() * NUM_FORMS);
            } while (next === this.currentForm);
            this.nextForm = next;
            this.evolutionCount++;
        }

        updateBehavior(dt) {
            this.stateTimer += dt;

            if (this.stateTimer >= this.stateDuration) {
                // State transition logic
                switch (this.state) {
                    case STATE.HIDING:
                        this.setState(STATE.EMERGING);
                        break;
                    case STATE.EMERGING:
                        // After emerging, either lurk, watch, or immediately evolve
                        const r = Math.random();
                        if (r < 0.3) this.setState(STATE.WATCHING);
                        else if (r < 0.6) this.setState(STATE.EVOLVING);
                        else this.setState(STATE.LURKING);
                        break;
                    case STATE.LURKING:
                        const r2 = Math.random();
                        if (r2 < 0.25) this.setState(STATE.HIDING);
                        else if (r2 < 0.5) this.setState(STATE.EVOLVING);
                        else if (r2 < 0.7) this.setState(STATE.WATCHING);
                        else if (r2 < 0.85) this.setState(STATE.FLEEING);
                        else {
                            // Continue lurking with new target
                            this.pickNewDriftTarget();
                            this.stateTimer = 0;
                            this.stateDuration = 5000 + Math.random() * 8000;
                        }
                        break;
                    case STATE.EVOLVING:
                        const r3 = Math.random();
                        if (r3 < 0.3) this.setState(STATE.LURKING);
                        else if (r3 < 0.5) this.setState(STATE.WATCHING);
                        else if (r3 < 0.7) {
                            // Rapid chain evolution!
                            this.setState(STATE.EVOLVING);
                        } else this.setState(STATE.HIDING);
                        break;
                    case STATE.WATCHING:
                        const r4 = Math.random();
                        if (r4 < 0.3) this.setState(STATE.FLEEING);
                        else if (r4 < 0.5) this.setState(STATE.EVOLVING);
                        else this.setState(STATE.LURKING);
                        break;
                    case STATE.FLEEING:
                        this.setState(STATE.HIDING);
                        break;
                }
            }

            // Lurking: occasionally twitch scale
            if (this.state === STATE.LURKING) {
                if (Math.random() < 0.001) {
                    this.targetScale = 0.6 + Math.random() * 0.5;
                }
                if (Math.random() < 0.0005) {
                    this.targetAgitation = Math.random() * 0.6;
                }
            }

            // Watching: very slow subtle scale breathing
            if (this.state === STATE.WATCHING) {
                this.targetScale = 0.85 + Math.sin(this.stateTimer * 0.001) * 0.1;
            }
        }

        update(time, dt) {
            // Update behavior AI
            this.updateBehavior(dt);

            // Smooth position movement
            this.posX += (this.targetX - this.posX) * this.driftSpeed * dt;
            this.posY += (this.targetY - this.posY) * this.driftSpeed * dt;

            // Smooth visibility
            const visFactor = this.state === STATE.FLEEING ? 0.003 : 0.0015;
            this.visibility += (this.targetVisibility - this.visibility) * visFactor * dt;
            this.visibility = Math.max(0, Math.min(1, this.visibility));

            // Smooth agitation
            this.agitation += (this.targetAgitation - this.agitation) * 0.002 * dt;

            // Smooth scale
            this.scale += (this.targetScale - this.scale) * 0.002 * dt;

            // Evolution morphing
            if (this.isEvolving) {
                const evolveSpeed = 0.0008 + this.agitation * 0.0005;
                this.formBlend += evolveSpeed * dt;
                if (this.formBlend >= 1.0) {
                    this.formBlend = 0;
                    this.currentForm = this.nextForm;
                    this.isEvolving = false;
                    this.targetAgitation = Math.max(0, this.targetAgitation - 0.3);
                }
            }

            // Push uniforms
            this.uniforms.u_time.value = time;
            this.uniforms.u_form.value = this.currentForm;
            this.uniforms.u_formBlend.value = this.formBlend;
            this.uniforms.u_nextForm.value = this.nextForm;
            this.uniforms.u_visibility.value = this.visibility;
            this.uniforms.u_position.value.set(this.posX, this.posY);
            this.uniforms.u_agitation.value = this.agitation;
            this.uniforms.u_scale.value = this.scale;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // BOOT — Initialize and hook into the existing animation loop
    // ═══════════════════════════════════════════════════════════════

    let entity = null;
    let lastTime = 0;

    function boot() {
        // Wait for the WebGL container and Three.js scene from omen.js
        // We need to hook into the existing renderer
        const container = document.getElementById('webgl-container');
        if (!container) return;

        // The entity creates its own isolated overlay canvas
        // to avoid conflicts with omen.js's scene
        const canvas = document.createElement('canvas');
        canvas.id = 'entity-canvas';
        canvas.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            z-index: 1;
            pointer-events: none;
        `;
        document.body.appendChild(canvas);

        // Create dedicated renderer
        const renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            alpha: true,
            antialias: false,
            powerPreference: 'high-performance',
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.setClearColor(0x000000, 0);

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        // Create the entity
        entity = new Entity();
        entity.init(scene);

        // Resize handler
        window.addEventListener('resize', () => {
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Animation loop
        const clock = new THREE.Clock();

        function animate() {
            requestAnimationFrame(animate);

            const elapsed = clock.getElapsedTime();
            const dt = Math.min((elapsed - lastTime) * 1000, 50); // cap delta to 50ms
            lastTime = elapsed;

            entity.update(elapsed, dt);
            renderer.render(scene, camera);
        }

        animate();
    }

    // Boot after DOM + Three.js are ready
    if (document.readyState === 'complete') {
        setTimeout(boot, 500);
    } else {
        window.addEventListener('load', () => setTimeout(boot, 500));
    }

    // Expose for external control / debugging
    window.MateriaEntity = {
        getState: () => entity ? FORM_NAMES[entity.currentForm] : 'uninitialized',
        getEvolutionCount: () => entity ? entity.evolutionCount : 0,
        forceEvolve: () => { if (entity) { entity.startEvolution(); entity.targetAgitation = 1.0; } },
        forceHide: () => { if (entity) entity.setState(STATE.HIDING); },
        forceEmerge: () => { if (entity) entity.setState(STATE.EMERGING); },
        forceWatch: () => { if (entity) entity.setState(STATE.WATCHING); },
        forceFlee: () => { if (entity) entity.setState(STATE.FLEEING); },
    };

})();
