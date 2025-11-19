// Global state
let shapes = [];
let placedShapes = [];
let shapeIdCounter = 0;
let draggedShape = null;
let draggedFromGrid = false;
let screwHoleElements = [];

// Grid configuration
const GRID_TOTAL_SIZE = 600; // Total grid size in pixels
const GRID_GAP = 1; // Gap between cells in pixels
let GRID_SIZE = 8; // Default, will be set by user
let CELL_SIZE = GRID_TOTAL_SIZE / GRID_SIZE; // Simple cell size for calculations
let SCREW_DIAMETER = 4; // mm - diameter of screw holes

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeGrid();
    setupEventListeners();
    setupIconMenu();
    updateGridSizeDisplay();
});

// Create the grid cells
function initializeGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = ''; // Clear existing cells
    
    // Set CSS variable for grid size
    grid.style.setProperty('--grid-size', GRID_SIZE);
    
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.index = i;
        grid.appendChild(cell);
    }
    
    // Add screw holes at grid corners
    renderScrewHoles();
}

// Setup icon menu
function setupIconMenu() {
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all items
            menuItems.forEach(mi => mi.classList.remove('active'));
            // Add active to clicked item
            item.classList.add('active');
            
            // Get panel to show
            const panelName = item.dataset.panel;
            
            // Hide all panels
            document.querySelectorAll('.panel').forEach(panel => {
                panel.style.display = 'none';
            });
            
            // Show selected panel
            document.getElementById(panelName + 'Panel').style.display = 'block';
        });
    });
}

// Setup all event listeners
function setupEventListeners() {
    document.getElementById('createBtn').addEventListener('click', createShape);
    document.getElementById('clearBtn').addEventListener('click', clearGrid);
    document.getElementById('applyGridBtn').addEventListener('click', applyGridSize);
    
    const grid = document.getElementById('grid');
    grid.addEventListener('dragover', handleDragOver);
    grid.addEventListener('drop', handleDrop);
    grid.addEventListener('dragleave', handleDragLeave);
    
    // Update color palette when color picker changes
    document.getElementById('color').addEventListener('change', updateColorPalette);
    
    // Update total size display when grid size changes
    const gridSizeInput = document.getElementById('gridSize');
    gridSizeInput.addEventListener('input', () => {
        const size = parseInt(gridSizeInput.value);
        const cm = size * 4;
        document.getElementById('totalSize').textContent = `${cm}cm x ${cm}cm`;
    });
}

// Update grid size display
function updateGridSizeDisplay() {
    const totalCm = GRID_SIZE * 4;
    document.getElementById('gridInfo').textContent = 
        `Current grid: ${GRID_SIZE}x${GRID_SIZE} (${totalCm}cm x ${totalCm}cm)`;
    document.getElementById('gridSize').value = GRID_SIZE;
    document.getElementById('totalSize').textContent = `${totalCm}cm x ${totalCm}cm`;
    document.getElementById('screwDiameter').value = SCREW_DIAMETER;
}

// Render screw holes at grid intersections
function renderScrewHoles() {
    const grid = document.getElementById('grid');
    
    // Remove existing screw holes
    document.querySelectorAll('.screw-hole').forEach(el => el.remove());
    screwHoleElements = [];
    
    // Calculate screw hole size in pixels
    // 1 grid unit = 4cm = 40mm
    // CELL_SIZE pixels = 40mm
    // So 1mm = CELL_SIZE / 40 pixels
    const screwRadiusPx = (SCREW_DIAMETER / 2) * (CELL_SIZE / 40);
    
    // Get actual cell metrics from DOM to ensure perfect alignment
    const gridCells = Array.from(grid.querySelectorAll('.grid-cell'));
    const firstRowCells = gridCells.slice(0, GRID_SIZE);
    const columnEdges = [0];
    firstRowCells.forEach(cell => {
        columnEdges.push(cell.offsetLeft + cell.offsetWidth);
    });
    
    const rowEdges = [0];
    for (let row = 0; row < GRID_SIZE; row++) {
        const cell = gridCells[row * GRID_SIZE];
        rowEdges.push(cell.offsetTop + cell.offsetHeight);
    }
    
    // Add screw holes at each grid intersection (corners)
    for (let row = 0; row <= GRID_SIZE; row++) {
        for (let col = 0; col <= GRID_SIZE; col++) {
            const screwHole = document.createElement('div');
            screwHole.className = 'screw-hole';
            screwHole.dataset.col = col;
            screwHole.dataset.row = row;
            const left = columnEdges[col];
            const top = rowEdges[row];
            
            screwHole.style.left = `${left}px`;
            screwHole.style.top = `${top}px`;
            screwHole.style.width = `${screwRadiusPx * 2}px`;
            screwHole.style.height = `${screwRadiusPx * 2}px`;
            screwHole.style.marginLeft = `-${screwRadiusPx}px`;
            screwHole.style.marginTop = `-${screwRadiusPx}px`;
            
            grid.appendChild(screwHole);
            screwHoleElements.push({
                element: screwHole,
                col,
                row
            });
        }
    }
    
    updateScrewVisibility();
}

// Apply grid size
function applyGridSize() {
    const size = parseInt(document.getElementById('gridSize').value);
    const screwDiam = parseFloat(document.getElementById('screwDiameter').value);
    
    if (size < 4 || size > 16) {
        alert('Grid size must be between 4 and 16');
        return;
    }
    
    if (screwDiam < 1 || screwDiam > 20) {
        alert('Screw diameter must be between 1 and 20mm');
        return;
    }
    
    if (placedShapes.length > 0 || shapes.length > 0) {
        if (!confirm('Changing settings will clear all shapes. Continue?')) {
            return;
        }
    }
    
    // Clear everything
    shapes = [];
    placedShapes = [];
    shapeIdCounter = 0;
    
    GRID_SIZE = size;
    CELL_SIZE = GRID_TOTAL_SIZE / GRID_SIZE;
    SCREW_DIAMETER = screwDiam;
    
    // Update max values for width/height inputs
    document.getElementById('width').max = GRID_SIZE;
    document.getElementById('height').max = GRID_SIZE;
    
    // Re-initialize
    initializeGrid();
    updateGridSizeDisplay();
    renderPlacedShapes();
    renderShapesList();
    updateColorPalette();
}

// Create a new shape
function createShape() {
    const width = parseInt(document.getElementById('width').value);
    const height = parseInt(document.getElementById('height').value);
    const color = document.getElementById('color').value;
    const orientation = document.querySelector('input[name="orientation"]:checked').value;
    
    // Validate dimensions
    if (width < 1 || width > GRID_SIZE || height < 1 || height > GRID_SIZE) {
        alert(`Dimensions must be between 1 and ${GRID_SIZE}`);
        return;
    }
    
    // Apply orientation
    // Horizontal = landscape (wider than tall)
    // Vertical = portrait (taller than wide)
    let finalWidth = width;
    let finalHeight = height;
    if (orientation === 'horizontal') {
        // Ensure width > height for horizontal
        if (height > width) {
            finalWidth = height;
            finalHeight = width;
        }
    } else {
        // Ensure height > width for vertical
        if (width > height) {
            finalWidth = height;
            finalHeight = width;
        }
    }
    
    const shape = {
        id: shapeIdCounter++,
        width: finalWidth,
        height: finalHeight,
        color: color,
        orientation: orientation
    };
    
    shapes.push(shape);
    renderShapesList();
    updateColorPalette();
}

// Render the list of shapes to place
function renderShapesList() {
    const shapesList = document.getElementById('shapesList');
    
    if (shapes.length === 0) {
        shapesList.innerHTML = '<p class="empty-message">No shapes created yet</p>';
        return;
    }
    
    shapesList.innerHTML = '';
    shapes.forEach(shape => {
        const shapeItem = document.createElement('div');
        shapeItem.className = 'shape-item';
        shapeItem.draggable = true;
        shapeItem.dataset.shapeId = shape.id;
        
        // Calculate preview size (scale to fit in sidebar nicely)
        const maxSize = 60;
        const scale = Math.min(maxSize / shape.width, maxSize / shape.height, 15);
        const previewWidth = shape.width * scale;
        const previewHeight = shape.height * scale;
        
        shapeItem.innerHTML = `
            <div class="shape-preview" style="
                background-color: ${shape.color};
                width: ${previewWidth}px;
                height: ${previewHeight}px;
            "></div>
            <div class="shape-info">
                <strong>${shape.width}x${shape.height}</strong> units<br>
                <small>(${shape.width * 4}cm x ${shape.height * 4}cm)</small><br>
                <small style="color: #667eea;">${shape.orientation}</small>
            </div>
        `;
        
        shapeItem.addEventListener('dragstart', handleDragStart);
        shapeItem.addEventListener('dragend', handleDragEnd);
        
        shapesList.appendChild(shapeItem);
    });
}

// Handle drag start
function handleDragStart(e) {
    // Check if dragging from grid or from sidebar
    if (e.target.classList.contains('placed-shape')) {
        draggedFromGrid = true;
        const placedId = parseInt(e.target.dataset.placedId);
        const placedShape = placedShapes.find(s => s.id === placedId);
        draggedShape = { ...placedShape.shape, gridX: placedShape.x, gridY: placedShape.y, placedId: placedShape.id };
    } else {
        draggedFromGrid = false;
        const shapeId = parseInt(e.target.dataset.shapeId);
        draggedShape = shapes.find(s => s.id === shapeId);
    }
    
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

// Handle drag end
function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedShape = null;
    draggedFromGrid = false;
    
    // Remove any preview
    const preview = document.querySelector('.preview-shape');
    if (preview) preview.remove();
}

// Handle drag over grid
function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!draggedShape) return;
    
    const grid = document.getElementById('grid');
    const rect = grid.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate grid position
    const gridX = Math.floor(x / CELL_SIZE);
    const gridY = Math.floor(y / CELL_SIZE);
    
    // Show preview
    showPreview(gridX, gridY);
}

// Show preview of shape placement
function showPreview(gridX, gridY) {
    // Remove old preview
    const oldPreview = document.querySelector('.preview-shape');
    if (oldPreview) oldPreview.remove();
    
    // Check if position is valid
    const isValid = canPlaceShape(draggedShape, gridX, gridY, draggedFromGrid ? draggedShape.placedId : null);
    
    // Create preview
    const preview = document.createElement('div');
    preview.className = `preview-shape ${isValid ? '' : 'invalid-preview'}`;
    preview.style.left = `${gridX * CELL_SIZE}px`;
    preview.style.top = `${gridY * CELL_SIZE}px`;
    preview.style.width = `${draggedShape.width * CELL_SIZE}px`;
    preview.style.height = `${draggedShape.height * CELL_SIZE}px`;
    
    document.getElementById('grid').appendChild(preview);
}

// Handle drop on grid
function handleDrop(e) {
    e.preventDefault();
    
    if (!draggedShape) return;
    
    const grid = document.getElementById('grid');
    const rect = grid.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate grid position
    const gridX = Math.floor(x / CELL_SIZE);
    const gridY = Math.floor(y / CELL_SIZE);
    
    // Check if we can place the shape
    if (canPlaceShape(draggedShape, gridX, gridY, draggedFromGrid ? draggedShape.placedId : null)) {
        if (draggedFromGrid) {
            // Move existing shape
            const placedShape = placedShapes.find(s => s.id === draggedShape.placedId);
            placedShape.x = gridX;
            placedShape.y = gridY;
        } else {
            // Place new shape
            placedShapes.push({
                id: Date.now(),
                shape: draggedShape,
                x: gridX,
                y: gridY
            });
            
            // Remove from available shapes
            shapes = shapes.filter(s => s.id !== draggedShape.id);
            renderShapesList();
        }
        
        renderPlacedShapes();
        updateColorPalette();
    }
    
    // Remove preview
    const preview = document.querySelector('.preview-shape');
    if (preview) preview.remove();
    
    grid.classList.remove('drag-over');
}

// Handle drag leave
function handleDragLeave(e) {
    if (e.target.id === 'grid') {
        const preview = document.querySelector('.preview-shape');
        if (preview) preview.remove();
    }
}

// Check if shape can be placed at position
function canPlaceShape(shape, gridX, gridY, ignoreId = null) {
    // Check if within bounds
    if (gridX < 0 || gridY < 0 || 
        gridX + shape.width > GRID_SIZE || 
        gridY + shape.height > GRID_SIZE) {
        return false;
    }
    
    // Check for overlaps with other shapes
    for (let placed of placedShapes) {
        if (ignoreId !== null && placed.id === ignoreId) continue;
        
        const overlapX = gridX < placed.x + placed.shape.width && gridX + shape.width > placed.x;
        const overlapY = gridY < placed.y + placed.shape.height && gridY + shape.height > placed.y;
        
        if (overlapX && overlapY) {
            return false;
        }
    }
    
    return true;
}

// Render all placed shapes on the grid
function renderPlacedShapes() {
    // Remove existing placed shapes
    document.querySelectorAll('.placed-shape').forEach(el => el.remove());
    
    // Render each placed shape
    placedShapes.forEach(placed => {
        const shapeEl = document.createElement('div');
        shapeEl.className = 'placed-shape';
        shapeEl.draggable = true;
        shapeEl.dataset.placedId = placed.id;
        shapeEl.style.left = `${placed.x * CELL_SIZE}px`;
        shapeEl.style.top = `${placed.y * CELL_SIZE}px`;
        shapeEl.style.width = `${placed.shape.width * CELL_SIZE}px`;
        shapeEl.style.height = `${placed.shape.height * CELL_SIZE}px`;
        shapeEl.style.backgroundColor = placed.shape.color;
        shapeEl.textContent = `${placed.shape.width}x${placed.shape.height}`;
        
        // Add delete button
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Delete shape (or right-click)';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteShape(placed.id);
        });
        shapeEl.appendChild(deleteBtn);
        
        shapeEl.addEventListener('dragstart', handleDragStart);
        shapeEl.addEventListener('dragend', handleDragEnd);
        shapeEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            deleteShape(placed.id);
        });
        
        document.getElementById('grid').appendChild(shapeEl);
    });
    
    updateScrewVisibility();
}

// Clear all shapes from grid
function clearGrid() {
    if (placedShapes.length === 0) return;
    
    if (confirm('Are you sure you want to clear the grid?')) {
        // Move all placed shapes back to available shapes
        placedShapes.forEach(placed => {
            shapes.push(placed.shape);
        });
        
        placedShapes = [];
        renderPlacedShapes();
        renderShapesList();
        updateColorPalette();
    }
}


// Delete a shape from the grid
function deleteShape(placedId) {
    const placed = placedShapes.find(s => s.id === placedId);
    if (!placed) return;
    
    // Return shape to available shapes
    shapes.push(placed.shape);
    
    // Remove from placed shapes
    placedShapes = placedShapes.filter(s => s.id !== placedId);
    
    // Re-render everything
    renderPlacedShapes();
    renderShapesList();
    updateColorPalette();
    updateScrewVisibility();
}

// Hide screws that fall inside placed shapes
function updateScrewVisibility() {
    if (!screwHoleElements.length) return;
    
    screwHoleElements.forEach(hole => {
        hole.element.classList.remove('hidden-screw');
    });
    
    placedShapes.forEach(placed => {
        const startX = placed.x;
        const endX = placed.x + placed.shape.width;
        const startY = placed.y;
        const endY = placed.y + placed.shape.height;
        
        screwHoleElements.forEach(hole => {
            const col = hole.col;
            const row = hole.row;
            
            if (col > startX && col < endX && row > startY && row < endY) {
                hole.element.classList.add('hidden-screw');
            }
        });
    });
}

// Update color palette with existing colors from grid
function updateColorPalette() {
    const palette = document.getElementById('colorPalette');
    const currentColor = document.getElementById('color').value.toLowerCase();
    
    // Get all unique colors from placed shapes
    const usedColors = new Set();
    placedShapes.forEach(placed => {
        usedColors.add(placed.shape.color.toLowerCase());
    });
    
    if (usedColors.size === 0) {
        palette.innerHTML = '<span class="color-palette-label">Colors from grid will appear here</span>';
        return;
    }
    
    palette.innerHTML = '';
    
    usedColors.forEach(color => {
        const colorItem = document.createElement('div');
        colorItem.className = 'color-palette-item';
        if (color === currentColor) {
            colorItem.classList.add('selected');
        }
        colorItem.style.backgroundColor = color;
        colorItem.title = `Click to use ${color}`;
        
        colorItem.addEventListener('click', () => {
            document.getElementById('color').value = color;
            updateColorPalette();
        });
        
        palette.appendChild(colorItem);
    });
}

