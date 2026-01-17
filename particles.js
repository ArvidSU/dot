// ============================================
// PARTICLES - Reusable Particle System
// ============================================

/**
 * Particle system for managing and rendering particle effects
 */
class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    /**
     * Spawn particles at a specific location
     */
    spawn(x, y, count, options = {}) {
        const defaults = {
            color: '255, 255, 255',
            minSpeed: 50,
            maxSpeed: 150,
            minSize: 2,
            maxSize: 4,
            minDecay: 1.5,
            maxDecay: 2.5,
            spread: Math.PI * 2,
            direction: 0,
           锥形Spread: false
        };

        const config = { ...defaults, ...options };

        for (let i = 0; i < count; i++) {
            let angle;
            if (config.spread === Math.PI * 2) {
                angle = Math.random() * Math.PI * 2;
            } else {
                angle = config.direction + (Math.random() - 0.5) * config.spread;
            }

            const speed = config.minSpeed + Math.random() * (config.maxSpeed - config.minSpeed);
            const size = config.minSize + Math.random() * (config.maxSize - config.minSize);
            const decay = config.minDecay + Math.random() * (config.maxDecay - config.minDecay);

            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay,
                size,
                color: config.color
            });
        }
    }

    /**
     * Spawn magnet particles (direction depends on magnet type)
     */
    spawnMagnetParticles(x, y, type) {
        const color = type === 'attract' ? '0, 212, 255' : '255, 0, 102';
        const directionMultiplier = type === 'attract' ? -1 : 1;
        
        this.spawn(x, y, 12, {
            color,
            minSpeed: 50,
            maxSpeed: 100,
            minSize: 3,
            maxSize: 6,
            minDecay: 2,
            maxDecay: 3,
            spread: Math.PI * 2,
            direction: 0
        });
    }

    /**
     * Spawn treat collection particles
     */
    spawnCollectParticles(x, y) {
        this.spawn(x, y, 20, {
            color: '255, 215, 0',
            minSpeed: 100,
            maxSpeed: 200,
            minSize: 2,
            maxSize: 6,
            minDecay: 1.5,
            maxDecay: 2.5,
            spread: Math.PI * 2,
            direction: 0
        });
    }

    /**
     * Spawn explosion particles
     */
    spawnExplosionParticles(x, y, color = '220, 40, 80') {
        this.spawn(x, y, 30, {
            color,
            minSpeed: 150,
            maxSpeed: 350,
            minSize: 3,
            maxSize: 8,
            minDecay: 1,
            maxDecay: 3,
            spread: Math.PI * 2,
            direction: 0
        });
    }

    /**
     * Spawn dot creation particles
     */
    spawnDotCreationParticles(x, y, isAngry = false) {
        const color = isAngry ? '255, 60, 60' : '255, 255, 255';
        
        this.spawn(x, y, 15, {
            color,
            minSpeed: 80,
            maxSpeed: 160,
            minSize: 2,
            maxSize: 5,
            minDecay: 2,
            maxDecay: 3,
            spread: Math.PI * 2,
            direction: 0
        });
    }

    /**
     * Update all particles
     */
    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            // Apply smooth easing to particle movement
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= p.decay * dt;
            p.vx *= 0.98; // Air resistance for smooth slowing
            p.vy *= 0.98;
            
            // Smooth fade using ease out
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * Render all particles
     */
    render(ctx) {
        for (const p of this.particles) {
            // Smooth size and opacity with ease out
            const lifeEase = 1 - Math.pow(1 - p.life, 2); // Ease out quad
            const size = p.size * lifeEase;
            const alpha = lifeEase;
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.color}, ${alpha})`;
            ctx.fill();
        }
    }

    /**
     * Clear all particles
     */
    clear() {
        this.particles = [];
    }
}

// Module exports for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ParticleSystem;
}
