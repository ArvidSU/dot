// ============================================
// GAME - Main Loop & State Management
// ============================================

class Game {
    constructor() {
        this.canvas = document.getElementById('game');
        this.ctx = this.canvas.getContext('2d');
        this.physics = new Physics();
        this.particleSystem = new ParticleSystem();
        this.forceSystem = new ForceSystem();
        
        // Game state
        this.state = 'mainMenu'; // 'playing', 'paused', 'gameOver', 'mainMenu'
        this.runScore = 0; // Treats collected this run
        this.gameTime = 0;
        
        // Upgrade tree (persistent)
        this.upgradeTree = createDefaultUpgradeTree();
        this.upgradeTree.load();
        
        // Upgrade UI
        this.upgradeUI = new UpgradeUI(this.upgradeTree, () => {
            // On close callback - update UI and potentially restart
            this.updateUI();
        });
        
        // Screen shake
        this.shakeIntensity = 0;
        this.shakeDecay = 5;
        
        // Entities
        this.dot = null;
        this.dots = []; // Array for multiple dots
        this.magnets = [];
        this.dangers = [];
        this.treats = [];
        
        // Spawn timers
        this.dangerSpawnTimer = 0;
        this.treatSpawnTimer = 0;
        this.dangerSpawnInterval = 8;
        this.treatSpawnInterval = 5;
        
        // Background particles
        this.bgParticles = [];
        
        // Timing
        this.lastTime = 0;
        
        // Magnet control state
        this.activeMagnets = {
            attract: null,
            repel: null
        };
        this.mousePositions = {
            attract: null,
            repel: null
        };
        this.magnetCooldown = {
            attract: 0,
            repel: 0
        };
        this.magnetCooldownTime = 0.1; // 100ms cooldown between magnet placements
        
        // Initialize
        this.resize();
        this.setupEventListeners();
        this.initBackgroundParticles();
        this.showMainMenu();
        
        // Start game loop
        requestAnimationFrame((t) => this.loop(t));
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.resize());
        
        // Mouse down to start magnet activation
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.state !== 'playing') return;
            
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Left click = attract, Right click = repel
            const type = e.button === 2 ? 'repel' : 'attract';
            this.mousePositions[type] = { x, y };
        });
        
        // Mouse up to stop magnet activation
        this.canvas.addEventListener('mouseup', (e) => {
            if (this.state !== 'playing') return;
            
            e.preventDefault();
            const type = e.button === 2 ? 'repel' : 'attract';
            this.mousePositions[type] = null;
            this.activeMagnets[type] = null;
        });
        
        // Mouse leave to stop magnet activation
        this.canvas.addEventListener('mouseleave', () => {
            if (this.state !== 'playing') return;
            
            this.mousePositions.attract = null;
            this.mousePositions.repel = null;
            this.activeMagnets.attract = null;
            this.activeMagnets.repel = null;
        });
        
        // Mouse move to update magnet position
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.state !== 'playing') return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Update active magnet positions
            if (this.mousePositions.attract) {
                this.mousePositions.attract = { x, y };
            }
            if (this.mousePositions.repel) {
                this.mousePositions.repel = { x, y };
            }
        });
        
        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Keyboard for pause and restart
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.upgradeUI.visible) {
                if (this.state === 'playing') {
                    this.pause();
                } else if (this.state === 'paused') {
                    this.resume();
                } else if (this.state === 'gameOver' || this.state === 'mainMenu') {
                    this.reset();
                }
            }
            
            if (e.code === 'Escape' && this.state === 'playing' && !this.upgradeUI.visible) {
                this.pause();
            }
        });
        
        // Game over buttons
        document.getElementById('btn-restart').addEventListener('click', () => {
            this.reset();
        });
        
        document.getElementById('btn-upgrades').addEventListener('click', () => {
            this.upgradeUI.show();
        });
        
        // Main menu buttons
        document.getElementById('btn-play').addEventListener('click', () => {
            this.reset();
        });
        
        document.getElementById('btn-resume').addEventListener('click', () => {
            this.resume();
        });
        
        document.getElementById('btn-menu-upgrades').addEventListener('click', () => {
            this.upgradeUI.show();
        });

        // HUD Pause button
        document.getElementById('btn-pause-hud').addEventListener('click', () => {
            if (this.state === 'playing') {
                this.pause();
            } else if (this.state === 'paused') {
                this.resume();
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
        this.runScore = 0;
        this.gameTime = 0;
        
        // Reset dot at center
        this.dot = new Dot(this.canvas.width / 2, this.canvas.height / 2);
        this.dots = [];
        this.magnets = [];
        this.dangers = [];
        this.treats = [];
        this.particles = [];
        
        // Reset spawn timers
        this.dangerSpawnTimer = 3; // First danger spawns after 3 seconds
        this.treatSpawnTimer = 2; // First treat spawns after 2 seconds
        
        // Reset magnet control state
        this.activeMagnets = {
            attract: null,
            repel: null
        };
        this.mousePositions = {
            attract: null,
            repel: null
        };
        this.magnetCooldown = {
            attract: 0,
            repel: 0
        };
        
        // Update UI
        this.updateUI();
        
        // Hide screens
        document.getElementById('game-over').classList.remove('visible');
        document.getElementById('main-menu').classList.remove('visible');
        
        // Show HUD pause button
        const hudBtn = document.getElementById('btn-pause-hud');
        hudBtn.style.display = 'flex';
        hudBtn.innerHTML = '<span class="btn-icon">II</span> Pause';
    }
    
    pause() {
        if (this.state !== 'playing') return;
        this.state = 'paused';
        document.getElementById('main-menu').classList.add('visible');
        document.getElementById('btn-resume').style.display = 'flex';
        document.getElementById('btn-play').innerHTML = '<span class="btn-icon">↻</span> Restart';
        document.getElementById('restart-hint').textContent = 'Press Space to resume';
        
        // Update HUD button
        const hudBtn = document.getElementById('btn-pause-hud');
        hudBtn.innerHTML = '<span class="btn-icon">▶</span> Resume';
    }
    
    resume() {
        if (this.state !== 'paused') return;
        this.state = 'playing';
        document.getElementById('main-menu').classList.remove('visible');
        
        // Update HUD button
        const hudBtn = document.getElementById('btn-pause-hud');
        hudBtn.innerHTML = '<span class="btn-icon">II</span> Pause';
    }
    
    showMainMenu() {
        this.state = 'mainMenu';
        document.getElementById('main-menu').classList.add('visible');
        document.getElementById('btn-resume').style.display = 'none';
        document.getElementById('btn-play').innerHTML = '<span class="btn-icon">▶</span> Play';
        document.getElementById('restart-hint').textContent = 'Press Space to start';
        document.getElementById('btn-pause-hud').style.display = 'none';
    }
    
    /**
     * Get current upgrade stats from the tree
     */
    getStats() {
        return this.upgradeTree.getStats();
    }
    
    placeMagnet(x, y, type) {
        const stats = this.getStats();
        
        // Check magnet limit
        const limit = type === 'attract' ? stats.attractLimit : stats.repelLimit;
        const currentCount = this.magnets.filter(m => m.type === type).length;
        if (currentCount >= limit) return;
        
        // Create upgrade object for magnet based on tree stats
        const upgrades = {
            strength: type === 'attract' ? stats.attractStrength : stats.repelStrength,
            radius: type === 'attract' ? stats.attractRadius : stats.repelRadius,
            duration: type === 'attract' ? stats.attractDuration : stats.repelDuration
        };
        
        const magnet = new Magnet(x, y, type, upgrades);
        this.magnets.push(magnet);
        
        // Spawn particles at magnet location
        this.spawnMagnetParticles(x, y, type);
    }
    
    spawnMagnetParticles(x, y, type) {
        this.particleSystem.spawnMagnetParticles(x, y, type);
    }
    
    spawnDanger() {
        const isGoldDigger = Math.random() < 0.2;
        const radius = isGoldDigger ? 15 : 20 + Math.random() * 20;
        
        const pos = this.physics.findSafeSpawnPosition(
            this.dot, this.dangers,
            this.canvas.width, this.canvas.height,
            radius + 50, 200
        );
        
        if (isGoldDigger) {
            const danger = new GoldDigger(pos.x, pos.y, radius);
            this.dangers.push(danger);
        } else {
            const patterns = ['static', 'orbit', 'patrol'];
            const pattern = patterns[Math.floor(Math.random() * patterns.length)];
            const danger = new Danger(pos.x, pos.y, radius, pattern);
            this.dangers.push(danger);
        }
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
            this.runScore++;
            
            // Add to persistent currency
            this.upgradeTree.addCurrency(1);
            this.upgradeTree.save();
            
            // Spawn celebration particles
            this.spawnCollectParticles(treat.x, treat.y);
            
            // Check for dot rebirth chance
            const stats = this.getStats();
            if (stats.spawnDotOnTreat > 0) {
                const chance = stats.spawnDotOnTreat;
                if (Math.random() < chance) {
                    // Check if this should be an angry dot (kamikaze)
                    const isAngry = stats.kamikaze > 0 && Math.random() < stats.kamikaze;
                    const newDot = new Dot(treat.x, treat.y, isAngry);
                    this.dots.push(newDot);
                    // Spawn particles to indicate dot creation
                    this.spawnDotCreationParticles(treat.x, treat.y, isAngry);
                }
            }
            
            // Update UI
            this.updateUI();
        }
    }
    
    killDanger(danger) {
        // Find index of danger
        const index = this.dangers.indexOf(danger);
        if (index !== -1) {
            this.dangers.splice(index, 1);
            
            // Screen shake
            this.shakeIntensity = 10;
            
            // Spawn explosion particles
            this.spawnExplosionParticles(danger.x, danger.y, '220, 40, 80');
        }
    }
    
    spawnExplosionParticles(x, y, color) {
        this.particleSystem.spawnExplosionParticles(x, y, color);
    }
    
    spawnCollectParticles(x, y) {
        this.particleSystem.spawnCollectParticles(x, y);
    }
    
    spawnDotCreationParticles(x, y, isAngry = false) {
        this.particleSystem.spawnDotCreationParticles(x, y, isAngry);
    }
    
    handleDotDeath(dot) {
        // Check for treat legacy chance
        const stats = this.getStats();
        if (stats.spawnTreatOnDeath > 0) {
            const chance = stats.spawnTreatOnDeath;
            if (Math.random() < chance) {
                // Spawn a treat at the dot's location
                const treat = new Treat(dot.x, dot.y);
                this.treats.push(treat);
                // Spawn particles to indicate treat creation
                this.spawnCollectParticles(dot.x, dot.y);
            }
        }
    }
    
    gameOver() {
        this.state = 'gameOver';
        this.shakeIntensity = 20;
        
        // Update game over screen
        document.getElementById('final-score').textContent = `+${this.runScore} Treats`;
        document.getElementById('game-over').classList.add('visible');
        document.getElementById('btn-pause-hud').style.display = 'none';
    }
    
    updateUI() {
        document.getElementById('treat-count').textContent = this.upgradeTree.currency;
        document.getElementById('run-treats').textContent = this.runScore;
    }
    
    update(dt) {
        if (this.state === 'paused' || this.state === 'mainMenu') {
            this.updateBackgroundParticles(dt);
            return;
        }

        if (this.state === 'gameOver') {
            // Still update some things for visual effect
            if (this.dot) this.dot.update(dt);
            for (const dot of this.dots) {
                dot.update(dt);
            }
            this.shakeIntensity = Math.max(0, this.shakeIntensity - this.shakeDecay * dt);
            this.updateParticles(dt);
            this.updateBackgroundParticles(dt);
            return;
        }
        
        this.gameTime += dt;
        
        // Handle continuous magnet placement while mouse button is held
        for (const type of ['attract', 'repel']) {
            if (this.mousePositions[type]) {
                // Decrease cooldown
                this.magnetCooldown[type] -= dt;
                
                // Place magnet if cooldown is ready
                if (this.magnetCooldown[type] <= 0) {
                    const { x, y } = this.mousePositions[type];
                    this.placeMagnet(x, y, type);
                    this.magnetCooldown[type] = this.magnetCooldownTime;
                }
            }
        }
        
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
        
        // Get stats for force effects
        const stats = this.getStats();
        
        // Apply forces to main dot
        this.forceSystem.applyAllForces(
            this.dot,
            this.magnets,
            this.treats,
            this.dangers,
            stats,
            dt,
            this.physics
        );
        
        // Apply forces to additional dots
        this.forceSystem.applyForcesToAllDots(
            this.dots,
            this.magnets,
            this.treats,
            this.dangers,
            stats,
            dt,
            this.physics
        );
        
        // Apply forces from dots to treats
        this.forceSystem.applyForcesToTreats(
            this.treats,
            [this.dot, ...this.dots],
            stats,
            dt
        );
        
        // Update main dot
        this.dot.update(dt);
        this.physics.constrainToBounds(this.dot, this.canvas.width, this.canvas.height);
        
        // Update additional dots
        for (let i = this.dots.length - 1; i >= 0; i--) {
            const dot = this.dots[i];
            dot.update(dt);
            this.physics.constrainToBounds(dot, this.canvas.width, this.canvas.height);
            
            // Remove dead dots
            if (!dot.alive && dot.deathAnimation >= 1) {
                this.dots.splice(i, 1);
            }
        }
        
        // Update magnets and remove dead ones
        for (let i = this.magnets.length - 1; i >= 0; i--) {
            this.magnets[i].update(dt);
            if (this.magnets[i].dead) {
                this.magnets.splice(i, 1);
            }
        }
        
        // Update dangers
        for (const danger of this.dangers) {
            // Find the closest alive dot to target
            let closestDot = this.dot;
            let closestDist = Infinity;
            
            // Check main dot
            if (this.dot.alive) {
                const dx = this.dot.x - danger.x;
                const dy = this.dot.y - danger.y;
                closestDist = Math.sqrt(dx * dx + dy * dy);
            }
            
            // Check additional dots
            for (const dot of this.dots) {
                if (!dot.alive) continue;
                const dx = dot.x - danger.x;
                const dy = dot.y - danger.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestDot = dot;
                }
            }
            
            danger.update(dt, closestDot, this.runScore);
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
            const annihalationNode = this.upgradeTree.getNode('annihalation');
            if (annihalationNode && annihalationNode.getLevel() > 0) {
                const cost = annihalationNode.getPropertyValue('annihalationCost');
                if (this.runScore >= cost) {
                    // Annihalate!
                    this.runScore -= cost;
                    this.updateUI();
                    this.killDanger(dangerHit);
                } else {
                    this.handleDotDeath(this.dot);
                    this.dot.die();
                    this.gameOver();
                }
            } else {
                this.handleDotDeath(this.dot);
                this.dot.die();
                this.gameOver();
            }
        }
        
        // Check danger collisions with additional dots
        for (const dot of this.dots) {
            if (!dot.alive) continue;
            const dangerHit = this.physics.checkDangerCollisions(dot, this.dangers);
            if (dangerHit) {
                // Angry dots have 100% annihilation chance
                if (dot.isAngry) {
                    // Annihilate the danger!
                    this.killDanger(dangerHit);
                    this.handleDotDeath(dot);
                    dot.die();
                } else {
                    // Check for spawned dot annihilation chance
                    const stats = this.getStats();
                    if (stats.spawnedDotAnnihilation > 0) {
                        const chance = stats.spawnedDotAnnihilation;
                        if (Math.random() < chance) {
                            // Annihilate the danger!
                            this.killDanger(dangerHit);
                            this.handleDotDeath(dot);
                            dot.die();
                        } else {
                            // Dot dies normally
                            this.handleDotDeath(dot);
                            dot.die();
                        }
                    } else {
                        // Dot dies normally
                        this.handleDotDeath(dot);
                        dot.die();
                    }
                }
            }
        }
        
        // Check treat collisions with main dot
        const treatHit = this.physics.checkTreatCollisions(this.dot, this.treats);
        if (treatHit) {
            this.collectTreat(treatHit);
        }
        
        // Check treat collisions with additional dots
        for (const dot of this.dots) {
            if (!dot.alive) continue;
            const treatHit = this.physics.checkTreatCollisions(dot, this.treats);
            if (treatHit) {
                this.collectTreat(treatHit);
            }
        }
        
        // Update particles
        this.updateParticles(dt);
        
        // Update background particles
        this.updateBackgroundParticles(dt);
        
        // Decay screen shake
        this.shakeIntensity = Math.max(0, this.shakeIntensity - this.shakeDecay * dt);
    }
    
    updateParticles(dt) {
        this.particleSystem.update(dt);
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
        
        // Clear and draw background
        this.renderBackground();
        
        // Draw background particles
        this.renderBackgroundParticles();
        
        if (this.state === 'mainMenu') return;
        
        // Apply screen shake
        ctx.save();
        if (this.shakeIntensity > 0) {
            const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
            const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
            ctx.translate(shakeX, shakeY);
        }
        
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
        
        // Draw dots (on top)
        if (this.dot) this.dot.render(ctx);
        for (const dot of this.dots) {
            dot.render(ctx);
        }
        
        ctx.restore();
    }
    
    renderBackground() {
        const ctx = this.ctx;
        
        // Gradient background with smooth transition
        const gradient = ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 0,
            this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height) * 0.8
        );
        gradient.addColorStop(0, '#0f0f18');
        gradient.addColorStop(0.5, '#1a1a2e');
        gradient.addColorStop(1, '#0a0a0f');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Subtle grid pattern with smooth fading edges
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 1;
        const gridSize = 50;
        
        // Only render grid lines that are visible
        const visibleGridWidth = Math.ceil(this.canvas.width / gridSize) + 1;
        const visibleGridHeight = Math.ceil(this.canvas.height / gridSize) + 1;
        
        for (let x = 0; x < visibleGridWidth; x++) {
            const gridX = x * gridSize;
            ctx.beginPath();
            ctx.moveTo(gridX, 0);
            ctx.lineTo(gridX, this.canvas.height);
            ctx.stroke();
        }
        
        for (let y = 0; y < visibleGridHeight; y++) {
            const gridY = y * gridSize;
            ctx.beginPath();
            ctx.moveTo(0, gridY);
            ctx.lineTo(this.canvas.width, gridY);
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
        this.particleSystem.render(this.ctx);
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
