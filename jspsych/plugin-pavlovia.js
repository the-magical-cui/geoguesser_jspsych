// Pavlovia plugin stub — only used when running on Pavlovia.
// For local testing this plugin is never executed (experiment.js detects localhost and skips it).
var jsPsychPavlovia = (function () {
  class PavloviaPlugin {
    constructor(jsPsych) { this.jsPsych = jsPsych; }
    trial(display_element, trial) {
      console.warn('[pavlovia stub] command:', trial.command, '— skipped (local run)');
      this.jsPsych.finishTrial({});
    }
  }
  PavloviaPlugin.info = { name: 'pavlovia', parameters: { command: { type: 'STRING', default: 'init' } } };
  return PavloviaPlugin;
}());
