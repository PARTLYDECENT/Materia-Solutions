(function() {
    // Create the container for the grid background
    const gridContainer = document.createElement('div');
    gridContainer.id = 'gridframe-container';
    gridContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1; /* Same level as canvas-container to replace it seamlessly */
        display: none;
        background: #050505;
        overflow: hidden;
    `;
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGrid);
    } else {
        initGrid();
    }

    let scene, camera, renderer, animationId, clock;
    let gridHelper, terrain;

    function initGrid() {
        document.body.insertBefore(gridContainer, document.getElementById('vignette'));

        // Three.js Setup
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x050505, 0.03); // Deep fog for infinite look

        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 2, 8);
        camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        gridContainer.appendChild(renderer.domElement);

        // --- Synthwave / Cyberpunk Grid ---
        const gridColor = 0xff00ff; // Neon magenta/purple
        const centerLineColor = 0x00ffff; // Neon cyan

        gridHelper = new THREE.GridHelper(200, 100, centerLineColor, gridColor);
        gridHelper.position.y = -2;
        
        // Add glowing effect to the grid
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.5;
        scene.add(gridHelper);

        // --- Wireframe Terrain overlay ---
        const geo = new THREE.PlaneGeometry(200, 200, 40, 40);
        
        // Procedurally displace vertices for a low-poly mountain effect
        const pos = geo.attributes.position;
        for(let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);
            // Math magic for some cool procedural hills
            const z = (Math.sin(x * 0.1) * Math.cos(y * 0.1) * 3) + 
                      (Math.sin(x * 0.05 + 2) * Math.cos(y * 0.05 + 1) * 5);
            pos.setZ(i, z);
        }
        geo.computeVertexNormals();

        const mat = new THREE.MeshBasicMaterial({ 
            color: 0x00ffff, 
            wireframe: true,
            transparent: true,
            opacity: 0.15
        });
        
        terrain = new THREE.Mesh(geo, mat);
        terrain.rotation.x = -Math.PI / 2;
        terrain.position.y = -6;
        scene.add(terrain);

        clock = new THREE.Clock();

        window.addEventListener('resize', onWindowResize, false);
    }

    function onWindowResize() {
        if (!camera || !renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
        animationId = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();
        
        // Infinite forward movement illusion by resetting position
        // The grid has 100 divisions over 200 units = 2 units per square
        gridHelper.position.z = (t * 10) % 2; 
        
        // Move the terrain slightly for dynamic feel
        terrain.position.z = (t * 5) % 20;

        // Camera gentle float
        camera.position.y = 2 + Math.sin(t * 0.5) * 0.5;

        renderer.render(scene, camera);
    }

    // Expose toggle function globally
    window.toggleGridFrame = function(active) {
        const originalCanvas = document.getElementById('canvas-container');
        if (active) {
            gridContainer.style.display = 'block';
            if (originalCanvas) {
                originalCanvas.style.transition = 'opacity 0.5s ease';
                originalCanvas.style.opacity = '0';
                setTimeout(() => { if(originalCanvas.style.opacity === '0') originalCanvas.style.display = 'none'; }, 500);
            }
            if (clock) clock.start();
            animate();
        } else {
            if (originalCanvas) {
                originalCanvas.style.display = 'block';
                setTimeout(() => originalCanvas.style.opacity = '1', 50);
            }
            gridContainer.style.display = 'none';
            if (animationId) cancelAnimationFrame(animationId);
        }
    };
})();
