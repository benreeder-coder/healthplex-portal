/**
 * Intake Wizard - Step Navigation and State Management
 * Handles multi-step form navigation, validation, and progress tracking
 */

const IntakeWizard = {
  currentStep: 1,
  totalSteps: 8,
  stepValidation: {},
  blankStepDismissed: {},
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
    try {
      localStorage.removeItem('healthplex_wizard_progress');
      localStorage.removeItem('healthplex_draft_intakeWizard');
    } catch (error) {
      console.warn('Could not access localStorage for reset:', error);
    }

    this.showStep(this.currentStep);
    this.form.classList.add('wizard-ready');
    this.ensureVisibleStep();
    setTimeout(() => this.ensureVisibleStep(), 300);
    window.addEventListener('load', () => this.ensureVisibleStep());

    // Initialize FormUtils for the wizard (disable its progress indicator - we have our own)
    if (window.FormUtils) {
      // Temporarily disable progress indicator for the wizard
      const originalSetting = window.HEALTHPLEX_CONFIG?.settings?.showProgressIndicator;
      try {
        if (window.HEALTHPLEX_CONFIG?.settings) {
          window.HEALTHPLEX_CONFIG.settings.showProgressIndicator = false;
        }
        FormUtils.init('intake-wizard-form', 'intakeWizard');
      } catch (error) {
        console.error('Form utilities failed to initialize:', error);
        alert('Form failed to load properly. Please refresh the page.');
        return;
      } finally {
        // Restore setting
        if (window.HEALTHPLEX_CONFIG?.settings) {
          window.HEALTHPLEX_CONFIG.settings.showProgressIndicator = originalSetting;
        }
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
    this.form.querySelectorAll('.wizard-step').forEach(step => {
      step.classList.remove('active');
    });

    // Show target step (use specific class selector to avoid matching progress indicators)
    const targetStep = this.form.querySelector(`.wizard-step[data-step="${stepNum}"]`);
    if (!targetStep) {
      console.warn(`Wizard step ${stepNum} not found; restoring step 1.`);
      const fallbackStep = this.form.querySelector('.wizard-step[data-step="1"]');
      if (!fallbackStep) return;
      fallbackStep.classList.add('active');
      this.currentStep = 1;
      this.updateProgressIndicator();
      this.updateNavButtons();
      this.onStepShow(this.currentStep);
      this.ensureVisibleStep();
      return;
    }

    targetStep.classList.add('active');
    this.currentStep = stepNum;
    this.updateProgressIndicator();
    this.updateNavButtons();
    this.scrollToTop();

    // Trigger any step-specific initialization
    this.onStepShow(stepNum);
    this.ensureVisibleStep();
  },

  /**
   * Ensure at least one wizard step is visible.
   * Recovers from edge cases where CSS/JS state hides all steps.
   */
  ensureVisibleStep() {
    if (!this.form) return;

    const steps = this.form.querySelectorAll('.wizard-step');
    if (!steps.length) return;

    const hasVisibleStep = Array.from(steps).some(step => {
      const style = window.getComputedStyle(step);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });

    if (hasVisibleStep) return;

    const fallbackStep = this.form.querySelector('.wizard-step[data-step="1"]') || steps[0];
    if (!fallbackStep) return;

    steps.forEach(step => step.classList.remove('active'));
    fallbackStep.classList.add('active');
    this.currentStep = parseInt(fallbackStep.dataset.step, 10) || 1;
    this.updateProgressIndicator();
    this.updateNavButtons();
    console.warn('Wizard visibility fail-safe activated: restored visible step.');
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

    // Step 8: Review summary removed - keeping lifestyle/medications fields only
  },

  /**
   * Navigate to next step
   */
  nextStep() {
    if (this.validateCurrentStep()) {
      this.stepValidation[this.currentStep] = true;
      this.saveProgress();

      // Warn if step 3-7 is completely blank (and user hasn't already dismissed)
      if (this.currentStep >= 3 && this.currentStep <= 7
          && !this.blankStepDismissed[this.currentStep]
          && this.isStepBlank(this.currentStep)) {
        this.showBlankStepWarning(this.currentStep);
        return;
      }

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
   * Check if a step has no meaningful user input
   */
  isStepBlank(stepNum) {
    const stepEl = document.querySelector(`.wizard-step[data-step="${stepNum}"]`);
    if (!stepEl) return false;

    switch (stepNum) {
      case 3: {
        // Checkboxes (excluding the required spouse attendance one)
        const checkboxes = stepEl.querySelectorAll('input[type="checkbox"]:not(#spouseAttendanceConfirm)');
        const anyChecked = Array.from(checkboxes).some(cb => cb.checked);
        // Textareas
        const textareas = stepEl.querySelectorAll('textarea');
        const anyTextFilled = Array.from(textareas).some(ta => ta.value.trim() !== '');
        // Commitment rating scales (importance, coachable, prepared)
        const ratings = stepEl.querySelectorAll('.rating-scale input[type="radio"]:checked');
        const anyRatingSelected = ratings.length > 0;
        return !anyChecked && !anyTextFilled && !anyRatingSelected;
      }
      case 4: {
        // Family condition checkboxes
        const checkboxes = stepEl.querySelectorAll('input[type="checkbox"]');
        const anyChecked = Array.from(checkboxes).some(cb => cb.checked);
        // Age / death age numbers
        const numberInputs = stepEl.querySelectorAll('input[type="number"]');
        const anyNumberFilled = Array.from(numberInputs).some(inp => inp.value !== '');
        // Custom condition text inputs
        const textInputs = stepEl.querySelectorAll('input[type="text"]');
        const anyTextFilled = Array.from(textInputs).some(inp => inp.value.trim() !== '');
        return !anyChecked && !anyNumberFilled && !anyTextFilled;
      }
      case 5:
      case 6:
      case 7: {
        // All symptom radios default to 0 — check if every checked radio is still 0
        const checkedRadios = stepEl.querySelectorAll('.severity-scale input[type="radio"]:checked');
        if (checkedRadios.length === 0) return true;
        return Array.from(checkedRadios).every(r => r.value === '0');
      }
      default:
        return false;
    }
  },

  /**
   * Show a gentle warning when the user tries to skip a blank step
   */
  showBlankStepWarning(stepNum) {
    const existing = document.querySelector('.blank-step-modal');
    if (existing) existing.remove();

    const stepName = this.stepNames[stepNum];
    const isSymptomStep = stepNum >= 5 && stepNum <= 7;

    const message = isSymptomStep
      ? 'All symptoms on this page are currently rated as <strong>0 (Never)</strong>. If that\'s accurate you can continue — otherwise, please take a moment to review your responses.'
      : 'It looks like you haven\'t filled in any fields on this page. Would you like to take a moment to double-check before continuing?';

    const modal = document.createElement('div');
    modal.className = 'blank-step-modal';
    modal.innerHTML = `
      <div class="blank-step-content">
        <div class="blank-step-icon">📋</div>
        <h3>${stepName}</h3>
        <p class="blank-step-message">${message}</p>
        <div class="blank-step-actions">
          <button class="btn btn-primary blank-step-review">Go Back &amp; Review</button>
          <button class="btn blank-step-continue">Continue Anyway</button>
        </div>
      </div>
    `;

    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.6); display: flex; align-items: center;
      justify-content: center; z-index: 10000;
    `;

    const content = modal.querySelector('.blank-step-content');
    content.style.cssText = `
      background: white; padding: 2rem; border-radius: 12px;
      max-width: 440px; width: 90%; text-align: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    `;

    modal.querySelector('.blank-step-icon').style.cssText = 'font-size: 2.5rem; margin-bottom: 0.75rem;';
    modal.querySelector('h3').style.cssText = 'margin: 0 0 0.75rem; color: #1a9ba0; font-size: 1.25rem; font-family: "Marcellus", serif;';
    modal.querySelector('.blank-step-message').style.cssText = 'color: #444; margin-bottom: 1.5rem; font-size: 0.95rem; line-height: 1.5;';
    modal.querySelector('.blank-step-actions').style.cssText = 'display: flex; flex-direction: column; gap: 0.75rem;';

    const reviewBtn = modal.querySelector('.blank-step-review');
    reviewBtn.style.cssText = `
      background: #1a9ba0; color: white; border: none; padding: 0.75rem 2rem;
      border-radius: 6px; cursor: pointer; font-size: 1rem; font-weight: 500;
    `;

    const continueBtn = modal.querySelector('.blank-step-continue');
    continueBtn.style.cssText = `
      background: transparent; color: #666; border: 1px solid #ccc; padding: 0.6rem 2rem;
      border-radius: 6px; cursor: pointer; font-size: 0.9rem;
    `;

    // "Go Back & Review" — just close the modal
    reviewBtn.addEventListener('click', () => modal.remove());

    // "Continue Anyway" — dismiss warning for this step and proceed
    continueBtn.addEventListener('click', () => {
      this.blankStepDismissed[stepNum] = true;
      modal.remove();
      if (this.currentStep < this.totalSteps) {
        this.showStep(this.currentStep + 1);
      }
    });

    // Close on background click (same as "Go Back")
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
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
   * Generate a text-based PDF using jsPDF only (no html2canvas).
   * Uses structured form data to create a clean, guaranteed-to-work PDF.
   * Fallback when html2canvas rendering fails.
   */
  generateTextPDF() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const form = this.form;
    const PAGE_W = 210, PAGE_H = 297;
    const M = { top: 15, left: 15, right: 15, bottom: 15 };
    const CONTENT_W = PAGE_W - M.left - M.right;
    let y = M.top;

    const checkPage = (needed) => {
      if (y + needed > PAGE_H - M.bottom) {
        pdf.addPage();
        y = M.top;
      }
    };

    const addTitle = (text) => {
      checkPage(14);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(26, 155, 160); // teal
      pdf.text(text, PAGE_W / 2, y, { align: 'center' });
      y += 10;
    };

    const addSection = (text) => {
      checkPage(12);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(51, 51, 51);
      pdf.text(text, M.left, y);
      y += 2;
      pdf.setDrawColor(26, 155, 160);
      pdf.setLineWidth(0.5);
      pdf.line(M.left, y, M.left + CONTENT_W, y);
      y += 6;
    };

    const addField = (label, value) => {
      if (!value) return;
      checkPage(8);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(100, 100, 100);
      pdf.text(label + ':', M.left, y);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(33, 33, 33);
      const labelW = pdf.getTextWidth(label + ': ');
      const lines = pdf.splitTextToSize(String(value), CONTENT_W - labelW);
      if (lines.length === 1) {
        pdf.text(lines[0], M.left + labelW, y);
        y += 5;
      } else {
        y += 5;
        lines.forEach(line => {
          checkPage(5);
          pdf.text(line, M.left + 4, y);
          y += 4.5;
        });
        y += 1;
      }
    };

    const addTextBlock = (label, value) => {
      if (!value) return;
      checkPage(14);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(100, 100, 100);
      pdf.text(label + ':', M.left, y);
      y += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(33, 33, 33);
      const lines = pdf.splitTextToSize(String(value), CONTENT_W - 4);
      lines.forEach(line => {
        checkPage(5);
        pdf.text(line, M.left + 4, y);
        y += 4.5;
      });
      y += 2;
    };

    const getVal = (name) => {
      const el = form.querySelector(`[name="${name}"]`);
      return el ? el.value?.trim() : '';
    };

    const getChecked = (name) => {
      const el = form.querySelector(`[name="${name}"]`);
      return el ? el.checked : false;
    };

    // === HEADER ===
    addTitle('The Healthplex - Client Intake Form');
    y += 2;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(120, 120, 120);
    pdf.text('Submitted: ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), PAGE_W / 2, y, { align: 'center' });
    y += 8;

    // === STEP 1: Patient Info ===
    addSection('Patient Information');
    addField('Name', [getVal('firstName'), getVal('middleName'), getVal('lastName')].filter(Boolean).join(' '));
    addField('Address', [getVal('street'), getVal('city'), getVal('state'), getVal('zip')].filter(Boolean).join(', '));
    addField('Phone', getVal('phone'));
    addField('Email', getVal('email'));
    addField('Birth Date', getVal('birthDate'));
    addField('Age', getVal('age'));
    addField('Sex', getVal('sex'));
    addField('Marital Status', getVal('maritalStatus'));
    addField('Occupation', getVal('occupation'));
    addField('Employer', getVal('employer'));
    addField('Physician', getVal('currentPhysician'));
    addField('Physician City', getVal('physicianCity'));
    addField('Referred By', getVal('referredBy'));
    y += 4;

    // === STEP 2: Health Concerns ===
    addSection('Health Concerns');
    addField('Complaint 1', getVal('complaint1'));
    addField('Complaint 2', getVal('complaint2'));
    addField('Complaint 3', getVal('complaint3'));
    addField('Complaint 4', getVal('complaint4'));
    addField('Duration', getVal('problemDuration'));
    addField('Other Complaints', getVal('otherComplaints'));
    addField('Height', getVal('height'));
    addField('Weight', getVal('weight'));

    const improvements = [];
    ['digestion', 'sleep', 'wellbeing', 'energy'].forEach(imp => {
      if (getChecked('improvement_' + imp)) improvements.push(imp.charAt(0).toUpperCase() + imp.slice(1));
    });
    if (improvements.length) addField('Desired Improvements', improvements.join(', '));

    addTextBlock('What has not worked', getVal('triedNotWorked'));
    addTextBlock('Feeling discouraged about', getVal('discouraged'));
    addTextBlock('Worst feeling', getVal('worstFeeling'));
    addTextBlock('Body functions to improve', getVal('bodyFunctions'));
    y += 4;

    // === STEP 3: Commitment & Vision ===
    addSection('Commitment & Vision');
    addField('Impact on work', getVal('impact_work'));
    addField('Impact on family', getVal('impact_family'));
    addField('Impact on hobbies', getVal('impact_hobbies'));
    addField('Impact on life', getVal('impact_life'));
    addField('Feels older than age', getVal('feelsOlder'));
    addField('Visit purpose', getVal('visitPurpose'));

    const pastCare = [];
    ['medications', 'holistic', 'routine', 'vitamins', 'exercise', 'chiropractic', 'diet'].forEach(c => {
      if (getChecked('pastCare_' + c)) pastCare.push(c.charAt(0).toUpperCase() + c.slice(1));
    });
    if (pastCare.length) addField('Past care methods', pastCare.join(', '));
    addTextBlock('Results of previous methods', getVal('previousMethodsResults'));

    const fears = [];
    ['job', 'kids', 'marriage', 'sleep', 'freedom', 'abilities', 'finances', 'time'].forEach(f => {
      if (getChecked('fear_' + f)) fears.push(f.charAt(0).toUpperCase() + f.slice(1));
    });
    if (fears.length) addField('Fear areas', fears.join(', '));

    const fearConds = [];
    ['abilities', 'surgery', 'stress', 'arthritis', 'weight', 'cancer', 'heart', 'diabetes', 'depression'].forEach(f => {
      if (getChecked('fearCondition_' + f)) fearConds.push(f.charAt(0).toUpperCase() + f.slice(1));
    });
    if (fearConds.length) addField('Feared conditions', fearConds.join(', '));
    addTextBlock('Future without help', getVal('futureWithoutHelp'));

    const better = [];
    ['stress', 'sleep', 'energy', 'work', 'esteem', 'outlook', 'confidence', 'family'].forEach(b => {
      if (getChecked('better_' + b)) better.push(b.charAt(0).toUpperCase() + b.slice(1));
    });
    if (better.length) addField('Positive outcomes', better.join(', '));
    addTextBlock('Three-year vision', getVal('threeYearVision'));
    addTextBlock('Barriers', getVal('barriers'));
    addTextBlock('Overcoming barriers', getVal('overcomingBarriers'));
    addTextBlock('Strengths', getVal('strengths'));
    addField('Importance (1-10)', getVal('importance'));
    addField('Coachable (1-10)', getVal('coachable'));
    addField('Prepared (1-10)', getVal('prepared'));
    y += 4;

    // === STEP 4: Family History ===
    addSection('Family History');
    const familyMembers = ['mother', 'father', 'brother', 'sister', 'child1', 'child2', 'child3', 'child4', 'maGma', 'maGpa', 'paGma', 'paGpa', 'aunt', 'uncle'];
    const conditionNames = {
      cancer: 'Cancer', heartDisease: 'Heart Disease', hypertension: 'Hypertension',
      obesity: 'Obesity', diabetes: 'Diabetes', stroke: 'Stroke', autoimmune: 'Autoimmune',
      arthritis: 'Arthritis', kidneyDisease: 'Kidney Disease', thyroid: 'Thyroid',
      seizures: 'Seizures', psychiatric: 'Psychiatric', anxiety: 'Anxiety',
      depression: 'Depression', asthma: 'Asthma', allergies: 'Allergies', eczema: 'Eczema',
      adhd: 'ADHD', autism: 'Autism', ibs: 'IBS', dementia: 'Dementia',
      substanceAbuse: 'Substance Abuse', genetic: 'Genetic', celiac: 'Celiac'
    };
    const memberDisplayNames = {
      mother: 'Mother', father: 'Father', brother: 'Brother', sister: 'Sister',
      child1: 'Child 1', child2: 'Child 2', child3: 'Child 3', child4: 'Child 4',
      maGma: 'Maternal Grandmother', maGpa: 'Maternal Grandfather',
      paGma: 'Paternal Grandmother', paGpa: 'Paternal Grandfather',
      aunt: 'Aunt', uncle: 'Uncle'
    };

    familyMembers.forEach(member => {
      const conds = [];
      Object.keys(conditionNames).forEach(cond => {
        if (getChecked(`${cond}_${member}`)) conds.push(conditionNames[cond]);
      });
      const age = getVal(`age_${member}`);
      const death = getVal(`death_${member}`);
      if (conds.length || age || death) {
        let info = conds.join(', ') || 'No conditions checked';
        if (age) info += ` | Age: ${age}`;
        if (death) info += ` | Deceased: ${death}`;
        addField(memberDisplayNames[member] || member, info);
      }
    });
    y += 4;

    // === STEPS 5-7: Metabolic Assessment ===
    addSection('Metabolic Assessment');
    const categories = [
      { name: 'Digestion - Colon', qs: [1, 10] },
      { name: 'Upper Digestion - Stomach', qs: [11, 16] },
      { name: 'Upper Digestion - HCL/Enzymes', qs: [17, 23] },
      { name: 'Pancreas/Blood Sugar', qs: [24, 31] },
      { name: 'Liver/Gallbladder', qs: [32, 42] },
      { name: 'Hypoglycemia', qs: [44, 52] },
      { name: 'Insulin Resistance', qs: [53, 60] },
      { name: 'Adrenal - Hypo', qs: [61, 68] },
      { name: 'Adrenal - Hyper', qs: [69, 74] },
      { name: 'Thyroid - Hypo', qs: [75, 86] },
      { name: 'Thyroid - Hyper', qs: [87, 93] },
      { name: 'Endocrine - General', qs: [94, 99] },
      { name: 'Cardiovascular', qs: [100, 106] },
      { name: 'Immune/Inflammation', qs: [107, 115] }
    ];

    let grandTotal = 0;
    categories.forEach(cat => {
      let subtotal = 0;
      const responses = [];
      for (let q = cat.qs[0]; q <= cat.qs[1]; q++) {
        const val = parseInt(getVal(`q${q}`)) || 0;
        subtotal += val;
        if (val > 0 && METABOLIC_QUESTIONS[`q${q}`]) {
          responses.push(`${METABOLIC_QUESTIONS['q' + q]}: ${val}`);
        }
      }
      grandTotal += subtotal;
      if (subtotal > 0) {
        checkPage(10);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(51, 51, 51);
        pdf.text(`${cat.name} (Score: ${subtotal})`, M.left, y);
        y += 5;
        if (responses.length) {
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(80, 80, 80);
          responses.forEach(r => {
            checkPage(4.5);
            const lines = pdf.splitTextToSize(r, CONTENT_W - 8);
            lines.forEach(line => {
              pdf.text(line, M.left + 4, y);
              y += 4;
            });
          });
        }
        y += 3;
      }
    });

    checkPage(10);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(26, 155, 160);
    pdf.text(`Grand Total: ${grandTotal}`, M.left, y);
    y += 6;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    pdf.text(this.interpretMetabolicScore(grandTotal), M.left, y);
    y += 8;

    // Gallbladder
    const gb = form.querySelector('[name="gallbladder_removed"]:checked');
    if (gb && gb.value === 'yes') addField('Gallbladder Removed', 'Yes');

    console.log('Text-based PDF generated successfully');
    return pdf.output('blob');
  },

  /**
   * Generate PDF of the complete form using off-screen clone.
   * Clones the form card, copies all input values, renders off-screen
   * to avoid overlay occlusion and animation issues.
   * Returns base64 encoded PDF string.
   */
  async generateFormPDF() {
    const formCard = document.querySelector('.form-card');

    // 1. Clone the form card (deep clone gets DOM structure but NOT input values)
    const clone = formCard.cloneNode(true);

    // 2. Copy all form input values from original to clone
    const origInputs = formCard.querySelectorAll('input, select, textarea');
    const cloneInputs = clone.querySelectorAll('input, select, textarea');
    origInputs.forEach((orig, i) => {
      const target = cloneInputs[i];
      if (!target) return;
      if (orig.type === 'checkbox' || orig.type === 'radio') {
        target.checked = orig.checked;
        if (orig.checked) target.setAttribute('checked', 'checked');
        else target.removeAttribute('checked');
      } else if (orig.tagName === 'SELECT') {
        target.value = orig.value;
        // Also set the selected attribute on the correct option
        const options = target.querySelectorAll('option');
        options.forEach(opt => {
          opt.selected = (opt.value === orig.value);
        });
      } else {
        target.value = orig.value;
        target.setAttribute('value', orig.value);
      }
    });
    // Copy textarea content (value doesn't clone)
    const origTextareas = formCard.querySelectorAll('textarea');
    const cloneTextareas = clone.querySelectorAll('textarea');
    origTextareas.forEach((orig, i) => {
      if (cloneTextareas[i]) {
        cloneTextareas[i].textContent = orig.value;
        cloneTextareas[i].value = orig.value;
      }
    });

    // 3. Create off-screen container
    const offscreen = document.createElement('div');
    offscreen.id = 'pdf-offscreen-container';
    offscreen.style.cssText = 'position: absolute; left: 0; top: 0; width: 700px; z-index: -1; overflow: visible;';
    offscreen.appendChild(clone);

    // 4. In the clone: show steps 1-7, hide step 8, hide UI chrome
    const cloneSteps = clone.querySelectorAll('.wizard-step');
    cloneSteps.forEach((step, idx) => {
      if (idx < cloneSteps.length - 1) {
        step.classList.add('active');
        step.style.display = 'block';
        // Force inline styles to bypass CSS animation race condition
        // (wizardFadeIn starts at opacity:0 - inline styles override it immediately)
        step.style.opacity = '1';
        step.style.animation = 'none';
        step.style.transform = 'none';
      } else {
        step.style.display = 'none';
      }
    });

    // Hide navigation, progress bars, review elements in clone
    clone.querySelectorAll('.wizard-nav, .wizard-progress, .wizard-mobile-progress, .wizard-intro-box, .review-edit-btn, .total-score-card, #review-summary, .review-section').forEach(el => {
      el.style.display = 'none';
    });

    // 5. Scoped style: kill animations/transitions, force opacity, PDF table fixes
    const pdfStyle = document.createElement('style');
    pdfStyle.id = 'pdf-offscreen-styles';
    pdfStyle.textContent = `
      #pdf-offscreen-container * {
        animation: none !important;
        transition: none !important;
        opacity: 1 !important;
      }
      #pdf-offscreen-container .form-card {
        max-width: 700px !important;
        width: 700px !important;
      }
      #pdf-offscreen-container .matrix-table {
        font-size: 8px !important;
        table-layout: fixed !important;
        width: 100% !important;
      }
      #pdf-offscreen-container .matrix-table th {
        padding: 4px 2px !important;
        font-size: 7px !important;
        word-wrap: break-word !important;
      }
      #pdf-offscreen-container .matrix-table td {
        padding: 3px 2px !important;
      }
      #pdf-offscreen-container .matrix-table td:first-child {
        width: 90px !important;
        font-size: 8px !important;
      }
      #pdf-offscreen-container .matrix-table input[type="checkbox"] {
        width: 12px !important;
        height: 12px !important;
      }
      #pdf-offscreen-container .matrix-table input[type="text"] {
        font-size: 7px !important;
        width: 100% !important;
        padding: 1px !important;
      }
      #pdf-offscreen-container h2,
      #pdf-offscreen-container h3,
      #pdf-offscreen-container h4,
      #pdf-offscreen-container .wizard-step-header,
      #pdf-offscreen-container .form-section h3,
      #pdf-offscreen-container .symptom-card h3 {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      #pdf-offscreen-container .form-section,
      #pdf-offscreen-container .symptom-card {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    `;
    document.head.appendChild(pdfStyle);

    // 6. Append to body and wait for fonts + layout + paint
    document.body.appendChild(offscreen);
    await document.fonts.ready;
    await new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 500);
        });
      });
    });

    // 7. Render each page independently via html2canvas to avoid canvas size limits.
    // A single full-height canvas (e.g. 1400x88000) exceeds GPU texture limits in many
    // browsers, causing silent data corruption beyond ~16000-32000px. Per-page rendering
    // keeps each canvas small (~1400x2000) and guarantees correct content on every page.
    const MARGIN = [10, 8, 10, 8]; // [top, right, bottom, left] in mm
    const A4_W = 210; // mm
    const A4_H = 297; // mm
    const CONTENT_W = A4_W - MARGIN[1] - MARGIN[3]; // 194 mm
    const CONTENT_H = A4_H - MARGIN[0] - MARGIN[2]; // 277 mm
    const SCALE = 2;
    const WINDOW_W = 700;

    try {
      // Calculate page dimensions in source (CSS) pixels
      const pxPerMm = (WINDOW_W * SCALE) / CONTENT_W; // canvas px per mm
      const pageHeightSrc = Math.floor(CONTENT_H * WINDOW_W / CONTENT_W); // ~999 CSS px per page
      const cloneHeight = clone.scrollHeight;
      const totalPages = Math.ceil(cloneHeight / pageHeightSrc);
      console.log(`PDF: ${totalPages} pages, clone ${WINDOW_W}x${cloneHeight}, pageHeightSrc=${pageHeightSrc}`);

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();

        const srcY = page * pageHeightSrc;
        const srcH = Math.min(pageHeightSrc, cloneHeight - srcY);

        // Render just this page's vertical strip
        const pageCanvas = await html2canvas(clone, {
          scale: SCALE,
          useCORS: true,
          logging: false,
          windowWidth: WINDOW_W,
          y: srcY,
          height: srcH,
          width: WINDOW_W,
          scrollY: 0,
          scrollX: 0,
          x: 0
        });

        // Pixel verification on first page only
        if (page === 0) {
          try {
            const ctx = pageCanvas.getContext('2d');
            const sample = ctx.getImageData(0, 0, Math.min(200, pageCanvas.width), Math.min(200, pageCanvas.height));
            const px = sample.data;
            let colored = 0;
            for (let i = 0; i < px.length; i += 4) {
              if (px[i] < 245 || px[i + 1] < 245 || px[i + 2] < 245) colored++;
            }
            const ratio = colored / (px.length / 4);
            console.log(`Page 1 canvas ${pageCanvas.width}x${pageCanvas.height}, ${(ratio * 100).toFixed(1)}% colored`);
            if (ratio < 0.01) {
              console.error('First page canvas appears blank');
              return null;
            }
          } catch (e) {
            console.warn('Pixel check failed, proceeding:', e);
          }
        }

        const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
        const sliceHeightMm = (pageCanvas.height / pxPerMm);
        pdf.addImage(imgData, 'JPEG', MARGIN[3], MARGIN[0], CONTENT_W, sliceHeightMm);
      }

      return pdf.output('blob');
    } finally {
      // 8. Cleanup: remove clone container + temp style. Original DOM untouched.
      offscreen.remove();
      pdfStyle.remove();
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

    // Timeout protection - 90 seconds max wait (PDF generation renders each page individually)
    const TIMEOUT_MS = 90000;
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      this.handleSubmissionFailure('Submission timed out. Please check your internet connection and try again.', submitBtn);
    }, TIMEOUT_MS);

    try {
      // Generate PDF and upload to Vercel Blob
      try {
        console.log('Generating PDF of intake form...');
        let pdfBlob = null;

        // Try html2canvas rendering with a 30-second timeout
        try {
          pdfBlob = await Promise.race([
            this.generateFormPDF(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Canvas PDF timed out after 30s')), 30000))
          ]);
          if (!pdfBlob) throw new Error('Canvas PDF returned null (blank render)');
          console.log('Canvas PDF generated, size:', Math.round(pdfBlob.size / 1024), 'KB');
        } catch (canvasErr) {
          console.warn('Canvas PDF failed, using text fallback:', canvasErr.message);
          this.updateLoadingMessage('Generating PDF (text mode)...');
          pdfBlob = this.generateTextPDF();
          console.log('Text PDF generated, size:', Math.round(pdfBlob.size / 1024), 'KB');
        }

        if (pdfBlob && !timedOut) {
          this.updateLoadingMessage('Uploading PDF...');

          const lastName = (this.form.querySelector('[name="lastName"]')?.value || 'patient').trim();
          const resp = await fetch('/api/upload-pdf/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/pdf',
              'X-Patient-Name': lastName
            },
            body: pdfBlob
          });

          if (!resp.ok) throw new Error(`Upload returned ${resp.status}`);
          const { url } = await resp.json();
          console.log('PDF uploaded, URL:', url);
          window._intakeWizardPDFUrl = url;
          window._intakeWizardPDFFailed = false;
        } else {
          window._intakeWizardPDFUrl = null;
          window._intakeWizardPDFFailed = true;
        }
      } catch (pdfError) {
        console.error('PDF generation/upload failed:', pdfError);
        window._intakeWizardPDFUrl = null;
        window._intakeWizardPDFFailed = true;
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

  // ============================================
  // "Other" field enable/disable logic
  // ============================================

  /**
   * Setup toggle behavior for "Other" text fields
   * Text field is disabled until checkbox/radio is checked
   */
  function setupOtherFieldToggle(checkboxSelector, textFieldSelector) {
    const checkbox = document.querySelector(checkboxSelector);
    const textField = document.querySelector(textFieldSelector);
    if (!checkbox || !textField) return;

    // Initially disable text field
    textField.disabled = !checkbox.checked;

    checkbox.addEventListener('change', () => {
      textField.disabled = !checkbox.checked;
      if (!checkbox.checked) textField.value = '';
    });
  }

  // Setup for checkboxes with "Other" options
  setupOtherFieldToggle('#past_other', 'input[name="pastCareOther"]');
  setupOtherFieldToggle('#fc_other', 'input[name="fearConditionOther"]');

  // Setup for visit purpose radio with "Other" option
  const visitPurposeRadios = document.querySelectorAll('input[name="visitPurpose"]');
  const visitPurposeOther = document.querySelector('input[name="visitPurposeOther"]');
  if (visitPurposeOther && visitPurposeRadios.length > 0) {
    // Initially disable
    visitPurposeOther.disabled = true;

    visitPurposeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        const otherSelected = document.querySelector('input[name="visitPurpose"][value="other"]')?.checked;
        visitPurposeOther.disabled = !otherSelected;
        if (!otherSelected) visitPurposeOther.value = '';
      });
    });
  }

  // ============================================
  // Family history age mutual exclusivity
  // ============================================
  const familyMembers = [
    'mother', 'father', 'brother', 'sister',
    'child1', 'child2', 'child3', 'child4',
    'maGma', 'maGpa', 'paGma', 'paGpa',
    'aunt', 'uncle'
  ];

  familyMembers.forEach(member => {
    const ageAlive = document.querySelector(`input[name="age_${member}"]`);
    const ageDeath = document.querySelector(`input[name="death_${member}"]`);
    if (!ageAlive || !ageDeath) return;

    ageAlive.addEventListener('input', () => {
      if (ageAlive.value) {
        ageDeath.value = '';
        ageDeath.disabled = true;
        ageDeath.style.backgroundColor = '#f0f0f0';
      } else {
        ageDeath.disabled = false;
        ageDeath.style.backgroundColor = '';
      }
    });

    ageDeath.addEventListener('input', () => {
      if (ageDeath.value) {
        ageAlive.value = '';
        ageAlive.disabled = true;
        ageAlive.style.backgroundColor = '#f0f0f0';
      } else {
        ageAlive.disabled = false;
        ageAlive.style.backgroundColor = '';
      }
    });
  });
});

// Make globally accessible
window.IntakeWizard = IntakeWizard;
