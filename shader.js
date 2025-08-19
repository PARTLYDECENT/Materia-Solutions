// =================================================================================================
// [SYSTEM BOOTSTRAP] :: IMMEDIATE-INVOKED FUNCTION EXPRESSION (IIFE)
// Creative WebGL rendering system with completely new visual effects
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
        console.log("[DEBUG] Creating WebGL canvas element.");
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

        console.log("[DEBUG] Inserting WebGL canvas into DOM.");
        // Insert canvas as first child of body to ensure it's behind everything
        document.body.insertBefore(webglCanvas, document.body.firstChild);
        console.log("[DEBUG] WebGL canvas successfully inserted into DOM.");

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
            if (document.body) document.body.style.backgroundColor = '#050511';
            return;
        }
    }

    // =================================================================================================
    // [SHADER SOURCE CODE] :: GLSL 3.00 ES - COMPLETELY NEW CREATIVE EFFECTS
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
        const float TOTAL_PHASES_F = 15.0;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
                       mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
        }

        float fbm(vec2 p) {
            float v = 0.0, a = 0.5;
            for(int i = 0; i < 4; i++) {
                v += a * noise(p);
                p *= 2.0; a *= 0.5;
            }
            return v;
        }

        mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }

        vec3 plasmaStorm(vec2 uv, float t) {
            float v1 = sin(uv.x * 8.0 + t * 2.0);
            float v2 = sin(10.0 * (uv.x * sin(t * 0.5) + uv.y * cos(t * 0.7)) + t * 1.5);
            float v3 = sin(sqrt(50.0 * dot(uv, uv) + 1.0) + t * 3.0);
            float plasma = (v1 + v2 + v3) / 3.0;
            return mix(vec3(1.0, 0.1, 0.8), vec3(0.1, 0.8, 1.0), sin(plasma * PI + t) * 0.5 + 0.5);
        }

        void main() {
            vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.y, u_resolution.x);
            vec3 color = vec3(0.02, 0.02, 0.1);
            color = plasmaStorm(uv, u_time);
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

        // Start the render loop
        animationFrameId = requestAnimationFrame(render);
    }

    // Expose shader control interface
    window.updateShader = function(newShaderCode) {
        console.warn("Dynamic shader updates are complex and not fully implemented in this version.");
    };

})();
