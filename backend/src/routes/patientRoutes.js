const express = require('express');
const router = express.Router();
const controller = require('../controllers/patientController');

// Note: In index.js we mount this at /api/patients
router.post('/', controller.createPatient);
router.get('/', controller.listPatients);
router.get('/:id', controller.getPatient);
router.delete('/:id', controller.deletePatient);

// Records
router.delete('/:patientId/records/:recordId', controller.deleteRecord);
router.put('/:patientId/records/:recordId', controller.updateRecord); // [NEW]

// Patient-Specific Knowledge
router.post('/:id/knowledge', controller.addPatientKnowledge);   // [NEW]
router.get('/:id/knowledge', controller.getPatientKnowledge);    // [NEW]
router.delete('/:id/knowledge/:knowledgeId', controller.deletePatientKnowledge); // [NEW]

module.exports = router;
