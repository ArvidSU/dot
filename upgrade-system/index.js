// ============================================
// UPGRADE SYSTEM - Main Entry Point
// ============================================
// This file provides the unified API for the upgrade system,
// maintaining backward compatibility while using the new architecture.

// Import components (in browser, these are loaded via script tags)
// In Node.js, use require()

/**
 * Creates and returns a fully initialized UpgradeManager
 * This is the main factory function for creating the upgrade system
 * @param {Object} options - Configuration options
 * @returns {UpgradeManager}
 */
function createUpgradeSystem(options = {}) {
    // Get upgrade data from upgrade-data.js
    const nodeConfigs = typeof getUpgradeNodes === 'function' 
        ? getUpgradeNodes() 
        : options.nodeConfigs || [];
    
    // Get cost calculator
    const costCalculator = typeof calculateUpgradeCost === 'function'
        ? calculateUpgradeCost
        : options.costCalculator;
    
    // Create manager
    const manager = new UpgradeManager({
        nodeConfigs,
        costCalculator,
        storageKey: options.storageKey || 'magnetGame_upgrades'
    });
    
    // Load saved state
    manager.load();
    
    return manager;
}

// ============================================
// BACKWARD COMPATIBILITY LAYER
// ============================================
// These aliases maintain compatibility with existing code
// that uses the old UpgradeTree API

/**
 * @deprecated Use UpgradeManager instead
 * Alias for backward compatibility
 */
class UpgradeTree {
    constructor() {
        console.warn('UpgradeTree is deprecated. Use createUpgradeSystem() instead.');
        
        // Get node configs
        const nodeConfigs = typeof getUpgradeNodes === 'function' 
            ? getUpgradeNodes() 
            : [];
        
        // Create internal manager
        this._manager = new UpgradeManager({ nodeConfigs });
        
        // Expose properties for backward compatibility
        this.nodes = this._manager.nodes;
        this.currency = 0;
        this.totalEarned = 0;
        this.rootId = this._manager.rootId;
        
        // Sync currency via getters/setters
        Object.defineProperty(this, 'currency', {
            get: () => this._manager.currency,
            set: (v) => { this._manager.currency = v; }
        });
        Object.defineProperty(this, 'totalEarned', {
            get: () => this._manager.totalEarned,
            set: (v) => { this._manager.totalEarned = v; }
        });
    }
    
    addNode(config) {
        const node = new NodeState(config);
        this._manager.nodes.set(node.id, node);
        if (node.isRoot) this._manager.rootId = node.id;
        return node;
    }
    
    getNode(id) {
        return this._manager.getNode(id);
    }
    
    getAllNodes() {
        return this._manager.getAllNodes();
    }
    
    getChildren(parentId) {
        return this._manager.getChildren(parentId);
    }
    
    addCurrency(amount) {
        this._manager.addCurrency(amount);
    }
    
    upgradeProperty(nodeId, propId) {
        const result = this._manager.purchaseUpgrade(nodeId, propId);
        return result.success;
    }
    
    refundProperty(nodeId, propId) {
        const result = this._manager.refundUpgrade(nodeId, propId);
        return result.success;
    }
    
    getStats() {
        return this._manager.getStats();
    }
    
    serialize() {
        return this._manager.serialize();
    }
    
    deserialize(data) {
        this._manager.deserialize(data);
    }
    
    save() {
        this._manager.save();
    }
    
    load() {
        this._manager.load();
    }
}

/**
 * @deprecated Use createUpgradeSystem() instead
 * Factory function for backward compatibility
 */
function createDefaultUpgradeTree() {
    console.warn('createDefaultUpgradeTree() is deprecated. Use createUpgradeSystem() instead.');
    
    const nodeConfigs = typeof getUpgradeNodes === 'function' 
        ? getUpgradeNodes() 
        : [];
    
    const manager = new UpgradeManager({ nodeConfigs });
    
    // Return a compatibility wrapper
    const tree = new UpgradeTree();
    tree._manager = manager;
    
    // Copy nodes reference
    tree.nodes = manager.nodes;
    tree.rootId = manager.rootId;
    
    return tree;
}

// ============================================
// NODE PROPERTY HELPERS
// ============================================
// Additional utilities for working with upgrade nodes

/**
 * Get upgrade path from root to a specific node
 * @param {UpgradeManager} manager
 * @param {string} nodeId
 * @returns {string[]} Array of node IDs from root to target
 */
function getUpgradePath(manager, nodeId) {
    const path = [];
    let current = manager.getNode(nodeId);
    
    while (current) {
        path.unshift(current.id);
        if (current.parentId) {
            current = manager.getNode(current.parentId);
        } else {
            break;
        }
    }
    
    return path;
}

/**
 * Calculate total investment in a branch
 * @param {UpgradeManager} manager
 * @param {string} rootNodeId - Branch root node ID
 * @returns {number} Total levels invested
 */
function getBranchInvestment(manager, rootNodeId) {
    let total = 0;
    const visited = new Set();
    const queue = [rootNodeId];
    
    while (queue.length > 0) {
        const nodeId = queue.shift();
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);
        
        const node = manager.getNode(nodeId);
        if (node) {
            total += node.getLevel();
            for (const child of manager.getChildren(nodeId)) {
                queue.push(child.id);
            }
        }
    }
    
    return total;
}

/**
 * Get all unlocked but uninvested nodes
 * @param {UpgradeManager} manager
 * @returns {NodeState[]}
 */
function getAvailableUpgrades(manager) {
    return manager.getAllNodes().filter(node => 
        manager.isNodeUnlocked(node.id) && !node.hasInvestment()
    );
}

/**
 * Get recommended next upgrade based on efficiency
 * @param {UpgradeManager} manager
 * @returns {{nodeId: string, propId: string, efficiency: number}|null}
 */
function getRecommendedUpgrade(manager) {
    let best = null;
    let bestEfficiency = -Infinity;
    
    for (const node of manager.getAllNodes()) {
        if (!manager.isNodeUnlocked(node.id)) continue;
        
        for (const prop of node.properties) {
            const check = manager.canUpgradeProperty(node.id, prop.id);
            if (!check.canUpgrade) continue;
            
            // Calculate efficiency: value gain per cost
            const currentValue = prop.getValue();
            const nextValue = prop.level + 1 <= prop.maxLevel
                ? prop.baseValue + (prop.level + 1) * prop.valuePerLevel
                : currentValue;
            const valueGain = nextValue - currentValue;
            const efficiency = valueGain / check.cost;
            
            if (efficiency > bestEfficiency) {
                bestEfficiency = efficiency;
                best = { nodeId: node.id, propId: prop.id, efficiency };
            }
        }
    }
    
    return best;
}

// ============================================
// EXPORTS
// ============================================

// Browser global exports
if (typeof window !== 'undefined') {
    window.createUpgradeSystem = createUpgradeSystem;
    window.UpgradeTree = UpgradeTree;
    window.createDefaultUpgradeTree = createDefaultUpgradeTree;
    window.getUpgradePath = getUpgradePath;
    window.getBranchInvestment = getBranchInvestment;
    window.getAvailableUpgrades = getAvailableUpgrades;
    window.getRecommendedUpgrade = getRecommendedUpgrade;
}

// Node.js exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createUpgradeSystem,
        UpgradeTree,
        createDefaultUpgradeTree,
        getUpgradePath,
        getBranchInvestment,
        getAvailableUpgrades,
        getRecommendedUpgrade
    };
}
