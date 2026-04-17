// buttons.js
// Framework for unifying PointCloud and SDF Matrix into single controllable entities

class MatrixButton {
    constructor(scene, camera) {
        this.group = new THREE.Group();
        this.scene = scene;
        this.camera = camera;

        // Ensure they render ON TOP of the background but behave as 3D
        this.group.position.z = 0.5;
        this.scene.add(this.group);

        this.uniforms = {
            u_time: { value: 0 },
            u_hover: { value: 0 },
            u_click: { value: 0 },
            u_inverseModelMatrix: { value: new THREE.Matrix4() },
            u_cameraPos: { value: new THREE.Vector3(0, 0, 1) } // Ortho camera position
        };

        // --- 1. Point Cloud Structure ---
        const pCount = 800; // Dense matrix points
        const pcGeo = new THREE.BufferGeometry();
        const pPos = new Float32Array(pCount * 3);
        const pRnd = new Float32Array(pCount * 3);
        for (let i = 0; i < pCount * 3; i++) {
            pPos[i] = (Math.random() - 0.5) * 2.0;
            pRnd[i] = Math.random();
        }
        pcGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        pcGeo.setAttribute('aRandom', new THREE.BufferAttribute(pRnd, 3));

        const pcMat = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: `
                uniform float u_time;
                uniform float u_hover;
                uniform float u_click;
                attribute vec3 aRandom;
                varying float vAlpha;
                void main() {
                    vec3 pos = position;
                    
                    // Shape into a matrix shell
                    float r = length(pos);
                    if(r > 0.1) {
                        pos = normalize(pos) * (0.5 + aRandom.x * 0.2);
                    }
                    
                    // Orbiting physics
                    float speed = 1.0 + aRandom.y;
                    float angle = u_time * speed * mix(0.2, 1.5, u_hover);
                    float s = sin(angle), c = cos(angle);
                    mat2 rot = mat2(c, -s, s, c);
                    pos.xy *= rot;
                    
                    // Expansion on hover & click ripple
                    pos *= 1.0 + (u_hover * 0.4) + (u_click * sin(u_time*20.0 - r*10.0)*0.2);
                    
                    vAlpha = 0.2 + 0.8 * sin(u_time * 5.0 + aRandom.z * 10.0);
                    vAlpha *= mix(0.1, 1.0, u_hover); // Much more visible on hover
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    
                    // Dynamic point sizes based on interaction
                    gl_PointSize = (1.0 + aRandom.x * 3.0) * mix(1.0, 3.0, u_hover);
                }
            `,
            fragmentShader: `
                varying float vAlpha;
                void main() {
                    vec2 coord = gl_PointCoord - vec2(0.5);
                    if(length(coord) > 0.5) discard;
                    
                    // Piercing white/cyan data points
                    gl_FragColor = vec4(0.95, 0.98, 1.0, vAlpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.points = new THREE.Points(pcGeo, pcMat);
        this.group.add(this.points);

        // --- 2. Raymarched SDF Core ---
        // Bound box for the raymarcher: 1x1x1 local space limits
        const sdfGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const sdfMat = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: `
                varying vec3 vLocalPos;
                void main() {
                    vLocalPos = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float u_time;
                uniform float u_hover;
                uniform float u_click;
                uniform mat4 u_inverseModelMatrix;
                uniform vec3 u_cameraPos;
                varying vec3 vLocalPos;

                mat2 rot(float a) {
                    float s = sin(a), c = cos(a);
                    return mat2(c, -s, s, c);
                }

                float smin(float a, float b, float k) {
                    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
                    return mix(b, a, h) - k * h * (1.0 - h);
                }

                float gyroid(vec3 p, float scale) {
                    p *= scale;
                    return abs(dot(sin(p), cos(p.zxy))) / scale;
                }

                float map(vec3 p) {
                    // Interaction rotations
                    p.xy *= rot(u_time * mix(0.5, 2.0, u_hover));
                    p.yz *= rot(u_time * 0.3);
                    
                    // Liquid metallic core
                    float d = length(p) - mix(0.2, 0.4, u_hover);
                    
                    // Complex orbital nodes activating on hover
                    float nodes = length(p - vec3(0.3 * sin(u_time*3.0), 0.0, 0.0)) - 0.1;
                    d = smin(d, nodes, 0.2);
                    
                    // High-frequency detail
                    d -= gyroid(p + vec3(u_time*1.0), 10.0) * 0.05 * u_hover;
                    
                    // Click ripple deformation
                    d += sin(length(p)*40.0 - u_time*30.0) * 0.02 * u_click;
                    
                    return d;
                }

                vec3 calcNormal(vec3 p) {
                    vec2 e = vec2(0.005, 0.0);
                    return normalize(vec3(
                        map(p + e.xyy) - map(p - e.xyy),
                        map(p + e.yxy) - map(p - e.yxy),
                        map(p + e.yyx) - map(p - e.yyx)
                    ));
                }

                void main() {
                    // Start ray from the bounding box surface
                    vec3 ro = vLocalPos; 
                    
                    // Ortho camera looks down -Z globally
                    // Transform global direction into local space
                    vec3 worldRayDir = vec3(0.0, 0.0, -1.0); 
                    vec3 localRayDir = normalize((u_inverseModelMatrix * vec4(worldRayDir, 0.0)).xyz);
                    vec3 rd = localRayDir;
                    
                    float t = 0.0;
                    float d = 0.0;
                    vec3 p;
                    for(int i = 0; i < 40; i++) {
                        p = ro + rd * t;
                        d = map(p);
                        if(d < 0.001 || t > 3.0) break;
                        t += d;
                    }
                    
                    // If ray escaped bounds without hitting SDF
                    if(d >= 0.01) discard;
                    
                    // Shading (Sleek Mundane White Plastic / Liquid Data)
                    vec3 n = calcNormal(p);
                    vec3 localCamPos = (u_inverseModelMatrix * vec4(u_cameraPos, 1.0)).xyz;
                    vec3 viewDir = normalize(localCamPos - p);
                    
                    float diff = max(dot(n, normalize(vec3(2,3,2))), 0.0);
                    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
                    
                    // Base pearl white
                    vec3 albedo = mix(vec3(0.85, 0.88, 0.9), vec3(0.95, 0.98, 1.0), diff);
                    vec3 finalCol = albedo;
                    
                    // Intense energy rim
                    finalCol += vec3(1.0, 1.0, 1.0) * fresnel * mix(0.4, 2.0, u_hover);
                    // Blue-ish core resonance on hover
                    finalCol += vec3(0.1, 0.5, 1.0) * (1.0 - diff) * u_hover * 0.2;
                    
                    gl_FragColor = vec4(finalCol, mix(0.3, 0.9, u_hover));
                }
            `,
            transparent: true
        });

        this.sdfMesh = new THREE.Mesh(sdfGeo, sdfMat);
        this.group.add(this.sdfMesh);

        // --- State management ---
        this.targetHover = 0;
        this.hover = 0;
        this.targetClick = 0;
        this.click = 0;
    }

    // Effects API
    triggerHover(isHovering) {
        this.targetHover = isHovering ? 1.0 : 0.0;
    }

    triggerClick() {
        this.click = 1.0; // Snap to 1, then smooth decay back to 0
    }

    // Frame update
    update(dt, time) {
        // Smooth state transitions
        this.hover += (this.targetHover - this.hover) * 8.0 * dt;
        this.click += (0.0 - this.click) * 5.0 * dt; // decay click

        this.uniforms.u_hover.value = this.hover;
        this.uniforms.u_click.value = this.click;
        this.uniforms.u_time.value = time;

        // Update matrices so shaders know the 3D transforms
        this.group.updateMatrixWorld();
        this.uniforms.u_inverseModelMatrix.value.copy(this.group.matrixWorld).invert();
    }
}

// Controller that tracks DOM elements and maps them to WebGL Unified Buttons
class MatrixButtonController {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.buttons = [];
        this.domElements = [];
        this.lastTime = 0;
    }

    register(domElement) {
        const btn = new MatrixButton(this.scene, this.camera);
        this.buttons.push(btn);
        this.domElements.push(domElement);

        // Wire up programmable effects via DOM events!
        domElement.addEventListener('mouseenter', () => btn.triggerHover(true));
        domElement.addEventListener('mouseleave', () => btn.triggerHover(false));
        domElement.addEventListener('mousedown', () => btn.triggerClick());
        domElement.addEventListener('touchstart', () => btn.triggerClick(), { passive: true });

        // Ensure initial sizing
        this._updatePositions();
    }

    _updatePositions() {
        for (let i = 0; i < this.buttons.length; i++) {
            const btn = this.buttons[i];
            const el = this.domElements[i];

            const rect = el.getBoundingClientRect();

            // Map Screen Space to WebGL NDC Space (-1 to 1) for OrthographicCamera
            const nx = ((rect.left + rect.width / 2) / window.innerWidth) * 2 - 1;
            const ny = -((rect.top + rect.height / 2) / window.innerHeight) * 2 + 1;

            btn.group.position.set(nx, ny, 0.1);

            // Scale dynamically based on DOM size width vs camera frustum
            const sx = (rect.width / window.innerWidth) * 2;
            const sy = (rect.height / window.innerHeight) * 2;

            const scale = Math.max(sx, sy) * 0.8; // Cover the card smoothly
            btn.group.scale.set(scale, scale, scale);
        }
    }

    // Call in the main render loop
    update(time) {
        const dt = Math.max(0.001, time - this.lastTime);
        this.lastTime = time;

        // To be safe against dynamic resizing, continuously sync position
        // Could be optimized to only run on resize/scroll, but this guarantees perfect sync.
        this._updatePositions();

        for (let i = 0; i < this.buttons.length; i++) {
            this.buttons[i].update(dt, time);
        }
    }
}

// Expose globally
window.MatrixButtonController = MatrixButtonController;
