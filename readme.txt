===============================================================================
  MATERIA SOLUTIONS — PROJECT README
===============================================================================

WHAT WE HAVE
─────────────────────────────────────────────────────────────────────────────

  index.html        Cinematic intro / landing page
  STORE.HTML        Product storefront with 6 elemental specimen cards
  materia.js        Procedural generative soundtrack engine
  buttons.js        WebGL shader-driven button effect framework
  omen.js           Full-screen SDF blob + komorebi background renderer
  narrator.js       On-screen typing narrator with per-character audio
  BANNER.jpg        Hero banner image for the store


WHAT IT DOES
─────────────────────────────────────────────────────────────────────────────

  1. CINEMATIC INTRO (index.html)
     - 3000-particle animation that morphs through 7 timed phases
     - Particles spell "MATERIA SOLUTIONS" in heavy then sleek typography
     - Particles form a rotating 3D sphere with perspective projection
     - Synchronized audio score: brass chords, snare rolls, impact booms,
       arpeggios — all synthesized live from pure Web Audio oscillators
     - Camera system with zoom, pan, screen shake, and flash-bang effects
     - Text-to-speech voice announces "Welcome to the future"
     - Auto-redirects to the store page after the sequence ends

  2. STORE PAGE (STORE.HTML)
     - 6 product cards themed to elemental types (fire, cyber, void,
       aero, prism, frost) displayed on a glassmorphism grid
     - Hero banner section with parallax zoom hover effect
     - Modal popup system for reserved items
     - WebGL background with two layered shader passes (omen.js)
     - Generative music toggle button (materia.js)
     - Typing narrator greeting on first interaction (narrator.js)
     - 3D shader-animated buy buttons behind each card (buttons.js)

  3. OMEN BACKGROUND (omen.js)
     - Komorebi pass: fractal brownian motion leaf-shadow dappled light
       with domain warping and a scrolling black scanline
     - Omen pass: raymarched SDF blob with 5 orbiting sub-blobs, gyroid
       surface detail, ambient occlusion, subsurface scattering, fresnel
       rim glow, and mouse-reactive rotation

  4. MATERIA SOUNDTRACK (materia.js)
     - Full sequencer with 16-step drum patterns (kick, snare, hi-hat),
       detuned sawtooth pads, triangle arpeggiators, square-wave lead
       with vibrato LFO, and shimmer sine pings
     - Song structure with 6 sections that layer in/out over ~32 bars
     - 4-tap feedback delay network for reverb, dynamics compressor,
       stereo panning, chord progressions in C minor

  5. MATRIX BUTTONS (buttons.js)
     - Per-button Three.js point cloud (800 particles) with GLSL vertex
       shader driving elemental motion: burning rise, void singularity
       collapse, aero wind streaks, frost fall
     - Per-button raymarched SDF core with gyroid deformation, box morph,
       wind ripples, crystal fracture — all unique per element index
     - Hover/click state interpolation with smooth spring physics
     - Additive blending, fresnel rim lighting, depth-graded color

  6. NARRATOR (narrator.js)
     - Character-by-character typing with per-key audio synthesis
     - Pentatonic note pool with punctuation bass tones, harmonic
       overtones on uppercase letters, occasional sub-frequency blooms
     - Completion chime arpeggio, blinking cursor, timed fade-out


WHAT'S AVERAGE (Standard Web Dev)
─────────────────────────────────────────────────────────────────────────────

  - HTML/CSS page structure and layout
  - Tailwind CSS utility classes for responsive grid
  - Google Fonts import (Montserrat, Noto Sans JP)
  - CSS hover transitions and transform animations
  - Modal show/hide via classList toggle
  - Twitter/OpenGraph meta tags for social embeds
  - Window resize event handlers
  - CSS glassmorphism (backdrop-filter blur + transparency)
  - CSS keyframe animations (fire flicker, scan lines, wind streaks,
    frost breath, prism shift, void pulse/ring)
  - requestAnimationFrame loop
  - Basic easing functions (quintic, exponential)
  - SpeechSynthesis API for text-to-speech
  - Auto-redirect via setTimeout + window.location


WHAT'S EXOTIC (Advanced / Unusual Tech)
─────────────────────────────────────────────────────────────────────────────

  - Entire cinematic audio score synthesized from scratch at runtime
    using raw Web Audio API oscillators — no audio files loaded at all
  - Full procedural generative music engine with sequencer, multi-layer
    instrument rack, chord progressions, and song structure — zero samples
  - 4-tap feedback delay network built manually as a reverb substitute
  - Raymarched Signed Distance Function (SDF) rendering in GLSL fragment
    shaders — real 3D volumes rendered without any mesh geometry
  - Gyroid noise functions for organic surface deformation on SDF shapes
  - Smooth-minimum (smin) operations for gooey blob merging in SDF space
  - Ambient occlusion computed inside the raymarcher per-pixel
  - Fractal Brownian Motion with domain warping for procedural dappled
    light (komorebi) — purely mathematical, no textures
  - 3000-particle system with real-time text rasterization target
    extraction (rendering text to offscreen canvas, sampling pixel alpha
    to generate morph targets)
  - 3D sphere projection with dual-axis rotation and perspective divide
    done entirely on the CPU per-particle per-frame
  - Per-character audio synthesis in the narrator — every keystroke
    generates a unique oscillator note with envelope and filter shaping
  - Six distinct elemental shader behaviors per button, each with unique
    vertex motion physics AND unique SDF fragment deformation logic
  - Inverse model matrix computed per-frame for correct local-space
    raymarching inside transformed Three.js scene graph objects
  - Additive blending point clouds composited with raymarched SDF cores
    as unified interactive elements mapped to DOM button positions

===============================================================================
