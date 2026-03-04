const { db } = require('../config/firebase');

// Utility to get collection refs
const getRefs = (facilityId) => ({
    rooms: db.collection(`facilities/${facilityId}/rooms`),
    stays: db.collection(`facilities/${facilityId}/stays`),
    occupancies: db.collection(`facilities/${facilityId}/occupancies`),
});

// Create Facility
exports.createFacility = async (req, res) => {
    try {
        const { name, address, note } = req.body;
        const docRef = await db.collection('facilities').add({
            name, address, note,
            sortIndex: 0,
            createdAt: new Date().toISOString()
        });
        res.status(201).json({ facilityId: docRef.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Bulk Upsert Rooms
exports.bulkUpsertRooms = async (req, res) => {
    try {
        const { facilityId } = req.params;
        const { rooms } = req.body;
        if (!rooms || !Array.isArray(rooms)) return res.status(400).json({ error: 'rooms array required' });

        const batch = db.batch();
        const roomsColl = db.collection(`facilities/${facilityId}/rooms`);
        const resultRooms = [];

        rooms.forEach((roomData, index) => {
            // Ideally verify change but for now simple overwrite/add
            const docRef = roomsColl.doc(); // Always new ID for bulk import? Or update existing?
            // Let's assume re-import clears old or updates matched by roomNumber
            // Simplification: Just add new ones (User should clear first if needed or use specific update logic)
            // Better: Use roomNumber as ID? No, instruction says roomNumber is string.
            // We'll just create new docs for this MVP.
            const payload = {
                ...roomData,
                sortIndex: index,
                updatedAt: new Date().toISOString()
            };
            batch.set(docRef, payload);
            resultRooms.push({ roomId: docRef.id, ...payload });
        });

        await batch.commit();
        res.json({ rooms: resultRooms });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create Stay (and Occupancy)
exports.createStay = async (req, res) => {
    try {
        const { facilityId } = req.params;
        const { patient, type, startAt, endAt, initialLane, existingPatientId } = req.body; // Added existingPatientId

        let patientId = existingPatientId;

        // 1. Create Patient if not existing
        if (!patientId) {
            const patRef = await db.collection('patients').add({
                name: patient.displayName,
                kana: patient.kana || '',
                dob: patient.dob || null,
                gender: patient.gender || 'unknown',
                facilityId,
                createdAt: new Date().toISOString()
            });
            patientId = patRef.id;
        } else {
            // If existing, maybe update facilityId? 
            // For home visit, patients might belong to a "Home Care" generic group or the facility. 
            // Let's update facilityId to current one so they show up in queries filtered by facility if needed.
            // But be careful if history is needed. For now, simple update.
            await db.collection('patients').doc(patientId).update({
                facilityId,
                updatedAt: new Date().toISOString()
            });
        }

        // 2. Create Stay
        const { stays, occupancies } = getRefs(facilityId);

        // Check if active stay exists? (skip for MVP)

        const stayRef = await stays.add({
            patientId,
            type: type || 'LONG', // LONG or SHORT
            status: 'ACTIVE',
            startAt: startAt || new Date().toISOString(),
            endAt: endAt || null,
            createdAt: new Date().toISOString()
        });

        // 3. Create Occupancy
        const lane = initialLane || 'UNASSIGNED';
        await occupancies.doc(patientId).set({
            patientId,
            stayId: stayRef.id,
            roomId: null,
            lane: lane,
            state: lane === 'UNASSIGNED' ? 'UNASSIGNED' : 'IN_ROOM', // Simplified state
            updatedAt: new Date().toISOString()
        });

        res.json({
            patientId,
            stayId: stayRef.id,
            occupancy: {
                patientId, stayId: stayRef.id, roomId: null, lane, state: lane
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Pause Stay
exports.pauseStay = async (req, res) => {
    try {
        const { facilityId, stayId } = req.params;
        const { reason, note } = req.body;
        const { stays, occupancies } = getRefs(facilityId);

        // Update Stay
        await stays.doc(stayId).update({
            status: 'PAUSED',
            pauseReason: reason,
            note,
            updatedAt: new Date().toISOString()
        });

        // Find Occupancy for this stay? Or by PatientId?
        // The Stay doc has patientId.
        const stayDoc = await stays.doc(stayId).get();
        if (!stayDoc.exists) return res.status(404).json({ error: 'Stay not found' });
        const { patientId } = stayDoc.data();

        // Update Occupancy
        await occupancies.doc(patientId).update({
            lane: 'AWAY_HOSPITAL', // Or generic AWAY
            state: 'AWAY_HOSPITAL',
            roomId: null,
            updatedAt: new Date().toISOString()
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Resume Stay
exports.resumeStay = async (req, res) => {
    try {
        const { facilityId, stayId } = req.params;
        const { stays, occupancies } = getRefs(facilityId);

        await stays.doc(stayId).update({ status: 'ACTIVE', updatedAt: new Date().toISOString() });

        const stayDoc = await stays.doc(stayId).get();
        const { patientId } = stayDoc.data();

        await occupancies.doc(patientId).update({
            lane: 'UNASSIGNED',
            state: 'UNASSIGNED',
            roomId: null,
            updatedAt: new Date().toISOString()
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Move Occupancy (Drag & Drop)
exports.moveOccupancy = async (req, res) => {
    try {
        const { facilityId } = req.params;
        const { patientId, to, note } = req.body; // to: { kind: 'ROOM'|'UNASSIGNED'|'AWAY...', roomId: ... }
        const { occupancies } = getRefs(facilityId);

        const updatePayload = {
            updatedAt: new Date().toISOString()
        };

        if (to.kind === 'ROOM') {
            updatePayload.lane = 'ROOM'; // Or use roomId?
            updatePayload.state = 'IN_ROOM';
            updatePayload.roomId = to.roomId;
        } else if (to.kind === 'UNASSIGNED') {
            updatePayload.lane = 'UNASSIGNED';
            updatePayload.state = 'UNASSIGNED';
            updatePayload.roomId = null;
        } else if (to.kind === 'AWAY_HOSPITAL') {
            updatePayload.lane = 'AWAY_HOSPITAL';
            updatePayload.state = 'AWAY_HOSPITAL';
            updatePayload.roomId = null;
            // We might also want to Pause the Stay? 
            // Instruction 4-7 says "Treat as hospitalized operation". 
            // For MVP, just updating occupancy is fine, but cleaner to pause stay too.
            // Let's stick to simple occupancy update for DragDrop, explicit Pause for full logic if needed.
        }

        await occupancies.doc(patientId).update(updatePayload);

        const doc = await occupancies.doc(patientId).get();
        res.json({ ok: true, occupancy: { patientId, ...doc.data() } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Board Data
exports.getBoard = async (req, res) => {
    try {
        const { facilityId } = req.params;

        // 1. Fetch Collections
        const [facSnap, roomsSnap, occSnap, staysSnap] = await Promise.all([
            db.collection('facilities').doc(facilityId).get(),
            db.collection(`facilities/${facilityId}/rooms`).orderBy('sortIndex').get(),
            db.collection(`facilities/${facilityId}/occupancies`).get(),
            db.collection(`facilities/${facilityId}/stays`).where('status', '==', 'ACTIVE').get()
        ]);

        if (!facSnap.exists) return res.status(404).json({ error: 'Facility not found' });

        // 2. Fetch Patients (Optimized: only needed ones? For now fetch all linked to active occupancies)
        // To display name and alerts.
        // In a real app, we query patients by ID list. Firestore 'in' query supports up to 30.
        // If many, we might need multiple queries. 
        // Hack: List all patients for facility?
        const patientsSnap = await db.collection('patients').where('facilityId', '==', facilityId).get();
        const patientsMap = {};
        patientsSnap.docs.forEach(d => { patientsMap[d.id] = d.data(); });

        // 3. Helper to build Patient Card object
        const occupancies = occSnap.docs.map(d => d.data());
        const staysMap = {};
        staysSnap.docs.forEach(d => { staysMap[d.id] = d.data(); });

        const buildCard = (occ) => {
            const pat = patientsMap[occ.patientId] || {};
            const stay = staysMap[occ.stayId] || {};
            return {
                patientId: occ.patientId,
                displayName: pat.name || 'Unknown',
                alerts: [], // TODO: Tagging system
                stayType: stay.type || 'LONG',
                stayId: stay.id,
                occupancyId: occ.patientId // Use patId as ID for drag item
            };
        };

        // 4. Construct Lanes
        const lanes = {
            unassigned: [],
            awayHospital: []
        };
        const roomPatientsMap = {}; // roomId -> [cards]

        occupancies.forEach(occ => {
            const card = buildCard(occ);
            if (occ.lane === 'UNASSIGNED') {
                lanes.unassigned.push(card);
            } else if (occ.lane === 'AWAY_HOSPITAL') {
                lanes.awayHospital.push(card);
            } else if (occ.roomId) {
                if (!roomPatientsMap[occ.roomId]) roomPatientsMap[occ.roomId] = [];
                roomPatientsMap[occ.roomId].push(card);
            }
        });

        // 5. Construct Rooms
        const rooms = roomsSnap.docs.map(d => ({
            roomId: d.id,
            ...d.data(),
            patients: roomPatientsMap[d.id] || []
        }));

        res.json({
            facility: { facilityId: facSnap.id, ...facSnap.data() },
            lanes,
            rooms
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// List Facilities
exports.listFacilities = async (req, res) => {
    try {
        const snapshot = await db.collection('facilities').orderBy('sortIndex', 'asc').get();
        let facilities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Filter hidden facilities for demo environments
        const hiddenKeywordsStr = process.env.HIDDEN_FACILITY_KEYWORDS || '';
        if (hiddenKeywordsStr) {
            const hiddenKeywords = hiddenKeywordsStr.split(',').map(k => k.trim()).filter(k => k.length > 0);
            if (hiddenKeywords.length > 0) {
                facilities = facilities.filter(f => !hiddenKeywords.some(keyword => f.name && f.name.includes(keyword)));
            }
        }

        res.json({ facilities });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete Facility
exports.deleteFacility = async (req, res) => {
    try {
        const { facilityId } = req.params;
        // Recursive delete is hard in standard Firestore without Admin SDK tools or cloud functions.
        // For MVP, we just delete the facility doc. Orphaned subcollections exist but won't be queried.
        // Ideally: Delete all rooms, stays, occupancies.
        await db.collection('facilities').doc(facilityId).delete();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Reorder Facilities
exports.reorderFacilities = async (req, res) => {
    try {
        const { orders } = req.body; // [{ id, sortIndex }]
        const batch = db.batch();

        orders.forEach(item => {
            const ref = db.collection('facilities').doc(item.id);
            batch.update(ref, { sortIndex: item.sortIndex });
        });

        await batch.commit();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
