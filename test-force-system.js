// Test script to verify the ForceSystem functionality using require
const Physics = require('./physics.js');
const { Dot, Magnet, Treat, Danger } = require('./entities.js');
const ForceSystem = require('./force-system.js');
const ParticleSystem = require('./particles.js');
const { createDefaultUpgradeTree } = require('./upgrades.js');

console.log('=== Force System Initialization ===');

try {
    // Test 1: Create a force system instance
    const forceSystem = new ForceSystem();
    console.log('✓ ForceSystem instance created');
    
    // Test 2: Verify force system methods exist
    const expectedMethods = ['applyMagneticForces', 'applyTreatAttraction', 'applyDotAttractsTreats', 'applyDangerRepulsion', 'applyAngryDotSeekBehavior', 'applyAllForces', 'applyForcesToAllDots', 'applyForcesToTreats'];
    expectedMethods.forEach(method => {
        if (typeof forceSystem[method] === 'function') {
            console.log(`✓ ${method} method exists`);
        } else {
            console.error(`✗ ${method} method is missing or not a function`);
        }
    });
    
    // Test 3: Create test entities
    console.log('\n=== Entity Creation ===');
    const dot = new Dot(100, 100);
    console.log('✓ Dot created');
    
    const magnet = new Magnet(200, 200, 'attract', {
        attractStrength: 1,
        attractRadius: 1,
        attractDuration: 1
    });
    console.log('✓ Magnet created');
    
    const treat = new Treat(150, 150);
    console.log('✓ Treat created');
    
    const danger = new Danger(250, 250, 10);
    console.log('✓ Danger created');
    
    // Test 4: Apply magnetic forces
    console.log('\n=== Force Application ===');
    const physics = new Physics();
    const initialVelocity = { vx: dot.vx, vy: dot.vy };
    
    forceSystem.applyMagneticForces(dot, [magnet], 0.1, physics);
    
    if (dot.vx !== initialVelocity.vx || dot.vy !== initialVelocity.vy) {
        console.log('✓ Magnetic forces applied successfully');
    } else {
        console.error('✗ Magnetic forces not applied');
    }
    
    // Test 5: Apply treat attraction
    forceSystem.applyTreatAttraction(dot, [treat], 1, 0.1);
    
    // Check if dot is moving towards treat
    const dx = treat.x - dot.x;
    const dy = treat.y - dot.y;
    const dotVelocity = { vx: dot.vx - initialVelocity.vx, vy: dot.vy - initialVelocity.vy };
    
    if (Math.sign(dx) === Math.sign(dotVelocity.vx) && Math.sign(dy) === Math.sign(dotVelocity.vy)) {
        console.log('✓ Treat attraction applied successfully');
    } else {
        console.error('✗ Treat attraction not applied');
    }
    
    // Test 6: Apply danger repulsion
    forceSystem.applyDangerRepulsion(dot, [danger], 1, 1, 0.1);
    
    console.log('✓ Force system tests completed');
    
} catch (error) {
    console.error('✗ Error:', error);
}
