// ============================================
// UPGRADE SCHEMA - Type Definitions and Validation
// ============================================
// This file defines the data schema for all upgrades,
// providing type safety, validation, and documentation.

/**
 * Effect types determine how upgrade values are applied to base stats
 * @enum {string}
 */
const EffectType = {
    /** Multiply base value: result = base * (1 + level * valuePerLevel) */
    MULTIPLY: 'multiply',
    /** Add to base value: result = base + level * valuePerLevel */
    ADD: 'add',
    /** Replace base value: result = level > 0 ? valuePerLevel * level : base */
    REPLACE: 'replace'
};

/**
 * Stat categories for organizing upgrade effects
 * @enum {string}
 */
const StatCategory = {
    FORCE: 'force',           // Magnetic force-related stats
    SPAWNING: 'spawning',     // Entity spawning chances
    ECONOMY: 'economy',       // Currency and rewards
    SURVIVAL: 'survival',     // Defensive/survival mechanics
    OFFENSIVE: 'offensive'    // Attack/damage mechanics
};

/**
 * All valid stat IDs that upgrades can modify
 * Maps stat ID to its metadata
 * @type {Object}
 */
const StatDefinitions = {
    // Force stats
    attractStrength: {
        category: StatCategory.FORCE,
        description: 'Strength of attractive magnetic force',
        baseValue: 1,
        defaultEffectType: EffectType.MULTIPLY
    },
    attractRadius: {
        category: StatCategory.FORCE,
        description: 'Radius of attractive magnetic field',
        baseValue: 1,
        defaultEffectType: EffectType.MULTIPLY
    },
    repelStrength: {
        category: StatCategory.FORCE,
        description: 'Strength of repulsive magnetic force',
        baseValue: 1,
        defaultEffectType: EffectType.MULTIPLY
    },
    repelRadius: {
        category: StatCategory.FORCE,
        description: 'Radius of repulsive magnetic field',
        baseValue: 1,
        defaultEffectType: EffectType.MULTIPLY
    },
    dotSpeed: {
        category: StatCategory.FORCE,
        description: 'How quickly the dot responds to forces',
        baseValue: 1,
        defaultEffectType: EffectType.MULTIPLY
    },
    // Advanced force stats
    treatAttraction: {
        category: StatCategory.FORCE,
        description: 'Attraction strength from treats to dot',
        baseValue: 0,
        defaultEffectType: EffectType.ADD
    },
    attractTreats: {
        category: StatCategory.FORCE,
        description: 'Attraction strength from dot to treats',
        baseValue: 0,
        defaultEffectType: EffectType.ADD
    },
    lawOfAttractionRadius: {
        category: StatCategory.FORCE,
        description: 'Radius multiplier for treat attraction',
        baseValue: 1,
        defaultEffectType: EffectType.MULTIPLY
    },
    dangerRepulsion: {
        category: StatCategory.FORCE,
        description: 'Repulsion strength from normal dangers',
        baseValue: 0,
        defaultEffectType: EffectType.ADD
    },
    goldDiggerRepulsion: {
        category: StatCategory.FORCE,
        description: 'Repulsion strength from Gold Diggers',
        baseValue: 0,
        defaultEffectType: EffectType.ADD
    },
    // Spawning stats
    spawnDotOnTreat: {
        category: StatCategory.SPAWNING,
        description: 'Chance to spawn a dot when collecting a treat',
        baseValue: 0,
        defaultEffectType: EffectType.ADD
    },
    spawnTreatOnDeath: {
        category: StatCategory.SPAWNING,
        description: 'Chance to spawn a treat when a dot dies',
        baseValue: 0,
        defaultEffectType: EffectType.ADD
    },
    spawnCollectorOnTreat: {
        category: StatCategory.SPAWNING,
        description: 'Chance to spawn a green collector dot when collecting a treat',
        baseValue: 0,
        defaultEffectType: EffectType.ADD
    },
    treatSpawnChance: {
        category: StatCategory.SPAWNING,
        description: 'Increased chance of treats spawning',
        baseValue: 0,
        defaultEffectType: EffectType.ADD
    },
    // Economy stats
    coinGain: {
        category: StatCategory.ECONOMY,
        description: 'Additional coins per treat collected',
        baseValue: 0,
        defaultEffectType: EffectType.ADD
    },
    // Survival stats
    annihalationCost: {
        category: StatCategory.SURVIVAL,
        description: 'Treats consumed when annihilating a danger',
        baseValue: 10,
        defaultEffectType: EffectType.ADD
    },
    // Offensive stats
    spawnedDotAnnihilation: {
        category: StatCategory.OFFENSIVE,
        description: 'Chance for spawned dots to annihilate on contact',
        baseValue: 0,
        defaultEffectType: EffectType.ADD
    },
    kamikaze: {
        category: StatCategory.OFFENSIVE,
        description: 'Chance to spawn angry dot that seeks dangers',
        baseValue: 0,
        defaultEffectType: EffectType.ADD
    }
};

/**
 * Tier multipliers for cost scaling
 * @type {Object}
 */
const TierMultipliers = {
    1: 1.0,   // Root and immediate children
    2: 1.5,   // Second level nodes
    3: 2.0,   // Third level and beyond
};

/**
 * Schema for a single upgradeable property within a node
 * @typedef {Object} PropertySchema
 * @property {string} id - Unique identifier matching a StatDefinition key
 * @property {string} name - Display name for UI
 * @property {string} description - Detailed description for tooltips
 * @property {string} icon - Icon character or emoji
 * @property {number} baseValue - Starting value before any upgrades
 * @property {number} valuePerLevel - Value change per upgrade level
 * @property {number} maxLevel - Maximum upgrade level
 * @property {EffectType} effectType - How value is applied to base stat
 */

/**
 * Schema for an upgrade node in the tree
 * @typedef {Object} NodeSchema
 * @property {string} id - Unique node identifier
 * @property {string} name - Display name
 * @property {string} description - Node description for UI
 * @property {string} icon - Icon character or emoji
 * @property {string} color - Hex color for UI theming
 * @property {string|null} parentId - Parent node ID (null for root)
 * @property {number} requiredParentLevel - Levels needed in parent to unlock
 * @property {boolean} isRoot - Whether this is the root node
 * @property {number} x - X position hint for layout
 * @property {number} y - Y position hint for layout
 * @property {PropertySchema[]} properties - Upgradeable properties
 */

/**
 * Validates a property configuration
 * @param {PropertySchema} prop - Property to validate
 * @param {string} nodeId - Parent node ID for error messages
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateProperty(prop, nodeId) {
    const errors = [];
    
    if (!prop.id) {
        errors.push(`Property in node '${nodeId}' is missing 'id'`);
    } else if (!StatDefinitions[prop.id]) {
        errors.push(`Property '${prop.id}' in node '${nodeId}' is not a valid stat ID`);
    }
    
    if (!prop.name) {
        errors.push(`Property '${prop.id}' in node '${nodeId}' is missing 'name'`);
    }
    
    if (typeof prop.maxLevel !== 'number' || prop.maxLevel < 1) {
        errors.push(`Property '${prop.id}' in node '${nodeId}' has invalid maxLevel`);
    }
    
    if (typeof prop.valuePerLevel !== 'number') {
        errors.push(`Property '${prop.id}' in node '${nodeId}' is missing 'valuePerLevel'`);
    }
    
    if (prop.effectType && !Object.values(EffectType).includes(prop.effectType)) {
        errors.push(`Property '${prop.id}' in node '${nodeId}' has invalid effectType: ${prop.effectType}`);
    }
    
    return { valid: errors.length === 0, errors };
}

/**
 * Validates a node configuration
 * @param {NodeSchema} node - Node to validate
 * @param {Map<string, NodeSchema>} existingNodes - Already validated nodes
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateNode(node, existingNodes = new Map()) {
    const errors = [];
    
    if (!node.id) {
        errors.push('Node is missing required field: id');
        return { valid: false, errors };
    }
    
    if (existingNodes.has(node.id)) {
        errors.push(`Duplicate node ID: ${node.id}`);
    }
    
    if (!node.name) {
        errors.push(`Node '${node.id}' is missing 'name'`);
    }
    
    if (!node.icon) {
        errors.push(`Node '${node.id}' is missing 'icon'`);
    }
    
    // Validate parent reference
    if (!node.isRoot && !node.parentId) {
        errors.push(`Non-root node '${node.id}' must have a parentId`);
    }
    
    if (node.parentId && !existingNodes.has(node.parentId)) {
        errors.push(`Node '${node.id}' references unknown parent: ${node.parentId}`);
    }
    
    // Validate properties
    if (!Array.isArray(node.properties) || node.properties.length === 0) {
        errors.push(`Node '${node.id}' must have at least one property`);
    } else {
        const propIds = new Set();
        for (const prop of node.properties) {
            if (propIds.has(prop.id)) {
                errors.push(`Duplicate property ID '${prop.id}' in node '${node.id}'`);
            }
            propIds.add(prop.id);
            
            const propValidation = validateProperty(prop, node.id);
            errors.push(...propValidation.errors);
        }
    }
    
    return { valid: errors.length === 0, errors };
}

/**
 * Validates an entire upgrade tree configuration
 * @param {NodeSchema[]} nodes - Array of node configurations
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
function validateUpgradeTree(nodes) {
    const errors = [];
    const warnings = [];
    const nodeMap = new Map();
    
    // Find root node first
    const rootNodes = nodes.filter(n => n.isRoot);
    if (rootNodes.length === 0) {
        errors.push('No root node defined (must have isRoot: true)');
    } else if (rootNodes.length > 1) {
        errors.push('Multiple root nodes defined');
    }
    
    // Validate nodes in order, processing parents first
    const validated = new Set();
    const queue = [...nodes.filter(n => n.isRoot)];
    
    while (queue.length > 0) {
        const node = queue.shift();
        
        const validation = validateNode(node, nodeMap);
        errors.push(...validation.errors);
        
        if (validation.valid || node.isRoot) {
            nodeMap.set(node.id, node);
            validated.add(node.id);
            
            // Add children to queue
            const children = nodes.filter(n => n.parentId === node.id);
            queue.push(...children);
        }
    }
    
    // Check for orphaned nodes
    const orphaned = nodes.filter(n => !validated.has(n.id));
    for (const node of orphaned) {
        errors.push(`Node '${node.id}' is orphaned (parent chain doesn't connect to root)`);
    }
    
    // Warnings for potential issues
    for (const node of nodes) {
        if (node.requiredParentLevel < 0) {
            warnings.push(`Node '${node.id}' has negative requiredParentLevel`);
        }
    }
    
    return { 
        valid: errors.length === 0, 
        errors, 
        warnings 
    };
}

/**
 * Gets the default stats object with all base values
 * @returns {Object} Stats object with base values
 */
function getDefaultStats() {
    const stats = {};
    for (const [id, def] of Object.entries(StatDefinitions)) {
        stats[id] = def.baseValue;
    }
    return stats;
}

/**
 * Gets stat metadata by ID
 * @param {string} statId - The stat ID
 * @returns {Object|null} Stat definition or null if not found
 */
function getStatDefinition(statId) {
    return StatDefinitions[statId] || null;
}

/**
 * Gets all stat IDs in a category
 * @param {StatCategory} category - The category to filter by
 * @returns {string[]} Array of stat IDs
 */
function getStatsByCategory(category) {
    return Object.entries(StatDefinitions)
        .filter(([_, def]) => def.category === category)
        .map(([id, _]) => id);
}

// Module exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EffectType,
        StatCategory,
        StatDefinitions,
        TierMultipliers,
        validateProperty,
        validateNode,
        validateUpgradeTree,
        getDefaultStats,
        getStatDefinition,
        getStatsByCategory
    };
}
