import React, { useState } from 'react';
import { ClinicalData, Medication } from '../types';
import { SectionHeader } from './SectionHeader';
import { Card } from './ui/Card';
import { generateAiSummary } from '../utils/aiLogic';
import { api } from '../services/api';
import { Loader2 } from 'lucide-react';

interface Props {
  data: ClinicalData;
  transcript: string;
  onChange?: (data: ClinicalData) => void;
}

const EditableSoapBlock: React.FC<{
  letter: string;
  title: string;
  value: string;
  onChange: (val: string) => void;
  color: string;
  onCopy?: () => void;
}> = ({ letter, title, value, onChange, color, onCopy }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    if (onCopy) onCopy();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-2 group transition-all relative">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className={`flex items-center justify-center w-7 h-7 rounded-lg text-sm font-bold text-white shadow-sm ring-2 ring-white ${color}`}>
            {letter}
          </span>
          <span className="font-bold text-gray-700 text-sm tracking-wide">{title}</span>
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-all ${copied ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
        >
          {copied ? (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              <span>Copied</span>
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <textarea
        className="p-4 bg-gray-50/50 hover:bg-white rounded-xl text-gray-800 text-sm leading-relaxed border border-gray-200 w-full min-h-[140px] focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 focus:outline-none transition-all duration-300 resize-y shadow-inner"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

const EditableListBlock: React.FC<{
  title: string;
  items: string[];
  onChange: (items: string[]) => void;
}> = ({ title, items, onChange }) => {
  const textValue = items ? items.join('\n') : '';

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newItems = e.target.value.split('\n');
    onChange(newItems);
  };

  return (
    <div className="mt-5">
      <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider flex items-center gap-2">
        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
        {title}
      </h4>
      <textarea
        className="w-full p-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 focus:outline-none min-h-[80px] transition-all shadow-sm hover:border-gray-300"
        value={textValue}
        onChange={handleChange}
        placeholder="項目を改行区切りで入力..."
      />
    </div>
  );
};

export const SoapView: React.FC<Props> = ({ data = {} as ClinicalData, transcript, onChange }) => {
  const { soap = { s: '', o: '', a: '', p: '' }, pharmacy_focus, alerts, meta } = data;

  const updateData = (updates: Partial<ClinicalData>) => {
    if (onChange) {
      onChange({ ...data, ...updates });
    }
  };

  const updateSoap = (field: keyof typeof soap, value: string) => {
    updateData({ soap: { ...soap, [field]: value } });
  };

  const updatePharmacy = (updates: Partial<typeof pharmacy_focus>) => {
    updateData({ pharmacy_focus: { ...pharmacy_focus, ...updates } });
  };

  const updateAlerts = (updates: Partial<typeof alerts>) => {
    updateData({ alerts: { ...alerts, ...updates } });
  };

  const updateMeta = (updates: Partial<typeof meta>) => {
    updateData({ meta: { ...meta, ...updates } });
  };

  const handleAddMedication = () => {
    const newMeds = [
      ...pharmacy_focus.medications,
      { name: '', dose: '', route: '', frequency: '', status: '開始', reason_or_note: '' }
    ];
    updatePharmacy({ medications: newMeds });
  };

  const handleMedChange = (index: number, field: keyof Medication, value: string) => {
    const newMeds = [...pharmacy_focus.medications];
    newMeds[index] = { ...newMeds[index], [field]: value };
    updatePharmacy({ medications: newMeds });
  };

  const [manualText, setManualText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiPreview, setAiPreview] = useState<string | null>(null);

  const handleManualAnalyze = async () => {
    if (!manualText.trim()) return;
    setIsAnalyzing(true);
    setAiPreview(null);
    try {
      const res = await api.analyzeText({
        text: manualText,
        patientId: (data as any).patientId // if available
      });
      console.log("[Dashboard] AI Analyze Response:", res);
      if (res.ok && res.data) {
        updateData(res.data);
        // Preview creation
        const simplePreview = `【S】 ${res.data.soap?.s}\n【O】 ${res.data.soap?.o}\n【A】 ${res.data.soap?.a}\n【P】 ${res.data.soap?.p}\n\n【要約】 ${res.data.report_100}`;
        setAiPreview(res.data.copy_block || simplePreview);
      }
    } catch (e) {
      alert('AI解析に失敗しました: ' + e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-20">

      {/* AI Assistance / Manual Input Panel */}
      <Card className="border-l-4 border-l-teal-500 bg-slate-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            AI入力アシスタント (手書きメモ・文字起こし要約)
          </h3>
        </div>

        {/* 1. Transcript (Top Collapsible) */}
        <div className="mb-6">
          <details className="group bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <summary className="p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer text-xs font-bold text-gray-600 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                会話ログ (文字起こし) を表示
              </span>
              <svg className="w-4 h-4 transition-transform group-open:rotate-180 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </summary>
            <div className="p-3 border-t border-gray-200">
              <textarea
                readOnly
                className="w-full h-32 text-xs bg-gray-50 text-gray-600 rounded border-0 resize-y focus:outline-none font-mono leading-relaxed"
                value={transcript || '(録音データなし)'}
              />
              <p className="text-[10px] text-right text-gray-400 mt-1">コピーして下のメモに貼り付け可能です</p>
            </div>
          </details>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 2. Manual Input */}
          <div className="flex flex-col h-full">
            <label className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
              <span>手書きメモ / AI指示</span>
              <span className="bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded text-[10px]">必須</span>
            </label>
            <textarea
              className="flex-1 min-h-[160px] p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none shadow-sm resize-none bg-white font-medium text-gray-700"
              placeholder="例：血圧120/78、残薬なし。アドヒアランス良好。アムロジン継続。次回は副作用のむくみを確認する。"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
            />
            <button
              onClick={handleManualAnalyze}
              disabled={isAnalyzing || !manualText.trim()}
              className="mt-3 w-full py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold rounded-lg shadow hover:shadow-md hover:from-teal-600 hover:to-teal-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <><Loader2 className="animate-spin w-4 h-4" /> AI解析中...</>
              ) : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> AIでSOAPに変換</>
              )}
            </button>
          </div>

          {/* 3. AI Result Preview & Copy */}
          <div className="flex flex-col h-full bg-slate-100 rounded-lg p-3 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-500">AI解析結果プレビュー</label>
              <button
                onClick={() => {
                  if (aiPreview) {
                    navigator.clipboard.writeText(aiPreview);
                    alert('クリップボードにコピーしました');
                  }
                }}
                disabled={!aiPreview}
                className="text-xs bg-white border border-slate-300 px-2 py-1 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1 font-bold"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                結果をコピー
              </button>
            </div>
            {aiPreview ? (
              <div className="flex-1 bg-white rounded border border-slate-200 p-3 overflow-y-auto max-h-[200px] text-xs leading-relaxed whitespace-pre-wrap font-mono text-slate-700">
                {aiPreview}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs italic border-2 border-dashed border-slate-200 rounded p-4">
                <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                左側に入力して「AIでSOAPに変換」を押すと<br />ここに結果が表示されます
              </div>
            )}
            <div className="mt-2 text-[10px] text-center text-teal-600 font-bold">
              ※ 解析結果は下のSOAP欄にも自動反映されています
            </div>
          </div>
        </div>
      </Card>

      {/* Messages / Meta Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main Problems */}
        <div className="md:col-span-2 bg-blue-50 border border-blue-100 rounded-lg p-4">
          <h3 className="text-blue-700 font-bold text-sm mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            主な問題点 (編集可)
          </h3>
          <input
            className="w-full px-3 py-2 bg-white text-blue-900 text-sm font-medium rounded border border-blue-200 shadow-sm focus:ring-1 focus:ring-blue-400 focus:outline-none mb-3"
            value={meta.main_problems.join(', ')}
            onChange={(e) => updateMeta({ main_problems: e.target.value.split(',').map(s => s.trim()) })}
            placeholder="カンマ区切りで入力..."
          />

          <div className="flex items-start gap-2">
            <span className="text-xs font-bold text-blue-600 mt-2 shrink-0">申送り:</span>
            <textarea
              className="w-full text-sm text-blue-800 bg-blue-100/30 p-2 rounded border border-blue-200 focus:ring-1 focus:ring-blue-400 focus:outline-none"
              value={meta.note_for_pharmacy}
              onChange={(e) => updateMeta({ note_for_pharmacy: e.target.value })}
            />
          </div>
        </div>

        {/* Alerts */}
        <div className={`rounded-lg p-4 border ${alerts.red_flags.length > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-200'}`}>
          <h3 className={`${alerts.red_flags.length > 0 ? 'text-red-700' : 'text-gray-600'} font-bold text-sm mb-2 flex items-center gap-2`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Red Flags (編集可)
          </h3>
          <textarea
            className={`w-full h-full min-h-[80px] text-sm p-2 rounded border focus:outline-none focus:ring-1 focus:ring-red-400 ${alerts.red_flags.length > 0 ? 'bg-white text-red-700 border-red-200' : 'bg-white text-gray-500 border-gray-200'}`}
            value={alerts.red_flags.join('\n')}
            onChange={(e) => updateAlerts({ red_flags: e.target.value.split('\n') })}
            placeholder="Red Flagsを改行区切りで入力..."
          />
        </div>
      </div>

      {/* SOAP Grid */}
      <Card>
        <SectionHeader
          title="SOAP 記録 (編集可)"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EditableSoapBlock letter="S" title="Subjective (服薬・症状)" value={soap.s} onChange={(v) => updateSoap('s', v)} color="bg-sky-400" />
          <EditableSoapBlock letter="O" title="Objective (残薬・バイタル)" value={soap.o} onChange={(v) => updateSoap('o', v)} color="bg-rose-400" />
          <EditableSoapBlock letter="A" title="Assessment (Aから開始)" value={soap.a} onChange={(v) => updateSoap('a', v)} color="bg-amber-400" />
          <EditableSoapBlock letter="P" title="Plan (1行)" value={soap.p} onChange={(v) => updateSoap('p', v)} color="bg-emerald-400" />
        </div>
      </Card>

      {/* 前回からの変更点 (Changes from last time) */}
      {(data as any).changes_from_last_time && (
        <Card className="mb-8 border-l-4 border-l-amber-500 bg-amber-50/30 overflow-hidden shadow-md">
          <div className="flex items-center gap-2 p-4 bg-amber-100/50 border-b border-amber-200">
            <span className="p-1 px-2 bg-amber-500 text-white text-[10px] font-bold rounded uppercase tracking-wider shadow-sm">Highlight</span>
            <h3 className="font-bold text-gray-800 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              前回からの主要な変更点
            </h3>
          </div>
          <div className="p-5">
            <p className="text-gray-800 text-sm leading-relaxed font-medium whitespace-pre-wrap">
              {(data as any).changes_from_last_time}
            </p>
          </div>
        </Card>
      )}

      {/* 100-Character Summary (Report for Receipt Computer) */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <SectionHeader
            title="レセコン転記用要約 (100文字)"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>}
            colorClass="text-purple-600"
          />
          {/* Mobile-friendly Copy Button */}
          <button
            onClick={() => {
              const textToCopy = data.report_100 || data.summary || '';
              navigator.clipboard.writeText(textToCopy).then(() => {
                alert('一括コピーしました');
              });
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold rounded-lg shadow-md hover:shadow-lg active:scale-95 transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
            一括コピー
          </button>
        </div>

        <div className="relative">
          <textarea
            className="w-full p-4 bg-purple-50 rounded-xl text-gray-800 text-base leading-relaxed border-2 border-purple-100 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 focus:outline-none resize-y min-h-[120px] shadow-inner font-medium"
            value={data.report_100 || data.summary || ''}
            onChange={(e) => updateData({ report_100: e.target.value })}
            placeholder="AI要約結果がここに表示されます..."
          />
          <div className={`absolute bottom-3 right-3 text-xs font-mono font-bold px-2 py-1 rounded bg-white/80 ${(data.report_100 || data.summary || '').length > 120 ? 'text-red-600' : 'text-gray-500'}`}>
            {(data.report_100 || data.summary || '').length}文字
          </div>
        </div>
        <div className="flex justify-end mt-2">
          <button
            onClick={async () => {
              try {
                const res = await api.summarize(data); // Send current full data
                updateData({ report_100: res.summary });
              } catch (e) {
                alert('要約の再生成に失敗しました');
              }
            }}
            className="text-xs text-purple-600 underline hover:text-purple-800 flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            内容から要約を再生成
          </button>
        </div>
      </Card>

      {/* Pharmacy Focus */}
      <Card>
        <SectionHeader
          title="薬学的介入・指導"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>}
          colorClass="text-indigo-500"
        />

        {/* Medications Table (Editable) */}
        <div className="mb-6 overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 min-w-[150px]">薬剤名</th>
                <th className="px-4 py-3 min-w-[150px]">用法・用量</th>
                <th className="px-4 py-3 w-[100px]">ステータス</th>
                <th className="px-4 py-3">備考</th>
              </tr>
            </thead>
            <tbody>
              {pharmacy_focus.medications.map((med, idx) => (
                <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-2 py-2">
                    <input
                      className="w-full p-1 border rounded"
                      value={med.name}
                      onChange={(e) => handleMedChange(idx, 'name', e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      className="w-full p-1 border rounded"
                      value={`${med.dose} ${med.route} ${med.frequency}`}
                      onChange={(e) => handleMedChange(idx, 'dose', e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      className="w-full p-1 border rounded text-xs"
                      value={med.status}
                      onChange={(e) => handleMedChange(idx, 'status', e.target.value)}
                    >
                      <option value="開始">開始</option>
                      <option value="継続">継続</option>
                      <option value="中止">中止</option>
                      <option value="変更">変更</option>
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      className="w-full p-1 border rounded"
                      value={med.reason_or_note}
                      onChange={(e) => handleMedChange(idx, 'reason_or_note', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
              {/* Add Row Button */}
              <tr className="bg-gray-50 border-b border-dashed">
                <td colSpan={4}
                  className="px-4 py-3 text-center text-xs font-bold text-teal-600 cursor-pointer hover:bg-teal-50 transition-colors border-2 border-dashed border-teal-100 rounded-lg m-2"
                  onClick={handleAddMedication}
                >
                  + 薬剤を追加
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Pharmacy Details Grid (Editable) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">アドヒアランス</h4>
            <textarea
              className="w-full text-sm text-gray-800 bg-white p-2 rounded border border-gray-200 focus:ring-1 focus:ring-indigo-400 focus:outline-none"
              value={pharmacy_focus.adherence}
              onChange={(e) => updatePharmacy({ adherence: e.target.value })}
            />
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">フォローアップ予定</h4>
            <textarea
              className="w-full text-sm text-gray-800 bg-white p-2 rounded border border-gray-200 focus:ring-1 focus:ring-indigo-400 focus:outline-none"
              value={pharmacy_focus.follow_up}
              onChange={(e) => updatePharmacy({ follow_up: e.target.value })}
            />
          </div>

          <div>
            <EditableListBlock title="疑義照会・薬学的問題点" items={pharmacy_focus.drug_related_problems} onChange={(items) => updatePharmacy({ drug_related_problems: items })} />
            <EditableListBlock title="副作用モニタリング" items={pharmacy_focus.side_effects} onChange={(items) => updatePharmacy({ side_effects: items })} />
          </div>

          <div>
            <EditableListBlock title="検査値・モニタリング" items={pharmacy_focus.labs_and_monitoring} onChange={(items) => updatePharmacy({ labs_and_monitoring: items })} />
            <EditableListBlock title="患者指導内容" items={pharmacy_focus.patient_education} onChange={(items) => updatePharmacy({ patient_education: items })} />
          </div>
        </div>

      </Card>

      {/* Contact Physician Alert (Editable) */}
      <div className="bg-yellow-50 border-l-4 border-yellow-300 p-4 rounded-r shadow-sm">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <h3 className="text-sm font-medium text-yellow-800">医師への連絡が必要なケース</h3>
          </div>
          <textarea
            className="w-full text-sm text-yellow-900 bg-white/50 border border-yellow-200 rounded p-2 focus:outline-none focus:ring-1 focus:ring-yellow-400"
            value={alerts.need_to_contact_physician.join('\n')}
            onChange={(e) => updateAlerts({ need_to_contact_physician: e.target.value.split('\n') })}
            placeholder="項目を改行区切りで入力..."
          />
        </div>
      </div>

    </div>
  );
};