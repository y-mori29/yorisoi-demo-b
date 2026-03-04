import { Facility, Patient } from './types';

export const MOCK_FACILITIES: Facility[] = [
  { id: 'f_demo', name: 'デモ用ケアセンター', type: '介護付き有料老人ホーム' },
  { id: '2', name: 'グループホームほしぞら', type: 'グループホーム' },
  { id: '3', name: '特別養護老人ホームさくら', type: '特別養護老人ホーム' },
  { id: '4', name: 'デイサービスあさひ', type: '通所介護' },
  { id: '5', name: '訪問看護ステーションみらい', type: '訪問看護' },
];

export const MOCK_PATIENTS: Patient[] = [
  { id: 'p1_demo', facilityId: 'f_demo', name: '山田 太郎', dob: '1945年4月1日', roomNumber: '101', status: 'completed' },
  { id: 'p2_demo', facilityId: 'f_demo', name: '鈴木 花子', dob: '1945年5月5日', roomNumber: '102', status: 'incomplete' },
  { id: 'p3_demo', facilityId: 'f_demo', name: '佐藤 健太', dob: '1960年10月10日', roomNumber: '103', status: 'completed' },
  { id: 'p4_demo', facilityId: 'f_demo', name: '高橋 ウメ', dob: '1930年3月3日', roomNumber: '104', status: 'incomplete' },
  { id: 'p5_demo', facilityId: 'f_demo', name: '田中 次郎', dob: '1955年8月8日', roomNumber: '105', status: 'incomplete' },
];