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
    // Create container positioned behind loading overlay (visible but covered)
    const pdfContainer = document.createElement('div');
    pdfContainer.id = 'pdf-render-container';
    pdfContainer.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: 800px;
      height: 100vh;
      overflow: auto;
      background: white;
      z-index: 9999;
      padding: 0;
      margin: 0;
    `;
    document.body.appendChild(pdfContainer);

    // Clone the form card for PDF rendering
    const formCard = document.querySelector('.form-card');
    const clonedCard = formCard.cloneNode(true);

    // Reset positioning on cloned card
    clonedCard.style.cssText = `
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 20px !important;
      box-shadow: none !important;
      position: relative !important;
      left: 0 !important;
      top: 0 !important;
    `;

    // Show all wizard steps in the clone (except step 8)
    const allSteps = clonedCard.querySelectorAll('.wizard-step');
    allSteps.forEach((step, idx) => {
      if (idx < allSteps.length - 1) {
        step.classList.add('active');
        step.style.display = 'block';
        step.style.position = 'relative';
        step.style.left = '0';
      } else {
        step.style.display = 'none';
      }
    });

    // Remove navigation, progress indicators, and review elements from clone
    const elementsToRemove = clonedCard.querySelectorAll('.wizard-nav, .wizard-progress, .wizard-mobile-progress, .wizard-intro-box, .review-edit-btn, .total-score-card, #review-summary, .review-section, [data-step="8"]');
    elementsToRemove.forEach(el => el.remove());

    pdfContainer.appendChild(clonedCard);

    // Add PDF-specific styles
    const pdfStyles = document.createElement('style');
    pdfStyles.id = 'pdf-temp-styles';
    pdfStyles.textContent = `
      #pdf-render-container .form-card {
        max-width: 100% !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 15px !important;
        box-shadow: none !important;
      }
      #pdf-render-container .wizard-step {
        display: block !important;
        margin-bottom: 20px !important;
        padding-bottom: 15px !important;
        border-bottom: 1px solid #ddd;
      }
      #pdf-render-container .wizard-step[data-step="8"] { display: none !important; }
      #pdf-render-container .wizard-step-header { margin-bottom: 15px !important; }
      #pdf-render-container .wizard-step-header h2 { font-size: 18px !important; margin-bottom: 5px !important; color: #1a9ba0 !important; }
      #pdf-render-container .wizard-step-header p { font-size: 12px !important; color: #666 !important; }

      /* Form sections */
      #pdf-render-container .form-section { margin-bottom: 15px !important; }
      #pdf-render-container .form-section h3 { font-size: 14px !important; margin-bottom: 10px !important; color: #333 !important; }
      #pdf-render-container .form-group { margin-bottom: 8px !important; }
      #pdf-render-container .form-group label { font-size: 11px !important; font-weight: 600 !important; color: #444 !important; display: block !important; margin-bottom: 3px !important; }
      #pdf-render-container .form-group input,
      #pdf-render-container .form-group select { font-size: 11px !important; padding: 6px !important; border: 1px solid #ccc !important; background: #fff !important; }
      #pdf-render-container .form-group textarea { font-size: 11px !important; padding: 6px !important; border: 1px solid #ccc !important; min-height: 40px !important; }
      #pdf-render-container .form-row { display: flex !important; gap: 10px !important; flex-wrap: wrap !important; }

      /* Family history tables */
      #pdf-render-container .matrix-table { font-size: 9px !important; width: 100% !important; border-collapse: collapse !important; }
      #pdf-render-container .matrix-table th { padding: 5px 3px !important; font-size: 8px !important; background: #f5f5f5 !important; border: 1px solid #ddd !important; }
      #pdf-render-container .matrix-table td { padding: 4px 3px !important; border: 1px solid #ddd !important; }
      #pdf-render-container .matrix-table td:first-child { font-size: 9px !important; font-weight: 500 !important; min-width: 80px !important; }
      #pdf-render-container .matrix-table input[type="checkbox"] { width: 12px !important; height: 12px !important; }
      #pdf-render-container .matrix-table input[type="text"] { font-size: 8px !important; padding: 2px !important; width: 100% !important; border: 1px solid #ccc !important; }

      /* Symptom cards */
      #pdf-render-container .symptom-card { padding: 10px !important; margin-bottom: 10px !important; background: #fafafa !important; border: 1px solid #eee !important; border-radius: 4px !important; }
      #pdf-render-container .symptom-card h4 { font-size: 12px !important; margin-bottom: 8px !important; color: #1a9ba0 !important; }
      #pdf-render-container .symptom-item { padding: 4px 0 !important; font-size: 10px !important; display: flex !important; align-items: center !important; gap: 10px !important; border-bottom: 1px solid #eee !important; }
      #pdf-render-container .symptom-item:last-child { border-bottom: none !important; }
      #pdf-render-container .symptom-item > span:first-child { flex: 1 !important; }

      /* Rating buttons - show selected value */
      #pdf-render-container .rating-group { display: flex !important; gap: 3px !important; }
      #pdf-render-container .rating-group label { width: 22px !important; height: 22px !important; font-size: 10px !important; line-height: 22px !important; text-align: center !important; border: 1px solid #ccc !important; border-radius: 3px !important; }
      #pdf-render-container .rating-group input:checked + label { background: #1a9ba0 !important; color: white !important; border-color: #1a9ba0 !important; }

      /* Checkboxes */
      #pdf-render-container .checkbox-group { display: flex !important; flex-wrap: wrap !important; gap: 5px !important; }
      #pdf-render-container .checkbox-group label { font-size: 10px !important; padding: 4px 8px !important; border: 1px solid #ccc !important; border-radius: 3px !important; }
      #pdf-render-container .checkbox-group input:checked + label { background: #1a9ba0 !important; color: white !important; }

      /* Commitment scales */
      #pdf-render-container .scale-group { display: flex !important; gap: 3px !important; }
      #pdf-render-container .scale-group label { width: 24px !important; height: 24px !important; font-size: 10px !important; line-height: 24px !important; text-align: center !important; border: 1px solid #ccc !important; border-radius: 3px !important; }
      #pdf-render-container .scale-group input:checked + label { background: #1a9ba0 !important; color: white !important; }

      /* Hide elements */
      #pdf-render-container .wizard-nav,
      #pdf-render-container .wizard-progress,
      #pdf-render-container .wizard-mobile-progress,
      #pdf-render-container .wizard-intro-box,
      #pdf-render-container .review-edit-btn,
      #pdf-render-container .total-score-card,
      #pdf-render-container #review-summary,
      #pdf-render-container .review-section { display: none !important; }
    `;
    document.head.appendChild(pdfStyles);

    // Scroll the container to top to ensure proper capture
    pdfContainer.scrollTop = 0;

    // Wait for rendering to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Configure PDF options
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `intake-form-${Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 0.92 },
      html2canvas: {
        scale: 1.5,
        useCORS: true,
        letterRendering: true,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        windowWidth: 800,
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: false
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      },
      pagebreak: {
        mode: ['css', 'legacy'],
        avoid: ['.form-section', '.symptom-card', '.form-group']
      }
    };

    try {
      // Generate PDF from the container (not the card, to ensure proper positioning)
      const pdfBlob = await html2pdf().set(opt).from(pdfContainer).outputPdf('blob');

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
      // Clean up
      const tempStyles = document.getElementById('pdf-temp-styles');
      if (tempStyles) tempStyles.remove();

      const container = document.getElementById('pdf-render-container');
      if (container) container.remove();
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
    submitBtn.disabled = true;

    try {
      // Generate PDF before submission
      console.log('Generating PDF of intake form...');
      const pdfBase64 = await this.generateFormPDF();
      console.log('PDF generated, size:', Math.round(pdfBase64.length / 1024), 'KB');

      // Store PDF data for FormUtils to pick up
      window._intakeWizardPDF = pdfBase64;

      // Update loading message
      this.updateLoadingMessage('Submitting your information...');

      // Add completion metadata
      const durationInput = document.createElement('input');
      durationInput.type = 'hidden';
      durationInput.name = '_wizardDuration';
      durationInput.value = this.getFormDuration();
      this.form.appendChild(durationInput);

      // Let FormUtils handle the actual submission
      if (window.FormUtils && typeof FormUtils.handleSubmit === 'function') {
        FormUtils.handleSubmit(e);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Still submit even if PDF fails
      this.updateLoadingMessage('Submitting your information...');

      // Add completion metadata
      const durationInput = document.createElement('input');
      durationInput.type = 'hidden';
      durationInput.name = '_wizardDuration';
      durationInput.value = this.getFormDuration();
      this.form.appendChild(durationInput);

      if (window.FormUtils && typeof FormUtils.handleSubmit === 'function') {
        FormUtils.handleSubmit(e);
      }
    }
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  IntakeWizard.init();
});

// Make globally accessible
window.IntakeWizard = IntakeWizard;
