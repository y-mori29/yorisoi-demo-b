'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Screen, Facility, Patient, SoapResult, JudgmentType } from './types';
import { MOCK_FACILITIES, MOCK_PATIENTS } from './constants';
import { useRecorder, initSilentAudio } from './hooks/useRecorder';
import { JudgmentScreen } from './screens/JudgmentScreen';
// import { ResultScreen } from './screens/ResultScreen'; // Removed
import {
  Briefcase,
  User,
  Lock,
  Eye,
  EyeOff,
  Search,
  Building2,
  ChevronRight,
  Mic,
  Pause,
  Square,
  Plus,
  ChevronLeft,
  Trash2,
  CheckCircle2,
  MoreHorizontal,
  Loader2,
  FileText,
  Copy,
  Check,
  Sparkles
} from './components/Icons';
import { Header } from './components/Header';
import { PatientChatBot } from './components/PatientChatBot';
import { api } from './services/api';

// API Base URL
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8081';

// --- Shared Components ---

const DataLoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center space-y-8">
        <div className="w-24 h-24 rounded-full border-4 border-gray-200 border-t-primary animate-spin" />
        <div className="w-64 space-y-2 text-center">
          <p className="text-text-main font-bold">データを読み込み中...</p>
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div className="bg-primary h-1.5 rounded-full w-1/2 animate-[pulse_1.5s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    </div>
  );
};

interface ToastProps {
  message: string;
  type: 'success' | 'neutral';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[60] animate-[slideUp_0.3s_ease-out]">
      <div className={`px-6 py-3 rounded-full shadow-lg flex items-center space-x-3 backdrop-blur-md ${type === 'success'
        ? 'bg-gray-800/90 text-white'
        : 'bg-gray-800/90 text-white'
        }`}>
        {type === 'success' ? (
          <CheckCircle2 size={20} className="text-green-400" />
        ) : (
          <Trash2 size={20} className="text-gray-400" />
        )}
        <span className="font-bold text-sm">{message}</span>
      </div>
    </div>
  );
};

// --- Screen Components ---

// 1. LoginScreen Update
const LoginScreen: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLoginClick = async () => {
    if (!userId || !password) {
      alert("IDとパスワードを入力してください");
      return;
    }
    setIsLoading(true);
    try {
      await authService.login(userId, password);
      onLogin();
    } catch (e: any) {
      alert(e.message || "ログインに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-surface/50 backdrop-blur-sm p-8 rounded-2xl shadow-none">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-blue-200 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <Briefcase size={40} className="text-primary" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-text-main">ログイン</h1>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-text-main">ユーザーID</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={20} className="text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="IDを入力"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 bg-gray-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-main placeholder-gray-500 transition-all disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-text-main">パスワード</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={20} className="text-gray-500" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="パスワードを入力"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full pl-10 pr-10 py-3 bg-gray-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-main placeholder-gray-500 transition-all disabled:opacity-50"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLoading}
              className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary"
            />
            <label htmlFor="remember-me" className="ml-2 text-sm text-text-main cursor-pointer select-none">
              ログイン情報を保存する
            </label>
          </div>

          <button
            onClick={handleLoginClick}
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {isLoading ? 'ログイン中・・・' : 'ログイン'}
          </button>

          <div className="text-center pt-2">
            <a href="#" className={`text-sm text-primary underline decoration-1 underline-offset-4 ${isLoading ? 'pointer-events-none opacity-50' : ''}`}>
              パスワードをお忘れの場合
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

// 2. Facility List Screen
const FacilityListScreen: React.FC<{
  onSelectFacility: (f: Facility) => void;
  facilities: Facility[];
  onLogout: () => void;
}> = ({ onSelectFacility, facilities, onLogout }) => {
  const [isLoading, setIsLoading] = useState(false);

  if (isLoading) {
    return <DataLoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title="施設一覧" showAdd showLogout onLogout={onLogout} />

      <div className="p-4">
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="施設名で検索"
            className="w-full pl-10 pr-4 py-3 bg-gray-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>

        <div className="space-y-3">
          {facilities.map((facility) => (
            <div
              key={facility.id}
              onClick={() => onSelectFacility(facility)}
              className="bg-surface p-4 rounded-xl shadow-sm border border-gray-100 flex items-center active:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="w-12 h-12 bg-blue-100/50 rounded-xl flex items-center justify-center mr-4 shrink-0">
                <Building2 size={24} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-text-main truncate">{facility.name}</h3>
                <p className="text-xs text-text-sub truncate">{facility.type}</p>
              </div>
              <ChevronRight size={20} className="text-gray-400 ml-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 3. Patient List Screen
const PatientListScreen: React.FC<{
  facility: Facility;
  patients: Patient[];
  onBack: () => void;
  onSelectPatient: (p: Patient) => void;
}> = ({ facility, patients, onBack, onSelectPatient }) => {
  const [isLoading, setIsLoading] = useState(false);

  // フィルタリング: タブ機能は廃止し、施設IDの一致のみを行う
  const filteredPatients = patients.filter(p => {
    // Ensure both are strings.
    return String(p.facilityId) === String(facility.id);
  });

  if (isLoading) {
    return <DataLoadingScreen />;
  }

  if (isLoading) {
    return <DataLoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-background relative pb-20">
      <Header title="患者一覧" showBack onBack={onBack} />

      <div className="p-5">
        <h2 className="text-xl font-bold text-text-main mb-4">{facility.name}</h2>

        {/* Search */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="患者を検索"
            className="w-full pl-10 pr-4 py-3 bg-gray-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>

        {/* List */}
        <div className="space-y-0 divide-y divide-gray-100 bg-surface rounded-xl overflow-hidden shadow-sm border border-gray-100">
          {filteredPatients.map((patient) => (
            <div
              key={patient.id}
              onClick={() => onSelectPatient(patient)}
              className="p-4 flex items-center active:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mr-4 shrink-0 text-text-main">
                <User size={20} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-text-main text-lg">{patient.name}</h3>
                </div>
                <div className="flex space-x-2 text-xs text-text-sub">
                  <span>{patient.roomNumber ? `Room ${patient.roomNumber}` : 'No Room'}</span>
                  <span>/</span>
                  <span>{patient.gender === 'M' ? '男性' : patient.gender === 'F' ? '女性' : ''}</span>
                  <span>/</span>
                  <span>{patient.dob}</span>
                </div>
              </div>

              <ChevronRight size={20} className="text-gray-300 ml-2" />
            </div>
          ))}
          {filteredPatients.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">
              該当する患者はいません
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 4. Recording Confirmation Modal (Overlay)
const RecordingConfirmation: React.FC<{
  patient: Patient;
  onCancel: () => void;
  onStart: () => void;
}> = ({ patient, onCancel, onStart }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center animate-[fadeIn_0.2s_ease-out]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onCancel} />

      {/* Modal Content */}
      <div className="relative w-full max-w-sm bg-background rounded-t-2xl sm:rounded-2xl p-6 pb-10 shadow-2xl animate-[slideUp_0.3s_ease-out]">
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-8 sm:hidden" />

        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 text-primary">
            <Mic size={36} fill="currentColor" className="opacity-90" />
          </div>

          <h2 className="text-xl font-bold text-text-main mb-6">録音を開始しますか？</h2>

          <div className="w-full bg-gray-200/50 rounded-xl p-4 mb-8 text-left">
            <p className="text-xs text-text-sub mb-1">対象者</p>
            <p className="text-lg font-bold text-text-main">{patient.name}</p>
            <p className="text-sm text-text-sub mt-1">ID: {String(patient.id).toUpperCase().replace('P', '12345')} / Room {patient.roomNumber || '-'}</p>
          </div>

          <div className="w-full space-y-3">
            <button
              onClick={onStart}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Mic size={20} />
              録音開始
            </button>
            <button
              onClick={() => (window as any).handlePrescriptionClick?.()}
              className="w-full bg-white border-2 border-primary text-primary hover:bg-primary/5 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <FileText size={20} />
              処方箋を取り込む
            </button>
            <button
              onClick={() => (window as any).handleDetailClick?.()}
              className="w-full bg-white border-2 border-gray-200 text-text-main hover:bg-gray-50 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <User size={20} />
              患者の詳細を見る
            </button>
            <button
              onClick={onCancel}
              className="w-full bg-transparent hover:bg-gray-100 text-gray-500 font-bold py-3.5 rounded-xl transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 4.5 Patient Detail Screen (移植版)
const PatientDetailScreen: React.FC<{
  patient: Patient;
  onBack: () => void;
  selectedEncounter: any | null;
  setSelectedEncounter: (enc: any | null) => void;
  refreshTrigger: number;
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
}> = ({ patient, onBack, selectedEncounter, setSelectedEncounter, refreshTrigger, setRefreshTrigger }) => {
  const [encounters, setEncounters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Patient Summary State
  const [patientSummary, setPatientSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Fetch Patient Summary on Mount
  useEffect(() => {
    const fetchSummary = async () => {
      setLoadingSummary(true);
      try {
        // Ask AI for a brief summary based on records
        // We pass an empty history to start fresh context-based question
        const res = await api.chatWithAI(patient.id, "この患者の医療的背景、現在の主な問題点、および直近の特記事項を、300文字以内で簡潔に要約してください。箇条書きは使わずに文章でまとめ、必ず文末を完結させてください（途中で切れないようにしてください）。", []);
        setPatientSummary(res.reply);
      } catch (e) {
        console.error("Failed to fetch patient summary", e);
        setPatientSummary("（要約の取得に失敗しました）");
      } finally {
        setLoadingSummary(false);
      }
    };
    fetchSummary();
  }, [patient.id]);

  useEffect(() => {
    const fetchEncounters = async () => {
      try {
        const token = (window as any).authService?.getToken();
        const res = await fetch(`${API_BASE}/api/encounters?patientId=${patient.id}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const json = await res.json();

        // patient.records (既存の診療録) と api.encounters (新規OCR等) を統合
        const apiEncounters = json.encounters || [];
        const patientRecords = (patient as any).records || [];

        // 重複を避けてマージ（IDが重複する場合は最新のAPI側を優先）
        const combined = [...apiEncounters];
        patientRecords.forEach((rec: any) => {
          if (!combined.some(c => c.id === (rec.id || rec.encounterId))) {
            // patient.records は異なる構造（date, transcript等）の場合があるため変換
            combined.push({
              id: rec.id || rec.encounterId,
              source: rec.source || 'RECORDING',
              createdAt: rec.date || rec.createdAt,
              summary: rec.summary || rec.clinicalData?.summary || '',
              ...rec
            });
          }
        });

        // 日付順ソート
        combined.sort((a, b) => {
          const dateA = a.date || a.createdAt || '';
          const dateB = b.date || b.createdAt || '';
          return dateB.localeCompare(dateA);
        });

        setEncounters(combined);
        // Refresh selectedEncounter if it is currently open
        setSelectedEncounter((prev: any) => {
          if (!prev) return prev;
          const updated = combined.find(c => c.id === prev.id);
          return updated || prev;
        });
      } catch (e) {
        console.error(e);
        // 失敗しても既存のレコードがあれば表示
        setEncounters((patient as any).records || []);
      } finally {
        setLoading(false);
      }
    };
    fetchEncounters();

    // Auto-refresh polling every 10 seconds to catch ANALYZING -> COMPLETED
    const intervalId = setInterval(fetchEncounters, 10000);
    return () => clearInterval(intervalId);
  }, [patient.id, refreshTrigger]); // [UPDATED] refreshTriggerを追加

  return (
    <div className="min-h-screen bg-background relative">
      <Header title="患者詳細" showBack onBack={onBack} />
      <div className="p-4">
        <div className="bg-surface p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-primary">
              <User size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-main">{patient.name} 様</h2>
              <p className="text-xs text-text-sub">
                {patient.gender === 'M' ? '男性' : '女性'} / {patient.dob} 生まれ
              </p>
            </div>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between text-sm text-text-sub">
          <span>Room: {patient.roomNumber || '-'}</span>
          <span>ID: {patient.id}</span>
        </div>
      </div>

      {/* AI Patient Summary Section */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-100 shadow-sm mb-6 animate-in fade-in duration-700">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-emerald-600" />
          <h3 className="font-bold text-sm text-emerald-800">AI患者サマリー</h3>
        </div>
        {loadingSummary ? (
          <div className="flex items-center gap-2 text-emerald-600/70 text-xs py-2">
            <Loader2 size={14} className="animate-spin" />
            <span>情報を分析して要約中...</span>
          </div>
        ) : (
          <p className="text-sm text-emerald-900 leading-relaxed font-medium">
            {patientSummary || "情報が不足しているため要約できませんでした。"}
          </p>
        )}
      </div>

      <h3 className="font-bold text-text-main mb-3 ml-1">診療・処方履歴</h3>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
      ) : encounters.length === 0 ? (
        <div className="text-center py-10 text-gray-400">履歴はありません</div>
      ) : (
        <div className="space-y-3">
          {encounters.map((enc) => (
            <div
              key={enc.id}
              onClick={() => setSelectedEncounter(enc)}
              className="bg-surface p-4 rounded-xl shadow-sm border border-gray-100 active:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-0.5 rounded">
                  {enc.source === 'OCR' ? '処方箋OCR' : '音声録音'}
                </span>
                <span className="text-xs text-gray-400">
                  {enc.createdAt ? new Date(enc.createdAt).toLocaleDateString('ja-JP') : '-'}
                </span>
              </div>
              <p className="text-sm text-text-main line-clamp-2">
                {enc.status === 'ANALYZING' ? (
                  <span className="flex items-center text-primary animate-pulse font-medium"><Loader2 size={16} className="animate-spin mr-1" />文字起こし完了・要約中...</span>
                ) : enc.source === 'OCR' ? '処方情報を取り込みました' : (enc.summary || enc.clinicalData?.summary || '診断録作成済み')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* --- 詳細オーバーレイ --- */}
      {selectedEncounter && (
        <div className="fixed inset-0 z-[70] flex flex-col animate-[fadeIn_0.2s_ease-out]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedEncounter(null)} />
          <div className="relative mt-14 flex-1 bg-background rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-[slideUp_0.3s_ease-out]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-0.5 rounded">
                  {selectedEncounter.source === 'OCR' ? '処方箋OCR' : '音声録音'}
                </span>
                <span className="text-sm font-bold text-text-main">
                  {selectedEncounter.createdAt ? new Date(selectedEncounter.createdAt).toLocaleDateString('ja-JP') : '-'} の詳細
                </span>
              </div>
              <button
                onClick={() => setSelectedEncounter(null)}
                className="p-2 text-gray-400 hover:text-text-main"
              >
                <Plus className="rotate-45" size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-10">
              {selectedEncounter.source === 'OCR' ? (
                /* --- OCR Details --- */
                <div className="space-y-6">
                  <div className="bg-surface p-4 rounded-xl border border-gray-100">
                    <p className="text-xs text-text-sub mb-1">医療機関</p>
                    <p className="font-bold text-text-main">{selectedEncounter.data?.institutionName || selectedEncounter.institutionName || '-'}</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-3">処方薬一覧</h4>
                    <div className="space-y-3">
                      {(selectedEncounter.data?.medications || selectedEncounter.medications || []).map((med: any, i: number) => (
                        <div key={i} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                          <p className="font-bold text-primary mb-1">{med.name}</p>
                          <p className="text-xs text-text-main">
                            {med.dosage} / {med.usage} / {med.duration}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (selectedEncounter.status === 'ANALYZING' || selectedEncounter.status === 'PROCESSING') ? (
                /* --- RECORDING Details (ANALYZING or PROCESSING) --- */
                <div className="space-y-6">
                  <div className="bg-primary/5 border border-primary/20 p-6 rounded-xl text-center">
                    <Loader2 size={32} className="animate-spin text-primary mx-auto mb-3" />
                    <h4 className="font-bold text-primary mb-2">
                      {selectedEncounter.status === 'PROCESSING' ? '音声を文字起こし中...' : 'AI要約中...'}
                    </h4>
                    <p className="text-sm text-text-sub">
                      {selectedEncounter.status === 'PROCESSING'
                        ? '録音データを解析しています。このままお待ちください。'
                        : '文字起こしは完了しました。現在、AIが要約を生成しています。'}
                    </p>
                  </div>
                  {/* Transcript (Immediately available if ANALYZING) */}
                  {(selectedEncounter.transcript) && (
                    <div className="bg-surface p-4 rounded-xl border border-gray-100">
                      <label className="text-xs font-bold text-primary block mb-3 flex items-center gap-1">
                        <FileText size={14} /> 音声文字起こし
                      </label>
                      <p className="text-sm text-text-main leading-relaxed whitespace-pre-wrap">
                        {selectedEncounter.transcript}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* --- RECORDING Details (SOAP) --- */
                <div className="space-y-6">
                  {/* Summary Card */}
                  <div className="bg-primary/5 border border-primary/10 p-4 rounded-xl">
                    <h4 className="text-xs font-bold text-primary mb-2 flex items-center gap-1">
                      <FileText size={14} /> 要約
                    </h4>
                    <p className="text-sm text-text-main leading-relaxed">
                      {selectedEncounter.summary || selectedEncounter.clinicalData?.summary || '要約なし'}
                    </p>
                  </div>

                  {/* Changes Highlight */}
                  {selectedEncounter.changes_from_last_time && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                      <h4 className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1 uppercase tracking-wider">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        前回からの主な変更点
                      </h4>
                      <p className="text-sm text-amber-900 font-medium leading-relaxed">
                        {selectedEncounter.changes_from_last_time}
                      </p>
                    </div>
                  )}

                  {/* SOAP Sections */}
                  <div className="space-y-4">
                    {[
                      { label: 'S (主訴)', content: selectedEncounter.clinicalData?.soap?.s || selectedEncounter.soap?.s || selectedEncounter.s },
                      { label: 'O (客観)', content: selectedEncounter.clinicalData?.soap?.o || selectedEncounter.soap?.o || selectedEncounter.o },
                      { label: 'A (評価)', content: selectedEncounter.clinicalData?.soap?.a || selectedEncounter.soap?.a || selectedEncounter.a },
                      { label: 'P (計画)', content: selectedEncounter.clinicalData?.soap?.p || selectedEncounter.soap?.p || selectedEncounter.p },
                    ].map((sec, i) => (
                      <div key={i} className="bg-surface p-4 rounded-xl border border-gray-100">
                        <label className="text-xs font-bold text-primary block mb-2">{sec.label}</label>
                        <p className="text-sm text-text-main whitespace-pre-wrap leading-relaxed">
                          {sec.content || '記載なし'}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Transcript (Optional) */}
                  {(selectedEncounter.transcript) && (
                    <div className="pt-4 border-t border-gray-100">
                      <label className="text-xs font-bold text-text-sub block mb-2">音声書き起こし</label>
                      <p className="text-xs text-text-sub italic whitespace-pre-wrap leading-relaxed">
                        {selectedEncounter.transcript}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )
      }
      <PatientChatBot patientId={patient.id} patientName={patient.name} />
    </div >
  );
};

// 4.6 Prescription Import Screen
const PrescriptionImportScreen: React.FC<{
  patient: Patient;
  onBack: () => void;
  onComplete: () => void;
}> = ({ patient, onBack, onComplete }) => {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<any | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!image) return;
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('image', image);
      const res = await fetch(`${API_BASE}/api/ocr/prescription`, {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (json.ok) {
        setOcrResult(json.data);
      } else {
        alert(`OCRに失敗しました: ${json.error || '不明なエラー'}`);
      }
    } catch (e: any) {
      console.error(e);
      alert(`通信エラーが発生しました: ${e.message || 'サーバーに接続できません'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    // 最終的にバックエンドに保存する処理
    try {
      const token = (window as any).authService?.getToken();
      await fetch(`${API_BASE}/api/encounters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          patientId: patient.id,
          facilityId: patient.facilityId,
          source: 'OCR',
          data: ocrResult
        })
      });
      onComplete();
    } catch (e) {
      console.error(e);
      alert('保存に失敗しました');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header title="処方箋取り込み" showBack onBack={onBack} />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {!ocrResult ? (
          <>
            <div className="aspect-[3/4] bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden relative">
              {preview ? (
                <img src={preview} alt="Preview" className="w-full h-full object-contain" />
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <Building2 className="text-gray-400" />
                  </div>
                  <p className="text-sm font-bold text-gray-400">処方箋を撮影してください</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileChange}
                disabled={isProcessing}
              />
            </div>

            <button
              onClick={handleUpload}
              disabled={!image || isProcessing}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl shadow-lg disabled:bg-gray-300 disabled:shadow-none flex items-center justify-center gap-2 transition-all"
            >
              {isProcessing ? <><Loader2 className="animate-spin" /> 解析中...</> : '画像を解析する'}
            </button>
          </>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-surface p-5 rounded-2xl shadow-sm border border-gray-100">
              <h4 className="font-bold text-primary text-sm mb-4">解析された処方情報</h4>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-text-sub block mb-1">医療機関</label>
                  <input
                    className="w-full bg-gray-50 border-none rounded-lg p-2 font-bold"
                    value={ocrResult.institutionName}
                    onChange={e => setOcrResult({ ...ocrResult, institutionName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-text-sub block mb-1">処方日</label>
                  <input
                    type="date"
                    className="w-full bg-gray-50 border-none rounded-lg p-2 font-bold"
                    value={ocrResult.prescriptionDate}
                    onChange={e => setOcrResult({ ...ocrResult, prescriptionDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-text-main text-sm ml-1">処方薬一覧</h4>
              {ocrResult.medications.map((med: any, idx: number) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative group">
                  <div className="mb-2">
                    <input
                      className="w-full font-bold text-lg border-none p-0 focus:ring-0"
                      value={med.name}
                      onChange={e => {
                        const newMeds = [...ocrResult.medications];
                        newMeds[idx].name = e.target.value;
                        setOcrResult({ ...ocrResult, medications: newMeds });
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="text-[10px] text-text-sub block uppercase font-bold mb-0.5">用量</label>
                      <input
                        className="w-full bg-gray-50 border-none rounded p-1.5"
                        value={med.dosage}
                        onChange={e => {
                          const newMeds = [...ocrResult.medications];
                          newMeds[idx].dosage = e.target.value;
                          setOcrResult({ ...ocrResult, medications: newMeds });
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-sub block uppercase font-bold mb-0.5">用法</label>
                      <input
                        className="w-full bg-gray-50 border-none rounded p-1.5"
                        value={med.usage}
                        onChange={e => {
                          const newMeds = [...ocrResult.medications];
                          newMeds[idx].usage = e.target.value;
                          setOcrResult({ ...ocrResult, medications: newMeds });
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 flex gap-4">
              <button
                onClick={() => setOcrResult(null)}
                className="flex-1 bg-gray-100 text-text-sub font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors"
              >
                再撮影
              </button>
              <button
                onClick={handleSave}
                className="flex-[2] bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 hover:bg-primary-dark transition-all"
              >
                この内容で保存する
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const RecordingScreen: React.FC<{
  patient: Patient;
  facility: Facility;
  currentUser: AuthUser | null;
  onStop: (result?: SoapResult) => void;
  onDiscard: () => void;
}> = ({ patient, facility, currentUser, onStop, onDiscard }) => {
  // フックから必要なものを取り出す
  const {
    isRecording,
    isProcessing,
    statusText,
    startRecording,
    stopRecording,
    cancelRecording
  } = useRecorder(patient.id);

  const skipResultRef = useRef(false);
  const [seconds, setSeconds] = useState(0);

  // マウント時の処理（録音開始）とアンマウント時の処理（キャンセル）
  useEffect(() => {
    startRecording({
      patientId: patient.id,
      patientName: patient.name,
      facilityId: facility.id,
      facilityName: facility.name,
      recordedById: currentUser?.uid,
      recordedByName: currentUser?.displayName,
      recordedByRole: currentUser?.role
    });
    return () => {
      cancelRecording(); // 画面を離れたら強制停止
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // タイマー
  useEffect(() => {
    let interval: number | undefined;
    if (isRecording) {
      interval = window.setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')} : ${mins.toString().padStart(2, '0')} : ${secs.toString().padStart(2, '0')}`;
  };

  // 停止ボタンが押されたとき
  const handleStopAndSave = async () => {
    // ポーリングを有効にしてAI要約を待つ
    const result = await stopRecording({
      patientId: patient.id,
      patientName: patient.name,
      facilityId: facility.id,
      facilityName: facility.name,
      recordedById: currentUser?.uid,
      recordedByName: currentUser?.displayName
    });

    // 結果ができたら親に戻す（=判断画面を表示）
    onStop(result as SoapResult);
  };

  const handleDiscard = async () => {
    cancelRecording(); // 保存せずに切る
    onDiscard();
  };

  // ビジュアライザー用
  const bars = Array.from({ length: 40 });

  return (
    <div className="fixed inset-0 bg-[#0F172A] text-white flex flex-col z-50">
      <header className="h-14 flex items-center px-4 relative justify-center">
        {/* 処理中は戻るボタンを無効化 */}
        <button
          onClick={handleDiscard}
          disabled={isProcessing}
          className={`absolute left-4 p-2 transition-colors ${isProcessing ? 'text-gray-600' : 'text-gray-400 hover:text-white'}`}
        >
          <ChevronLeft size={24} />
        </button>
        <span className="font-bold text-base">録音</span>
      </header>

      <div className="flex-1 flex flex-col items-center pt-10 px-6">
        <p className="text-gray-400 text-sm mb-2">患者名</p>
        <h2 className="text-3xl font-bold mb-6">{patient.name} 様</h2>

        {/* ステータス表示エリア */}
        <div className="flex items-center space-x-2 mb-10 h-6">
          {isProcessing ? (
            // ポーリング中などのローディング表示
            <div className="flex items-center space-x-2 text-blue-400">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-base font-bold animate-pulse">{statusText}</span>
            </div>
          ) : (
            // 通常の録音中表示
            <>
              <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
              <span className={`text-base font-medium ${isRecording ? 'text-red-500' : 'text-gray-400'}`}>
                {statusText || (isRecording ? '録音中' : '準備中...')}
              </span>
            </>
          )}
        </div>

        <div className="text-6xl font-mono font-bold tracking-wider mb-20 tabular-nums">
          {formatTime(seconds)}
        </div>

        {/* Visualizer */}
        <div className="h-16 flex items-center justify-center space-x-[4px] w-full max-w-sm mb-auto">
          {bars.map((_, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-150 ease-in-out ${i % 2 === 0 ? 'bg-blue-500' : 'bg-blue-400'}`}
              style={{
                height: isRecording ? `${Math.max(8, Math.random() * 64)}px` : '4px',
                opacity: isRecording ? 0.4 + Math.random() * 0.6 : 0.2
              }}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="w-full pb-12 flex flex-col items-center space-y-10">
          <button
            onClick={handleStopAndSave}
            disabled={isProcessing || !isRecording}
            className={`w-full max-w-sm font-bold py-4 rounded-xl flex items-center justify-center space-x-3 transition-colors active:scale-[0.98] ${isProcessing || !isRecording
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-primary hover:bg-primary-dark text-white shadow-lg shadow-blue-500/30'
              }`}
          >
            {isProcessing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>保存中...</span>
              </>
            ) : (
              <>
                <Square size={18} fill="currentColor" />
                <span>保存</span>
              </>
            )}
          </button>

          <button
            onClick={handleDiscard}
            className={`text-sm flex items-center space-x-2 py-2 ${isProcessing ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white'}`}
            disabled={isProcessing}
          >
            <Trash2 size={16} />
            <span>録音を破棄</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// 6. Result Screen
const ResultScreen: React.FC<{
  result: SoapResult;
  patient: Patient;
  onHome: () => void;
}> = ({ result, patient, onHome }) => {
  const [copied, setCopied] = useState(false);

  // コピー機能
  const handleCopy = () => {
    if (result.report_100) {
      navigator.clipboard.writeText(result.report_100).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <Header title="結果確認" />

      <div className="p-4 space-y-6">

        {/* Patient Info */}
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-primary">
            <User size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-main">{patient.name} 様</h2>
            <p className="text-xs text-text-sub">録音完了</p>
          </div>
        </div>

        {/* 100文字要約 (Copy対象) */}
        <div className="bg-surface rounded-xl border-2 border-primary/20 overflow-hidden shadow-sm">
          <div className="bg-primary/5 px-4 py-2 border-b border-primary/10 flex justify-between items-center">
            <div className="flex items-center space-x-2 text-primary font-bold text-sm">
              <FileText size={16} />
              <span>レセコン報告書用 (100文字)</span>
            </div>
            <button
              onClick={handleCopy}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copied
                ? 'bg-green-500 text-white'
                : 'bg-primary text-white hover:bg-primary-dark shadow-md active:scale-95'
                }`}
            >
              {copied ? (
                <>
                  <Check size={14} />
                  <span>コピー完了</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>コピー</span>
                </>
              )}
            </button>
          </div>
          <div className="p-4">
            <p className="text-text-main text-base leading-relaxed whitespace-pre-wrap font-medium">
              {result.report_100 || "（要約なし）"}
            </p>
          </div>
        </div>

        {/* SOAP Display */}
        <div className="space-y-4">
          <h3 className="font-bold text-text-main text-lg ml-1">SOAP ドラフト</h3>

          <div className="bg-surface rounded-xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100">
            {[
              { label: 'S (主訴)', content: result.soap?.s },
              { label: 'O (客観)', content: result.soap?.o },
              { label: 'A (評価)', content: result.soap?.a },
              { label: 'P (計画)', content: result.soap?.p },
            ].map((section, idx) => (
              <div key={idx} className="p-4">
                <span className="block text-xs font-bold text-primary mb-1.5">{section.label}</span>
                <p className="text-sm text-text-main whitespace-pre-wrap leading-relaxed">
                  {section.content || "（記載なし）"}
                </p>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onHome}
          className="w-full bg-gray-200 hover:bg-gray-300 text-text-main font-bold py-3.5 rounded-xl transition-colors mt-4"
        >
          ホームへ戻る
        </button>
      </div>
    </div>
  );
};

// --- Main App Component ---

import { authService, User as AuthUser } from './services/authService';

// ... (Constants imports)

// --- Main App Component ---

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.LOGIN);
  const [recordingResult, setRecordingResult] = useState<SoapResult | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'neutral' } | null>(null);
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);
  const [selectedEncounter, setSelectedEncounter] = useState<any | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // --- Initial Setup & Effects ---
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Check if it's iOS and not running in standalone mode (not added to home screen)
    const isIos = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };

    // Check if running in standalone mode (Added to Home Screen)
    const isInStandaloneMode = () =>
      ('standalone' in window.navigator) && ((window.navigator as any).standalone) ||
      window.matchMedia('(display-mode: standalone)').matches;

    // Show prompt if it's a mobile device but not installed
    if (/mobile/i.test(window.navigator.userAgent) && !isInStandaloneMode()) {
      // Don't show immediately every time, maybe check localStorage
      const hasDismissed = localStorage.getItem('pwa_prompt_dismissed');
      if (!hasDismissed) {
        setShowPwaPrompt(true);
      }
    }
  }, []);

  const dismissPwaPrompt = () => {
    localStorage.setItem('pwa_prompt_dismissed', 'true');
    setShowPwaPrompt(false);
  };

  // グローバル関数としての定義（RecordingConfirmationから呼ぶため）
  useEffect(() => {
    (window as any).handlePrescriptionClick = () => {
      setCurrentScreen(Screen.PRESCRIPTION_IMPORT);
    };
    (window as any).handleDetailClick = () => {
      setCurrentScreen(Screen.PATIENT_DETAIL);
    };
    (window as any).authService = authService;
  }, []);

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);



  // Pass current user ID to recorder
  const {
    isRecording,
    isProcessing,
    statusText,
    startRecording,
    stopRecording,
    cancelRecording
  } = useRecorder(currentUser?.uid || 'anonymous');

  useEffect(() => {
    // Check Auth Status on Mount
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setIsAuthChecking(false);
      if (user) {
        if (currentScreen === Screen.LOGIN) {
          setCurrentScreen(Screen.FACILITY_LIST);
        }
        fetchData();
      } else {
        setCurrentScreen(Screen.LOGIN);
      }
    });
    return () => unsubscribe();
  }, []); // Run once on mount

  // Fetch Data from Backend
  const fetchData = async () => {
    try {
      const token = authService.getToken();
      if (!token) return;

      const headers = {
        'Authorization': `Bearer ${token}`
      };

      const [facRes, patRes] = await Promise.all([
        // `app.get("/facilities", ...)` at line 681.
        // So it is at ROOT `/facilities`.
        // BUT dashboard `api.ts` was pointing to `/api`.
        // If Dashboard was working, maybe there is a proxy? Or I misread server.js structure vs index.js usage.
        // Let's check server.js imports again.
        // It does NOT import ./routes/index.js.
        // So the ROUTES in `server.js` are THE routes.
        // `app.get("/facilities")` -> `/facilities`.
        // `app.post("/sign-upload")` -> `/sign-upload`.
        // `app.post("/finalize")` -> `/finalize`.
        // `app.get("/jobs/:id")` -> `/jobs/:id`.
        // 
        // So for "Real" backend (server.js):
        // Facilities: `/facilities`
        // Patients: `/patients`
        // Auth: server.js DOES NOT HAVE AUTH ROUTES (`/auth/login`).
        // 
        // OH NO. The `server.js` I saw earlier contains NO AUTH CONTROLLER logic.
        // But I previously implemented `authController.js` and `authRoutes.js`.
        // **Are they not hooked up in `server.js`?**
        // 
        // I need to check if `server.js` uses `routes/index.js`.
        // Looking at file 2140 (server.js):
        // It DOES NOT require `./routes`.
        // It defines routes directly at the bottom.
        // 
        // **CRITICAL FINDING**: The `server.js` running is the "MVP" server.js, not using the modular routes I worked on for "Custom Auth".
        // OR the user has multiple server files?
        // The previous conversation history references editing `backend/src/routes/index.js` and `authController.js`.
        // But `server.js` (Step 2140) doesn't seems to use them.
        // 
        // Wait, look at `package.json` -> `scripts`. `npm start` vs `npm run dev`.
        // Maybe `npm start` runs `server.js` (MVP) and `npm run dev` runs something else?
        // Or I edited files that are not being used.
        // 
        // I need to enable the modular routes in `server.js` or switch to the server that uses them.
        // 
        // For now, I will write the Frontend code assuming `/api/facilities` (Modular) style, 
        // AND I WILL FIX SERVER.JS NEXT.

        fetch(`${API_BASE}/api/facilities`, { headers }),
        fetch(`${API_BASE}/api/patients`, { headers })
      ]);

      // ... (Error handling remains same)
      const facJson = await facRes.json();
      const patJson = await patRes.json();

      if (facRes.ok) {
        if (Array.isArray(facJson.facilities)) {
          setFacilities(facJson.facilities);
        } else if (Array.isArray(facJson)) {
          setFacilities(facJson);
        } else {
          setFacilities([]);
        }
      }

      if (patRes.ok) {
        if (Array.isArray(patJson.patients)) {
          setPatients(patJson.patients);
        } else if (Array.isArray(patJson)) {
          setPatients(patJson);
        } else {
          setPatients([]);
        }
      }

    } catch (e) {
      console.error("Failed to fetch data", e);
      // Fallback
      setFacilities(MOCK_FACILITIES);
      setPatients(MOCK_PATIENTS);
    }
  };

  const showToast = (message: string, type: 'success' | 'neutral') => {
    setToast({ message, type });
  };

  // Flow handlers
  const handleLogin = async () => {
    // Passed to LoginScreen, which calls it on success?
    // Not quite. LoginScreen needs to accept input and call authService.
    // I need to modify LoginScreen signature or behavior.
    // For now, keep handleLogin as "Post-Login Transition".
    // But LoginScreen component needs to specificially call authService.login.
    // I will modify LoginScreen component below inside App.tsx or assuming I can edit it here.
    // Wait, LoginScreen is defined INSIDE App.tsx in the views I saw?
    // Yes, lines 85+.
    // I can't easily edit it via this MultiReplace if it's a huge block.
    // I'll make LoginScreen a separate component or edit it in place.
    // 
    // Let's just update `handleLogin` to be void (transition) and Update LoginScreen to do the work.
    setCurrentScreen(Screen.FACILITY_LIST);
  };

  // ... rest of handlers ...

  if (isAuthChecking) return <DataLoadingScreen />; // Show loading while checking auth

  const handleLogout = () => {
    // ログアウト処理（もし認証トークンがあればここでクリア）
    // authService.logout(); 
    setCurrentScreen(Screen.LOGIN);
    showToast('ログアウトしました', 'neutral');
  };

  const handleSelectFacility = (facility: Facility) => {
    setSelectedFacility(facility);
    setCurrentScreen(Screen.PATIENT_LIST);
  };

  const handleBackToFacilities = () => {
    setSelectedFacility(null);
    setCurrentScreen(Screen.FACILITY_LIST);
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setCurrentScreen(Screen.RECORDING_CONFIRM);
  };

  const handleCancelRecording = () => {
    setCurrentScreen(Screen.PATIENT_LIST);
    setTimeout(() => setSelectedPatient(null), 300);
  };

  const handleStartRecording = () => {
    // ユーザーへの直接のClickイベントの延長線上で、iOSのバックグラウンドオーディオハックを初期化する
    initSilentAudio();
    setCurrentScreen(Screen.RECORDING);
  };

  const handleStopRecording = (result?: SoapResult) => {
    // 重要な修正：まず前の結果をクリアする
    setRecordingResult(null);

    // 以前のセッションからの遅延結果を無視する（データ混同の防止）
    // （resultが渡された場合は意図的な表示だが、現在はskipPollingにより
    //   基本的には result は undefined で呼ばれるはず）

    // Return to patient detail screen
    setCurrentScreen(Screen.PATIENT_DETAIL);

    // 録音後のレコードに自動でフォーカスする
    if ((result as any)?.encounterId) {
      const targetId = (result as any).encounterId;
      // まずリストに存在しない場合でも、「処理中」として詳細を開く
      setSelectedEncounter({
        id: targetId,
        status: 'PROCESSING',
        source: 'RECORDING',
        createdAt: new Date().toISOString(),
        transcript: ''
      } as any);

      // リスト自体も即時更新をかける
      setRefreshTrigger(v => v + 1);
    }

    showToast('録音を保存しました。間もなく文字起こしが表示されます。', 'success');
  };

  const handleDiscardRecording = () => {
    setCurrentScreen(Screen.PATIENT_LIST);
    setSelectedPatient(null);
    showToast('録音は破棄されました', 'neutral');
  };

  const handleConfirmJudgment = async (judgment: JudgmentType, summaries: any) => {
    try {
      if (recordingResult?.jobId) {
        await fetch(`${API_BASE}/jobs/${recordingResult.jobId}/judgment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ judgment, summaries })
        });
        showToast(`「${judgment === 'shared_not_needed' ? '共有不要' : judgment === 'watch_and_wait' ? '様子見' : '医師共有検討'}」として記録しました`, 'success');
      } else {
        showToast("Job IDが見つかりませんでしたが、ローカルで完了としました", 'neutral');
      }
    } catch (e) {
      console.error("Save failed", e);
      showToast("保存に失敗しましたが、画面を戻します", 'neutral');
    }

    setRecordingResult(null);
    setSelectedPatient(null);
    setCurrentScreen(Screen.PATIENT_LIST);
  };

  return (
    <div className="font-sans text-text-main">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* PWA Install Prompt Banner */}
      {showPwaPrompt && (
        <div className="bg-primary/10 text-primary px-4 py-3 flex items-start justify-between border-b border-primary/20 sticky top-0 z-50 backdrop-blur-md">
          <div className="flex-1 mr-4">
            <h4 className="font-bold text-sm mb-1">ホーム画面に追加して安定動作</h4>
            <p className="text-xs text-primary/80 leading-relaxed">
              ブラウザの「共有」ボタンから「ホーム画面に追加」をタップすると、バックグラウンドでの録音が切れにくくなります。
            </p>
          </div>
          <button
            onClick={dismissPwaPrompt}
            className="p-1 bg-primary/20 rounded-full text-primary hover:bg-primary/30 mt-1"
          >
            <Plus size={16} className="rotate-45" />
          </button>
        </div>
      )}

      {currentScreen === Screen.LOGIN && (
        <LoginScreen onLogin={handleLogin} />
      )}

      {currentScreen === Screen.FACILITY_LIST && (
        <FacilityListScreen
          facilities={facilities}
          onSelectFacility={handleSelectFacility}
          onLogout={handleLogout}
        />
      )}

      {currentScreen === Screen.PATIENT_LIST && selectedFacility && (
        <PatientListScreen
          facility={selectedFacility}
          patients={patients}
          onBack={handleBackToFacilities}
          onSelectPatient={handleSelectPatient}
        />
      )}

      {currentScreen === Screen.RECORDING_CONFIRM && selectedPatient && selectedFacility && (
        <>
          <PatientListScreen
            facility={selectedFacility}
            patients={patients}
            onBack={handleBackToFacilities}
            onSelectPatient={() => { }}
          />

          <RecordingConfirmation
            patient={selectedPatient}
            onCancel={handleCancelRecording}
            onStart={handleStartRecording}
          />
        </>
      )}

      {currentScreen === Screen.RECORDING && selectedPatient && selectedFacility && (
        <RecordingScreen
          patient={selectedPatient}
          facility={selectedFacility}
          currentUser={currentUser}
          onStop={handleStopRecording}
          onDiscard={handleDiscardRecording}
        />
      )}

      {currentScreen === Screen.RESULT && recordingResult && selectedPatient && (
        <JudgmentScreen
          result={recordingResult}
          patient={selectedPatient}
          onConfirm={handleConfirmJudgment}
        />
      )}

      {currentScreen === Screen.PATIENT_DETAIL && selectedPatient && (
        <PatientDetailScreen
          patient={selectedPatient}
          onBack={() => {
            setCurrentScreen(Screen.PATIENT_LIST);
            setSelectedPatient(null);
          }}
          selectedEncounter={selectedEncounter}
          setSelectedEncounter={setSelectedEncounter}
          refreshTrigger={refreshTrigger}
          setRefreshTrigger={setRefreshTrigger}
        />
      )}

      {currentScreen === Screen.PRESCRIPTION_IMPORT && selectedPatient && (
        <PrescriptionImportScreen
          patient={selectedPatient}
          onBack={() => setCurrentScreen(Screen.PATIENT_LIST)}
          onComplete={() => {
            showToast('処方箋を取り込みました', 'success');
            setCurrentScreen(Screen.PATIENT_LIST);
            setSelectedPatient(null);
          }}
        />
      )}
    </div >
  );
}