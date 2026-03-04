const express = require('express');
const router = express.Router();

// Placeholder for feature routes
const facilityRoutes = require('./facilityRoutes');
const patientRoutes = require('./patientRoutes');
const recordingRoutes = require('./recordingRoutes');
const adminRoutes = require('./adminRoutes');
const authRoutes = require('./authRoutes');
const ocrRoutes = require('./ocrRoutes');

router.use('/facilities', facilityRoutes);
router.use('/patients', patientRoutes);
router.use('/admin', adminRoutes);
router.use('/auth', authRoutes);
router.use('/ocr', ocrRoutes);
router.use('/api', recordingRoutes); // /api/encounters, /api/recordings:signUpload
// Note the mounting path - index.js mounts this router at /api . 
// so routes inside recordingRoutes should be relative. 
// However, the file exports logic at /encounters. 
// To keep it clean, let's mount at root level of /api 
router.use('/', recordingRoutes);

router.get('/test', (req, res) => {
    res.json({ message: 'API is working' });
});

module.exports = router;
