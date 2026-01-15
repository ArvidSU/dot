// ============================================
// UPGRADES - Skill Tree Data Structures
// ============================================

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
        return this.costPerLevel;
    }
    
    /**
     * Attempt to upgrade this property
     * @returns {number} Cost spent, or 0 if failed
     */
    upgrade() {
        if (this.level >= this.maxLevel) return 0;
        this.level++;
        return this.costPerLevel;
    }
    
    /**
     * Refund one level of this property
     * @returns {number} Treats refunded
     */
    refund() {
        if (this.level <= 0) return 0;
        this.level--;
        return this.costPerLevel;
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
            // Advanced repel upgrades
            dangerRepulsion: 0,  // Normal dangers repel the dot
            goldDiggerRepulsion: 0 // Gold Diggers repel the dot
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
                costPerLevel: 2,
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
                costPerLevel: 1,
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
                costPerLevel: 1,
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
                costPerLevel: 1,
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
                costPerLevel: 2,
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
                costPerLevel: 1,
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
                costPerLevel: 1,
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
                costPerLevel: 1,
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
                costPerLevel: 2,
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
                costPerLevel: 6,
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
                costPerLevel: 5,
                effectType: 'add'
            }
        ]
    }
    tree.addNode(attractAdvanced);
    
    // Advanced Repel node (unlocks at repel level 5)
    const repelAdvanced = {
        id: 'repelAdvanced',
        name: 'Pulse Engine',
        description: 'Advanced repulsion techniques for emergency escapes.',
        icon: '✦',
        color: '#ff3399',
        parentId: 'repel',
        requiredParentLevel: 5,
        x: 2,
        y: 2,
        properties: [
            {
                id: 'repelStrength',
                name: 'Engine Overdrive',
                description: 'Further boost to push force',
                icon: '⚡',
                baseValue: 1,
                valuePerLevel: 0.3,
                maxLevel: 5,
                costPerLevel: 2,
                effectType: 'multiply'
            },
            {
                id: 'repelMulti',
                name: 'Twin Pulses',
                description: 'Place two repel magnets at once',
                icon: '⊕',
                baseValue: 0,
                valuePerLevel: 1,
                maxLevel: 1,
                costPerLevel: 5,
                effectType: 'add'
            },
            {
                id: 'dangerRepulsion',
                name: 'Hazard Buffer',
                description: 'Normal dangers repel the dot',
                icon: '⟲',
                baseValue: 1,
                valuePerLevel: 0.2,
                maxLevel: 5,
                costPerLevel: 3,
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
                costPerLevel: 10,
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
                costPerLevel: 5,
                effectType: 'add'
            }
        ]
    }
    tree.addNode(annihalation);
    
    return tree;
}
