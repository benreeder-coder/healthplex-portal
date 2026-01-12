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
    // Show all wizard steps temporarily for PDF capture (except the last review step)
    const allSteps = document.querySelectorAll('.wizard-step');
    const originalStates = [];

    allSteps.forEach((step, idx) => {
      originalStates[idx] = {
        active: step.classList.contains('active'),
        display: step.style.display
      };
      // Skip the last step (Review & Submit) - it just duplicates info
      if (idx < allSteps.length - 1) {
        step.classList.add('active');
        step.style.display = 'block';
      } else {
        step.style.display = 'none';
      }
    });

    // Hide navigation buttons, progress indicators, and other UI elements for PDF
    const elementsToHide = document.querySelectorAll('.wizard-nav, .wizard-progress, .wizard-mobile-progress, .wizard-intro-box, .review-edit-btn, .total-score-card, #review-summary, .review-section, [data-step="8"]');
    elementsToHide.forEach(el => el.style.display = 'none');

    // Add PDF-specific styles temporarily
    const pdfStyles = document.createElement('style');
    pdfStyles.id = 'pdf-temp-styles';
    pdfStyles.textContent = `
      /* General layout */
      .form-card { max-width: 100% !important; padding: 10px !important; }
      .wizard-step { margin-bottom: 15px !important; padding-bottom: 8px !important; border-bottom: 1px solid #ddd; page-break-inside: avoid; }
      .wizard-step:last-child { display: none !important; }
      .wizard-step-header { margin-bottom: 10px !important; page-break-after: avoid; }
      .wizard-step-header h2 { font-size: 16px !important; margin-bottom: 3px !important; }
      .wizard-step-header p { font-size: 10px !important; margin-bottom: 5px !important; }

      /* Form sections */
      .form-section { margin-bottom: 12px !important; page-break-inside: avoid; }
      .form-section h3 { font-size: 13px !important; margin-bottom: 8px !important; page-break-after: avoid; }
      .form-group { margin-bottom: 6px !important; }
      .form-group label { font-size: 10px !important; margin-bottom: 2px !important; }
      .form-group input, .form-group select { font-size: 10px !important; padding: 4px !important; height: auto !important; min-height: 24px !important; }
      .form-group textarea { font-size: 10px !important; padding: 4px !important; min-height: 30px !important; max-height: 50px !important; resize: none !important; }
      .form-row { gap: 8px !important; }

      /* Family history tables - make them fit */
      .matrix-table { font-size: 7px !important; width: 100% !important; table-layout: fixed !important; }
      .matrix-table th { padding: 3px 1px !important; font-size: 6px !important; white-space: nowrap !important; }
      .matrix-table td { padding: 2px 1px !important; }
      .matrix-table td:first-child { font-size: 7px !important; width: 70px !important; min-width: 70px !important; max-width: 70px !important; }
      .matrix-table input[type="checkbox"] { width: 10px !important; height: 10px !important; }
      .matrix-table input[type="text"] { font-size: 6px !important; padding: 1px !important; width: 100% !important; }

      /* Symptom cards - compact */
      .symptom-card { padding: 6px !important; margin-bottom: 6px !important; page-break-inside: avoid; }
      .symptom-card h4 { font-size: 11px !important; margin-bottom: 4px !important; }
      .symptom-item { padding: 2px 0 !important; font-size: 9px !important; }
      .symptom-item label { font-size: 9px !important; }
      .symptom-item > span:first-child { flex: 1 !important; }

      /* Rating buttons */
      .rating-group { gap: 2px !important; }
      .rating-group label { width: 18px !important; height: 18px !important; font-size: 8px !important; line-height: 18px !important; }

      /* Checkboxes */
      .checkbox-group { gap: 4px !important; }
      .checkbox-group label { font-size: 9px !important; padding: 3px 6px !important; }

      /* Hide empty textareas placeholder text */
      textarea:placeholder-shown { min-height: 25px !important; }
      input:placeholder-shown { background: #f9f9f9 !important; }

      /* Commitment scales */
      .scale-group { gap: 2px !important; }
      .scale-group label { width: 20px !important; height: 20px !important; font-size: 8px !important; }

      /* Hide review step completely */
      .wizard-step[data-step="8"] { display: none !important; }
      #review-summary { display: none !important; }
      .review-section { display: none !important; }
      .total-score-card { display: none !important; }
    `;
    document.head.appendChild(pdfStyles);

    // Configure PDF options - optimized for cleaner output
    const opt = {
      margin: [5, 5, 5, 5],
      filename: `intake-form-${Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 0.85 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        scrollY: 0,
        windowWidth: 800
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      },
      pagebreak: {
        mode: ['css', 'legacy'],
        before: '.wizard-step-header',
        avoid: ['.form-section', '.symptom-card', '.form-group', '.matrix-table']
      }
    };

    try {
      // Generate PDF as base64
      const formCard = document.querySelector('.form-card');
      const pdfBlob = await html2pdf().set(opt).from(formCard).outputPdf('blob');

      // Convert blob to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          // Remove the data:application/pdf;base64, prefix
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });

      return base64;
    } finally {
      // Remove temporary PDF styles
      const tempStyles = document.getElementById('pdf-temp-styles');
      if (tempStyles) tempStyles.remove();

      // Restore original step visibility
      allSteps.forEach((step, idx) => {
        if (!originalStates[idx].active) {
          step.classList.remove('active');
        }
        step.style.display = originalStates[idx].display || '';
      });

      // Restore hidden elements
      elementsToHide.forEach(el => el.style.display = '');
    }
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

    // Show loading state
    const submitBtn = this.form.querySelector('.wizard-nav-submit');
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = 'Generating PDF...';
    submitBtn.disabled = true;

    try {
      // Generate PDF before submission
      console.log('Generating PDF of intake form...');
      const pdfBase64 = await this.generateFormPDF();
      console.log('PDF generated, size:', Math.round(pdfBase64.length / 1024), 'KB');

      // Store PDF data for FormUtils to pick up
      window._intakeWizardPDF = pdfBase64;

      // Update button text
      submitBtn.textContent = 'Submitting...';

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
      submitBtn.textContent = 'Submitting...';

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
