// ============================================
// UPGRADE UI - Tree Visualization & Modal
// ============================================

// Layout configuration for radial fan layout supporting 0-6 children
const LAYOUT_CONFIG = {
    // Base spacing between tiers
    tierSpacing: 130,
    
    // Radial spread angles by child count (in degrees, relative to vertical down)
    // Angles are measured from vertical (90° = straight down)
    spreadAngles: {
        1: { start: 90, end: 90 },      // Straight down
        2: { start: 60, end: 120 },     // 60° spread
        3: { start: 45, end: 135 },     // 90° spread
        4: { start: 30, end: 150 },     // 120° spread
        5: { start: 20, end: 160 },     // 140° spread
        6: { start: 15, end: 165 }      // 150° spread
    },
    
    // Distance from parent (scales with child count)
    baseRadius: 130,
    radiusScale: {
        1: 1.0,
        2: 1.0,
        3: 1.1,
        4: 1.15,
        5: 1.25,
        6: 1.35
    },
    
    // Node sizing
    nodeSize: 50,
    minNodeSpacing: 30
};

class UpgradeUI {
    constructor(tree, onClose) {
        this.tree = tree;
        this.onClose = onClose;
        this.visible = false;
        this.selectedNode = null;
        this.modalVisible = false;
        
        // Layout settings
        this.nodeSize = LAYOUT_CONFIG.nodeSize;
        this.centerX = 0;
        this.centerY = 0;
        
        // Calculated node positions (screen coordinates)
        this.nodePositions = new Map();
        
        // Animation
        this.glowPhase = 0;
        this.hoverNode = null;
        
        // Energy flow particles
        this.energyParticles = [];
        
        // Create DOM elements
        this.createElements();
    }
    
    createElements() {
        // Main overlay container
        this.overlay = document.createElement('div');
        this.overlay.id = 'upgrade-overlay';
        this.overlay.innerHTML = `
            <div class="upgrade-header">
                <h2>Upgrade Tree</h2>
                <div class="currency-display">
                    <button class="debug-btn" id="debug-minus">−</button>
                    <span class="currency-icon">◆</span>
                    <span class="currency-amount" id="tree-currency">0</span>
                    <span class="currency-label">treats</span>
                    <button class="debug-btn" id="debug-plus">+</button>
                </div>
                <button class="close-btn" id="close-tree">✕</button>
            </div>
            <div class="tree-canvas-container">
                <canvas id="tree-canvas"></canvas>
                <div id="node-buttons-container"></div>
            </div>
            <div class="upgrade-footer">
                <p>Click a node to view and upgrade its properties</p>
            </div>
        `;
        document.body.appendChild(this.overlay);
        
        // Modal for node details
        this.modal = document.createElement('div');
        this.modal.id = 'upgrade-modal';
        this.modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <span class="modal-icon" id="modal-icon">◆</span>
                    <h3 id="modal-title">Node Name</h3>
                    <button class="modal-close" id="close-modal">✕</button>
                </div>
                <p class="modal-description" id="modal-description">Description here</p>
                <div class="modal-level">
                    <span>Total Level:</span>
                    <span id="modal-level">0</span>
                </div>
                <div class="modal-properties" id="modal-properties">
                    <!-- Properties will be inserted here -->
                </div>
            </div>
        `;
        document.body.appendChild(this.modal);
        
        // Get references
        this.canvas = document.getElementById('tree-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.nodeButtonsContainer = document.getElementById('node-buttons-container');
        
        // Setup event listeners
        this.setupEvents();
        
        // Add styles
        this.addStyles();
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #upgrade-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(10, 10, 15, 0.97);
                z-index: 1000;
                display: none;
                flex-direction: column;
                align-items: center;
                font-family: 'Outfit', sans-serif;
            }
            
            #upgrade-overlay.visible {
                display: flex;
            }
            
            .upgrade-header {
                width: 100%;
                padding: 24px 40px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                box-sizing: border-box;
            }
            
            .upgrade-header h2 {
                font-size: 24px;
                font-weight: 300;
                letter-spacing: 4px;
                text-transform: uppercase;
                color: #fff;
                margin: 0;
            }
            
            .currency-display {
                display: flex;
                align-items: center;
                gap: 8px;
                background: rgba(255, 215, 0, 0.1);
                padding: 8px 16px;
                border-radius: 20px;
                border: 1px solid rgba(255, 215, 0, 0.3);
            }
            
            .debug-btn {
                width: 24px;
                height: 24px;
                border: 1px solid rgba(255, 215, 0, 0.4);
                background: rgba(255, 215, 0, 0.1);
                color: #ffd700;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.15s ease;
            }
            
            .debug-btn:hover {
                background: rgba(255, 215, 0, 0.3);
                border-color: #ffd700;
            }
            
            .currency-icon {
                color: #ffd700;
                font-size: 18px;
            }
            
            .currency-amount {
                color: #ffd700;
                font-size: 20px;
                font-weight: 600;
            }
            
            .currency-label {
                color: rgba(255, 215, 0, 0.6);
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .close-btn {
                background: none;
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: rgba(255, 255, 255, 0.5);
                width: 40px;
                height: 40px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 18px;
                transition: all 0.2s ease;
            }
            
            .close-btn:hover {
                border-color: rgba(255, 255, 255, 0.5);
                color: #fff;
                background: rgba(255, 255, 255, 0.1);
            }
            
            #tree-canvas {
                display: block;
                position: absolute;
                top: 0;
                left: 0;
            }
            
            .tree-canvas-container {
                position: relative;
                flex: 1;
                width: 100%;
                overflow: hidden;
            }
            
            #node-buttons-container {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
            }
            
            .node-button {
                position: absolute;
                width: 50px;
                height: 50px;
                border: none;
                background: transparent;
                cursor: pointer;
                pointer-events: auto;
                border-radius: 10px;
                transform: translate(-50%, -50%);
                transition: background 0.2s;
            }
            
            .node-button.locked {
                cursor: default;
            }
            
            .node-button:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            
            .node-button.locked:hover {
                background: transparent;
            }
            
            .upgrade-footer {
                padding: 16px;
                color: rgba(255, 255, 255, 0.3);
                font-size: 12px;
                letter-spacing: 1px;
            }
            
            /* Modal Styles */
            #upgrade-modal {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.9);
                z-index: 1001;
                opacity: 0;
                pointer-events: none;
                transition: all 0.2s ease;
            }
            
            #upgrade-modal.visible {
                opacity: 1;
                pointer-events: auto;
                transform: translate(-50%, -50%) scale(1);
            }
            
            .modal-content {
                background: linear-gradient(135deg, rgba(30, 30, 40, 0.98), rgba(20, 20, 30, 0.98));
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 16px;
                padding: 24px;
                min-width: 320px;
                max-width: 400px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            }
            
            .modal-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
            }
            
            .modal-icon {
                font-size: 28px;
                width: 48px;
                height: 48px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 12px;
            }
            
            .modal-header h3 {
                flex: 1;
                margin: 0;
                font-size: 20px;
                font-weight: 400;
                color: #fff;
            }
            
            .modal-close {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.4);
                font-size: 20px;
                cursor: pointer;
                padding: 4px;
                transition: color 0.2s;
            }
            
            .modal-close:hover {
                color: #fff;
            }
            
            .modal-description {
                color: rgba(255, 255, 255, 0.5);
                font-size: 13px;
                line-height: 1.5;
                margin: 0 0 16px 0;
            }
            
            .modal-level {
                display: flex;
                justify-content: space-between;
                padding: 12px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                margin-bottom: 16px;
                font-size: 14px;
            }
            
            .modal-level span:first-child {
                color: rgba(255, 255, 255, 0.5);
            }
            
            .modal-level span:last-child {
                color: #ffd700;
                font-weight: 600;
            }
            
            .modal-properties {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .property-row {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                background: rgba(255, 255, 255, 0.03);
                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .property-icon {
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                font-size: 14px;
            }
            
            .property-info {
                flex: 1;
            }
            
            .property-name {
                font-size: 13px;
                color: #fff;
                margin-bottom: 2px;
            }
            
            .property-desc {
                font-size: 11px;
                color: rgba(255, 255, 255, 0.4);
            }
            
            .property-controls {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .property-level {
                min-width: 40px;
                text-align: center;
                font-size: 14px;
                color: #fff;
            }
            
            .property-btn {
                width: 28px;
                height: 28px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                background: rgba(255, 255, 255, 0.05);
                color: rgba(255, 255, 255, 0.6);
                border-radius: 6px;
                cursor: pointer;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.15s ease;
            }
            
            .property-btn:hover:not(:disabled) {
                background: rgba(255, 255, 255, 0.15);
                border-color: rgba(255, 255, 255, 0.4);
                color: #fff;
            }
            
            .property-btn:disabled {
                opacity: 0.3;
                cursor: not-allowed;
            }
            
            .property-btn.minus:hover:not(:disabled) {
                border-color: rgba(255, 0, 102, 0.5);
                color: #ff0066;
            }
            
            .property-btn.plus:hover:not(:disabled) {
                border-color: rgba(0, 212, 255, 0.5);
                color: #00d4ff;
            }
            
            .property-value {
                font-size: 11px;
                color: rgba(100, 200, 255, 0.8);
                font-weight: 500;
            }
            
            .property-cost {
                font-size: 11px;
                color: rgba(255, 215, 0, 0.8);
                min-width: 30px;
                text-align: center;
            }
        `;
        document.head.appendChild(style);
    }
    
    setupEvents() {
        // Close button
        document.getElementById('close-tree').addEventListener('click', () => this.hide());
        document.getElementById('close-modal').addEventListener('click', () => this.closeModal());
        
        // Debug buttons for testing
        document.getElementById('debug-plus').addEventListener('click', (e) => {
            e.stopPropagation();
            this.tree.addCurrency(10);
            this.tree.save();
            this.updateCurrencyDisplay();
        });
        
        document.getElementById('debug-minus').addEventListener('click', (e) => {
            e.stopPropagation();
            this.tree.currency = Math.max(0, this.tree.currency - 10);
            this.tree.save();
            this.updateCurrencyDisplay();
        });
        
        // Canvas click for node selection - use overlay click and calculate canvas coords
        this.canvas.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleCanvasClick(e);
        });
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMove(e));
        
        // Also listen on overlay for clicks that might not hit canvas directly
        this.overlay.addEventListener('click', (e) => {
            // If clicked on footer or header area, check if it's actually over a node
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Only process if click is within canvas bounds
            if (x >= 0 && x <= this.canvas.width && y >= 0 && y <= this.canvas.height) {
                const node = this.getNodeAtPosition(x, y);
                if (node) {
                    e.stopPropagation();
                    this.openModal(node);
                    return;
                }
            }
            
            // Close modal if clicking outside nodes
            if (e.target === this.overlay) {
                this.closeModal();
            }
        });
        
        // Escape to close
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                if (this.modalVisible) {
                    this.closeModal();
                } else if (this.visible) {
                    this.hide();
                }
            }
        });
    }
    
    // ============================================
    // RADIAL LAYOUT CALCULATION
    // ============================================
    
    calculateLayout() {
        this.nodePositions.clear();
        
        // Get the root node
        const root = this.tree.getNode(this.tree.rootId);
        if (!root) return;
        
        // Start recursive layout from root
        this.layoutNode(root, this.centerX, this.centerY, 0);
    }
    
    layoutNode(node, x, y, depth) {
        // Store this node's position
        this.nodePositions.set(node.id, { x, y, depth });
        
        // Get children of this node
        const children = this.tree.getChildren(node.id);
        if (children.length === 0) return;
        
        // Calculate positions for children using radial fan layout
        const childPositions = this.calculateChildPositions(x, y, children.length, depth);
        
        // Recursively layout children
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const pos = childPositions[i];
            this.layoutNode(child, pos.x, pos.y, depth + 1);
        }
    }
    
    calculateChildPositions(parentX, parentY, childCount, depth) {
        if (childCount === 0) return [];
        
        const config = LAYOUT_CONFIG;
        const spreadConfig = config.spreadAngles[Math.min(childCount, 6)] || config.spreadAngles[6];
        const radiusScale = config.radiusScale[Math.min(childCount, 6)] || config.radiusScale[6];
        const radius = config.baseRadius * radiusScale;
        
        const positions = [];
        
        for (let i = 0; i < childCount; i++) {
            // Calculate angle (interpolate between start and end)
            let t;
            if (childCount === 1) {
                t = 0.5; // Center for single child
            } else {
                t = i / (childCount - 1);
            }
            
            const angleDegrees = spreadConfig.start + (spreadConfig.end - spreadConfig.start) * t;
            const angleRadians = angleDegrees * Math.PI / 180;
            
            // Calculate position relative to parent
            // 90° is straight down, angles fan out from there
            const x = parentX + Math.cos(angleRadians) * radius;
            const y = parentY + Math.sin(angleRadians) * radius;
            
            positions.push({ x, y, angle: angleDegrees });
        }
        
        return positions;
    }
    
    getTreeDepth() {
        // Calculate the maximum depth of the tree
        const root = this.tree.getNode(this.tree.rootId);
        if (!root) return 0;
        
        const calculateDepth = (nodeId, currentDepth) => {
            const children = this.tree.getChildren(nodeId);
            if (children.length === 0) return currentDepth;
            
            let maxChildDepth = currentDepth;
            for (const child of children) {
                const childDepth = calculateDepth(child.id, currentDepth + 1);
                maxChildDepth = Math.max(maxChildDepth, childDepth);
            }
            return maxChildDepth;
        };
        
        return calculateDepth(root.id, 0);
    }
    
    getNodeScreenPosition(node) {
        const pos = this.nodePositions.get(node.id);
        if (pos) {
            return { x: pos.x, y: pos.y };
        }
        // Fallback to old method if layout hasn't been calculated
        return { x: this.centerX, y: this.centerY };
    }
    
    getNodeAtPosition(mouseX, mouseY) {
        for (const node of this.tree.getAllNodes()) {
            const pos = this.getNodeScreenPosition(node);
            const dx = mouseX - pos.x;
            const dy = mouseY - pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < this.nodeSize / 2 + 5) {
                return node;
            }
        }
        return null;
    }
    
    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const node = this.getNodeAtPosition(x, y);
        
        if (node) {
            e.preventDefault();
            this.openModal(node);
        }
    }
    
    handleCanvasMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.hoverNode = this.getNodeAtPosition(x, y);
        this.canvas.style.cursor = this.hoverNode ? 'pointer' : 'default';
    }
    
    openModal(node) {
        if (!node.isUnlocked(this.tree)) return;
        this.selectedNode = node;
        this.modalVisible = true;
        this.modal.classList.add('visible');
        this.updateModal();
    }
    
    closeModal() {
        this.modalVisible = false;
        this.modal.classList.remove('visible');
        this.selectedNode = null;
        this.createNodeButtons(); // Refresh buttons in case unlock status changed
    }
    
    updateModal() {
        if (!this.selectedNode) return;
        
        const node = this.selectedNode;
        const isUnlocked = node.isUnlocked(this.tree);
        
        document.getElementById('modal-icon').textContent = node.icon;
        document.getElementById('modal-icon').style.color = node.color;
        document.getElementById('modal-title').textContent = node.name;
        document.getElementById('modal-description').textContent = node.description;
        const maxLevel = node.properties.reduce((sum, prop) => sum + prop.maxLevel, 0);
        const currentLevel = node.getLevel();
        const isNodeMaxed = currentLevel >= maxLevel;
        const modalLevelEl = document.getElementById('modal-level');
        if (isNodeMaxed) {
            modalLevelEl.textContent = `${currentLevel}/${maxLevel} ✓ MAXED`;
            modalLevelEl.style.color = '#00ff88';
        } else {
            modalLevelEl.textContent = `${currentLevel}/${maxLevel}`;
            modalLevelEl.style.color = '#ffd700';
        }
        
        const propsContainer = document.getElementById('modal-properties');
        propsContainer.innerHTML = '';
        
        for (const prop of node.properties) {
            const row = document.createElement('div');
            row.className = 'property-row';
            
            const upgradeCost = prop.getUpgradeCost();
            const canUpgrade = isUnlocked && prop.level < prop.maxLevel && this.tree.currency >= upgradeCost;
            const canRefund = prop.level > 0 && this.canRefundProperty(node, prop);
            
            const effectiveValue = prop.getValue();
            const formattedValue = prop.effectType === 'multiply' 
                ? `×${effectiveValue.toFixed(2)}` 
                : effectiveValue.toFixed(1);
            
            row.innerHTML = `
                <div class="property-icon" style="color: ${node.color}">${prop.icon}</div>
                <div class="property-info">
                    <div class="property-name">${prop.name}</div>
                    <div class="property-desc">${prop.description}</div>
                    <div class="property-value">Current: ${formattedValue}</div>
                </div>
                <div class="property-controls">
                    <button class="property-btn minus" data-prop="${prop.id}" ${!canRefund ? 'disabled' : ''}>−</button>
                    <span class="property-cost">${upgradeCost === Infinity ? 'MAX' : upgradeCost + '◆'}</span>
                    <button class="property-btn plus" data-prop="${prop.id}" ${!canUpgrade ? 'disabled' : ''}>+</button>
                    <span class="property-cost">${prop.level}/${prop.maxLevel}</span>
                </div>
            `;
            
            propsContainer.appendChild(row);
        }
        
        // Add button listeners
        propsContainer.querySelectorAll('.property-btn.plus').forEach(btn => {
            btn.addEventListener('click', () => {
                const propId = btn.dataset.prop;
                if (this.tree.upgradeProperty(node.id, propId)) {
                    this.updateModal();
                    this.updateCurrencyDisplay();
                    this.tree.save();
                }
            });
        });
        
        propsContainer.querySelectorAll('.property-btn.minus').forEach(btn => {
            btn.addEventListener('click', () => {
                const propId = btn.dataset.prop;
                if (this.tree.refundProperty(node.id, propId)) {
                    this.updateModal();
                    this.updateCurrencyDisplay();
                    this.tree.save();
                }
            });
        });
    }
    
    canRefundProperty(node, prop) {
        if (prop.level <= 0) return false;
        
        // Check if refunding would orphan children
        const children = this.tree.getChildren(node.id);
        for (const child of children) {
            if (child.hasInvestment() && node.getLevel() - 1 < child.requiredParentLevel) {
                return false;
            }
        }
        return true;
    }
    
    updateCurrencyDisplay() {
        document.getElementById('tree-currency').textContent = this.tree.currency;
    }
    
    show() {
        this.visible = true;
        this.overlay.classList.add('visible');
        this.resize();
        this.updateCurrencyDisplay();
        this.startRenderLoop();
    }
    
    hide() {
        this.visible = false;
        this.overlay.classList.remove('visible');
        this.closeModal();
        if (this.onClose) this.onClose();
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight - 140;
        this.centerX = this.canvas.width / 2;
        
        // Calculate tree height to center vertically
        // Estimate: we need to measure the actual tree depth
        const treeDepth = this.getTreeDepth();
        const treeHeight = treeDepth * LAYOUT_CONFIG.tierSpacing;
        
        // Center vertically with some top padding, ensuring root isn't too high
        this.centerY = Math.max(80, (this.canvas.height - treeHeight) / 2 + 40);
        
        // Recalculate layout
        this.calculateLayout();
        
        // Match button container to canvas size
        this.nodeButtonsContainer.style.width = `${this.canvas.width}px`;
        this.nodeButtonsContainer.style.height = `${this.canvas.height}px`;
        
        this.createNodeButtons();
    }
    
    createNodeButtons() {
        // Clear existing buttons
        this.nodeButtonsContainer.innerHTML = '';
        
        // Create a button for each node
        for (const node of this.tree.getAllNodes()) {
            const pos = this.getNodeScreenPosition(node);
            const isUnlocked = node.isUnlocked(this.tree);
            
            const btn = document.createElement('button');
            btn.className = `node-button ${!isUnlocked ? 'locked' : ''}`;
            btn.style.left = `${pos.x}px`;
            btn.style.top = `${pos.y}px`;
            btn.dataset.nodeId = node.id;
            btn.title = isUnlocked ? node.name : 'Locked';
            
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (node.isUnlocked(this.tree)) {
                    this.openModal(node);
                }
            });
            
            this.nodeButtonsContainer.appendChild(btn);
        }
    }
    
    startRenderLoop() {
        const render = () => {
            if (!this.visible) return;
            
            this.glowPhase += 0.03;
            this.updateEnergyParticles();
            this.render();
            requestAnimationFrame(render);
        };
        render();
    }
    
    // ============================================
    // ENERGY PARTICLE SYSTEM
    // ============================================
    
    updateEnergyParticles() {
        // Update existing particles
        this.energyParticles = this.energyParticles.filter(particle => {
            particle.progress += particle.speed;
            return particle.progress < 1;
        });
        
        // Spawn new particles on invested connections
        for (const node of this.tree.getAllNodes()) {
            if (node.parentId && node.hasInvestment()) {
                // Spawn particle occasionally
                if (Math.random() < 0.02) {
                    this.energyParticles.push({
                        nodeId: node.id,
                        progress: 0,
                        speed: 0.01 + Math.random() * 0.01,
                        color: node.color
                    });
                }
            }
        }
    }
    
    // ============================================
    // RENDERING
    // ============================================
    
    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw connections first (behind nodes)
        for (const node of this.tree.getAllNodes()) {
            if (node.parentId) {
                this.renderConnection(node);
            }
        }
        
        // Draw energy particles
        this.renderEnergyParticles();
        
        // Draw nodes
        for (const node of this.tree.getAllNodes()) {
            this.renderNode(node);
        }
    }
    
    renderConnection(node) {
        const ctx = this.ctx;
        const parent = this.tree.getNode(node.parentId);
        if (!parent) return;
        
        const startPos = this.getNodeScreenPosition(parent);
        const endPos = this.getNodeScreenPosition(node);
        
        const isUnlocked = node.isUnlocked(this.tree);
        const hasInvestment = node.hasInvestment();
        const parentHasInvestment = parent.hasInvestment();
        
        // Determine line style based on state
        let alpha, lineWidth, glowColor, dashPattern;
        
        if (hasInvestment) {
            // Invested state - full brightness, solid line
            alpha = 0.6;
            lineWidth = 3;
            glowColor = node.color;
            dashPattern = [];
        } else if (isUnlocked && parentHasInvestment) {
            // Unlockable state - pulsing, solid line
            alpha = 0.25 + Math.sin(this.glowPhase * 1.5) * 0.15;
            lineWidth = 2;
            glowColor = node.color;
            dashPattern = [];
        } else {
            // Locked state - dim, dashed line
            alpha = 0.12;
            lineWidth = 1;
            glowColor = null;
            dashPattern = [5, 8];
        }
        
        // Calculate control point for bezier curve
        const midX = (startPos.x + endPos.x) / 2;
        const midY = startPos.y + (endPos.y - startPos.y) * 0.4;
        
        // Draw glow layer
        if (glowColor) {
            ctx.beginPath();
            ctx.moveTo(startPos.x, startPos.y + this.nodeSize / 2);
            ctx.quadraticCurveTo(midX, midY, endPos.x, endPos.y - this.nodeSize / 2);
            ctx.strokeStyle = glowColor;
            ctx.lineWidth = lineWidth + 8;
            ctx.globalAlpha = alpha * 0.2;
            ctx.setLineDash([]);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        
        // Draw main line
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y + this.nodeSize / 2);
        ctx.quadraticCurveTo(midX, midY, endPos.x, endPos.y - this.nodeSize / 2);
        
        if (dashPattern.length > 0) {
            ctx.strokeStyle = `rgba(100, 100, 120, ${alpha})`;
            ctx.setLineDash(dashPattern);
        } else {
            ctx.strokeStyle = glowColor ? glowColor : `rgba(255, 255, 255, ${alpha})`;
            ctx.setLineDash([]);
        }
        
        ctx.lineWidth = lineWidth;
        ctx.globalAlpha = dashPattern.length > 0 ? 1 : alpha;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
    }
    
    renderEnergyParticles() {
        const ctx = this.ctx;
        
        for (const particle of this.energyParticles) {
            const node = this.tree.getNode(particle.nodeId);
            if (!node || !node.parentId) continue;
            
            const parent = this.tree.getNode(node.parentId);
            if (!parent) continue;
            
            const startPos = this.getNodeScreenPosition(parent);
            const endPos = this.getNodeScreenPosition(node);
            
            // Calculate position along bezier curve
            const t = particle.progress;
            const midX = (startPos.x + endPos.x) / 2;
            const midY = startPos.y + (endPos.y - startPos.y) * 0.4;
            
            // Quadratic bezier formula
            const x = Math.pow(1-t, 2) * startPos.x + 
                     2 * (1-t) * t * midX + 
                     Math.pow(t, 2) * endPos.x;
            const y = Math.pow(1-t, 2) * (startPos.y + this.nodeSize / 2) + 
                     2 * (1-t) * t * midY + 
                     Math.pow(t, 2) * (endPos.y - this.nodeSize / 2);
            
            // Draw particle with glow
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = particle.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = particle.color;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }
    
    renderNode(node) {
        const ctx = this.ctx;
        const pos = this.getNodeScreenPosition(node);
        const size = this.nodeSize;
        const halfSize = size / 2;
        const radius = 10;
        
        const isUnlocked = node.isUnlocked(this.tree);
        const hasInvestment = node.hasInvestment();
        const level = node.getLevel();
        const maxLevel = node.properties.reduce((sum, prop) => sum + prop.maxLevel, 0);
        const isMaxed = level >= maxLevel && hasInvestment;
        const isHovered = this.hoverNode === node;
        
        // Determine visual state
        let bgAlpha, borderAlpha, iconAlpha, glowIntensity;
        let isLocked = !isUnlocked;
        let isUnlockable = isUnlocked && !hasInvestment;
        let parentHasInvestment = true;
        
        if (!node.isRoot && node.parentId) {
            const parent = this.tree.getNode(node.parentId);
            if (parent) {
                parentHasInvestment = parent.hasInvestment();
            }
        }
        
        if (isMaxed) {
            // Maxed state - special green glow
            bgAlpha = 0.85;
            borderAlpha = 0.9;
            iconAlpha = 1;
            glowIntensity = 0.4 + Math.sin(this.glowPhase * 1.5) * 0.1;
        } else if (hasInvestment) {
            // Invested state - bright and glowing
            bgAlpha = 0.8;
            borderAlpha = 0.8;
            iconAlpha = 1;
            glowIntensity = 0.35 + Math.sin(this.glowPhase * 1.5) * 0.1;
        } else if (isUnlockable && parentHasInvestment) {
            // Unlockable state - pulsing glow
            bgAlpha = 0.5;
            borderAlpha = 0.4 + Math.sin(this.glowPhase * 1.5) * 0.2;
            iconAlpha = 0.65;
            glowIntensity = 0.15 + Math.sin(this.glowPhase * 1.5) * 0.12;
        } else if (isUnlocked) {
            // Unlocked but parent not invested - dim
            bgAlpha = 0.35;
            borderAlpha = 0.25;
            iconAlpha = 0.45;
            glowIntensity = 0;
        } else {
            // Locked state - gray and faded
            bgAlpha = 0.25;
            borderAlpha = 0.15;
            iconAlpha = 0.3;
            glowIntensity = 0;
        }
        
        if (isHovered && isUnlocked) {
            bgAlpha += 0.15;
            borderAlpha += 0.2;
            glowIntensity += 0.15;
        }
        
        // Determine colors based on state
        let nodeColor, iconColor, borderColor;
        
        if (isMaxed) {
            // Maxed state - green color scheme
            nodeColor = '#00ff88';
            iconColor = node.color;
            borderColor = '#00ff88';
        } else if (hasInvestment || (isUnlockable && parentHasInvestment)) {
            nodeColor = node.color;
            iconColor = node.color;
            borderColor = node.color;
        } else {
            nodeColor = '#666677';
            iconColor = isUnlocked ? `rgba(255, 255, 255, ${iconAlpha})` : `rgba(120, 120, 140, ${iconAlpha})`;
            borderColor = isUnlocked ? `rgba(255, 255, 255, ${borderAlpha})` : `rgba(100, 100, 120, ${borderAlpha})`;
        }
        
        // Draw outer glow
        if (glowIntensity > 0) {
            const gradient = ctx.createRadialGradient(
                pos.x, pos.y, halfSize * 0.3,
                pos.x, pos.y, halfSize * 2.2
            );
            gradient.addColorStop(0, `${nodeColor}${Math.floor(glowIntensity * 100).toString(16).padStart(2, '0')}`);
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(pos.x - halfSize * 2.5, pos.y - halfSize * 2.5, size * 2.5, size * 2.5);
        }
        
        // Draw background
        ctx.beginPath();
        ctx.roundRect(pos.x - halfSize, pos.y - halfSize, size, size, radius);
        ctx.fillStyle = `rgba(25, 25, 35, ${bgAlpha + 0.7})`;
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = hasInvestment ? 2 : 1;
        ctx.stroke();
        
        // Draw icon
        ctx.font = '22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = iconColor;
        ctx.fillText(node.icon, pos.x, pos.y - 2);
        
        // Determine level/requirement text
        let levelText, levelColor;
        
        if (isMaxed) {
            // Show MAX text for fully upgraded nodes
            levelText = 'MAX';
            levelColor = '#00ff88'; // Green color for maxed
        } else if (hasInvestment) {
            // Show level number in gold
            levelText = level.toString();
            levelColor = '#ffd700';
        } else if (isLocked) {
            // Show negative number indicating levels needed
            const parent = this.tree.getNode(node.parentId);
            if (parent) {
                const diff = parent.getLevel() - node.requiredParentLevel;
                if (diff < 0) {
                    levelText = diff.toString();
                    levelColor = 'rgba(150, 150, 170, 0.7)';
                } else {
                    levelText = '0';
                    levelColor = 'rgba(150, 150, 170, 0.5)';
                }
            } else {
                levelText = '0';
                levelColor = 'rgba(150, 150, 170, 0.5)';
            }
        } else {
            // Unlocked but not invested - show 0
            levelText = '0';
            levelColor = 'rgba(255, 255, 255, 0.4)';
        }
        
        // Draw level indicator below icon
        ctx.font = '600 13px Outfit, sans-serif';
        ctx.fillStyle = levelColor;
        ctx.fillText(levelText, pos.x, pos.y + halfSize + 14);
        
        // Draw maxed indicator (checkmark badge) in top-right corner
        if (isMaxed) {
            const badgeX = pos.x + halfSize - 4;
            const badgeY = pos.y - halfSize + 4;
            const badgeSize = 14;
            
            // Draw badge background
            ctx.beginPath();
            ctx.arc(badgeX, badgeY, badgeSize / 2, 0, Math.PI * 2);
            ctx.fillStyle = '#00ff88';
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#00ff88';
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Draw checkmark
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(badgeX - 3, badgeY);
            ctx.lineTo(badgeX - 1, badgeY + 2);
            ctx.lineTo(badgeX + 3, badgeY - 2);
            ctx.stroke();
        }
        
        // Draw name below level (only if invested or hovered)
        if (hasInvestment || (isHovered && isUnlocked)) {
            ctx.font = '11px Outfit, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillText(node.name, pos.x, pos.y + halfSize + 28);
        }
    }
}
