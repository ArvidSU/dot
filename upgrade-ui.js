// ============================================
// UPGRADE UI - Redesigned Tree Visualization
// ============================================

// ============================================
// ANIMATION ENGINE
// ============================================
class AnimationEngine {
    constructor() {
        this.animations = [];
    }
    
    add(animation) {
        this.animations.push(animation);
    }
    
    update(deltaTime) {
        this.animations = this.animations.filter(a => {
            a.update(deltaTime);
            return !a.isComplete;
        });
    }
    
    render(ctx) {
        this.animations.forEach(a => a.render(ctx));
    }
}

// ============================================
// PARTICLE SYSTEM
// ============================================
class Particle {
    constructor(x, y, color, velocity, life) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.velocity = velocity;
        this.life = life;
        this.maxLife = life;
        this.size = Math.random() * 3 + 1;
    }
    
    update(deltaTime) {
        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;
        this.life -= deltaTime;
        this.velocity.y += 0.1 * deltaTime; // Gravity
    }
    
    render(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = this.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
    }
    
    get isComplete() {
        return this.life <= 0;
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }
    
    emit(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 100 + 50;
            const velocity = {
                x: Math.cos(angle) * speed,
                y: Math.sin(angle) * speed
            };
            this.particles.push(new Particle(x, y, color, velocity, 1 + Math.random()));
        }
    }
    
    update(deltaTime) {
        this.particles = this.particles.filter(p => {
            p.update(deltaTime);
            return !p.isComplete;
        });
    }
    
    render(ctx) {
        this.particles.forEach(p => p.render(ctx));
    }
}

// ============================================
// CANVAS VIEW CONTROLLER
// ============================================
class CanvasViewController {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Viewport state
        this.offsetX = 0;
        this.offsetY = 0;
        this.zoom = 1;
        this.targetZoom = 1;
        this.minZoom = 0.5;
        this.maxZoom = 3;
        
        // Pan state
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.dragVelocity = { x: 0, y: 0 };
        
        // Animation
        this.zoomTransitionSpeed = 5;
    }
    
    // Coordinate conversion
    worldToScreen(x, y) {
        return {
            x: (x * this.zoom) + this.offsetX + this.canvas.width / 2,
            y: (y * this.zoom) + this.offsetY + this.canvas.height / 2
        };
    }
    
    screenToWorld(x, y) {
        return {
            x: (x - this.offsetX - this.canvas.width / 2) / this.zoom,
            y: (y - this.offsetY - this.canvas.height / 2) / this.zoom
        };
    }
    
    // Pan controls
    startPan(x, y) {
        this.isDragging = true;
        this.lastMouseX = x;
        this.lastMouseY = y;
        this.dragVelocity = { x: 0, y: 0 };
    }
    
    pan(x, y) {
        if (!this.isDragging) return;
        
        const dx = x - this.lastMouseX;
        const dy = y - this.lastMouseY;
        
        this.offsetX += dx;
        this.offsetY += dy;
        
        this.dragVelocity = { x: dx, y: dy };
        this.lastMouseX = x;
        this.lastMouseY = y;
    }
    
    endPan() {
        this.isDragging = false;
    }
    
    // Zoom controls
    zoomAt(x, y, delta) {
        const worldPos = this.screenToWorld(x, y);
        
        const zoomFactor = delta > 0 ? 0.9 : 1.1;
        this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetZoom * zoomFactor));
        
        // Adjust offset to zoom toward mouse position
        const newScreenPos = this.worldToScreen(worldPos.x, worldPos.y);
        this.offsetX += x - newScreenPos.x;
        this.offsetY += y - newScreenPos.y;
    }
    
    setZoom(zoom) {
        this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    }
    
    resetView() {
        this.targetZoom = 1;
        this.offsetX = 0;
        this.offsetY = 0;
    }
    
    focusOn(x, y) {
        this.offsetX = -x * this.zoom;
        this.offsetY = -y * this.zoom;
    }
    
    // Update smooth zoom transition
    update(deltaTime) {
        // Smooth zoom interpolation
        if (Math.abs(this.zoom - this.targetZoom) > 0.001) {
            this.zoom += (this.targetZoom - this.zoom) * this.zoomTransitionSpeed * deltaTime;
        }
        
        // Momentum for pan
        if (!this.isDragging) {
            this.offsetX += this.dragVelocity.x * 0.9;
            this.offsetY += this.dragVelocity.y * 0.9;
            this.dragVelocity.x *= 0.9;
            this.dragVelocity.y *= 0.9;
        }
    }
    
    // Clear canvas
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

// ============================================
// NODE RENDERER
// ============================================
class NodeRenderer {
    constructor(canvasController) {
        this.canvasController = canvasController;
        this.nodeSize = 50;
        this.nodeSpacing = 120;
    }
    
    getNodeScreenPosition(node) {
        return this.canvasController.worldToScreen(
            node.x * this.nodeSpacing,
            node.y * this.nodeSpacing
        );
    }
    
    renderNode(node, tree, hoverNode, glowPhase) {
        const ctx = this.canvasController.ctx;
        const pos = this.getNodeScreenPosition(node);
        const size = this.nodeSize * this.canvasController.zoom;
        const halfSize = size / 2;
        
        const isUnlocked = node.isUnlocked(tree);
        const hasInvestment = node.hasInvestment();
        const level = node.getLevel();
        const isHovered = hoverNode === node;
        
        // Determine visual state
        let bgAlpha = 0.1;
        let borderAlpha = 0.2;
        let iconAlpha = 0.4;
        let glowIntensity = 0;
        let scale = 1;
        
        if (hasInvestment) {
            bgAlpha = 0.2;
            borderAlpha = 0.6;
            iconAlpha = 1;
            glowIntensity = 0.4 + Math.sin(glowPhase * 1.5) * 0.1;
        } else if (isUnlocked) {
            const parent = tree.getNode(node.parentId);
            if (!parent || parent.hasInvestment()) {
                bgAlpha = 0.1;
                borderAlpha = 0.3 + Math.sin(glowPhase) * 0.1;
                iconAlpha = 0.6;
                glowIntensity = 0.15 + Math.sin(glowPhase) * 0.1;
            }
        }
        
        if (isHovered) {
            bgAlpha += 0.1;
            borderAlpha += 0.2;
            glowIntensity += 0.1;
            scale = 1.15;
        }
        
        const scaledSize = size * scale;
        const scaledHalfSize = scaledSize / 2;
        
        // Draw outer glow
        if (glowIntensity > 0) {
            const gradient = ctx.createRadialGradient(
                pos.x, pos.y, scaledHalfSize * 0.5,
                pos.x, pos.y, scaledHalfSize * 2.5
            );
            gradient.addColorStop(0, `${node.color}${Math.floor(glowIntensity * 80).toString(16).padStart(2, '0')}`);
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(pos.x - scaledHalfSize * 2.5, pos.y - scaledHalfSize * 2.5, scaledSize * 5, scaledSize * 5);
        }
        
        // Draw hexagonal background
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.scale(scale, scale);
        
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            const x = Math.cos(angle) * halfSize;
            const y = Math.sin(angle) * halfSize;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        
        ctx.fillStyle = `rgba(30, 30, 40, ${bgAlpha + 0.8})`;
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = hasInvestment ? node.color : `rgba(255, 255, 255, ${borderAlpha})`;
        ctx.lineWidth = hasInvestment ? 2 : 1;
        ctx.stroke();
        
        // Draw icon
        ctx.font = `${size * 0.4}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = hasInvestment ? node.color : `rgba(255, 255, 255, ${iconAlpha})`;
        ctx.fillText(node.icon, 0, -size * 0.05);
        
        ctx.restore();
        
        // Draw level indicator
        if (hasInvestment || isHovered) {
            const maxLevel = node.properties.reduce((sum, prop) => sum + prop.maxLevel, 0);
            ctx.font = `600 ${size * 0.25}px Outfit, sans-serif`;
            ctx.fillStyle = hasInvestment ? '#ffd700' : `rgba(255, 255, 255, ${iconAlpha * 0.6})`;
            ctx.textAlign = 'center';
            ctx.fillText(`${level}/${maxLevel}`, pos.x, pos.y + scaledHalfSize + size * 0.3);
        }
        
        // Draw progress ring for unlockable nodes
        if (!isUnlocked && node.parentId) {
            const parent = tree.getNode(node.parentId);
            if (parent) {
                const progress = Math.min(1, parent.getLevel() / node.requiredParentLevel);
                if (progress > 0) {
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, scaledHalfSize + 4, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress));
                    ctx.strokeStyle = `rgba(255, 255, 255, ${progress * 0.5})`;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }
        }
        
        // Draw name below node (only if invested or hovered)
        if (hasInvestment || isHovered) {
            ctx.font = `${size * 0.2}px Outfit, sans-serif`;
            ctx.fillStyle = `rgba(255, 255, 255, 0.5)`;
            ctx.textAlign = 'center';
            ctx.fillText(node.name, pos.x, pos.y + scaledHalfSize + size * 0.55);
        }
    }
    
    getNodeAtPosition(mouseX, mouseY, tree) {
        const worldPos = this.canvasController.screenToWorld(mouseX, mouseY);
        
        for (const node of tree.getAllNodes()) {
            const dx = worldPos.x - node.x * this.nodeSpacing;
            const dy = worldPos.y - node.y * this.nodeSpacing;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < this.nodeSize / 2) {
                return node;
            }
        }
        return null;
    }
}

// ============================================
// CONNECTION RENDERER
// ============================================
class ConnectionRenderer {
    constructor(canvasController, nodeRenderer) {
        this.canvasController = canvasController;
        this.nodeRenderer = nodeRenderer;
        this.energyParticles = [];
    }
    
    renderConnection(node, tree, glowPhase) {
        const ctx = this.canvasController.ctx;
        const parent = tree.getNode(node.parentId);
        if (!parent) return;
        
        const startPos = this.nodeRenderer.getNodeScreenPosition(parent);
        const endPos = this.nodeRenderer.getNodeScreenPosition(node);
        
        const isUnlocked = node.isUnlocked(tree);
        const hasInvestment = node.hasInvestment();
        const parentHasInvestment = parent.hasInvestment();
        
        // Determine line style
        let alpha = 0.15;
        let lineWidth = 2;
        let glowColor = null;
        
        if (hasInvestment) {
            alpha = 0.6;
            lineWidth = 3;
            glowColor = node.color;
        } else if (isUnlocked && parentHasInvestment) {
            alpha = 0.3 + Math.sin(glowPhase) * 0.15;
            lineWidth = 2;
            glowColor = node.color;
        }
        
        // Calculate bezier control points
        const midY = (startPos.y + endPos.y) / 2;
        const cp1 = { x: startPos.x, y: midY };
        const cp2 = { x: endPos.x, y: midY };
        
        // Draw glow
        if (glowColor) {
            ctx.beginPath();
            ctx.moveTo(startPos.x, startPos.y);
            ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, endPos.x, endPos.y);
            ctx.strokeStyle = glowColor;
            ctx.lineWidth = lineWidth + 6;
            ctx.globalAlpha = alpha * 0.3;
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        
        // Draw main line
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, endPos.x, endPos.y);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        
        // Draw energy flow particles
        if (hasInvestment || (isUnlocked && parentHasInvestment)) {
            this.updateEnergyParticles(node, startPos, endPos, cp1, cp2, glowColor || '#ffffff');
        }
    }
    
    updateEnergyParticles(node, startPos, endPos, cp1, cp2, color) {
        // Spawn new particles
        if (Math.random() < 0.02) {
            this.energyParticles.push({
                node: node,
                t: 0,
                speed: 0.01 + Math.random() * 0.01,
                color: color
            });
        }
        
        // Update and render particles
        this.energyParticles = this.energyParticles.filter(p => {
            p.t += p.speed;
            
            if (p.t >= 1) return false;
            
            // Calculate position on bezier curve
            const t = p.t;
            const mt = 1 - t;
            const x = mt * mt * mt * startPos.x + 
                      3 * mt * mt * t * cp1.x + 
                      3 * mt * t * t * cp2.x + 
                      t * t * t * endPos.x;
            const y = mt * mt * mt * startPos.y + 
                      3 * mt * mt * t * cp1.y + 
                      3 * mt * t * t * cp2.y + 
                      t * t * t * endPos.y;
            
            // Draw particle
            const ctx = this.canvasController.ctx;
            const size = 3 * this.canvasController.zoom;
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            
            // Draw trail
            ctx.beginPath();
            ctx.arc(x, y, size * 2, 0, Math.PI * 2);
            ctx.fillStyle = p.color + '40';
            ctx.fill();
            
            return true;
        });
    }
    
    clearEnergyParticles() {
        this.energyParticles = [];
    }
}

// ============================================
// MINI-MAP CONTROLLER
// ============================================
class MiniMapController {
    constructor(canvasController, nodeRenderer) {
        this.canvasController = canvasController;
        this.nodeRenderer = nodeRenderer;
        this.size = 150;
        this.canvas = null;
        this.ctx = null;
        this.visible = true;
    }
    
    createElements() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'minimap';
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        this.canvas.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            background: rgba(10, 10, 15, 0.8);
            cursor: pointer;
            z-index: 10;
        `;
        
        this.ctx = this.canvas.getContext('2d');
        
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
    }
    
    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Convert minimap coordinates to world coordinates
        const worldX = (x - this.size / 2) * 4;
        const worldY = (y - this.size / 2) * 4;
        
        this.canvasController.focusOn(worldX, worldY);
    }
    
    render(tree) {
        if (!this.visible || !this.ctx) return;
        
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.size, this.size);
        
        // Calculate bounds
        const nodes = tree.getAllNodes();
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (const node of nodes) {
            minX = Math.min(minX, node.x);
            maxX = Math.max(maxX, node.x);
            minY = Math.min(minY, node.y);
            maxY = Math.max(maxY, node.y);
        }
        
        const padding = 1;
        const rangeX = maxX - minX + padding * 2;
        const rangeY = maxY - minY + padding * 2;
        const scale = Math.min(this.size / rangeX, this.size / rangeY) * 0.8;
        
        const offsetX = this.size / 2 - (minX + maxX) / 2 * scale;
        const offsetY = this.size / 2 - (minY + maxY) / 2 * scale;
        
        // Draw connections
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (const node of nodes) {
            if (node.parentId) {
                const parent = tree.getNode(node.parentId);
                if (parent) {
                    ctx.beginPath();
                    ctx.moveTo(parent.x * scale + offsetX, parent.y * scale + offsetY);
                    ctx.lineTo(node.x * scale + offsetX, node.y * scale + offsetY);
                    ctx.stroke();
                }
            }
        }
        
        // Draw nodes
        for (const node of nodes) {
            const x = node.x * scale + offsetX;
            const y = node.y * scale + offsetY;
            const isUnlocked = node.isUnlocked(tree);
            const hasInvestment = node.hasInvestment();
            
            ctx.beginPath();
            ctx.arc(x, y, hasInvestment ? 4 : 3, 0, Math.PI * 2);
            
            if (hasInvestment) {
                ctx.fillStyle = node.color;
            } else if (isUnlocked) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            }
            ctx.fill();
        }
        
        // Draw viewport rectangle
        const viewportWidth = this.canvasController.canvas.width / this.canvasController.zoom / scale;
        const viewportHeight = this.canvasController.canvas.height / this.canvasController.zoom / scale;
        const viewportX = -this.canvasController.offsetX / this.canvasController.zoom / scale + this.size / 2;
        const viewportY = -this.canvasController.offsetY / this.canvasController.zoom / scale + this.size / 2;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight);
    }
}

// ============================================
// CONTROLS CONTROLLER
// ============================================
class ControlsController {
    constructor(canvasController) {
        this.canvasController = canvasController;
        this.container = null;
    }
    
    createElements() {
        this.container = document.createElement('div');
        this.container.id = 'zoom-controls';
        this.container.innerHTML = `
            <button class="zoom-btn" id="zoom-out" title="Zoom Out">−</button>
            <span class="zoom-level" id="zoom-level">100%</span>
            <button class="zoom-btn" id="zoom-in" title="Zoom In">+</button>
            <button class="zoom-btn" id="zoom-reset" title="Reset View">⟲</button>
        `;
        
        this.container.style.cssText = `
            position: absolute;
            bottom: 20px;
            right: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: rgba(10, 10, 15, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            z-index: 10;
        `;
        
        // Add event listeners
        this.container.querySelector('#zoom-in').addEventListener('click', () => {
            this.canvasController.setZoom(this.canvasController.targetZoom * 1.2);
        });
        
        this.container.querySelector('#zoom-out').addEventListener('click', () => {
            this.canvasController.setZoom(this.canvasController.targetZoom / 1.2);
        });
        
        this.container.querySelector('#zoom-reset').addEventListener('click', () => {
            this.canvasController.resetView();
        });
    }
    
    update() {
        const zoomLevel = Math.round(this.canvasController.zoom * 100);
        this.container.querySelector('#zoom-level').textContent = `${zoomLevel}%`;
    }
}

// ============================================
// MAIN UPGRADE UI CLASS
// ============================================
class UpgradeUI {
    constructor(tree, onClose) {
        this.tree = tree;
        this.onClose = onClose;
        this.visible = false;
        this.selectedNode = null;
        this.modalVisible = false;
        
        // Animation
        this.glowPhase = 0;
        this.hoverNode = null;
        
        // Create components
        this.createElements();
        this.initComponents();
        this.setupEvents();
        this.addStyles();
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
            </div>
            <div class="upgrade-footer">
                <p>Drag to pan • Scroll to zoom • Click nodes to upgrade</p>
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
    }
    
    initComponents() {
        // Get canvas reference
        this.canvas = document.getElementById('tree-canvas');
        
        // Initialize controllers
        this.canvasController = new CanvasViewController(this.canvas);
        this.nodeRenderer = new NodeRenderer(this.canvasController);
        this.connectionRenderer = new ConnectionRenderer(this.canvasController, this.nodeRenderer);
        this.miniMapController = new MiniMapController(this.canvasController, this.nodeRenderer);
        this.controlsController = new ControlsController(this.canvasController);
        
        // Initialize animation systems
        this.animationEngine = new AnimationEngine();
        this.particleSystem = new ParticleSystem();
        
        // Create UI elements
        this.miniMapController.createElements();
        this.controlsController.createElements();
        
        // Add to DOM
        this.overlay.querySelector('.tree-canvas-container').appendChild(this.miniMapController.canvas);
        this.overlay.querySelector('.tree-canvas-container').appendChild(this.controlsController.container);
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
        
        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
        
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
    
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Check if clicking on a node
        const node = this.nodeRenderer.getNodeAtPosition(x, y, this.tree);
        if (node && node.isUnlocked(this.tree)) {
            this.openModal(node);
            return;
        }
        
        // Start panning
        this.canvasController.startPan(x, y);
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Update hover state
        this.hoverNode = this.nodeRenderer.getNodeAtPosition(x, y, this.tree);
        this.canvas.style.cursor = this.hoverNode ? 'pointer' : 'grab';
        
        // Pan
        this.canvasController.pan(x, y);
    }
    
    handleMouseUp(e) {
        this.canvasController.endPan();
        this.canvas.style.cursor = this.hoverNode ? 'pointer' : 'grab';
    }
    
    handleWheel(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.canvasController.zoomAt(x, y, e.deltaY);
    }
    
    handleDoubleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const node = this.nodeRenderer.getNodeAtPosition(x, y, this.tree);
        if (node) {
            this.canvasController.focusOn(node.x * this.nodeRenderer.nodeSpacing, node.y * this.nodeRenderer.nodeSpacing);
        } else {
            this.canvasController.resetView();
        }
    }
    
    openModal(node) {
        if (!node.isUnlocked(this.tree)) return;
        this.selectedNode = node;
        this.modalVisible = true;
        this.modal.classList.add('visible');
        this.updateModal();
        
        // Emit particles
        const pos = this.nodeRenderer.getNodeScreenPosition(node);
        this.particleSystem.emit(pos.x, pos.y, node.color, 20);
    }
    
    closeModal() {
        this.modalVisible = false;
        this.modal.classList.remove('visible');
        this.selectedNode = null;
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
        document.getElementById('modal-level').textContent = `${node.getLevel()}/${maxLevel}`;
        
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
                    
                    // Emit particles
                    const pos = this.nodeRenderer.getNodeScreenPosition(node);
                    this.particleSystem.emit(pos.x, pos.y, node.color, 15);
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
        const container = this.overlay.querySelector('.tree-canvas-container');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    }
    
    startRenderLoop() {
        let lastTime = performance.now();
        
        const render = (currentTime) => {
            if (!this.visible) return;
            
            const deltaTime = (currentTime - lastTime) / 1000;
            lastTime = currentTime;
            
            this.update(deltaTime);
            this.render();
            
            requestAnimationFrame(render);
        };
        
        requestAnimationFrame(render);
    }
    
    update(deltaTime) {
        // Update animation phase
        this.glowPhase += deltaTime * 2;
        
        // Update canvas controller
        this.canvasController.update(deltaTime);
        
        // Update animations
        this.animationEngine.update(deltaTime);
        
        // Update particles
        this.particleSystem.update(deltaTime);
        
        // Update controls
        this.controlsController.update();
    }
    
    render() {
        const ctx = this.canvasController.ctx;
        
        // Clear canvas
        this.canvasController.clear();
        
        // Draw connections first
        for (const node of this.tree.getAllNodes()) {
            if (node.parentId) {
                this.connectionRenderer.renderConnection(node, this.tree, this.glowPhase);
            }
        }
        
        // Draw nodes
        for (const node of this.tree.getAllNodes()) {
            this.nodeRenderer.renderNode(node, this.tree, this.hoverNode, this.glowPhase);
        }
        
        // Draw particles
        this.particleSystem.render(ctx);
        
        // Draw minimap
        this.miniMapController.render(this.tree);
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
                font-family: 'Outfit', sans-serif;
            }
            
            #upgrade-overlay.visible {
                display: flex;
            }
            
            .upgrade-header {
                width: 100%;
                padding: 20px 32px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                box-sizing: border-box;
                background: rgba(0, 0, 0, 0.3);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .upgrade-header h2 {
                font-size: 20px;
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
            
            .tree-canvas-container {
                position: relative;
                flex: 1;
                width: 100%;
                overflow: hidden;
            }
            
            #tree-canvas {
                display: block;
                cursor: grab;
            }
            
            #tree-canvas:active {
                cursor: grabbing;
            }
            
            .zoom-btn {
                width: 28px;
                height: 28px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                background: rgba(255, 255, 255, 0.05);
                color: rgba(255, 255, 255, 0.7);
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.15s ease;
            }
            
            .zoom-btn:hover {
                background: rgba(255, 255, 255, 0.15);
                border-color: rgba(255, 255, 255, 0.4);
                color: #fff;
            }
            
            .zoom-level {
                color: rgba(255, 255, 255, 0.5);
                font-size: 12px;
                min-width: 45px;
                text-align: center;
            }
            
            .upgrade-footer {
                padding: 12px 32px;
                color: rgba(255, 255, 255, 0.3);
                font-size: 11px;
                letter-spacing: 1px;
                background: rgba(0, 0, 0, 0.3);
                border-top: 1px solid rgba(255, 255, 255, 0.1);
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
            
            .property-value {
                font-size: 11px;
                color: rgba(100, 200, 255, 0.8);
                font-weight: 500;
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
            
            .property-cost {
                font-size: 11px;
                color: rgba(255, 215, 0, 0.8);
                min-width: 30px;
                text-align: center;
            }
        `;
        document.head.appendChild(style);
    }
}
