const fs = require('fs');
const path = require('path');
const { db } = require('../config/firebase');
const { bucket } = require('../config/gcs');
const { composeMany } = require('../utils/gcsUtils');
const { execFFmpeg } = require('../utils/mediaUtils');
const speech = require('@google-cloud/speech').v1p1beta1;
const { GoogleGenerativeAI } = require('@google/generative-ai');
const admin = require('firebase-admin');

// Initialize Clients
const speechClient = new speech.SpeechClient();
const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const PROMPT_TEMPLATE = `
# プロンプト
あなたは薬剤師として、在宅・外来患者のSOAP形式に基づく薬歴のA（評価）とP（計画）を生成する専門AIです。
以下の入力情報（会話、履歴、処方、知識）を分析し、最適な薬歴、介入計画、および医師向け要約を構造化データ（JSON）で出力してください。

【入力情報】
- 会話文字起こし: {{TRANSCRIPT}}
- 過去の薬歴/副作用歴: {{PAST_HISTORY}}
- 直近の処方箋(OCR結果): {{PRESCRIPTION_OCR}}
- 参照知識(RAG): {{KNOWLEDGE_BASE}}

【出力ルール】
■A（評価）
基本はS,Oで言及された薬剤1剤のみを対象に記載。
-情報量が多い場合は、2〜3剤記載してもよい。
-Aの出力形式は以下のように統一：
　薬剤名：SE〇〇（例：下痢、傾眠など）なしで継続中。引き続き△△（副作用名など）に注意。
-「SEなし」といった抽象表現ではなく、「SE脱力感なし」「SEふらつきなし」など、具体的な副作用名を挙げて「なし」と記載する。  
-NEW薬剤（新規処方・増量等）は「〇〇なし」と書かず、服用後の注意点に自然に言及する。
-中止薬は「中止」と明記し、離脱症状や再発リスクにも言及する。
-文章の冒頭に「注意」「現時点で」などは使わず、薬剤名から始める。
- 具体的な副作用の明記がない場合は、使用する薬剤の特徴的な副作用を記載する。
- 副作用の選定は、添付文書に記載のある副作用を原則として用いる。
- 添付文書が存在しない漢方薬・一般薬については、ツムラ等の医療用漢方製剤メーカーの情報、または信頼性の高い中医学文献・公的データベース（例：PubMed、中医薬データベースなど）を基に選定する。
- SOの内容を自然な流れになるよう反映させる。

■P（計画）
- Aに記載されていない薬剤の中から1剤を選んで記載。
-ただし、Aにしか薬剤がない場合は、同じ薬剤をPでも対象として記載すること。
- 出力形式は以下の通り：
　次回、〇〇（薬剤名）による△△（副作用）の有無を確認。
- 副作用は具体的に明記する（例：下痢、ふらつき、傾眠など）。高カリウム血症に注意など具体性がなく患者に聞き取りにくい記載はNG。
- 初回・変更薬では、効果、副作用、体調変化など適切な観察点を選定。
- 簡潔かつ1行で記載すること。
-漢方薬の場合も、副作用はその薬剤の特性や添付文書に基づき、「胃部不快感」は原則使わず、それ以外の特徴的な副作用（例：下痢、発疹、眠気、のぼせなど）から適切なものを選定する。
-患者の訴えや使用状況に応じ、漢方特有の反応（例：一時的な体調変化、のぼせ、動悸など）も選択肢に含める。

■要約（医師・ケアマネージャー向け）
- AとPの内容をふまえ、医師・ケアマネが一読で経過を把握できるよう、100文字前後で簡潔かつ丁寧にまとめる。
- 薬剤の継続状況、副作用、生活や症状への影響、今後の観察ポイントを含める。
- 専門用語の多用や略語は避け、平易な表現を用いる。
- 出力形式は以下の通り：
📄 要約（医師・ケアマネ用）  
〇〇は継続中で副作用の報告はなく、△△に注意して経過観察を行う予定。

■コピー対応
各出力（A、P、要約）は、ワンクリックでコピーしやすいように以下の形式で個別に準備してください。
ラベル（■A（評価）など）はコードブロックの外に表示し、内容のみをコードブロック内に記載する（\`\`\` を使用）。最終行に改行は入れないこと。
これは後述の JSON の "copy_block" フィールドに格納してください。

【JSON出力形式】
極めて短い会話や、「情報が少なすぎて整理できない」と判断された場合であっても、決してテキストの文章のみで回答してはいけません。いかなる場合も必ず以下のJSONのデータ構造を維持し、純粋なJSONオブジェクトのみを出力してください。情報が不足している項目には空文字（""）か空配列（[]）を設定し、会話内容は"s"フィールドへ集約してください。Markdownタグ（\`\`\`json 等）も含めないでください。
    {
        "soap": {
            "s": "主訴・自覚症状の要約",
            "o": "客観的所見（バイタル・残薬等）",
            "a": "【出力ルール: A】に則った評価文",
            "p": "【出力ルール: P】に則った計画文",
            "report_100": "📄 要約（医師・ケアマネ用）\\n[内要]",
            "changes_from_last_time": "前回との主要な変更点"
  },
        "pharmacy_focus": {
            "medications": [
                { "name": "薬剤名", "dose": "用量", "route": "用法", "frequency": "頻度", "status": "開始/継続/中止/変更", "reason_or_note": "備考" }
            ],
            "adherence": "アドヒアランス状況",
            "side_effects": [],
            "drug_related_problems": [],
            "labs_and_monitoring": [],
            "patient_education": [],
            "follow_up": ""
  },
        "alerts": { "red_flags": [], "need_to_contact_physician": [] },
        "meta": { "main_problems": [], "note_for_pharmacy": "" },
        "copy_block": "■A（評価）\\n\`\`\`\\n[Aの内容]\\n\`\`\`\\n\\n■P（計画）\\n\`\`\`\\n[Pの内容]\\n\`\`\`\\n\\n■要約（医師・ケアマネ用）\\n\`\`\`\\n[要約の内容]\\n\`\`\`"
}
`;

exports.summarizeContent = async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: 'Content is required' });

        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const prompt = `
あなたは医療事務支援AIです。以下の医療記録に基づき、レセコン転記用の100文字要約を作成してください。
【必須ルール】
- ** 必ず100文字以内 **。
- 文体は「〜を確認」など簡潔に。
- 医師・ケアマネが読んで理解できる内容。

入力: ${JSON.stringify(content)}
`;
        const result = await model.generateContent(prompt);
        let summary = result.response.text().trim();
        if (summary.length > 100) summary = summary.substring(0, 99) + "…";
        res.json({ summary });
    } catch (e) {
        console.error("Summarize Error:", e);
        res.status(500).json({ error: e.message });
    }
};

/**
 * analyzeText: 入力テキスト（手書きメモや会話まとめ）からSOAPを生成する
 */
exports.analyzeText = async (req, res) => {
    try {
        const { text, patientId, pastHistory, ocrData, knowledgeBase } = req.body;
        if (!text) return res.status(400).json({ error: 'Text is required' });

        console.log("[AnalyzeText] Request received:", { patientId, textLength: text?.length });
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        // Fetch Patient Specific Knowledge
        let patientKnowledgeText = "";
        if (patientId) {
            try {
                const patKwSnapshot = await db.collection('patients').doc(patientId).collection('knowledge').get();
                if (!patKwSnapshot.empty) {
                    patientKnowledgeText = patKwSnapshot.docs.map(d => `【患者個別メモ: ${d.data().category || 'メモ'}】\n${d.data().content} `).join('\n\n');
                }
            } catch (e) {
                console.warn("[AnalyzeText] Failed to fetch patient knowledge", e);
            }
        }

        // Combine Knowledge
        let combinedKnowledge = "";
        if (knowledgeBase) combinedKnowledge += `【全体共通知識】\n${knowledgeBase} \n\n`;
        if (patientKnowledgeText) combinedKnowledge += `【患者個別知識】\n${patientKnowledgeText} `;

        let prompt = PROMPT_TEMPLATE
            .replace('{{TRANSCRIPT}}', text)
            .replace('{{PAST_HISTORY}}', pastHistory || "なし")
            .replace('{{PRESCRIPTION_OCR}}', ocrData || "なし")
            .replace('{{KNOWLEDGE_BASE}}', combinedKnowledge || "なし");

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                maxOutputTokens: 4096,
                temperature: 0.1
            }
        });

        const rawJson = result.response.text();
        console.log("[AnalyzeText] AI Raw Response received");
        const cleanJson = rawJson.replace(/```json\n ? /, "").replace(/```/, "").trim();

        let soapData;
        try {
            soapData = JSON.parse(cleanJson);
        } catch (err) {
            console.error("[AnalyzeText] JSON Parse Error. Raw cleanJson was:", cleanJson);
            throw new Error("AI returned invalid JSON structure: " + err.message);
        }

        console.log("[AnalyzeText] JSON Parse Success");

        // Ensure report_100 is at top level for dashboard compatibility
        if (soapData.soap?.report_100 && !soapData.report_100) {
            soapData.report_100 = soapData.soap.report_100;
        }

        res.json({ ok: true, data: soapData });
    } catch (e) {
        console.error("AnalyzeText Error:", e);
        res.status(500).json({ error: e.message });
    }
};

exports.finalizeRecording = async (req, res) => {
    const { recordingId } = req.params;
    console.log(`[Finalize] Async processing requested for ${recordingId}`);

    try {
        const recRef = db.collection('recordings').doc(recordingId);
        const recDoc = await recRef.get();
        if (!recDoc.exists) return res.status(404).json({ error: 'Recording not found' });
        const recData = recDoc.data();

        // Already being handled?
        if (recData.status === 'PROCESSING' || recData.status === 'PROCESSED') {
            return res.json({ ok: true, status: recData.status, encounterId: recData.encounterId });
        }

        // Generate Encounter ID and create placeholder immediately
        let encounterId = recData.encounterId;
        if (!encounterId && recData.patientId) {
            const encCol = db.collection('patients').doc(recData.patientId).collection('encounters');
            const newEncRef = encCol.doc();
            encounterId = newEncRef.id;

            // Initial save with PROCESSING status
            await newEncRef.set({
                patientId: recData.patientId,
                facilityId: recData.facilityId || 'unknown',
                date: new Date().toISOString(),
                status: 'PROCESSING',
                type: 'VISIT_RECORDING',
                recordedById: recData.recordedById || null,
                recordedByName: recData.recordedByName || null,
                recordedByRole: recData.recordedByRole || null,
                updatedAt: new Date().toISOString()
            });

            await recRef.update({
                status: 'PROCESSING',
                encounterId: encounterId
            });
        }

        // Return immediately to Mobile client
        res.status(202).json({
            ok: true,
            status: 'PROCESSING',
            encounterId: encounterId,
            message: 'Audio cleanup and AI analysis started in background.'
        });

        // Continue in background
        setImmediate(async () => {
            const workDir = '/tmp';
            const localAssembled = path.join(workDir, `${recordingId} _assembled`);
            const localWav = path.join(workDir, `${recordingId}.wav`);

            try {
                await recRef.update({ status: 'PROCESSING' });

                // 1. Chunks to Raw
                const prefix = `sessions / ${recordingId}/chunk-`;
                const [files] = await bucket.getFiles({ prefix });
                if (files.length === 0) throw new Error('No chunks found');

                files.sort((a, b) => a.name.localeCompare(b.name));
                const assembledGcsPath = `sessions/${recordingId}/assembled.raw`;
                await composeMany(files.map(f => f.name), assembledGcsPath, 'application/octet-stream');

                // 2. Raw to Wav (16kHz Mono)
                await bucket.file(assembledGcsPath).download({ destination: localAssembled });
                await execFFmpeg([
                    '-f', 's16le', '-ar', '16000', '-ac', '1',
                    '-i', localAssembled,
                    '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le',
                    localWav
                ]);

                // 3. Upload and STT (V2 API - Chirp 3 & Diarization)
                const wavGcsPath = `audio/${recordingId}.wav`;
                await bucket.upload(localWav, { destination: wavGcsPath, contentType: 'audio/wav' });
                const gcsUri = `gs://${bucket.name}/${wavGcsPath}`;

                // Require Speech V2 client
                const { SpeechClient } = require('@google-cloud/speech').v2;
                const speechClientV2 = new SpeechClient({
                    apiEndpoint: 'asia-northeast1-speech.googleapis.com'
                });
                const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'yorisoi-medical';
                const location = 'asia-northeast1'; // chirp_3 requires specific regional endpoints outside 'global'

                const sttRequest = {
                    recognizer: `projects/${projectId}/locations/${location}/recognizers/_`,
                    config: {
                        autoDecodingConfig: {},
                        model: 'chirp_3',
                        languageCodes: ['ja-JP'],
                        features: {
                            enableAutomaticPunctuation: true,
                            diarizationConfig: {
                                minSpeakerCount: 1,
                                maxSpeakerCount: 4
                            }
                        }
                    },
                    files: [{ uri: gcsUri }],
                    recognitionOutputConfig: {
                        inlineResponseConfig: {}
                    }
                };

                let transcript = '';
                try {
                    const [operation] = await speechClientV2.batchRecognize(sttRequest);
                    const [sttResponse] = await operation.promise();

                    let resultsArray = [];
                    if (sttResponse.results) {
                        console.log("STT V2 Batch Results Keys available:", Object.keys(sttResponse.results));
                        console.log("Expected gcsUri key:", gcsUri);

                        const fileResult = sttResponse.results[gcsUri];
                        if (fileResult) {
                            if (fileResult.inlineResult && fileResult.inlineResult.transcript && fileResult.inlineResult.transcript.results) {
                                resultsArray = fileResult.inlineResult.transcript.results;
                            } else if (fileResult.transcript && fileResult.transcript.results) {
                                resultsArray = fileResult.transcript.results;
                            } else {
                                console.error("No transcript.results found inside fileResult:", JSON.stringify(fileResult).substring(0, 500));
                            }
                        } else {
                            console.error("gcsUri not found in sttResponse.results!");
                            // Fallback: Just grab the first available key if there's only one.
                            const keys = Object.keys(sttResponse.results);
                            if (keys.length > 0) {
                                const fbResult = sttResponse.results[keys[0]];
                                if (fbResult.inlineResult && fbResult.inlineResult.transcript && fbResult.inlineResult.transcript.results) {
                                    resultsArray = fbResult.inlineResult.transcript.results;
                                } else if (fbResult.transcript && fbResult.transcript.results) {
                                    resultsArray = fbResult.transcript.results;
                                }
                            }
                        }
                    } else {
                        console.error("sttResponse.results is totally missing:", JSON.stringify(sttResponse).substring(0, 500));
                    }

                    if (resultsArray.length > 0) {
                        // Extract words to group by speaker
                        const allWords = [];
                        resultsArray.forEach(res => {
                            const alt = res.alternatives[0];
                            if (alt && alt.words) {
                                allWords.push(...alt.words);
                            }
                        });

                        if (allWords.length > 0) {
                            let currentSpeaker = '';
                            let currentSentence = '';

                            for (const word of allWords) {
                                const speakerLabel = word.speakerLabel || '1'; // V2 might use '1' or 'speaker:1'
                                const cleanSpeaker = speakerLabel.replace('speaker:', '話者');
                                const finalLabel = cleanSpeaker.startsWith('話者') ? cleanSpeaker : `話者${cleanSpeaker}`;

                                if (finalLabel !== currentSpeaker) {
                                    if (currentSentence.trim()) {
                                        transcript += `\n${currentSpeaker}: ${currentSentence.trim()}`;
                                        currentSentence = '';
                                    }
                                    currentSpeaker = finalLabel;
                                }
                                currentSentence += word.word;
                            }
                            if (currentSentence.trim()) {
                                transcript += `\n${currentSpeaker}: ${currentSentence.trim()}`;
                            }
                            transcript = transcript.trim();
                        } else {
                            // Fallback if no words array (should not happen with diarization config)
                            transcript = resultsArray.map(r => r.alternatives[0].transcript).join('\n');
                        }
                    } else {
                        console.error("STT V2 No Results Returned.");
                        transcript = "文字起こし結果が空でした。(録音データの音声が認識できなかった可能性があります)";
                    }
                } catch (sttErr) {
                    console.error("STT V2 Error:", sttErr);
                    transcript = "音声解析中にエラーが発生しました。";
                }

                // --- PROGRESSIVE SAVE ---
                // 文字起こしが完了した時点で再度Firestoreを更新し、ステータスを ANALYSISNG (要約中) にし、文字起こし結果を入れる
                if (recData.patientId && encounterId) {
                    const encCol = db.collection('patients').doc(recData.patientId).collection('encounters');
                    await encCol.doc(encounterId).set({
                        status: 'ANALYZING',
                        transcript: transcript,
                        updatedAt: new Date().toISOString()
                    }, { merge: true });
                }

                // 4. Summarize (Gemini with History/OCR/RAG)
                let aResult = {};
                if (transcript.length > 2) {
                    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

                    // --- Fetch Contextual Data ---
                    let pastHistoryText = "なし";
                    let ocrPrescriptionText = "なし";
                    let knowledgeBaseText = "なし";

                    // Fetch All Knowledge Base entries (Global)
                    try {
                        const kwDocs = await db.collection('knowledge').get();
                        if (!kwDocs.empty) {
                            knowledgeBaseText = kwDocs.docs.map(d => `【資料: ${d.data().filename}】\n${d.data().parsedContent}`).join('\n\n');
                        }
                    } catch (e) {
                        console.error('Knowledge Base load failed', e);
                    }

                    // Fetch Patient Specific Knowledge (Local)
                    let patientKnowledgeText = "";
                    if (recData.patientId) {
                        try {
                            const patKwSnapshot = await db.collection('patients').doc(recData.patientId).collection('knowledge').get();
                            if (!patKwSnapshot.empty) {
                                patientKnowledgeText = patKwSnapshot.docs.map(d => `【患者個別メモ: ${d.data().category || 'メモ'}】\n${d.data().content}`).join('\n\n');
                            }
                        } catch (e) {
                            console.warn("Failed to fetch patient knowledge", e);
                        }
                    }

                    // Combine Knowledge
                    if (knowledgeBaseText) knowledgeBaseText = `【全体共通知識】\n${knowledgeBaseText}\n\n`;
                    if (patientKnowledgeText) knowledgeBaseText += `【患者個別知識】\n${patientKnowledgeText}`;


                    if (recData.patientId) {
                        // A. Past History (Last 2 encounters)
                        const pastDocs = await db.collection('patients').doc(recData.patientId)
                            .collection('encounters')
                            .orderBy('date', 'desc')
                            .limit(2)
                            .get();

                        if (!pastDocs.empty) {
                            pastHistoryText = pastDocs.docs.map(d => {
                                const data = d.data();
                                return `【日付: ${data.date}】\nA: ${data.soap?.a}\nP: ${data.soap?.p}\n要約: ${data.report_100 || data.summary}`;
                            }).join('\n---\n');
                        }

                        // B. OCR Prescription (Look for most recent prescription data)
                        // Note: Current schema assumes OCR results might be stored. 
                        // Let's check for 'prescriptions' collection or similar. 
                        // If not found, skip.
                        const ocrDocs = await db.collection('patients').doc(recData.patientId)
                            .collection('prescriptions')
                            .orderBy('createdAt', 'desc')
                            .limit(1)
                            .get();
                        if (!ocrDocs.empty) {
                            const ocrData = ocrDocs.docs[0].data();
                            ocrPrescriptionText = JSON.stringify(ocrData.medications || ocrData.data?.medications || []);
                        }
                    }

                    // --- Prepare Prompt ---
                    let finalPrompt = PROMPT_TEMPLATE
                        .replace('{{TRANSCRIPT}}', transcript)
                        .replace('{{PAST_HISTORY}}', pastHistoryText)
                        .replace('{{PRESCRIPTION_OCR}}', ocrPrescriptionText)
                        .replace('{{KNOWLEDGE_BASE}}', knowledgeBaseText || "なし");

                    const result = await model.generateContent({
                        contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
                        generationConfig: {
                            responseMimeType: "application/json",
                            maxOutputTokens: 8192,
                            temperature: 0.1 // より忠実に出力
                        }
                    });

                    try {
                        const rawJson = result.response.text();
                        let cleanJson = rawJson.trim();
                        // markdownの```や余計な会話文が含まれる場合の対策として、最外殻の {} の間だけを抽出する
                        const firstBrace = cleanJson.indexOf('{');
                        const lastBrace = cleanJson.lastIndexOf('}');
                        if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
                            cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
                        } else {
                            throw new Error("No JSON object found in response");
                        }
                        aResult = JSON.parse(cleanJson);
                        console.log(`[Gemini] Analysis Success for ${recordingId}`);
                    } catch (parseErr) {
                        console.error("[Gemini] Parse Error, attempting recovery.", parseErr);
                        console.error("[Gemini] Raw Output was:", result.response.text());

                        aResult = {
                            soap: { s: transcript, o: "", a: "解析エラーが発生したため、文字起こしをSに格納しました。", p: "" }
                        };
                    }
                }

                // 5. Update Record and Encounter (Mapping all fields)
                await recRef.update({
                    status: 'PROCESSED',
                    transcript,
                    audioUrl: gcsUri,
                    processedAt: new Date().toISOString()
                });

                if (recData.patientId && encounterId) {
                    const encCol = db.collection('patients').doc(recData.patientId).collection('encounters');
                    const encRef = encCol.doc(encounterId);

                    await encRef.set({
                        patientId: recData.patientId,
                        facilityId: recData.facilityId || 'unknown',
                        date: new Date().toISOString(),
                        status: 'COMPLETED',
                        type: 'VISIT_RECORDING',
                        soap: aResult.soap || { s: transcript, o: "", a: "", p: "" },
                        pharmacy_focus: aResult.pharmacy_focus || { medications: [], adherence: "", side_effects: [], drug_related_problems: [], labs_and_monitoring: [], patient_education: [], follow_up: "" },
                        alerts: aResult.alerts || { red_flags: [], need_to_contact_physician: [] },
                        meta: aResult.meta || { main_problems: [], note_for_pharmacy: "" },
                        report_100: aResult.soap?.report_100 || aResult.summaries?.medical || "",
                        summary: aResult.summaries?.internal || "", // Dashboard fallback
                        changes_from_last_time: aResult.soap?.changes_from_last_time || "", // [NEW]
                        recordedById: recData.recordedById || null,
                        recordedByName: recData.recordedByName || null,
                        recordedByRole: recData.recordedByRole || null,
                        transcript,
                        audioUrl: gcsUri,
                        updatedAt: new Date().toISOString()
                    }, { merge: true });
                }

                // Cleanup
                if (fs.existsSync(localAssembled)) fs.unlinkSync(localAssembled);
                if (fs.existsSync(localWav)) fs.unlinkSync(localWav);
                console.log(`[Finalize] Background Processing Success for ${recordingId}`);

            } catch (err) {
                console.error(`[Finalize] Background Processing Error for ${recordingId}:`, err);
                await recRef.update({ status: 'FAILED' });
            }
        });

    } catch (err) {
        console.error(`[Finalize] Request Error:`, err);
        res.status(500).json({ error: err.message });
    }
};
