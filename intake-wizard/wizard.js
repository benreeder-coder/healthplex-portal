/**
 * Intake Wizard - Step Navigation and State Management
 * Handles multi-step form navigation, validation, and progress tracking
 */

const IntakeWizard = {
  currentStep: 1,
  totalSteps: 8,
  stepValidation: {},
  startTime: null,
  stepNames: [
    '',  // index 0 unused
    'Patient Information',
    'Health Concerns',
    'Commitment & Vision',
    'Family History',
    'Digestive Health',
    'Metabolism & Adrenal',
    'Hormones',
    'Review & Submit'
  ],

  /**
   * Initialize the wizard
   */
  init() {
    this.startTime = Date.now();
    this.form = document.getElementById('intake-wizard-form');

    if (!this.form) {
      console.error('Intake wizard form not found');
      return;
    }

    this.setupNavigation();
    this.setupProgressIndicator();

    // Always start fresh - clear any previous progress
    localStorage.removeItem('healthplex_wizard_progress');
    localStorage.removeItem('healthplex_draft_intakeWizard');

    this.showStep(this.currentStep);

    // Initialize FormUtils for the wizard (disable its progress indicator - we have our own)
    if (window.FormUtils) {
      // Temporarily disable progress indicator for the wizard
      const originalSetting = window.HEALTHPLEX_CONFIG?.settings?.showProgressIndicator;
      if (window.HEALTHPLEX_CONFIG?.settings) {
        window.HEALTHPLEX_CONFIG.settings.showProgressIndicator = false;
      }
      FormUtils.init('intake-wizard-form', 'intakeWizard');
      // Restore setting
      if (window.HEALTHPLEX_CONFIG?.settings) {
        window.HEALTHPLEX_CONFIG.settings.showProgressIndicator = originalSetting;
      }
    }

    console.log('Intake Wizard initialized');
  },

  /**
   * Setup navigation button handlers
   */
  setupNavigation() {
    // Bind nav buttons
    document.querySelectorAll('.wizard-nav-next').forEach(btn => {
      btn.addEventListener('click', () => this.nextStep());
    });

    document.querySelectorAll('.wizard-nav-prev').forEach(btn => {
      btn.addEventListener('click', () => this.prevStep());
    });

    // Submit handler on final step
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
  },

  /**
   * Setup clickable progress indicators
   */
  setupProgressIndicator() {
    document.querySelectorAll('.wizard-step-indicator').forEach(indicator => {
      indicator.addEventListener('click', () => {
        const stepNum = parseInt(indicator.dataset.step);
        this.goToStep(stepNum);
      });
    });
  },

  /**
   * Show a specific step
   */
  showStep(stepNum) {
    // Validate step number
    if (stepNum < 1 || stepNum > this.totalSteps) return;

    // Hide all steps
    document.querySelectorAll('.wizard-step').forEach(step => {
      step.classList.remove('active');
    });

    // Show target step (use specific class selector to avoid matching progress indicators)
    const targetStep = document.querySelector(`.wizard-step[data-step="${stepNum}"]`);
    if (targetStep) {
      targetStep.classList.add('active');
    }

    this.currentStep = stepNum;
    this.updateProgressIndicator();
    this.updateNavButtons();
    this.scrollToTop();

    // Trigger any step-specific initialization
    this.onStepShow(stepNum);
  },

  /**
   * Handle step-specific initialization when shown
   */
  onStepShow(stepNum) {
    // Step 5-7: Initialize metabolic scoring if needed
    if (stepNum >= 5 && stepNum <= 7) {
      if (window.FormUtils && typeof FormUtils.setupAutoCalculation === 'function') {
        FormUtils.setupAutoCalculation();
      }
    }

    // Step 8: Generate review summary
    if (stepNum === 8) {
      this.generateReviewSummary();
    }
  },

  /**
   * Navigate to next step
   */
  nextStep() {
    if (this.validateCurrentStep()) {
      this.stepValidation[this.currentStep] = true;
      this.saveProgress();

      if (this.currentStep < this.totalSteps) {
        this.showStep(this.currentStep + 1);
      }
    }
  },

  /**
   * Navigate to previous step
   */
  prevStep() {
    if (this.currentStep > 1) {
      this.showStep(this.currentStep - 1);
    }
  },

  /**
   * Jump to a specific step (only if allowed)
   */
  goToStep(stepNum) {
    // Can only go to completed steps or one step ahead
    if (stepNum <= this.currentStep || this.stepValidation[stepNum - 1]) {
      this.showStep(stepNum);
    }
  },

  /**
   * Validate current step fields
   */
  validateCurrentStep() {
    const stepEl = document.querySelector(`.wizard-step[data-step="${this.currentStep}"]`);
    if (!stepEl) return true;

    const requiredFields = stepEl.querySelectorAll('[required]');
    let valid = true;
    let firstInvalid = null;

    requiredFields.forEach(field => {
      // Clear previous error
      field.classList.remove('error');
      const errorMsg = field.parentElement.querySelector('.field-error');
      if (errorMsg) errorMsg.remove();

      // Check validity
      if (!field.value || (field.type === 'checkbox' && !field.checked)) {
        valid = false;
        field.classList.add('error');

        // Add error message
        const error = document.createElement('span');
        error.className = 'field-error';
        error.textContent = 'This field is required';
        field.parentElement.appendChild(error);

        if (!firstInvalid) firstInvalid = field;
      }

      // Email validation
      if (field.type === 'email' && field.value && !this.isValidEmail(field.value)) {
        valid = false;
        field.classList.add('error');
        if (!firstInvalid) firstInvalid = field;
      }

      // Phone validation
      if (field.type === 'tel' && field.value && !this.isValidPhone(field.value)) {
        valid = false;
        field.classList.add('error');
        if (!firstInvalid) firstInvalid = field;
      }
    });

    if (!valid && firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstInvalid.focus();
    }

    return valid;
  },

  /**
   * Email validation helper
   */
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  /**
   * Phone validation helper
   */
  isValidPhone(phone) {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10;
  },

  /**
   * Update progress indicator UI
   */
  updateProgressIndicator() {
    // Update step indicators
    document.querySelectorAll('.wizard-step-indicator').forEach(indicator => {
      const stepNum = parseInt(indicator.dataset.step);
      indicator.classList.remove('active', 'completed', 'disabled');

      if (stepNum === this.currentStep) {
        indicator.classList.add('active');
      } else if (stepNum < this.currentStep || this.stepValidation[stepNum]) {
        indicator.classList.add('completed');
      } else {
        indicator.classList.add('disabled');
      }
    });

    // Update connector lines
    document.querySelectorAll('.wizard-step-connector').forEach((connector, idx) => {
      if (idx + 1 < this.currentStep || this.stepValidation[idx + 1]) {
        connector.classList.add('completed');
      } else {
        connector.classList.remove('completed');
      }
    });

    // Update mobile progress
    const mobileProgress = document.querySelector('.wizard-mobile-progress');
    if (mobileProgress) {
      const stepText = mobileProgress.querySelector('.step-text');
      const stepTitle = mobileProgress.querySelector('.step-title');
      const progressFill = mobileProgress.querySelector('.progress-bar-fill');

      if (stepText) stepText.textContent = `Step ${this.currentStep} of ${this.totalSteps}`;
      if (stepTitle) stepTitle.textContent = this.stepNames[this.currentStep];
      if (progressFill) {
        const percent = ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
        progressFill.style.width = `${percent}%`;
      }
    }
  },

  /**
   * Update navigation buttons
   */
  updateNavButtons() {
    // Show/hide prev button based on step
    document.querySelectorAll('.wizard-nav-prev').forEach(btn => {
      btn.style.display = this.currentStep === 1 ? 'none' : 'inline-flex';
    });

    // Toggle between next and submit button
    document.querySelectorAll('.wizard-nav-next').forEach(btn => {
      btn.style.display = this.currentStep === this.totalSteps ? 'none' : 'inline-flex';
    });

    document.querySelectorAll('.wizard-nav-submit').forEach(btn => {
      btn.style.display = this.currentStep === this.totalSteps ? 'inline-flex' : 'none';
    });
  },

  /**
   * Scroll to top of page
   */
  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /**
   * Save progress to localStorage
   */
  saveProgress() {
    const progress = {
      currentStep: this.currentStep,
      stepValidation: this.stepValidation,
      startTime: this.startTime
    };
    localStorage.setItem('healthplex_wizard_progress', JSON.stringify(progress));

    // Also save form data via FormUtils
    if (window.FormUtils && typeof FormUtils.saveDraft === 'function') {
      FormUtils.saveDraft();
    }
  },

  /**
   * Load progress from localStorage
   */
  loadProgress() {
    try {
      const saved = localStorage.getItem('healthplex_wizard_progress');
      if (saved) {
        const progress = JSON.parse(saved);
        this.stepValidation = progress.stepValidation || {};
        this.startTime = progress.startTime || Date.now();
        this.currentStep = progress.currentStep || 1;

        // Show notification that draft was restored
        this.showDraftNotification();
      }
    } catch (e) {
      console.warn('Could not load wizard progress:', e);
    }
  },

  /**
   * Show draft restored notification
   */
  showDraftNotification() {
    const notification = document.createElement('div');
    notification.className = 'draft-notification';
    notification.innerHTML = `
      <span>Draft restored. You can continue where you left off.</span>
      <button onclick="IntakeWizard.clearProgress()" class="clear-draft-btn">Start Over</button>
    `;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--primary);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 15px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      z-index: 1000;
      animation: slideUp 0.3s ease-out;
    `;
    document.body.appendChild(notification);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(-50%) translateY(20px)';
      notification.style.transition = 'all 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  },

  /**
   * Clear all progress
   */
  clearProgress() {
    localStorage.removeItem('healthplex_wizard_progress');
    localStorage.removeItem('healthplex_draft_intakeWizard');
    this.stepValidation = {};
    this.currentStep = 1;
    this.startTime = Date.now();

    // Clear form fields
    if (this.form) {
      this.form.reset();
    }

    this.showStep(1);

    // Remove notification if present
    const notification = document.querySelector('.draft-notification');
    if (notification) notification.remove();
  },

  /**
   * Get form completion duration in minutes
   */
  getFormDuration() {
    return Math.round((Date.now() - this.startTime) / 60000);
  },

  /**
   * Generate review summary for step 8
   */
  generateReviewSummary() {
    const reviewContainer = document.getElementById('review-summary');
    if (!reviewContainer) return;

    // Get key form values
    const formData = new FormData(this.form);
    const data = {};
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }

    // Build summary HTML
    let html = `
      <div class="review-section">
        <h4>Patient Information</h4>
        <div class="review-item">
          <span class="review-label">Name</span>
          <span class="review-value">${data.firstName || ''} ${data.lastName || ''}</span>
        </div>
        <div class="review-item">
          <span class="review-label">Email</span>
          <span class="review-value">${data.email || ''}</span>
        </div>
        <div class="review-item">
          <span class="review-label">Phone</span>
          <span class="review-value">${data.phone || ''}</span>
        </div>
        <button type="button" class="review-edit-btn" onclick="IntakeWizard.goToStep(1)">Edit</button>
      </div>

      <div class="review-section">
        <h4>Primary Health Concerns</h4>
        <div class="review-item">
          <span class="review-label">Main Complaint</span>
          <span class="review-value">${data.complaint1 || 'Not specified'}</span>
        </div>
        <button type="button" class="review-edit-btn" onclick="IntakeWizard.goToStep(2)">Edit</button>
      </div>
    `;

    html += `
      <div class="wizard-intro-box" style="margin-top: var(--spacing-xl);">
        <p><strong>Ready to submit?</strong> Please review your information above. By clicking Submit, your intake forms will be securely sent to The Healthplex team for review before your appointment.</p>
      </div>
    `;

    reviewContainer.innerHTML = html;
  },

  /**
   * Get interpretation text for metabolic score
   */
  getScoreInterpretation(score) {
    if (score <= 20) return 'Low - Minimal metabolic concerns';
    if (score <= 50) return 'Moderate - Some areas may need attention';
    if (score <= 100) return 'Elevated - Multiple areas of concern';
    return 'High - Significant metabolic support recommended';
  },

  /**
   * Generate PDF of the complete form
   * Returns base64 encoded PDF string
   */
  async generateFormPDF() {
    // IMPORTANT: Loading overlay should already be visible (called from handleSubmit)
    // This hides any visual changes from the user

    const formCard = document.querySelector('.form-card');
    const allSteps = document.querySelectorAll('.wizard-step');

    // Save original states
    const originalStates = [];
    allSteps.forEach((step, idx) => {
      originalStates[idx] = {
        classList: [...step.classList],
        display: step.style.display
      };
    });

    // Save original visibility of UI elements
    const elementsToHide = document.querySelectorAll('.wizard-nav, .wizard-progress, .wizard-mobile-progress, .wizard-intro-box, .review-edit-btn, .total-score-card, #review-summary, .review-section');
    const hiddenOriginalDisplay = [];
    elementsToHide.forEach((el, idx) => {
      hiddenOriginalDisplay[idx] = el.style.display;
      el.style.display = 'none';
    });

    // Show all steps except step 8 (review)
    allSteps.forEach((step, idx) => {
      if (idx < allSteps.length - 1) {
        step.classList.add('active');
        step.style.display = 'block';
      } else {
        step.style.display = 'none';
      }
    });

    // Add PDF-specific styles to fix tables and page breaks
    const pdfStyles = document.createElement('style');
    pdfStyles.id = 'pdf-temp-styles';
    pdfStyles.textContent = `
      /* Make form narrower for PDF */
      .form-card {
        max-width: 700px !important;
      }

      /* Family history tables - make columns narrower */
      .matrix-table {
        font-size: 8px !important;
        table-layout: fixed !important;
        width: 100% !important;
      }
      .matrix-table th {
        padding: 4px 2px !important;
        font-size: 7px !important;
        word-wrap: break-word !important;
      }
      .matrix-table td {
        padding: 3px 2px !important;
      }
      .matrix-table td:first-child {
        width: 90px !important;
        font-size: 8px !important;
      }
      .matrix-table input[type="checkbox"] {
        width: 12px !important;
        height: 12px !important;
      }
      .matrix-table input[type="text"] {
        font-size: 7px !important;
        width: 100% !important;
        padding: 1px !important;
      }

      /* PDF page break handling */

      /* Keep all headers with their following content */
      h2, h3, h4,
      .wizard-step-header,
      .form-section h3,
      .symptom-card h3 {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }

      /* Keep form sections and symptom cards together */
      .form-section,
      .symptom-card {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    `;
    document.head.appendChild(pdfStyles);

    // Scroll to top
    window.scrollTo(0, 0);

    // Wait for DOM to update
    await new Promise(resolve => setTimeout(resolve, 200));

    // Configure PDF options - simple and reliable
    const opt = {
      margin: [10, 8, 10, 8],
      filename: `intake-form-${Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollY: -window.scrollY
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      },
      pagebreak: {
        mode: ['avoid-all', 'css', 'legacy'],
        avoid: ['.form-section', '.symptom-card', '.matrix-table', 'h2', 'h3', 'h4', '.wizard-step-header', '.symptom-card h3']
      }
    };

    try {
      // Generate PDF directly from the actual form card
      const pdfBlob = await html2pdf().set(opt).from(formCard).outputPdf('blob');

      // Convert blob to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });

      return base64;
    } finally {
      // Remove PDF styles
      const tempStyles = document.getElementById('pdf-temp-styles');
      if (tempStyles) tempStyles.remove();

      // Restore original step states
      allSteps.forEach((step, idx) => {
        step.className = originalStates[idx].classList.join(' ');
        step.style.display = originalStates[idx].display;
      });

      // Restore hidden elements
      elementsToHide.forEach((el, idx) => {
        el.style.display = hiddenOriginalDisplay[idx];
      });
    }
  },

  /**
   * Show full-screen loading overlay
   */
  showLoadingOverlay(message = 'Processing...') {
    // Remove existing overlay if any
    this.hideLoadingOverlay();

    const overlay = document.createElement('div');
    overlay.id = 'wizard-loading-overlay';
    overlay.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p class="loading-message">${message}</p>
      </div>
    `;
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.95);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    // Add spinner styles
    const style = document.createElement('style');
    style.id = 'wizard-loading-styles';
    style.textContent = `
      #wizard-loading-overlay .loading-content {
        text-align: center;
      }
      #wizard-loading-overlay .loading-spinner {
        width: 50px;
        height: 50px;
        border: 4px solid #e0e0e0;
        border-top-color: #1a9ba0;
        border-radius: 50%;
        animation: wizard-spin 1s linear infinite;
        margin: 0 auto 20px;
      }
      #wizard-loading-overlay .loading-message {
        font-size: 18px;
        color: #333;
        font-family: 'Montserrat', sans-serif;
      }
      @keyframes wizard-spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(overlay);
  },

  /**
   * Hide loading overlay
   */
  hideLoadingOverlay() {
    const overlay = document.getElementById('wizard-loading-overlay');
    if (overlay) overlay.remove();
    const styles = document.getElementById('wizard-loading-styles');
    if (styles) styles.remove();
  },

  /**
   * Update loading overlay message
   */
  updateLoadingMessage(message) {
    const messageEl = document.querySelector('#wizard-loading-overlay .loading-message');
    if (messageEl) messageEl.textContent = message;
  },

  /**
   * Handle form submission
   */
  async handleSubmit(e) {
    e.preventDefault();

    // Validate final step
    if (!this.validateCurrentStep()) return;

    // Mark all steps as validated
    for (let i = 1; i <= this.totalSteps; i++) {
      this.stepValidation[i] = true;
    }

    // Show full-screen loading overlay
    this.showLoadingOverlay('Generating your intake form PDF...');

    // Disable submit button
    const submitBtn = this.form.querySelector('.wizard-nav-submit');
    if (submitBtn) submitBtn.disabled = true;

    // Timeout protection - 30 seconds max wait
    const TIMEOUT_MS = 30000;
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      this.handleSubmissionFailure('Submission timed out. Please check your internet connection and try again.', submitBtn);
    }, TIMEOUT_MS);

    try {
      // Generate PDF before submission (optional - don't block if fails)
      try {
        console.log('Generating PDF of intake form...');
        const pdfBase64 = await this.generateFormPDF();
        console.log('PDF generated, size:', Math.round(pdfBase64.length / 1024), 'KB');
        window._intakeWizardPDF = pdfBase64;
      } catch (pdfError) {
        console.warn('PDF generation failed, continuing without PDF:', pdfError);
        window._intakeWizardPDF = null;
      }

      // Check if already timed out
      if (timedOut) return;

      // Update loading message
      this.updateLoadingMessage('Submitting your information...');

      // Add completion metadata
      this.addDurationMetadata();

      // Check FormUtils exists
      if (!window.FormUtils || typeof FormUtils.handleSubmit !== 'function') {
        throw new Error('Form system not loaded. Please refresh the page and try again.');
      }

      // AWAIT the submission - this was the critical missing piece!
      const result = await FormUtils.handleSubmit(e);

      clearTimeout(timeoutId);

      // Check if submission failed
      if (result && !result.success && !timedOut) {
        this.handleSubmissionFailure(result.message || 'Submission failed. Please try again.', submitBtn);
      }

    } catch (error) {
      clearTimeout(timeoutId);
      if (!timedOut) {
        console.error('Submission error:', error);
        this.handleSubmissionFailure(error.message || 'An unexpected error occurred. Please try again.', submitBtn);
      }
    }
  },

  /**
   * Add duration metadata to form
   */
  addDurationMetadata() {
    // Remove existing duration input if any
    const existingInput = this.form.querySelector('input[name="_wizardDuration"]');
    if (existingInput) existingInput.remove();

    const durationInput = document.createElement('input');
    durationInput.type = 'hidden';
    durationInput.name = '_wizardDuration';
    durationInput.value = this.getFormDuration();
    this.form.appendChild(durationInput);
  },

  /**
   * Handle submission failure - cleanup and show error
   */
  handleSubmissionFailure(message, submitBtn) {
    this.hideLoadingOverlay();
    if (submitBtn) submitBtn.disabled = false;
    this.showSubmissionError(message);
  },

  /**
   * Show submission error modal with user-friendly message
   */
  showSubmissionError(message) {
    // Remove existing error modal if any
    const existingModal = document.querySelector('.submission-error-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.className = 'submission-error-modal';
    modal.innerHTML = `
      <div class="submission-error-content">
        <div class="submission-error-icon">⚠️</div>
        <h3>Submission Error</h3>
        <p class="error-message">${this.escapeHtml(message)}</p>
        <p class="error-reassurance">Your information has been saved locally. Please try submitting again.</p>
        <button class="btn btn-primary error-dismiss-btn">OK, I'll Try Again</button>
      </div>
    `;

    // Style the modal
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const content = modal.querySelector('.submission-error-content');
    content.style.cssText = `
      background: white;
      padding: 2rem;
      border-radius: 12px;
      max-width: 420px;
      width: 90%;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    `;

    const icon = modal.querySelector('.submission-error-icon');
    icon.style.cssText = `font-size: 3rem; margin-bottom: 1rem;`;

    const h3 = modal.querySelector('h3');
    h3.style.cssText = `margin: 0 0 1rem; color: #c53030; font-size: 1.25rem;`;

    const errorMsg = modal.querySelector('.error-message');
    errorMsg.style.cssText = `color: #444; margin-bottom: 0.75rem; font-size: 0.95rem;`;

    const reassurance = modal.querySelector('.error-reassurance');
    reassurance.style.cssText = `color: #666; font-size: 0.85rem; margin-bottom: 1.5rem;`;

    const btn = modal.querySelector('.error-dismiss-btn');
    btn.style.cssText = `
      background: #1a7f7f;
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 500;
    `;

    btn.addEventListener('click', () => {
      modal.remove();
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  IntakeWizard.init();
});

// Make globally accessible
window.IntakeWizard = IntakeWizard;
