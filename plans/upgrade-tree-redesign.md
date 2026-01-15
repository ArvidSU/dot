# Upgrade Tree Interface Redesign Plan

## Overview
Redesign the upgrade tree interface to support 20-30 nodes with pan/zoom navigation, neon/cyberpunk aesthetic, curved bezier connections with animated energy flow, and optimized screen real estate utilization.

## Requirements Summary
- **Scale**: 20-30 nodes (moderate expansion from current 8)
- **Navigation**: Pan and zoom canvas (drag to move, scroll to zoom)
- **Visual Style**: Neon/cyberpunk with glowing effects
- **Connection Lines**: Curved bezier lines with animated energy flow
- **Goals**: Maximize screen real estate, intuitive navigation, cohesive design language

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Upgrade Tree UI System                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Canvas View │  │  Mini-Map    │  │  Controls    │      │
│  │  Controller  │  │  Controller  │  │  Controller  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │              │
│         └─────────────────┼─────────────────┘              │
│                           │                                │
│                  ┌────────▼────────┐                       │
│                  │  Render Engine  │                       │
│                  └────────┬────────┘                       │
│                           │                                │
│  ┌────────────────────────┼────────────────────────┐      │
│  │                        │                        │      │
│  ▼                        ▼                        ▼      │
│ ┌────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│ │ Node   │  │Connection│  │ Animation│  │  Input   │    │
│ │Renderer│  │ Renderer │  │ Engine   │  │ Handler  │    │
│ └────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Detailed Component Design

### 1. Canvas View Controller

**Purpose**: Manage pan, zoom, and viewport transformations

**Key Features**:
- Smooth pan with mouse drag
- Zoom with mouse wheel (0.5x to 3x range)
- Smooth interpolation for zoom transitions
- Boundary constraints to prevent getting lost
- Double-click to reset view

**State Management**:
```javascript
{
  offsetX: 0,           // Pan offset X
  offsetY: 0,           // Pan offset Y
  zoom: 1,              // Current zoom level
  targetZoom: 1,        // Target zoom for smooth transitions
  isDragging: false,
  lastMouseX: 0,
  lastMouseY: 0
}
```

**Coordinate System**:
- World coordinates: Node positions in tree space
- Screen coordinates: Transformed for rendering
- Conversion functions for bidirectional mapping

### 2. Node Renderer

**Purpose**: Render upgrade nodes with enhanced visual hierarchy

**Visual States**:
1. **Locked**: Dimmed, desaturated, lock icon overlay
2. **Unlockable**: Pulsing glow, subtle border animation
3. **Unlocked**: Full color, visible but muted
4. **Invested**: Bright glow, active effects, level indicator
5. **Hovered**: Scale up, enhanced glow, tooltip preview

**Node Design**:
- Compact hexagonal shape (more space-efficient than rectangles)
- Size: 50px diameter (reduced from 60px)
- Multi-layered rendering:
  - Base layer: Dark background with subtle gradient
  - Glow layer: Radial gradient with color-specific glow
  - Border layer: Animated border with pulse effect
  - Icon layer: Centered icon with glow
  - Level indicator: Small badge showing current/max level
  - Progress ring: Circular progress around node

**Color Scheme** (Neon/Cyberpunk):
- Attract branch: Cyan (#00d4ff) → Electric Blue
- Repel branch: Magenta (#ff0066) → Neon Pink
- Investment: Gold (#ffd700) → Amber
- Annihilation: Orange (#ffaa00) → Burning Orange
- Resurrection: Pink (#ff66cc) → Hot Pink
- Root: White (#ffffff) → Pure White

### 3. Connection Renderer

**Purpose**: Draw curved bezier lines with animated energy flow

**Bezier Curve Algorithm**:
```javascript
// Control points for smooth S-curve
cp1 = {
  x: parent.x + (child.x - parent.x) * 0.5,
  y: parent.y
}
cp2 = {
  x: parent.x + (child.x - parent.x) * 0.5,
  y: child.y
}
```

**Visual States**:
1. **Inactive**: Dim, thin line (alpha: 0.15, width: 1px)
2. **Unlockable**: Pulsing, medium line (alpha: 0.3-0.5, width: 2px)
3. **Active**: Bright, thick line (alpha: 0.6-0.8, width: 3px)
4. **Energy Flow**: Animated particles traveling along curve

**Energy Flow Animation**:
- Particles spawn at parent node
- Travel along bezier curve to child
- Speed based on connection state
- Color matches child node color
- Trail effect for visual continuity

**Glow Effects**:
- Outer glow: Large, soft radial gradient
- Inner glow: Sharp, bright line
- Pulse animation: Sine wave on alpha

### 4. Animation Engine

**Purpose**: Manage all animations and transitions

**Animation Types**:
1. **Node Hover**: Scale (1.0 → 1.15), glow intensity increase
2. **Node Unlock**: Flash effect, particles burst
3. **Node Upgrade**: Level up animation, currency fly effect
4. **Connection Pulse**: Traveling wave along bezier
5. **Zoom Transition**: Smooth interpolation (lerp)
6. **Pan**: Direct mapping with momentum

**Animation System**:
```javascript
class AnimationEngine {
  animations = []
  
  add(animation) {
    this.animations.push(animation)
  }
  
  update(deltaTime) {
    this.animations = this.animations.filter(a => {
      a.update(deltaTime)
      return !a.isComplete
    })
  }
  
  render(ctx) {
    this.animations.forEach(a => a.render(ctx))
  }
}
```

### 5. Input Handler

**Purpose**: Process all user interactions

**Event Types**:
- Mouse down: Start pan or node selection
- Mouse move: Pan or hover detection
- Mouse up: End pan or trigger click
- Mouse wheel: Zoom in/out
- Double click: Reset view or focus node
- Keyboard: Escape to close, arrows to pan

**Hit Detection**:
- World-space hit testing for nodes
- Screen-space hit testing for UI controls
- Priority: UI controls > nodes > canvas

### 6. Mini-Map Controller

**Purpose**: Provide navigation overview

**Features**:
- Small canvas in corner (150x150px)
- Shows all nodes at reduced scale
- Viewport rectangle showing current view
- Click to jump to location
- Semi-transparent background

**Rendering**:
- Nodes as colored dots
- Connections as thin lines
- Viewport as white rectangle
- Current focus highlighted

### 7. Controls Controller

**Purpose**: Manage UI controls

**Controls**:
- Zoom buttons (+/-)
- Reset view button
- Zoom level indicator
- Filter toggles (show/hide locked, show/hide invested)

**Layout**:
- Bottom-right corner
- Compact, semi-transparent
- Hover to expand

---

## Screen Real Estate Optimization

### Layout Strategy

```
┌─────────────────────────────────────────────────────────┐
│  Header (60px)                                           │
│  ┌─────────────┐  Currency  ┌─────────────┐  Close     │
│  │ Title       │  Display   │  Controls   │  Button    │
│  └─────────────┘            └─────────────┘            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│                   Canvas Area (flex)                    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │                                                  │  │
│  │              Pan & Zoom Canvas                   │  │
│  │                                                  │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  Mini-Map (150x150)    Zoom Controls (compact)          │
│  Bottom-Left           Bottom-Right                     │
└─────────────────────────────────────────────────────────┘
```

### Space-Saving Techniques

1. **Compact Node Design**:
   - Hexagonal shape (more efficient than circles)
   - Reduced size: 50px (from 60px)
   - Smart spacing: 120px (from 140px)
   - Inline level indicator

2. **Collapsible UI**:
   - Header collapses on small screens
   - Controls hide when not in use
   - Mini-map can be toggled

3. **Smart Modal**:
   - Slide-in from right (doesn't cover tree)
   - Compact property rows
   - Quick upgrade buttons
   - Auto-hide after upgrade

4. **Responsive Layout**:
   - Adapts to screen size
   - Mobile-friendly touch controls
   - Portrait/landscape support

---

## Visual Hierarchy System

### Hierarchy Levels

1. **Root Node** (The Dot):
   - Largest size (60px)
   - Brightest glow
   - Central position
   - Special icon animation

2. **Tier 1 Nodes** (Attract, Repel, Investment, Annihilation):
   - Medium size (50px)
   - Strong glow when invested
   - Primary colors
   - Clear connection to root

3. **Tier 2 Nodes** (Advanced upgrades):
   - Medium size (50px)
   - Moderate glow
   - Secondary colors
   - Clear connection to tier 1

4. **Tier 3 Nodes** (Special upgrades):
   - Medium size (50px)
   - Subtle glow
   - Tertiary colors
   - Clear connection to tier 2

### Visual Indicators

1. **Unlock Progress**:
   - Progress ring around node
   - Shows parent level vs required
   - Color changes as progress increases

2. **Investment Level**:
   - Level badge (current/max)
   - Brightness increases with level
   - Glow intensity scales with level

3. **Upgrade Path**:
   - Highlighted connections to invested nodes
   - Animated flow toward unlockable nodes
   - Dimmed connections to locked nodes

---

## Interactive Feedback States

### Hover States

1. **Node Hover**:
   - Scale: 1.0 → 1.15 (smooth transition)
   - Glow: Intensity +50%
   - Border: Brighten and pulse
   - Tooltip: Show node name and quick stats

2. **Connection Hover**:
   - Highlight entire path
   - Show dependency info
   - Animate energy flow

### Click States

1. **Node Click**:
   - Ripple effect from click point
   - Modal slide-in animation
   - Focus camera on node
   - Highlight connected nodes

2. **Upgrade Click**:
   - Currency fly animation (from display to node)
   - Level up flash
   - Particle burst
   - Sound effect (optional)

### Unlock States

1. **Node Unlock**:
   - Flash effect (white → node color)
   - Particle explosion
   - Connection activation animation
   - Notification toast

2. **Path Unlock**:
   - Sequential activation along path
   - Wave effect from parent to child
   - All connections light up

---

## Implementation Phases

### Phase 1: Core Canvas System
- Implement pan and zoom controller
- Set up coordinate system
- Add input handling
- Create render loop

### Phase 2: Node Rendering
- Design node shapes and layers
- Implement visual states
- Add hover effects
- Create level indicators

### Phase 3: Connection System
- Implement bezier curve rendering
- Add energy flow animation
- Create connection states
- Add glow effects

### Phase 4: Animation Engine
- Build animation system
- Add node animations
- Implement transitions
- Add particle effects

### Phase 5: UI Enhancements
- Create mini-map
- Add zoom controls
- Implement responsive layout
- Optimize modal design

### Phase 6: Polish & Refine
- Add visual hierarchy
- Implement feedback states
- Optimize performance
- Test user experience

---

## Technical Specifications

### Performance Targets
- 60 FPS rendering
- < 16ms frame time
- Smooth zoom transitions (200ms)
- Responsive hover detection

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Canvas 2D API
- ES6+ JavaScript
- CSS Grid/Flexbox

### Accessibility
- Keyboard navigation
- Screen reader support
- High contrast mode
- Reduced motion option

---

## File Structure

```
upgrade-ui.js (refactored)
├── UpgradeUI (main class)
│   ├── CanvasViewController
│   ├── NodeRenderer
│   ├── ConnectionRenderer
│   ├── AnimationEngine
│   ├── InputHandler
│   ├── MiniMapController
│   └── ControlsController
└── Styles (CSS)
    ├── Base styles
    ├── Node styles
    ├── Connection styles
    ├── Animation styles
    └── Responsive styles
```

---

## Success Criteria

1. ✅ Supports 20-30 nodes without clutter
2. ✅ Smooth pan and zoom navigation
3. ✅ Neon/cyberpunk aesthetic with glowing effects
4. ✅ Curved bezier connections with animated energy flow
5. ✅ Intuitive visual hierarchy
6. ✅ Responsive interactive feedback
7. ✅ Optimized screen real estate
8. ✅ 60 FPS performance
9. ✅ Seamless integration with game art style
10. ✅ Intuitive user experience

---

## Next Steps

Once this plan is approved, switch to Code mode to implement the redesign following the phased approach outlined above.
