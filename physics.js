// ============================================
// PHYSICS - Force Calculations & Collisions
// ============================================

class Physics {
    constructor() {
        this.minDistance = 20; // Prevent extreme forces at very close range
    }
    
    /**
     * Calculate magnetic force on the dot from all magnets
     * Uses a blend of inverse distance (not squared) for better gameplay feel
     */
    calculateMagneticForces(dot, magnets) {
        let totalFx = 0;
        let totalFy = 0;
        
        for (const magnet of magnets) {
            if (magnet.dead) continue;
            
            const dx = magnet.x - dot.x;
            const dy = magnet.y - dot.y;
            const distSquared = dx * dx + dy * dy;
            const distance = Math.sqrt(distSquared);
            
            // Skip if outside magnet's radius (with soft edge)
            if (distance > magnet.radius) continue;
            
            // Clamp minimum distance to prevent extreme forces
            const effectiveDistance = Math.max(distance, this.minDistance);
            
            // Calculate force with softer falloff for better gameplay
            // Blend between inverse distance and inverse square
            const life = magnet.getLifePercent();
            const radiusFactor = 1 - (distance / magnet.radius); // Stronger when closer to magnet
            const forceMagnitude = (magnet.strength * life * radiusFactor) / effectiveDistance;
            
            // Normalize direction (handle zero distance edge case)
            if (distance < 0.001) continue;
            const nx = dx / distance;
            const ny = dy / distance;
            
            // Apply force based on magnet type
            if (magnet.type === 'attract') {
                totalFx += nx * forceMagnitude;
                totalFy += ny * forceMagnitude;
            } else {
                totalFx -= nx * forceMagnitude;
                totalFy -= ny * forceMagnitude;
            }
        }
        
        return { fx: totalFx, fy: totalFy };
    }
    
    /**
     * Check collision between dot and a circular entity
     */
    checkCircleCollision(dot, entity) {
        const dx = entity.x - dot.x;
        const dy = entity.y - dot.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const collisionDistance = dot.radius + entity.radius;
        
        return distance < collisionDistance;
    }
    
    /**
     * Check if dot collides with any danger
     */
    checkDangerCollisions(dot, dangers) {
        for (const danger of dangers) {
            if (this.checkCircleCollision(dot, danger)) {
                return danger;
            }
        }
        return null;
    }
    
    /**
     * Check if dot collides with any treat
     */
    checkTreatCollisions(dot, treats) {
        for (const treat of treats) {
            if (!treat.collected && this.checkCircleCollision(dot, treat)) {
                return treat;
            }
        }
        return null;
    }
    
    /**
     * Keep dot within canvas bounds with bounce
     */
    constrainToBounds(dot, width, height, bounce = 0.5) {
        const margin = dot.radius;
        
        if (dot.x < margin) {
            dot.x = margin;
            dot.vx = Math.abs(dot.vx) * bounce;
        } else if (dot.x > width - margin) {
            dot.x = width - margin;
            dot.vx = -Math.abs(dot.vx) * bounce;
        }
        
        if (dot.y < margin) {
            dot.y = margin;
            dot.vy = Math.abs(dot.vy) * bounce;
        } else if (dot.y > height - margin) {
            dot.y = height - margin;
            dot.vy = -Math.abs(dot.vy) * bounce;
        }
    }
    
    /**
     * Get distance between two points
     */
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Check if a position is too close to existing entities
     */
    isPositionClear(x, y, entities, minDistance) {
        for (const entity of entities) {
            if (this.distance(x, y, entity.x, entity.y) < minDistance) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Find a safe spawn position away from the dot and dangers
     */
    findSafeSpawnPosition(dot, dangers, canvasWidth, canvasHeight, margin = 100, minDistFromDot = 150) {
        const maxAttempts = 50;
        
        for (let i = 0; i < maxAttempts; i++) {
            const x = margin + Math.random() * (canvasWidth - margin * 2);
            const y = margin + Math.random() * (canvasHeight - margin * 2);
            
            // Check distance from dot
            if (this.distance(x, y, dot.x, dot.y) < minDistFromDot) {
                continue;
            }
            
            // Check distance from dangers
            if (!this.isPositionClear(x, y, dangers, 80)) {
                continue;
            }
            
            return { x, y };
        }
        
        // Fallback to random position if no safe spot found
        return {
            x: margin + Math.random() * (canvasWidth - margin * 2),
            y: margin + Math.random() * (canvasHeight - margin * 2)
        };
    }
}
