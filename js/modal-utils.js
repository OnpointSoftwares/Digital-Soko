// Modal Utility Functions for Digital Soko
// Replaces JavaScript alerts with beautiful center modals

window.ModalUtils = {
  /**
   * Show a success modal
   */
  showSuccess(message, onClose = null) {
    this.showModal('Success!', message, 'success', onClose);
  },

  /**
   * Show an error modal
   */
  showError(message, onClose = null) {
    this.showModal('Error', message, 'error', onClose);
  },

  /**
   * Show an info modal
   */
  showInfo(title, message, onClose = null) {
    this.showModal(title, message, 'info', onClose);
  },

  /**
   * Show a confirmation modal
   */
  showConfirm(title, message, onConfirm, onCancel = null) {
    this.showModal(title, message, 'confirm', null, onConfirm, onCancel);
  },

  /**
   * Main modal function
   */
  showModal(title, content, type = 'info', onClose = null, onConfirm = null, onCancel = null) {
    // Remove existing modal if any
    const existingModal = document.getElementById('utilityModal');
    if (existingModal) {
      existingModal.remove();
    }

    const config = this.getModalConfig(type);
    const buttons = this.getModalButtons(type, onClose, onConfirm, onCancel);
    
    const modalHtml = `
      <div id="utilityModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl shadow-2xl p-8 w-11/12 max-w-md text-center transform transition-all">
          <div class="mb-6">
            <div class="mx-auto w-20 h-20 ${config.iconBg} rounded-full flex items-center justify-center">
              <svg class="w-12 h-12 ${config.iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                ${config.icon}
              </svg>
            </div>
          </div>
          <h3 class="text-2xl font-bold text-gray-800 mb-2">${title}</h3>
          <div class="text-gray-600 mb-6">
            ${typeof content === 'string' ? `<p>${content}</p>` : content}
          </div>
          <div class="flex justify-center space-x-3">
            ${buttons}
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  },

  /**
   * Get modal configuration based on type
   */
  getModalConfig(type) {
    const configs = {
      success: {
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>'
      },
      error: {
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>'
      },
      info: {
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
      },
      confirm: {
        iconBg: 'bg-yellow-100',
        iconColor: 'text-yellow-600',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>'
      }
    };
    return configs[type] || configs.info;
  },

  /**
   * Get modal buttons based on type
   */
  getModalButtons(type, onClose, onConfirm, onCancel) {
    const closeModal = () => {
      const modal = document.getElementById('utilityModal');
      if (modal) modal.remove();
    };

    if (type === 'confirm') {
      return `
        <button onclick="ModalUtils.handleCancel(${onCancel ? 'true' : 'false'})" 
                class="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition">
          Cancel
        </button>
        <button onclick="ModalUtils.handleConfirm(${onConfirm ? 'true' : 'false'})" 
                class="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
          Confirm
        </button>
      `;
    }

    const buttonClass = type === 'success' ? 'bg-green-600 hover:bg-green-700' : 
                      type === 'error' ? 'bg-red-600 hover:bg-red-700' : 
                      'bg-blue-600 hover:bg-blue-700';

    return `
      <button onclick="ModalUtils.handleClose(${onClose ? 'true' : 'false'})" 
              class="px-6 py-3 ${buttonClass} text-white rounded-lg font-semibold transition">
        ${type === 'success' ? 'Continue' : 'Close'}
      </button>
    `;
  },

  /**
   * Handle modal close
   */
  handleClose(hasCallback) {
    const modal = document.getElementById('utilityModal');
    if (modal) {
      modal.remove();
      if (hasCallback && this.currentOnClose) {
        this.currentOnClose();
        this.currentOnClose = null;
      }
    }
  },

  /**
   * Handle modal confirm
   */
  handleConfirm(hasCallback) {
    const modal = document.getElementById('utilityModal');
    if (modal) {
      modal.remove();
      if (hasCallback && this.currentOnConfirm) {
        this.currentOnConfirm();
        this.currentOnConfirm = null;
      }
    }
  },

  /**
   * Handle modal cancel
   */
  handleCancel(hasCallback) {
    const modal = document.getElementById('utilityModal');
    if (modal) {
      modal.remove();
      if (hasCallback && this.currentOnCancel) {
        this.currentOnCancel();
        this.currentOnCancel = null;
      }
    }
  },

  // Store callbacks for button handlers
  currentOnClose: null,
  currentOnConfirm: null,
  currentOnCancel: null
};

// Store callbacks when showing modals
const originalShowModal = window.ModalUtils.showModal;
window.ModalUtils.showModal = function(title, content, type, onClose, onConfirm, onCancel) {
  this.currentOnClose = onClose;
  this.currentOnConfirm = onConfirm;
  this.currentOnCancel = onCancel;
  return originalShowModal.call(this, title, content, type, onClose, onConfirm, onCancel);
};
