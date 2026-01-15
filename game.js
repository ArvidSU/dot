// ============================================
// GAME - Main Loop & State Management
// ============================================

class Game {
    constructor() {
        this.canvas = document.getElementById('game');
        this.ctx = this.canvas.getContext('2d');
        this.physics = new Physics();
        
        // Game state
        this.state = 'playing'; // 'playing', 'gameOver'
        this.score = 0;
        this.gameTime = 0;
        
        // Upgrades
        this.upgrades = {
            strength: 1,
            radius: 1,
            duration: 1
        };
        
        // Screen shake
        this.shakeIntensity = 0;
        this.shakeDecay = 5;
        
        // Entities
        this.dot = null;
        this.magnets = [];
        this.dangers = [];
        this.treats = [];
        this.particles = [];
        
        // Spawn timers
        this.dangerSpawnTimer = 0;
        this.treatSpawnTimer = 0;
        this.dangerSpawnInterval = 8;
        this.treatSpawnInterval = 5;
        
        // Background particles
        this.bgParticles = [];
        
        // Timing
        this.lastTime = 0;
        
        // Initialize
        this.resize();
        this.setupEventListeners();
        this.reset();
        this.initBackgroundParticles();
        
        // Start game loop
        requestAnimationFrame((t) => this.loop(t));
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.resize());
        
        // Mouse click for magnet placement
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.state !== 'playing') return;
            
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Left click = attract, Right click = repel
            const type = e.button === 2 ? 'repel' : 'attract';
            this.placeMagnet(x, y, type);
        });
        
        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Keyboard for restart
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.state === 'gameOver') {
                this.reset();
            }
        });
    }
    
    initBackgroundParticles() {
        this.bgParticles = [];
        const count = 50;
        for (let i = 0; i < count; i++) {
            this.bgParticles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: 1 + Math.random() * 2,
                alpha: 0.1 + Math.random() * 0.2,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10
            });
        }
    }
    
    reset() {
        this.state = 'playing';
        this.score = 0;
        this.gameTime = 0;
        this.upgrades = { strength: 1, radius: 1, duration: 1 };
        
        // Reset dot at center
        this.dot = new Dot(this.canvas.width / 2, this.canvas.height / 2);
        this.magnets = [];
        this.dangers = [];
        this.treats = [];
        this.particles = [];
        
        // Reset spawn timers
        this.dangerSpawnTimer = 3; // First danger spawns after 3 seconds
        this.treatSpawnTimer = 2; // First treat spawns after 2 seconds
        
        // Update UI
        this.updateUI();
        
        // Hide game over screen
        document.getElementById('game-over').classList.remove('visible');
    }
    
    placeMagnet(x, y, type) {
        const magnet = new Magnet(x, y, type, this.upgrades);
        this.magnets.push(magnet);
        
        // Spawn particles at magnet location
        this.spawnMagnetParticles(x, y, type);
    }
    
    spawnMagnetParticles(x, y, type) {
        const color = type === 'attract' ? '0, 212, 255' : '255, 0, 102';
        const count = 12;
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = 50 + Math.random() * 50;
            
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed * (type === 'attract' ? -1 : 1),
                vy: Math.sin(angle) * speed * (type === 'attract' ? -1 : 1),
                life: 1,
                decay: 2 + Math.random(),
                size: 3 + Math.random() * 3,
                color
            });
        }
    }
    
    spawnDanger() {
        const patterns = ['static', 'orbit', 'patrol'];
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        const radius = 20 + Math.random() * 20;
        
        const pos = this.physics.findSafeSpawnPosition(
            this.dot, this.dangers,
            this.canvas.width, this.canvas.height,
            radius + 50, 200
        );
        
        const danger = new Danger(pos.x, pos.y, radius, pattern);
        this.dangers.push(danger);
    }
    
    spawnTreat() {
        const pos = this.physics.findSafeSpawnPosition(
            this.dot, this.dangers,
            this.canvas.width, this.canvas.height,
            50, 100
        );
        
        const treat = new Treat(pos.x, pos.y);
        this.treats.push(treat);
    }
    
    collectTreat(treat) {
        if (treat.collect()) {
            this.score++;
            
            // Random upgrade
            const upgradeTypes = ['strength', 'radius', 'duration'];
            const type = upgradeTypes[Math.floor(Math.random() * upgradeTypes.length)];
            this.upgrades[type]++;
            
            // Spawn celebration particles
            this.spawnCollectParticles(treat.x, treat.y);
            
            // Update UI
            this.updateUI();
        }
    }
    
    spawnCollectParticles(x, y) {
        const count = 20;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 100;
            
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 1.5 + Math.random(),
                size: 2 + Math.random() * 4,
                color: '255, 215, 0'
            });
        }
    }
    
    gameOver() {
        this.state = 'gameOver';
        this.shakeIntensity = 20;
        
        // Update game over screen
        document.getElementById('final-score').textContent = `${this.score} Treats`;
        document.getElementById('game-over').classList.add('visible');
    }
    
    updateUI() {
        document.getElementById('treat-count').textContent = this.score;
        document.getElementById('strength-level').textContent = this.upgrades.strength;
        document.getElementById('radius-level').textContent = this.upgrades.radius;
        document.getElementById('duration-level').textContent = this.upgrades.duration;
    }
    
    update(dt) {
        if (this.state === 'gameOver') {
            // Still update some things for visual effect
            this.dot.update(dt);
            this.shakeIntensity = Math.max(0, this.shakeIntensity - this.shakeDecay * dt);
            this.updateParticles(dt);
            return;
        }
        
        this.gameTime += dt;
        
        // Update spawn timers
        this.dangerSpawnTimer -= dt;
        this.treatSpawnTimer -= dt;
        
        if (this.dangerSpawnTimer <= 0) {
            this.spawnDanger();
            // Spawn faster as game progresses, but cap at 3 seconds
            this.dangerSpawnTimer = Math.max(3, this.dangerSpawnInterval - this.gameTime * 0.05);
        }
        
        if (this.treatSpawnTimer <= 0) {
            this.spawnTreat();
            this.treatSpawnTimer = this.treatSpawnInterval;
        }
        
        // Apply magnetic forces to dot
        const forces = this.physics.calculateMagneticForces(this.dot, this.magnets);
        this.dot.applyForce(forces.fx * dt, forces.fy * dt);
        
        // Update dot
        this.dot.update(dt);
        this.physics.constrainToBounds(this.dot, this.canvas.width, this.canvas.height);
        
        // Update magnets and remove dead ones
        for (let i = this.magnets.length - 1; i >= 0; i--) {
            this.magnets[i].update(dt);
            if (this.magnets[i].dead) {
                this.magnets.splice(i, 1);
            }
        }
        
        // Update dangers
        for (const danger of this.dangers) {
            danger.update(dt);
        }
        
        // Update treats and remove finished ones
        for (let i = this.treats.length - 1; i >= 0; i--) {
            const shouldRemove = this.treats[i].update(dt);
            if (shouldRemove) {
                this.treats.splice(i, 1);
            }
        }
        
        // Check collisions
        const dangerHit = this.physics.checkDangerCollisions(this.dot, this.dangers);
        if (dangerHit) {
            this.dot.die();
            this.gameOver();
        }
        
        const treatHit = this.physics.checkTreatCollisions(this.dot, this.treats);
        if (treatHit) {
            this.collectTreat(treatHit);
        }
        
        // Update particles
        this.updateParticles(dt);
        
        // Update background particles
        this.updateBackgroundParticles(dt);
        
        // Decay screen shake
        this.shakeIntensity = Math.max(0, this.shakeIntensity - this.shakeDecay * dt);
    }
    
    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= p.decay * dt;
            p.vx *= 0.98;
            p.vy *= 0.98;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    updateBackgroundParticles(dt) {
        for (const p of this.bgParticles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            
            // Wrap around screen
            if (p.x < 0) p.x = this.canvas.width;
            if (p.x > this.canvas.width) p.x = 0;
            if (p.y < 0) p.y = this.canvas.height;
            if (p.y > this.canvas.height) p.y = 0;
        }
    }
    
    render() {
        const ctx = this.ctx;
        
        // Apply screen shake
        ctx.save();
        if (this.shakeIntensity > 0) {
            const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
            const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
            ctx.translate(shakeX, shakeY);
        }
        
        // Clear and draw background
        this.renderBackground();
        
        // Draw background particles
        this.renderBackgroundParticles();
        
        // Draw magnets (under everything else)
        for (const magnet of this.magnets) {
            magnet.render(ctx);
        }
        
        // Draw treats
        for (const treat of this.treats) {
            treat.render(ctx);
        }
        
        // Draw dangers
        for (const danger of this.dangers) {
            danger.render(ctx);
        }
        
        // Draw particles
        this.renderParticles();
        
        // Draw dot (on top)
        this.dot.render(ctx);
        
        ctx.restore();
    }
    
    renderBackground() {
        const ctx = this.ctx;
        
        // Gradient background
        const gradient = ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 0,
            this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height) * 0.7
        );
        gradient.addColorStop(0, '#0f0f18');
        gradient.addColorStop(1, '#0a0a0f');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Subtle grid pattern
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 1;
        const gridSize = 50;
        
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }
        
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }
    }
    
    renderBackgroundParticles() {
        const ctx = this.ctx;
        
        for (const p of this.bgParticles) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
            ctx.fill();
        }
    }
    
    renderParticles() {
        const ctx = this.ctx;
        
        for (const p of this.particles) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.color}, ${p.life})`;
            ctx.fill();
        }
    }
    
    loop(time) {
        // Calculate delta time (capped to prevent spiral of death)
        const dt = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;
        
        this.update(dt);
        this.render();
        
        requestAnimationFrame((t) => this.loop(t));
    }
}

// Start the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new Game();
});
