// ============================================
// ENTITIES - Game Objects
// ============================================

class Dot {
    constructor(x, y, isAngry = false, isOriginal = false) {
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
        this.isOriginal = isOriginal;
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
            const trailColor = this.isAngry ? '255, 60, 60' : (this.isOriginal ? '0, 255, 255' : '255, 255, 255');

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
            const deathColor = this.isAngry ? '255, 60, 60' : (this.isOriginal ? '0, 255, 255' : '255, 0, 102');

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

        // Pulsing glow effect for original dot
        if (this.isOriginal) {
            const pulsePhase = performance.now() * 0.003;
            const pulse = 1 + Math.sin(pulsePhase) * 0.2;

            // Thicker glow for original dot
            const glowGradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, this.radius * 4 * pulse
            );
            glowGradient.addColorStop(0, 'rgba(0, 255, 255, 0.6)');
            glowGradient.addColorStop(0.3, 'rgba(0, 255, 255, 0.3)');
            glowGradient.addColorStop(0.6, 'rgba(0, 255, 255, 0.1)');
            glowGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');

            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 4 * pulse, 0, Math.PI * 2);
            ctx.fillStyle = glowGradient;
            ctx.fill();

            // Thicker border for original dot
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Glow effect for spawned dots
        if (!this.isOriginal) {
            const gradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, this.radius * 3
            );
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
            gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        // Main dot
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.isAngry ? '#ff3333' : (this.isOriginal ? '#00ffff' : '#ffffff');
        ctx.fill();

        // Inner highlight
        ctx.beginPath();
        ctx.arc(this.x - 2, this.y - 2, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = this.isAngry ? 'rgba(255, 100, 100, 0.8)' : (this.isOriginal ? 'rgba(0, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.8)');
        ctx.fill();
    }
}

class Magnet {
    constructor(x, y, type, upgrades, persistent = false) {
        this.x = x;
        this.y = y;
        this.type = type; // 'attract' or 'repel'
        this.baseStrength = 80000;
        this.baseRadius = 100;
        
        // Apply upgrades (upgrades contains multipliers directly from upgrade tree)
        const radiusMultiplier = type === 'attract'
            ? (upgrades.attractRadius || 1) * (upgrades.lawOfAttractionRadius || 1)
            : (upgrades.repelRadius || 1);
        
        this.strength = this.baseStrength * (type === 'attract' ? (upgrades.attractStrength || 1) : (upgrades.repelStrength || 1));
        this.radius = this.baseRadius * radiusMultiplier;
        
        this.age = 0;
        this.dead = false;
        
        // Persistent magnets stay active while mouse is held
        this.persistent = persistent;
        
        // Full intensity for constant magnets
        this.intensity = 1;
        
        // Organic water ripple system
        this.ripples = [];
        this.harmonicRipples = []; // Secondary smaller ripples between primary waves
        this.fieldLines = []; // Flowing magnetic field distortion lines
        this.spawnInitialRipples();
        this.initFieldLines();
        
        // Animation timing
        this.globalPhase = Math.random() * Math.PI * 2;
        this.lastRippleSpawn = 0;
        this.lastHarmonicSpawn = 0;
    }
    
    // Smooth easing functions for organic motion
    easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }
    
    easeInOutSine(t) {
        return -(Math.cos(Math.PI * t) - 1) / 2;
    }
    
    easeOutElastic(t) {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }
    
    spawnInitialRipples() {
        // Spawn initial gentle pulse based on intensity
        const rippleCount = Math.floor(1 + this.intensity * 2);
        for (let i = 0; i < rippleCount; i++) {
            this.spawnRipple(i * 0.1);
        }
    }
    
    spawnRipple(delay = 0) {
        const baseIntensity = this.intensity;
        this.ripples.push({
            radius: this.type === 'attract' ? this.radius : 0,
            alpha: 0.5 * baseIntensity,
            age: -delay, // Negative age creates staggered start
            baseRadius: this.radius,
            thickness: 3 + Math.random() * 2,
            speed: 0.8 + Math.random() * 0.4, // Variable speed for organic feel
            phase: Math.random() * Math.PI * 2, // Individual wave phase
            featherAmount: 0.3 + Math.random() * 0.2 // How much the edge dissolves
        });
    }
    
    spawnHarmonicRipple() {
        // Smaller, faster ripples that emerge between primary waves
        this.harmonicRipples.push({
            radius: this.type === 'attract' ? this.radius * 0.7 : this.radius * 0.2,
            alpha: 0.25 * this.intensity,
            age: 0,
            baseRadius: this.radius,
            thickness: 1 + Math.random(),
            speed: 1.5 + Math.random() * 0.5,
            phase: Math.random() * Math.PI * 2
        });
    }
    
    initFieldLines() {
        // Create flowing field lines that bend like liquid
        const lineCount = 8 + Math.floor(this.intensity * 4);
        for (let i = 0; i < lineCount; i++) {
            const angle = (i / lineCount) * Math.PI * 2;
            this.fieldLines.push({
                baseAngle: angle,
                currentAngle: angle,
                length: 0.3 + Math.random() * 0.4, // Fraction of radius
                phase: Math.random() * Math.PI * 2,
                waveFrequency: 2 + Math.random() * 2,
                waveAmplitude: 0.15 + Math.random() * 0.1,
                alpha: 0.3 + Math.random() * 0.2
            });
        }
    }
    
    // Update position (for persistent magnets that follow cursor)
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }
    
    // Kill the magnet (for persistent magnets when mouse is released)
    kill() {
        this.dead = true;
    }
    
    update(dt) {
        this.age += dt;
        this.globalPhase += dt * 2;
        
        // Persistent magnets don't die on their own
        // (they are killed externally when mouse is released)
        
        // Spawn primary ripples with organic timing
        const rippleSpawnRate = 0.12 / this.intensity;
        if (this.age - this.lastRippleSpawn >= rippleSpawnRate) {
            this.spawnRipple();
            this.lastRippleSpawn = this.age;
        }
        
        // Spawn harmonic ripples between primary waves
        const harmonicSpawnRate = 0.2;
        if (this.age - this.lastHarmonicSpawn >= harmonicSpawnRate && this.intensity > 0.5) {
            this.spawnHarmonicRipple();
            this.lastHarmonicSpawn = this.age;
        }
        
        // Update primary ripples with smooth organic easing
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const ripple = this.ripples[i];
            ripple.age += dt * ripple.speed;
            
            if (ripple.age < 0) continue; // Still in delay
            
            // Use ease-in-out for natural acceleration/deceleration
            const duration = 1.8;
            const progress = Math.min(1, ripple.age / duration);
            const easeProgress = this.easeInOutSine(progress);
            
            // Ripple thickness variation - thin at edges for feathered look
            const thicknessFade = Math.sin(progress * Math.PI);
            ripple.currentThickness = ripple.thickness * thicknessFade;
            
            if (this.type === 'attract') {
                // Ripples contract inward like water draining
                ripple.radius = ripple.baseRadius * (1 - easeProgress);
            } else {
                // Ripples expand outward like droplet impact
                ripple.radius = ripple.baseRadius * easeProgress;
            }
            
            // Alpha fades organically with feathered edges
            const alphaEase = 1 - Math.pow(progress, 1.5);
            const waveFade = 0.5 + 0.5 * Math.sin(ripple.phase + this.globalPhase * 0.5);
            ripple.alpha = ripple.featherAmount * alphaEase * waveFade * this.intensity;
            
            if (ripple.alpha <= 0.005 || ripple.radius <= 0) {
                this.ripples.splice(i, 1);
            }
        }
        
        // Update harmonic ripples
        for (let i = this.harmonicRipples.length - 1; i >= 0; i--) {
            const ripple = this.harmonicRipples[i];
            ripple.age += dt * ripple.speed;
            
            const duration = 0.8;
            const progress = Math.min(1, ripple.age / duration);
            const easeProgress = this.easeOutQuart(progress);
            
            if (this.type === 'attract') {
                ripple.radius = ripple.baseRadius * 0.7 * (1 - easeProgress);
            } else {
                ripple.radius = ripple.baseRadius * 0.2 + ripple.baseRadius * 0.5 * easeProgress;
            }
            
            ripple.alpha = 0.2 * (1 - progress) * this.intensity;
            
            if (ripple.alpha <= 0.005) {
                this.harmonicRipples.splice(i, 1);
            }
        }
        
        // Update field lines with liquid-like bending motion
        for (const line of this.fieldLines) {
            line.phase += dt * 3;
            // Field lines bend and wave like disturbed liquid
            const waveOffset = Math.sin(line.phase * line.waveFrequency) * line.waveAmplitude;
            line.currentAngle = line.baseAngle + waveOffset;
        }
    }
    
    getLifePercent() {
        // Persistent magnets are always at full life
        return 1;
    }
    
    // Color interpolation for gradient transitions
    getGradientColor(progress) {
        const life = this.getLifePercent();
        
        if (this.type === 'attract') {
            // Cyan to soft blue gradient as ripples travel
            const r = Math.floor(0 + progress * 30);
            const g = Math.floor(212 - progress * 80);
            const b = Math.floor(255 - progress * 30);
            return { r, g, b };
        } else {
            // Magenta to soft pink gradient as ripples travel
            const r = Math.floor(255 - progress * 40);
            const g = Math.floor(0 + progress * 60);
            const b = Math.floor(102 + progress * 50);
            return { r, g, b };
        }
    }
    
    render(ctx) {
        const life = this.getLifePercent();
        const baseColor = this.type === 'attract' ? [0, 212, 255] : [255, 0, 102];
        const baseAlpha = life * 0.85;
        
        // Draw outer boundary - soft, barely visible
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * life, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${baseColor.join(',')}, ${baseAlpha * 0.05})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
        
        // Draw flowing field lines (liquid distortion effect)
        this.renderFieldLines(ctx, life, baseColor, baseAlpha);
        
        // Draw harmonic ripples (subtle background waves)
        for (const ripple of this.harmonicRipples) {
            if (ripple.alpha <= 0 || ripple.radius <= 0) continue;
            
            const progress = ripple.radius / ripple.baseRadius;
            const color = this.getGradientColor(progress);
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, ripple.radius * life, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${ripple.alpha * baseAlpha * 0.4})`;
            ctx.lineWidth = ripple.thickness;
            ctx.stroke();
        }
        
        // Draw primary ripples with organic feathered edges
        for (const ripple of this.ripples) {
            if (ripple.alpha <= 0 || ripple.radius <= 0 || ripple.age < 0) continue;
            
            const progress = this.type === 'attract'
                ? 1 - (ripple.radius / ripple.baseRadius)
                : ripple.radius / ripple.baseRadius;
            const color = this.getGradientColor(progress);
            
            // Main ripple with gradient stroke
            const rippleGradient = ctx.createRadialGradient(
                this.x, this.y, Math.max(0, ripple.radius * life - 10),
                this.x, this.y, ripple.radius * life + 10
            );
            
            const innerAlpha = ripple.alpha * baseAlpha;
            const outerAlpha = ripple.alpha * baseAlpha * ripple.featherAmount;
            
            rippleGradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${innerAlpha * 0.3})`);
            rippleGradient.addColorStop(0.3, `rgba(${color.r}, ${color.g}, ${color.b}, ${innerAlpha * 0.8})`);
            rippleGradient.addColorStop(0.7, `rgba(${color.r}, ${color.g}, ${color.b}, ${innerAlpha * 0.8})`);
            rippleGradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, ${outerAlpha * 0.1})`);
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, ripple.radius * life, 0, Math.PI * 2);
            ctx.strokeStyle = rippleGradient;
            ctx.lineWidth = ripple.currentThickness || ripple.thickness;
            ctx.stroke();
        }
        
        // Center glow with smooth organic breathing
        const breathe = 1 + Math.sin(this.globalPhase * 1.5) * 0.15 * this.intensity;
        const glowSize = 40 * life * breathe;
        
        const glowGradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, glowSize
        );
        
        const centerIntensity = baseAlpha * 0.7 * this.intensity;
        glowGradient.addColorStop(0, `rgba(${baseColor.join(',')}, ${centerIntensity})`);
        glowGradient.addColorStop(0.3, `rgba(${baseColor.join(',')}, ${centerIntensity * 0.5})`);
        glowGradient.addColorStop(0.6, `rgba(${baseColor.join(',')}, ${centerIntensity * 0.2})`);
        glowGradient.addColorStop(1, `rgba(${baseColor.join(',')}, 0)`);
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();
        
        // Center dot with gentle pulsing
        const pulse = 1 + Math.sin(this.globalPhase * 2) * 0.2;
        const dotSize = (4 + this.intensity * 2) * life * pulse;
        
        // Soft center dot with glow
        const dotGlow = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, dotSize * 2
        );
        dotGlow.addColorStop(0, `rgba(255, 255, 255, ${baseAlpha * 0.9})`);
        dotGlow.addColorStop(0.5, `rgba(${baseColor.join(',')}, ${baseAlpha * 0.6})`);
        dotGlow.addColorStop(1, `rgba(${baseColor.join(',')}, 0)`);
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, dotSize * 2, 0, Math.PI * 2);
        ctx.fillStyle = dotGlow;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${baseAlpha})`;
        ctx.fill();
    }
    
    renderFieldLines(ctx, life, baseColor, baseAlpha) {
        // Draw curved field lines that bend and flow like disturbed liquid
        ctx.save();
        
        for (const line of this.fieldLines) {
            const startRadius = this.type === 'attract'
                ? this.radius * line.length * 0.5
                : this.radius * 0.15;
            const endRadius = this.type === 'attract'
                ? this.radius * 0.08
                : this.radius * line.length;
            
            // Calculate control points for bezier curve (creates flowing bend)
            const wavePhase = line.phase + this.globalPhase;
            const bendAmount = Math.sin(wavePhase) * 30 * this.intensity;
            
            const startAngle = line.currentAngle;
            const startX = this.x + Math.cos(startAngle) * startRadius * life;
            const startY = this.y + Math.sin(startAngle) * startRadius * life;
            
            const endAngle = line.currentAngle + Math.sin(wavePhase * 0.5) * 0.1;
            const endX = this.x + Math.cos(endAngle) * endRadius * life;
            const endY = this.y + Math.sin(endAngle) * endRadius * life;
            
            // Control point creates the liquid bend effect
            const midRadius = (startRadius + endRadius) / 2;
            const perpAngle = line.currentAngle + Math.PI / 2;
            const ctrlX = this.x + Math.cos(line.currentAngle) * midRadius * life + Math.cos(perpAngle) * bendAmount;
            const ctrlY = this.y + Math.sin(line.currentAngle) * midRadius * life + Math.sin(perpAngle) * bendAmount;
            
            // Draw the curved field line
            const lineAlpha = line.alpha * baseAlpha * (0.5 + 0.5 * Math.sin(wavePhase * 2));
            
            const lineGradient = ctx.createLinearGradient(startX, startY, endX, endY);
            if (this.type === 'attract') {
                lineGradient.addColorStop(0, `rgba(${baseColor.join(',')}, ${lineAlpha * 0.1})`);
                lineGradient.addColorStop(0.5, `rgba(${baseColor.join(',')}, ${lineAlpha * 0.4})`);
                lineGradient.addColorStop(1, `rgba(${baseColor.join(',')}, ${lineAlpha * 0.8})`);
            } else {
                lineGradient.addColorStop(0, `rgba(${baseColor.join(',')}, ${lineAlpha * 0.8})`);
                lineGradient.addColorStop(0.5, `rgba(${baseColor.join(',')}, ${lineAlpha * 0.4})`);
                lineGradient.addColorStop(1, `rgba(${baseColor.join(',')}, ${lineAlpha * 0.1})`);
            }
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
            ctx.strokeStyle = lineGradient;
            ctx.lineWidth = 1.5 + Math.sin(wavePhase * 3) * 0.5;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
        
        ctx.restore();
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
        const scaledScore = Math.max(0, runScore || 0);
        const speed = 30 + (30 * Math.log1p(scaledScore));

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

class RiftStalker {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.angle = Math.random() * Math.PI * 2;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.orbitAngle = Math.random() * Math.PI * 2;
        this.orbitRadius = 120 + Math.random() * 120;
        this.orbitSpeed = 0.6 + Math.random() * 0.4;
        this.blinkTimer = 1 + Math.random() * 2;
        this.blinkInterval = 2.5 + Math.random() * 1.5;
        this.blinkFlash = 0;
    }

    update(dt, target, runScore) {
        if (!target || !target.alive) return;

        this.angle += dt * 1.5;
        this.pulsePhase += dt * 4;
        this.orbitAngle += this.orbitSpeed * dt;
        this.blinkTimer -= dt;
        this.blinkFlash = Math.max(0, this.blinkFlash - dt * 2.5);

        if (this.blinkTimer <= 0) {
            const urgency = Math.min(1, Math.max(0, (runScore - 200) / 200));
            this.orbitRadius = 90 + Math.random() * (140 - 60 * urgency);
            this.orbitAngle = Math.random() * Math.PI * 2;
            this.blinkTimer = this.blinkInterval - urgency;
            this.blinkFlash = 1;
        }

        this.x = target.x + Math.cos(this.orbitAngle) * this.orbitRadius;
        this.y = target.y + Math.sin(this.orbitAngle) * this.orbitRadius;
    }

    render(ctx) {
        const pulse = 1 + Math.sin(this.pulsePhase) * 0.12;
        const r = this.radius * pulse;
        const flash = this.blinkFlash;

        const glowGradient = ctx.createRadialGradient(
            this.x, this.y, r * 0.4,
            this.x, this.y, r * (2.4 + flash)
        );
        glowGradient.addColorStop(0, `rgba(100, 240, 255, ${0.35 + flash * 0.2})`);
        glowGradient.addColorStop(0.5, 'rgba(90, 120, 255, 0.2)');
        glowGradient.addColorStop(1, 'rgba(90, 120, 255, 0)');

        ctx.beginPath();
        ctx.arc(this.x, this.y, r * (2.4 + flash), 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2;
            const rad = i % 2 === 0 ? r * 1.1 : r * 0.55;
            const px = Math.cos(a) * rad;
            const py = Math.sin(a) * rad;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();

        const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.3);
        bodyGradient.addColorStop(0, 'rgba(220, 255, 255, 0.9)');
        bodyGradient.addColorStop(0.6, 'rgba(120, 200, 255, 0.8)');
        bodyGradient.addColorStop(1, 'rgba(80, 120, 255, 0.7)');
        ctx.fillStyle = bodyGradient;
        ctx.fill();

        ctx.strokeStyle = `rgba(160, 240, 255, ${0.6 + flash * 0.2})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + flash * 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
    }
}

class Collector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = 6;
        this.trail = [];
        this.maxTrailLength = 15;
        this.alive = true;
        this.deathTime = 0;
        this.deathAnimation = 0;
        this.isCollector = true;
        this.targetTreat = null;
        this.speed = 120; // Movement speed
        this.pulsePhase = Math.random() * Math.PI * 2;
    }
    
    update(dt, treats) {
        if (!this.alive) {
            this.deathAnimation = Math.min(1, this.deathAnimation + dt * 2);
            return;
        }
        
        this.pulsePhase += dt * 4;
        
        // Find closest treat if no target or target is collected
        if (!this.targetTreat || this.targetTreat.collected) {
            this.targetTreat = null;
            let closestDist = Infinity;
            for (const treat of treats) {
                if (treat.collected) continue;
                const dx = treat.x - this.x;
                const dy = treat.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < closestDist) {
                    closestDist = dist;
                    this.targetTreat = treat;
                }
            }
        }
        
        // Move towards target treat
        if (this.targetTreat && !this.targetTreat.collected) {
            const dx = this.targetTreat.x - this.x;
            const dy = this.targetTreat.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 1) {
                this.vx = (dx / dist) * this.speed;
                this.vy = (dy / dist) * this.speed;
            }
        } else {
            // Wander randomly if no treats
            this.vx *= 0.95;
            this.vy *= 0.95;
            if (Math.abs(this.vx) < 10 && Math.abs(this.vy) < 10) {
                this.vx += (Math.random() - 0.5) * 20;
                this.vy += (Math.random() - 0.5) * 20;
            }
        }
        
        // Apply velocity with damping
        const damping = 0.98;
        this.vx *= damping;
        this.vy *= damping;
        
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        // Update trail
        this.trail.unshift({ x: this.x, y: this.y, age: 0 });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.pop();
        }
        
        // Age trail particles
        for (let i = 0; i < this.trail.length; i++) {
            this.trail[i].age += dt * 2;
        }
    }
    
    die() {
        if (this.alive) {
            this.alive = false;
            this.deathTime = performance.now();
        }
    }
    
    render(ctx) {
        const trailColor = '0, 255, 100';
        
        // Draw trail
        if (this.trail.length > 1) {
            for (let i = 0; i < this.trail.length - 1; i++) {
                const point = this.trail[i];
                const nextPoint = this.trail[i + 1];
                const progress = i / this.trail.length;
                const alpha = Math.max(0, 1 - point.age) * 0.5 * (1 - progress);
                const lineWidth = (this.radius * 0.7) * (1 - progress);
                
                ctx.beginPath();
                ctx.moveTo(point.x, point.y);
                ctx.lineTo(nextPoint.x, nextPoint.y);
                ctx.strokeStyle = `rgba(${trailColor}, ${alpha * 0.3})`;
                ctx.lineWidth = lineWidth;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
        }
        
        if (!this.alive) {
            // Death animation
            const t = this.deathAnimation;
            const expandRadius = this.radius + t * 60;
            const alpha = 1 - t;
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, expandRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${trailColor}, ${alpha})`;
            ctx.lineWidth = 2 * (1 - t);
            ctx.stroke();
            
            if (t < 0.5) {
                const shrink = 1 - t * 2;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius * shrink, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${trailColor}, ${shrink})`;
                ctx.fill();
            }
            return;
        }
        
        const pulse = 1 + Math.sin(this.pulsePhase) * 0.15;
        const r = this.radius * pulse;
        
        // Glow effect
        const glowGradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, r * 3
        );
        glowGradient.addColorStop(0, 'rgba(0, 255, 100, 0.4)');
        glowGradient.addColorStop(0.5, 'rgba(0, 255, 100, 0.15)');
        glowGradient.addColorStop(1, 'rgba(0, 255, 100, 0)');
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * 3, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();
        
        // Main body
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fillStyle = '#00ff64';
        ctx.fill();
        
        // Inner highlight
        ctx.beginPath();
        ctx.arc(this.x - 1.5, this.y - 1.5, r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(150, 255, 180, 0.8)';
        ctx.fill();
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
        RiftStalker,
        Collector,
        Treat
    };
}
