// ============================================
// ENTITIES - Game Objects
// ============================================

class Dot {
    constructor(x, y, isAngry = false) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = 8;
        this.trail = [];
        this.maxTrailLength = 20;
        this.alive = true;
        this.deathTime = 0;
        this.deathAnimation = 0;
        this.isAngry = isAngry;
    }
    
    update(dt) {
        if (!this.alive) {
            this.deathAnimation = Math.min(1, this.deathAnimation + dt * 2);
            return;
        }
        
        // Apply velocity with damping
        const damping = 0.98;
        this.vx *= damping;
        this.vy *= damping;
        
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        // Update trail with smooth interpolation
        this.trail.unshift({ x: this.x, y: this.y, age: 0 });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.pop();
        }
        
        // Age trail particles with smooth fade
        for (let i = 0; i < this.trail.length; i++) {
            this.trail[i].age += dt * 2; // Slower aging for smoother trail
        }
    }
    
    applyForce(fx, fy) {
        this.vx += fx;
        this.vy += fy;
    }
    
    die() {
        if (this.alive) {
            this.alive = false;
            this.deathTime = performance.now();
        }
    }
    
    render(ctx) {
        // Draw smooth trail with interpolation
        if (this.trail.length > 1) {
            // Create gradient for trail
            const trailColor = this.isAngry ? '255, 60, 60' : '255, 255, 255';
            
            // Draw trail as connected lines with fading width and alpha
            for (let i = 0; i < this.trail.length - 1; i++) {
                const point = this.trail[i];
                const nextPoint = this.trail[i + 1];
                const progress = i / this.trail.length;
                const alpha = Math.max(0, 1 - point.age) * 0.6 * (1 - progress);
                const lineWidth = (this.radius * 0.8) * (1 - progress);
                
                ctx.beginPath();
                ctx.moveTo(point.x, point.y);
                ctx.lineTo(nextPoint.x, nextPoint.y);
                ctx.strokeStyle = `rgba(${trailColor}, ${alpha * 0.3})`;
                ctx.lineWidth = lineWidth;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
            
            // Draw individual trail points
            for (let i = this.trail.length - 1; i >= 0; i--) {
                const point = this.trail[i];
                const alpha = Math.max(0, 1 - point.age) * 0.6;
                const size = this.radius * (1 - i / this.trail.length) * 0.8;
                
                ctx.beginPath();
                ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${trailColor}, ${alpha * 0.3})`;
                ctx.fill();
            }
        }
        
        if (!this.alive) {
            // Death animation - expanding ring that fades
            const t = this.deathAnimation;
            const expandRadius = this.radius + t * 100;
            const alpha = 1 - t;
            const deathColor = this.isAngry ? '255, 60, 60' : '255, 0, 102';
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, expandRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${deathColor}, ${alpha})`;
            ctx.lineWidth = 2 * (1 - t);
            ctx.stroke();
            
            // Shrinking dot
            if (t < 0.5) {
                const shrink = 1 - t * 2;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius * shrink, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${deathColor}, ${shrink})`;
                ctx.fill();
            }
            return;
        }
        
        // Glow effect
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.radius * 3
        );
        if (this.isAngry) {
            gradient.addColorStop(0, 'rgba(255, 60, 60, 0.5)');
            gradient.addColorStop(0.5, 'rgba(255, 60, 60, 0.2)');
            gradient.addColorStop(1, 'rgba(255, 60, 60, 0)');
        } else {
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
            gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        }
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Main dot
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.isAngry ? '#ff3333' : '#ffffff';
        ctx.fill();
        
        // Inner highlight
        ctx.beginPath();
        ctx.arc(this.x - 2, this.y - 2, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = this.isAngry ? 'rgba(255, 100, 100, 0.8)' : 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
    }
}

class Magnet {
    constructor(x, y, type, upgrades) {
        this.x = x;
        this.y = y;
        this.type = type; // 'attract' or 'repel'
        this.baseStrength = 80000;
        this.baseRadius = 400;
        this.baseDuration = 0.5;
        
        // Apply upgrades (upgrades contains multipliers directly from upgrade tree)
        const radiusMultiplier = type === 'attract' 
            ? (upgrades.attractRadius || 1) * (upgrades.lawOfAttractionRadius || 1)
            : (upgrades.repelRadius || 1);
        
        this.strength = this.baseStrength * (type === 'attract' ? (upgrades.attractStrength || 1) : (upgrades.repelStrength || 1));
        this.radius = this.baseRadius * radiusMultiplier;
        this.duration = this.baseDuration * (type === 'attract' ? (upgrades.attractDuration || 1) : (upgrades.repelDuration || 1));
        
        this.age = 0;
        this.dead = false;
        this.ripples = [];
        this.spawnRipple();
    }
    
    spawnRipple() {
        this.ripples.push({
            radius: 0,
            alpha: 0.6,
            age: 0,
            baseRadius: this.radius
        });
    }
    
    update(dt) {
        this.age += dt;
        
        if (this.age >= this.duration) {
            this.dead = true;
        }
        
        // Spawn ripples continuously for smooth effect
        const rippleSpawnRate = 0.15; // Spawn new ripple every 150ms
        if (this.lastRippleSpawn === undefined) {
            this.lastRippleSpawn = 0;
        }
        if (this.age - this.lastRippleSpawn >= rippleSpawnRate) {
            this.spawnRipple();
            this.lastRippleSpawn = this.age;
        }
        
        // Update ripples with smooth easing
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const ripple = this.ripples[i];
            ripple.age += dt;
            
            // Smooth easing for ripple animation (ease out cubic)
            const progress = Math.min(1, ripple.age / 1.5); // Complete ripple in 1.5 seconds
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            if (this.type === 'attract') {
                // Ripples move inward with smooth easing
                ripple.radius = ripple.baseRadius * (1 - easeProgress);
                ripple.alpha = 0.6 * (1 - easeProgress);
            } else {
                // Ripples move outward with smooth easing
                ripple.radius = ripple.baseRadius * easeProgress;
                ripple.alpha = 0.6 * (1 - easeProgress);
            }
            
            if (ripple.alpha <= 0.01) {
                this.ripples.splice(i, 1);
            }
        }
    }
    
    getLifePercent() {
        return 1 - (this.age / this.duration);
    }
    
    render(ctx) {
        const life = this.getLifePercent();
        const color = this.type === 'attract' ? '0, 212, 255' : '255, 0, 102';
        const baseAlpha = life * 0.8;
        
        // Draw effect radius (subtle) with smooth fading
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * life, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${color}, ${baseAlpha * 0.1})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw ripples with smooth line width variation
        for (const ripple of this.ripples) {
            if (ripple.alpha <= 0) continue;
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, ripple.radius * life, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${color}, ${ripple.alpha * baseAlpha * 0.5})`;
            ctx.lineWidth = 2 + Math.sin(ripple.age * 3) * 0.5; // Subtle pulsing effect
            ctx.stroke();
        }
        
        // Center glow with smooth fading
        const glowGradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, 30 * life
        );
        glowGradient.addColorStop(0, `rgba(${color}, ${baseAlpha * 0.6})`);
        glowGradient.addColorStop(0.5, `rgba(${color}, ${baseAlpha * 0.2})`);
        glowGradient.addColorStop(1, `rgba(${color}, 0)`);
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, 30 * life, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();
        
        // Center dot with smooth pulsing
        const pulse = 1 + Math.sin(this.age * 4) * 0.1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4 * life * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${baseAlpha})`;
        ctx.fill();
    }
}

class Danger {
    constructor(x, y, radius, pattern = 'static') {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.pattern = pattern;
        this.angle = Math.random() * Math.PI * 2;
        this.rotationSpeed = 0.5 + Math.random() * 0.5;
        this.pulsePhase = Math.random() * Math.PI * 2;
        
        // For orbit pattern
        this.orbitCenter = { x, y };
        this.orbitRadius = 50 + Math.random() * 100;
        this.orbitSpeed = 0.3 + Math.random() * 0.4;
        this.orbitAngle = Math.random() * Math.PI * 2;
        
        // For patrol pattern
        this.patrolStart = { x, y };
        this.patrolEnd = { x: x + (Math.random() - 0.5) * 200, y: y + (Math.random() - 0.5) * 200 };
        this.patrolProgress = 0;
        this.patrolDirection = 1;
    }
    
    update(dt, target, runScore) {
        this.angle += this.rotationSpeed * dt;
        this.pulsePhase += dt * 3;
        
        switch (this.pattern) {
            case 'orbit':
                this.orbitAngle += this.orbitSpeed * dt;
                this.x = this.orbitCenter.x + Math.cos(this.orbitAngle) * this.orbitRadius;
                this.y = this.orbitCenter.y + Math.sin(this.orbitAngle) * this.orbitRadius;
                break;
                
            case 'patrol':
                this.patrolProgress += this.patrolDirection * dt * 0.5;
                if (this.patrolProgress >= 1 || this.patrolProgress <= 0) {
                    this.patrolDirection *= -1;
                    this.patrolProgress = Math.max(0, Math.min(1, this.patrolProgress));
                }
                const ease = this.patrolProgress * this.patrolProgress * (3 - 2 * this.patrolProgress);
                this.x = this.patrolStart.x + (this.patrolEnd.x - this.patrolStart.x) * ease;
                this.y = this.patrolStart.y + (this.patrolEnd.y - this.patrolStart.y) * ease;
                break;
        }
    }
    
    render(ctx) {
        const pulse = 1 + Math.sin(this.pulsePhase) * 0.1;
        const r = this.radius * pulse;
        
        // Outer glow
        const glowGradient = ctx.createRadialGradient(
            this.x, this.y, r * 0.5,
            this.x, this.y, r * 1.5
        );
        glowGradient.addColorStop(0, 'rgba(180, 0, 40, 0.3)');
        glowGradient.addColorStop(1, 'rgba(180, 0, 40, 0)');
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();
        
        // Main body - rotating triangle pattern
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Draw spiky shape
        const spikes = 6;
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const a = (i / (spikes * 2)) * Math.PI * 2;
            const rad = i % 2 === 0 ? r : r * 0.6;
            const px = Math.cos(a) * rad;
            const py = Math.sin(a) * rad;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        
        const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        bodyGradient.addColorStop(0, 'rgba(220, 40, 80, 0.9)');
        bodyGradient.addColorStop(1, 'rgba(140, 20, 50, 0.7)');
        ctx.fillStyle = bodyGradient;
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(255, 100, 120, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
        
        // Center eye
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 200, 200, 0.8)';
        ctx.fill();
    }
}

class GoldDigger {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.angle = Math.random() * Math.PI * 2;
        this.rotationSpeed = 2;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.isGoldDigger = true; // Flag to identify this type
    }

    update(dt, target, runScore) {
        if (!target || !target.alive) return;

        this.angle += this.rotationSpeed * dt;
        this.pulsePhase += dt * 5;

        // Calculate speed based on runScore
        const speed = 30 + (runScore * 8);

        // Move towards target
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 1) {
            this.x += (dx / dist) * speed * dt;
            this.y += (dy / dist) * speed * dt;
        }
    }

    render(ctx) {
        const pulse = 1 + Math.sin(this.pulsePhase) * 0.15;
        const r = this.radius * pulse;

        // Dangerous red outer glow
        const glowGradient = ctx.createRadialGradient(
            this.x, this.y, r * 0.5,
            this.x, this.y, r * 2
        );
        glowGradient.addColorStop(0, 'rgba(255, 60, 60, 0.6)');
        glowGradient.addColorStop(1, 'rgba(255, 60, 60, 0)');

        ctx.beginPath();
        ctx.arc(this.x, this.y, r * 2, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();

        // Main body - Hexagon/Diamond shape for Gold Digger
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.beginPath();
        const sides = 4;
        for (let i = 0; i < sides; i++) {
            const a = (i / sides) * Math.PI * 2;
            const px = Math.cos(a) * r;
            const py = Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();

        const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        bodyGradient.addColorStop(0, '#ffcccc');
        bodyGradient.addColorStop(0.5, '#ff4444');
        bodyGradient.addColorStop(1, '#cc0000');
        ctx.fillStyle = bodyGradient;
        ctx.fill();

        ctx.strokeStyle = '#ff8888';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner detail
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.stroke();

        ctx.restore();
    }
}

class Treat {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = 12;
        this.collected = false;
        this.collectAnimation = 0;
        this.floatPhase = Math.random() * Math.PI * 2;
        this.baseY = y;
        this.sparkles = [];
        
        // Initialize sparkles
        for (let i = 0; i < 5; i++) {
            this.sparkles.push({
                angle: (i / 5) * Math.PI * 2,
                distance: 20 + Math.random() * 10,
                phase: Math.random() * Math.PI * 2,
                size: 2 + Math.random() * 2
            });
        }
    }
    
    update(dt) {
        if (this.collected) {
            this.collectAnimation += dt * 4;
            return this.collectAnimation >= 1;
        }
        
        // Apply velocity with damping
        const damping = 0.95;
        this.vx *= damping;
        this.vy *= damping;
        
        // Update position
        this.x += this.vx * dt;
        this.baseY += this.vy * dt;
        
        // Float animation
        this.floatPhase += dt * 2;
        this.y = this.baseY + Math.sin(this.floatPhase) * 5;
        
        // Update sparkles
        for (const sparkle of this.sparkles) {
            sparkle.angle += dt * 0.5;
            sparkle.phase += dt * 3;
        }
        
        return false;
    }
    
    applyForce(fx, fy) {
        this.vx += fx;
        this.vy += fy;
    }
    
    collect() {
        if (!this.collected) {
            this.collected = true;
            return true;
        }
        return false;
    }
    
    render(ctx) {
        if (this.collected) {
            // Collection animation
            const t = this.collectAnimation;
            const scale = 1 + t * 2;
            const alpha = 1 - t;
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * scale, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.5})`;
            ctx.fill();
            
            // Burst particles
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const dist = t * 50;
                const px = this.x + Math.cos(angle) * dist;
                const py = this.y + Math.sin(angle) * dist;
                
                ctx.beginPath();
                ctx.arc(px, py, 3 * (1 - t), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
                ctx.fill();
            }
            return;
        }
        
        // Outer glow
        const glowGradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.radius * 3
        );
        glowGradient.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
        glowGradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.1)');
        glowGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();
        
        // Sparkles
        for (const sparkle of this.sparkles) {
            const sx = this.x + Math.cos(sparkle.angle) * sparkle.distance;
            const sy = this.y + Math.sin(sparkle.angle) * sparkle.distance;
            const alpha = 0.3 + Math.sin(sparkle.phase) * 0.3;
            
            ctx.beginPath();
            ctx.arc(sx, sy, sparkle.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 200, ${alpha})`;
            ctx.fill();
        }
        
        // Main body
        const bodyGradient = ctx.createRadialGradient(
            this.x - 3, this.y - 3, 0,
            this.x, this.y, this.radius
        );
        bodyGradient.addColorStop(0, '#fff8dc');
        bodyGradient.addColorStop(0.5, '#ffd700');
        bodyGradient.addColorStop(1, '#daa520');
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = bodyGradient;
        ctx.fill();
        
        // Highlight
        ctx.beginPath();
        ctx.arc(this.x - 3, this.y - 3, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fill();
    }
}

// Module exports for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Dot,
        Magnet,
        Danger,
        GoldDigger,
        Treat
    };
}
