// Global state
let shapes = [];
let placedShapes = [];
let shapeIdCounter = 0;
let draggedShape = null;
let draggedFromGrid = false;
let screwHoleElements = [];
let gridColumnEdges = [];
let gridRowEdges = [];
let customColors = [];
let selectedColor = null;
let OUTER_BORDER_LR_CM = 1;
let OUTER_BORDER_TB_CM = 1;
let OUTER_BORDER_COLOR = '#ffffff';
const GRID_SETTINGS_KEY = 'osDesignerGridSettings';

const DEFAULT_COLORS = [
    '#e74c3c',
    '#e67e22',
    '#f1c40f',
    '#2ecc71',
    '#1abc9c',
    '#3498db',
    '#9b59b6',
    '#34495e',
    '#95a5a6',
    '#f39c12'
];

// Grid configuration
const CELL_SIZE_PX = 75; // Fixed cell size in pixels (600px / 8 = 75px base)
const GRID_GAP = 1; // Gap between cells in pixels
let GRID_SIZE_X = 8; // Width in units, will be set by user
let GRID_SIZE_Y = 8; // Height in units, will be set by user
let CELL_SIZE = CELL_SIZE_PX; // For backwards compatibility in calculations
let SCREW_DIAMETER = 4; // mm - diameter of screw holes

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadGridSettings();
    loadCustomColors();
    initializeGrid();
    setupEventListeners();
    setupIconMenu();
    updateGridSizeDisplay();
    renderColorSettingsInputs();
    selectedColor = customColors[0] || null;
    renderDesignerColorPalette();
    updateGridColorPalette();
    applyOuterBorderPadding();
    updateProjectInfo();
});

// Create the grid cells
function initializeGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = ''; // Clear existing cells

    // Set CSS variables for grid size
    grid.style.setProperty('--grid-size-x', GRID_SIZE_X);
    grid.style.setProperty('--grid-size-y', GRID_SIZE_Y);
    
    // Set grid dimensions in pixels (cells are square)
    const gridWidth = GRID_SIZE_X * CELL_SIZE;
    const gridHeight = GRID_SIZE_Y * CELL_SIZE;
    grid.style.width = `${gridWidth}px`;
    grid.style.height = `${gridHeight}px`;

    for (let i = 0; i < GRID_SIZE_X * GRID_SIZE_Y; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.index = i;
        grid.appendChild(cell);
    }

    // Add screw holes at grid corners
    renderScrewHoles();
    applyOuterBorderPadding();
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
    document.getElementById('saveColorsBtn').addEventListener('click', saveCustomColors);
    document.getElementById('exportFrameBtn').addEventListener('click', exportOuterFrameSVG);
    
    // Project save/load
    document.getElementById('saveProjectBtn').addEventListener('click', saveProject);
    document.getElementById('loadProjectBtn').addEventListener('click', () => {
        document.getElementById('loadProjectInput').click();
    });
    document.getElementById('loadProjectInput').addEventListener('change', loadProject);
    
    // STL export
    document.getElementById('exportSTLBtn').addEventListener('click', exportSTL);

    const grid = document.getElementById('grid');
    grid.addEventListener('dragover', handleDragOver);
    grid.addEventListener('drop', handleDrop);
    grid.addEventListener('dragleave', handleDragLeave);

    // Update total size display when grid size changes
    const gridSizeXInput = document.getElementById('gridSizeX');
    const gridSizeYInput = document.getElementById('gridSizeY');
    
    const updateTotalSizeDisplay = () => {
        const sizeX = parseInt(gridSizeXInput.value) || GRID_SIZE_X;
        const sizeY = parseInt(gridSizeYInput.value) || GRID_SIZE_Y;
        const cmX = sizeX * 4;
        const cmY = sizeY * 4;
        document.getElementById('totalSize').textContent = `${cmX}cm x ${cmY}cm`;
        updateFrameSizeDisplay();
    };
    
    gridSizeXInput.addEventListener('input', updateTotalSizeDisplay);
    gridSizeYInput.addEventListener('input', updateTotalSizeDisplay);

    // Update frame size when border inputs change
    const borderLRInput = document.getElementById('outerBorderLR');
    const borderTBInput = document.getElementById('outerBorderTB');
    borderLRInput.addEventListener('input', updateFrameSizeDisplay);
    borderTBInput.addEventListener('input', updateFrameSizeDisplay);
}

// Update grid size display
function updateGridSizeDisplay() {
    const totalCmX = GRID_SIZE_X * 4;
    const totalCmY = GRID_SIZE_Y * 4;
    document.getElementById('gridSizeX').value = GRID_SIZE_X;
    document.getElementById('gridSizeY').value = GRID_SIZE_Y;
    document.getElementById('totalSize').textContent = `${totalCmX}cm x ${totalCmY}cm`;
    document.getElementById('screwDiameter').value = SCREW_DIAMETER;
    const lrInput = document.getElementById('outerBorderLR');
    const tbInput = document.getElementById('outerBorderTB');
    const colorInput = document.getElementById('outerBorderColor');
    if (lrInput) lrInput.value = OUTER_BORDER_LR_CM;
    if (tbInput) tbInput.value = OUTER_BORDER_TB_CM;
    if (colorInput) colorInput.value = OUTER_BORDER_COLOR;
    updateFrameSizeDisplay();
}

// Update frame size display
function updateFrameSizeDisplay() {
    const gridSizeX = parseInt(document.getElementById('gridSizeX').value) || GRID_SIZE_X;
    const gridSizeY = parseInt(document.getElementById('gridSizeY').value) || GRID_SIZE_Y;
    const borderLR = parseFloat(document.getElementById('outerBorderLR').value) || OUTER_BORDER_LR_CM;
    const borderTB = parseFloat(document.getElementById('outerBorderTB').value) || OUTER_BORDER_TB_CM;
    
    const gridWidthMM = gridSizeX * 40;
    const gridHeightMM = gridSizeY * 40;
    const frameWidth = gridWidthMM + (2 * borderLR * 10);
    const frameHeight = gridHeightMM + (2 * borderTB * 10);
    
    const displayElem = document.getElementById('frameSizeDisplay');
    if (displayElem) {
        displayElem.textContent = `${frameWidth}mm x ${frameHeight}mm`;
    }
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
    const firstRowCells = gridCells.slice(0, GRID_SIZE_X);
    
    // Calculate column edges - center of gaps between cells
    const columnEdges = [];
    for (let col = 0; col <= GRID_SIZE_X; col++) {
        if (col === 0) {
            // First edge: left edge of first cell
            columnEdges.push(firstRowCells[0].offsetLeft);
        } else if (col === GRID_SIZE_X) {
            // Last edge: right edge of last cell
            columnEdges.push(firstRowCells[col - 1].offsetLeft + firstRowCells[col - 1].offsetWidth);
        } else {
            // Interior edges: center of gap between cells
            const leftCell = firstRowCells[col - 1];
            const rightCell = firstRowCells[col];
            const gapCenter = (leftCell.offsetLeft + leftCell.offsetWidth + rightCell.offsetLeft) / 2;
            columnEdges.push(gapCenter);
        }
    }

    // Calculate row edges - center of gaps between rows
    const rowEdges = [];
    for (let row = 0; row <= GRID_SIZE_Y; row++) {
        if (row === 0) {
            // First edge: top edge of first row cell
            rowEdges.push(gridCells[0].offsetTop);
        } else if (row === GRID_SIZE_Y) {
            // Last edge: bottom edge of last row cell
            const lastRowFirstCell = gridCells[(row - 1) * GRID_SIZE_X];
            rowEdges.push(lastRowFirstCell.offsetTop + lastRowFirstCell.offsetHeight);
        } else {
            // Interior edges: center of gap between rows
            const topCell = gridCells[(row - 1) * GRID_SIZE_X];
            const bottomCell = gridCells[row * GRID_SIZE_X];
            const gapCenter = (topCell.offsetTop + topCell.offsetHeight + bottomCell.offsetTop) / 2;
            rowEdges.push(gapCenter);
        }
    }
    
    gridColumnEdges = columnEdges;
    gridRowEdges = rowEdges;

    // Add screw holes at each grid intersection (corners)
    for (let row = 0; row <= GRID_SIZE_Y; row++) {
        for (let col = 0; col <= GRID_SIZE_X; col++) {
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
    const sizeX = parseInt(document.getElementById('gridSizeX').value);
    const sizeY = parseInt(document.getElementById('gridSizeY').value);
    const screwDiam = parseFloat(document.getElementById('screwDiameter').value);
    const borderLR = parseFloat(document.getElementById('outerBorderLR').value);
    const borderTB = parseFloat(document.getElementById('outerBorderTB').value);
    const borderColor = document.getElementById('outerBorderColor').value || '#ffffff';

    if (sizeX < 1 || sizeX > 16 || sizeY < 1 || sizeY > 16) {
        alert('Grid size must be between 1 and 16');
        return;
    }

    if (screwDiam < 1 || screwDiam > 20) {
        alert('Screw diameter must be between 1 and 20mm');
        return;
    }

    if (borderLR < 0 || borderTB < 0 || borderLR > 10 || borderTB > 10) {
        alert('Outer frame widths must be between 0 and 10 cm');
        return;
    }

    const sizeXChanged = sizeX !== GRID_SIZE_X;
    const sizeYChanged = sizeY !== GRID_SIZE_Y;
    const screwChanged = screwDiam !== SCREW_DIAMETER;
    const needsReset = sizeXChanged || sizeYChanged || screwChanged;

    if (needsReset && (placedShapes.length > 0 || shapes.length > 0)) {
        if (!confirm('Changing settings will clear all shapes. Continue?')) {
            return;
        }
    }

    if (needsReset) {
        // Clear everything
        shapes = [];
        placedShapes = [];
        shapeIdCounter = 0;

        GRID_SIZE_X = sizeX;
        GRID_SIZE_Y = sizeY;
        CELL_SIZE = CELL_SIZE_PX; // Keep cell size constant
        SCREW_DIAMETER = screwDiam;

        // Update max values for width/height inputs
        document.getElementById('width').max = GRID_SIZE_X;
        document.getElementById('height').max = GRID_SIZE_Y;

        // Re-initialize
        initializeGrid();
        renderPlacedShapes();
        renderShapesList();
        updateGridColorPalette();
    }

    OUTER_BORDER_LR_CM = borderLR;
    OUTER_BORDER_TB_CM = borderTB;
    OUTER_BORDER_COLOR = borderColor;
    applyOuterBorderPadding();
    saveGridSettings();
    updateGridSizeDisplay();
    updateProjectInfo();
}

// Create a new shape
function createShape() {
    const width = parseInt(document.getElementById('width').value);
    const height = parseInt(document.getElementById('height').value);
    const orientation = document.querySelector('input[name="orientation"]:checked').value;

    if (!selectedColor) {
        alert('Please select a color from the palette.');
        return;
    }

    // Validate dimensions
    if (width < 1 || width > GRID_SIZE_X || height < 1 || height > GRID_SIZE_Y) {
        alert(`Width must be between 1 and ${GRID_SIZE_X}, height must be between 1 and ${GRID_SIZE_Y}`);
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
        color: selectedColor,
        orientation: orientation
    };

    shapes.push(shape);
    renderShapesList();
    updateGridColorPalette();
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
    const left = getEdgePosition(gridColumnEdges, gridX, CELL_SIZE);
    const top = getEdgePosition(gridRowEdges, gridY, CELL_SIZE);
    const width = getSpanSize(gridColumnEdges, gridX, draggedShape.width, CELL_SIZE);
    const height = getSpanSize(gridRowEdges, gridY, draggedShape.height, CELL_SIZE);
    preview.style.left = `${left}px`;
    preview.style.top = `${top}px`;
    preview.style.width = `${width}px`;
    preview.style.height = `${height}px`;

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
        updateGridColorPalette();
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
        gridX + shape.width > GRID_SIZE_X ||
        gridY + shape.height > GRID_SIZE_Y) {
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
        const left = getEdgePosition(gridColumnEdges, placed.x, CELL_SIZE);
        const top = getEdgePosition(gridRowEdges, placed.y, CELL_SIZE);
        const width = getSpanSize(gridColumnEdges, placed.x, placed.shape.width, CELL_SIZE);
        const height = getSpanSize(gridRowEdges, placed.y, placed.shape.height, CELL_SIZE);
        shapeEl.style.left = `${left}px`;
        shapeEl.style.top = `${top}px`;
        shapeEl.style.width = `${width}px`;
        shapeEl.style.height = `${height}px`;
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
        updateGridColorPalette();
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
    updateGridColorPalette();
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
function updateGridColorPalette() {
    const palette = document.getElementById('gridColorPalette');
    if (!palette) return;

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
        if (selectedColor && color === selectedColor.toLowerCase()) {
            colorItem.classList.add('selected');
        }
        colorItem.style.backgroundColor = color;
        colorItem.title = `Click to use ${color}`;

        colorItem.addEventListener('click', () => {
            selectColor(color);
        });

        palette.appendChild(colorItem);
    });
}

// Load custom colors from storage or defaults
function loadCustomColors() {
    const stored = localStorage.getItem('osDesignerColors');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                customColors = parsed.slice(0, 10);
            }
        } catch (err) {
            console.warn('Unable to parse saved colors', err);
        }
    }

    if (!customColors.length) {
        customColors = DEFAULT_COLORS.slice(0, 10);
    }

    while (customColors.length < 10) {
        customColors.push('#cccccc');
    }
}

// Render color inputs in settings
function renderColorSettingsInputs() {
    const list = document.getElementById('colorSettingsList');
    if (!list) return;

    list.innerHTML = '';
    customColors.forEach((color, index) => {
        const item = document.createElement('div');
        item.className = 'color-setting-item';

        const label = document.createElement('label');
        label.textContent = `Color ${index + 1}`;

        const input = document.createElement('input');
        input.type = 'color';
        input.value = color;
        input.dataset.index = index;
        input.addEventListener('input', (e) => {
            const oldColor = customColors[index];
            customColors[index] = e.target.value;
            if (selectedColor && oldColor && selectedColor.toLowerCase() === oldColor.toLowerCase()) {
                selectedColor = customColors[index];
            }
            renderDesignerColorPalette();
            updateGridColorPalette();
        });

        item.appendChild(label);
        item.appendChild(input);
        list.appendChild(item);
    });
}

// Save colors to local storage
function saveCustomColors() {
    localStorage.setItem('osDesignerColors', JSON.stringify(customColors));
    const btn = document.getElementById('saveColorsBtn');
    if (btn) {
        const originalText = btn.textContent;
        btn.textContent = 'Saved!';
        btn.disabled = true;
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        }, 1200);
    }
}

// Render palette for designer selection
function renderDesignerColorPalette() {
    const palette = document.getElementById('designerColorPalette');
    if (!palette) return;

    palette.innerHTML = '';

    customColors.forEach(color => {
        const colorItem = document.createElement('div');
        colorItem.className = 'color-palette-item';
        if (selectedColor && color.toLowerCase() === selectedColor.toLowerCase()) {
            colorItem.classList.add('selected');
        }
        colorItem.style.backgroundColor = color;
        colorItem.title = `Use ${color}`;
        colorItem.addEventListener('click', () => selectColor(color));
        palette.appendChild(colorItem);
    });
}

// Select a color for new shapes
function selectColor(color) {
    if (!color) return;
    selectedColor = color;
    renderDesignerColorPalette();
    updateGridColorPalette();
}

// Helpers to map grid indices to pixel positions
function getEdgePosition(edges, index, fallback) {
    if (edges.length) {
        const clamped = Math.max(0, Math.min(index, edges.length - 1));
        return edges[clamped];
    }
    return index * fallback;
}

function getSpanSize(edges, startIndex, span, fallback) {
    if (edges.length) {
        const start = getEdgePosition(edges, startIndex, fallback);
        const end = getEdgePosition(edges, startIndex + span, fallback);
        return end - start;
    }
    return span * fallback;
}

function applyOuterBorderPadding() {
    const container = document.querySelector('.grid-container');
    if (!container) return;
    const pxPerCm = CELL_SIZE / 4;
    const horizontalPx = OUTER_BORDER_LR_CM * pxPerCm;
    const verticalPx = OUTER_BORDER_TB_CM * pxPerCm;
    container.style.padding = `${verticalPx}px ${horizontalPx}px`;
    container.style.backgroundColor = OUTER_BORDER_COLOR;
}

function loadGridSettings() {
    const defaults = {
        gridSizeX: 8,
        gridSizeY: 8,
        screwDiameter: 4,
        outerLR: 1,
        outerTB: 1,
        outerColor: '#ffffff'
    };
    let stored = defaults;
    const raw = localStorage.getItem(GRID_SETTINGS_KEY);
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            // Handle legacy gridSize property
            if (parsed.gridSize && !parsed.gridSizeX) {
                parsed.gridSizeX = parsed.gridSize;
                parsed.gridSizeY = parsed.gridSize;
            }
            stored = { ...defaults, ...parsed };
        } catch (err) {
            console.warn('Unable to parse grid settings', err);
        }
    }
    GRID_SIZE_X = clamp(stored.gridSizeX, 1, 16);
    GRID_SIZE_Y = clamp(stored.gridSizeY, 1, 16);
    SCREW_DIAMETER = clamp(stored.screwDiameter, 1, 20);
    OUTER_BORDER_LR_CM = clamp(stored.outerLR, 0, 10);
    OUTER_BORDER_TB_CM = clamp(stored.outerTB, 0, 10);
    OUTER_BORDER_COLOR = stored.outerColor || '#ffffff';
    CELL_SIZE = CELL_SIZE_PX;
}

function saveGridSettings() {
    const payload = {
        gridSizeX: GRID_SIZE_X,
        gridSizeY: GRID_SIZE_Y,
        screwDiameter: SCREW_DIAMETER,
        outerLR: OUTER_BORDER_LR_CM,
        outerTB: OUTER_BORDER_TB_CM,
        outerColor: OUTER_BORDER_COLOR
    };
    localStorage.setItem(GRID_SETTINGS_KEY, JSON.stringify(payload));
}

function clamp(value, min, max) {
    const num = Number(value);
    if (Number.isNaN(num)) return min;
    return Math.min(Math.max(num, min), max);
}

// Export outer frame as SVG for CNC/laser cutting
function exportOuterFrameSVG() {
    // Calculate dimensions in mm (standard for CNC/laser)
    const gridWidthMM = GRID_SIZE_X * 40; // Each grid unit = 4cm = 40mm
    const gridHeightMM = GRID_SIZE_Y * 40;
    const borderLR_MM = OUTER_BORDER_LR_CM * 10; // cm to mm
    const borderTB_MM = OUTER_BORDER_TB_CM * 10; // cm to mm
    const screwRadiusMM = SCREW_DIAMETER / 2; // Screw hole radius in mm
    const unitSizeMM = 40; // Each grid unit = 40mm
    
    // Outer dimensions (including frame)
    const outerWidth = gridWidthMM + (2 * borderLR_MM);
    const outerHeight = gridHeightMM + (2 * borderTB_MM);
    
    // Inner dimensions (the grid opening)
    const innerWidth = gridWidthMM;
    const innerHeight = gridHeightMM;
    
    // Position of inner rectangle
    const innerX = borderLR_MM;
    const innerY = borderTB_MM;
    
    // Generate screw holes ONLY on the frame perimeter (partial arcs)
    let screwHolesContent = '';
    for (let row = 0; row <= GRID_SIZE_Y; row++) {
        for (let col = 0; col <= GRID_SIZE_X; col++) {
            // Only process perimeter holes
            const isPerimeter = (row === 0 || row === GRID_SIZE_Y || col === 0 || col === GRID_SIZE_X);
            if (!isPerimeter) continue;
            
            const cx = innerX + (col * unitSizeMM);
            const cy = innerY + (row * unitSizeMM);
            const r = screwRadiusMM;
            
            // Determine which arc to draw based on position
            const isTopEdge = (row === 0);
            const isBottomEdge = (row === GRID_SIZE_Y);
            const isLeftEdge = (col === 0);
            const isRightEdge = (col === GRID_SIZE_X);
            
            let pathData = '';
            
            // Corners (three-quarter circles - 75% in the frame)
            if (isTopEdge && isLeftEdge) {
                // Top-left corner: draw 270 degrees (everything except bottom-right quarter)
                pathData = `M ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx} ${cy + r}`;
            } else if (isTopEdge && isRightEdge) {
                // Top-right corner: draw 270 degrees (everything except bottom-left quarter)
                pathData = `M ${cx} ${cy + r} A ${r} ${r} 0 1 0 ${cx - r} ${cy}`;
            } else if (isBottomEdge && isLeftEdge) {
                // Bottom-left corner: draw 270 degrees (everything except top-right quarter)
                pathData = `M ${cx} ${cy - r} A ${r} ${r} 0 1 0 ${cx + r} ${cy}`;
            } else if (isBottomEdge && isRightEdge) {
                // Bottom-right corner: draw 270 degrees (everything except top-left quarter)
                pathData = `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx} ${cy - r}`;
            }
            // Edges (semicircles)
            else if (isLeftEdge) {
                // Left edge: draw left semicircle (facing outward into frame)
                pathData = `M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r}`;
            } else if (isRightEdge) {
                // Right edge: draw right semicircle (facing outward into frame)
                pathData = `M ${cx} ${cy + r} A ${r} ${r} 0 0 0 ${cx} ${cy - r}`;
            } else if (isTopEdge) {
                // Top edge: draw top semicircle (facing outward into frame)
                pathData = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
            } else if (isBottomEdge) {
                // Bottom edge: draw bottom semicircle (facing outward into frame)
                pathData = `M ${cx + r} ${cy} A ${r} ${r} 0 0 1 ${cx - r} ${cy}`;
            }
            
            if (pathData) {
                screwHolesContent += `        <path d="${pathData}" fill="none" stroke="#000000" stroke-width="0.1"/>\n`;
            }
        }
    }
    
    // Generate frame segments (avoiding screw holes)
    let outerFrameSegments = '';
    let innerFrameSegments = '';
    
    // Generate horizontal edges (top and bottom)
    for (let i = 0; i < GRID_SIZE_X; i++) {
        const x1 = innerX + i * unitSizeMM + screwRadiusMM;
        const x2 = innerX + (i + 1) * unitSizeMM - screwRadiusMM;
        
        // Top edge outer
        outerFrameSegments += `        <line x1="${x1}" y1="0" x2="${x2}" y2="0" stroke="#000000" stroke-width="0.1"/>\n`;
        // Bottom edge outer
        outerFrameSegments += `        <line x1="${x1}" y1="${outerHeight}" x2="${x2}" y2="${outerHeight}" stroke="#000000" stroke-width="0.1"/>\n`;
        // Top edge inner
        innerFrameSegments += `        <line x1="${x1}" y1="${innerY}" x2="${x2}" y2="${innerY}" stroke="#000000" stroke-width="0.1"/>\n`;
        // Bottom edge inner
        innerFrameSegments += `        <line x1="${x1}" y1="${innerY + innerHeight}" x2="${x2}" y2="${innerY + innerHeight}" stroke="#000000" stroke-width="0.1"/>\n`;
    }
    
    // Generate vertical edges (left and right)
    for (let i = 0; i < GRID_SIZE_Y; i++) {
        const y1 = innerY + i * unitSizeMM + screwRadiusMM;
        const y2 = innerY + (i + 1) * unitSizeMM - screwRadiusMM;
        
        // Left edge outer
        outerFrameSegments += `        <line x1="0" y1="${y1}" x2="0" y2="${y2}" stroke="#000000" stroke-width="0.1"/>\n`;
        // Right edge outer
        outerFrameSegments += `        <line x1="${outerWidth}" y1="${y1}" x2="${outerWidth}" y2="${y2}" stroke="#000000" stroke-width="0.1"/>\n`;
        // Left edge inner
        innerFrameSegments += `        <line x1="${innerX}" y1="${y1}" x2="${innerX}" y2="${y2}" stroke="#000000" stroke-width="0.1"/>\n`;
        // Right edge inner
        innerFrameSegments += `        <line x1="${innerX + innerWidth}" y1="${y1}" x2="${innerX + innerWidth}" y2="${y2}" stroke="#000000" stroke-width="0.1"/>\n`;
    }
    
    // Create SVG content
    const svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="${outerWidth}mm" height="${outerHeight}mm" 
     viewBox="0 0 ${outerWidth} ${outerHeight}"
     xmlns="http://www.w3.org/2000/svg">
    
    <!-- Outer Frame for CNC/Laser Cutting -->
    <!-- All dimensions in millimeters -->
    <!-- Grid size: ${GRID_SIZE_X}x${GRID_SIZE_Y} units (${gridWidthMM}mm x ${gridHeightMM}mm) -->
    <!-- Frame width: L/R=${borderLR_MM}mm, T/B=${borderTB_MM}mm -->
    <!-- Screw holes: ${SCREW_DIAMETER}mm diameter -->
    
    <g id="outer-frame-edges">
        <!-- Outer frame edges (segmented to avoid screw holes) -->
${outerFrameSegments}    </g>
    
    <g id="inner-frame-edges">
        <!-- Inner frame edges (segmented to avoid screw holes) -->
${innerFrameSegments}    </g>
    
    <g id="screw-holes">
        <!-- Screw holes at grid intersections (contours only) -->
${screwHolesContent}    </g>
    
</svg>`;
    
    // Create blob and download
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `outer-frame-${GRID_SIZE_X}x${GRID_SIZE_Y}-${outerWidth}x${outerHeight}mm.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Visual feedback
    const btn = document.getElementById('exportFrameBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Downloaded!';
    btn.disabled = true;
    setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
    }, 1500);
}

// Save project to JSON file
function saveProject() {
    const projectData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        settings: {
            gridSizeX: GRID_SIZE_X,
            gridSizeY: GRID_SIZE_Y,
            screwDiameter: SCREW_DIAMETER,
            outerBorderLR: OUTER_BORDER_LR_CM,
            outerBorderTB: OUTER_BORDER_TB_CM,
            outerBorderColor: OUTER_BORDER_COLOR
        },
        colors: customColors,
        shapes: shapes.map(s => ({
            id: s.id,
            width: s.width,
            height: s.height,
            color: s.color,
            orientation: s.orientation
        })),
        placedShapes: placedShapes.map(p => ({
            id: p.id,
            x: p.x,
            y: p.y,
            shape: {
                id: p.shape.id,
                width: p.shape.width,
                height: p.shape.height,
                color: p.shape.color,
                orientation: p.shape.orientation
            }
        }))
    };
    
    const json = JSON.stringify(projectData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `os-designer-project-${GRID_SIZE_X}x${GRID_SIZE_Y}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Visual feedback
    const btn = document.getElementById('saveProjectBtn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Saved!';
    btn.disabled = true;
    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }, 1500);
}

// Load project from JSON file
function loadProject(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const projectData = JSON.parse(e.target.result);
            
            // Validate project data
            if (!projectData.settings || !projectData.colors) {
                alert('Invalid project file format.');
                return;
            }
            
            // Load settings
            const s = projectData.settings;
            GRID_SIZE_X = clamp(s.gridSizeX || 8, 1, 16);
            GRID_SIZE_Y = clamp(s.gridSizeY || 8, 1, 16);
            SCREW_DIAMETER = clamp(s.screwDiameter || 4, 1, 20);
            OUTER_BORDER_LR_CM = clamp(s.outerBorderLR || 1, 0, 10);
            OUTER_BORDER_TB_CM = clamp(s.outerBorderTB || 1, 0, 10);
            OUTER_BORDER_COLOR = s.outerBorderColor || '#ffffff';
            CELL_SIZE = CELL_SIZE_PX;
            
            // Load colors
            if (Array.isArray(projectData.colors)) {
                customColors = projectData.colors.slice(0, 10);
                while (customColors.length < 10) {
                    customColors.push('#cccccc');
                }
            }
            
            // Load shapes
            shapes = [];
            placedShapes = [];
            shapeIdCounter = 0;
            
            if (Array.isArray(projectData.shapes)) {
                projectData.shapes.forEach(s => {
                    shapes.push({
                        id: shapeIdCounter++,
                        width: s.width,
                        height: s.height,
                        color: s.color,
                        orientation: s.orientation
                    });
                });
            }
            
            if (Array.isArray(projectData.placedShapes)) {
                projectData.placedShapes.forEach(p => {
                    placedShapes.push({
                        id: Date.now() + Math.random(),
                        x: p.x,
                        y: p.y,
                        shape: {
                            id: shapeIdCounter++,
                            width: p.shape.width,
                            height: p.shape.height,
                            color: p.shape.color,
                            orientation: p.shape.orientation
                        }
                    });
                });
            }
            
            // Update max values for width/height inputs
            document.getElementById('width').max = GRID_SIZE_X;
            document.getElementById('height').max = GRID_SIZE_Y;
            
            // Re-initialize everything
            initializeGrid();
            renderPlacedShapes();
            renderShapesList();
            updateGridSizeDisplay();
            renderColorSettingsInputs();
            renderDesignerColorPalette();
            updateGridColorPalette();
            updateProjectInfo();
            saveGridSettings();
            
            // Visual feedback
            const btn = document.getElementById('loadProjectBtn');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Loaded!';
            btn.disabled = true;
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
            }, 1500);
            
        } catch (err) {
            console.error('Error loading project:', err);
            alert('Error loading project file. Please check the file format.');
        }
    };
    
    reader.readAsText(file);
    // Reset file input so same file can be loaded again
    event.target.value = '';
}

// Update project info display
function updateProjectInfo() {
    const infoGridSize = document.getElementById('infoGridSize');
    const infoScrewDiam = document.getElementById('infoScrewDiam');
    const infoFrameSize = document.getElementById('infoFrameSize');
    
    if (infoGridSize) {
        infoGridSize.textContent = `${GRID_SIZE_X} x ${GRID_SIZE_Y} units (${GRID_SIZE_X * 4}cm x ${GRID_SIZE_Y * 4}cm)`;
    }
    if (infoScrewDiam) {
        infoScrewDiam.textContent = `${SCREW_DIAMETER}mm`;
    }
    if (infoFrameSize) {
        const frameW = (GRID_SIZE_X * 40) + (OUTER_BORDER_LR_CM * 20);
        const frameH = (GRID_SIZE_Y * 40) + (OUTER_BORDER_TB_CM * 20);
        infoFrameSize.textContent = `${frameW}mm x ${frameH}mm`;
    }
}

// Lightweight earcut polygon triangulation (MIT License - Mapbox)
// Source: https://github.com/mapbox/earcut (trimmed for 2D usage)
function earcut(data, holeIndices, dim) {
    dim = dim || 2;

    const hasHoles = holeIndices && holeIndices.length;
    const outerLen = hasHoles ? holeIndices[0] * dim : data.length;

    let outerNode = linkedList(data, 0, outerLen, dim, true);
    const triangles = [];

    if (!outerNode) return triangles;

    if (hasHoles) outerNode = eliminateHoles(data, holeIndices, outerNode, dim);

    earcutLinked(outerNode, triangles, dim, 0);
    return triangles;
}

function linkedList(data, start, end, dim, clockwise) {
    let last = null;

    if (clockwise === (signedArea(data, start, end, dim) > 0)) {
        for (let i = start; i < end; i += dim) {
            last = insertNode(i, data[i], data[i + 1], last);
        }
    } else {
        for (let i = end - dim; i >= start; i -= dim) {
            last = insertNode(i, data[i], data[i + 1], last);
        }
    }

    if (last && equals(last, last.next)) {
        removeNode(last);
        last = last.next;
    }

    return last;
}

function insertNode(i, x, y, last) {
    const p = { i, x, y };

    if (!last) {
        p.prev = p;
        p.next = p;

    } else {
        p.next = last.next;
        p.prev = last;
        last.next.prev = p;
        last.next = p;
    }
    return p;
}

function removeNode(p) {
    p.next.prev = p.prev;
    p.prev.next = p.next;

    if (p.prevZ) p.prevZ.nextZ = p.nextZ;
    if (p.nextZ) p.nextZ.prevZ = p.prevZ;
}

function signedArea(data, start, end, dim) {
    let sum = 0;
    for (let i = start, j = end - dim; i < end; i += dim) {
        sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1]);
        j = i;
    }
    return sum;
}

function eliminateHoles(data, holeIndices, outerNode, dim) {
    const queue = [];
    for (let i = 0, len = holeIndices.length; i < len; i++) {
        const start = holeIndices[i] * dim;
        const end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
        const list = linkedList(data, start, end, dim, false);
        if (list === list.next) list.steiner = true;
        queue.push(getLeftmost(list));
    }
    queue.sort((a, b) => a.x - b.x);
    for (let i = 0; i < queue.length; i++) {
        eliminateHole(queue[i], outerNode);
        outerNode = linkedList(data, queue[i].i, queue[i].i, dim, true);
    }
    return outerNode;
}

function eliminateHole(hole, outerNode) {
    let bridge = findHoleBridge(hole, outerNode);
    if (!bridge) return;
    const bridgeReverse = splitPolygon(bridge, hole);
    earcutLinked(bridgeReverse, null, 2, 0);
}

function findHoleBridge(hole, outerNode) {
    let p = outerNode;
    const hx = hole.x;
    const hy = hole.y;
    let qx = -Infinity;
    let m = null;

    do {
        if (hy <= p.y && hy >= p.next.y) {
            const x = p.x + (hy - p.y) * (p.next.x - p.x) / (p.next.y - p.y);
            if (x <= hx && x > qx) {
                qx = x;
                if (x === hx) {
                    if (hy === p.y) return p;
                    if (hy === p.next.y) return p.next;
                }
                m = p.x < p.next.x ? p : p.next;
            }
        }
        p = p.next;
    } while (p !== outerNode);

    if (!m) return null;
    if (hx === qx) return m.prev;

    const stop = m;
    let mx = m.x;
    let my = m.y;
    let tanMin = Infinity;
    let tan;

    p = m.next;
    while (p !== stop) {
        if (hx >= p.x && p.x >= mx && pointInTriangle(hy < my ? hx : qx, hy, mx, my, hy < my ? qx : hx, hy, p.x, p.y)) {
            tan = Math.abs(hy - p.y) / (hx - p.x);
            if ((tan < tanMin || (tan === tanMin && p.x > m.x)) && locallyInside(p, hole)) {
                m = p;
                tanMin = tan;
            }
        }
        p = p.next;
    }
    return m;
}

function splitPolygon(a, b) {
    const a2 = { i: a.i, x: a.x, y: a.y, prev: null, next: null };
    const b2 = { i: b.i, x: b.x, y: b.y, prev: null, next: null };

    const an = a.next;
    const bp = b.prev;

    a.next = b;
    b.prev = a;
    a2.next = an;
    an.prev = a2;
    b2.next = a2;
    a2.prev = b2;
    bp.next = b2;
    b2.prev = bp;

    return b2;
}

function earcutLinked(ear, triangles, dim) {
    if (!ear) return;
    let stop = ear;
    let prev, next;
    while (ear.prev !== ear.next) {
        prev = ear.prev;
        next = ear.next;
        if (isEar(ear)) {
            if (triangles) {
                triangles.push(prev.i / dim);
                triangles.push(ear.i / dim);
                triangles.push(next.i / dim);
            }

            removeNode(ear);
            ear = next.next;
            stop = next.next;
            continue;
        }
        ear = next;
        if (ear === stop) break;
    }
}

function isEar(ear) {
    const a = ear.prev;
    const b = ear;
    const c = ear.next;

    if (area(a, b, c) >= 0) return false;

    let p = ear.next.next;

    while (p !== ear.prev) {
        if (pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) && area(p.prev, p, p.next) >= 0) return false;
        p = p.next;
    }
    return true;
}

function area(p, q, r) {
    return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
}

function pointInTriangle(ax, ay, bx, by, cx, cy, px, py) {
    return (cx - px) * (ay - py) - (ax - px) * (cy - py) >= 0 &&
        (ax - px) * (by - py) - (bx - px) * (ay - py) >= 0 &&
        (bx - px) * (cy - py) - (cx - px) * (by - py) >= 0;
}

function equals(p1, p2) {
    return p1.x === p2.x && p1.y === p2.y;
}

earcut.flatten = function (rings) {
    const dim = 2;
    const result = { vertices: [], holes: [], dim };
    let holeIndex = 0;

    for (let i = 0; i < rings.length; i++) {
        const ring = rings[i];
        result.vertices.push(ring[0], ring[1]);
        for (let j = 2; j < ring.length; j += dim) {
            result.vertices.push(ring[j], ring[j + 1]);
        }
        if (i > 0) {
            holeIndex += rings[i - 1].length / dim;
            result.holes.push(holeIndex);
        }
    }
    return result;
};

// Export outer frame as watertight STL for 3D printing
function exportSTL() {
    const thickness = parseFloat(document.getElementById('panelThickness').value) || 3;
    
    // Calculate dimensions in mm
    const gridWidthMM = GRID_SIZE_X * 40;
    const gridHeightMM = GRID_SIZE_Y * 40;
    const borderLR_MM = OUTER_BORDER_LR_CM * 10;
    const borderTB_MM = OUTER_BORDER_TB_CM * 10;
    const screwRadius = SCREW_DIAMETER / 2;
    const unitSizeMM = 40;
    
    // Outer dimensions
    const outerWidth = gridWidthMM + (2 * borderLR_MM);
    const outerHeight = gridHeightMM + (2 * borderTB_MM);
    
    // Inner rectangle (grid cutout)
    const innerX = borderLR_MM;
    const innerY = borderTB_MM;
    const innerW = gridWidthMM;
    const innerH = gridHeightMM;
    
    const z0 = 0;
    const z1 = thickness;
    const segments = 24; // Circle segments
    
    // Collect screw holes on perimeter
    const holes = [];
    for (let row = 0; row <= GRID_SIZE_Y; row++) {
        for (let col = 0; col <= GRID_SIZE_X; col++) {
            if (row === 0 || row === GRID_SIZE_Y || col === 0 || col === GRID_SIZE_X) {
                holes.push({
                    cx: innerX + col * unitSizeMM,
                    cy: innerY + row * unitSizeMM,
                    r: screwRadius
                });
            }
        }
    }
    
    // Binary STL format for better compatibility
    const triangles = [];
    
    function tri(v1, v2, v3) {
        // Calculate normal using cross product
        const u = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
        const v = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];
        const n = [
            u[1] * v[2] - u[2] * v[1],
            u[2] * v[0] - u[0] * v[2],
            u[0] * v[1] - u[1] * v[0]
        ];
        const len = Math.sqrt(n[0]*n[0] + n[1]*n[1] + n[2]*n[2]);
        if (len > 0) {
            n[0] /= len; n[1] /= len; n[2] /= len;
        }
        triangles.push({ n, v1, v2, v3 });
    }
    
    function quad(a, b, c, d) {
        tri(a, b, c);
        tri(a, c, d);
    }
    
    // Helper: check if point is inside a hole
    function inHole(x, y) {
        for (const h of holes) {
            const dx = x - h.cx, dy = y - h.cy;
            if (dx*dx + dy*dy <= h.r * h.r) return true;
        }
        return false;
    }
    
    // Helper: check if point is in cutout
    function inCutout(x, y) {
        return x > innerX && x < innerX + innerW && y > innerY && y < innerY + innerH;
    }
    
    // Create surfaces with holes using triangles that connect hole edges to frame
    // For each hole, create triangles fanning from hole edge to a bounding box
    function createHoleSurface(h, z, flipNormal) {
        const margin = h.r * 1.5; // Box around hole
        const bx1 = h.cx - margin, by1 = h.cy - margin;
        const bx2 = h.cx + margin, by2 = h.cy + margin;
        
        for (let i = 0; i < segments; i++) {
            const a1 = (i / segments) * Math.PI * 2;
            const a2 = ((i + 1) / segments) * Math.PI * 2;
            const aMid = (a1 + a2) / 2;
            
            // Points on hole edge
            const hx1 = h.cx + h.r * Math.cos(a1);
            const hy1 = h.cy + h.r * Math.sin(a1);
            const hx2 = h.cx + h.r * Math.cos(a2);
            const hy2 = h.cy + h.r * Math.sin(a2);
            
            // Point on bounding box (project outward)
            const dx = Math.cos(aMid), dy = Math.sin(aMid);
            let bx, by;
            // Find intersection with bounding box
            const tx = dx > 0 ? (bx2 - h.cx) / dx : dx < 0 ? (bx1 - h.cx) / dx : Infinity;
            const ty = dy > 0 ? (by2 - h.cy) / dy : dy < 0 ? (by1 - h.cy) / dy : Infinity;
            const t = Math.min(Math.abs(tx), Math.abs(ty));
            bx = h.cx + dx * t;
            by = h.cy + dy * t;
            
            // Skip if box point is in cutout
            if (inCutout(bx, by)) continue;
            // Skip if box point is outside frame
            if (bx < 0 || bx > outerWidth || by < 0 || by > outerHeight) continue;
            
            // Create triangle from hole edge to box point
            if (flipNormal) {
                tri([hx2, hy2, z], [hx1, hy1, z], [bx, by, z]);
            } else {
                tri([hx1, hy1, z], [hx2, hy2, z], [bx, by, z]);
            }
        }
    }
    
    // Create frame surfaces with grid, skipping cells entirely inside holes
    const gridRes = 2; // mm
    function createFrameSurface(x1, y1, x2, y2, z, flipNormal) {
        const nx = Math.max(1, Math.ceil((x2 - x1) / gridRes));
        const ny = Math.max(1, Math.ceil((y2 - y1) / gridRes));
        const dx = (x2 - x1) / nx;
        const dy = (y2 - y1) / ny;
        
        for (let i = 0; i < nx; i++) {
            for (let j = 0; j < ny; j++) {
                const cx0 = x1 + i * dx;
                const cy0 = y1 + j * dy;
                const cx1 = cx0 + dx;
                const cy1 = cy0 + dy;
                
                // Check center of cell
                const centerX = (cx0 + cx1) / 2;
                const centerY = (cy0 + cy1) / 2;
                
                // Skip if cell center is inside any hole
                if (inHole(centerX, centerY)) continue;
                
                // Draw quad
                if (flipNormal) {
                    quad([cx0,cy0,z], [cx0,cy1,z], [cx1,cy1,z], [cx1,cy0,z]);
                } else {
                    quad([cx0,cy0,z], [cx1,cy0,z], [cx1,cy1,z], [cx0,cy1,z]);
                }
            }
        }
    }
    
    // Frame regions (excluding inner cutout)
    const regions = [
        [0, 0, innerX, outerHeight],           // Left
        [innerX + innerW, 0, outerWidth, outerHeight], // Right
        [innerX, 0, innerX + innerW, innerY],  // Top middle
        [innerX, innerY + innerH, innerX + innerW, outerHeight], // Bottom middle
    ];
    
    // Create top surfaces
    for (const [rx1, ry1, rx2, ry2] of regions) {
        createFrameSurface(rx1, ry1, rx2, ry2, z1, false);
    }
    // Create bottom surfaces  
    for (const [rx1, ry1, rx2, ry2] of regions) {
        createFrameSurface(rx1, ry1, rx2, ry2, z0, true);
    }
    
    // Create hole ring surfaces (connect hole edge to surrounding grid)
    for (const h of holes) {
        createHoleSurface(h, z1, false); // Top
        createHoleSurface(h, z0, true);  // Bottom
    }
    
    // Outer walls
    quad([0,0,z0], [outerWidth,0,z0], [outerWidth,0,z1], [0,0,z1]);
    quad([outerWidth,0,z0], [outerWidth,outerHeight,z0], [outerWidth,outerHeight,z1], [outerWidth,0,z1]);
    quad([outerWidth,outerHeight,z0], [0,outerHeight,z0], [0,outerHeight,z1], [outerWidth,outerHeight,z1]);
    quad([0,outerHeight,z0], [0,0,z0], [0,0,z1], [0,outerHeight,z1]);
    
    // Inner walls (cutout)
    quad([innerX,innerY,z0], [innerX,innerY,z1], [innerX+innerW,innerY,z1], [innerX+innerW,innerY,z0]);
    quad([innerX+innerW,innerY,z0], [innerX+innerW,innerY,z1], [innerX+innerW,innerY+innerH,z1], [innerX+innerW,innerY+innerH,z0]);
    quad([innerX+innerW,innerY+innerH,z0], [innerX+innerW,innerY+innerH,z1], [innerX,innerY+innerH,z1], [innerX,innerY+innerH,z0]);
    quad([innerX,innerY+innerH,z0], [innerX,innerY+innerH,z1], [innerX,innerY,z1], [innerX,innerY,z0]);
    
    // Cylinder walls for each hole (connect top and bottom hole edges)
    for (const h of holes) {
        for (let i = 0; i < segments; i++) {
            const a1 = (i / segments) * Math.PI * 2;
            const a2 = ((i + 1) / segments) * Math.PI * 2;
            
            const x1 = h.cx + h.r * Math.cos(a1);
            const y1 = h.cy + h.r * Math.sin(a1);
            const x2 = h.cx + h.r * Math.cos(a2);
            const y2 = h.cy + h.r * Math.sin(a2);
            
            // Cylinder wall - normals point inward (into the hole)
            quad([x1,y1,z0], [x2,y2,z0], [x2,y2,z1], [x1,y1,z1]);
        }
    }
    
    // Generate binary STL
    const numTriangles = triangles.length;
    const bufferSize = 84 + numTriangles * 50;
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);
    
    // Header (80 bytes)
    const header = "OS Designer Frame STL";
    for (let i = 0; i < 80; i++) {
        view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
    }
    
    // Number of triangles (4 bytes)
    view.setUint32(80, numTriangles, true);
    
    // Triangles
    let offset = 84;
    for (const t of triangles) {
        // Normal
        view.setFloat32(offset, t.n[0], true); offset += 4;
        view.setFloat32(offset, t.n[1], true); offset += 4;
        view.setFloat32(offset, t.n[2], true); offset += 4;
        // Vertex 1
        view.setFloat32(offset, t.v1[0], true); offset += 4;
        view.setFloat32(offset, t.v1[1], true); offset += 4;
        view.setFloat32(offset, t.v1[2], true); offset += 4;
        // Vertex 2
        view.setFloat32(offset, t.v2[0], true); offset += 4;
        view.setFloat32(offset, t.v2[1], true); offset += 4;
        view.setFloat32(offset, t.v2[2], true); offset += 4;
        // Vertex 3
        view.setFloat32(offset, t.v3[0], true); offset += 4;
        view.setFloat32(offset, t.v3[1], true); offset += 4;
        view.setFloat32(offset, t.v3[2], true); offset += 4;
        // Attribute byte count
        view.setUint16(offset, 0, true); offset += 2;
    }
    
    // Download
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `os-frame-${GRID_SIZE_X}x${GRID_SIZE_Y}-${thickness}mm.stl`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Visual feedback
    const btn = document.getElementById('exportSTLBtn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Downloaded!';
    btn.disabled = true;
    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }, 1500);
}

