// Test script to verify dynamic cost scaling across upgrade tree

// Load the upgrades module
const upgrades = require('./upgrades.js');

// Create the upgrade tree
const tree = upgrades.createDefaultUpgradeTree();

console.log('=== DYNAMIC COST SCALING ANALYSIS ===\n');

// Analyze each node
const nodes = tree.getAllNodes();

for (const node of nodes) {
    console.log(`\n${node.name} (${node.id})`);
    console.log(`  Tier: ${node.parentId === null ? 'Root' : (node.parentId === 'dot' ? 'Tier 1' : 'Tier 2+')}`);
    console.log(`  Position: (${node.x}, ${node.y})`);
    
    for (const prop of node.properties) {
        console.log(`\n  ${prop.name} (${prop.id})`);
        console.log(`    Effect Type: ${prop.effectType}`);
        console.log(`    Value per Level: ${prop.valuePerLevel}`);
        console.log(`    Max Level: ${prop.maxLevel}`);
        console.log(`    Cost Scaling:`);
        
        // Show costs for first, middle, and last levels
        const levelsToShow = [1, Math.ceil(prop.maxLevel / 2), prop.maxLevel];
        for (const level of levelsToShow) {
            const cost = prop.getUpgradeCost();
            const value = prop.getValue();
            console.log(`      Level ${level}: Cost = ${cost}, Value = ${value.toFixed(2)}`);
        }
        
        // Calculate total cost to max
        let totalCost = 0;
        for (let i = 1; i <= prop.maxLevel; i++) {
            totalCost += prop.getUpgradeCost();
        }
        console.log(`    Total Cost to Max: ${totalCost}`);
        
        // Calculate impact score
        const impactScore = upgrades.calculateImpactScore(prop);
        console.log(`    Impact Score: ${impactScore.toFixed(2)}`);
    }
}

console.log('\n=== COST COMPARISON SUMMARY ===\n');

// Group upgrades by tier and compare costs
const tier1Nodes = nodes.filter(n => n.parentId === 'dot' || n.isRoot);
const tier2Nodes = nodes.filter(n => n.parentId && n.parentId !== 'dot');

console.log('Tier 1 Upgrades (Basic):');
for (const node of tier1Nodes) {
    for (const prop of node.properties) {
        let totalCost = 0;
        for (let i = 1; i <= prop.maxLevel; i++) {
            totalCost += prop.getUpgradeCost();
        }
        console.log(`  ${prop.name}: ${totalCost} total (avg ${Math.round(totalCost / prop.maxLevel)} per level)`);
    }
}

console.log('\nTier 2+ Upgrades (Advanced):');
for (const node of tier2Nodes) {
    for (const prop of node.properties) {
        let totalCost = 0;
        for (let i = 1; i <= prop.maxLevel; i++) {
            totalCost += prop.getUpgradeCost();
        }
        console.log(`  ${prop.name}: ${totalCost} total (avg ${Math.round(totalCost / prop.maxLevel)} per level)`);
    }
}

console.log('\n=== COST-TO-POWER RATIO ANALYSIS ===\n');

// Calculate cost-to-power ratio for each upgrade
const upgradeRatios = [];

for (const node of nodes) {
    for (const prop of node.properties) {
        let totalCost = 0;
        for (let i = 1; i <= prop.maxLevel; i++) {
            totalCost += prop.getUpgradeCost();
        }
        
        // Calculate total power gain
        const baseValue = prop.baseValue;
        const maxValue = baseValue + (prop.maxLevel * prop.valuePerLevel);
        const powerGain = maxValue - baseValue;
        
        const ratio = totalCost / (powerGain || 1);
        upgradeRatios.push({
            name: prop.name,
            nodeId: node.id,
            totalCost,
            powerGain,
            ratio
        });
    }
}

// Sort by ratio (lower is better value)
upgradeRatios.sort((a, b) => a.ratio - b.ratio);

console.log('Best Value Upgrades (Lowest Cost/Power Ratio):');
upgradeRatios.slice(0, 5).forEach((u, i) => {
    console.log(`  ${i + 1}. ${u.name}: ${u.ratio.toFixed(2)} cost/power (Cost: ${u.totalCost}, Power: ${u.powerGain.toFixed(2)})`);
});

console.log('\nMost Expensive Upgrades (Highest Cost/Power Ratio):');
upgradeRatios.slice(-5).reverse().forEach((u, i) => {
    console.log(`  ${i + 1}. ${u.name}: ${u.ratio.toFixed(2)} cost/power (Cost: ${u.totalCost}, Power: ${u.powerGain.toFixed(2)})`);
});

console.log('\n=== TEST COMPLETE ===');
