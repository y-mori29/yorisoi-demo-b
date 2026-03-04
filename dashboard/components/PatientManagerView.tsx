import React, { useState } from 'react';
import { Patient, Facility } from '../types';
import { api } from '../services/api';
import { AssignFacilityModal } from './AssignFacilityModal';

interface PatientManagerViewProps {
    patients: Patient[];
    facilities: Facility[];
    onUpdate: () => void;
    onSelectPatient?: (patient: Patient) => void;
}

export const PatientManagerView: React.FC<PatientManagerViewProps> = ({
    patients,
    facilities,
    onUpdate,
    onSelectPatient
}) => {
    const [assignModalState, setAssignModalState] = useState<{ isOpen: boolean, patientId: string, patientName: string }>({
        isOpen: false, patientId: '', patientName: ''
    });

    const handleDelete = async (patientId: string, name: string) => {
        if (!confirm(`${name} さんのデータを削除しますか？\nこの操作は取り消せません。`)) return;
        try {
            await api.deletePatient(patientId);
            onUpdate();
        } catch (e) {
            console.error(e);
            alert('削除に失敗しました');
        }
    };

    const handleAssignClick = (patient: Patient) => {
        setAssignModalState({
            isOpen: true,
            patientId: patient.id,
            patientName: patient.name
        });
    };

    const getFacilityName = (id: string) => {
        const fac = facilities.find(f => f.id === id);
        return fac ? fac.name : '未所属';
    };

    return (
        <div className="p-6 overflow-y-auto h-full bg-gray-50">
            <h2 className="text-xl font-bold text-gray-800 mb-6">患者一覧・管理</h2>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">氏名</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">年齢・性別</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">所属施設</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {patients.map(patient => (
                            <tr key={patient.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onSelectPatient && onSelectPatient(patient)}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="font-bold text-gray-900 hover:text-teal-600 transition-colors">{patient.name}</div>
                                    <div className="text-xs text-gray-500">{patient.kana}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {patient.age}歳 ({patient.gender === 'male' ? '男性' : '女性'})
                                    <div className="text-xs text-gray-400">{patient.birthDate}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {getFacilityName(patient.facility_id)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => handleAssignClick(patient)}
                                        className="text-teal-600 hover:text-teal-900 mr-4 font-bold"
                                    >
                                        施設へ割当
                                    </button>
                                    <button
                                        onClick={() => handleDelete(patient.id, patient.name)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        削除
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {patients.length === 0 && (
                    <div className="p-8 text-center text-gray-400">患者データがありません</div>
                )}
            </div>

            <AssignFacilityModal
                isOpen={assignModalState.isOpen}
                onClose={() => setAssignModalState(prev => ({ ...prev, isOpen: false }))}
                patientId={assignModalState.patientId}
                patientName={assignModalState.patientName}
                facilities={facilities}
                onAssign={onUpdate}
            />
        </div>
    );
};
