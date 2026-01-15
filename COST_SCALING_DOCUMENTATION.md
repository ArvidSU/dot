# Dynamic Cost Scaling Implementation

## Overview

This document describes the implementation of dynamic cost scaling for the upgrade system. The new system ensures that upgrade costs reflect the actual utility and impact of each ability, creating better strategic depth and game balance.

## Problem Statement

The original upgrade system used fixed costs (`costPerLevel`) that didn't account for:
- The magnitude of an upgrade's impact on gameplay
- The strategic importance of certain abilities
- The compounding effects of multiplicative upgrades
- The tier/depth of upgrades in the skill tree

This led to imbalances where:
- Powerful abilities were underpriced (e.g., spawn chances at 3-4 cost)
- Basic abilities were overpriced relative to their impact
- Advanced upgrades didn't command a premium for their power

## Solution: Dynamic Cost Function

### Core Components

#### 1. Impact Score Calculation

The `calculateImpactScore()` function evaluates each upgrade's power:

```javascript
function calculateImpactScore(prop) {
    let score = 1;
    
    // Base impact from value per level
    score += prop.valuePerLevel * 10;
    
    // Effect type multiplier
    switch (prop.effectType) {
        case 'multiply':
            score *= 1.5;  // Multiplicative effects compound
            break;
        case 'add':
            score *= 1.0;  // Additive effects are linear
            break;
        case 'replace':
            score *= 2.0;  // Replace effects change behavior completely
            break;
    }
    
    // Max level multiplier (more levels = more total impact)
    score *= Math.pow(prop.maxLevel, 0.5);
    
    // Special case multipliers
    if (prop.id.includes('spawn') || prop.id.includes('annihilation')) {
        score *= 1.8;  // Spawn/annihilation are very powerful
    }
    
    if (prop.id.includes('Limit')) {
        score *= 1.3;  // Limit upgrades are strategically important
    }
    
    if (prop.id.includes('Radius') || prop.id.includes('Strength')) {
        score *= 1.2;  // Core mechanics
    }
    
    return score;
}
```

#### 2. Tier Multiplier

The `calculateTierMultiplier()` function applies a premium based on upgrade depth:

```javascript
function calculateTierMultiplier(nodeId) {
    // Tier 1: Basic upgrades (direct children of root)
    const tier1Nodes = ['attract', 'repel', 'dot', 'investment', 'annihalation'];
    if (tier1Nodes.includes(nodeId)) {
        return 1.0;
    }
    
    // Tier 2: Advanced upgrades (children of tier 1)
    const tier2Nodes = ['attractAdvanced', 'repelAdvanced', 'resurrection'];
    if (tier2Nodes.includes(nodeId)) {
        return 1.5;
    }
    
    // Tier 3: Special upgrades (deeper in tree)
    return 2.0;
}
```

#### 3. Dynamic Cost Function

The `createDynamicCostFunction()` generates a cost function that scales with level:

```javascript
function createDynamicCostFunction(prop, nodeId) {
    const impactScore = calculateImpactScore(prop);
    const tierMultiplier = calculateTierMultiplier(nodeId);
    
    // Base cost calculation
    const baseCost = Math.ceil(impactScore * tierMultiplier);
    
    // Return a function that calculates cost for a given level
    return (level) => {
        // Level scaling: costs increase with level
        let levelMultiplier;
        
        if (impactScore > 15) {
            // Very powerful upgrades: exponential scaling
            levelMultiplier = Math.pow(1.15, level - 1);
        } else if (impactScore > 10) {
            // Moderately powerful upgrades: quadratic scaling
            levelMultiplier = 1 + (level - 1) * 0.2;
        } else {
            // Basic upgrades: linear scaling
            levelMultiplier = 1 + (level - 1) * 0.1;
        }
        
        return Math.ceil(baseCost * levelMultiplier);
    };
}
```

## Cost Scaling Behavior

### Level Scaling Types

1. **Exponential Scaling** (Impact Score > 15)
   - Applied to very powerful upgrades
   - Formula: `cost = baseCost * 1.15^(level-1)`
   - Example: Spawn chances, annihilation abilities

2. **Quadratic Scaling** (Impact Score 10-15)
   - Applied to moderately powerful upgrades
   - Formula: `cost = baseCost * (1 + (level-1) * 0.2)`
   - Example: Advanced attract/repel abilities

3. **Linear Scaling** (Impact Score < 10)
   - Applied to basic upgrades
   - Formula: `cost = baseCost * (1 + (level-1) * 0.1)`
   - Example: Basic force, radius, duration upgrades

### Tier Multipliers

- **Tier 1 (Basic)**: 1.0x multiplier
  - Direct children of root node
  - Core gameplay mechanics
  
- **Tier 2 (Advanced)**: 1.5x multiplier
  - Children of tier 1 nodes
  - Specialized abilities
  
- **Tier 3 (Special)**: 2.0x multiplier
  - Deeper in the tree
  - Game-changing abilities

## Examples of Cost Changes

### Before vs After Comparison

| Upgrade | Old Cost (per level) | New Cost (Level 1) | New Cost (Max Level) | Total Cost (Old) | Total Cost (New) |
|---------|---------------------|-------------------|---------------------|------------------|------------------|
| Pull Force | 1 | 4 | 6 | 10 | 50 |
| Field Range | 1 | 3 | 5 | 8 | 32 |
| Attracted to Treats | 6 | 12 | 24 | 30 | 90 |
| Dot Rebirth | 3 | 8 | 30 | 30 | 190 |
| Golden Aegis | 10 | 18 | 36 | 50 | 135 |

### Key Improvements

1. **Spawn Abilities**: Now properly expensive (8-30 per level) due to their game-changing impact
2. **Basic Upgrades**: More affordable early on, encouraging experimentation
3. **Advanced Upgrades**: Command a premium for their power
4. **Strategic Depth**: Players must make meaningful choices about which upgrades to prioritize

## Testing

A test file (`test-cost-scaling.html`) has been created to visualize the cost scaling across all upgrades. It provides:

- Detailed cost breakdown for each upgrade
- Cost comparison between tiers
- Cost-to-power ratio analysis
- Identification of best value and most expensive upgrades

To run the test:
1. Open `test-cost-scaling.html` in a web browser
2. Review the generated cost analysis
3. Use the data to fine-tune balance if needed

## Implementation Details

### Modified Files

1. **upgrades.js**
   - Added `calculateImpactScore()` function
   - Added `calculateTierMultiplier()` function
   - Added `createDynamicCostFunction()` function
   - Updated all upgrade configurations to use `costFunction` instead of `costPerLevel`

### Backward Compatibility

The implementation maintains backward compatibility:
- The `NodeProperty` class still supports `costPerLevel` for any upgrades not yet converted
- The `getUpgradeCost()` method checks for `costFunction` first, then falls back to `costPerLevel`
- Save/load functionality remains unchanged

## Future Enhancements

Potential improvements to the cost scaling system:

1. **Dynamic Adjustment**: Adjust costs based on player behavior and upgrade popularity
2. **Synergy Bonuses**: Reduce costs for complementary upgrades
3. **Time-Based Scaling**: Adjust costs based on game progression
4. **Player Feedback**: Allow players to rate upgrade utility and adjust costs accordingly

## Conclusion

The dynamic cost scaling system creates a more balanced and strategic upgrade experience by:

- Ensuring costs reflect actual utility
- Applying appropriate premiums to powerful abilities
- Creating meaningful trade-offs for players
- Enhancing long-term game balance

The system is designed to be easily adjustable and extensible for future balance iterations.
