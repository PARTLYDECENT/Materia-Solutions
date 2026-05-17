(function() {
    // Create button in corner
    const btn = document.createElement('button');
    btn.id = 'switcher-switcher-btn';
    btn.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px; /* In the corner */
        width: 50px;
        height: 50px;
        border-radius: 12px;
        background: rgba(0, 10, 20, 0.8);
        border: 1px solid rgba(0, 255, 255, 0.4);
        z-index: 99999;
        cursor: pointer;
        display: flex;
        justify-content: center;
        align-items: center;
        box-shadow: 0 0 15px rgba(0, 255, 255, 0.2);
        backdrop-filter: blur(5px);
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;
    
    // Custom Icon (Sci-Fi Grid Icon)
    btn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(0, 255, 255, 0.9)" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke-dasharray="2 2"></path>
        </svg>
    `;

    btn.addEventListener('mouseenter', () => {
        btn.style.boxShadow = '0 0 25px rgba(0, 255, 255, 0.8), inset 0 0 10px rgba(0, 255, 255, 0.5)';
        btn.style.transform = 'scale(1.15)';
        btn.style.borderColor = 'rgba(0, 255, 255, 0.9)';
    });
    btn.addEventListener('mouseleave', () => {
        btn.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.2)';
        btn.style.transform = 'scale(1)';
        btn.style.borderColor = 'rgba(0, 255, 255, 0.4)';
    });

    let isGrid = false;

    btn.addEventListener('click', () => {
        isGrid = !isGrid;
        
        // Visual feedback on click
        btn.style.transform = 'scale(0.8)';
        setTimeout(() => btn.style.transform = 'scale(1.15)', 150);
        
        // Change icon color based on state
        const svg = btn.querySelector('svg');
        if (isGrid) {
            svg.setAttribute('stroke', 'rgba(255, 0, 255, 0.9)');
            btn.style.borderColor = 'rgba(255, 0, 255, 0.9)';
            btn.style.boxShadow = '0 0 25px rgba(255, 0, 255, 0.8), inset 0 0 10px rgba(255, 0, 255, 0.5)';
        } else {
            svg.setAttribute('stroke', 'rgba(0, 255, 255, 0.9)');
            btn.style.borderColor = 'rgba(0, 255, 255, 0.9)';
            btn.style.boxShadow = '0 0 25px rgba(0, 255, 255, 0.8), inset 0 0 10px rgba(0, 255, 255, 0.5)';
        }

        // Trigger grid switch
        if (window.toggleGridFrame) {
            window.toggleGridFrame(isGrid);
        } else {
            console.error('gridframe.js not loaded or window.toggleGridFrame missing');
        }
    });

    // Wait for DOM to append
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => document.body.appendChild(btn));
    } else {
        document.body.appendChild(btn);
    }
})();
