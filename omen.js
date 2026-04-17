// omen.js
// omen & Komorebi Background <3 YAY

const bgVertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const bgFragmentShader = `
    uniform float u_time;
    uniform vec2 u_resolution;
    varying vec2 vUv;

    // Random and Noise functions for organic shadows
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    // Fractal Brownian Motion for layered leaf shadows
    float fbm(vec2 st) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 4; i++) {
            value += amplitude * noise(st);
            st *= 2.0;
            amplitude *= 0.5;
        }
        return value;
    }

    void main() {
        vec2 uv = gl_FragCoord.xy / max(u_resolution.x, u_resolution.y);
        
        // Slow moving texture coordinates to simulate wind
        vec2 st = uv * 4.0 + vec2(u_time * 0.03, -u_time * 0.02);
        
        // Domain warping for organic shapes
        vec2 q = vec2(fbm(st), fbm(st + vec2(1.0)));
        vec2 r = vec2(fbm(st + q + vec2(1.7, 9.2)), fbm(st + q + vec2(8.3, 2.8)));
        float n = fbm(st + r);
        
        // Soft dappled light threshold
        float light = smoothstep(0.4, 0.65, n);
        
        // Color Palette: Soft pale green shadows vs Warm sunlight
        vec3 shadowCol = vec3(0.92, 0.94, 0.91); 
        vec3 lightCol = vec3(1.0, 0.99, 0.96);   
        
        vec3 finalColor = mix(shadowCol, lightCol, light);
        
        // Subtle vignette
        vec2 center = gl_FragCoord.xy / u_resolution.xy - 0.5;
        finalColor *= 1.0 - dot(center, center) * 0.2;
        
        // Flowing black scanline moving downwards
        vec2 normUv = gl_FragCoord.xy / u_resolution.xy;
        float scanY = fract(normUv.y - u_time * 0.2);
        // Sharp but soft-edged line at the center of the fract boundary
        float scanline = exp(-pow((scanY - 0.5) * 80.0, 2.0));
        finalColor = mix(finalColor, vec3(0.0), scanline * 0.4);
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

const sdfVertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const sdfFragmentShader = `
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    varying vec2 vUv;

    // 3D Rotation matrices
    mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
    }

    // Smooth min for gooey merging
    float smin(float a, float b, float k) {
        float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
        return mix(b, a, h) - k * h * (1.0 - h);
    }

    // Advanced gyroid noise
    float gyroid(vec3 p, float scale) {
        p *= scale;
        return abs(dot(sin(p), cos(p.zxy))) / scale;
    }

    float map(vec3 p) {
        // Core rotation influenced by mouse
        p.xy *= rot(u_time * 0.05 + u_mouse.x * 2.0);
        p.yz *= rot(u_time * 0.08 + u_mouse.y * 2.0);
        
        // Gentle floating
        p.y += sin(u_time * 0.5) * 0.2;

        vec3 q = p;
        
        // Base shape
        float d = length(p) - 1.2;
        
        // Complex orbiting blobs (The "Omen" features)
        float t = u_time * 0.8;
        for(int i = 0; i < 5; i++) {
            float fi = float(i);
            vec3 p2 = p;
            p2.xy *= rot(t * (1.0 + fi*0.3) + fi*2.1);
            p2.xz *= rot(t * (0.8 + fi*0.2) - fi*1.7);
            
            vec3 offset = vec3(1.6 + sin(t*1.5 + fi)*0.3, 0.0, 0.0);
            float blob = length(p2 - offset) - 0.25 - sin(t*2.0+fi)*0.1;
            
            // Extrude some details from blobs
            blob += sin(p2.x*15.0)*sin(p2.y*15.0)*sin(p2.z*15.0)*0.02;
            
            d = smin(d, blob, 0.9); // deeply gooey
        }
        
        // High frequency detail (Subtle)
        d += gyroid(p + vec3(u_time*0.2), 4.0) * 0.1;
        d -= gyroid(p + vec3(0.0, u_time*0.1, u_time*0.05), 10.0) * 0.03;
        
        // Fine ridges along the surface
        d += sin(length(p)*30.0 - u_time*5.0) * 0.003;

        // Smooth SDF distance
        return d * 0.4;
    }

    // Normal calculation
    vec3 calcNormal(vec3 p) {
        vec2 e = vec2(0.002, 0.0);
        return normalize(vec3(
            map(p + e.xyy) - map(p - e.xyy),
            map(p + e.yxy) - map(p - e.yxy),
            map(p + e.yyx) - map(p - e.yyx)
        ));
    }

    // Ambient occlusion
    float calcAO(vec3 p, vec3 n) {
        float occ = 0.0;
        float sca = 1.0;
        for(int i=0; i<5; i++) {
            float h = 0.01 + 0.12*float(i)/4.0;
            float d = map(p + h*n);
            occ += (h-d)*sca;
            sca *= 0.95;
        }
        return clamp(1.0 - 1.5*occ, 0.0, 1.0);
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;

        vec3 ro = vec3(0.0, 0.0, 7.0); // Ray origin pushed back for bigger shape
        vec3 rd = normalize(vec3(uv, -1.0)); // Ray direction
        
        float d0 = 0.0;
        float d;
        vec3 p;
        
        // Raymarching loop
        for(int i = 0; i < 100; i++) {
            p = ro + rd * d0;
            d = map(p);
            if(d < 0.001 || d0 > 15.0) break;
            d0 += d;
        }

        vec4 col = vec4(0.0); // Transparent background
        
        if(d0 < 15.0) {
            vec3 n = calcNormal(p);
            vec3 l1 = normalize(vec3(3.0, 4.0, 2.0)); // Key light
            vec3 l2 = normalize(vec3(-3.0, -2.0, -2.0)); // Back light
            vec3 viewDir = normalize(ro - p);
            
            // Soft diffuse lighting
            float diff1 = max(dot(n, l1), 0.0);
            float diff2 = max(dot(n, l2), 0.0) * 0.3;
            
            // Subsurface scattering fake (wrap lighting)
            float wrap1 = max(dot(n, l1) * 0.5 + 0.5, 0.0);
            float wrap2 = max(dot(n, l2) * 0.5 + 0.5, 0.0);
            
            // Fresnel for glowing rim
            float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
            float rim = smoothstep(0.6, 1.0, 1.0 - max(dot(n, viewDir), 0.0));
            
            // Ambient Occlusion
            float ao = calcAO(p, n);
            
            // Base color (Mundane White / Very light gray / Pearl)
            vec3 baseCol = vec3(0.95, 0.96, 0.98);
            vec3 shadowCol = vec3(0.4, 0.45, 0.5); // Deepened shadow significantly for true contrast
            
            // Strengthen AO impact for darker crevices
            vec3 albedo = mix(shadowCol, baseCol, wrap1 * pow(ao, 1.5));
            
            // Combine colors (boost diffusion slightly)
            vec3 finalColor = albedo + diff1*0.3 + wrap2*0.1;
            
            // Intense inner white emission via fresnel
            finalColor += vec3(1.0, 1.0, 1.0) * fresnel * 0.6;
            finalColor += vec3(0.75, 0.85, 1.0) * rim * 0.6; // Slightly more striking pearlescent blue rim
            
            // Post-processing curves to make it look hyper-sleek
            finalColor = smoothstep(0.05, 0.95, finalColor);
            finalColor = pow(finalColor, vec3(1.25)); // Harder contrast curve
            
            // Add subtle caustic/iridescent highlights based on normals and time
            float iridescence = sin(dot(n, viewDir)*10.0 + u_time)*0.5+0.5;
            finalColor += vec3(0.05, 0.02, 0.0) * iridescence * pow(fresnel, 2.0);
            
            col = vec4(finalColor, 0.95); // High opacity but slight glass feel
        }

        gl_FragColor = col;
    }
`;

// Engine initialization
window.addEventListener('load', function () {
    const container = document.getElementById('webgl-container');

    if (!container) return; // fail gracefully if container doesn't exist

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const uniforms = {
        u_time: { value: 0.0 },
        u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        u_mouse: { value: new THREE.Vector2(0, 0) }
    };

    // Background Komorebi Mesh
    const bgGeometry = new THREE.PlaneGeometry(2, 2);
    const bgMaterial = new THREE.ShaderMaterial({
        vertexShader: bgVertexShader,
        fragmentShader: bgFragmentShader,
        uniforms: uniforms,
        depthWrite: false,
        depthTest: false
    });
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    bgMesh.renderOrder = -1;
    scene.add(bgMesh);

    // Foreground Omen SDF Mesh
    const sdfGeometry = new THREE.PlaneGeometry(2, 2);
    const sdfMaterial = new THREE.ShaderMaterial({
        vertexShader: sdfVertexShader,
        fragmentShader: sdfFragmentShader,
        uniforms: uniforms,
        transparent: true
    });
    const sdfMesh = new THREE.Mesh(sdfGeometry, sdfMaterial);
    scene.add(sdfMesh);

    // Mouse interaction for the blob
    let targetMouse = new THREE.Vector2(0, 0);

    function onMouseMove(event) {
        targetMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        targetMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
    window.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            targetMouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
            targetMouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
        }
    }, { passive: true });

    // Initialize Matrix Buttons
    let buttonController = null;
    if (window.MatrixButtonController) {
        buttonController = new MatrixButtonController(scene, camera);
        document.querySelectorAll('.flower-card').forEach(el => {
            buttonController.register(el);
        });
    }

    // Handle Resize
    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    });

    // Animation Loop
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        uniforms.u_time.value = clock.getElapsedTime();

        // Smooth mouse follow - increased follow speed slightly for reactivity
        uniforms.u_mouse.value.x += (targetMouse.x - uniforms.u_mouse.value.x) * 0.08;
        uniforms.u_mouse.value.y += (targetMouse.y - uniforms.u_mouse.value.y) * 0.08;

        if (buttonController) {
            buttonController.update(uniforms.u_time.value);
        }

        renderer.render(scene, camera);
    }
    animate();
});
