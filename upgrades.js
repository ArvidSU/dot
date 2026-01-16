// ============================================
// UPGRADES - Skill Tree Data Structures
// ============================================

/**
 * Calculate the impact score of an upgrade property
 * Higher scores indicate more powerful upgrades
 */
function calculateImpactScore(prop) {
    let score = 1;
    
    // Base impact from value per level
    score += prop.valuePerLevel * 10;
    
    // Effect type multiplier
    switch (prop.effectType) {
        case 'multiply':
            // Multiplicative effects compound, so they're more powerful
            score *= 1.5;
            break;
        case 'add':
            // Additive effects are linear
            score *= 1.0;
            break;
        case 'replace':
            // Replace effects completely change behavior
            score *= 2.0;
            break;
    }
    
    // Max level multiplier (more levels = more total impact)
    score *= Math.pow(prop.maxLevel, 0.5);
    
    // Special case: spawn chances and annihilation are very powerful
    if (prop.id.includes('spawn') || prop.id.includes('annihilation')) {
        score *= 1.8;
    }
    
    // Special case: limit upgrades are strategically important
    if (prop.id.includes('Limit')) {
        score *= 1.3;
    }
    
    // Special case: radius and strength are core mechanics
    if (prop.id.includes('Radius') || prop.id.includes('Strength')) {
        score *= 1.2;
    }
    
    return score;
}

/**
 * Calculate tier multiplier based on upgrade position in tree
 */
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

/**
 * Dynamic cost function that scales based on upgrade impact
 * @param {number} level - The level being purchased
 * @param {object} prop - The property configuration
 * @param {string} nodeId - The node ID for tier calculation
 * @returns {number} The cost for this level
 */
function createDynamicCostFunction(prop, nodeId) {
    const impactScore = calculateImpactScore(prop);
    const tierMultiplier = calculateTierMultiplier(nodeId);
    
    // Base cost calculation
    const baseCost = Math.ceil(impactScore * tierMultiplier);
    
    // Return a function that calculates cost for a given level
    return (level) => {
        // Level scaling: costs increase with level
        // Use exponential scaling for powerful upgrades, linear for basic ones
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

/**
 * Represents a single upgradeable property within a node
 */
class NodeProperty {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description;
        this.icon = config.icon || '●';
        this.level = config.startLevel || 0;
        this.maxLevel = config.maxLevel || 10;
        this.costPerLevel = config.costPerLevel || 1;
        this.costFunction = config.costFunction || null; // Custom cost calculation function
        
        // Effect configuration
        this.baseValue = config.baseValue || 1;
        this.valuePerLevel = config.valuePerLevel || 0.1;
        this.effectType = config.effectType || 'multiply'; // 'multiply', 'add', 'replace'
    }
    
    /**
     * Get the current effective value of this property
     */
    getValue() {
        switch (this.effectType) {
            case 'multiply':
                return this.baseValue * (1 + this.level * this.valuePerLevel);
            case 'add':
                return this.baseValue + this.level * this.valuePerLevel;
            case 'replace':
                return this.level > 0 ? this.valuePerLevel * this.level : this.baseValue;
            default:
                return this.baseValue;
        }
    }
    
    /**
     * Get cost to upgrade to next level
     */
    getUpgradeCost() {
        if (this.level >= this.maxLevel) return Infinity;
        if (this.costFunction) {
            return this.costFunction(this.level + 1);
        }
        return this.costPerLevel;
    }
    
    /**
     * Attempt to upgrade this property
     * @returns {number} Cost spent, or 0 if failed
     */
    upgrade() {
        if (this.level >= this.maxLevel) return 0;
        const cost = this.getUpgradeCost();
        this.level++;
        return cost;
    }
    
    /**
     * Refund one level of this property
     * @returns {number} Treats refunded
     */
    refund() {
        if (this.level <= 0) return 0;
        const cost = this.costFunction ? this.costFunction(this.level) : this.costPerLevel;
        this.level--;
        return cost;
    }
    
    /**
     * Serialize for save/load
     */
    serialize() {
        return { id: this.id, level: this.level };
    }
    
    /**
     * Restore from saved data
     */
    deserialize(data) {
        if (data && data.level !== undefined) {
            this.level = data.level;
        }
    }
}

/**
 * Represents a node in the upgrade tree
 */
class UpgradeNode {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description;
        this.icon = config.icon || '◆';
        this.color = config.color || '#ffffff';
        
        // Tree structure
        this.parentId = config.parentId || null;
        this.requiredParentLevel = config.requiredParentLevel || 0;
        
        // Position in tree (for rendering)
        this.x = config.x || 0;
        this.y = config.y || 0;
        
        // Properties that can be upgraded
        this.properties = [];
        if (config.properties) {
            for (const propConfig of config.properties) {
                this.properties.push(new NodeProperty(propConfig));
            }
        }
        
        // Visual state
        this.isRoot = config.isRoot || false;
    }
    
    /**
     * Get total level (sum of all property levels)
     */
    getLevel() {
        return this.properties.reduce((sum, prop) => sum + prop.level, 0);
    }
    
    /**
     * Check if this node is unlocked based on parent's level
     */
    isUnlocked(tree) {
        if (this.isRoot) return true;
        if (!this.parentId) return true;
        
        const parent = tree.getNode(this.parentId);
        if (!parent) return false;
        
        return parent.getLevel() >= this.requiredParentLevel;
    }
    
    /**
     * Check if this node has any points invested
     */
    hasInvestment() {
        return this.getLevel() > 0;
    }
    
    /**
     * Get a specific property by id
     */
    getProperty(propId) {
        return this.properties.find(p => p.id === propId);
    }
    
    /**
     * Get aggregate value for a property type across all properties
     */
    getPropertyValue(propId) {
        const prop = this.getProperty(propId);
        return prop ? prop.getValue() : 1;
    }
    
    /**
     * Serialize for save/load
     */
    serialize() {
        return {
            id: this.id,
            properties: this.properties.map(p => p.serialize())
        };
    }
    
    /**
     * Restore from saved data
     */
    deserialize(data) {
        if (data && data.properties) {
            for (const propData of data.properties) {
                const prop = this.getProperty(propData.id);
                if (prop) prop.deserialize(propData);
            }
        }
    }
}

/**
 * The complete upgrade tree
 */
class UpgradeTree {
    constructor() {
        this.nodes = new Map();
        this.currency = 0;
        this.totalEarned = 0;
        this.rootId = null;
    }
    
    /**
     * Add a node to the tree
     */
    addNode(config) {
        const node = new UpgradeNode(config);
        this.nodes.set(node.id, node);
        if (node.isRoot) {
            this.rootId = node.id;
        }
        return node;
    }
    
    /**
     * Get a node by id
     */
    getNode(id) {
        return this.nodes.get(id);
    }
    
    /**
     * Get all nodes as array
     */
    getAllNodes() {
        return Array.from(this.nodes.values());
    }
    
    /**
     * Get children of a node
     */
    getChildren(parentId) {
        return this.getAllNodes().filter(n => n.parentId === parentId);
    }
    
    /**
     * Add currency (from collecting treats)
     */
    addCurrency(amount) {
        this.currency += amount;
        this.totalEarned += amount;
    }
    
    /**
     * Spend currency on upgrading a property
     * @returns {boolean} Success
     */
    upgradeProperty(nodeId, propId) {
        const node = this.getNode(nodeId);
        if (!node || !node.isUnlocked(this)) return false;
        
        const prop = node.getProperty(propId);
        if (!prop) return false;
        
        const cost = prop.getUpgradeCost();
        if (cost > this.currency) return false;
        
        const spent = prop.upgrade();
        if (spent > 0) {
            this.currency -= spent;
            return true;
        }
        return false;
    }
    
    /**
     * Refund a property level
     * @returns {boolean} Success
     */
    refundProperty(nodeId, propId) {
        const node = this.getNode(nodeId);
        if (!node) return false;
        
        const prop = node.getProperty(propId);
        if (!prop) return false;
        
        // Check if refunding would lock children that have investments
        const children = this.getChildren(nodeId);
        for (const child of children) {
            if (child.hasInvestment() && node.getLevel() - 1 < child.requiredParentLevel) {
                return false; // Would orphan invested child
            }
        }
        
        const refunded = prop.refund();
        if (refunded > 0) {
            this.currency += refunded;
            return true;
        }
        return false;
    }
    
    /**
     * Get computed game stats from all upgrades
     */
    getStats() {
        const stats = {
            // Attract upgrades
            attractStrength: 1,
            attractRadius: 1,
            attractDuration: 1,
            attractLimit: 1,
            // Repel upgrades
            repelStrength: 1,
            repelRadius: 1,
            repelDuration: 1,
            repelLimit: 1,
            // Dot upgrades (future)
            dotSpeed: 1,
            dotSize: 1,
            annihalationCost: 0,
            // Advanced attract upgrades
            treatAttraction: 0,  // Treats attract the dot
            attractTreats: 0,    // Dot attracts treats
            lawOfAttractionRadius: 1, // Law of Attraction radius multiplier
            // Advanced repel upgrades
            dangerRepulsion: 0,  // Normal dangers repel the dot
            goldDiggerRepulsion: 0, // Gold Diggers repel the dot
            // Resurrection upgrades
            spawnDotOnTreat: 0,  // Chance to spawn a dot when collecting a treat
            spawnTreatOnDeath: 0, // Chance to spawn a treat when a dot dies
            spawnedDotAnnihilation: 0, // Chance for spawned dots to annihilate dangers
            kamikaze: 0,         // Chance to spawn angry dot that seeks and annihilates dangers
            // Investment upgrades
            treatSpawnChance: 0, // Increased chance of treat spawning
            coinGain: 0          // Increased coin gain
        };
        
        // Aggregate from all nodes
        for (const node of this.nodes.values()) {
            for (const prop of node.properties) {
                if (stats.hasOwnProperty(prop.id)) {
                    const value = prop.getValue();
                    if (prop.effectType === 'multiply') {
                        stats[prop.id] *= value;
                    } else {
                        stats[prop.id] += value - 1;
                    }
                }
            }
        }
        
        return stats;
    }
    
    /**
     * Serialize entire tree for save/load
     */
    serialize() {
        return {
            currency: this.currency,
            totalEarned: this.totalEarned,
            nodes: this.getAllNodes().map(n => n.serialize())
        };
    }
    
    /**
     * Restore from saved data
     */
    deserialize(data) {
        if (!data) return;
        
        this.currency = data.currency || 0;
        this.totalEarned = data.totalEarned || 0;
        
        if (data.nodes) {
            for (const nodeData of data.nodes) {
                const node = this.getNode(nodeData.id);
                if (node) node.deserialize(nodeData);
            }
        }
    }
    
    /**
     * Save to localStorage
     */
    save() {
        try {
            localStorage.setItem('magnetGame_upgrades', JSON.stringify(this.serialize()));
        } catch (e) {
            console.warn('Could not save upgrades:', e);
        }
    }
    
    /**
     * Load from localStorage
     */
    load() {
        try {
            const data = localStorage.getItem('magnetGame_upgrades');
            if (data) {
                this.deserialize(JSON.parse(data));
            }
        } catch (e) {
            console.warn('Could not load upgrades:', e);
        }
    }
}

/**
 * Create and initialize the default upgrade tree
 */
function createDefaultUpgradeTree() {
    const tree = new UpgradeTree();
    
    // Root node - The Dot
    const dot = {
        id: 'dot',
        name: 'The Dot',
        description: 'Your fragile companion. The source of all magnetic power.',
        icon: '●',
        color: '#ffffff',
        isRoot: true,
        x: 0,
        y: 0,
        properties: [
            {
                id: 'dotSpeed',
                name: 'Momentum',
                description: 'How quickly the dot responds to magnetic forces',
                icon: '→',
                baseValue: 1,
                valuePerLevel: 0.15,
                maxLevel: 5,
                costFunction: createDynamicCostFunction({ id: 'dotSpeed', valuePerLevel: 0.15, maxLevel: 5, effectType: 'multiply' }, 'dot'),
                effectType: 'multiply'
            }
        ]
    }
    tree.addNode(dot);
    
    // Attract branch
    const attract = {
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
            {
                id: 'attractStrength',
                name: 'Pull Force',
                description: 'Strength of the attractive force',
                icon: '⚡',
                baseValue: 1,
                valuePerLevel: 0.25,
                maxLevel: 10,
                costFunction: createDynamicCostFunction({ id: 'attractStrength', valuePerLevel: 0.25, maxLevel: 10, effectType: 'multiply' }, 'attract'),
                effectType: 'multiply'
            },
            {
                id: 'attractRadius',
                name: 'Field Range',
                description: 'How far the attraction reaches',
                icon: '◯',
                baseValue: 1,
                valuePerLevel: 0.15,
                maxLevel: 8,
                costFunction: createDynamicCostFunction({ id: 'attractRadius', valuePerLevel: 0.15, maxLevel: 8, effectType: 'multiply' }, 'attract'),
                effectType: 'multiply'
            },
            {
                id: 'attractDuration',
                name: 'Persistence',
                description: 'How long attract magnets last',
                icon: '◷',
                baseValue: 1,
                valuePerLevel: 0.2,
                maxLevel: 8,
                costFunction: createDynamicCostFunction({ id: 'attractDuration', valuePerLevel: 0.2, maxLevel: 8, effectType: 'multiply' }, 'attract'),
                effectType: 'multiply'
            },
            {
                id: 'attractLimit',
                name: 'Limit',
                description: 'Maximum number of attract magnets you can place',
                icon: '#',
                baseValue: 1,
                valuePerLevel: 1,
                maxLevel: 5,
                costFunction: createDynamicCostFunction({ id: 'attractLimit', valuePerLevel: 1, maxLevel: 5, effectType: 'add' }, 'attract'),
                effectType: 'add'
            }
        ]
    }
    tree.addNode(attract);
    
    // Repel branch
    const repel = {
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
            {
                id: 'repelStrength',
                name: 'Push Force',
                description: 'Strength of the repulsive force',
                icon: '⚡',
                baseValue: 1,
                valuePerLevel: 0.25,
                maxLevel: 10,
                costFunction: createDynamicCostFunction({ id: 'repelStrength', valuePerLevel: 0.25, maxLevel: 10, effectType: 'multiply' }, 'repel'),
                effectType: 'multiply'
            },
            {
                id: 'repelRadius',
                name: 'Field Range',
                description: 'How far the repulsion reaches',
                icon: '◯',
                baseValue: 1,
                valuePerLevel: 0.15,
                maxLevel: 8,
                costFunction: createDynamicCostFunction({ id: 'repelRadius', valuePerLevel: 0.15, maxLevel: 8, effectType: 'multiply' }, 'repel'),
                effectType: 'multiply'
            },
            {
                id: 'repelDuration',
                name: 'Persistence',
                description: 'How long repel magnets last',
                icon: '◷',
                baseValue: 1,
                valuePerLevel: 0.2,
                maxLevel: 8,
                costFunction: createDynamicCostFunction({ id: 'repelDuration', valuePerLevel: 0.2, maxLevel: 8, effectType: 'multiply' }, 'repel'),
                effectType: 'multiply'
            },
            {
                id: 'repelLimit',
                name: 'Limit',
                description: 'Maximum number of repel magnets you can place',
                icon: '#',
                baseValue: 1,
                valuePerLevel: 1,
                maxLevel: 5,
                costFunction: createDynamicCostFunction({ id: 'repelLimit', valuePerLevel: 1, maxLevel: 5, effectType: 'add' }, 'repel'),
                effectType: 'add'
            }
        ]
    }
    tree.addNode(repel);
    
    // Advanced Attract node (unlocks at attract level 5)
    const attractAdvanced = {
        id: 'attractAdvanced',
        name: 'Law of Attraction',
        description: 'What you desire, comes to you... or the other way around.',
        icon: '✧',
        color: '#00ffcc',
        parentId: 'attract',
        requiredParentLevel: Math.floor(attract.properties.map(p => p.maxLevel).reduce((a, b) => a + b, 0)*0.75),
        x: -2,
        y: 2,
        properties: [
            {
                id: 'treatAttraction',
                name: 'Attracted to Treats',
                description: 'Treats attract the dot',
                icon: '⚡',
                baseValue: 1,
                valuePerLevel: 0.5,
                maxLevel: 5,
                costFunction: createDynamicCostFunction({ id: 'treatAttraction', valuePerLevel: 0.5, maxLevel: 5, effectType: 'add' }, 'attractAdvanced'),
                effectType: 'add'
            },
            {
                id: 'attractTreats',
                name: 'Attract Treats',
                description: 'The dot attracts treats',
                icon: '⊕',
                baseValue: 1,
                valuePerLevel: 0.4,
                maxLevel: 5,
                costFunction: createDynamicCostFunction({ id: 'attractTreats', valuePerLevel: 0.4, maxLevel: 5, effectType: 'add' }, 'attractAdvanced'),
                effectType: 'add'
            },
            {
                id: 'lawOfAttractionRadius',
                name: 'Universal Pull',
                description: 'Increases the radius of attraction by 10% per level',
                icon: '◎',
                baseValue: 1,
                valuePerLevel: 0.1,
                maxLevel: 10,
                costFunction: createDynamicCostFunction({ id: 'lawOfAttractionRadius', valuePerLevel: 0.1, maxLevel: 10, effectType: 'multiply' }, 'attractAdvanced'),
                effectType: 'multiply'
            }
        ]
    }
    tree.addNode(attractAdvanced);
    
    // Advanced Repel node (unlocks at repel level 5)
    const repelAdvanced = {
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
            {
                id: 'dangerRepulsion',
                name: 'Repel Dangers',
                description: 'Normal dangers repel the dot',
                icon: '⟲',
                baseValue: 1,
                valuePerLevel: 0.2,
                maxLevel: 5,
                costFunction: createDynamicCostFunction({ id: 'dangerRepulsion', valuePerLevel: 0.2, maxLevel: 5, effectType: 'add' }, 'repelAdvanced'),
                effectType: 'add'
            },
            {
                id: 'goldDiggerRepulsion',
                name: 'Golden Aegis',
                description: 'Gold Diggers repel the dot',
                icon: '✵',
                baseValue: 1,
                valuePerLevel: 0.5,
                maxLevel: 5,
                costFunction: createDynamicCostFunction({ id: 'goldDiggerRepulsion', valuePerLevel: 0.5, maxLevel: 5, effectType: 'add' }, 'repelAdvanced'),
                effectType: 'add'
            }
        ]
    }
    tree.addNode(repelAdvanced);
    
    // Annihalation node (unlocks at dot level 5)
    const annihalation = {
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
            {
                id: 'annihalationCost',
                name: 'Treats consumed',
                description: 'The cost of annihalation',
                icon: '◈',
                baseValue: 10,
                valuePerLevel: -1,
                maxLevel: 8,
                costFunction: createDynamicCostFunction({ id: 'annihalationCost', valuePerLevel: 1, maxLevel: 8, effectType: 'add' }, 'annihalation'),
                effectType: 'add'
            }
        ]
    }
    tree.addNode(annihalation);
    
    // Investment node (unlocks at dot level 1)
    const investment = {
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
            {
                id: 'treatSpawnChance',
                name: 'Opportunist',
                description: 'Increases the chance of a treat spawning by 5% per level',
                icon: '🎲',
                baseValue: 0,
                valuePerLevel: 0.2,
                maxLevel: 10,
                costFunction: createDynamicCostFunction({ id: 'treatSpawnChance', valuePerLevel: 0.2, maxLevel: 10, effectType: 'add' }, 'investment'),
                effectType: 'add'
            },
            {
                id: 'coinGain',
                name: 'Profit',
                description: 'Increases the coin gain by 1 coin per level',
                icon: '💎',
                baseValue: 0,
                valuePerLevel: 1,
                maxLevel: 5,
                costFunction: createDynamicCostFunction({ id: 'coinGain', valuePerLevel: 1, maxLevel: 5, effectType: 'add' }, 'investment'),
                effectType: 'add'
            }
        ]
    }
    tree.addNode(investment);
    
    // Resurrection node (unlocks at annihalation level 5)
    const resurrection = {
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
            {
                id: 'spawnDotOnTreat',
                name: 'Dot Rebirth',
                description: 'Chance to spawn a dot when collecting a treat',
                icon: '●',
                baseValue: 0,
                valuePerLevel: 0.1,
                maxLevel: 10,
                costFunction: createDynamicCostFunction({ id: 'spawnDotOnTreat', valuePerLevel: 0.1, maxLevel: 10, effectType: 'add' }, 'resurrection'),
                effectType: 'add'
            },
            {
                id: 'spawnTreatOnDeath',
                name: 'Treat Legacy',
                description: 'Chance to spawn a treat when a dot dies',
                icon: '★',
                baseValue: 0,
                valuePerLevel: 0.1,
                maxLevel: 10,
                costFunction: createDynamicCostFunction({ id: 'spawnTreatOnDeath', valuePerLevel: 0.1, maxLevel: 10, effectType: 'add' }, 'resurrection'),
                effectType: 'add'
            }
        ]
    }
    tree.addNode(resurrection);
    
    // Hunter Killer node (unlocks at resurrection level 5)
    const hunterKiller = {
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
            {
                id: 'spawnedDotAnnihilation',
                name: 'Sacrificial Strike',
                description: 'Chance for spawned dots to annihilate dangers',
                icon: '☠',
                baseValue: 0,
                valuePerLevel: 0.1,
                maxLevel: 10,
                costFunction: createDynamicCostFunction({ id: 'spawnedDotAnnihilation', valuePerLevel: 0.1, maxLevel: 10, effectType: 'add' }, 'hunterKiller'),
                effectType: 'add'
            },
            {
                id: 'kamikaze',
                name: 'Kamikaze',
                description: 'Chance to spawn an angry dot that actively seeks out dangers to annihilate with 100% effectiveness',
                icon: '💥',
                baseValue: 0,
                valuePerLevel: 0.05,
                maxLevel: 10,
                costFunction: createDynamicCostFunction({ id: 'kamikaze', valuePerLevel: 0.05, maxLevel: 10, effectType: 'add' }, 'hunterKiller'),
                effectType: 'add'
            }
        ]
    }
    tree.addNode(hunterKiller);
    
    return tree;
}
