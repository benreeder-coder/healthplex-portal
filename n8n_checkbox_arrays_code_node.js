/**
 * n8n Code Node: Checkbox Arrays Preprocessor
 *
 * PURPOSE: Convert boolean checkbox fields to GHL-compatible arrays
 * PLACEMENT: Insert between Webhook and HTTP Request nodes
 *
 * This Code node solves the issue where n8n HTTP Request body doesn't support
 * complex IIFE (Immediately Invoked Function Expression) patterns like:
 *   {{ JSON.stringify((() => { ... })()) }}
 */

const d = $input.first().json.body.rawData;

// Build checkbox arrays from boolean fields
const checkboxArrays = {
  // Visit Purpose (radio -> array)
  are_you_here_visiting_us_to: (() => {
    const v = d.visitPurpose;
    if (v === 'resolve') return ['Resolve my immediate problem'];
    if (v === 'lifestyle') return ['Lifestyle program for optimized living'];
    if (v === 'both') return ['Both'];
    return [];
  })(),

  // Past Care Methods
  how_have_you_taken_care_of_your_health_in_the_past: [
    d.pastCare_medications && 'Medications',
    d.pastCare_holistic && 'Holistic',
    d.pastCare_routine && 'Routine medical',
    d.pastCare_vitamins && 'Vitamins',
    d.pastCare_exercise && 'Exercise',
    d.pastCare_chiropractic && 'Chiropractic',
    d.pastCare_diet && 'Diet and Nutrition'
  ].filter(Boolean),

  // Life Fears
  what_are_you_afraid_this_might_be_or_will_be_affecting_without_change: [
    d.fear_job && 'Job',
    d.fear_kids && 'Kids',
    d.fear_marriage && 'Marriage',
    d.fear_sleep && 'Sleep',
    d.fear_freedom && 'Freedom',
    d.fear_abilities && 'Future abilities',
    d.fear_finances && 'Finances',
    d.fear_time && 'Time'
  ].filter(Boolean),

  // Feared Conditions
  are_there_any_health_conditions_you_are_afraid_this_might_turn_into: [
    d.fearCondition_abilities && 'Diminished future abilities',
    d.fearCondition_surgery && 'Surgery',
    d.fearCondition_stress && 'Stress',
    d.fearCondition_arthritis && 'Arthritis',
    d.fearCondition_weight && 'Weight gain',
    d.fearCondition_cancer && 'Cancer',
    d.fearCondition_heart && 'Heart disease',
    d.fearCondition_diabetes && 'Diabetes',
    d.fearCondition_depression && 'Depression',
    d.fearCondition_other && 'Other not listed'
  ].filter(Boolean),

  // Life Improvements
  what_would_be_different_or_better_without_this_problem: [
    d.better_stress && 'Diminished stress',
    d.better_sleep && 'Sleep',
    d.better_energy && 'More energy',
    d.better_work && 'Work',
    d.better_esteem && 'Self-esteem',
    d.better_outlook && 'Outlook',
    d.better_confidence && 'Confidence',
    d.better_family && 'Family'
  ].filter(Boolean)
};

return {
  json: {
    ...$input.first().json,
    checkboxArrays
  }
};
