const { bucket } = require('../config/gcs');
const { db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

// Sign Upload URL
// Sign Upload URL (Chunk Support)
exports.signUpload = async (req, res) => {
    try {
        const { recordingId, seq, contentType, patientId, facilityId, recordedById, recordedByName, recordedByRole } = req.body;

        // If recordingId is not provided, generate new (First chunk)
        const currentRecordingId = recordingId || uuidv4();
        const sequence = seq || 1;

        // Handle raw PCM or other types
        let extension = 'webm';
        if (contentType === 'application/octet-stream') {
            extension = 'raw';
        } else if (contentType) {
            extension = contentType.split('/')[1] || 'webm';
        }

        // Chunk path: sessions/{currentRecordingId}/chunk-{seq}.ext
        // We use a folder per recording session for chunks to easily list/compose them later
        const gcsPath = `sessions/${currentRecordingId}/chunk-${String(sequence).padStart(5, '0')}.${extension}`;
        const file = bucket.file(gcsPath);

        const [signedUrl] = await file.getSignedUrl({
            version: 'v4',
            action: 'write',
            expires: Date.now() + 15 * 60 * 1000,
            contentType: contentType || 'application/octet-stream', // Mobile often sends binary
        });

        // Save metadata (Upsert)
        // We only need to ensure the document exists. 
        // We store 'status' as 'UPLOADING'.
        const docRef = db.collection('recordings').doc(currentRecordingId);

        // If it's the first chunk (or we decide to sync metadata every time), update info.
        // Using set with merge: true is safe.
        const updateData = {
            recordingId: currentRecordingId,
            status: 'UPLOADING',
            lastChunkSeq: sequence,
            updatedAt: new Date().toISOString()
        };

        if (patientId) updateData.patientId = patientId;
        if (facilityId) updateData.facilityId = facilityId;
        if (recordedById) updateData.recordedById = recordedById;
        if (recordedByName) updateData.recordedByName = recordedByName;
        if (recordedByRole) updateData.recordedByRole = recordedByRole;
        if (!recordingId) {
            updateData.createdAt = new Date().toISOString();
        }

        await docRef.set(updateData, { merge: true });

        res.json({
            recordingId: currentRecordingId, // Client needs this for subsequent chunks
            uploadUrl: signedUrl,
            gcsPath: `gs://${bucket.name}/${gcsPath}`,
            seq: sequence
        });

    } catch (error) {
        console.error('SignUpload error:', error);
        res.status(500).json({ error: error.message });
    }
};
