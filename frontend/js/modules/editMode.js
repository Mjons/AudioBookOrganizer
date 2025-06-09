// AudioBook Organizer - Edit Mode Module

import { setBookText } from './state.js';
import { showSuccess, showInfo, showWarning } from './notifications.js';

// Edit mode state
let isEditMode = false;
let originalContent = ''; // Track original content when entering edit mode

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
        // Exiting Edit Mode - check for changes
        const currentContent = bookContent.textContent;
        const hasChanges = currentContent !== originalContent;
        
        if (hasChanges) {
            // Show confirmation dialog
            const choice = await showConfirmationDialog();
            
            if (choice === 'cancel') {
                // User cancelled, stay in edit mode
                return;
            } else if (choice === 'save') {
                // Save changes
                setBookText(currentContent);
                exitEditMode();
                showSuccess('✅ Changes saved successfully! View mode enabled.');
            } else if (choice === 'discard') {
                // Discard changes - restore original content
                bookContent.textContent = originalContent;
                setBookText(originalContent);
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
        enterEditMode();
    }
    
    console.log(`Edit mode: ${isEditMode ? 'ON' : 'OFF'}`);
}

// Enter edit mode
function enterEditMode() {
    const bookContent = document.getElementById('bookContent');
    const toggleBtn = document.getElementById('toggleEditBtn');
    const btnIcon = toggleBtn.querySelector('i');
    const btnText = document.getElementById('editModeText');
    
    isEditMode = true;
    
    // Store original content when entering edit mode
    originalContent = bookContent.textContent;
    
    // Update UI
    bookContent.classList.add('edit-mode');
    toggleBtn.classList.add('edit-active');
    btnIcon.textContent = '📝';
    btnText.textContent = 'Edit Mode';
    
    // Remove edit protection
    removeEditProtection();
    
    // Focus the content area
    bookContent.focus();
    
    showInfo('📝 Edit mode enabled! You can now modify the book text.');
}

// Exit edit mode
function exitEditMode() {
    const bookContent = document.getElementById('bookContent');
    const toggleBtn = document.getElementById('toggleEditBtn');
    const btnIcon = toggleBtn.querySelector('i');
    const btnText = document.getElementById('editModeText');
    
    isEditMode = false;
    
    // Update UI
    bookContent.classList.remove('edit-mode');
    toggleBtn.classList.remove('edit-active');
    btnIcon.textContent = '👁';
    btnText.textContent = 'View Mode';
    
    // Re-apply edit protection
    applyEditProtection();
    
    // Clear original content
    originalContent = '';
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