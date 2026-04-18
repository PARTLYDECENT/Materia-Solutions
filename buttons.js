// buttons.js
// Framework for unifying PointCloud and SDF Matrix into single controllable entities

class MatrixButton {
    constructor(scene, camera, index = 0) {
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
            u_cameraPos: { value: new THREE.Vector3(0, 0, 1) }, // Ortho camera position
            u_seed: { value: index * 13.37 },
            u_type: { value: index } // Map index to specific elemental effect
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
                uniform float u_seed;
                uniform float u_type;
                attribute vec3 aRandom;
                varying float vAlpha;
                varying vec3 vColor;
                void main() {
                    vec3 pos = position;
                    
                    float r = length(pos);
                    if(r > 0.1) {
                        pos = normalize(pos) * (0.5 + aRandom.x * 0.2);
                    }
                    
                    float speed = 1.0 + aRandom.y;
                    float angle = (u_time + u_seed) * speed * mix(0.2, 1.5, u_hover);
                    float s = sin(angle), c = cos(angle);
                    mat2 rot = mat2(c, -s, s, c);
                    pos.xy *= rot;
                    
                    int type = int(u_type + 0.1);
                    
                    // Elemental motion overrides for Point Cloud
                    if (type == 0) { // Scarlet / Burning
                        pos.y += fract(u_time * speed + aRandom.z) * 1.5 - 0.75;
                        pos.x += s * 0.1;
                    } else if (type == 2) { // Void / Singularity
                        float suck = fract(1.0 - (u_time * speed * 0.5 + aRandom.z));
                        pos *= suck;
                    } else if (type == 3) { // Aero / Wind
                        pos.x += fract(u_time * speed * 1.5 + aRandom.z) * 2.0 - 1.0;
                        pos.y += s * 0.1;
                    } else if (type == 5) { // Ghost / Frost
                        pos.y -= fract(u_time * speed * 0.4 + aRandom.z) * 1.5 - 0.75;
                    }
                    
                    // Expansion on hover & click ripple
                    pos *= 1.0 + (u_hover * 0.4) + (u_click * sin(u_time*20.0 - r*10.0)*0.2);
                    
                    vAlpha = 0.2 + 0.8 * sin(u_time * 5.0 + aRandom.z * 10.0);
                    vAlpha *= mix(0.1, 1.0, u_hover); // Much more visible on hover
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = (1.0 + aRandom.x * 3.0) * mix(1.0, 3.0, u_hover);
                    
                    // Assign particle color
                    vColor = vec3(1.0, 1.0, 1.0);
                    if(type==0) vColor = vec3(1.0, 0.4, 0.1); // Fire
                    else if(type==1) vColor = vec3(0.1, 1.0, 0.5); // Cyber Green
                    else if(type==2) vColor = vec3(0.6, 0.1, 1.0); // Void Purple
                    else if(type==3) vColor = vec3(0.7, 0.9, 1.0); // Aero Blue
                    else if(type==4) vColor = vec3(0.9, 0.5, 1.0); // Prism Magenta
                    else if(type==5) vColor = vec3(0.4, 0.8, 1.0); // Frost Cyan
                }
            `,
            fragmentShader: `
                varying float vAlpha;
                varying vec3 vColor;
                void main() {
                    vec2 coord = gl_PointCoord - vec2(0.5);
                    if(length(coord) > 0.5) discard;
                    
                    gl_FragColor = vec4(vColor, vAlpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.points = new THREE.Points(pcGeo, pcMat);
        this.group.add(this.points);

        // --- 2. Raymarched SDF Core ---
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
                uniform float u_seed;
                uniform float u_type;
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
                
                float box(vec3 p, vec3 b) {
                    vec3 d = abs(p) - b;
                    return length(max(d,0.0)) + min(max(d.x,max(d.y,d.z)),0.0);
                }

                float map(vec3 p) {
                    float ut = u_time + u_seed;
                    int t = int(u_type + 0.1);
                    
                    // Interaction rotations
                    p.xy *= rot(ut * mix(0.5, 2.0, u_hover));
                    p.yz *= rot(ut * 0.3);
                    
                    float d = length(p) - mix(0.2, 0.4, u_hover); // Base core
                    
                    if (t == 0) { // Burning/Fire Core
                        d -= gyroid(p + vec3(0.0, -ut*2.0, 0.0), 5.0) * 0.1 * u_hover;
                        d += gyroid(p + vec3(ut*3.0), 10.0) * 0.05 * u_hover;
                    } else if (t == 1) { // Cyber Core
                        vec3 bp = p;
                        float b = box(bp, vec3(mix(0.15, 0.35, u_hover)));
                        d = mix(d, b, 0.6); // morph to blocky
                        d -= gyroid(p, 15.0) * 0.03 * u_hover; // circuits
                    } else if (t == 2) { // Void Core
                        float nodes = length(p - vec3((0.4 - u_hover*0.2) * sin(ut*4.0), 0.0, 0.0)) - 0.05;
                        d = smin(d, nodes, 0.3); // violent inward suck
                    } else if (t == 3) { // Aero Core
                        d -= sin(p.y * 20.0 + ut * 10.0) * 0.02 * u_hover; // wind ripples
                        float stringy = length(p.xz) - 0.1;
                        d = mix(d, stringy, 0.2 * u_hover);
                    } else if (t == 4) { // Prism / Geometric Core
                        vec3 p2 = p;
                        p2.xy *= rot(ut * 2.0);
                        float c1 = box(p, vec3(mix(0.15, 0.3, u_hover)));
                        float c2 = box(p2, vec3(mix(0.15, 0.3, u_hover)));
                        d = min(c1, c2) - 0.02; // jagged crystals
                    } else if (t == 5) { // Frost / Ethereal Core
                        d += gyroid(p + vec3(0.0, ut*0.5, 0.0), 8.0) * 0.08 * u_hover; // soft fuzz
                    } else { // Fallback
                        float nodes = length(p - vec3(0.3 * sin(ut*3.0), 0.0, 0.0)) - 0.1;
                        d = smin(d, nodes, 0.2);
                        d -= gyroid(p + vec3(ut*1.0), 10.0) * 0.05 * u_hover;
                    }
                    
                    // Click ripple deformation globally
                    d += sin(length(p)*40.0 - ut*30.0) * 0.02 * u_click;
                    
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
                    vec3 ro = vLocalPos; 
                    vec3 worldRayDir = vec3(0.0, 0.0, -1.0); 
                    vec3 rd = normalize((u_inverseModelMatrix * vec4(worldRayDir, 0.0)).xyz);
                    
                    float t = 0.0;
                    float d = 0.0;
                    vec3 p;
                    for(int i = 0; i < 40; i++) {
                        p = ro + rd * t;
                        d = map(p);
                        if(d < 0.001 || t > 3.0) break;
                        t += d;
                    }
                    
                    if(d >= 0.01) discard;
                    
                    vec3 n = calcNormal(p);
                    vec3 localCamPos = (u_inverseModelMatrix * vec4(u_cameraPos, 1.0)).xyz;
                    vec3 viewDir = normalize(localCamPos - p);
                    
                    float diff = max(dot(n, normalize(vec3(2,3,2))), 0.0);
                    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
                    
                    // Select Colors based on element
                    int iType = int(u_type + 0.1);
                    vec3 baseLight = vec3(0.95, 0.98, 1.0);
                    vec3 baseDark = vec3(0.85, 0.88, 0.9);
                    vec3 envRim = vec3(1.0, 1.0, 1.0);
                    vec3 coreGlow = vec3(0.0);
                    
                    if(iType == 0) { // Burning
                        baseDark = vec3(0.4, 0.05, 0.0); baseLight = vec3(1.0, 0.3, 0.05);
                        coreGlow = vec3(1.0, 0.2, 0.0);
                        envRim = vec3(1.0, 0.6, 0.2);
                    } else if(iType == 1) { // Cyber
                        baseDark = vec3(0.0, 0.2, 0.1); baseLight = vec3(0.1, 0.9, 0.4);
                        coreGlow = vec3(0.0, 1.0, 0.5);
                        envRim = vec3(0.4, 1.0, 0.7);
                    } else if(iType == 2) { // Void
                        baseDark = vec3(0.05, 0.0, 0.1); baseLight = vec3(0.3, 0.1, 0.5);
                        coreGlow = vec3(0.6, 0.0, 1.0);
                        envRim = vec3(0.3, 0.0, 0.8);
                    } else if(iType == 3) { // Aero
                        baseDark = vec3(0.6, 0.8, 0.9); baseLight = vec3(0.9, 0.95, 1.0);
                        coreGlow = vec3(0.3, 0.8, 1.0);
                    } else if(iType == 4) { // Prism
                        baseDark = vec3(0.3, 0.2, 0.4); baseLight = vec3(0.9, 0.8, 0.9);
                        coreGlow = abs(n); // Iridescent based on normals
                    } else if(iType == 5) { // Frost
                        baseDark = vec3(0.4, 0.7, 0.9); baseLight = vec3(0.85, 0.95, 1.0);
                        coreGlow = vec3(0.1, 0.5, 1.0);
                    }
                    
                    vec3 albedo = mix(baseDark, baseLight, diff);
                    vec3 finalCol = albedo;
                    
                    finalCol += envRim * fresnel * mix(0.4, 2.0, u_hover);
                    finalCol += coreGlow * (1.0 - diff) * u_hover * 0.5;
                    
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

    triggerHover(isHovering) {
        this.targetHover = isHovering ? 1.0 : 0.0;
    }

    triggerClick() {
        this.click = 1.0; 
    }

    update(dt, time) {
        this.hover += (this.targetHover - this.hover) * 8.0 * dt;
        this.click += (0.0 - this.click) * 5.0 * dt; 

        this.uniforms.u_hover.value = this.hover;
        this.uniforms.u_click.value = this.click;
        this.uniforms.u_time.value = time;

        this.group.updateMatrixWorld();
        this.uniforms.u_inverseModelMatrix.value.copy(this.group.matrixWorld).invert();
    }
}

class MatrixButtonController {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.buttons = [];
        this.domElements = [];
        this.lastTime = 0;
    }

    register(domElement, index = 0) {
        const btn = new MatrixButton(this.scene, this.camera, index);
        this.buttons.push(btn);
        this.domElements.push(domElement);

        domElement.addEventListener('mouseenter', () => btn.triggerHover(true));
        domElement.addEventListener('mouseleave', () => btn.triggerHover(false));
        domElement.addEventListener('mousedown', () => btn.triggerClick());
        domElement.addEventListener('touchstart', () => btn.triggerClick(), { passive: true });

        this._updatePositions();
    }

    _updatePositions() {
        for (let i = 0; i < this.buttons.length; i++) {
            const btn = this.buttons[i];
            const el = this.domElements[i];

            const rect = el.getBoundingClientRect();

            const nx = ((rect.left + rect.width / 2) / window.innerWidth) * 2 - 1;
            const ny = -((rect.top + rect.height / 2) / window.innerHeight) * 2 + 1;

            btn.group.position.set(nx, ny, 0.1);

            const sx = (rect.width / window.innerWidth) * 2;
            const sy = (rect.height / window.innerHeight) * 2;

            const scale = Math.max(sx, sy) * 0.8; 
            btn.group.scale.set(scale, scale, scale);
        }
    }

    update(time) {
        const dt = Math.max(0.001, time - this.lastTime);
        this.lastTime = time;

        this._updatePositions();

        for (let i = 0; i < this.buttons.length; i++) {
            this.buttons[i].update(dt, time);
        }
    }
}

window.MatrixButtonController = MatrixButtonController;

