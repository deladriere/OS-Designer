// Global state
let shapes = [];
let placedShapes = [];
let libraryShapes = [];
let shapeIdCounter = 0;
let libraryIdCounter = 0;
let draggedShape = null;
let draggedFromGrid = false;
let draggedFromLibrary = false;
let screwHoleElements = [];
let gridColumnEdges = [];
let gridRowEdges = [];
let customColors = [];
let selectedColor = null;
let selectedLibraryColor = null;
let OUTER_BORDER_LR_CM = 1;
let OUTER_BORDER_TB_CM = 1;
let OUTER_BORDER_COLOR = '#ffffff';
const GRID_SETTINGS_KEY = 'osDesignerGridSettings';
const LIBRARY_SHAPES_KEY = 'osDesignerLibraryShapes';

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
const CELL_SIZE_PX = 75;
const GRID_GAP = 1;
let GRID_SIZE_X = 8;
let GRID_SIZE_Y = 8;
let CELL_SIZE = CELL_SIZE_PX;
let SCREW_DIAMETER = 4;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadGridSettings();
    loadCustomColors();
    loadLibraryShapes();
    initializeGrid();
    setupEventListeners();
    setupIconMenu();
    updateGridSizeDisplay();
    renderColorSettingsInputs();
    selectedColor = customColors[0] || null;
    selectedLibraryColor = customColors[0] || null;
    renderDesignerColorPalette();
    renderLibraryColorPalette();
    updateGridColorPalette();
    applyOuterBorderPadding();
    updateProjectInfo();
    renderLibraryShapesList();
    renderDesignerLibraryPalette();
});

function initializeGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    grid.style.setProperty('--grid-size-x', GRID_SIZE_X);
    grid.style.setProperty('--grid-size-y', GRID_SIZE_Y);
    const gridWidth = GRID_SIZE_X * CELL_SIZE;
    const gridHeight = GRID_SIZE_Y * CELL_SIZE;
    grid.style.width = gridWidth + 'px';
    grid.style.height = gridHeight + 'px';
    for (let i = 0; i < GRID_SIZE_X * GRID_SIZE_Y; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.index = i;
        grid.appendChild(cell);
    }
    renderScrewHoles();
    applyOuterBorderPadding();
}

function setupIconMenu() {
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(mi => mi.classList.remove('active'));
            item.classList.add('active');
            const panelName = item.dataset.panel;
            document.querySelectorAll('.panel').forEach(panel => {
                panel.style.display = 'none';
            });
            document.getElementById(panelName + 'Panel').style.display = 'block';
        });
    });
}

function setupEventListeners() {
    document.getElementById('createBtn').addEventListener('click', createShape);
    document.getElementById('clearBtn').addEventListener('click', clearGrid);
    document.getElementById('applyGridBtn').addEventListener('click', applyGridSize);
    document.getElementById('saveColorsBtn').addEventListener('click', saveCustomColors);
    document.getElementById('exportFrameBtn').addEventListener('click', exportOuterFrameSVG);
    document.getElementById('addToLibraryBtn').addEventListener('click', addShapeToLibrary);
    document.getElementById('exportLibraryBtn').addEventListener('click', exportLibrary);
    document.getElementById('importLibraryBtn').addEventListener('click', () => {
        document.getElementById('importLibraryInput').click();
    });
    document.getElementById('importLibraryInput').addEventListener('change', importLibrary);
    document.getElementById('saveProjectBtn').addEventListener('click', saveProject);
    document.getElementById('loadProjectBtn').addEventListener('click', () => {
        document.getElementById('loadProjectInput').click();
    });
    document.getElementById('loadProjectInput').addEventListener('change', loadProject);
    document.getElementById('exportSTLBtn').addEventListener('click', exportSTL);
    document.getElementById('previewSTLBtn').addEventListener('click', previewSTL);
    document.getElementById('closePreviewBtn').addEventListener('click', closePreview);
    document.getElementById('fillCenter').addEventListener('change', () => {
        const container = document.getElementById('stlPreviewContainer');
        if (container.style.display !== 'none') previewSTL();
    });
    document.getElementById('panelThickness').addEventListener('change', () => {
        const container = document.getElementById('stlPreviewContainer');
        if (container.style.display !== 'none') previewSTL();
    });
    const grid = document.getElementById('grid');
    grid.addEventListener('dragover', handleDragOver);
    grid.addEventListener('drop', handleDrop);
    grid.addEventListener('dragleave', handleDragLeave);
    const gridSizeXInput = document.getElementById('gridSizeX');
    const gridSizeYInput = document.getElementById('gridSizeY');
    const updateTotalSizeDisplay = () => {
        const sizeX = parseInt(gridSizeXInput.value) || GRID_SIZE_X;
        const sizeY = parseInt(gridSizeYInput.value) || GRID_SIZE_Y;
        document.getElementById('totalSize').textContent = (sizeX * 4) + 'cm x ' + (sizeY * 4) + 'cm';
        updateFrameSizeDisplay();
    };
    gridSizeXInput.addEventListener('input', updateTotalSizeDisplay);
    gridSizeYInput.addEventListener('input', updateTotalSizeDisplay);
    document.getElementById('outerBorderLR').addEventListener('input', updateFrameSizeDisplay);
    document.getElementById('outerBorderTB').addEventListener('input', updateFrameSizeDisplay);
}

function updateGridSizeDisplay() {
    document.getElementById('gridSizeX').value = GRID_SIZE_X;
    document.getElementById('gridSizeY').value = GRID_SIZE_Y;
    document.getElementById('totalSize').textContent = (GRID_SIZE_X * 4) + 'cm x ' + (GRID_SIZE_Y * 4) + 'cm';
    document.getElementById('screwDiameter').value = SCREW_DIAMETER;
    const lrInput = document.getElementById('outerBorderLR');
    const tbInput = document.getElementById('outerBorderTB');
    const colorInput = document.getElementById('outerBorderColor');
    if (lrInput) lrInput.value = OUTER_BORDER_LR_CM;
    if (tbInput) tbInput.value = OUTER_BORDER_TB_CM;
    if (colorInput) colorInput.value = OUTER_BORDER_COLOR;
    updateFrameSizeDisplay();
}

function updateFrameSizeDisplay() {
    const gridSizeX = parseInt(document.getElementById('gridSizeX').value) || GRID_SIZE_X;
    const gridSizeY = parseInt(document.getElementById('gridSizeY').value) || GRID_SIZE_Y;
    const borderLR = parseFloat(document.getElementById('outerBorderLR').value) || OUTER_BORDER_LR_CM;
    const borderTB = parseFloat(document.getElementById('outerBorderTB').value) || OUTER_BORDER_TB_CM;
    const frameWidth = (gridSizeX * 40) + (2 * borderLR * 10);
    const frameHeight = (gridSizeY * 40) + (2 * borderTB * 10);
    const displayElem = document.getElementById('frameSizeDisplay');
    if (displayElem) displayElem.textContent = frameWidth + 'mm x ' + frameHeight + 'mm';
}

function renderScrewHoles() {
    const grid = document.getElementById('grid');
    document.querySelectorAll('.screw-hole').forEach(el => el.remove());
    screwHoleElements = [];
    const screwRadiusPx = (SCREW_DIAMETER / 2) * (CELL_SIZE / 40);
    const gridCells = Array.from(grid.querySelectorAll('.grid-cell'));
    const firstRowCells = gridCells.slice(0, GRID_SIZE_X);
    const columnEdges = [];
    for (let col = 0; col <= GRID_SIZE_X; col++) {
        if (col === 0) columnEdges.push(firstRowCells[0].offsetLeft);
        else if (col === GRID_SIZE_X) columnEdges.push(firstRowCells[col - 1].offsetLeft + firstRowCells[col - 1].offsetWidth);
        else {
            const leftCell = firstRowCells[col - 1];
            const rightCell = firstRowCells[col];
            columnEdges.push((leftCell.offsetLeft + leftCell.offsetWidth + rightCell.offsetLeft) / 2);
        }
    }
    const rowEdges = [];
    for (let row = 0; row <= GRID_SIZE_Y; row++) {
        if (row === 0) rowEdges.push(gridCells[0].offsetTop);
        else if (row === GRID_SIZE_Y) {
            const lastRowFirstCell = gridCells[(row - 1) * GRID_SIZE_X];
            rowEdges.push(lastRowFirstCell.offsetTop + lastRowFirstCell.offsetHeight);
        } else {
            const topCell = gridCells[(row - 1) * GRID_SIZE_X];
            const bottomCell = gridCells[row * GRID_SIZE_X];
            rowEdges.push((topCell.offsetTop + topCell.offsetHeight + bottomCell.offsetTop) / 2);
        }
    }
    gridColumnEdges = columnEdges;
    gridRowEdges = rowEdges;
    for (let row = 0; row <= GRID_SIZE_Y; row++) {
        for (let col = 0; col <= GRID_SIZE_X; col++) {
            const screwHole = document.createElement('div');
            screwHole.className = 'screw-hole';
            screwHole.dataset.col = col;
            screwHole.dataset.row = row;
            screwHole.style.left = columnEdges[col] + 'px';
            screwHole.style.top = rowEdges[row] + 'px';
            screwHole.style.width = (screwRadiusPx * 2) + 'px';
            screwHole.style.height = (screwRadiusPx * 2) + 'px';
            screwHole.style.marginLeft = '-' + screwRadiusPx + 'px';
            screwHole.style.marginTop = '-' + screwRadiusPx + 'px';
            grid.appendChild(screwHole);
            screwHoleElements.push({ element: screwHole, col, row });
        }
    }
    updateScrewVisibility();
}

function applyGridSize() {
    const sizeX = parseInt(document.getElementById('gridSizeX').value);
    const sizeY = parseInt(document.getElementById('gridSizeY').value);
    const screwDiam = parseFloat(document.getElementById('screwDiameter').value);
    const borderLR = parseFloat(document.getElementById('outerBorderLR').value);
    const borderTB = parseFloat(document.getElementById('outerBorderTB').value);
    const borderColor = document.getElementById('outerBorderColor').value || '#ffffff';
    if (sizeX < 1 || sizeX > 16 || sizeY < 1 || sizeY > 16) { alert('Grid size must be between 1 and 16'); return; }
    if (screwDiam < 1 || screwDiam > 20) { alert('Screw diameter must be between 1 and 20mm'); return; }
    if (borderLR < 0 || borderTB < 0 || borderLR > 10 || borderTB > 10) { alert('Outer frame widths must be between 0 and 10 cm'); return; }
    const needsReset = sizeX !== GRID_SIZE_X || sizeY !== GRID_SIZE_Y || screwDiam !== SCREW_DIAMETER;
    if (needsReset && (placedShapes.length > 0 || shapes.length > 0)) {
        if (!confirm('Changing settings will clear all shapes. Continue?')) return;
    }
    if (needsReset) {
        shapes = []; placedShapes = []; shapeIdCounter = 0;
        GRID_SIZE_X = sizeX; GRID_SIZE_Y = sizeY; CELL_SIZE = CELL_SIZE_PX; SCREW_DIAMETER = screwDiam;
        document.getElementById('width').max = GRID_SIZE_X;
        document.getElementById('height').max = GRID_SIZE_Y;
        initializeGrid(); renderPlacedShapes(); renderShapesList(); updateGridColorPalette();
    }
    OUTER_BORDER_LR_CM = borderLR; OUTER_BORDER_TB_CM = borderTB; OUTER_BORDER_COLOR = borderColor;
    applyOuterBorderPadding(); saveGridSettings(); updateGridSizeDisplay(); updateProjectInfo();
}

function createShape() {
    const width = parseInt(document.getElementById('width').value);
    const height = parseInt(document.getElementById('height').value);
    const orientation = document.querySelector('input[name="orientation"]:checked').value;
    if (!selectedColor) { alert('Please select a color from the palette.'); return; }
    if (width < 1 || width > GRID_SIZE_X || height < 1 || height > GRID_SIZE_Y) {
        alert('Width must be between 1 and ' + GRID_SIZE_X + ', height must be between 1 and ' + GRID_SIZE_Y);
        return;
    }
    let finalWidth = width, finalHeight = height;
    if (orientation === 'horizontal') { if (height > width) { finalWidth = height; finalHeight = width; } }
    else { if (width > height) { finalWidth = height; finalHeight = width; } }
    shapes.push({ id: shapeIdCounter++, width: finalWidth, height: finalHeight, color: selectedColor, orientation: orientation });
    renderShapesList(); updateGridColorPalette();
}

function renderShapesList() {
    const shapesList = document.getElementById('shapesList');
    if (shapes.length === 0) { shapesList.innerHTML = '<p class="empty-message">No shapes created yet</p>'; return; }
    shapesList.innerHTML = '';
    shapes.forEach(shape => {
        const shapeItem = document.createElement('div');
        shapeItem.className = 'shape-item';
        shapeItem.draggable = true;
        shapeItem.dataset.shapeId = shape.id;
        const maxSize = 60;
        const scale = Math.min(maxSize / shape.width, maxSize / shape.height, 15);
        const displayName = shape.name ? '<strong>' + shape.name + '</strong><br>' : '';
        const sizeDisplay = shape.name ? (shape.width + 'x' + shape.height) : ('<strong>' + shape.width + 'x' + shape.height + '</strong>');
        shapeItem.innerHTML = '<div class="shape-preview" style="background-color:' + shape.color + ';width:' + (shape.width * scale) + 'px;height:' + (shape.height * scale) + 'px;"></div><div class="shape-info">' + displayName + sizeDisplay + ' units<br><small>(' + (shape.width * 4) + 'cm x ' + (shape.height * 4) + 'cm)</small><br><small style="color:#667eea;">' + shape.orientation + '</small></div>';
        shapeItem.addEventListener('dragstart', handleDragStart);
        shapeItem.addEventListener('dragend', handleDragEnd);
        shapesList.appendChild(shapeItem);
    });
}


function handleDragStart(e) {
    // Use closest() to handle clicks on child elements (labels, etc.)
    const placedShape = e.target.closest('.placed-shape');
    const libraryItem = e.target.closest('.library-palette-item');
    const shapeItem = e.target.closest('.shape-item');
    
    if (placedShape) {
        draggedFromGrid = true; draggedFromLibrary = false;
        const placedId = parseInt(placedShape.dataset.placedId);
        const found = placedShapes.find(s => s.id === placedId);
        draggedShape = { ...found.shape, gridX: found.x, gridY: found.y, placedId: found.id };
        placedShape.classList.add('dragging');
    } else if (libraryItem) {
        draggedFromGrid = false; draggedFromLibrary = true;
        const libraryId = parseInt(libraryItem.dataset.libraryId);
        const libShape = libraryShapes.find(s => s.id === libraryId);
        if (libShape) {
            draggedShape = { id: shapeIdCounter++, width: libShape.width, height: libShape.height, color: libShape.color, orientation: libShape.orientation, name: libShape.name, libraryId: libShape.id };
        }
        libraryItem.classList.add('dragging');
    } else if (shapeItem) {
        draggedFromGrid = false; draggedFromLibrary = false;
        const shapeId = parseInt(shapeItem.dataset.shapeId);
        draggedShape = shapes.find(s => s.id === shapeId);
        shapeItem.classList.add('dragging');
    }
    e.dataTransfer.effectAllowed = 'move';
}


function handleDragEnd(e) {
    // Remove dragging class from the correct element
    const el = e.target.closest('.placed-shape, .library-palette-item, .shape-item');
    if (el) el.classList.remove('dragging');
    draggedShape = null; draggedFromGrid = false; draggedFromLibrary = false;
    const preview = document.querySelector('.preview-shape');
    if (preview) preview.remove();
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!draggedShape) return;
    const grid = document.getElementById('grid');
    const rect = grid.getBoundingClientRect();
    const gridX = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const gridY = Math.floor((e.clientY - rect.top) / CELL_SIZE);
    showPreview(gridX, gridY);
}

function showPreview(gridX, gridY) {
    const oldPreview = document.querySelector('.preview-shape');
    if (oldPreview) oldPreview.remove();
    const isValid = canPlaceShape(draggedShape, gridX, gridY, draggedFromGrid ? draggedShape.placedId : null);
    const preview = document.createElement('div');
    preview.className = 'preview-shape ' + (isValid ? '' : 'invalid-preview');
    preview.style.left = getEdgePosition(gridColumnEdges, gridX, CELL_SIZE) + 'px';
    preview.style.top = getEdgePosition(gridRowEdges, gridY, CELL_SIZE) + 'px';
    preview.style.width = getSpanSize(gridColumnEdges, gridX, draggedShape.width, CELL_SIZE) + 'px';
    preview.style.height = getSpanSize(gridRowEdges, gridY, draggedShape.height, CELL_SIZE) + 'px';
    document.getElementById('grid').appendChild(preview);
}

function handleDrop(e) {
    e.preventDefault();
    if (!draggedShape) return;
    const grid = document.getElementById('grid');
    const rect = grid.getBoundingClientRect();
    const gridX = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const gridY = Math.floor((e.clientY - rect.top) / CELL_SIZE);
    if (canPlaceShape(draggedShape, gridX, gridY, draggedFromGrid ? draggedShape.placedId : null)) {
        if (draggedFromGrid) {
            const placedShape = placedShapes.find(s => s.id === draggedShape.placedId);
            placedShape.x = gridX; placedShape.y = gridY;
        } else if (draggedFromLibrary) {
            placedShapes.push({ id: Date.now(), shape: draggedShape, x: gridX, y: gridY });
        } else {
            placedShapes.push({ id: Date.now(), shape: draggedShape, x: gridX, y: gridY });
            shapes = shapes.filter(s => s.id !== draggedShape.id);
            renderShapesList();
        }
        renderPlacedShapes(); updateGridColorPalette();
    }
    const preview = document.querySelector('.preview-shape');
    if (preview) preview.remove();
    grid.classList.remove('drag-over');
}

function handleDragLeave(e) {
    if (e.target.id === 'grid') {
        const preview = document.querySelector('.preview-shape');
        if (preview) preview.remove();
    }
}

function canPlaceShape(shape, gridX, gridY, ignoreId) {
    if (gridX < 0 || gridY < 0 || gridX + shape.width > GRID_SIZE_X || gridY + shape.height > GRID_SIZE_Y) return false;
    for (let placed of placedShapes) {
        if (ignoreId !== null && placed.id === ignoreId) continue;
        if (gridX < placed.x + placed.shape.width && gridX + shape.width > placed.x &&
            gridY < placed.y + placed.shape.height && gridY + shape.height > placed.y) return false;
    }
    return true;
}

function renderPlacedShapes() {
    document.querySelectorAll('.placed-shape').forEach(el => el.remove());
    placedShapes.forEach(placed => {
        const shapeEl = document.createElement('div');
        shapeEl.className = 'placed-shape';
        shapeEl.draggable = true;
        shapeEl.dataset.placedId = placed.id;
        shapeEl.style.left = getEdgePosition(gridColumnEdges, placed.x, CELL_SIZE) + 'px';
        shapeEl.style.top = getEdgePosition(gridRowEdges, placed.y, CELL_SIZE) + 'px';
        shapeEl.style.width = getSpanSize(gridColumnEdges, placed.x, placed.shape.width, CELL_SIZE) + 'px';
        shapeEl.style.height = getSpanSize(gridRowEdges, placed.y, placed.shape.height, CELL_SIZE) + 'px';
        shapeEl.style.backgroundColor = placed.shape.color;
        const sizeText = placed.shape.width + 'x' + placed.shape.height;
        if (placed.shape.name) {
            shapeEl.innerHTML = '<span class="shape-label">' + placed.shape.name + '<br><small>' + sizeText + '</small></span>';
        } else {
            shapeEl.textContent = sizeText;
        }
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Delete shape (or right-click)';
        deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteShape(placed.id); });
        shapeEl.appendChild(deleteBtn);
        shapeEl.addEventListener('dragstart', handleDragStart);
        shapeEl.addEventListener('dragend', handleDragEnd);
        shapeEl.addEventListener('contextmenu', (e) => { e.preventDefault(); deleteShape(placed.id); });
        document.getElementById('grid').appendChild(shapeEl);
    });
    updateScrewVisibility();
}

function clearGrid() {
    if (placedShapes.length === 0) return;
    if (confirm('Are you sure you want to clear the grid?')) {
        placedShapes.forEach(placed => { if (!placed.shape.libraryId) shapes.push(placed.shape); });
        placedShapes = [];
        renderPlacedShapes(); renderShapesList(); updateGridColorPalette();
    }
}

function deleteShape(placedId) {
    const placed = placedShapes.find(s => s.id === placedId);
    if (!placed) return;
    if (!placed.shape.libraryId) shapes.push(placed.shape);
    placedShapes = placedShapes.filter(s => s.id !== placedId);
    renderPlacedShapes(); renderShapesList(); updateGridColorPalette(); updateScrewVisibility();
}

function updateScrewVisibility() {
    if (!screwHoleElements.length) return;
    screwHoleElements.forEach(hole => hole.element.classList.remove('hidden-screw'));
    placedShapes.forEach(placed => {
        const startX = placed.x, endX = placed.x + placed.shape.width;
        const startY = placed.y, endY = placed.y + placed.shape.height;
        screwHoleElements.forEach(hole => {
            if (hole.col > startX && hole.col < endX && hole.row > startY && hole.row < endY) {
                hole.element.classList.add('hidden-screw');
            }
        });
    });
}

function updateGridColorPalette() {
    const palette = document.getElementById('gridColorPalette');
    if (!palette) return;
    const usedColors = new Set();
    placedShapes.forEach(placed => usedColors.add(placed.shape.color.toLowerCase()));
    if (usedColors.size === 0) { palette.innerHTML = '<span class="color-palette-label">Colors from grid will appear here</span>'; return; }
    palette.innerHTML = '';
    usedColors.forEach(color => {
        const colorItem = document.createElement('div');
        colorItem.className = 'color-palette-item' + (selectedColor && color === selectedColor.toLowerCase() ? ' selected' : '');
        colorItem.style.backgroundColor = color;
        colorItem.title = 'Click to use ' + color;
        colorItem.addEventListener('click', () => selectColor(color));
        palette.appendChild(colorItem);
    });
}

function loadCustomColors() {
    const stored = localStorage.getItem('osDesignerColors');
    if (stored) { try { const parsed = JSON.parse(stored); if (Array.isArray(parsed)) customColors = parsed.slice(0, 10); } catch (err) { console.warn('Unable to parse saved colors', err); } }
    if (!customColors.length) customColors = DEFAULT_COLORS.slice(0, 10);
    while (customColors.length < 10) customColors.push('#cccccc');
}

function renderColorSettingsInputs() {
    const list = document.getElementById('colorSettingsList');
    if (!list) return;
    list.innerHTML = '';
    customColors.forEach((color, index) => {
        const item = document.createElement('div');
        item.className = 'color-setting-item';
        const label = document.createElement('label');
        label.textContent = 'Color ' + (index + 1);
        const input = document.createElement('input');
        input.type = 'color'; input.value = color; input.dataset.index = index;
        input.addEventListener('input', (e) => {
            const oldColor = customColors[index];
            customColors[index] = e.target.value;
            if (selectedColor && oldColor && selectedColor.toLowerCase() === oldColor.toLowerCase()) selectedColor = customColors[index];
            if (selectedLibraryColor && oldColor && selectedLibraryColor.toLowerCase() === oldColor.toLowerCase()) selectedLibraryColor = customColors[index];
            renderDesignerColorPalette(); renderLibraryColorPalette(); updateGridColorPalette();
        });
        item.appendChild(label); item.appendChild(input); list.appendChild(item);
    });
}

function saveCustomColors() {
    localStorage.setItem('osDesignerColors', JSON.stringify(customColors));
    const btn = document.getElementById('saveColorsBtn');
    if (btn) { const orig = btn.textContent; btn.textContent = 'Saved!'; btn.disabled = true; setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1200); }
}

function renderDesignerColorPalette() {
    const palette = document.getElementById('designerColorPalette');
    if (!palette) return;
    palette.innerHTML = '';
    customColors.forEach(color => {
        const colorItem = document.createElement('div');
        colorItem.className = 'color-palette-item' + (selectedColor && color.toLowerCase() === selectedColor.toLowerCase() ? ' selected' : '');
        colorItem.style.backgroundColor = color;
        colorItem.title = 'Use ' + color;
        colorItem.addEventListener('click', () => selectColor(color));
        palette.appendChild(colorItem);
    });
}

function renderLibraryColorPalette() {
    const palette = document.getElementById('libraryColorPalette');
    if (!palette) return;
    palette.innerHTML = '';
    customColors.forEach(color => {
        const colorItem = document.createElement('div');
        colorItem.className = 'color-palette-item' + (selectedLibraryColor && color.toLowerCase() === selectedLibraryColor.toLowerCase() ? ' selected' : '');
        colorItem.style.backgroundColor = color;
        colorItem.title = 'Use ' + color;
        colorItem.addEventListener('click', () => selectLibraryColor(color));
        palette.appendChild(colorItem);
    });
}

function selectColor(color) { if (!color) return; selectedColor = color; renderDesignerColorPalette(); updateGridColorPalette(); }
function selectLibraryColor(color) { if (!color) return; selectedLibraryColor = color; renderLibraryColorPalette(); }

// ===== LIBRARY FUNCTIONS =====
function loadLibraryShapes() {
    const stored = localStorage.getItem(LIBRARY_SHAPES_KEY);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                libraryShapes = parsed;
                libraryShapes.forEach(s => { if (s.id >= libraryIdCounter) libraryIdCounter = s.id + 1; });
            }
        } catch (err) { console.warn('Unable to parse saved library shapes', err); }
    }
}

function saveLibraryShapes() { localStorage.setItem(LIBRARY_SHAPES_KEY, JSON.stringify(libraryShapes)); }

function addShapeToLibrary() {
    const nameInput = document.getElementById('libraryShapeName');
    const width = parseInt(document.getElementById('libraryWidth').value);
    const height = parseInt(document.getElementById('libraryHeight').value);
    const orientation = document.querySelector('input[name="libraryOrientation"]:checked').value;
    const name = nameInput.value.trim();
    if (!name) { alert('Please enter a name for the library shape.'); nameInput.focus(); return; }
    if (!selectedLibraryColor) { alert('Please select a color for the library shape.'); return; }
    if (width < 1 || height < 1) { alert('Width and height must be at least 1.'); return; }
    let finalWidth = width, finalHeight = height;
    if (orientation === 'horizontal') { if (height > width) { finalWidth = height; finalHeight = width; } }
    else { if (width > height) { finalWidth = height; finalHeight = width; } }
    libraryShapes.push({ id: libraryIdCounter++, name: name, width: finalWidth, height: finalHeight, color: selectedLibraryColor, orientation: orientation });
    saveLibraryShapes(); renderLibraryShapesList(); renderDesignerLibraryPalette();
    nameInput.value = '';
    const btn = document.getElementById('addToLibraryBtn');
    const orig = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-check"></i> Added!'; btn.disabled = true;
    setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 1200);
}

function renderLibraryShapesList() {
    const list = document.getElementById('libraryShapesList');
    if (!list) return;
    if (libraryShapes.length === 0) { list.innerHTML = '<p class="empty-message">No shapes in library yet</p>'; return; }
    list.innerHTML = '';
    libraryShapes.forEach(shape => {
        const item = document.createElement('div');
        item.className = 'library-shape-item';
        const maxSize = 50;
        const scale = Math.min(maxSize / shape.width, maxSize / shape.height, 12);
        item.innerHTML = '<div class="library-shape-preview" style="background-color:' + shape.color + ';width:' + (shape.width * scale) + 'px;height:' + (shape.height * scale) + 'px;"></div><div class="library-shape-info"><strong>' + shape.name + '</strong><br><span>' + shape.width + 'x' + shape.height + '</span> units<br><small>(' + (shape.width * 4) + 'cm x ' + (shape.height * 4) + 'cm)</small></div><button class="library-delete-btn" data-library-id="' + shape.id + '" title="Delete from library"><i class="fa-solid fa-trash"></i></button>';
        item.querySelector('.library-delete-btn').addEventListener('click', (e) => { e.stopPropagation(); deleteLibraryShape(shape.id); });
        list.appendChild(item);
    });
}

function deleteLibraryShape(libraryId) {
    if (!confirm('Delete this shape from your library?')) return;
    libraryShapes = libraryShapes.filter(s => s.id !== libraryId);
    saveLibraryShapes(); renderLibraryShapesList(); renderDesignerLibraryPalette();
}

async function exportLibrary() {
    if (libraryShapes.length === 0) {
        alert('Your library is empty. Add some shapes first.');
        return;
    }
    const libraryData = {
        version: '1.0',
        type: 'os-designer-library',
        timestamp: new Date().toISOString(),
        shapes: libraryShapes.map(s => ({ name: s.name, width: s.width, height: s.height, color: s.color, orientation: s.orientation }))
    };
    const json = JSON.stringify(libraryData, null, 2);
    const defaultFileName = 'os-designer-library.json';
    
    if (typeof window.showSaveFilePicker === 'function') {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: defaultFileName,
                types: [{ description: 'JSON Library File', accept: { 'application/json': ['.json'] } }]
            });
            const writable = await handle.createWritable();
            await writable.write(json);
            await writable.close();
            const btn = document.getElementById('exportLibraryBtn');
            const orig = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-check"></i> Exported!'; btn.disabled = true;
            setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 1500);
            return;
        } catch (err) {
            if (err.name === 'AbortError') return;
        }
    }
    
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = defaultFileName;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href);
    const btn = document.getElementById('exportLibraryBtn');
    const orig = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-check"></i> Exported!'; btn.disabled = true;
    setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 1500);
}

function importLibrary(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data.shapes)) {
                alert('Invalid library file format.');
                return;
            }
            const existingNames = new Set(libraryShapes.map(s => s.name.toLowerCase()));
            let addedCount = 0;
            data.shapes.forEach(s => {
                if (s.name && !existingNames.has(s.name.toLowerCase())) {
                    libraryShapes.push({ id: libraryIdCounter++, name: s.name, width: s.width, height: s.height, color: s.color, orientation: s.orientation });
                    existingNames.add(s.name.toLowerCase());
                    addedCount++;
                }
            });
            saveLibraryShapes();
            renderLibraryShapesList();
            renderDesignerLibraryPalette();
            const btn = document.getElementById('importLibraryBtn');
            const orig = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-check"></i> +' + addedCount + ' shapes'; btn.disabled = true;
            setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 2000);
        } catch (err) {
            console.error('Error importing library:', err);
            alert('Error importing library file.');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function renderDesignerLibraryPalette() {
    const palette = document.getElementById('designerLibraryPalette');
    if (!palette) return;
    if (libraryShapes.length === 0) { palette.innerHTML = '<p class="empty-message">No library shapes yet. Create them in the Library menu.</p>'; return; }
    palette.innerHTML = '';
    libraryShapes.forEach(shape => {
        const item = document.createElement('div');
        item.className = 'library-palette-item';
        item.draggable = true;
        item.dataset.libraryId = shape.id;
        item.title = shape.name + ' (' + shape.width + 'x' + shape.height + ') - Drag to place or click to add';
        const maxSize = 40;
        const scale = Math.min(maxSize / shape.width, maxSize / shape.height, 10);
        item.innerHTML = '<div class="library-palette-preview" style="background-color:' + shape.color + ';width:' + (shape.width * scale) + 'px;height:' + (shape.height * scale) + 'px;"></div><span class="library-palette-name">' + shape.name + '</span>';
        item.addEventListener('click', () => addLibraryShapeToQueue(shape.id));
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        palette.appendChild(item);
    });
}

function addLibraryShapeToQueue(libraryId) {
    const libraryShape = libraryShapes.find(s => s.id === libraryId);
    if (!libraryShape) return;
    shapes.push({ id: shapeIdCounter++, width: libraryShape.width, height: libraryShape.height, color: libraryShape.color, orientation: libraryShape.orientation, name: libraryShape.name, libraryId: libraryShape.id });
    renderShapesList(); updateGridColorPalette();
}

// Helpers
function getEdgePosition(edges, index, fallback) {
    if (edges.length) return edges[Math.max(0, Math.min(index, edges.length - 1))];
    return index * fallback;
}
function getSpanSize(edges, startIndex, span, fallback) {
    if (edges.length) return getEdgePosition(edges, startIndex + span, fallback) - getEdgePosition(edges, startIndex, fallback);
    return span * fallback;
}
function applyOuterBorderPadding() {
    const container = document.querySelector('.grid-container');
    if (!container) return;
    const pxPerCm = CELL_SIZE / 4;
    container.style.padding = (OUTER_BORDER_TB_CM * pxPerCm) + 'px ' + (OUTER_BORDER_LR_CM * pxPerCm) + 'px';
    container.style.backgroundColor = OUTER_BORDER_COLOR;
}
function loadGridSettings() {
    const defaults = { gridSizeX: 8, gridSizeY: 8, screwDiameter: 4, outerLR: 1, outerTB: 1, outerColor: '#ffffff' };
    let stored = defaults;
    const raw = localStorage.getItem(GRID_SETTINGS_KEY);
    if (raw) { try { const parsed = JSON.parse(raw); if (parsed.gridSize && !parsed.gridSizeX) { parsed.gridSizeX = parsed.gridSize; parsed.gridSizeY = parsed.gridSize; } stored = { ...defaults, ...parsed }; } catch (err) { console.warn('Unable to parse grid settings', err); } }
    GRID_SIZE_X = clamp(stored.gridSizeX, 1, 16); GRID_SIZE_Y = clamp(stored.gridSizeY, 1, 16);
    SCREW_DIAMETER = clamp(stored.screwDiameter, 1, 20);
    OUTER_BORDER_LR_CM = clamp(stored.outerLR, 0, 10); OUTER_BORDER_TB_CM = clamp(stored.outerTB, 0, 10);
    OUTER_BORDER_COLOR = stored.outerColor || '#ffffff'; CELL_SIZE = CELL_SIZE_PX;
}
function saveGridSettings() {
    localStorage.setItem(GRID_SETTINGS_KEY, JSON.stringify({ gridSizeX: GRID_SIZE_X, gridSizeY: GRID_SIZE_Y, screwDiameter: SCREW_DIAMETER, outerLR: OUTER_BORDER_LR_CM, outerTB: OUTER_BORDER_TB_CM, outerColor: OUTER_BORDER_COLOR }));
}
function clamp(value, min, max) { const num = Number(value); if (Number.isNaN(num)) return min; return Math.min(Math.max(num, min), max); }


async function saveProject() {
    const projectData = {
        version: '1.1', timestamp: new Date().toISOString(),
        settings: { gridSizeX: GRID_SIZE_X, gridSizeY: GRID_SIZE_Y, screwDiameter: SCREW_DIAMETER, outerBorderLR: OUTER_BORDER_LR_CM, outerBorderTB: OUTER_BORDER_TB_CM, outerBorderColor: OUTER_BORDER_COLOR },
        colors: customColors,
        libraryShapes: libraryShapes.map(s => ({ id: s.id, name: s.name, width: s.width, height: s.height, color: s.color, orientation: s.orientation })),
        shapes: shapes.map(s => ({ id: s.id, width: s.width, height: s.height, color: s.color, orientation: s.orientation, name: s.name || null, libraryId: s.libraryId || null })),
        placedShapes: placedShapes.map(p => ({ id: p.id, x: p.x, y: p.y, shape: { id: p.shape.id, width: p.shape.width, height: p.shape.height, color: p.shape.color, orientation: p.shape.orientation, name: p.shape.name || null, libraryId: p.shape.libraryId || null } }))
    };
    const json = JSON.stringify(projectData, null, 2);
    const defaultFileName = 'os-designer-project-' + GRID_SIZE_X + 'x' + GRID_SIZE_Y + '.json';
    
    // Try to use File System Access API (allows "Save As" dialog)
    if (typeof window.showSaveFilePicker === 'function') {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: defaultFileName,
                types: [{ description: 'JSON Project File', accept: { 'application/json': ['.json'] } }]
            });
            const writable = await handle.createWritable();
            await writable.write(json);
            await writable.close();
            const btn = document.getElementById('saveProjectBtn');
            const orig = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-check"></i> Saved!'; btn.disabled = true;
            setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 1500);
            return;
        } catch (err) {
            if (err.name === 'AbortError') return; // User cancelled
            console.warn('File System Access API failed, falling back to download', err);
        }
    }
    
    // Fallback: traditional download
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = defaultFileName;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href);
    const btn = document.getElementById('saveProjectBtn');
    const orig = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-check"></i> Saved!'; btn.disabled = true;
    setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 1500);
}

function loadProject(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const projectData = JSON.parse(e.target.result);
            if (!projectData.settings || !projectData.colors) { alert('Invalid project file format.'); return; }
            const s = projectData.settings;
            GRID_SIZE_X = clamp(s.gridSizeX || 8, 1, 16); GRID_SIZE_Y = clamp(s.gridSizeY || 8, 1, 16);
            SCREW_DIAMETER = clamp(s.screwDiameter || 4, 1, 20);
            OUTER_BORDER_LR_CM = clamp(s.outerBorderLR || 1, 0, 10); OUTER_BORDER_TB_CM = clamp(s.outerBorderTB || 1, 0, 10);
            OUTER_BORDER_COLOR = s.outerBorderColor || '#ffffff'; CELL_SIZE = CELL_SIZE_PX;
            if (Array.isArray(projectData.colors)) { customColors = projectData.colors.slice(0, 10); while (customColors.length < 10) customColors.push('#cccccc'); }
            // Merge library shapes from project (add new ones, keep existing)
            if (Array.isArray(projectData.libraryShapes)) {
                const existingNames = new Set(libraryShapes.map(s => s.name.toLowerCase()));
                projectData.libraryShapes.forEach(ls => {
                    if (!existingNames.has(ls.name.toLowerCase())) {
                        libraryShapes.push({ id: libraryIdCounter++, name: ls.name, width: ls.width, height: ls.height, color: ls.color, orientation: ls.orientation });
                    }
                });
                saveLibraryShapes();
            }
            shapes = []; placedShapes = []; shapeIdCounter = 0;
            if (Array.isArray(projectData.shapes)) {
                projectData.shapes.forEach(ps => { shapes.push({ id: shapeIdCounter++, width: ps.width, height: ps.height, color: ps.color, orientation: ps.orientation, name: ps.name || null, libraryId: ps.libraryId || null }); });
            }
            if (Array.isArray(projectData.placedShapes)) {
                projectData.placedShapes.forEach(p => { placedShapes.push({ id: Date.now() + Math.random(), x: p.x, y: p.y, shape: { id: shapeIdCounter++, width: p.shape.width, height: p.shape.height, color: p.shape.color, orientation: p.shape.orientation, name: p.shape.name || null, libraryId: p.shape.libraryId || null } }); });
            }
            document.getElementById('width').max = GRID_SIZE_X;
            document.getElementById('height').max = GRID_SIZE_Y;
            initializeGrid(); renderPlacedShapes(); renderShapesList(); updateGridSizeDisplay();
            renderColorSettingsInputs(); renderDesignerColorPalette(); renderLibraryColorPalette();
            updateGridColorPalette(); updateProjectInfo(); renderLibraryShapesList(); renderDesignerLibraryPalette(); saveGridSettings();
            const btn = document.getElementById('loadProjectBtn');
            const orig = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-check"></i> Loaded!'; btn.disabled = true;
            setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 1500);
        } catch (err) { console.error('Error loading project:', err); alert('Error loading project file. Please check the file format.'); }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function updateProjectInfo() {
    const infoGridSize = document.getElementById('infoGridSize');
    const infoScrewDiam = document.getElementById('infoScrewDiam');
    const infoFrameSize = document.getElementById('infoFrameSize');
    if (infoGridSize) infoGridSize.textContent = GRID_SIZE_X + ' x ' + GRID_SIZE_Y + ' units (' + (GRID_SIZE_X * 4) + 'cm x ' + (GRID_SIZE_Y * 4) + 'cm)';
    if (infoScrewDiam) infoScrewDiam.textContent = SCREW_DIAMETER + 'mm';
    if (infoFrameSize) infoFrameSize.textContent = ((GRID_SIZE_X * 40) + (OUTER_BORDER_LR_CM * 20)) + 'mm x ' + ((GRID_SIZE_Y * 40) + (OUTER_BORDER_TB_CM * 20)) + 'mm';
    
    // Update bottom-left display
    const infoGridDisplay = document.getElementById('infoGridDisplay');
    const infoFrameDisplay = document.getElementById('infoFrameDisplay');
    if (infoGridDisplay) infoGridDisplay.textContent = GRID_SIZE_X + 'x' + GRID_SIZE_Y + ' units';
    if (infoFrameDisplay) {
        const frameW = (GRID_SIZE_X * 40) + (OUTER_BORDER_LR_CM * 20);
        const frameH = (GRID_SIZE_Y * 40) + (OUTER_BORDER_TB_CM * 20);
        infoFrameDisplay.textContent = frameW + 'x' + frameH + 'mm';
    }
}

function exportOuterFrameSVG() {
    const gridWidthMM = GRID_SIZE_X * 40, gridHeightMM = GRID_SIZE_Y * 40;
    const borderLR_MM = OUTER_BORDER_LR_CM * 10, borderTB_MM = OUTER_BORDER_TB_CM * 10;
    const screwRadiusMM = SCREW_DIAMETER / 2, unitSizeMM = 40;
    const outerWidth = gridWidthMM + (2 * borderLR_MM), outerHeight = gridHeightMM + (2 * borderTB_MM);
    const innerX = borderLR_MM, innerY = borderTB_MM;
    let screwHolesContent = '';
    for (let row = 0; row <= GRID_SIZE_Y; row++) {
        for (let col = 0; col <= GRID_SIZE_X; col++) {
            const isPerimeter = (row === 0 || row === GRID_SIZE_Y || col === 0 || col === GRID_SIZE_X);
            if (!isPerimeter) continue;
            const cx = innerX + (col * unitSizeMM), cy = innerY + (row * unitSizeMM), r = screwRadiusMM;
            const isTop = (row === 0), isBot = (row === GRID_SIZE_Y), isLeft = (col === 0), isRight = (col === GRID_SIZE_X);
            let pathData = '';
            if (isTop && isLeft) pathData = 'M ' + (cx + r) + ' ' + cy + ' A ' + r + ' ' + r + ' 0 1 0 ' + cx + ' ' + (cy + r);
            else if (isTop && isRight) pathData = 'M ' + cx + ' ' + (cy + r) + ' A ' + r + ' ' + r + ' 0 1 0 ' + (cx - r) + ' ' + cy;
            else if (isBot && isLeft) pathData = 'M ' + cx + ' ' + (cy - r) + ' A ' + r + ' ' + r + ' 0 1 0 ' + (cx + r) + ' ' + cy;
            else if (isBot && isRight) pathData = 'M ' + (cx - r) + ' ' + cy + ' A ' + r + ' ' + r + ' 0 1 0 ' + cx + ' ' + (cy - r);
            else if (isLeft) pathData = 'M ' + cx + ' ' + (cy - r) + ' A ' + r + ' ' + r + ' 0 0 0 ' + cx + ' ' + (cy + r);
            else if (isRight) pathData = 'M ' + cx + ' ' + (cy + r) + ' A ' + r + ' ' + r + ' 0 0 0 ' + cx + ' ' + (cy - r);
            else if (isTop) pathData = 'M ' + (cx - r) + ' ' + cy + ' A ' + r + ' ' + r + ' 0 0 1 ' + (cx + r) + ' ' + cy;
            else if (isBot) pathData = 'M ' + (cx + r) + ' ' + cy + ' A ' + r + ' ' + r + ' 0 0 1 ' + (cx - r) + ' ' + cy;
            if (pathData) screwHolesContent += '        <path d="' + pathData + '" fill="none" stroke="#000000" stroke-width="0.1"/>\n';
        }
    }
    let outerFrameSegments = '', innerFrameSegments = '';
    for (let i = 0; i < GRID_SIZE_X; i++) {
        const x1 = innerX + i * unitSizeMM + screwRadiusMM, x2 = innerX + (i + 1) * unitSizeMM - screwRadiusMM;
        outerFrameSegments += '        <line x1="' + x1 + '" y1="0" x2="' + x2 + '" y2="0" stroke="#000000" stroke-width="0.1"/>\n';
        outerFrameSegments += '        <line x1="' + x1 + '" y1="' + outerHeight + '" x2="' + x2 + '" y2="' + outerHeight + '" stroke="#000000" stroke-width="0.1"/>\n';
        innerFrameSegments += '        <line x1="' + x1 + '" y1="' + innerY + '" x2="' + x2 + '" y2="' + innerY + '" stroke="#000000" stroke-width="0.1"/>\n';
        innerFrameSegments += '        <line x1="' + x1 + '" y1="' + (innerY + gridHeightMM) + '" x2="' + x2 + '" y2="' + (innerY + gridHeightMM) + '" stroke="#000000" stroke-width="0.1"/>\n';
    }
    for (let i = 0; i < GRID_SIZE_Y; i++) {
        const y1 = innerY + i * unitSizeMM + screwRadiusMM, y2 = innerY + (i + 1) * unitSizeMM - screwRadiusMM;
        outerFrameSegments += '        <line x1="0" y1="' + y1 + '" x2="0" y2="' + y2 + '" stroke="#000000" stroke-width="0.1"/>\n';
        outerFrameSegments += '        <line x1="' + outerWidth + '" y1="' + y1 + '" x2="' + outerWidth + '" y2="' + y2 + '" stroke="#000000" stroke-width="0.1"/>\n';
        innerFrameSegments += '        <line x1="' + innerX + '" y1="' + y1 + '" x2="' + innerX + '" y2="' + y2 + '" stroke="#000000" stroke-width="0.1"/>\n';
        innerFrameSegments += '        <line x1="' + (innerX + gridWidthMM) + '" y1="' + y1 + '" x2="' + (innerX + gridWidthMM) + '" y2="' + y2 + '" stroke="#000000" stroke-width="0.1"/>\n';
    }
    const svgContent = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<svg width="' + outerWidth + 'mm" height="' + outerHeight + 'mm" viewBox="0 0 ' + outerWidth + ' ' + outerHeight + '" xmlns="http://www.w3.org/2000/svg">\n    <g id="outer-frame-edges">\n' + outerFrameSegments + '    </g>\n    <g id="inner-frame-edges">\n' + innerFrameSegments + '    </g>\n    <g id="screw-holes">\n' + screwHolesContent + '    </g>\n</svg>';
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'outer-frame-' + GRID_SIZE_X + 'x' + GRID_SIZE_Y + '-' + outerWidth + 'x' + outerHeight + 'mm.svg';
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href);
    const btn = document.getElementById('exportFrameBtn');
    const orig = btn.textContent; btn.textContent = 'Downloaded!'; btn.disabled = true;
    setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1500);
}

// Earcut triangulation - MIT License Mapbox
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
    if (clockwise === (signedArea(data, start, end, dim) > 0)) { for (let i = start; i < end; i += dim) last = insertNode(i, data[i], data[i + 1], last); }
    else { for (let i = end - dim; i >= start; i -= dim) last = insertNode(i, data[i], data[i + 1], last); }
    if (last && equals(last, last.next)) { removeNode(last); last = last.next; }
    return last;
}
function insertNode(i, x, y, last) {
    const p = { i, x, y };
    if (!last) { p.prev = p; p.next = p; } else { p.next = last.next; p.prev = last; last.next.prev = p; last.next = p; }
    return p;
}
function removeNode(p) { p.next.prev = p.prev; p.prev.next = p.next; if (p.prevZ) p.prevZ.nextZ = p.nextZ; if (p.nextZ) p.nextZ.prevZ = p.prevZ; }
function signedArea(data, start, end, dim) { let sum = 0; for (let i = start, j = end - dim; i < end; i += dim) { sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1]); j = i; } return sum; }
function eliminateHoles(data, holeIndices, outerNode, dim) {
    const queue = [];
    for (let i = 0, len = holeIndices.length; i < len; i++) {
        const start = holeIndices[i] * dim, end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
        const list = linkedList(data, start, end, dim, false);
        if (list === list.next) list.steiner = true;
        queue.push(getLeftmost(list));
    }
    queue.sort((a, b) => a.x - b.x);
    for (let i = 0; i < queue.length; i++) { eliminateHole(queue[i], outerNode); outerNode = linkedList(data, queue[i].i, queue[i].i, dim, true); }
    return outerNode;
}
function eliminateHole(hole, outerNode) { let bridge = findHoleBridge(hole, outerNode); if (!bridge) return; const bridgeReverse = splitPolygon(bridge, hole); earcutLinked(bridgeReverse, null, 2, 0); }
function findHoleBridge(hole, outerNode) {
    let p = outerNode; const hx = hole.x, hy = hole.y; let qx = -Infinity, m = null;
    do { if (hy <= p.y && hy >= p.next.y) { const x = p.x + (hy - p.y) * (p.next.x - p.x) / (p.next.y - p.y); if (x <= hx && x > qx) { qx = x; if (x === hx) { if (hy === p.y) return p; if (hy === p.next.y) return p.next; } m = p.x < p.next.x ? p : p.next; } } p = p.next; } while (p !== outerNode);
    if (!m) return null; if (hx === qx) return m.prev;
    const stop = m; let mx = m.x, my = m.y, tanMin = Infinity, tan;
    p = m.next; while (p !== stop) { if (hx >= p.x && p.x >= mx && pointInTriangle(hy < my ? hx : qx, hy, mx, my, hy < my ? qx : hx, hy, p.x, p.y)) { tan = Math.abs(hy - p.y) / (hx - p.x); if ((tan < tanMin || (tan === tanMin && p.x > m.x)) && locallyInside(p, hole)) { m = p; tanMin = tan; } } p = p.next; }
    return m;
}
function splitPolygon(a, b) { const a2 = { i: a.i, x: a.x, y: a.y, prev: null, next: null }, b2 = { i: b.i, x: b.x, y: b.y, prev: null, next: null }; const an = a.next, bp = b.prev; a.next = b; b.prev = a; a2.next = an; an.prev = a2; b2.next = a2; a2.prev = b2; bp.next = b2; b2.prev = bp; return b2; }
function earcutLinked(ear, triangles, dim) { if (!ear) return; let stop = ear, prev, next; while (ear.prev !== ear.next) { prev = ear.prev; next = ear.next; if (isEar(ear)) { if (triangles) { triangles.push(prev.i / dim); triangles.push(ear.i / dim); triangles.push(next.i / dim); } removeNode(ear); ear = next.next; stop = next.next; continue; } ear = next; if (ear === stop) break; } }
function isEar(ear) { const a = ear.prev, b = ear, c = ear.next; if (area(a, b, c) >= 0) return false; let p = ear.next.next; while (p !== ear.prev) { if (pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) && area(p.prev, p, p.next) >= 0) return false; p = p.next; } return true; }
function area(p, q, r) { return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y); }
function pointInTriangle(ax, ay, bx, by, cx, cy, px, py) { return (cx - px) * (ay - py) - (ax - px) * (cy - py) >= 0 && (ax - px) * (by - py) - (bx - px) * (ay - py) >= 0 && (bx - px) * (cy - py) - (cx - px) * (by - py) >= 0; }
function equals(p1, p2) { return p1.x === p2.x && p1.y === p2.y; }
function getLeftmost(start) { let p = start, leftmost = start; do { if (p.x < leftmost.x || (p.x === leftmost.x && p.y < leftmost.y)) leftmost = p; p = p.next; } while (p !== start); return leftmost; }
function locallyInside(a, b) { return area(a.prev, a, a.next) < 0 ? area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0 : area(a, b, a.prev) < 0 || area(a, a.next, b) < 0; }
earcut.flatten = function (rings) { const dim = 2, result = { vertices: [], holes: [], dim }; let holeIndex = 0; for (let i = 0; i < rings.length; i++) { const ring = rings[i]; result.vertices.push(ring[0], ring[1]); for (let j = 2; j < ring.length; j += dim) result.vertices.push(ring[j], ring[j + 1]); if (i > 0) { holeIndex += rings[i - 1].length / dim; result.holes.push(holeIndex); } } return result; };

// CSG to THREE.js geometry conversion
function CSGToThreeGeometry(csg) {
    const vertices = [], normals = [], indices = [];
    let vertexIndex = 0;
    csg.toPolygons().forEach(polygon => {
        const vertices3D = polygon.vertices.map(v => new THREE.Vector3(v.pos.x, v.pos.y, v.pos.z));
        if (vertices3D.length < 3) return;
        const normal = new THREE.Vector3(polygon.plane.normal.x, polygon.plane.normal.y, polygon.plane.normal.z);
        const firstIndex = vertexIndex;
        vertices.push(vertices3D[0].x, vertices3D[0].y, vertices3D[0].z);
        normals.push(normal.x, normal.y, normal.z);
        vertexIndex++;
        for (let i = 1; i < vertices3D.length; i++) {
            vertices.push(vertices3D[i].x, vertices3D[i].y, vertices3D[i].z);
            normals.push(normal.x, normal.y, normal.z);
            if (i >= 2) indices.push(firstIndex, vertexIndex - 1, vertexIndex);
            vertexIndex++;
        }
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    return geometry;
}

function createFrameGeometry() {
    const thickness = parseFloat(document.getElementById('panelThickness').value) || 3;
    const fillCenter = document.getElementById('fillCenter').checked;
    const borderX = OUTER_BORDER_LR_CM * 10, borderY = OUTER_BORDER_TB_CM * 10;
    const innerW = GRID_SIZE_X * 40, innerH = GRID_SIZE_Y * 40;
    const W = innerW + 2 * borderX, H = innerH + 2 * borderY;
    const screwR = SCREW_DIAMETER / 2, segments = 48;
    if (typeof CSG === 'undefined') throw new Error('CSG.js library not loaded');
    let result = CSG.cube({ center: [W/2, H/2, thickness/2], radius: [W/2, H/2, thickness/2] });
    if (!fillCenter) {
        const cutout = CSG.cube({ center: [W/2, H/2, thickness/2], radius: [(W - 2 * borderX)/2, (H - 2 * borderY)/2, thickness/2 + 0.5] });
        result = result.subtract(cutout);
    }
    for (let row = 0; row <= GRID_SIZE_Y; row++) {
        for (let col = 0; col <= GRID_SIZE_X; col++) {
            if (!fillCenter) { const isPerimeter = (row === 0 || row === GRID_SIZE_Y || col === 0 || col === GRID_SIZE_X); if (!isPerimeter) continue; }
            const cx = borderX + col * 40, cy = borderY + row * 40;
            const hole = CSG.cylinder({ start: [cx, cy, -0.5], end: [cx, cy, thickness + 0.5], radius: screwR, slices: segments });
            result = result.subtract(hole);
        }
    }
    return { csgGeometry: result, W, H, thickness };
}

let previewScene, previewCamera, previewRenderer, previewControls, previewMesh;

function previewSTL() {
    const container = document.getElementById('stlPreviewContainer');
    const canvas = document.getElementById('stlPreviewCanvas');
    if (!container || !canvas) return;
    container.style.display = 'block';
    let csgGeometry, W, H, thickness;
    try { const result = createFrameGeometry(); csgGeometry = result.csgGeometry; W = result.W; H = result.H; thickness = result.thickness; } catch (e) { console.error('Error creating geometry:', e); return; }
    let geometry;
    try { geometry = CSGToThreeGeometry(csgGeometry); } catch (e) { console.error('Error converting to THREE.js geometry:', e); return; }
    if (!previewScene) {
        previewScene = new THREE.Scene();
        previewScene.background = new THREE.Color(0x1a1a2e);
        previewCamera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 10000);
        previewRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        previewRenderer.setSize(container.clientWidth, container.clientHeight);
        previewControls = new THREE.OrbitControls(previewCamera, previewRenderer.domElement);
        previewControls.enableDamping = true;
        previewScene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const d1 = new THREE.DirectionalLight(0xffffff, 0.8); d1.position.set(1, 1, 1); previewScene.add(d1);
        const d2 = new THREE.DirectionalLight(0xffffff, 0.4); d2.position.set(-1, -1, -1); previewScene.add(d2);
        function animate() { requestAnimationFrame(animate); if (container.style.display !== 'none') { previewControls.update(); previewRenderer.render(previewScene, previewCamera); } }
        animate();
        window.addEventListener('resize', () => { if (container.style.display !== 'none') { previewCamera.aspect = container.clientWidth / container.clientHeight; previewCamera.updateProjectionMatrix(); previewRenderer.setSize(container.clientWidth, container.clientHeight); } });
    } else { previewCamera.aspect = container.clientWidth / container.clientHeight; previewCamera.updateProjectionMatrix(); previewRenderer.setSize(container.clientWidth, container.clientHeight); }
    if (previewMesh) { previewScene.remove(previewMesh); previewMesh.geometry.dispose(); }
    previewMesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color: 0x667eea, flatShading: false, side: THREE.DoubleSide }));
    previewMesh.position.set(-W/2, -H/2, -thickness/2);
    previewScene.add(previewMesh);
    const maxDim = Math.max(W, H), distance = maxDim * 1.5;
    previewCamera.position.set(distance * 0.5, distance * 0.5, distance * 0.7);
    previewControls.target.set(0, 0, 0);
    previewControls.update();
}

function closePreview() { document.getElementById('stlPreviewContainer').style.display = 'none'; }

function exportSTL() {
    const { csgGeometry, W, H, thickness } = createFrameGeometry();
    let geometry = CSGToThreeGeometry(csgGeometry);
    if (typeof THREE.BufferGeometryUtils !== 'undefined' && THREE.BufferGeometryUtils.mergeVertices) {
        geometry = THREE.BufferGeometryUtils.mergeVertices(geometry, 0.0001);
    }
    geometry.computeVertexNormals();
    if (typeof THREE.STLExporter !== 'undefined') {
        const exporter = new THREE.STLExporter();
        const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
        const stlData = exporter.parse(mesh, { binary: true });
        const blob = new Blob([stlData], { type: 'application/octet-stream' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'frame-' + W + 'x' + H + 'x' + thickness + 'mm.stl';
        link.click();
    } else {
        const position = geometry.attributes.position, normal = geometry.attributes.normal, index = geometry.index;
        let stlString = 'solid frame\n';
        for (let i = 0; i < index.count; i += 3) {
            const i0 = index.array[i], i1 = index.array[i + 1], i2 = index.array[i + 2];
            const nx = (normal.array[i0 * 3] + normal.array[i1 * 3] + normal.array[i2 * 3]) / 3;
            const ny = (normal.array[i0 * 3 + 1] + normal.array[i1 * 3 + 1] + normal.array[i2 * 3 + 1]) / 3;
            const nz = (normal.array[i0 * 3 + 2] + normal.array[i1 * 3 + 2] + normal.array[i2 * 3 + 2]) / 3;
            stlString += '  facet normal ' + nx + ' ' + ny + ' ' + nz + '\n    outer loop\n';
            stlString += '      vertex ' + position.array[i0 * 3] + ' ' + position.array[i0 * 3 + 1] + ' ' + position.array[i0 * 3 + 2] + '\n';
            stlString += '      vertex ' + position.array[i1 * 3] + ' ' + position.array[i1 * 3 + 1] + ' ' + position.array[i1 * 3 + 2] + '\n';
            stlString += '      vertex ' + position.array[i2 * 3] + ' ' + position.array[i2 * 3 + 1] + ' ' + position.array[i2 * 3 + 2] + '\n';
            stlString += '    endloop\n  endfacet\n';
        }
        stlString += 'endsolid frame\n';
        const blob = new Blob([stlString], { type: 'application/sla' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'frame-' + W + 'x' + H + 'x' + thickness + 'mm.stl';
        link.click();
    }
    const btn = document.getElementById('exportSTLBtn');
    if (btn) { const orig = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-check"></i> Done!'; btn.disabled = true; setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 1500); }
}
