const { db } = require('../config/firebase');

// Create Encounter (Start of Visit/Record)
exports.createEncounter = async (req, res) => {
    try {
        const { patientId, facilityId, roomId, stayId, source, data } = req.body;

        if (!patientId || !facilityId) {
            return res.status(400).json({ error: 'patientId and facilityId are required' });
        }

        const newEncounter = {
            patientId,
            facilityId,
            roomId: roomId || null,
            stayId: stayId || null,
            source: source || 'MOBILE_RECORDING',
            data: data || null,
            status: 'OPEN', // OPEN, PROCESSING, COMPLETED
            createdAt: new Date().toISOString()
        };

        // Store in root collection or subcollection?
        // Instruction 5-1: POST /api/encounters -> { encounterId: ... }
        // Instruction 3: "patients/{patientId}/encounters/{encounterId}"
        // So we should add to subcollection.

        const docRef = await db.collection(`patients/${patientId}/encounters`).add(newEncounter);

        res.status(201).json({ encounterId: docRef.id, patientId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// List Encounters (Timeline)
exports.listEncounters = async (req, res) => {
    try {
        const { patientId } = req.query;
        if (!patientId) return res.status(400).json({ error: 'patientId required' });

        // date または createdAt のいずれかが存在することを前提とするが、
        // インデックスエラーを避けるため、一旦ソートなしで取得してからJavaScript側でソートする
        const snapshot = await db.collection(`patients/${patientId}/encounters`)
            .get();

        const encounters = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 日付順にソート（date -> createdAt の優先順）
        encounters.sort((a, b) => {
            const dateA = a.date || a.createdAt || '';
            const dateB = b.date || b.createdAt || '';
            return dateB.localeCompare(dateA);
        });

        res.json({ ok: true, encounters: encounters.slice(0, 20) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
