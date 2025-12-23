/**
 * Healthplex Forms Configuration
 * Update these values with your actual webhook URLs and settings
 */
const CONFIG = {
  // n8n Webhook URLs - Replace with your actual endpoints
  webhooks: {
    newConsultation: 'https://your-n8n-instance.com/webhook/new-consultation',
    familyHistory: 'https://your-n8n-instance.com/webhook/family-history',
    metabolicAssessment: 'https://your-n8n-instance.com/webhook/metabolic-assessment'
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
