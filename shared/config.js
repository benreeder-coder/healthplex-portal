/**
 * Healthplex Forms Configuration
 * Update these values with your actual webhook URLs and settings
 */
const CONFIG = {
  // n8n Webhook URLs
  webhooks: {
    newConsultation: 'https://breeder80.app.n8n.cloud/webhook/new-consult',
    familyHistory: 'https://breeder80.app.n8n.cloud/webhook/fam-hist',
    metabolicAssessment: 'https://breeder80.app.n8n.cloud/webhook/metabolic-assessment',
    intakeWizard: 'https://breeder80.app.n8n.cloud/webhook/intake-wizard'
  },

  // Authentication Settings
  requireAuth: false,  // Set to true to require login before form access

  // Supabase Config (only needed if requireAuth is true)
  supabase: {
    url: '',           // Your Supabase project URL
    anonKey: ''        // Your Supabase anon/public key
  },

  // Form Settings
  settings: {
    enableDraftSaving: true,      // Save form progress to localStorage
    draftSaveInterval: 30000,     // Auto-save draft every 30 seconds
    showProgressIndicator: true,  // Show progress bar on multi-section forms
    submitButtonText: 'Submit Form',
    submittingText: 'Submitting...'
  }
};

// Make config available globally
window.HEALTHPLEX_CONFIG = CONFIG;
