// ============================================
// UPGRADE DEBUG - Development & Testing Tools
// ============================================
// Debug utilities for the upgrade system including:
// - Visual debug overlay
// - Console commands
// - State inspection
// - Testing helpers

/**
 * Debug utilities for the upgrade system
 */
class UpgradeDebugTools {
    constructor(manager) {
        this.manager = manager;
        this.enabled = false;
        this.overlay = null;
        this.logEnabled = false;
        
        // Bind console commands
        this._bindConsoleCommands();
    }
    
    /**
     * Enable debug mode
     */
    enable() {
        this.enabled = true;
        this.logEnabled = true;
        this._setupEventLogging();
        console.log('%c[UpgradeDebug] Debug mode enabled', 'color: #00ff00');
        console.log('Available commands: upgradeDebug.help()');
    }
    
    /**
     * Disable debug mode
     */
    disable() {
        this.enabled = false;
        this.logEnabled = false;
        this._removeOverlay();
        console.log('%c[UpgradeDebug] Debug mode disabled', 'color: #ff0000');
    }
    
    /**
     * Show available commands
     */
    help() {
        console.log(`
%c=== Upgrade Debug Commands ===

%cState Inspection:%c
  upgradeDebug.showStats()     - Display current stats
  upgradeDebug.showNodes()     - Display node tree
  upgradeDebug.showCurrency()  - Display currency info
  upgradeDebug.inspect(nodeId) - Detailed node inspection

%cManipulation:%c
  upgradeDebug.addCurrency(amount)           - Add currency
  upgradeDebug.setCurrency(amount)           - Set currency
  upgradeDebug.maxNode(nodeId)               - Max out a node
  upgradeDebug.maxAll()                      - Max all upgrades
  upgradeDebug.reset()                       - Reset all upgrades
  upgradeDebug.unlock(nodeId)                - Force unlock a node

%cTesting:%c
  upgradeDebug.simulatePurchase(nodeId, propId) - Test purchase
  upgradeDebug.testCostScaling(nodeId, propId)  - Show cost curve
  upgradeDebug.validateTree()                    - Validate tree config

%cVisualization:%c
  upgradeDebug.showOverlay()   - Show debug overlay
  upgradeDebug.hideOverlay()   - Hide debug overlay
  upgradeDebug.exportState()   - Export state as JSON
  upgradeDebug.importState(json) - Import state from JSON
        `,
            'color: #00d4ff; font-weight: bold',
            'color: #ffd700; font-weight: bold', 'color: #ffffff',
            'color: #ffd700; font-weight: bold', 'color: #ffffff',
            'color: #ffd700; font-weight: bold', 'color: #ffffff',
            'color: #ffd700; font-weight: bold', 'color: #ffffff'
        );
    }
    
    // ========================================
    // STATE INSPECTION
    // ========================================
    
    /**
     * Display current stats in a table
     */
    showStats() {
        const stats = this.manager.getStats();
        console.log('%c=== Current Stats ===', 'color: #00d4ff; font-weight: bold');
        console.table(stats);
        return stats;
    }
    
    /**
     * Display node tree structure
     */
    showNodes() {
        console.log('%c=== Upgrade Tree ===', 'color: #00d4ff; font-weight: bold');
        
        const printNode = (node, indent = 0) => {
            const prefix = '  '.repeat(indent);
            const status = this.manager.isNodeUnlocked(node.id) 
                ? (node.hasInvestment() ? '✓' : '○') 
                : '✗';
            const level = `${node.getLevel()}/${node.getMaxLevel()}`;
            
            console.log(
                `${prefix}%c${status} %c${node.name} %c[${level}]`,
                status === '✓' ? 'color: #00ff00' : status === '○' ? 'color: #ffd700' : 'color: #ff0066',
                'color: #ffffff',
                'color: #888888'
            );
            
            // Print children
            const children = this.manager.getChildren(node.id);
            for (const child of children) {
                printNode(child, indent + 1);
            }
        };
        
        // Start from root
        const root = this.manager.getNode(this.manager.rootId);
        if (root) printNode(root);
    }
    
    /**
     * Display currency information
     */
    showCurrency() {
        console.log('%c=== Currency Info ===', 'color: #ffd700; font-weight: bold');
        console.log('Current:', this.manager.currency);
        console.log('Total Earned:', this.manager.totalEarned);
        return { current: this.manager.currency, totalEarned: this.manager.totalEarned };
    }
    
    /**
     * Detailed inspection of a node
     * @param {string} nodeId
     */
    inspect(nodeId) {
        const node = this.manager.getNode(nodeId);
        if (!node) {
            console.error(`Node not found: ${nodeId}`);
            return null;
        }
        
        console.log('%c=== Node Inspection ===', 'color: #00d4ff; font-weight: bold');
        console.log('ID:', node.id);
        console.log('Name:', node.name);
        console.log('Description:', node.description);
        console.log('Color:', node.color);
        console.log('Parent:', node.parentId || '(root)');
        console.log('Required Parent Level:', node.requiredParentLevel);
        console.log('Unlocked:', this.manager.isNodeUnlocked(nodeId));
        console.log('Total Level:', `${node.getLevel()}/${node.getMaxLevel()}`);
        
        console.log('%cProperties:', 'color: #ffd700');
        for (const prop of node.properties) {
            const cost = prop.level < prop.maxLevel 
                ? prop.getUpgradeCost(this.manager.costCalculator, nodeId)
                : 'MAX';
            console.log(`  ${prop.name}: ${prop.level}/${prop.maxLevel} (value: ${prop.getValue().toFixed(3)}, next cost: ${cost})`);
        }
        
        console.log('%cChildren:', 'color: #ffd700');
        const children = this.manager.getChildren(nodeId);
        if (children.length === 0) {
            console.log('  (none)');
        } else {
            for (const child of children) {
                console.log(`  - ${child.name} (requires ${child.requiredParentLevel} levels)`);
            }
        }
        
        return node;
    }
    
    // ========================================
    // MANIPULATION
    // ========================================
    
    /**
     * Add currency
     * @param {number} amount
     */
    addCurrency(amount) {
        this.manager.addCurrency(amount);
        console.log(`Added ${amount} currency. New balance: ${this.manager.currency}`);
    }
    
    /**
     * Set currency to specific amount
     * @param {number} amount
     */
    setCurrency(amount) {
        this.manager.currency = amount;
        console.log(`Set currency to ${amount}`);
    }
    
    /**
     * Max out all properties in a node
     * @param {string} nodeId
     */
    maxNode(nodeId) {
        const node = this.manager.getNode(nodeId);
        if (!node) {
            console.error(`Node not found: ${nodeId}`);
            return;
        }
        
        for (const prop of node.properties) {
            prop.level = prop.maxLevel;
        }
        
        this.manager._invalidateCache();
        console.log(`Maxed out node: ${node.name}`);
    }
    
    /**
     * Max out all upgrades
     */
    maxAll() {
        for (const node of this.manager.getAllNodes()) {
            for (const prop of node.properties) {
                prop.level = prop.maxLevel;
            }
        }
        
        this.manager._invalidateCache();
        console.log('All upgrades maxed');
    }
    
    /**
     * Reset all upgrades
     */
    reset() {
        this.manager.resetUpgrades();
        console.log('All upgrades reset');
    }
    
    /**
     * Force unlock a node by maxing parent requirements
     * @param {string} nodeId
     */
    unlock(nodeId) {
        const node = this.manager.getNode(nodeId);
        if (!node) {
            console.error(`Node not found: ${nodeId}`);
            return;
        }
        
        if (node.isRoot) {
            console.log('Node is root, already unlocked');
            return;
        }
        
        // Max parent up to required level
        const parent = this.manager.getNode(node.parentId);
        if (parent) {
            let levelsNeeded = node.requiredParentLevel - parent.getLevel();
            for (const prop of parent.properties) {
                if (levelsNeeded <= 0) break;
                const toAdd = Math.min(levelsNeeded, prop.maxLevel - prop.level);
                prop.level += toAdd;
                levelsNeeded -= toAdd;
            }
            this.manager._invalidateCache();
        }
        
        console.log(`Node ${nodeId} is now ${this.manager.isNodeUnlocked(nodeId) ? 'unlocked' : 'still locked'}`);
    }
    
    // ========================================
    // TESTING
    // ========================================
    
    /**
     * Simulate a purchase without spending currency
     * @param {string} nodeId
     * @param {string} propId
     */
    simulatePurchase(nodeId, propId) {
        console.log('%c=== Purchase Simulation ===', 'color: #00d4ff; font-weight: bold');
        
        const check = this.manager.canUpgradeProperty(nodeId, propId);
        console.log('Can upgrade:', check.canUpgrade);
        if (!check.canUpgrade) {
            console.log('Reason:', check.reason);
        }
        console.log('Cost:', check.cost || 'N/A');
        console.log('Current currency:', this.manager.currency);
        console.log('Would afford:', check.cost ? this.manager.currency >= check.cost : false);
        
        // Show what stats would change
        const node = this.manager.getNode(nodeId);
        const prop = node?.getProperty(propId);
        if (prop) {
            console.log('Current value:', prop.getValue());
            console.log('Value after upgrade:', prop.getValue() + prop.valuePerLevel);
        }
        
        return check;
    }
    
    /**
     * Display cost scaling curve for a property
     * @param {string} nodeId
     * @param {string} propId
     */
    testCostScaling(nodeId, propId) {
        const node = this.manager.getNode(nodeId);
        const prop = node?.getProperty(propId);
        
        if (!prop) {
            console.error('Property not found');
            return;
        }
        
        console.log('%c=== Cost Scaling ===', 'color: #00d4ff; font-weight: bold');
        console.log(`Property: ${prop.name} (${nodeId}/${propId})`);
        console.log('');
        
        const costs = [];
        let total = 0;
        
        for (let level = 1; level <= prop.maxLevel; level++) {
            const cost = this.manager.costCalculator(prop, level, nodeId);
            total += cost;
            costs.push({ level, cost, total });
        }
        
        console.table(costs);
        
        // Visual bar chart
        const maxCost = costs[costs.length - 1].cost;
        console.log('Cost curve:');
        for (const { level, cost } of costs) {
            const barLength = Math.ceil((cost / maxCost) * 30);
            const bar = '█'.repeat(barLength) + '░'.repeat(30 - barLength);
            console.log(`L${level.toString().padStart(2)}: ${bar} ${cost}`);
        }
    }
    
    /**
     * Validate the upgrade tree configuration
     */
    validateTree() {
        console.log('%c=== Tree Validation ===', 'color: #00d4ff; font-weight: bold');
        
        const errors = [];
        const warnings = [];
        const nodes = this.manager.getAllNodes();
        
        // Check for orphaned nodes
        const nodeIds = new Set(nodes.map(n => n.id));
        for (const node of nodes) {
            if (node.parentId && !nodeIds.has(node.parentId)) {
                errors.push(`Node '${node.id}' references non-existent parent '${node.parentId}'`);
            }
        }
        
        // Check root
        const roots = nodes.filter(n => n.isRoot);
        if (roots.length === 0) {
            errors.push('No root node defined');
        } else if (roots.length > 1) {
            errors.push(`Multiple root nodes: ${roots.map(r => r.id).join(', ')}`);
        }
        
        // Check unlock requirements
        for (const node of nodes) {
            if (node.parentId) {
                const parent = this.manager.getNode(node.parentId);
                if (parent && node.requiredParentLevel > parent.getMaxLevel()) {
                    warnings.push(`Node '${node.id}' requires ${node.requiredParentLevel} levels but parent max is ${parent.getMaxLevel()}`);
                }
            }
        }
        
        // Check for duplicate property IDs within nodes
        for (const node of nodes) {
            const propIds = new Set();
            for (const prop of node.properties) {
                if (propIds.has(prop.id)) {
                    errors.push(`Duplicate property ID '${prop.id}' in node '${node.id}'`);
                }
                propIds.add(prop.id);
            }
        }
        
        // Report results
        if (errors.length === 0 && warnings.length === 0) {
            console.log('%c✓ Tree is valid', 'color: #00ff00');
        } else {
            if (errors.length > 0) {
                console.log('%cErrors:', 'color: #ff0066');
                errors.forEach(e => console.log(`  ✗ ${e}`));
            }
            if (warnings.length > 0) {
                console.log('%cWarnings:', 'color: #ffd700');
                warnings.forEach(w => console.log(`  ⚠ ${w}`));
            }
        }
        
        return { valid: errors.length === 0, errors, warnings };
    }
    
    // ========================================
    // VISUALIZATION
    // ========================================
    
    /**
     * Show debug overlay on screen
     */
    showOverlay() {
        this._removeOverlay();
        
        this.overlay = document.createElement('div');
        this.overlay.id = 'upgrade-debug-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.9);
            color: #00ff00;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            max-width: 300px;
            max-height: 400px;
            overflow: auto;
            border: 1px solid #00d4ff;
        `;
        
        document.body.appendChild(this.overlay);
        this._updateOverlay();
        
        // Auto-update every second
        this._overlayInterval = setInterval(() => this._updateOverlay(), 1000);
    }
    
    /**
     * Hide debug overlay
     */
    hideOverlay() {
        this._removeOverlay();
    }
    
    _removeOverlay() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        if (this._overlayInterval) {
            clearInterval(this._overlayInterval);
            this._overlayInterval = null;
        }
    }
    
    _updateOverlay() {
        if (!this.overlay) return;
        
        const stats = this.manager.getStats();
        const nodes = this.manager.getAllNodes();
        const unlocked = nodes.filter(n => this.manager.isNodeUnlocked(n.id)).length;
        const invested = nodes.filter(n => n.hasInvestment()).length;
        
        this.overlay.innerHTML = `
            <div style="color: #00d4ff; font-weight: bold; margin-bottom: 10px;">
                UPGRADE DEBUG
            </div>
            <div style="color: #ffd700;">
                💰 Currency: ${this.manager.currency}
            </div>
            <div style="margin-bottom: 10px;">
                📊 Nodes: ${invested}/${unlocked}/${nodes.length} (invested/unlocked/total)
            </div>
            <div style="color: #888; font-size: 10px; border-top: 1px solid #333; padding-top: 8px;">
                <div>Stats:</div>
                ${Object.entries(stats)
                    .filter(([_, v]) => v !== 1 && v !== 0)
                    .map(([k, v]) => `<div>${k}: ${typeof v === 'number' ? v.toFixed(2) : v}</div>`)
                    .join('')}
            </div>
        `;
    }
    
    /**
     * Export current state as JSON
     * @returns {string}
     */
    exportState() {
        const state = this.manager.serialize();
        const json = JSON.stringify(state, null, 2);
        console.log(json);
        return json;
    }
    
    /**
     * Import state from JSON
     * @param {string|Object} json
     */
    importState(json) {
        try {
            const data = typeof json === 'string' ? JSON.parse(json) : json;
            this.manager.deserialize(data);
            console.log('State imported successfully');
        } catch (e) {
            console.error('Failed to import state:', e);
        }
    }
    
    // ========================================
    // INTERNAL
    // ========================================
    
    _bindConsoleCommands() {
        if (typeof window !== 'undefined') {
            window.upgradeDebug = this;
        }
    }
    
    _setupEventLogging() {
        if (!this.logEnabled) return;
        
        this.manager.on('upgrade', (data) => {
            console.log('%c[Upgrade]', 'color: #00ff00', data);
        });
        
        this.manager.on('refund', (data) => {
            console.log('%c[Refund]', 'color: #ff0066', data);
        });
        
        this.manager.on('currencyChange', (data) => {
            console.log('%c[Currency]', 'color: #ffd700', data);
        });
        
        this.manager.on('unlock', (data) => {
            console.log('%c[Unlock]', 'color: #00d4ff', data);
        });
    }
}

/**
 * Create debug tools for an upgrade manager
 * @param {UpgradeManager} manager
 * @returns {UpgradeDebugTools}
 */
function createUpgradeDebugTools(manager) {
    return new UpgradeDebugTools(manager);
}

// Module exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        UpgradeDebugTools,
        createUpgradeDebugTools
    };
}
