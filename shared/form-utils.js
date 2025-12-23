/**
 * Healthplex Forms - Shared Utilities
 * Form validation, submission, and state management
 *
 * WEBHOOK PAYLOAD STRUCTURE:
 * All forms send structured JSON payloads to n8n webhooks with clearly defined variables.
 * The payload includes:
 * - _meta: Metadata about the submission (formType, submittedAt, userAgent)
 * - contact: Core contact info (firstName, lastName, email, phone) for GHL matching
 * - All form fields with their original names as defined in the HTML
 * - Computed values like category subtotals and grand totals where applicable
 */

const FormUtils = {
  /**
   * Initialize form with common functionality
   */
  init(formId, webhookKey) {
    this.form = document.getElementById(formId);
    this.webhookKey = webhookKey;
    this.draftKey = `healthplex_draft_${webhookKey}`;

    if (!this.form) {
      console.error(`Form with ID "${formId}" not found`);
      return;
    }

    // Load config
    this.config = window.HEALTHPLEX_CONFIG || {};

    // Setup event listeners
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    // Setup draft saving
    if (this.config.settings?.enableDraftSaving) {
      this.loadDraft();
      this.setupAutoSave();
    }

    // Setup progress indicator
    if (this.config.settings?.showProgressIndicator) {
      this.setupProgressIndicator();
    }

    // Setup auto-calculation for metabolic assessment
    if (webhookKey === 'metabolicAssessment') {
      this.setupAutoCalculation();
    }

    console.log(`Form "${formId}" initialized`);
  },

  /**
   * Handle form submission
   */
  async handleSubmit(e) {
    e.preventDefault();

    // Validate form
    if (!this.validateForm()) {
      this.scrollToFirstError();
      return;
    }

    // Show loading state
    this.setSubmitting(true);

    try {
      // Collect form data
      const formData = this.collectFormData();

      // Get webhook URL
      const webhookUrl = this.config.webhooks?.[this.webhookKey];

      if (!webhookUrl || webhookUrl.includes('your-n8n-instance')) {
        throw new Error('Webhook URL not configured. Please update config.js');
      }

      // Submit to webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`Submission failed: ${response.status}`);
      }

      // Clear draft
      this.clearDraft();

      // Show success
      this.showSuccess();

    } catch (error) {
      console.error('Form submission error:', error);
      this.showError(error.message);
    } finally {
      this.setSubmitting(false);
    }
  },

  /**
   * Collect all form data into a structured object for n8n/GHL integration
   *
   * PAYLOAD STRUCTURE BY FORM TYPE:
   *
   * newConsultation:
   *   - contact: { firstName, middleName, lastName, email, phone, fullName }
   *   - address: { street, city, state, zip, fullAddress }
   *   - demographics: { birthDate, maritalStatus, occupation, employer }
   *   - physician: { name, city }
   *   - referredBy
   *   - complaints: { primary, secondary, tertiary, quaternary, duration, other }
   *   - physicalStats: { height, weight }
   *   - improvements: { digestion, sleep, wellbeing, energy }
   *   - history: { triedNotWorked, discouraged, worstFeeling, bodyFunctions }
   *   - impact: { work, family, hobbies, life, feelsOlder }
   *   - visitPurpose: { type, other }
   *   - pastCare: { medications, holistic, routine, vitamins, exercise, chiropractic, diet, other, otherText, results }
   *   - fears: { areas[], conditions[], conditionOther, futureWithoutHelp }
   *   - positiveOutcomes: { improvements[], threeYearVision, barriers, overcomingBarriers, strengths }
   *   - commitment: { importance, coachable, prepared }
   *
   * familyHistory:
   *   - familyMembers: { [member]: { age, deathAge, conditions: {} } }
   *   - otherConditions: [{ name, affectedMembers[] }]
   *
   * metabolicAssessment:
   *   - patient: { name, date, age, sex }
   *   - categories: { [categoryId]: { name, subtotal, responses: {} } }
   *   - genderSpecific: { responses: {} }
   *   - grandTotal
   */
  collectFormData() {
    const formData = new FormData(this.form);
    const rawData = {};

    // First, collect all raw form data
    for (const [key, value] of formData.entries()) {
      if (rawData[key]) {
        if (Array.isArray(rawData[key])) {
          rawData[key].push(value);
        } else {
          rawData[key] = [rawData[key], value];
        }
      } else {
        rawData[key] = value;
      }
    }

    // Process unchecked checkboxes (they're not in FormData)
    this.form.querySelectorAll('input[type="checkbox"]:not(:checked)').forEach(cb => {
      if (!rawData[cb.name]) {
        rawData[cb.name] = false;
      }
    });

    // Mark checked checkboxes as true (instead of 'on')
    this.form.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
      rawData[cb.name] = true;
    });

    // Build structured payload based on form type
    const payload = this.buildStructuredPayload(rawData);

    return payload;
  },

  /**
   * Build a structured payload with clearly defined variables for GHL/n8n
   */
  buildStructuredPayload(rawData) {
    const payload = {
      _meta: {
        formType: this.webhookKey,
        formName: this.getFormDisplayName(),
        submittedAt: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        userAgent: navigator.userAgent
      },
      rawData: rawData // Include raw data for flexibility
    };

    // Build form-specific structured data
    switch (this.webhookKey) {
      case 'newConsultation':
        this.buildConsultationPayload(payload, rawData);
        break;
      case 'familyHistory':
        this.buildFamilyHistoryPayload(payload, rawData);
        break;
      case 'metabolicAssessment':
        this.buildMetabolicPayload(payload, rawData);
        break;
    }

    return payload;
  },

  /**
   * Get human-readable form name
   */
  getFormDisplayName() {
    const names = {
      newConsultation: 'New Consultation Checklist',
      familyHistory: 'Family History Questionnaire',
      metabolicAssessment: 'Metabolic Assessment Form'
    };
    return names[this.webhookKey] || this.webhookKey;
  },

  /**
   * Build structured payload for New Consultation form
   */
  buildConsultationPayload(payload, data) {
    // Contact information (core fields for GHL matching)
    payload.contact = {
      firstName: data.firstName || '',
      middleName: data.middleName || '',
      lastName: data.lastName || '',
      fullName: [data.firstName, data.middleName, data.lastName].filter(Boolean).join(' '),
      email: data.email || '',
      phone: data.phone || ''
    };

    // Address
    payload.address = {
      street: data.street || '',
      city: data.city || '',
      state: data.state || '',
      zip: data.zip || '',
      fullAddress: [data.street, data.city, data.state, data.zip].filter(Boolean).join(', ')
    };

    // Demographics
    payload.demographics = {
      birthDate: data.birthDate || '',
      maritalStatus: data.maritalStatus || '',
      occupation: data.occupation || '',
      employer: data.employer || ''
    };

    // Physician
    payload.physician = {
      name: data.currentPhysician || '',
      city: data.physicianCity || ''
    };

    // Referral source
    payload.referredBy = data.referredBy || '';

    // Health complaints
    payload.complaints = {
      primary: data.complaint1 || '',
      secondary: data.complaint2 || '',
      tertiary: data.complaint3 || '',
      quaternary: data.complaint4 || '',
      allComplaints: [data.complaint1, data.complaint2, data.complaint3, data.complaint4].filter(Boolean),
      duration: data.problemDuration || '',
      other: data.otherComplaints || ''
    };

    // Physical stats
    payload.physicalStats = {
      height: data.height || '',
      weight: data.weight || ''
    };

    // Desired improvements
    payload.improvements = {
      digestion: data.improvement_digestion === true,
      sleep: data.improvement_sleep === true,
      wellbeing: data.improvement_wellbeing === true,
      energy: data.improvement_energy === true,
      list: []
    };
    if (payload.improvements.digestion) payload.improvements.list.push('Digestion');
    if (payload.improvements.sleep) payload.improvements.list.push('Sleep');
    if (payload.improvements.wellbeing) payload.improvements.list.push('Wellbeing');
    if (payload.improvements.energy) payload.improvements.list.push('Energy');

    // History and attempts
    payload.history = {
      triedNotWorked: data.triedNotWorked || '',
      discouraged: data.discouraged || '',
      worstFeeling: data.worstFeeling || '',
      bodyFunctions: data.bodyFunctions || ''
    };

    // Life impact
    payload.impact = {
      work: data.impact_work || '',
      family: data.impact_family || '',
      hobbies: data.impact_hobbies || '',
      life: data.impact_life || '',
      feelsOlder: data.feelsOlder || ''
    };

    // Visit purpose
    payload.visitPurpose = {
      type: data.visitPurpose || '',
      other: data.visitPurposeOther || ''
    };

    // Past care methods
    payload.pastCare = {
      medications: data.pastCare_medications === true,
      holistic: data.pastCare_holistic === true,
      routine: data.pastCare_routine === true,
      vitamins: data.pastCare_vitamins === true,
      exercise: data.pastCare_exercise === true,
      chiropractic: data.pastCare_chiropractic === true,
      diet: data.pastCare_diet === true,
      other: data.pastCare_other === true,
      otherText: data.pastCareOther || '',
      results: data.previousMethodsResults || '',
      list: []
    };
    if (payload.pastCare.medications) payload.pastCare.list.push('Medications');
    if (payload.pastCare.holistic) payload.pastCare.list.push('Holistic');
    if (payload.pastCare.routine) payload.pastCare.list.push('Routine Medical');
    if (payload.pastCare.vitamins) payload.pastCare.list.push('Vitamins');
    if (payload.pastCare.exercise) payload.pastCare.list.push('Exercise');
    if (payload.pastCare.chiropractic) payload.pastCare.list.push('Chiropractic');
    if (payload.pastCare.diet) payload.pastCare.list.push('Diet and Nutrition');
    if (payload.pastCare.other && payload.pastCare.otherText) payload.pastCare.list.push(payload.pastCare.otherText);

    // Fears about areas of life
    const fearAreas = [];
    if (data.fear_job) fearAreas.push('Job');
    if (data.fear_kids) fearAreas.push('Kids');
    if (data.fear_marriage) fearAreas.push('Marriage');
    if (data.fear_sleep) fearAreas.push('Sleep');
    if (data.fear_freedom) fearAreas.push('Freedom');
    if (data.fear_abilities) fearAreas.push('Future Abilities');
    if (data.fear_finances) fearAreas.push('Finances');
    if (data.fear_time) fearAreas.push('Time');

    // Feared health conditions
    const fearConditions = [];
    if (data.fearCondition_abilities) fearConditions.push('Diminished Abilities');
    if (data.fearCondition_surgery) fearConditions.push('Surgery');
    if (data.fearCondition_stress) fearConditions.push('Stress');
    if (data.fearCondition_arthritis) fearConditions.push('Arthritis');
    if (data.fearCondition_weight) fearConditions.push('Weight Gain');
    if (data.fearCondition_cancer) fearConditions.push('Cancer');
    if (data.fearCondition_heart) fearConditions.push('Heart Disease');
    if (data.fearCondition_diabetes) fearConditions.push('Diabetes');
    if (data.fearCondition_depression) fearConditions.push('Depression');

    payload.fears = {
      areas: fearAreas,
      areasText: fearAreas.join(', '),
      conditions: fearConditions,
      conditionsText: fearConditions.join(', '),
      conditionOther: data.fearConditionOther || '',
      futureWithoutHelp: data.futureWithoutHelp || ''
    };

    // Positive outcomes
    const betterList = [];
    if (data.better_stress) betterList.push('Diminished Stress');
    if (data.better_sleep) betterList.push('Better Sleep');
    if (data.better_energy) betterList.push('More Energy');
    if (data.better_work) betterList.push('Better Work');
    if (data.better_esteem) betterList.push('Self-Esteem');
    if (data.better_outlook) betterList.push('Better Outlook');
    if (data.better_confidence) betterList.push('Confidence');
    if (data.better_family) betterList.push('Family');

    payload.positiveOutcomes = {
      improvements: betterList,
      improvementsText: betterList.join(', '),
      threeYearVision: data.threeYearVision || '',
      barriers: data.barriers || '',
      overcomingBarriers: data.overcomingBarriers || '',
      strengths: data.strengths || ''
    };

    // Commitment ratings
    payload.commitment = {
      importance: parseInt(data.importance) || 0,
      coachable: parseInt(data.coachable) || 0,
      prepared: parseInt(data.prepared) || 0,
      average: Math.round(((parseInt(data.importance) || 0) + (parseInt(data.coachable) || 0) + (parseInt(data.prepared) || 0)) / 3 * 10) / 10
    };
  },

  /**
   * Build structured payload for Family History form
   */
  buildFamilyHistoryPayload(payload, data) {
    const familyMembers = ['mother', 'father', 'brother', 'sister', 'child1', 'child2', 'child3', 'child4', 'maGma', 'maGpa', 'paGma', 'paGpa', 'aunt', 'uncle'];
    const conditions = ['cancer', 'heartDisease', 'hypertension', 'obesity', 'diabetes', 'stroke', 'autoimmune', 'arthritis', 'kidneyDisease', 'thyroid', 'seizures', 'psychiatric', 'anxiety', 'depression', 'asthma', 'allergies', 'eczema', 'adhd', 'autism', 'ibs', 'dementia', 'substanceAbuse', 'genetic', 'celiac'];

    payload.familyMembers = {};

    familyMembers.forEach(member => {
      const memberData = {
        displayName: this.getMemberDisplayName(member),
        age: data[`age_${member}`] || null,
        deathAge: data[`death_${member}`] || null,
        isDeceased: !!data[`death_${member}`],
        conditions: {}
      };

      const memberConditions = [];
      conditions.forEach(condition => {
        const hasCondition = data[`${condition}_${member}`] === true;
        memberData.conditions[condition] = hasCondition;
        if (hasCondition) {
          memberConditions.push(this.getConditionDisplayName(condition));
        }
      });

      memberData.conditionsList = memberConditions;
      memberData.conditionsText = memberConditions.join(', ');
      memberData.hasConditions = memberConditions.length > 0;

      payload.familyMembers[member] = memberData;
    });

    // Other custom conditions
    payload.otherConditions = [];
    for (let i = 1; i <= 3; i++) {
      const conditionName = data[`other${i}_name`];
      if (conditionName) {
        const affectedMembers = [];
        familyMembers.forEach(member => {
          if (data[`other${i}_${member}`] === true) {
            affectedMembers.push(this.getMemberDisplayName(member));
          }
        });
        payload.otherConditions.push({
          name: conditionName,
          affectedMembers: affectedMembers,
          affectedMembersText: affectedMembers.join(', ')
        });
      }
    }

    // Summary by condition
    payload.conditionSummary = {};
    conditions.forEach(condition => {
      const affected = [];
      familyMembers.forEach(member => {
        if (data[`${condition}_${member}`] === true) {
          affected.push(this.getMemberDisplayName(member));
        }
      });
      if (affected.length > 0) {
        payload.conditionSummary[condition] = {
          displayName: this.getConditionDisplayName(condition),
          affectedMembers: affected,
          affectedMembersText: affected.join(', '),
          count: affected.length
        };
      }
    });
  },

  /**
   * Build structured payload for Metabolic Assessment form
   */
  buildMetabolicPayload(payload, data) {
    // Patient info
    payload.patient = {
      name: data.name || '',
      date: data.date || '',
      age: parseInt(data.age) || null,
      sex: data.sex || ''
    };

    // Contact info for GHL matching (use name field)
    const nameParts = (data.name || '').trim().split(/\s+/);
    payload.contact = {
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      fullName: data.name || ''
    };

    // Category definitions with question ranges
    const categories = [
      { id: 'cat-1', name: 'Digestion - Colon', questions: [1, 10] },
      { id: 'cat-2', name: 'Upper Digestion - Stomach', questions: [11, 16] },
      { id: 'cat-3', name: 'Upper Digestion - HCL/Enzymes', questions: [17, 23] },
      { id: 'cat-4', name: 'Pancreas/Blood Sugar', questions: [24, 31] },
      { id: 'cat-5', name: 'Liver/Gallbladder', questions: [32, 42] },
      { id: 'cat-6', name: 'Hypoglycemia', questions: [44, 52] },
      { id: 'cat-7', name: 'Insulin Resistance', questions: [53, 60] },
      { id: 'cat-8', name: 'Adrenal - Hypo', questions: [61, 68] },
      { id: 'cat-9', name: 'Adrenal - Hyper', questions: [69, 74] },
      { id: 'cat-10', name: 'Thyroid - Hypo', questions: [75, 86] },
      { id: 'cat-11', name: 'Thyroid - Hyper', questions: [87, 93] },
      { id: 'cat-12', name: 'Endocrine - General', questions: [94, 99] },
      { id: 'cat-13', name: 'Cardiovascular', questions: [100, 106] },
      { id: 'cat-14', name: 'Immune/Inflammation', questions: [107, 115] }
    ];

    payload.categories = {};
    let grandTotal = 0;

    categories.forEach(cat => {
      const catData = {
        name: cat.name,
        responses: {},
        subtotal: 0
      };

      for (let q = cat.questions[0]; q <= cat.questions[1]; q++) {
        const value = parseInt(data[`q${q}`]) || 0;
        catData.responses[`q${q}`] = value;
        catData.subtotal += value;
      }

      grandTotal += catData.subtotal;
      payload.categories[cat.id] = catData;
    });

    // Gender-specific sections
    payload.genderSpecific = {
      sex: data.sex || '',
      responses: {}
    };

    // Male-specific questions (if applicable)
    if (data.sex === 'male') {
      const maleQuestions = [116, 117, 118, 119, 120, 121, 122, 123];
      let maleSubtotal = 0;
      maleQuestions.forEach(q => {
        const value = parseInt(data[`q${q}`]) || 0;
        payload.genderSpecific.responses[`q${q}`] = value;
        maleSubtotal += value;
      });
      payload.genderSpecific.subtotal = maleSubtotal;
      payload.genderSpecific.categoryName = 'Male Hormones';
      grandTotal += maleSubtotal;
    }

    // Female-specific questions (if applicable)
    if (data.sex === 'female') {
      const femaleQuestions = [124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135];
      let femaleSubtotal = 0;
      femaleQuestions.forEach(q => {
        const value = parseInt(data[`q${q}`]) || 0;
        payload.genderSpecific.responses[`q${q}`] = value;
        femaleSubtotal += value;
      });
      payload.genderSpecific.subtotal = femaleSubtotal;
      payload.genderSpecific.categoryName = 'Female Hormones';
      grandTotal += femaleSubtotal;
    }

    // Gallbladder removed
    payload.gallbladderRemoved = data.gallbladder_removed === 'yes';

    // Grand total
    payload.grandTotal = grandTotal;

    // Score interpretation
    payload.scoreInterpretation = this.interpretMetabolicScore(grandTotal);

    // Category rankings (highest to lowest concern)
    const categoryRankings = Object.entries(payload.categories)
      .map(([id, cat]) => ({ id, name: cat.name, subtotal: cat.subtotal }))
      .sort((a, b) => b.subtotal - a.subtotal);

    payload.categoryRankings = categoryRankings;
    payload.topConcerns = categoryRankings.slice(0, 3).map(c => c.name);
  },

  /**
   * Interpret metabolic assessment score
   */
  interpretMetabolicScore(score) {
    if (score <= 20) return { level: 'Low', description: 'Minimal metabolic dysfunction indicated' };
    if (score <= 50) return { level: 'Moderate', description: 'Some areas of concern that may benefit from attention' };
    if (score <= 100) return { level: 'Elevated', description: 'Multiple areas showing dysfunction' };
    return { level: 'High', description: 'Significant metabolic dysfunction across multiple systems' };
  },

  /**
   * Get display name for family member
   */
  getMemberDisplayName(member) {
    const names = {
      mother: 'Mother',
      father: 'Father',
      brother: 'Brother',
      sister: 'Sister',
      child1: 'Child 1',
      child2: 'Child 2',
      child3: 'Child 3',
      child4: 'Child 4',
      maGma: 'Maternal Grandmother',
      maGpa: 'Maternal Grandfather',
      paGma: 'Paternal Grandmother',
      paGpa: 'Paternal Grandfather',
      aunt: 'Aunt',
      uncle: 'Uncle'
    };
    return names[member] || member;
  },

  /**
   * Get display name for condition
   */
  getConditionDisplayName(condition) {
    const names = {
      cancer: 'Cancer',
      heartDisease: 'Heart Disease',
      hypertension: 'Hypertension',
      obesity: 'Obesity',
      diabetes: 'Diabetes',
      stroke: 'Stroke',
      autoimmune: 'Autoimmune Disease',
      arthritis: 'Arthritis',
      kidneyDisease: 'Kidney Disease',
      thyroid: 'Thyroid Problems',
      seizures: 'Seizures/Epilepsy',
      psychiatric: 'Psychiatric Disorders',
      anxiety: 'Anxiety',
      depression: 'Depression',
      asthma: 'Asthma',
      allergies: 'Allergies',
      eczema: 'Eczema',
      adhd: 'ADHD',
      autism: 'Autism',
      ibs: 'Irritable Bowel Syndrome',
      dementia: 'Dementia',
      substanceAbuse: 'Substance Abuse',
      genetic: 'Genetic Disorders',
      celiac: 'Celiac Disease'
    };
    return names[condition] || condition;
  },

  /**
   * Validate all required fields
   */
  validateForm() {
    let isValid = true;

    // Clear previous errors
    this.clearErrors();

    // Check required fields
    this.form.querySelectorAll('[required]').forEach(field => {
      if (!this.validateField(field)) {
        isValid = false;
      }
    });

    // Check email fields
    this.form.querySelectorAll('input[type="email"]').forEach(field => {
      if (field.value && !this.isValidEmail(field.value)) {
        this.showFieldError(field, 'Please enter a valid email address');
        isValid = false;
      }
    });

    // Check phone fields
    this.form.querySelectorAll('input[type="tel"]').forEach(field => {
      if (field.value && !this.isValidPhone(field.value)) {
        this.showFieldError(field, 'Please enter a valid phone number');
        isValid = false;
      }
    });

    return isValid;
  },

  /**
   * Validate a single field
   */
  validateField(field) {
    const value = field.value?.trim();

    if (field.required && !value) {
      this.showFieldError(field, 'This field is required');
      return false;
    }

    return true;
  },

  /**
   * Show error message for a field
   */
  showFieldError(field, message) {
    field.classList.add('error');

    // Remove existing error message
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) existingError.remove();

    // Add new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    field.parentNode.appendChild(errorDiv);
  },

  /**
   * Clear all error states
   */
  clearErrors() {
    this.form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    this.form.querySelectorAll('.field-error').forEach(el => el.remove());
  },

  /**
   * Scroll to first error
   */
  scrollToFirstError() {
    const firstError = this.form.querySelector('.error');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstError.focus();
    }
  },

  /**
   * Email validation
   */
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  /**
   * Phone validation (basic)
   */
  isValidPhone(phone) {
    return /^[\d\s\-\(\)\+\.]{10,}$/.test(phone);
  },

  /**
   * Set form submitting state
   */
  setSubmitting(isSubmitting) {
    const submitBtn = this.form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = isSubmitting;
      submitBtn.innerHTML = isSubmitting
        ? `<span class="spinner"></span> ${this.config.settings?.submittingText || 'Submitting...'}`
        : this.config.settings?.submitButtonText || 'Submit Form';
    }
  },

  /**
   * Show success message
   */
  showSuccess() {
    // Hide form
    this.form.style.display = 'none';

    // Show success screen
    const successHtml = `
      <div class="success-screen">
        <div class="success-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2>Thank You!</h2>
        <p>Your form has been submitted successfully.</p>
        <p>We will review your information and be in touch soon.</p>
      </div>
    `;

    const successDiv = document.createElement('div');
    successDiv.innerHTML = successHtml;
    this.form.parentNode.appendChild(successDiv);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /**
   * Show error message
   */
  showError(message) {
    // Remove existing alert
    const existingAlert = this.form.querySelector('.alert-error');
    if (existingAlert) existingAlert.remove();

    // Add error alert at top of form
    const alertHtml = `
      <div class="alert alert-error">
        <strong>Submission Error:</strong> ${message}
      </div>
    `;
    this.form.insertAdjacentHTML('afterbegin', alertHtml);

    // Scroll to error
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /**
   * Save draft to localStorage
   */
  saveDraft() {
    const data = this.collectFormData();
    delete data._meta; // Don't save metadata
    localStorage.setItem(this.draftKey, JSON.stringify(data));
    console.log('Draft saved');
  },

  /**
   * Load draft from localStorage
   */
  loadDraft() {
    const saved = localStorage.getItem(this.draftKey);
    if (!saved) return;

    try {
      const data = JSON.parse(saved);

      Object.keys(data).forEach(key => {
        const field = this.form.querySelector(`[name="${key}"]`);
        if (!field) return;

        if (field.type === 'checkbox') {
          field.checked = data[key] === true || data[key] === 'on';
        } else if (field.type === 'radio') {
          const radio = this.form.querySelector(`[name="${key}"][value="${data[key]}"]`);
          if (radio) radio.checked = true;
        } else {
          field.value = data[key];
        }
      });

      // Show draft restored notification
      this.showDraftNotification();

      console.log('Draft loaded');
    } catch (e) {
      console.error('Error loading draft:', e);
    }
  },

  /**
   * Show draft restored notification
   */
  showDraftNotification() {
    const notificationHtml = `
      <div class="alert alert-warning" id="draft-notification">
        <strong>Draft Restored:</strong> Your previous progress has been restored.
        <button type="button" onclick="FormUtils.clearDraft(); this.parentNode.remove();"
                style="float: right; background: none; border: none; cursor: pointer; font-weight: bold;">
          Clear Draft ×
        </button>
      </div>
    `;
    this.form.insertAdjacentHTML('afterbegin', notificationHtml);
  },

  /**
   * Clear saved draft
   */
  clearDraft() {
    localStorage.removeItem(this.draftKey);
    const notification = document.getElementById('draft-notification');
    if (notification) notification.remove();
    console.log('Draft cleared');
  },

  /**
   * Setup auto-save interval
   */
  setupAutoSave() {
    const interval = this.config.settings?.draftSaveInterval || 30000;
    setInterval(() => this.saveDraft(), interval);

    // Also save on input
    this.form.addEventListener('change', () => this.saveDraft());
  },

  /**
   * Setup progress indicator
   */
  setupProgressIndicator() {
    const sections = this.form.querySelectorAll('.form-section');
    if (sections.length < 2) return;

    // Create progress bar
    const progressHtml = `
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" style="width: 0%"></div>
        </div>
        <div class="progress-text">Section 1 of ${sections.length}</div>
      </div>
    `;

    this.form.insertAdjacentHTML('afterbegin', progressHtml);

    // Update progress on scroll
    window.addEventListener('scroll', () => this.updateProgress(sections));
  },

  /**
   * Update progress indicator based on scroll position
   */
  updateProgress(sections) {
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    if (!progressFill || !progressText) return;

    let currentSection = 1;
    sections.forEach((section, index) => {
      const rect = section.getBoundingClientRect();
      if (rect.top < window.innerHeight / 2) {
        currentSection = index + 1;
      }
    });

    const progress = (currentSection / sections.length) * 100;
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `Section ${currentSection} of ${sections.length}`;
  },

  /**
   * Calculate category subtotal (for Metabolic Assessment)
   */
  calculateCategorySubtotal(categoryId) {
    const category = document.getElementById(categoryId);
    if (!category) return 0;

    let subtotal = 0;
    category.querySelectorAll('input[type="radio"]:checked').forEach(radio => {
      const value = parseInt(radio.value, 10);
      if (!isNaN(value)) subtotal += value;
    });

    // Update subtotal display
    const subtotalDisplay = category.querySelector('.category-subtotal');
    if (subtotalDisplay) {
      subtotalDisplay.textContent = `Subtotal: ${subtotal}`;
    }

    return subtotal;
  },

  /**
   * Calculate grand total (for Metabolic Assessment)
   */
  calculateGrandTotal() {
    let total = 0;
    document.querySelectorAll('.category-section').forEach(category => {
      total += this.calculateCategorySubtotal(category.id);
    });

    const totalDisplay = document.getElementById('grand-total');
    if (totalDisplay) {
      totalDisplay.textContent = total;
    }

    return total;
  },

  /**
   * Setup auto-calculation for Metabolic Assessment
   */
  setupAutoCalculation() {
    document.querySelectorAll('.category-section input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', () => {
        this.calculateCategorySubtotal(radio.closest('.category-section').id);
        this.calculateGrandTotal();
      });
    });
  }
};

// Make available globally
window.FormUtils = FormUtils;
