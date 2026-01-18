// ============================================
// UPGRADE DATA - Centralized Upgrade Definitions
// ============================================
// This file contains all upgrade node configurations in a single,
// data-driven format. Edit this file to add or modify upgrades.

/**
 * Creates a property config with computed cost function
 * @param {Object} config - Property configuration
 * @returns {Object} Complete property configuration
 */
function defineProperty(config) {
    return {
        id: config.id,
        name: config.name,
        description: config.description,
        icon: config.icon || '●',
        baseValue: config.baseValue ?? 1,
        valuePerLevel: config.valuePerLevel ?? 0.1,
        maxLevel: config.maxLevel ?? 5,
        effectType: config.effectType || 'multiply',
        // Cost scaling is computed automatically based on impact
        costTier: config.costTier || 'standard'  // 'cheap', 'standard', 'expensive', 'premium'
    };
}

/**
 * Cost tier configurations for dynamic pricing
 */
const CostTiers = {
    cheap: { base: 1, scaling: 1.05 },
    standard: { base: 2, scaling: 1.10 },
    expensive: { base: 3, scaling: 1.15 },
    premium: { base: 5, scaling: 1.20 }
};

/**
 * All upgrade node definitions
 * This is the single source of truth for the upgrade tree structure
 */
const UpgradeNodes = [
    // =====================================================
    // ROOT NODE - The Dot
    // =====================================================
    {
        id: 'dot',
        name: 'The Dot',
        description: 'Your fragile companion. The source of all magnetic power.',
        icon: '●',
        color: '#ffffff',
        isRoot: true,
        x: 0,
        y: 0,
        properties: [
            defineProperty({
                id: 'dotSpeed',
                name: 'Momentum',
                description: 'How quickly the dot responds to magnetic forces',
                icon: '→',
                baseValue: 1,
                valuePerLevel: 0.15,
                maxLevel: 5,
                effectType: 'multiply',
                costTier: 'standard'
            })
        ]
    },

    // =====================================================
    // TIER 1 - Direct children of root
    // =====================================================
    {
        id: 'attract',
        name: 'Attraction',
        description: 'Pull the dot toward safety and rewards.',
        icon: '◎',
        color: '#00d4ff',
        parentId: 'dot',
        requiredParentLevel: 0,
        x: -1,
        y: 1,
        properties: [
            defineProperty({
                id: 'attractStrength',
                name: 'Pull Force',
                description: 'Strength of the attractive force',
                icon: '⚡',
                baseValue: 1,
                valuePerLevel: 0.25,
                maxLevel: 10,
                effectType: 'multiply',
                costTier: 'standard'
            }),
            defineProperty({
                id: 'attractRadius',
                name: 'Field Range',
                description: 'How far the attraction reaches',
                icon: '◯',
                baseValue: 1,
                valuePerLevel: 0.15,
                maxLevel: 8,
                effectType: 'multiply',
                costTier: 'standard'
            })
        ]
    },
    {
        id: 'repel',
        name: 'Repulsion',
        description: 'Push the dot away from danger.',
        icon: '◉',
        color: '#ff0066',
        parentId: 'dot',
        requiredParentLevel: 0,
        x: 1,
        y: 1,
        properties: [
            defineProperty({
                id: 'repelStrength',
                name: 'Push Force',
                description: 'Strength of the repulsive force',
                icon: '⚡',
                baseValue: 1,
                valuePerLevel: 0.25,
                maxLevel: 10,
                effectType: 'multiply',
                costTier: 'standard'
            }),
            defineProperty({
                id: 'repelRadius',
                name: 'Field Range',
                description: 'How far the repulsion reaches',
                icon: '◯',
                baseValue: 1,
                valuePerLevel: 0.15,
                maxLevel: 8,
                effectType: 'multiply',
                costTier: 'standard'
            })
        ]
    },
    {
        id: 'annihalation',
        name: 'Annihilation',
        description: 'Annihilate on contact with danger. Saves your life at a cost.',
        icon: '☠',
        color: '#ffaa00',
        parentId: 'dot',
        requiredParentLevel: 3,
        x: 0,
        y: 1,
        properties: [
            defineProperty({
                id: 'annihalationCost',
                name: 'Treats Consumed',
                description: 'The cost of annihilation (decreases per level)',
                icon: '◈',
                baseValue: 10,
                valuePerLevel: -1,  // Negative means cost decreases
                maxLevel: 8,
                effectType: 'add',
                costTier: 'expensive'
            })
        ]
    },
    {
        id: 'investment',
        name: 'Investment',
        description: 'Invest in your future. Increase spawn rates and profits.',
        icon: '💰',
        color: '#ffd700',
        parentId: 'dot',
        requiredParentLevel: 1,
        x: 0.5,
        y: 1.5,
        properties: [
            defineProperty({
                id: 'treatSpawnChance',
                name: 'Opportunist',
                description: 'Increases the chance of a treat spawning',
                icon: '🎲',
                baseValue: 0,
                valuePerLevel: 0.2,
                maxLevel: 10,
                effectType: 'add',
                costTier: 'standard'
            }),
            defineProperty({
                id: 'coinGain',
                name: 'Profit',
                description: 'Increases the coin gain by 1 coin per level',
                icon: '💎',
                baseValue: 0,
                valuePerLevel: 1,
                maxLevel: 5,
                effectType: 'add',
                costTier: 'expensive'
            })
        ]
    },

    // =====================================================
    // TIER 2 - Advanced upgrades
    // =====================================================
    {
        id: 'attractAdvanced',
        name: 'Law of Attraction',
        description: 'What you desire, comes to you... or the other way around.',
        icon: '✧',
        color: '#00ffcc',
        parentId: 'attract',
        requiredParentLevel: 14,  // 75% of total attract property levels (10 + 8)
        x: -2,
        y: 2,
        properties: [
            defineProperty({
                id: 'treatAttraction',
                name: 'Attracted to Treats',
                description: 'Treats attract the dot',
                icon: '⚡',
                baseValue: 0,
                valuePerLevel: 0.5,
                maxLevel: 5,
                effectType: 'add',
                costTier: 'expensive'
            }),
            defineProperty({
                id: 'attractTreats',
                name: 'Attract Treats',
                description: 'The dot attracts treats toward it',
                icon: '⊕',
                baseValue: 0,
                valuePerLevel: 0.4,
                maxLevel: 5,
                effectType: 'add',
                costTier: 'expensive'
            }),
            defineProperty({
                id: 'lawOfAttractionRadius',
                name: 'Universal Pull',
                description: 'Increases the radius of attraction effects',
                icon: '◎',
                baseValue: 1,
                valuePerLevel: 0.1,
                maxLevel: 10,
                effectType: 'multiply',
                costTier: 'standard'
            })
        ]
    },
    {
        id: 'repelAdvanced',
        name: 'Repulsion Field',
        description: 'Advanced repulsion techniques for protection.',
        icon: '✦',
        color: '#ff3399',
        parentId: 'repel',
        requiredParentLevel: 5,
        x: 2,
        y: 2,
        properties: [
            defineProperty({
                id: 'dangerRepulsion',
                name: 'Repel Dangers',
                description: 'Normal dangers repel the dot',
                icon: '⟲',
                baseValue: 0,
                valuePerLevel: 0.2,
                maxLevel: 5,
                effectType: 'add',
                costTier: 'expensive'
            }),
            defineProperty({
                id: 'goldDiggerRepulsion',
                name: 'Golden Aegis',
                description: 'Gold Diggers repel the dot',
                icon: '✵',
                baseValue: 0,
                valuePerLevel: 0.5,
                maxLevel: 5,
                effectType: 'add',
                costTier: 'premium'
            })
        ]
    },
    {
        id: 'resurrection',
        name: 'Resurrection',
        description: 'Life finds a way. Create new dots and treats from the cycle of existence.',
        icon: '✿',
        color: '#ff66cc',
        parentId: 'annihalation',
        requiredParentLevel: 5,
        x: 0,
        y: 2,
        properties: [
            defineProperty({
                id: 'spawnDotOnTreat',
                name: 'Dot Rebirth',
                description: 'Chance to spawn a dot when collecting a treat',
                icon: '●',
                baseValue: 0,
                valuePerLevel: 0.09,
                maxLevel: 10,
                effectType: 'add',
                costTier: 'expensive'
            }),
            defineProperty({
                id: 'spawnTreatOnDeath',
                name: 'Treat Legacy',
                description: 'Chance to spawn a treat when a dot dies',
                icon: '★',
                baseValue: 0,
                valuePerLevel: 0.09,
                maxLevel: 10,
                effectType: 'add',
                costTier: 'expensive'
            })
        ]
    },

    // =====================================================
    // TIER 3 - Special upgrades
    // =====================================================
    {
        id: 'hunterKiller',
        name: 'Hunter Killer',
        description: 'Angry dots seek out and annihilate dangers with extreme prejudice.',
        icon: '⚔',
        color: '#ff4444',
        parentId: 'resurrection',
        requiredParentLevel: 5,
        x: 0,
        y: 3,
        properties: [
            defineProperty({
                id: 'spawnedDotAnnihilation',
                name: 'Sacrificial Strike',
                description: 'Chance for spawned dots to annihilate dangers on contact',
                icon: '☠',
                baseValue: 0,
                valuePerLevel: 0.1,
                maxLevel: 10,
                effectType: 'add',
                costTier: 'premium'
            }),
            defineProperty({
                id: 'kamikaze',
                name: 'Kamikaze',
                description: 'Chance to spawn an angry dot that actively seeks out dangers',
                icon: '💥',
                baseValue: 0,
                valuePerLevel: 0.05,
                maxLevel: 10,
                effectType: 'add',
                costTier: 'premium'
            })
        ]
    }
];

/**
 * Get the tier of a node based on its depth in the tree
 * @param {string} nodeId - The node ID
 * @returns {number} Tier (1, 2, or 3)
 */
function getNodeTier(nodeId) {
    const node = UpgradeNodes.find(n => n.id === nodeId);
    if (!node || node.isRoot) return 1;
    
    // Traverse up to count depth
    let depth = 1;
    let current = node;
    while (current.parentId) {
        depth++;
        current = UpgradeNodes.find(n => n.id === current.parentId);
        if (!current) break;
    }
    
    return Math.min(depth, 3);
}

/**
 * Calculate dynamic cost for a property at a given level
 * @param {Object} property - Property configuration
 * @param {number} level - Level to calculate cost for
 * @param {string} nodeId - Node ID for tier calculation
 * @returns {number} Cost in treats
 */
function calculateUpgradeCost(property, level, nodeId) {
    const tier = getNodeTier(nodeId);
    const costConfig = CostTiers[property.costTier] || CostTiers.standard;
    
    // Calculate impact score based on property power
    let impactScore = 1;
    impactScore += Math.abs(property.valuePerLevel) * 10;
    impactScore *= property.effectType === 'multiply' ? 1.5 : 1.0;
    impactScore *= Math.pow(property.maxLevel, 0.5);
    
    // Special case adjustments
    if (property.id.includes('spawn') || property.id.includes('annihilation')) {
        impactScore *= 1.8;
    }
    
    // Apply tier and cost tier multipliers
    const baseCost = Math.ceil(impactScore * costConfig.base * tier);
    
    // Level scaling
    const levelMultiplier = Math.pow(costConfig.scaling, level - 1);
    
    return Math.ceil(baseCost * levelMultiplier);
}

/**
 * Get a frozen copy of all upgrade nodes
 * @returns {Object[]} Array of node configurations
 */
function getUpgradeNodes() {
    return JSON.parse(JSON.stringify(UpgradeNodes));
}

/**
 * Get a specific node by ID
 * @param {string} id - Node ID
 * @returns {Object|null} Node configuration or null
 */
function getNodeById(id) {
    const node = UpgradeNodes.find(n => n.id === id);
    return node ? JSON.parse(JSON.stringify(node)) : null;
}

/**
 * Get all child nodes of a parent
 * @param {string} parentId - Parent node ID
 * @returns {Object[]} Array of child node configurations
 */
function getChildNodes(parentId) {
    return UpgradeNodes
        .filter(n => n.parentId === parentId)
        .map(n => JSON.parse(JSON.stringify(n)));
}

// Module exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CostTiers,
        UpgradeNodes,
        getNodeTier,
        calculateUpgradeCost,
        getUpgradeNodes,
        getNodeById,
        getChildNodes,
        defineProperty
    };
}
