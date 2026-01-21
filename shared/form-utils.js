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

/**
 * Metabolic Assessment Question Text Mapping
 * Maps question IDs (q1, q2, etc.) to their full text descriptions
 */
const METABOLIC_QUESTIONS = {
  // Category I: Digestion - Colon (q1-q10)
  q1: "Feeling that bowels do not empty completely",
  q2: "Lower abdominal pain relieved by passing stool or gas",
  q3: "Alternating constipation and diarrhea",
  q4: "Diarrhea",
  q5: "Constipation",
  q6: "Hard, dry, or small stool",
  q7: "Coated tongue or 'fuzzy' debris on tongue",
  q8: "Pass large amount of foul-smelling gas",
  q9: "More than 3 bowel movements daily",
  q10: "Use laxatives frequently",
  // Category II: Upper Digestion - Stomach (q11-q16)
  q11: "Excessive belching, burping, or bloating",
  q12: "Gas immediately following a meal",
  q13: "Offensive breath",
  q14: "Difficult bowel movement",
  q15: "Sense of fullness during and after meals",
  q16: "Difficulty digesting fruits and vegetables; undigested food in stools",
  // Category III: Upper Digestion - HCL/Enzymes (q17-q23)
  q17: "Stomach pain, burning, or aching 1-4 hours after eating",
  q18: "Use antacids",
  q19: "Feel hungry an hour or two after eating",
  q20: "Heartburn when lying down or bending forward",
  q21: "Temporary relief by using antacids, food, milk, or carbonated beverages",
  q22: "Digestive problems subside with rest and relaxation",
  q23: "Heartburn due to spicy foods, chocolate, citrus, peppers, alcohol, and caffeine",
  // Category IV: Pancreas/Blood Sugar (q24-q31)
  q24: "Roughage and fiber cause constipation",
  q25: "Indigestion and fullness last 2-4 hours after eating",
  q26: "Pain, tenderness, soreness on left side under rib cage",
  q27: "Excessive passage of gas",
  q28: "Nausea and/or vomiting",
  q29: "Stool undigested, foul smelling, mucous-like, greasy, or poorly formed",
  q30: "Frequent urination",
  q31: "Increased thirst and appetite",
  // Category V: Liver/Gallbladder (q32-q42)
  q32: "Greasy or high-fat foods cause distress",
  q33: "Lower bowel gas and/or bloating several hours after eating",
  q34: "Bitter, metallic taste in mouth especially in the morning",
  q35: "Burpy, fishy taste after consuming fish oils",
  q36: "Difficulty losing weight",
  q37: "Unexplained itchy skin",
  q38: "Yellowish cast to eyes",
  q39: "Stool color alternates from clay colored to normal brown",
  q40: "Reddened skin, especially palms",
  q41: "Dry or flaky skin and/or hair",
  q42: "History of gallbladder attacks or stones",
  // Category VI: Hypoglycemia (q44-q52)
  q44: "Crave sweets during the day",
  q45: "Irritable if meals are missed",
  q46: "Depend on coffee to keep going/get started",
  q47: "Get light-headed if meals are missed",
  q48: "Eating relieves fatigue",
  q49: "Feel shaky, jittery, or have tremors",
  q50: "Agitated, easily upset, nervous",
  q51: "Poor memory/forgetful",
  q52: "Blurred vision",
  // Category VII: Insulin Resistance (q53-q60)
  q53: "Fatigue after meals",
  q54: "Crave sweets during the day",
  q55: "Eating sweets does not relieve craving for sugar",
  q56: "Must have sweets after meals",
  q57: "Waist girth equal to or larger than hip girth",
  q58: "Frequent urination",
  q59: "Increased appetite and thirst",
  q60: "Difficulty losing weight",
  // Category VIII: Adrenal - Hypo (q61-q68)
  q61: "Cannot stay asleep",
  q62: "Crave salt",
  q63: "Slow starter in the morning",
  q64: "Afternoon fatigue",
  q65: "Dizziness when standing up quickly",
  q66: "Afternoon headaches",
  q67: "Headaches with exertion or stress",
  q68: "Weak nails",
  // Category IX: Adrenal - Hyper (q69-q74)
  q69: "Cannot fall asleep",
  q70: "Perspire easily",
  q71: "Under high amounts of stress",
  q72: "Weight gain when under stress",
  q73: "Wake up tired even after 6 or more hours of sleep",
  q74: "Excessive perspiration or perspiration with little or no activity",
  // Category X: Thyroid - Hypo (q75-q86)
  q75: "Tired/sluggish",
  q76: "Feel cold, cold hands/feet/all over",
  q77: "Require excessive amounts of sleep to function properly",
  q78: "Increase in weight even with low-calorie diet",
  q79: "Gain weight easily",
  q80: "Difficult, infrequent bowel movements",
  q81: "Depression/lack of motivation",
  q82: "Morning headaches that wear off as the day progresses",
  q83: "Outer third of eyebrow thins",
  q84: "Thinning of hair on scalp, face, or genitals",
  q85: "Dryness of skin and/or scalp",
  q86: "Mental sluggishness",
  // Category XI: Thyroid - Hyper (q87-q93)
  q87: "Heart palpitations",
  q88: "Inward trembling",
  q89: "Increased pulse even at rest",
  q90: "Nervous and emotional",
  q91: "Insomnia",
  q92: "Night sweats",
  q93: "Difficulty gaining weight",
  // Category XII: Endocrine - General (q94-q99)
  q94: "Diminished sex drive",
  q95: "Increased facial hair (female)",
  q96: "Decreased facial hair (male)",
  q97: "Unexplained weight gain",
  q98: "Extreme fatigue",
  q99: "Changes in menstrual cycle (female)",
  // Category XIII: Cardiovascular (q100-q106)
  q100: "Aware of heavy and/or irregular breathing",
  q101: "Discomfort at high altitudes",
  q102: "Air hunger and/or frequent sighing",
  q103: "Compelled to open windows in closed room",
  q104: "Shortness of breath with moderate exertion",
  q105: "Ankles swell, especially at end of day",
  q106: "Muscle cramps with exercise",
  // Category XIV: Immune/Inflammation (q107-q115)
  q107: "Chronic pain or inflammation",
  q108: "React to foods or chemicals",
  q109: "Skin breakouts or skin conditions",
  q110: "Joint stiffness or swelling",
  q111: "Frequent colds or infections",
  q112: "Allergies or hay fever",
  q113: "Asthma or difficulty breathing",
  q114: "Autoimmune condition diagnosed",
  q115: "Family history of autoimmune conditions",
  // Male Hormones (q116-q123)
  q116: "Decreased libido",
  q117: "Decreased erections",
  q118: "Decreased mental sharpness",
  q119: "Decreased stamina",
  q120: "Decreased urine flow",
  q121: "Difficulty urinating or dribbling",
  q122: "Breast enlargement",
  q123: "Prostate problems",
  // Female Hormones (q124-q135)
  q124: "PMS",
  q125: "Mood swings during period",
  q126: "Breast tenderness",
  q127: "Bloating before period",
  q128: "Heavy menstrual flow",
  q129: "Painful periods",
  q130: "Hot flashes",
  q131: "Night sweats",
  q132: "Vaginal dryness",
  q133: "Decreased libido",
  q134: "Irregular periods",
  q135: "Depression/mood changes"
};

const FormUtils = {
  /**
   * Sanitize string values for JSON compatibility
   * Replaces double quotes with single quotes to prevent JSON parsing issues
   * @param {*} value - Value to sanitize
   * @returns {string} - Sanitized string
   */
  sanitizeString(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // Replace double quotes with single quotes (e.g., 6'2" becomes 6'2')
    // This prevents JSON parsing issues when n8n interpolates values
    return str.replace(/"/g, "'");
  },

  /**
   * Get sanitized value from data object
   * @param {object} data - Data object
   * @param {string} key - Key to get
   * @returns {string} - Sanitized value or empty string
   */
  getSanitized(data, key) {
    return this.sanitizeString(data[key] || '');
  },

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

    // Setup event listeners (skip for intakeWizard - it handles submission itself)
    if (webhookKey !== 'intakeWizard') {
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

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
   * @returns {Promise<{success: boolean, message?: string}>} Result of the submission
   */
  async handleSubmit(e) {
    e.preventDefault();

    // Validate form
    if (!this.validateForm()) {
      this.scrollToFirstError();
      return { success: false, message: 'Please fill out all required fields.' };
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

      // Create AbortController for timeout
      const controller = new AbortController();
      const FETCH_TIMEOUT_MS = 25000;
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      // Submit to webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Try to get error message from response body
        let errorMsg = `Submission failed (status ${response.status})`;
        try {
          const errorBody = await response.text();
          if (errorBody) {
            errorMsg = errorBody.substring(0, 200);
          }
        } catch (parseErr) {
          // Ignore parse errors, use status code message
        }
        throw new Error(errorMsg);
      }

      // Clear draft
      this.clearDraft();

      // Show success
      this.showSuccess();

      return { success: true };

    } catch (error) {
      console.error('Form submission error:', error);

      // Handle timeout specifically
      let errorMessage = error.message;
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please check your internet connection and try again.';
      }

      this.showError(errorMessage);
      return { success: false, message: errorMessage };
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

    // Process ALL checkboxes explicitly (don't rely on FormData which misses unchecked)
    // Use document.querySelectorAll to find checkboxes in ALL steps (including hidden ones)
    const allCheckboxes = document.querySelectorAll('#intake-wizard-form input[type="checkbox"]');
    const checkedCount = { total: 0, checked: 0 };

    allCheckboxes.forEach(cb => {
      if (cb.name) {
        checkedCount.total++;
        if (cb.checked) {
          checkedCount.checked++;
          rawData[cb.name] = true;
        } else {
          rawData[cb.name] = false;
        }
      }
    });

    console.log(`Checkbox collection: ${checkedCount.checked}/${checkedCount.total} checked`);

    // Log family history checkboxes specifically for debugging
    const familyCheckboxes = Array.from(allCheckboxes).filter(cb =>
      cb.name && (cb.name.includes('_mother') || cb.name.includes('_father') ||
                  cb.name.includes('_brother') || cb.name.includes('_sister'))
    );
    const familyChecked = familyCheckboxes.filter(cb => cb.checked);
    console.log(`Family history checkboxes: ${familyChecked.length}/${familyCheckboxes.length} checked`);
    if (familyChecked.length > 0) {
      console.log('Checked family conditions:', familyChecked.map(cb => cb.name).join(', '));
    }

    // Build structured payload based on form type
    const payload = this.buildStructuredPayload(rawData);

    return payload;
  },

  /**
   * Build a structured payload with clearly defined variables for GHL/n8n
   */
  buildStructuredPayload(rawData) {
    // Sanitize all string values in rawData to prevent JSON parsing issues
    // (e.g., 6'2" becomes 6'2' so quotes don't break JSON)
    const sanitizedRawData = {};
    for (const key in rawData) {
      const value = rawData[key];
      if (typeof value === 'string') {
        sanitizedRawData[key] = this.sanitizeString(value);
      } else {
        sanitizedRawData[key] = value;
      }
    }

    // For intakeWizard, filter out q1-q999 fields (already structured in metabolicAssessment)
    let filteredRawData = sanitizedRawData;
    if (this.webhookKey === 'intakeWizard') {
      filteredRawData = {};
      for (const key in sanitizedRawData) {
        // Skip q1, q2, ... q999 fields (metabolic questions)
        if (!/^q\d+$/.test(key)) {
          filteredRawData[key] = sanitizedRawData[key];
        }
      }
    }

    const payload = {
      _meta: {
        formType: this.webhookKey,
        formName: this.getFormDisplayName(),
        submittedAt: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        userAgent: navigator.userAgent
      },
      rawData: filteredRawData // Include raw data for flexibility
    };

    // Build form-specific structured data (using sanitized data)
    switch (this.webhookKey) {
      case 'newConsultation':
        this.buildConsultationPayload(payload, sanitizedRawData);
        break;
      case 'familyHistory':
        this.buildFamilyHistoryPayload(payload, sanitizedRawData);
        break;
      case 'metabolicAssessment':
        this.buildMetabolicPayload(payload, sanitizedRawData);
        break;
      case 'intakeWizard':
        this.buildIntakeWizardPayload(payload, sanitizedRawData);
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
      metabolicAssessment: 'Metabolic Assessment Form',
      intakeWizard: 'Complete Intake Wizard'
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
   * Build structured payload for Complete Intake Wizard
   * Combines consultation, family history, and metabolic assessment data
   */
  buildIntakeWizardPayload(payload, data) {
    // Contact information (core fields for GHL matching)
    payload.contact = {
      firstName: data.firstName || '',
      middleName: data.middleName || '',
      lastName: data.lastName || '',
      fullName: [data.firstName, data.middleName, data.lastName].filter(Boolean).join(' '),
      email: data.email || '',
      phone: data.phone || ''
    };

    // ===== CONSULTATION DATA =====
    payload.consultation = {};

    // Address
    payload.consultation.address = {
      street: data.street || '',
      city: data.city || '',
      state: data.state || '',
      zip: data.zip || '',
      fullAddress: [data.street, data.city, data.state, data.zip].filter(Boolean).join(', ')
    };

    // Demographics
    payload.consultation.demographics = {
      birthDate: data.birthDate || '',
      maritalStatus: data.maritalStatus || '',
      occupation: data.occupation || '',
      employer: data.employer || ''
    };

    // Physician
    payload.consultation.physician = {
      name: data.currentPhysician || '',
      city: data.physicianCity || ''
    };

    // Referral source
    payload.consultation.referredBy = data.referredBy || '';

    // Health complaints
    payload.consultation.complaints = {
      primary: data.complaint1 || '',
      secondary: data.complaint2 || '',
      tertiary: data.complaint3 || '',
      quaternary: data.complaint4 || '',
      allComplaints: [data.complaint1, data.complaint2, data.complaint3, data.complaint4].filter(Boolean),
      duration: data.problemDuration || '',
      other: data.otherComplaints || ''
    };

    // Physical stats
    payload.consultation.physicalStats = {
      height: data.height || '',
      weight: data.weight || ''
    };

    // Desired improvements
    payload.consultation.improvements = {
      digestion: data.improvement_digestion === true,
      sleep: data.improvement_sleep === true,
      wellbeing: data.improvement_wellbeing === true,
      energy: data.improvement_energy === true,
      list: []
    };
    if (payload.consultation.improvements.digestion) payload.consultation.improvements.list.push('Digestion');
    if (payload.consultation.improvements.sleep) payload.consultation.improvements.list.push('Sleep');
    if (payload.consultation.improvements.wellbeing) payload.consultation.improvements.list.push('Wellbeing');
    if (payload.consultation.improvements.energy) payload.consultation.improvements.list.push('Energy');

    // History and attempts
    payload.consultation.history = {
      triedNotWorked: data.triedNotWorked || '',
      discouraged: data.discouraged || '',
      worstFeeling: data.worstFeeling || '',
      bodyFunctions: data.bodyFunctions || ''
    };

    // Life impact
    payload.consultation.impact = {
      work: data.impact_work || '',
      family: data.impact_family || '',
      hobbies: data.impact_hobbies || '',
      life: data.impact_life || '',
      feelsOlder: data.feelsOlder || ''
    };

    // Visit purpose
    payload.consultation.visitPurpose = {
      type: data.visitPurpose || '',
      other: data.visitPurposeOther || ''
    };

    // Past care methods
    payload.consultation.pastCare = {
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
    if (payload.consultation.pastCare.medications) payload.consultation.pastCare.list.push('Medications');
    if (payload.consultation.pastCare.holistic) payload.consultation.pastCare.list.push('Holistic');
    if (payload.consultation.pastCare.routine) payload.consultation.pastCare.list.push('Routine Medical');
    if (payload.consultation.pastCare.vitamins) payload.consultation.pastCare.list.push('Vitamins');
    if (payload.consultation.pastCare.exercise) payload.consultation.pastCare.list.push('Exercise');
    if (payload.consultation.pastCare.chiropractic) payload.consultation.pastCare.list.push('Chiropractic');
    if (payload.consultation.pastCare.diet) payload.consultation.pastCare.list.push('Diet and Nutrition');
    if (payload.consultation.pastCare.other && payload.consultation.pastCare.otherText) {
      payload.consultation.pastCare.list.push(payload.consultation.pastCare.otherText);
    }

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

    payload.consultation.fears = {
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

    payload.consultation.positiveOutcomes = {
      improvements: betterList,
      improvementsText: betterList.join(', '),
      threeYearVision: data.threeYearVision || '',
      barriers: data.barriers || '',
      overcomingBarriers: data.overcomingBarriers || '',
      strengths: data.strengths || ''
    };

    // Commitment ratings
    payload.consultation.commitment = {
      importance: parseInt(data.importance) || 0,
      coachable: parseInt(data.coachable) || 0,
      prepared: parseInt(data.prepared) || 0,
      average: Math.round(((parseInt(data.importance) || 0) + (parseInt(data.coachable) || 0) + (parseInt(data.prepared) || 0)) / 3 * 10) / 10
    };

    // ===== FAMILY HISTORY DATA =====
    const familyMembers = ['mother', 'father', 'brother', 'sister', 'child1', 'child2', 'child3', 'child4', 'maGma', 'maGpa', 'paGma', 'paGpa', 'aunt', 'uncle'];
    const conditions = ['cancer', 'heartDisease', 'hypertension', 'obesity', 'diabetes', 'stroke', 'autoimmune', 'arthritis', 'kidneyDisease', 'thyroid', 'seizures', 'psychiatric', 'anxiety', 'depression', 'asthma', 'allergies', 'eczema', 'adhd', 'autism', 'ibs', 'dementia', 'substanceAbuse', 'genetic', 'celiac'];

    payload.familyHistory = {
      familyMembers: {},
      otherConditions: [],
      conditionSummary: {}
    };

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

      payload.familyHistory.familyMembers[member] = memberData;
    });

    // Other custom conditions
    for (let i = 1; i <= 3; i++) {
      const conditionName = data[`other${i}_name`];
      if (conditionName) {
        const affectedMembers = [];
        familyMembers.forEach(member => {
          if (data[`other${i}_${member}`] === true) {
            affectedMembers.push(this.getMemberDisplayName(member));
          }
        });
        payload.familyHistory.otherConditions.push({
          name: conditionName,
          affectedMembers: affectedMembers,
          affectedMembersText: affectedMembers.join(', ')
        });
      }
    }

    // Summary by condition
    conditions.forEach(condition => {
      const affected = [];
      familyMembers.forEach(member => {
        if (data[`${condition}_${member}`] === true) {
          affected.push(this.getMemberDisplayName(member));
        }
      });
      if (affected.length > 0) {
        payload.familyHistory.conditionSummary[condition] = {
          displayName: this.getConditionDisplayName(condition),
          affectedMembers: affected,
          affectedMembersText: affected.join(', '),
          count: affected.length
        };
      }
    });

    // ===== METABOLIC ASSESSMENT DATA =====
    payload.metabolicAssessment = {
      patient: {
        age: parseInt(data.age) || null,
        sex: data.sex || ''
      },
      categories: {},
      genderSpecific: {
        sex: data.sex || '',
        responses: {}
      }
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

    let grandTotal = 0;

    categories.forEach(cat => {
      const catData = {
        name: cat.name,
        responses: {},
        subtotal: 0
      };

      for (let q = cat.questions[0]; q <= cat.questions[1]; q++) {
        const value = parseInt(data[`q${q}`]) || 0;
        catData.responses[`q${q}`] = {
          text: METABOLIC_QUESTIONS[`q${q}`] || `Question ${q}`,
          score: value
        };
        catData.subtotal += value;
      }

      grandTotal += catData.subtotal;
      payload.metabolicAssessment.categories[cat.id] = catData;
    });

    // Gender-specific sections
    if (data.sex === 'male') {
      const maleQuestions = [116, 117, 118, 119, 120, 121, 122, 123];
      let maleSubtotal = 0;
      maleQuestions.forEach(q => {
        const value = parseInt(data[`q${q}`]) || 0;
        payload.metabolicAssessment.genderSpecific.responses[`q${q}`] = {
          text: METABOLIC_QUESTIONS[`q${q}`] || `Question ${q}`,
          score: value
        };
        maleSubtotal += value;
      });
      payload.metabolicAssessment.genderSpecific.subtotal = maleSubtotal;
      payload.metabolicAssessment.genderSpecific.categoryName = 'Male Hormones';
      grandTotal += maleSubtotal;
    }

    if (data.sex === 'female') {
      const femaleQuestions = [124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135];
      let femaleSubtotal = 0;
      femaleQuestions.forEach(q => {
        const value = parseInt(data[`q${q}`]) || 0;
        payload.metabolicAssessment.genderSpecific.responses[`q${q}`] = {
          text: METABOLIC_QUESTIONS[`q${q}`] || `Question ${q}`,
          score: value
        };
        femaleSubtotal += value;
      });
      payload.metabolicAssessment.genderSpecific.subtotal = femaleSubtotal;
      payload.metabolicAssessment.genderSpecific.categoryName = 'Female Hormones';
      grandTotal += femaleSubtotal;
    }

    // Gallbladder removed
    payload.metabolicAssessment.gallbladderRemoved = data.gallbladder_removed === 'yes';

    // Grand total and interpretation
    payload.metabolicAssessment.grandTotal = grandTotal;
    payload.metabolicAssessment.scoreInterpretation = this.interpretMetabolicScore(grandTotal);

    // Category rankings (highest to lowest concern)
    const categoryRankings = Object.entries(payload.metabolicAssessment.categories)
      .map(([id, cat]) => ({ id, name: cat.name, subtotal: cat.subtotal }))
      .sort((a, b) => b.subtotal - a.subtotal);

    payload.metabolicAssessment.categoryRankings = categoryRankings;
    payload.metabolicAssessment.topConcerns = categoryRankings.slice(0, 3).map(c => c.name);

    // ===== LIFESTYLE & MEDICATIONS (Step 8) =====
    payload.lifestyle = {
      alcoholPerWeek: parseInt(data.alcohol_per_week) || 0,
      caffeinePerDay: parseInt(data.caffeine_per_day) || 0,
      eatOutPerWeek: parseInt(data.eat_out_per_week) || 0,
      workoutPerWeek: parseInt(data.workout_per_week) || 0,
      smokes: data.smoke === 'yes',
      stressLevel: parseInt(data.stress_level) || 5,
      worstFoods: [data.worst_food_1, data.worst_food_2, data.worst_food_3].filter(Boolean),
      healthiestFoods: [data.healthy_food_1, data.healthy_food_2, data.healthy_food_3].filter(Boolean)
    };

    payload.medications = {
      current: data.medications || '',
      supplements: data.supplements || ''
    };

    // ===== WIZARD METADATA =====
    payload._meta.completedSteps = [1, 2, 3, 4, 5, 6, 7, 8];
    payload._meta.totalTimeMinutes = parseInt(data._wizardDuration) || 0;

    // ===== PDF ATTACHMENT =====
    // Pick up the PDF generated by wizard.js (stored in window._intakeWizardPDF)
    if (window._intakeWizardPDF) {
      payload.pdfAttachment = {
        filename: `intake-form-${data.lastName || 'patient'}-${new Date().toISOString().split('T')[0]}.pdf`,
        mimeType: 'application/pdf',
        base64Data: window._intakeWizardPDF
      };
      // Clear after use
      delete window._intakeWizardPDF;
    }
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
    // Hide any wizard loading overlay
    if (window.IntakeWizard && typeof IntakeWizard.hideLoadingOverlay === 'function') {
      IntakeWizard.hideLoadingOverlay();
    }

    // Hide form and any wizard UI elements
    this.form.style.display = 'none';

    // Hide wizard-specific elements (progress bar, etc.)
    const wizardElements = document.querySelectorAll('.wizard-progress, .wizard-mobile-progress');
    wizardElements.forEach(el => el.style.display = 'none');

    // Show success screen
    const successHtml = `
      <div class="success-screen" style="text-align: center; padding: 60px 20px;">
        <div class="success-icon" style="width: 80px; height: 80px; margin: 0 auto 30px; background: #1a9ba0; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" width="40" height="40">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 style="font-family: 'Marcellus', serif; font-size: 32px; color: #1a9ba0; margin-bottom: 15px;">Thank You!</h2>
        <p style="font-size: 18px; color: #333; margin-bottom: 10px;">Your intake form has been submitted successfully.</p>
        <p style="font-size: 16px; color: #666;">The Healthplex team will review your information and be in touch soon.</p>
      </div>
    `;

    const successDiv = document.createElement('div');
    successDiv.className = 'form-card';
    successDiv.style.cssText = 'max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);';
    successDiv.innerHTML = successHtml;
    this.form.parentNode.appendChild(successDiv);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /**
   * Show error message
   */
  showError(message) {
    // Hide any wizard loading overlay
    if (window.IntakeWizard && typeof IntakeWizard.hideLoadingOverlay === 'function') {
      IntakeWizard.hideLoadingOverlay();
    }

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
