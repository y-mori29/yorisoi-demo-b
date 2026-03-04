const { db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

// Create Patient
exports.createPatient = async (req, res) => {
    try {
        const { name, kana, dob, gender, facilityId, roomNumber } = req.body;

        // Basic validation
        if (!name || !facilityId) {
            return res.status(400).json({ error: 'Name and Facility ID are required' });
        }

        const patientId = uuidv4();
        const newPatient = {
            id: patientId,
            name,
            kana: kana || '',
            dob: dob || null,
            gender: gender || 'unknown',
            facilityId,
            roomNumber: roomNumber || '',
            status: 'incomplete', // default status for care workflow
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Save to Firestore (Root collection 'patients' with facilityId field, OR subcollection)
        // Dashboard uses filtering by facilityId, so storing in root 'patients' is easiest for querying.
        // We will index facilityId.
        await db.collection('patients').doc(patientId).set(newPatient);

        res.status(201).json({ patientId, ...newPatient });
    } catch (error) {
        console.error("Create Patient Error:", error);
        res.status(500).json({ error: error.message });
    }
};

// List Patients (by Facility)
exports.listPatients = async (req, res) => {
    try {
        const { facilityId } = req.query; // req.query is correct for GET parameters
        const targetFacilityId = facilityId;

        // 1. Fetch Patients
        let query = db.collection('patients');
        if (targetFacilityId) {
            query = query.where('facilityId', '==', targetFacilityId);
        }
        const patSnapshot = await query.get();
        let patients = patSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Filter out patients belonging to hidden facilities (for demo environments)
        const hiddenKeywordsStr = process.env.HIDDEN_FACILITY_KEYWORDS || '';
        if (hiddenKeywordsStr) {
            const hiddenKeywords = hiddenKeywordsStr.split(',').map(k => k.trim()).filter(k => k.length > 0);
            if (hiddenKeywords.length > 0) {
                const facSnapshot = await db.collection('facilities').get();
                const hiddenFacilityIds = new Set();
                facSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (hiddenKeywords.some(keyword => data.name && data.name.includes(keyword))) {
                        hiddenFacilityIds.add(doc.id);
                    }
                });
                patients = patients.filter(p => !hiddenFacilityIds.has(p.facilityId));
            }
        }

        // 2. Fetch Occupancies & Rooms (Global or Scoped)
        try {
            let occSnapshot, roomSnapshot;

            if (targetFacilityId) {
                occSnapshot = await db.collection(`facilities/${targetFacilityId}/occupancies`).get();
                roomSnapshot = await db.collection(`facilities/${targetFacilityId}/rooms`).get();
            } else {
                // If no facility filter, we need ALL room info. 
                // Using collectionGroup is the best way for MVP.
                occSnapshot = await db.collectionGroup('occupancies').get();
                roomSnapshot = await db.collectionGroup('rooms').get();
            }

            const occupancies = [];
            occSnapshot.forEach(doc => occupancies.push(doc.data()));

            const patientRoomMap = {};
            occupancies.forEach(occ => {
                if (occ.patientId && occ.roomId) {
                    patientRoomMap[occ.patientId] = occ.roomId;
                }
            });

            const roomNameMap = {};
            roomSnapshot.forEach(doc => {
                const data = doc.data();
                roomNameMap[doc.id] = data.name || data.roomNumber || '';
            });

            // Merge Room Info
            patients.forEach(p => {
                const rId = patientRoomMap[p.id];
                if (rId) {
                    p.roomNumber = roomNameMap[rId] || '';
                    p.roomId = rId;
                } else {
                    p.roomNumber = '';
                }
            });
        } catch (err) {
            console.warn("Failed to fetch auxiliary/occupancy data", err);
        }

        // 5. Fetch Encounters (Records) & Map to ClinicalData
        await Promise.all(patients.map(async (p) => {
            try {
                const encSnap = await db.collection(`patients/${p.id}/encounters`).get();

                let records = [];
                encSnap.forEach(doc => {
                    const data = doc.data();

                    // Construct ClinicalData from AI results
                    // Fallback to empty structures if AI didn't return them
                    const clinicalData = {
                        soap: data.soap || { s: '', o: '', a: '', p: '' },
                        home_visit: data.home_visit || {
                            basic_info: '', chief_complaint: '', observation_treatment: '',
                            medication_instruction: '', next_plan_handover: ''
                        },
                        pharmacy_focus: data.pharmacy_focus || {
                            medications: [], adherence: '', side_effects: [],
                            drug_related_problems: [], labs_and_monitoring: [],
                            patient_education: [], follow_up: ''
                        },
                        alerts: data.alerts || { red_flags: [], need_to_contact_physician: [] },
                        meta: data.meta || { main_problems: [], note_for_pharmacy: '' },
                        family_share: data.family_share || { rephrased_content: data.summaries?.medical || '' },
                        summary: data.summaries?.internal || '',
                        report_100: data.summaries?.medical || ''
                    };

                    records.push({
                        id: doc.id,
                        date: data.date || data.createdAt,
                        transcript: data.transcript || '',
                        clinicalData: clinicalData,
                        source: data.source || 'RECORDING',
                        data: data.data || null,
                        recordedByName: data.recordedByName || null,
                        recordedById: data.recordedById || null,
                        status: 'pending' // Default
                    });
                });

                // インメモリで日付降順にソート
                records.sort((a, b) => {
                    const dateA = a.date || '';
                    const dateB = b.date || '';
                    return dateB.localeCompare(dateA);
                });

                p.records = records;
            } catch (e) {
                console.warn(`Failed to fetch encounters for ${p.id}`, e);
                p.records = [];
            }
        }));

        res.json({ ok: true, patients });
    } catch (error) {
        console.error("List Patients Error:", error);
        res.status(500).json({ error: error.message });
    }
};

// Get Single Patient
exports.getPatient = async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await db.collection('patients').doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        res.json(doc.data());
    } catch (error) {
        console.error("Get Patient Error:", error);
        res.status(500).json({ error: error.message });
    }
};

// Delete Patient
exports.deletePatient = async (req, res) => {
    try {
        const { id } = req.params;
        // Ideally should delete sub-resources (records, stays, etc.)
        // or check for dependencies. MVP: Just delete the patient doc.
        await db.collection('patients').doc(id).delete();
        res.json({ success: true });
    } catch (error) {
        console.error("Delete Patient Error:", error);
        res.status(500).json({ error: error.message });
    }
};

// Delete Record (Encounter)
exports.deleteRecord = async (req, res) => {
    try {
        const { patientId, recordId } = req.params;
        await db.collection('patients').doc(patientId).collection('encounters').doc(recordId).delete();
        // Also try to find a recording with this encounterId and delete/unlink it? 
        // For now, just deleting the encounter removes it from the Dashboard view.
        res.json({ success: true });
    } catch (error) {
        console.error("Delete Record Error:", error);
        res.status(500).json({ error: error.message });
    }
};

// Update Record (Encounter)
exports.updateRecord = async (req, res) => {
    try {
        const { patientId, recordId } = req.params;
        const updates = req.body; // Expecting clinicalData fields or partial updates

        // Ensure we don't overwrite crucial immutable fields unless intended
        // For security, maybe whitelist fields, but for internal tool, trust payload for now.
        // We typically update 'data' (legacy) or 'soap', 'report_100', etc.

        // If the payload is the clinicalData structure directly:
        const encounterRef = db.collection('patients').doc(patientId).collection('encounters').doc(recordId);

        // Add updatedAt
        updates.updatedAt = new Date().toISOString();

        await encounterRef.set(updates, { merge: true });
        res.json({ success: true });
    } catch (error) {
        console.error("Update Record Error:", error);
        res.status(500).json({ error: error.message });
    }
};

// --- Patient Knowledge Methods ---

// Add Knowledge to Patient
exports.addPatientKnowledge = async (req, res) => {
    try {
        const { id } = req.params;
        const { content, category } = req.body; // content: string, category: string (optional)

        if (!content) return res.status(400).json({ error: 'Content is required' });

        const knowledgeRef = db.collection('patients').doc(id).collection('knowledge').doc();
        const newKnowledge = {
            id: knowledgeRef.id,
            content,
            category: category || 'memo',
            createdAt: new Date().toISOString()
        };
        await knowledgeRef.set(newKnowledge);
        res.json(newKnowledge);
    } catch (error) {
        console.error("Add Patient Knowledge Error:", error);
        res.status(500).json({ error: error.message });
    }
};

// Get Patient Knowledge List
exports.getPatientKnowledge = async (req, res) => {
    try {
        const { id } = req.params;
        const snapshot = await db.collection('patients').doc(id).collection('knowledge').orderBy('createdAt', 'desc').get();
        const list = snapshot.docs.map(doc => doc.data());
        res.json({ list });
    } catch (error) {
        console.error("Get Patient Knowledge Error:", error);
        res.status(500).json({ error: error.message });
    }
};

// Delete Patient Knowledge
exports.deletePatientKnowledge = async (req, res) => {
    try {
        const { id, knowledgeId } = req.params;
        await db.collection('patients').doc(id).collection('knowledge').doc(knowledgeId).delete();
        res.json({ success: true });
    } catch (error) {
        console.error("Delete Patient Knowledge Error:", error);
        res.status(500).json({ error: error.message });
    }
};
