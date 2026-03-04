const express = require('express');
const router = express.Router();
const encounterController = require('../controllers/encounterController');
const recordingController = require('../controllers/recordingController');
const processingController = require('../controllers/processingController');

// Encounters
router.post('/encounters', encounterController.createEncounter);
router.get('/encounters', encounterController.listEncounters);

// Recordings
router.post('/recordings/sign-upload', recordingController.signUpload);
router.post('/recordings/summarize', processingController.summarizeContent);
router.post('/recordings/analyze-text', processingController.analyzeText); // FIXED: Avoiding colon ambiguity
router.post('/recordings/:recordingId/finalize', processingController.finalizeRecording);

module.exports = router;
