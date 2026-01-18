# Multi-Child Upgrade Tree Design Plan

## Overview
Redesign the upgrade tree view to support 0-6 children per node using a flexible radial/fan layout that adapts to child count. The design maintains the existing neon/cyberpunk aesthetic while clearly communicating node states and unlock requirements.

## Design Requirements Summary

| Requirement | Solution |
|-------------|----------|
| Support 0-6 children per node | Adaptive radial fan layout |
| Align with game aesthetic | Neon/cyberpunk colors, glowing effects |
| Show important information | Unlock requirements on nodes, level indicators |
| Communicate affordances | Distinct visual states for locked/unlockable/invested |

---

## Layout System

### Radial Fan Layout Algorithm

The layout calculates child positions based on child count, creating a balanced fan pattern below each parent.

```
Child Count → Layout Strategy

1 child:     Directly below parent (0°)
               ○
               │
               ●

2 children:  Symmetric spread (-30°, +30°)
               ○
              ╱ ╲
             ●   ●

3 children:  Equal spread (-45°, 0°, +45°)
               ○
             ╱ │ ╲
            ●  ●  ●

4 children:  Equal spread (-60°, -20°, +20°, +60°)
               ○
           ╱ ╱   ╲ ╲
          ●  ●   ●  ●

5 children:  Equal spread (-75°, -37.5°, 0°, +37.5°, +75°)
               ○
         ╱╱  │  ╲╲
        ●  ● ● ●  ●

6 children:  Equal spread (-80°, -48°, -16°, +16°, +48°, +80°)
               ○
       ╱╱  ╱  ╲  ╲╲
      ●  ●  ●  ●  ●  ●
```

### Layout Configuration

```javascript
const LAYOUT_CONFIG = {
    // Base spacing between tiers
    tierSpacing: 120,
    
    // Radial spread angles by child count
    spreadAngles: {
        1: { start: 90, end: 90 },      // Straight down
        2: { start: 60, end: 120 },     // 60° spread
        3: { start: 45, end: 135 },     // 90° spread
        4: { start: 30, end: 150 },     // 120° spread
        5: { start: 15, end: 165 },     // 150° spread
        6: { start: 10, end: 170 }      // 160° spread
    },
    
    // Distance from parent (can scale with child count)
    baseRadius: 100,
    radiusScale: {
        1: 1.0,
        2: 1.0,
        3: 1.1,
        4: 1.2,
        5: 1.3,
        6: 1.4
    },
    
    // Node sizing
    nodeSize: 50,
    minNodeSpacing: 20
};
```

### Position Calculation

```javascript
// Calculate positions for children of a parent node
function calculateChildPositions(parent, children, config) {
    const count = children.length;
    if (count === 0) return [];
    
    const { start, end } = config.spreadAngles[count];
    const radius = config.baseRadius * config.radiusScale[count];
    
    const positions = [];
    
    for (let i = 0; i < count; i++) {
        // Calculate angle (interpolate between start and end)
        const t = count === 1 ? 0.5 : i / (count - 1);
        const angleDegrees = start + (end - start) * t;
        const angleRadians = angleDegrees * Math.PI / 180;
        
        // Calculate position relative to parent
        const x = parent.x + Math.cos(angleRadians) * radius;
        const y = parent.y + Math.sin(angleRadians) * radius;
        
        positions.push({ x, y, angle: angleDegrees });
    }
    
    return positions;
}
```

---

## Visual States

### State Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                       NODE VISUAL STATES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   LOCKED    │  │ UNLOCKABLE  │  │  INVESTED   │            │
│  │             │  │             │  │             │            │
│  │  Gray/Faded │  │  Pulsing    │  │  Glowing    │            │
│  │  Dashed     │  │  Glow       │  │  Bright     │            │
│  │  Connection │  │  Full Color │  │  Full Color │            │
│  │             │  │             │  │             │            │
│  │ Shows -X    │  │ Shows 0     │  │ Shows Level │            │
│  │ requirement │  │ or level    │  │ Number      │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Detailed Visual Specifications

#### 1. Locked State
- **Node Background**: `rgba(30, 30, 40, 0.4)` - Darker, faded
- **Node Border**: `rgba(100, 100, 110, 0.3)` - Gray, subtle
- **Icon**: `rgba(150, 150, 160, 0.4)` - Desaturated, faded
- **Glow**: None
- **Text**: Shows negative number like `-3` indicating levels needed
- **Connection Line**: Dashed, `rgba(100, 100, 110, 0.2)`, 1px width

```
      ┌─────────┐
      │  Gray   │
      │  ✧  -3  │  ← Shows 3 levels needed in parent
      │         │
      └─────────┘
           ┊      ← Dashed connection
           ┊
```

#### 2. Unlockable State (Parent meets requirement, no investment yet)
- **Node Background**: `rgba(30, 30, 40, 0.6)` - Slightly brighter
- **Node Border**: Node color at 50% opacity, animated pulse
- **Icon**: Node color at 70% opacity
- **Glow**: Soft pulsing radial gradient, node color at 15-25% opacity
- **Text**: Shows `0` or level number if invested
- **Connection Line**: Solid, node color at 30% opacity, 2px width, animated pulse

```
      ┌─────────┐
      │ ✨ Glow │
      │   ✧ 0   │  ← Ready to invest
      │ Pulsing │
      └─────────┘
           │      ← Solid, pulsing connection
           │
```

#### 3. Invested State (Has levels)
- **Node Background**: `rgba(30, 30, 40, 0.8)` - Full brightness
- **Node Border**: Node color at 80% opacity, 2px width
- **Icon**: Node color at 100% opacity
- **Glow**: Strong radial gradient, node color at 30-50% opacity
- **Text**: Shows current level number, gold color
- **Connection Line**: Solid, node color at 60% opacity, 3px width, energy flow animation

```
      ┌─────────┐
      │ ✨✨✨  │
      │   ✧ 5   │  ← Level 5 invested (gold text)
      │ Glowing │
      └─────────┘
           │ ⚡    ← Solid with energy particles
           │
```

### Connection Line Rendering

```javascript
// Connection line visual states
const CONNECTION_STATES = {
    locked: {
        dashPattern: [5, 8],      // Dashed line
        color: rgba(100, 100, 110, 0.2),
        width: 1,
        glow: false
    },
    unlockable: {
        dashPattern: [],          // Solid line
        color: node => `${node.color}4D`,  // 30% opacity
        width: 2,
        glow: true,
        glowIntensity: 0.15,
        pulseAnimation: true
    },
    invested: {
        dashPattern: [],          // Solid line
        color: node => `${node.color}99`,  // 60% opacity
        width: 3,
        glow: true,
        glowIntensity: 0.3,
        energyFlow: true          // Animated particles
    }
};
```

---

## Node Design

### Node Structure

```
┌─────────────────────────────────────────────┐
│              NODE ANATOMY                    │
├─────────────────────────────────────────────┤
│                                             │
│    ╭──────────────────────╮                │
│    │  ┌────────────────┐  │ ← Outer Glow   │
│    │  │ ┌────────────┐ │  │   (radial)     │
│    │  │ │            │ │  │                │
│    │  │ │    ✧       │ │  │ ← Icon         │
│    │  │ │            │ │  │                │
│    │  │ └────────────┘ │  │ ← Border       │
│    │  └────────────────┘  │   (animated)   │
│    │          5           │ ← Level/Req    │
│    │      Node Name       │ ← Name (hover) │
│    ╰──────────────────────╯                │
│                                             │
└─────────────────────────────────────────────┘
```

### Node Rendering Order

1. **Outer Glow Layer** - Radial gradient, softest
2. **Background Layer** - Rounded rectangle with gradient
3. **Border Layer** - Animated stroke
4. **Icon Layer** - Centered icon with optional glow
5. **Level Indicator** - Below icon, inside node
6. **Name Label** - Below node (shown on hover or if invested)

### Level/Requirement Display

The level indicator serves dual purpose:

| State | Display | Color | Example |
|-------|---------|-------|---------|
| Locked | Negative levels needed | Gray | `-3` |
| Unlockable (0 invested) | Zero | White | `0` |
| Invested | Current level | Gold | `5` |

---

## Information Hierarchy

### What Users See at a Glance

```
Level 1 - Structural Overview (no focus)
├── Tree structure and branches visible
├── Color-coding shows upgrade categories
└── Brightness indicates investment level

Level 2 - State Recognition (scanning)
├── Locked nodes: Gray, dashed connections
├── Unlockable nodes: Pulsing glow
├── Invested nodes: Bright, glowing
└── Unlock requirements visible on locked nodes

Level 3 - Node Details (hover/click)
├── Node name appears below
├── Tooltip with description (optional)
└── Click opens modal with all properties
```

### Visual Affordances

| User Question | Visual Answer |
|---------------|---------------|
| Can I click this node? | Pulsing glow = yes, Gray = no |
| What do I need to unlock this? | Number on locked node shows levels needed |
| How invested is this node? | Level number and glow intensity |
| What category is this? | Color (cyan = attract, magenta = repel, etc.) |
| Which nodes are connected? | Connection lines show parent-child relationships |

---

## Layout Examples

### Current Tree Structure (Existing)

```
                        ● The Dot
                       /│╲
                      / │ ╲
                     /  │  ╲
              ◎ Attract ☠Ann  ◉ Repel
                │       │       │
             ✧ Law   💰Inv   ✦ Repel Field
                       │
                    ✿ Resurrection
                       │
                    ⚔ Hunter Killer
```

### With 6 Children from Root (Example)

```
                           ● The Dot
                    ╱─────╱│╲─────╲
                   ╱     ╱ │ ╲     ╲
                  ╱     ╱  │  ╲     ╲
                 ●     ●   ●   ●     ●     ●
             (child) (child) (child) (child) (child) (child)
              -80°   -48°   -16°   +16°   +48°   +80°
```

### Deep Nesting with Multiple Children

```
                              ● Root
                         ╱────│────╲
                        ●     ●     ●
                        │    /│╲    │
                        ●   ● ● ●   ●
                       /│╲   │     /│╲
                      ● ● ● ●    ● ● ●
```

---

## Connection Line Rendering

### Curved Bezier Connections

For visual elegance, connection lines follow quadratic Bezier curves:

```javascript
function drawConnection(ctx, parent, child, state) {
    const startX = parent.screenX;
    const startY = parent.screenY + nodeSize / 2;  // Bottom of parent
    const endX = child.screenX;
    const endY = child.screenY - nodeSize / 2;     // Top of child
    
    // Control point creates natural curve
    const controlX = (startX + endX) / 2;
    const controlY = startY + (endY - startY) * 0.6;
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(controlX, controlY, endX, endY);
    
    // Apply state-specific styling
    applyConnectionStyle(ctx, state);
    ctx.stroke();
}
```

### Connection Visual Enhancement

```
     Parent ●
            │╲
           ╱╱ ╲╲
          ╱╱   ╲╲    ← Bezier curves fan out naturally
         ●       ●
       Child    Child
```

---

## Animation System

### Pulse Animation (Unlockable Nodes)

```javascript
const pulseAnimation = {
    duration: 2000,  // 2 second cycle
    easing: t => Math.sin(t * Math.PI),  // Smooth sine wave
    properties: {
        glowIntensity: { min: 0.15, max: 0.35 },
        borderOpacity: { min: 0.3, max: 0.5 }
    }
};
```

### Energy Flow Animation (Invested Connections)

```javascript
const energyFlowAnimation = {
    particleCount: 3,
    speed: 0.5,           // Particles per second traveling the line
    particleSize: 3,
    particleColor: node => node.color,
    trailLength: 0.1      // 10% of line length
};
```

---

## Responsive Considerations

### Screen Size Adaptations

| Screen Size | Adjustment |
|-------------|------------|
| Large (>1200px) | Full node size, all labels visible |
| Medium (800-1200px) | Slightly reduced spacing, labels on hover |
| Small (<800px) | Compact nodes, essential info only, touch-friendly tap targets |

### Pan/Zoom Integration

The radial layout works well with the existing pan/zoom system (from the previous redesign plan):
- Initial view centers on root node
- Zoom out to see full tree structure
- Zoom in to focus on specific branches
- Pan to navigate between branches

---

## Color Scheme Reference

Following the existing neon/cyberpunk aesthetic:

| Branch | Primary Color | Hex | Usage |
|--------|---------------|-----|-------|
| Root (The Dot) | Pure White | #FFFFFF | Center node |
| Attract | Electric Blue/Cyan | #00D4FF | Attraction upgrades |
| Repel | Neon Pink/Magenta | #FF0066 | Repulsion upgrades |
| Attract Advanced | Teal | #00FFCC | Advanced attraction |
| Repel Advanced | Hot Pink | #FF3399 | Advanced repulsion |
| Annihilation | Burning Orange | #FFAA00 | Annihilation branch |
| Investment | Amber/Gold | #FFD700 | Investment upgrades |
| Resurrection | Pink | #FF66CC | Resurrection branch |
| Hunter Killer | Red | #FF4444 | Offensive upgrades |

### Locked State Grayscale

All nodes when locked use desaturated versions of their colors:
- Main color → Gray (#666677)
- Glow → None
- Text → Light gray (#888899)

---

## Implementation Plan

### Phase 1: Layout System
- [ ] Implement radial position calculation algorithm
- [ ] Update UpgradeNode to store calculated screen positions
- [ ] Test with varying child counts (1-6)
- [ ] Handle edge cases (0 children, deep nesting)

### Phase 2: Visual State System
- [ ] Implement three-state visual differentiation (locked/unlockable/invested)
- [ ] Add unlock requirement display on locked nodes
- [ ] Update connection line rendering with dashed/solid states
- [ ] Add animated pulse for unlockable nodes

### Phase 3: Connection Improvements
- [ ] Implement Bezier curve connections
- [ ] Add connection state styling
- [ ] Implement energy flow particles for invested connections
- [ ] Test with radial layout

### Phase 4: Polish
- [ ] Fine-tune spacing and sizing
- [ ] Optimize rendering performance
- [ ] Test with full tree configurations
- [ ] Add hover states and transitions

---

## Files to Modify

| File | Changes |
|------|---------|
| `upgrade-ui.js` | Layout calculation, rendering, visual states |
| `upgrade-config.js` | Add layout hints (optional child ordering) |
| `upgrades.js` | Add screen position properties if needed |

---

## Success Criteria

- [ ] Each node can have 0-6 children displayed clearly
- [ ] Radial fan layout adapts based on child count
- [ ] Locked nodes show unlock requirements directly on the node
- [ ] Locked nodes are visually distinct (gray/faded)
- [ ] Connection lines differentiate between locked/unlockable/invested
- [ ] Design matches existing neon/cyberpunk aesthetic
- [ ] Tree remains navigable and intuitive at any scale
