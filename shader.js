// =================================================================================================
// [CONSTRUCTION DESIGN SHADER SYSTEM] :: INDUSTRIAL WEBGL BACKGROUND
// Blueprint-inspired, architectural, and construction-themed visual effects
// Only the `window.updateShader` function is intentionally exposed for external control.
// =================================================================================================
(function() {
    "use strict";

    // --- Core Variable Declarations ---
    let gl = null;
    let program = null;
    let animationFrameId = null;
    let webglCanvas = null;

    // Wait for DOM to be fully loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log("[DEBUG] Creating Construction Design WebGL canvas element.");
        // Create canvas element programmatically
        webglCanvas = document.createElement('canvas');
        webglCanvas.id = 'webglCanvas';
        // Set canvas styles for proper background positioning
        webglCanvas.style.position = 'fixed';
        webglCanvas.style.top = '0';
        webglCanvas.style.left = '0';
        webglCanvas.style.width = '100vw';
        webglCanvas.style.height = '100vh';
        webglCanvas.style.zIndex = '-1'; // Behind all content
        webglCanvas.style.pointerEvents = 'none'; // Don't intercept mouse events
        webglCanvas.style.transform = 'translate3d(0,0,0)'; // Force GPU acceleration

        console.log("[DEBUG] Inserting Construction WebGL canvas into DOM.");
        // Insert canvas as first child of body to ensure it's behind everything
        document.body.insertBefore(webglCanvas, document.body.firstChild);
        console.log("[DEBUG] Construction WebGL canvas successfully inserted into DOM.");

        initWebGL();
    });

    function initWebGL() {
        // --- Error Handling and Initialization Check ---
        if (!webglCanvas) {
            console.error("[FATAL] WebGL Canvas element with id 'webglCanvas' not found in DOM. Aborting.");
            return;
        }

        // =================================================================================================
        // [CONTEXT INITIALIZATION] :: ATTEMPT TO SECURE WEBGL2/WEBGL1 CONTEXT
        // =================================================================================================
        try {
            webglCanvas.width = window.innerWidth;
            webglCanvas.height = window.innerHeight;

            gl = webglCanvas.getContext('webgl2') ||
                 webglCanvas.getContext('webgl') ||
                 webglCanvas.getContext('experimental-web-gl');

            if (!gl) {
                throw new Error("WebGL is not supported or the context could not be created.");
            }

            if (gl instanceof WebGL2RenderingContext) {
                console.log("[INFO] WebGL2 Rendering Context initialized successfully.");
            } else {
                console.log("[WARN] WebGL1 Rendering Context initialized. Some GLSL 3.00 ES features may not be supported.");
            }

            setupWebGL();
            startRenderLoop();

        } catch (e) {
            console.error("[FATAL] WebGL Initialization Error:", e);
            if (document.body) document.body.style.backgroundColor = '#0a0f1a';
            return;
        }
    }

    // =================================================================================================
    // [CONSTRUCTION SHADER SOURCE CODE] :: GLSL 3.00 ES - INDUSTRIAL & BLUEPRINT EFFECTS
    // =================================================================================================

    const vertexShaderSource = `#version 300 es
        in vec4 a_position;
        void main() {
            gl_Position = a_position;
        }
    `;

    const fragmentShaderSource = `#version 300 es
        precision highp float;

        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;
        uniform float u_intensity;
        uniform float u_speed;

        out vec4 outColor;

        const float PI = 3.14159265359;
        const float TWO_PI = 6.28318530718;

        // Hash function for noise generation
        float hash(vec2 p) { 
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); 
        }
        
        // Smooth noise function
        float noise(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
                       mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
        }

        // Grid pattern for blueprint aesthetic
        float grid(vec2 uv, float scale) {
            vec2 grid = abs(fract(uv * scale) - 0.5);
            return min(grid.x, grid.y);
        }

        // Technical line patterns
        float technicalLines(vec2 uv, float time) {
            float lines1 = sin(uv.x * 40.0 + time * 0.5) * 0.5 + 0.5;
            float lines2 = sin(uv.y * 60.0 + time * 0.3) * 0.5 + 0.5;
            return min(lines1 * 0.1, lines2 * 0.1);
        }

        // Blueprint grid with construction lines
        vec3 blueprintGrid(vec2 uv, float time) {
            // Base dark blue blueprint background
            vec3 baseColor = vec3(0.05, 0.1, 0.2);
            
            // Main grid lines
            float mainGrid = grid(uv, 10.0);
            float subGrid = grid(uv, 50.0);
            
            // Construction grid color (light blue/cyan)
            vec3 gridColor = vec3(0.2, 0.6, 0.9);
            
            // Add grid lines
            float gridIntensity = 1.0 - smoothstep(0.0, 0.02, mainGrid);
            gridIntensity += (1.0 - smoothstep(0.0, 0.005, subGrid)) * 0.5;
            
            return mix(baseColor, gridColor, gridIntensity * 0.3);
        }

        // Animated construction elements
        vec3 constructionElements(vec2 uv, float time) {
            vec3 color = vec3(0.0);
            
            // Moving construction lines
            float movingLine1 = sin(uv.x * 8.0 - time * 2.0) * 0.5 + 0.5;
            float movingLine2 = sin(uv.y * 12.0 - time * 1.5) * 0.5 + 0.5;
            
            // Construction beam effect
            float beam1 = abs(sin(uv.x * 20.0 + time)) < 0.1 ? 1.0 : 0.0;
            float beam2 = abs(sin(uv.y * 15.0 + time * 0.7)) < 0.1 ? 1.0 : 0.0;
            
            // Orange construction warning color
            vec3 constructionOrange = vec3(1.0, 0.5, 0.1);
            vec3 constructionYellow = vec3(1.0, 0.9, 0.2);
            
            color += constructionOrange * beam1 * 0.2;
            color += constructionYellow * beam2 * 0.15;
            
            // Pulsing construction lights
            float pulse = sin(time * 3.0) * 0.5 + 0.5;
            color += constructionOrange * pulse * 0.1 * smoothstep(0.8, 1.0, movingLine1);
            
            return color;
        }

        // Industrial pipe/structure patterns
        vec3 industrialStructure(vec2 uv, float time) {
            vec3 color = vec3(0.0);
            
            // Rotating structural elements
            vec2 center = vec2(0.0);
            vec2 rotUV = uv;
            float angle = time * 0.2;
            rotUV = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * (uv - center) + center;
            
            // Structural cross-beams
            float crossBeam1 = abs(rotUV.x + rotUV.y) < 0.02 ? 1.0 : 0.0;
            float crossBeam2 = abs(rotUV.x - rotUV.y) < 0.02 ? 1.0 : 0.0;
            
            // Metallic steel color
            vec3 steelColor = vec3(0.6, 0.6, 0.7);
            
            color += steelColor * (crossBeam1 + crossBeam2) * 0.3;
            
            // Rivets and bolts
            vec2 rivetUV = fract(uv * 20.0) - 0.5;
            float rivet = 1.0 - smoothstep(0.1, 0.15, length(rivetUV));
            color += steelColor * rivet * 0.1;
            
            return color;
        }

        // Safety warning stripes
        vec3 safetyStripes(vec2 uv, float time) {
            vec3 color = vec3(0.0);
            
            // Diagonal warning stripes
            float stripePattern = sin((uv.x + uv.y) * 30.0 + time) * 0.5 + 0.5;
            float stripe = step(0.5, stripePattern);
            
            // Warning colors
            vec3 warningYellow = vec3(1.0, 1.0, 0.0);
            vec3 warningBlack = vec3(0.1, 0.1, 0.1);
            
            // Apply stripes in certain areas
            float stripeArea = smoothstep(0.7, 0.9, abs(uv.y));
            color += mix(warningBlack, warningYellow, stripe) * stripeArea * 0.2;
            
            return color;
        }

        // Main construction design function
        vec3 constructionDesign(vec2 uv, float time) {
            vec3 color = vec3(0.0);
            
            // Layer 1: Blueprint grid base
            color += blueprintGrid(uv, time);
            
            // Layer 2: Construction elements
            color += constructionElements(uv, time);
            
            // Layer 3: Industrial structure
            color += industrialStructure(uv, time);
            
            // Layer 4: Safety stripes
            color += safetyStripes(uv, time);
            
            // Add some ambient lighting effect
            float ambient = 0.1 + 0.05 * sin(time * 0.5);
            color += vec3(ambient * 0.1, ambient * 0.15, ambient * 0.2);
            
            return color;
        }

        void main() {
            vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.y, u_resolution.x);
            
            // Apply mouse interaction
            vec2 mouse = u_mouse;
            uv += (mouse - 0.5) * 0.2;
            
            // Apply speed and intensity controls
            float adjustedTime = u_time * u_speed;
            
            vec3 color = constructionDesign(uv, adjustedTime);
            
            // Apply intensity
            color *= u_intensity;
            
            // Final color output with clamping
            outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
        }
    `;

    // =================================================================================================
    // [WEBGL UTILITY FUNCTIONS]
    // =================================================================================================

    function createShader(type, source) {
        const shader = gl.createShader(type);
        if (!shader) { throw new Error(`Failed to create shader object (type: ${type})`); }

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const shaderType = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
            const infoLog = gl.getShaderInfoLog(shader);
            const sourceWithLines = source.split('\n').map((line, index) => `${index + 1}: ${line}`).join('\n');
            console.error(`>>> SHADER COMPILE ERROR (${shaderType}):\n${infoLog}`);
            console.error(`--- Shader Source (${shaderType}) ---\n${sourceWithLines}\n---`);
            gl.deleteShader(shader);
            throw new Error(`Shader compilation failed: ${shaderType}`);
        }
        return shader;
    }

    function createProgram(vertexShader, fragmentShader) {
        const program = gl.createProgram();
        if (!program) { throw new Error("Failed to create shader program object."); }

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const infoLog = gl.getProgramInfoLog(program);
            console.error('>>> PROGRAM LINK ERROR:', infoLog);
            gl.deleteProgram(program);
            throw new Error("Shader program linking failed.");
        }
        return program;
    }

    // =================================================================================================
    // [WEBGL STATE & SETUP]
    // =================================================================================================

    let positionAttributeLocation = -1;
    let timeUniformLocation = null;
    let resolutionUniformLocation = null;
    let mouseUniformLocation = null;
    let intensityUniformLocation = null;
    let speedUniformLocation = null;
    let positionBuffer = null;
    let startTime = performance.now();

    function setupWebGL() {
        let vs = null;
        let fs = null;
        try {
            vs = createShader(gl.VERTEX_SHADER, vertexShaderSource);
            fs = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
            program = createProgram(vs, fs);

            positionAttributeLocation = gl.getAttribLocation(program, "a_position");
            timeUniformLocation = gl.getUniformLocation(program, "u_time");
            resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
            mouseUniformLocation = gl.getUniformLocation(program, "u_mouse");
            intensityUniformLocation = gl.getUniformLocation(program, "u_intensity");
            speedUniformLocation = gl.getUniformLocation(program, "u_speed");

            positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            const positions = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]);
            gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

            // Handle window resize
            window.addEventListener('resize', () => {
                webglCanvas.width = window.innerWidth;
                webglCanvas.height = window.innerHeight;
                gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            });

            return true;
        } catch (error) {
            console.error(">>> Failed during WebGL setup:", error);
            if (program) gl.deleteProgram(program);
            program = null;
            return false;
        } finally {
            if (vs) gl.deleteShader(vs);
            if (fs) gl.deleteShader(fs);
        }
    }

    // =================================================================================================
    // [RENDER LOOP]
    // =================================================================================================
    function render(now) {
        if (!program) {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            return;
        }

        let time = (now - startTime) * 0.001;

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.useProgram(program);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

        gl.uniform1f(timeUniformLocation, time);
        gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);

        let mx = window.shaderMouse ? window.shaderMouse.x : 0.5;
        let my = window.shaderMouse ? window.shaderMouse.y : 0.5;
        gl.uniform2f(mouseUniformLocation, mx, my);
        gl.uniform1f(intensityUniformLocation, window.shaderIntensity !== undefined ? window.shaderIntensity : 1.0);
        gl.uniform1f(speedUniformLocation, window.shaderSpeed !== undefined ? window.shaderSpeed : 1.0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        animationFrameId = requestAnimationFrame(render);
    }

    function startRenderLoop() {
        // Set up mouse tracking
        window.shaderMouse = { x: 0.5, y: 0.5 };
        window.addEventListener('mousemove', (e) => {
            window.shaderMouse.x = e.clientX / window.innerWidth;
            window.shaderMouse.y = 1.0 - (e.clientY / window.innerHeight);
        });

        // Initialize shader controls with construction-appropriate defaults
        if (window.shaderIntensity === undefined) window.shaderIntensity = 0.8;
        if (window.shaderSpeed === undefined) window.shaderSpeed = 1.2;

        // Start the render loop
        animationFrameId = requestAnimationFrame(render);
        console.log("[INFO] Construction Design WebGL render loop started successfully.");
    }

    // =================================================================================================
    // [PUBLIC API] :: Expose controls for external manipulation
    // =================================================================================================
    
    // Expose shader control interface
    window.updateShader = function(options = {}) {
        if (options.intensity !== undefined) {
            window.shaderIntensity = Math.max(0, Math.min(2, options.intensity));
        }
        if (options.speed !== undefined) {
            window.shaderSpeed = Math.max(0, Math.min(5, options.speed));
        }
        console.log(`[SHADER UPDATE] Intensity: ${window.shaderIntensity}, Speed: ${window.shaderSpeed}`);
    };

    // Additional construction-themed controls
    window.constructionControls = {
        setBlueprintMode: function() { window.updateShader({intensity: 0.6, speed: 0.8}); },
        setActiveConstructionMode: function() { window.updateShader({intensity: 1.2, speed: 1.5}); },
        setMaintenanceMode: function() { window.updateShader({intensity: 0.4, speed: 0.5}); },
        setEmergencyMode: function() { window.updateShader({intensity: 1.8, speed: 2.5}); }
    };

    console.log("[INIT] Construction Design WebGL Shader System loaded and ready.");

})();
