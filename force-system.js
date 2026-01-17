// ============================================
// FORCE SYSTEM - Reusable Force Calculations
// ============================================

/**
 * Force system for calculating and applying various force effects
 */
class ForceSystem {
    constructor() {
        this.attractionRadius = 300;
        this.repulsionRadius = 250;
        this.goldDiggerRepulsionRadius = 300;
    }

    /**
     * Apply magnetic forces from magnets to a dot
     */
    applyMagneticForces(dot, magnets, dt, physics) {
        const forces = physics.calculateMagneticForces(dot, magnets);
        dot.applyForce(forces.fx * dt, forces.fy * dt);
    }

    /**
     * Apply treat attraction forces (treats pull dots)
     */
    applyTreatAttraction(dot, treats, strength, dt) {
        const attractionStrength = 8000 * strength;
        const attractionRadius = this.attractionRadius;

        for (const treat of treats) {
            if (treat.collected) continue;
            
            const dx = treat.x - dot.x;
            const dy = treat.y - dot.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > attractionRadius || distance < 1) continue;
            
            const radiusFactor = 1 - (distance / attractionRadius);
            const forceMagnitude = (attractionStrength * radiusFactor) / Math.max(distance, 20);
            
            const nx = dx / distance;
            const ny = dy / distance;
            
            dot.applyForce(nx * forceMagnitude * dt, ny * forceMagnitude * dt);
        }
    }

    /**
     * Apply treat attraction (dots pull treats)
     */
    applyDotAttractsTreats(treat, dots, strength, dt) {
        const attractionStrength = 6000 * strength;
        const attractionRadius = 250;

        for (const dot of dots) {
            if (!dot.alive) continue;
            
            const dx = dot.x - treat.x;
            const dy = dot.y - treat.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > attractionRadius || distance < 20) continue;
            
            const radiusFactor = 1 - (distance / attractionRadius);
            const effectiveDistance = Math.max(distance, 20);
            const forceMagnitude = (attractionStrength * radiusFactor) / effectiveDistance;
            
            const nx = dx / distance;
            const ny = dy / distance;
            
            treat.applyForce(nx * forceMagnitude * dt, ny * forceMagnitude * dt);
        }
    }

    /**
     * Apply danger repulsion forces (dangers push dots away)
     */
    applyDangerRepulsion(dot, dangers, dangerStrength, goldDiggerStrength, dt) {
        const dangerRepulsionStrength = 4000 * dangerStrength;
        const dangerRepulsionRadius = this.repulsionRadius;
        const goldDiggerRepulsionStrength = 12000 * goldDiggerStrength;
        const goldDiggerRepulsionRadius = this.goldDiggerRepulsionRadius;

        for (const danger of dangers) {
            const isGoldDigger = danger.isGoldDigger;
            const strength = isGoldDigger ? goldDiggerRepulsionStrength : dangerRepulsionStrength;
            const radius = isGoldDigger ? goldDiggerRepulsionRadius : dangerRepulsionRadius;

            if (strength <= 0) continue;

            const dx = dot.x - danger.x;
            const dy = dot.y - danger.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > radius || distance < 1) continue;

            const radiusFactor = 1 - (distance / radius);
            const effectiveDistance = Math.max(distance, 20);
            const forceMagnitude = (strength * radiusFactor) / effectiveDistance;

            const nx = dx / distance;
            const ny = dy / distance;

            dot.applyForce(nx * forceMagnitude * dt, ny * forceMagnitude * dt);
        }
    }

    /**
     * Apply seek behavior to angry dots (towards nearest danger)
     */
    applyAngryDotSeekBehavior(dot, dangers, dt) {
        if (!dot.isAngry || dangers.length === 0) return;

        let closestDanger = null;
        let closestDistance = Infinity;
        
        for (const danger of dangers) {
            const dx = danger.x - dot.x;
            const dy = danger.y - dot.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestDanger = danger;
            }
        }
        
        if (closestDanger && closestDistance > 1) {
            const speed = 300; // Angry dots are fast
            const dx = closestDanger.x - dot.x;
            const dy = closestDanger.y - dot.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const nx = dx / distance;
            const ny = dy / distance;
            
            dot.applyForce(nx * speed * dt, ny * speed * dt);
        }
    }

    /**
     * Apply all relevant force effects to a single dot
     */
    applyAllForces(dot, magnets, treats, dangers, stats, dt, physics) {
        // Apply magnetic forces
        this.applyMagneticForces(dot, magnets, dt, physics);

        // Apply treat attraction
        if (stats.treatAttraction > 0) {
            this.applyTreatAttraction(dot, treats, stats.treatAttraction, dt);
        }

        // Apply danger repulsion
        if (stats.dangerRepulsion > 0 || stats.goldDiggerRepulsion > 0) {
            this.applyDangerRepulsion(
                dot,
                dangers,
                stats.dangerRepulsion,
                stats.goldDiggerRepulsion,
                dt
            );
        }

        // Apply angry dot behavior
        this.applyAngryDotSeekBehavior(dot, dangers, dt);
    }

    /**
     * Apply all relevant force effects to all dots
     */
    applyForcesToAllDots(dots, magnets, treats, dangers, stats, dt, physics) {
        for (const dot of dots) {
            if (!dot.alive) continue;
            this.applyAllForces(dot, magnets, treats, dangers, stats, dt, physics);
        }
    }

    /**
     * Apply forces from dots to treats
     */
    applyForcesToTreats(treats, dots, stats, dt) {
        if (stats.attractTreats > 0) {
            for (const treat of treats) {
                if (treat.collected) continue;
                this.applyDotAttractsTreats(treat, dots, stats.attractTreats, dt);
            }
        }
    }
}

// Module exports for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ForceSystem;
}
