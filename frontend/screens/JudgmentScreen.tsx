import React, { useState } from 'react';
import { Patient, SoapResult, JudgmentType } from '../types';
import { ChevronRight, FileText, Share2, ClipboardList, CheckCircle } from 'lucide-react';

interface Props {
    result: SoapResult;
    patient: Patient;
    onConfirm: (judgment: JudgmentType, summaries: any) => void;
}

export const JudgmentScreen: React.FC<Props> = ({ result, patient, onConfirm }) => {
    const [activeTab, setActiveTab] = useState<'internal' | 'handover' | 'medical'>('internal');
    const [editedSummaries, setEditedSummaries] = useState(result.summaries);

    const handleTextChange = (key: keyof typeof editedSummaries, value: string) => {
        setEditedSummaries(prev => ({ ...prev, [key]: value }));
    };

    const getJudgmentLabel = (type: JudgmentType) => {
        switch (type) {
            case 'shared_not_needed': return '共有不要（順調）';
            case 'watch_and_wait': return '様子見（次回確認）';
            case 'consider_sharing': return '医師共有を検討';
        }
    };

    return (
        <div className="fixed inset-0 z-50 min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800">
            <header className="bg-white border-b px-4 py-4 flex items-center justify-between sticky top-0 z-10">
                <h1 className="text-lg font-bold text-gray-800">業務判断アクション</h1>
                <div className="text-xs text-gray-500">{patient.name} 様</div>
            </header>

            <main className="flex-1 p-4 overflow-y-auto pb-32">
                {/* 前回からの変更点 (Changes from last time) */}
                {result.changes_from_last_time && (
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-lg shadow-sm">
                        <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            前回からの主要な変更
                        </h3>
                        <p className="text-sm text-amber-900 font-medium leading-relaxed whitespace-pre-wrap">
                            {result.changes_from_last_time}
                        </p>
                    </div>
                )}

                {/* Summaries Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                    <div className="flex gap-2 mb-4 border-b">
                        <button
                            onClick={() => setActiveTab('internal')}
                            className={`pb-2 px-2 text-sm font-bold transition-colors border-b-2 ${activeTab === 'internal' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-400'}`}
                        >
                            薬局記録
                        </button>
                        <button
                            onClick={() => setActiveTab('handover')}
                            className={`pb-2 px-2 text-sm font-bold transition-colors border-b-2 ${activeTab === 'handover' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400'}`}
                        >
                            申し送り
                        </button>
                        <button
                            onClick={() => setActiveTab('medical')}
                            className={`pb-2 px-2 text-sm font-bold transition-colors border-b-2 ${activeTab === 'medical' ? 'border-rose-500 text-rose-600' : 'border-transparent text-gray-400'}`}
                        >
                            医師共有
                        </button>
                    </div>

                    <textarea
                        className="w-full h-40 p-3 text-base leading-relaxed border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none bg-gray-50"
                        value={editedSummaries[activeTab]}
                        onChange={(e) => handleTextChange(activeTab, e.target.value)}
                    />
                    <p className="text-xs text-gray-400 mt-2 text-right">
                        AI推奨内容を表示中（編集可）
                    </p>
                </div>
            </main>

            {/* Judgment Actions (Fixed Bottom) */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <h2 className="text-xs font-bold text-gray-400 mb-3 text-center uppercase tracking-wider">今回の判断を選択してください</h2>
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={() => onConfirm('shared_not_needed', editedSummaries)}
                        className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors"
                    >
                        <CheckCircle className="w-6 h-6 text-gray-600 mb-1" />
                        <span className="text-xs font-bold text-gray-700">共有不要</span>
                    </button>

                    <button
                        onClick={() => onConfirm('watch_and_wait', editedSummaries)}
                        className="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-50 hover:bg-amber-100 active:bg-amber-200 border border-amber-100 transition-colors"
                    >
                        <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-1 font-bold">!</div>
                        <span className="text-xs font-bold text-amber-700">様子見</span>
                    </button>

                    <button
                        onClick={() => onConfirm('consider_sharing', editedSummaries)}
                        className="flex flex-col items-center justify-center p-3 rounded-xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-100 transition-colors"
                    >
                        <Share2 className="w-6 h-6 text-rose-600 mb-1" />
                        <span className="text-xs font-bold text-rose-700">医師共有</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
