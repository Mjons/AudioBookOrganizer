// AudioBook Organizer - Edit Mode Module

import { setBookText, isDocxFile, isTxtFile, getCurrentFileName } from './state.js';
import { showSuccess, showInfo, showWarning } from './notifications.js';

// Edit mode state
let isEditMode = false;
let originalContent = ''; // Track original content when entering edit mode
let originalFormattingData = null; // Track original formatting data when entering edit mode

// Edit protection event handlers
let protectionHandlers = {
    input: null,
    paste: null,
    drop: null,
    keydown: null
};

// Track if protection is currently active
let isProtectionActive = false;

// Get edit mode state
export function getEditMode() {
    return isEditMode;
}

// Create confirmation dialog
function createConfirmationDialog() {
    // Remove any existing dialog
    const existingDialog = document.getElementById('editModeConfirmDialog');
    if (existingDialog) {
        existingDialog.remove();
    }

    // Create dialog HTML
    const dialog = document.createElement('div');
    dialog.id = 'editModeConfirmDialog';
    dialog.innerHTML = `
        <div class="confirmation-dialog-overlay">
            <div class="confirmation-dialog">
                <div class="dialog-header">
                    <h3>📝 Save Changes?</h3>
                </div>
                <div class="dialog-content">
                    <p>You have made changes to the book content. What would you like to do?</p>
                </div>
                <div class="dialog-actions">
                    <button id="saveChangesBtn" class="btn btn-primary">
                        💾 Save Changes
                    </button>
                    <button id="discardChangesBtn" class="btn btn-secondary">
                        🗑️ Discard Changes
                    </button>
                    <button id="cancelBtn" class="btn btn-cancel">
                        ❌ Cancel
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .confirmation-dialog-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(4px);
        }
        .confirmation-dialog {
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 450px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: dialogSlideIn 0.3s ease-out;
        }
        @keyframes dialogSlideIn {
            from {
                opacity: 0;
                transform: translateY(-20px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
        .dialog-header h3 {
            margin: 0 0 16px 0;
            color: #333;
            font-size: 20px;
        }
        .dialog-content p {
            margin: 0 0 24px 0;
            color: #666;
            line-height: 1.5;
        }
        .dialog-actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
        }
        .dialog-actions .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s ease;
        }
        .dialog-actions .btn-primary {
            background: #4CAF50;
            color: white;
        }
        .dialog-actions .btn-primary:hover {
            background: #45a049;
            transform: translateY(-1px);
        }
        .dialog-actions .btn-secondary {
            background: #ff9800;
            color: white;
        }
        .dialog-actions .btn-secondary:hover {
            background: #f57c00;
            transform: translateY(-1px);
        }
        .dialog-actions .btn-cancel {
            background: #f44336;
            color: white;
        }
        .dialog-actions .btn-cancel:hover {
            background: #d32f2f;
            transform: translateY(-1px);
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(dialog);

    return dialog;
}

// Show confirmation dialog and return a promise
function showConfirmationDialog() {
    return new Promise((resolve) => {
        const dialog = createConfirmationDialog();
        
        const saveBtn = dialog.querySelector('#saveChangesBtn');
        const discardBtn = dialog.querySelector('#discardChangesBtn');
        const cancelBtn = dialog.querySelector('#cancelBtn');
        
        function cleanup() {
            dialog.remove();
        }
        
        saveBtn.addEventListener('click', () => {
            cleanup();
            resolve('save');
        });
        
        discardBtn.addEventListener('click', () => {
            cleanup();
            resolve('discard');
        });
        
        cancelBtn.addEventListener('click', () => {
            cleanup();
            resolve('cancel');
        });
        
        // Close on escape key
        function handleKeydown(e) {
            if (e.key === 'Escape') {
                cleanup();
                resolve('cancel');
                document.removeEventListener('keydown', handleKeydown);
            }
        }
        document.addEventListener('keydown', handleKeydown);
    });
}

// Toggle edit mode function
export async function toggleEditMode() {
    const bookContent = document.getElementById('bookContent');
    const toggleBtn = document.getElementById('toggleEditBtn');
    const btnIcon = toggleBtn?.querySelector('i');
    const btnText = document.getElementById('editModeText');
    
    if (!bookContent || !toggleBtn) {
        console.error('Required elements for edit mode toggle not found');
        return;
    }
    
    console.log('Toggling edit mode. Current state:', isEditMode ? 'EDIT' : 'VIEW');
    
    if (isEditMode) {
        // Exiting Edit Mode - check for changes (compare HTML to preserve formatting)
        const currentContent = bookContent.innerHTML;
        const hasChanges = currentContent !== originalContent;
        
        if (hasChanges) {
            // Show confirmation dialog
            const choice = await showConfirmationDialog();
            
            if (choice === 'cancel') {
                // User cancelled, stay in edit mode
                return;
            } else if (choice === 'save') {
                // Save changes and update formatting positions
                const newText = bookContent.textContent;
                setBookText(newText); // Save plain text for state
                
                // Update formatting ranges to match new text length
                try {
                    const { updateFormattingForTextChange } = await import('./formattingState.js');
                    const { applyFormattingToDOM } = await import('./formattingRenderer.js');
                    
                    // Update formatting positions based on text changes
                    updateFormattingForTextChange(newText);
                    console.log('✅ Formatting ranges updated for text changes');
                    
                    // Apply formatting after a brief delay to ensure DOM is stable
                    setTimeout(() => {
                        applyFormattingToDOM();
                        console.log('✅ Formatting maintained in view mode after save');
                    }, 100);
                } catch (error) {
                    console.error('Error maintaining formatting after save:', error);
                }
                
                exitEditMode();
                showSuccess('✅ Changes saved successfully! View mode enabled.');
            } else if (choice === 'discard') {
                // Discard changes - restore original content AND clear formatting data
                bookContent.innerHTML = originalContent;
                setBookText(bookContent.textContent); // Update state with plain text
                
                // FIXED: Restore original formatting data when discarding changes
                try {
                    const { setFormattingData } = await import('./formattingState.js');
                    if (originalFormattingData) {
                        setFormattingData(originalFormattingData);
                        console.log('✅ Original formatting data restored when discarding changes');
                        
                        // Apply the restored formatting to DOM for consistent display
                        const { applyFormattingToDOM } = await import('./formattingRenderer.js');
                        applyFormattingToDOM();
                        console.log('✅ Original formatting applied to DOM after discard');
                    } else {
                        const { clearFormatting } = await import('./formattingState.js');
                        clearFormatting();
                        console.log('✅ Formatting data cleared when discarding changes (no original data)');
                    }
                } catch (error) {
                    console.error('Error restoring original formatting data:', error);
                }
                
                exitEditMode();
                showWarning('🗑️ Changes discarded! Original content restored and view mode enabled.');
            }
        } else {
            // No changes made
            exitEditMode();
            showInfo('ℹ️ No changes detected. View mode enabled.');
        }
    } else {
        // Entering Edit Mode
        await enterEditMode();
    }
    
    console.log(`Edit mode: ${isEditMode ? 'ON' : 'OFF'}`);
}

// Enter edit mode
async function enterEditMode() {
    const bookContent = document.getElementById('bookContent');
    const toggleBtn = document.getElementById('toggleEditBtn');
    const btnIcon = toggleBtn.querySelector('i');
    const btnText = document.getElementById('editModeText');
    
    isEditMode = true;
    
    // Store original content when entering edit mode (preserve formatting)
    originalContent = bookContent.innerHTML;
    
    // Store original formatting data to restore on discard
    try {
        const { formattingData } = await import('./formattingState.js');
        originalFormattingData = JSON.parse(JSON.stringify(formattingData)); // Deep copy
        console.log('✅ Original formatting data stored');
    } catch (error) {
        console.error('Error storing original formatting data:', error);
        originalFormattingData = null;
    }
    
    // Determine edit mode type based on file type
    const fileType = isDocxFile() ? 'DOCX' : 'TXT';
    const fileName = getCurrentFileName();
    
    // Update UI with file type indication
    bookContent.classList.add('edit-mode');
    bookContent.classList.add(isDocxFile() ? 'edit-mode-docx' : 'edit-mode-txt');
    toggleBtn.classList.add('edit-active');
    btnIcon.textContent = '📝';
    btnText.textContent = `Edit Mode (${fileType})`;
    
    // Remove edit protection
    removeEditProtection();
    
    // Handle different edit modes
    if (isTxtFile()) {
        await enterTxtEditMode(bookContent, fileName);
    } else if (isDocxFile()) {
        await enterDocxEditMode(bookContent, fileName);
    }
    
    // Focus the content area
    bookContent.focus();
}

// Enter TXT edit mode (simple, fast, no formatting complications)
async function enterTxtEditMode(bookContent, fileName) {
    console.log('📝 Entering TXT edit mode for:', fileName);
    
    try {
        // Show simple formatting toolbar for TXT files
        const { showFormattingToolbar } = await import('./formattingToolbar.js');
        showFormattingToolbar();
        console.log('✅ TXT formatting toolbar shown');
        
        // Initialize basic formatting shortcuts
        const { initializeFormattingShortcuts, initializeSelectionTracking } = await import('./formattingToolbar.js');
        initializeFormattingShortcuts();
        initializeSelectionTracking();
        console.log('✅ TXT formatting shortcuts initialized');
        
        showInfo('📝 TXT Edit mode enabled! You can modify text and apply basic formatting.');
        
    } catch (error) {
        console.error('❌ Error initializing TXT edit mode:', error);
        showInfo('📝 TXT Edit mode enabled! (Basic editing only)');
    }
}

// Enter DOCX edit mode (formatting-aware, more complex)
async function enterDocxEditMode(bookContent, fileName) {
    console.log('📝 Entering DOCX edit mode for:', fileName);
    
    try {
        // Show DOCX-aware formatting toolbar
        const { showFormattingToolbar } = await import('./formattingToolbar.js');
        showFormattingToolbar();
        console.log('✅ DOCX formatting toolbar shown');
        
        // Apply existing DOCX formatting to DOM
        const { applyFormattingToDOM } = await import('./formattingRenderer.js');
        applyFormattingToDOM();
        console.log('✅ DOCX formatting applied to DOM');
        
        // Initialize DOCX-aware formatting shortcuts
        const { initializeFormattingShortcuts, initializeSelectionTracking } = await import('./formattingToolbar.js');
        initializeFormattingShortcuts();
        initializeSelectionTracking();
        console.log('✅ DOCX formatting shortcuts initialized');
        
        // Log debugging info for DOCX
        const { logFormattingState } = await import('./formattingState.js');
        logFormattingState();
        
        showInfo('📝 DOCX Edit mode enabled! Rich formatting is preserved. Edit carefully to maintain formatting.');
        
        // DEBUGGING: Force CSS test for DOCX
        setTimeout(() => {
            console.log('🔍 DOCX DEBUGGING: Book content classes:', bookContent.className);
            console.log('🔍 DOCX DEBUGGING: Formatting elements in DOM:', bookContent.querySelectorAll('[data-formatting-id]').length);
        }, 100);
        
    } catch (error) {
        console.error('❌ Error initializing DOCX edit mode:', error);
        showInfo('📝 DOCX Edit mode enabled! (Limited formatting support)');
    }
}

// Exit edit mode
function exitEditMode() {
    const bookContent = document.getElementById('bookContent');
    const toggleBtn = document.getElementById('toggleEditBtn');
    const btnIcon = toggleBtn.querySelector('i');
    const btnText = document.getElementById('editModeText');
    
    isEditMode = false;
    
    // Update UI - remove all edit mode classes
    bookContent.classList.remove('edit-mode', 'edit-mode-txt', 'edit-mode-docx');
    toggleBtn.classList.remove('edit-active');
    btnIcon.textContent = '👁';
    btnText.textContent = 'View Mode';
    
    // Hide formatting toolbar
    import('./formattingToolbar.js').then(({ hideFormattingToolbar }) => {
        hideFormattingToolbar();
    }).catch(error => {
        console.error('Error hiding formatting toolbar:', error);
    });
    
    // Re-apply edit protection
    applyEditProtection();
    
    // Clear original content and formatting data
    originalContent = '';
    originalFormattingData = null;
}

// Track if we've already shown the warning to avoid spam
let hasShownEditWarning = false;

// Show edit mode warning
function showEditModeWarning() {
    if (hasShownEditWarning) return; // Don't spam the user
    
    hasShownEditWarning = true;
    
    // Reset the warning flag after a delay so it can show again later
    setTimeout(() => {
        hasShownEditWarning = false;
    }, 5000); // 5 seconds cooldown
    
    showInfo('📝 To edit the text, click the "View Mode" button (it will change to "Edit Mode" when clicked)!');
}

// Initialize book content protection system
export function initializeEditProtection() {
    // Create the protection handlers
    protectionHandlers.input = function(e) {
        console.log('Input event triggered, edit mode:', isEditMode);
        if (!isEditMode) {
            e.preventDefault();
            e.stopPropagation();
            showEditModeWarning();
            return false;
        }
    };
    
    protectionHandlers.paste = function(e) {
        console.log('Paste event triggered, edit mode:', isEditMode);
        if (!isEditMode) {
            e.preventDefault();
            e.stopPropagation();
            showEditModeWarning();
            return false;
        }
    };
    
    protectionHandlers.drop = function(e) {
        console.log('Drop event triggered, edit mode:', isEditMode);
        if (!isEditMode) {
            e.preventDefault();
            e.stopPropagation();
            showEditModeWarning();
            return false;
        }
    };
    
    protectionHandlers.keydown = function(e) {
        console.log('Keydown event triggered, edit mode:', isEditMode, 'key:', e.key);
        if (!isEditMode) {
            // Allow cursor movement keys but prevent text input
            const allowedKeys = [
                'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
                'Home', 'End', 'PageUp', 'PageDown',
                'Tab', 'Escape'
            ];
            
            if (!allowedKeys.includes(e.key) && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                e.stopPropagation();
                showEditModeWarning();
                return false;
            }
        }
    };
    
    // Ensure the UI reflects the initial state
    updateEditModeUI();
    
    // Apply initial protection only if not in edit mode
    if (!isEditMode) {
        applyEditProtection();
    }
    
    console.log('Edit protection system initialized with edit mode:', isEditMode);
}

// Update edit mode UI to reflect current state
function updateEditModeUI() {
    const bookContent = document.getElementById('bookContent');
    const toggleBtn = document.getElementById('toggleEditBtn');
    const btnIcon = toggleBtn?.querySelector('i');
    const btnText = document.getElementById('editModeText');
    
    if (!bookContent || !toggleBtn || !btnIcon || !btnText) {
        console.warn('Edit mode UI elements not found');
        return;
    }
    
    if (isEditMode) {
        bookContent.classList.add('edit-mode');
        toggleBtn.classList.add('edit-active');
        btnIcon.textContent = '📝';
        btnText.textContent = 'Edit Mode';
    } else {
        bookContent.classList.remove('edit-mode');
        toggleBtn.classList.remove('edit-active');
        btnIcon.textContent = '👁';
        btnText.textContent = 'View Mode';
    }
    
    console.log('Edit mode UI updated, current mode:', isEditMode ? 'EDIT' : 'VIEW');
}

// Apply edit protection
function applyEditProtection() {
    const bookContent = document.getElementById('bookContent');
    if (!bookContent || isProtectionActive) return; // Don't double-apply
    
    // Remove any existing listeners first
    removeEditProtection();
    
    bookContent.addEventListener('input', protectionHandlers.input);
    bookContent.addEventListener('paste', protectionHandlers.paste);
    bookContent.addEventListener('drop', protectionHandlers.drop);
    bookContent.addEventListener('keydown', protectionHandlers.keydown);
    
    isProtectionActive = true;
    console.log('Edit protection applied');
}

// Remove edit protection  
function removeEditProtection() {
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) return;
    
    bookContent.removeEventListener('input', protectionHandlers.input);
    bookContent.removeEventListener('paste', protectionHandlers.paste);
    bookContent.removeEventListener('drop', protectionHandlers.drop);
    bookContent.removeEventListener('keydown', protectionHandlers.keydown);
    
    isProtectionActive = false;
    console.log('Edit protection removed');
}

// Force refresh edit mode state (useful after dynamic content changes)
export function refreshEditModeState() {
    console.log('Refreshing edit mode state...');
    updateEditModeUI();
    
    if (!isEditMode && !isProtectionActive) {
        applyEditProtection();
    } else if (isEditMode && isProtectionActive) {
        removeEditProtection();
    }
    
    console.log('Edit mode state refreshed. Mode:', isEditMode ? 'EDIT' : 'VIEW', 'Protection active:', isProtectionActive);
} 