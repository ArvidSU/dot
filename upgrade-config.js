// ============================================
// UPGRADE CONFIG - Upgrade Tree Configuration
// ============================================

/**
 * Creates a property configuration with dynamic cost calculation
 */
function createPropertyConfig(id, name, description, icon, baseValue, valuePerLevel, maxLevel, effectType, nodeId) {
    return {
        id,
        name,
        description,
        icon,
        baseValue,
        valuePerLevel,
        maxLevel,
        costFunction: createDynamicCostFunction({ id, valuePerLevel, maxLevel, effectType }, nodeId),
        effectType: effectType || 'multiply'
    };
}

/**
 * Default upgrade tree configuration
 */
const UPGRADE_TREE_CONFIG = {
    nodes: [
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
                createPropertyConfig('dotSpeed', 'Momentum', 'How quickly the dot responds to magnetic forces', '→', 1, 0.15, 5, 'multiply', 'dot')
            ]
        },
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
                createPropertyConfig('attractStrength', 'Pull Force', 'Strength of the attractive force', '⚡', 1, 0.25, 10, 'multiply', 'attract'),
                createPropertyConfig('attractRadius', 'Field Range', 'How far the attraction reaches', '◯', 1, 0.15, 8, 'multiply', 'attract')
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
                createPropertyConfig('repelStrength', 'Push Force', 'Strength of the repulsive force', '⚡', 1, 0.25, 10, 'multiply', 'repel'),
                createPropertyConfig('repelRadius', 'Field Range', 'How far the repulsion reaches', '◯', 1, 0.15, 8, 'multiply', 'repel')
            ]
        },
        {
            id: 'attractAdvanced',
            name: 'Law of Attraction',
            description: 'What you desire, comes to you... or the other way around.',
            icon: '✧',
            color: '#00ffcc',
            parentId: 'attract',
            requiredParentLevel: Math.floor((10 + 8) * 0.75), // 75% of total attract property levels (strength + radius)
            x: -2,
            y: 2,
            properties: [
                createPropertyConfig('treatAttraction', 'Attracted to Treats', 'Treats attract the dot', '⚡', 1, 0.5, 5, 'add', 'attractAdvanced'),
                createPropertyConfig('attractTreats', 'Attract Treats', 'The dot attracts treats', '⊕', 1, 0.4, 5, 'add', 'attractAdvanced'),
                createPropertyConfig('lawOfAttractionRadius', 'Universal Pull', 'Increases the radius of attraction by 10% per level', '◎', 1, 0.1, 10, 'multiply', 'attractAdvanced')
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
                createPropertyConfig('dangerRepulsion', 'Repel Dangers', 'Normal dangers repel the dot', '⟲', 1, 0.2, 5, 'add', 'repelAdvanced'),
                createPropertyConfig('goldDiggerRepulsion', 'Golden Aegis', 'Gold Diggers repel the dot', '✵', 1, 0.5, 5, 'add', 'repelAdvanced')
            ]
        },
        {
            id: 'annihalation',
            name: 'Annihalation',
            description: 'Annihalate on contact with threats. Saves your life at a cost.',
            icon: '☠',
            color: '#ffaa00',
            parentId: 'dot',
            requiredParentLevel: 5,
            x: 0,
            y: 1,
            properties: [
                createPropertyConfig('annihalationCost', 'Treats consumed', 'The cost of annihalation', '◈', 10, -1, 8, 'add', 'annihalation')
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
            x: 0,
            y: 1.5,
            properties: [
                createPropertyConfig('treatSpawnChance', 'Opportunist', 'Increases the chance of a treat spawning by 5% per level', '🎲', 0, 0.2, 10, 'add', 'investment'),
                createPropertyConfig('coinGain', 'Profit', 'Increases the coin gain by 1 coin per level', '💎', 0, 1, 5, 'add', 'investment')
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
                createPropertyConfig('spawnDotOnTreat', 'Dot Rebirth', 'Chance to spawn a dot when collecting a treat', '●', 0, 0.1, 10, 'add', 'resurrection'),
                createPropertyConfig('spawnTreatOnDeath', 'Treat Legacy', 'Chance to spawn a treat when a dot dies', '★', 0, 0.1, 10, 'add', 'resurrection'),
                createPropertyConfig('spawnCollectorOnTreat', 'Green Helper', 'Chance to spawn a green collector dot that seeks out and collects treats', '◉', 0, 0.06, 10, 'add', 'resurrection')
            ]
        },
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
                createPropertyConfig('spawnedDotAnnihilation', 'Sacrificial Strike', 'Chance for spawned dots to annihilate dangers', '☠', 0, 0.1, 10, 'add', 'hunterKiller'),
                createPropertyConfig('kamikaze', 'Kamikaze', 'Chance to spawn an angry dot that actively seeks out dangers to annihilate with 100% effectiveness', '💥', 0, 0.05, 10, 'add', 'hunterKiller')
            ]
        }
    ]
};

/**
 * Creates the default upgrade tree from configuration
 */
function createDefaultUpgradeTree() {
    const tree = new UpgradeTree();
    
    for (const nodeConfig of UPGRADE_TREE_CONFIG.nodes) {
        tree.addNode(nodeConfig);
    }
    
    return tree;
}
