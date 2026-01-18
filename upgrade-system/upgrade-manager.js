// ============================================
// UPGRADE MANAGER - Unified Upgrade System Controller
// ============================================
// Single point of control for all upgrade operations including:
// - State management (currency, levels)
// - Upgrade acquisition and refunds
// - Stats computation and caching
// - Save/load persistence
// - Event notifications for UI updates

/**
 * Manages a single upgradeable property
 */
class PropertyState {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description;
        this.icon = config.icon || '●';
        this.baseValue = config.baseValue ?? 1;
        this.valuePerLevel = config.valuePerLevel ?? 0.1;
        this.maxLevel = config.maxLevel ?? 5;
        this.effectType = config.effectType || 'multiply';
        this.costTier = config.costTier || 'standard';
        
        // Current state
        this.level = 0;
    }
    
    /**
     * Calculate current effective value based on level
     * @returns {number} Effective value
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
     * Get cost for next level
     * @param {Function} costCalculator - Function to calculate cost
     * @param {string} nodeId - Parent node ID
     * @returns {number} Cost or Infinity if maxed
     */
    getUpgradeCost(costCalculator, nodeId) {
        if (this.level >= this.maxLevel) return Infinity;
        return costCalculator(this, this.level + 1, nodeId);
    }
    
    /**
     * Get cost for current level (for refunds)
     * @param {Function} costCalculator - Function to calculate cost
     * @param {string} nodeId - Parent node ID
     * @returns {number} Cost or 0 if at level 0
     */
    getRefundAmount(costCalculator, nodeId) {
        if (this.level <= 0) return 0;
        return costCalculator(this, this.level, nodeId);
    }
    
    /**
     * Check if can upgrade
     * @returns {boolean}
     */
    canUpgrade() {
        return this.level < this.maxLevel;
    }
    
    /**
     * Check if can refund
     * @returns {boolean}
     */
    canRefund() {
        return this.level > 0;
    }
    
    /**
     * Increment level (does not check cost)
     * @returns {boolean} Success
     */
    upgrade() {
        if (this.level >= this.maxLevel) return false;
        this.level++;
        return true;
    }
    
    /**
     * Decrement level
     * @returns {boolean} Success
     */
    refund() {
        if (this.level <= 0) return false;
        this.level--;
        return true;
    }
    
    /**
     * Serialize for save
     * @returns {Object}
     */
    serialize() {
        return { id: this.id, level: this.level };
    }
    
    /**
     * Load from save data
     * @param {Object} data
     */
    deserialize(data) {
        if (data && typeof data.level === 'number') {
            this.level = Math.min(data.level, this.maxLevel);
        }
    }
}

/**
 * Manages a single upgrade node
 */
class NodeState {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description;
        this.icon = config.icon || '◆';
        this.color = config.color || '#ffffff';
        this.parentId = config.parentId || null;
        this.requiredParentLevel = config.requiredParentLevel || 0;
        this.isRoot = config.isRoot || false;
        this.x = config.x || 0;
        this.y = config.y || 0;
        
        // Create property states
        this.properties = (config.properties || []).map(p => new PropertyState(p));
    }
    
    /**
     * Get total level (sum of all property levels)
     * @returns {number}
     */
    getLevel() {
        return this.properties.reduce((sum, p) => sum + p.level, 0);
    }
    
    /**
     * Get maximum possible level
     * @returns {number}
     */
    getMaxLevel() {
        return this.properties.reduce((sum, p) => sum + p.maxLevel, 0);
    }
    
    /**
     * Check if any points are invested
     * @returns {boolean}
     */
    hasInvestment() {
        return this.getLevel() > 0;
    }
    
    /**
     * Get a property by ID
     * @param {string} propId
     * @returns {PropertyState|null}
     */
    getProperty(propId) {
        return this.properties.find(p => p.id === propId) || null;
    }
    
    /**
     * Get value for a specific property
     * @param {string} propId
     * @returns {number}
     */
    getPropertyValue(propId) {
        const prop = this.getProperty(propId);
        return prop ? prop.getValue() : 1;
    }
    
    /**
     * Serialize for save
     * @returns {Object}
     */
    serialize() {
        return {
            id: this.id,
            properties: this.properties.map(p => p.serialize())
        };
    }
    
    /**
     * Load from save data
     * @param {Object} data
     */
    deserialize(data) {
        if (!data || !data.properties) return;
        for (const propData of data.properties) {
            const prop = this.getProperty(propData.id);
            if (prop) prop.deserialize(propData);
        }
    }
}

/**
 * Main upgrade system manager
 * Provides unified interface for all upgrade operations
 */
class UpgradeManager {
    constructor(options = {}) {
        // Node data source (array of node configs)
        this.nodeConfigs = options.nodeConfigs || [];
        
        // Cost calculator function
        this.costCalculator = options.costCalculator || this._defaultCostCalculator.bind(this);
        
        // State
        this.nodes = new Map();
        this.currency = 0;
        this.totalEarned = 0;
        this.rootId = null;
        
        // Cached stats (invalidated on upgrade/refund)
        this._statsCache = null;
        this._statsCacheValid = false;
        
        // Event listeners
        this._listeners = {
            upgrade: [],
            refund: [],
            currencyChange: [],
            statsChange: [],
            unlock: [],
            save: [],
            load: []
        };
        
        // Storage key for persistence
        this.storageKey = options.storageKey || 'magnetGame_upgrades';
        
        // Initialize nodes
        this._initializeNodes();
    }
    
    /**
     * Default cost calculator (can be overridden)
     */
    _defaultCostCalculator(property, level, nodeId) {
        const tier = this._getNodeTier(nodeId);
        const costTiers = {
            cheap: { base: 1, scaling: 1.05 },
            standard: { base: 2, scaling: 1.10 },
            expensive: { base: 3, scaling: 1.15 },
            premium: { base: 5, scaling: 1.20 }
        };
        const config = costTiers[property.costTier] || costTiers.standard;
        
        let impactScore = 1 + Math.abs(property.valuePerLevel) * 10;
        impactScore *= property.effectType === 'multiply' ? 1.5 : 1.0;
        impactScore *= Math.pow(property.maxLevel, 0.5);
        
        if (property.id.includes('spawn') || property.id.includes('annihilation')) {
            impactScore *= 1.8;
        }
        
        const baseCost = Math.ceil(impactScore * config.base * tier);
        return Math.ceil(baseCost * Math.pow(config.scaling, level - 1));
    }
    
    /**
     * Get tier for a node (depth in tree)
     */
    _getNodeTier(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node || node.isRoot) return 1;
        
        let depth = 1;
        let current = node;
        while (current.parentId) {
            depth++;
            current = this.nodes.get(current.parentId);
            if (!current) break;
        }
        return Math.min(depth, 3);
    }
    
    /**
     * Initialize nodes from configuration
     */
    _initializeNodes() {
        this.nodes.clear();
        
        for (const config of this.nodeConfigs) {
            const node = new NodeState(config);
            this.nodes.set(node.id, node);
            if (node.isRoot) {
                this.rootId = node.id;
            }
        }
    }
    
    /**
     * Invalidate stats cache
     */
    _invalidateCache() {
        this._statsCacheValid = false;
    }
    
    /**
     * Emit an event to listeners
     */
    _emit(event, data) {
        const listeners = this._listeners[event] || [];
        for (const callback of listeners) {
            try {
                callback(data);
            } catch (e) {
                console.error(`Error in ${event} listener:`, e);
            }
        }
    }
    
    // ========================================
    // PUBLIC API - Node Access
    // ========================================
    
    /**
     * Get a node by ID
     * @param {string} id
     * @returns {NodeState|null}
     */
    getNode(id) {
        return this.nodes.get(id) || null;
    }
    
    /**
     * Get all nodes as array
     * @returns {NodeState[]}
     */
    getAllNodes() {
        return Array.from(this.nodes.values());
    }
    
    /**
     * Get children of a node
     * @param {string} parentId
     * @returns {NodeState[]}
     */
    getChildren(parentId) {
        return this.getAllNodes().filter(n => n.parentId === parentId);
    }
    
    /**
     * Check if a node is unlocked
     * @param {string} nodeId
     * @returns {boolean}
     */
    isNodeUnlocked(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return false;
        if (node.isRoot) return true;
        if (!node.parentId) return true;
        
        const parent = this.nodes.get(node.parentId);
        if (!parent) return false;
        
        return parent.getLevel() >= node.requiredParentLevel;
    }
    
    // ========================================
    // PUBLIC API - Currency
    // ========================================
    
    /**
     * Add currency (from collecting treats)
     * @param {number} amount
     */
    addCurrency(amount) {
        if (amount <= 0) return;
        this.currency += amount;
        this.totalEarned += amount;
        this._emit('currencyChange', { currency: this.currency, added: amount });
    }
    
    /**
     * Get current currency
     * @returns {number}
     */
    getCurrency() {
        return this.currency;
    }
    
    /**
     * Check if can afford a cost
     * @param {number} cost
     * @returns {boolean}
     */
    canAfford(cost) {
        return this.currency >= cost;
    }
    
    // ========================================
    // PUBLIC API - Upgrades
    // ========================================
    
    /**
     * Purchase an upgrade
     * @param {string} nodeId
     * @param {string} propId
     * @returns {{success: boolean, error?: string, cost?: number}}
     */
    purchaseUpgrade(nodeId, propId) {
        const node = this.nodes.get(nodeId);
        if (!node) {
            return { success: false, error: 'Invalid node ID' };
        }
        
        if (!this.isNodeUnlocked(nodeId)) {
            return { success: false, error: 'Node is locked' };
        }
        
        const prop = node.getProperty(propId);
        if (!prop) {
            return { success: false, error: 'Invalid property ID' };
        }
        
        if (!prop.canUpgrade()) {
            return { success: false, error: 'Property at max level' };
        }
        
        const cost = prop.getUpgradeCost(this.costCalculator, nodeId);
        if (!this.canAfford(cost)) {
            return { success: false, error: 'Insufficient currency', cost };
        }
        
        // Perform upgrade
        this.currency -= cost;
        prop.upgrade();
        this._invalidateCache();
        
        // Check if this unlocked any children
        const unlocked = [];
        for (const child of this.getChildren(nodeId)) {
            if (this.isNodeUnlocked(child.id) && !child.hasInvestment()) {
                unlocked.push(child.id);
            }
        }
        
        this._emit('upgrade', { nodeId, propId, cost, newLevel: prop.level });
        this._emit('currencyChange', { currency: this.currency, spent: cost });
        this._emit('statsChange', { stats: this.getStats() });
        
        if (unlocked.length > 0) {
            this._emit('unlock', { nodeIds: unlocked });
        }
        
        return { success: true, cost, newLevel: prop.level };
    }
    
    /**
     * Refund an upgrade level
     * @param {string} nodeId
     * @param {string} propId
     * @returns {{success: boolean, error?: string, refund?: number}}
     */
    refundUpgrade(nodeId, propId) {
        const node = this.nodes.get(nodeId);
        if (!node) {
            return { success: false, error: 'Invalid node ID' };
        }
        
        const prop = node.getProperty(propId);
        if (!prop) {
            return { success: false, error: 'Invalid property ID' };
        }
        
        if (!prop.canRefund()) {
            return { success: false, error: 'Property at level 0' };
        }
        
        // Check if refunding would orphan invested children
        const newLevel = node.getLevel() - 1;
        for (const child of this.getChildren(nodeId)) {
            if (child.hasInvestment() && newLevel < child.requiredParentLevel) {
                return { 
                    success: false, 
                    error: `Would lock invested child: ${child.name}` 
                };
            }
        }
        
        // Perform refund
        const refund = prop.getRefundAmount(this.costCalculator, nodeId);
        prop.refund();
        this.currency += refund;
        this._invalidateCache();
        
        this._emit('refund', { nodeId, propId, refund, newLevel: prop.level });
        this._emit('currencyChange', { currency: this.currency, refunded: refund });
        this._emit('statsChange', { stats: this.getStats() });
        
        return { success: true, refund, newLevel: prop.level };
    }
    
    /**
     * Check if a property can be upgraded
     * @param {string} nodeId
     * @param {string} propId
     * @returns {{canUpgrade: boolean, reason?: string, cost?: number}}
     */
    canUpgradeProperty(nodeId, propId) {
        const node = this.nodes.get(nodeId);
        if (!node) return { canUpgrade: false, reason: 'Invalid node' };
        
        if (!this.isNodeUnlocked(nodeId)) {
            return { canUpgrade: false, reason: 'Node locked' };
        }
        
        const prop = node.getProperty(propId);
        if (!prop) return { canUpgrade: false, reason: 'Invalid property' };
        
        if (!prop.canUpgrade()) {
            return { canUpgrade: false, reason: 'Max level reached' };
        }
        
        const cost = prop.getUpgradeCost(this.costCalculator, nodeId);
        if (!this.canAfford(cost)) {
            return { canUpgrade: false, reason: 'Insufficient currency', cost };
        }
        
        return { canUpgrade: true, cost };
    }
    
    /**
     * Check if a property can be refunded
     * @param {string} nodeId
     * @param {string} propId
     * @returns {{canRefund: boolean, reason?: string, refund?: number}}
     */
    canRefundProperty(nodeId, propId) {
        const node = this.nodes.get(nodeId);
        if (!node) return { canRefund: false, reason: 'Invalid node' };
        
        const prop = node.getProperty(propId);
        if (!prop) return { canRefund: false, reason: 'Invalid property' };
        
        if (!prop.canRefund()) {
            return { canRefund: false, reason: 'Already at level 0' };
        }
        
        // Check children
        const newLevel = node.getLevel() - 1;
        for (const child of this.getChildren(nodeId)) {
            if (child.hasInvestment() && newLevel < child.requiredParentLevel) {
                return { 
                    canRefund: false, 
                    reason: `Would lock invested child: ${child.name}` 
                };
            }
        }
        
        const refund = prop.getRefundAmount(this.costCalculator, nodeId);
        return { canRefund: true, refund };
    }
    
    // ========================================
    // PUBLIC API - Stats
    // ========================================
    
    /**
     * Get computed game stats from all upgrades
     * Uses caching for performance
     * @returns {Object}
     */
    getStats() {
        if (this._statsCacheValid && this._statsCache) {
            return { ...this._statsCache };
        }
        
        // Initialize with base values
        const stats = {
            // Force stats
            attractStrength: 1,
            attractRadius: 1,
            repelStrength: 1,
            repelRadius: 1,
            dotSpeed: 1,
            // Advanced force stats
            treatAttraction: 0,
            attractTreats: 0,
            lawOfAttractionRadius: 1,
            dangerRepulsion: 0,
            goldDiggerRepulsion: 0,
            // Spawning stats
            spawnDotOnTreat: 0,
            spawnTreatOnDeath: 0,
            treatSpawnChance: 0,
            // Economy stats
            coinGain: 0,
            // Survival stats
            annihalationCost: 10,
            // Offensive stats
            spawnedDotAnnihilation: 0,
            kamikaze: 0
        };
        
        // Aggregate from all nodes
        for (const node of this.nodes.values()) {
            for (const prop of node.properties) {
                if (stats.hasOwnProperty(prop.id)) {
                    const value = prop.getValue();
                    if (prop.effectType === 'multiply') {
                        stats[prop.id] *= value;
                    } else {
                        // For 'add' and 'replace', the getValue() already returns the computed value
                        // We want to add the delta from base
                        const delta = value - prop.baseValue;
                        stats[prop.id] += delta;
                    }
                }
            }
        }
        
        // Cache the result
        this._statsCache = stats;
        this._statsCacheValid = true;
        
        return { ...stats };
    }
    
    /**
     * Get a specific stat value
     * @param {string} statId
     * @returns {number}
     */
    getStat(statId) {
        const stats = this.getStats();
        return stats[statId] ?? 0;
    }
    
    // ========================================
    // PUBLIC API - Events
    // ========================================
    
    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this._listeners[event]) {
            this._listeners[event] = [];
        }
        this._listeners[event].push(callback);
        
        // Return unsubscribe function
        return () => {
            const idx = this._listeners[event].indexOf(callback);
            if (idx !== -1) {
                this._listeners[event].splice(idx, 1);
            }
        };
    }
    
    /**
     * Remove all listeners for an event
     * @param {string} event
     */
    removeAllListeners(event) {
        if (event) {
            this._listeners[event] = [];
        } else {
            for (const key in this._listeners) {
                this._listeners[key] = [];
            }
        }
    }
    
    // ========================================
    // PUBLIC API - Persistence
    // ========================================
    
    /**
     * Serialize entire state for saving
     * @returns {Object}
     */
    serialize() {
        return {
            version: 2, // Serialization version for migration support
            currency: this.currency,
            totalEarned: this.totalEarned,
            nodes: this.getAllNodes().map(n => n.serialize())
        };
    }
    
    /**
     * Load state from serialized data
     * @param {Object} data
     */
    deserialize(data) {
        if (!data) return;
        
        // Handle version migration if needed
        const version = data.version || 1;
        
        this.currency = data.currency || 0;
        this.totalEarned = data.totalEarned || 0;
        
        if (data.nodes) {
            for (const nodeData of data.nodes) {
                const node = this.nodes.get(nodeData.id);
                if (node) {
                    node.deserialize(nodeData);
                }
            }
        }
        
        this._invalidateCache();
        this._emit('load', { version });
    }
    
    /**
     * Save to localStorage
     */
    save() {
        try {
            const data = this.serialize();
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            this._emit('save', { success: true });
            return true;
        } catch (e) {
            console.error('Failed to save upgrades:', e);
            this._emit('save', { success: false, error: e.message });
            return false;
        }
    }
    
    /**
     * Load from localStorage
     */
    load() {
        try {
            const json = localStorage.getItem(this.storageKey);
            if (json) {
                const data = JSON.parse(json);
                this.deserialize(data);
                return true;
            }
            return false;
        } catch (e) {
            console.error('Failed to load upgrades:', e);
            return false;
        }
    }
    
    /**
     * Clear all saved data
     */
    clearSave() {
        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (e) {
            console.error('Failed to clear save:', e);
            return false;
        }
    }
    
    /**
     * Reset all upgrades (keeps currency history)
     */
    resetUpgrades() {
        for (const node of this.nodes.values()) {
            for (const prop of node.properties) {
                prop.level = 0;
            }
        }
        this._invalidateCache();
        this._emit('statsChange', { stats: this.getStats() });
    }
    
    /**
     * Full reset (including currency)
     */
    fullReset() {
        this.currency = 0;
        this.totalEarned = 0;
        this.resetUpgrades();
        this._emit('currencyChange', { currency: 0 });
    }
    
    // ========================================
    // PUBLIC API - Debug
    // ========================================
    
    /**
     * Get debug information
     * @returns {Object}
     */
    getDebugInfo() {
        const nodes = [];
        for (const node of this.nodes.values()) {
            nodes.push({
                id: node.id,
                name: node.name,
                level: node.getLevel(),
                maxLevel: node.getMaxLevel(),
                unlocked: this.isNodeUnlocked(node.id),
                properties: node.properties.map(p => ({
                    id: p.id,
                    level: p.level,
                    maxLevel: p.maxLevel,
                    value: p.getValue()
                }))
            });
        }
        
        return {
            currency: this.currency,
            totalEarned: this.totalEarned,
            stats: this.getStats(),
            nodes,
            cacheValid: this._statsCacheValid
        };
    }
    
    /**
     * Log debug info to console
     */
    debugLog() {
        console.group('UpgradeManager Debug Info');
        console.log('Currency:', this.currency);
        console.log('Total Earned:', this.totalEarned);
        console.log('Stats:', this.getStats());
        console.groupEnd();
    }
}

// Module exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PropertyState,
        NodeState,
        UpgradeManager
    };
}
