"use client";
import { useState } from 'react';
import Link from 'next/link';

export default function ProfilePage() {
  const [user, setUser] = useState({
    name: '김대언',
    email: 'asdxl1030@naver.com',
    timeZone: 'Asia/Seoul',
    workingHoursPerDay: 4,
    workingDays: ['월', '화', '수', '목', '금'],
  });

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(user);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUser(formData);
    setIsEditing(false);
    // 실제 구현에서는 여기서 Supabase에 데이터를 저장합니다
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">프로필</h1>
        <Link href="/dashboard" className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-700">
          대시보드로 이동
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        {!isEditing ? (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">사용자 정보</h2>
              <button
                onClick={() => setIsEditing(true)}
                className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                편집
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-gray-500">이름</p>
                <p className="font-medium">{user.name}</p>
              </div>
              <div>
                <p className="text-gray-500">이메일</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-gray-500">시간대</p>
                <p className="font-medium">{user.timeZone}</p>
              </div>
              <div>
                <p className="text-gray-500">일일 근무 시간</p>
                <p className="font-medium">{user.workingHoursPerDay}시간</p>
              </div>
              <div>
                <p className="text-gray-500">근무일</p>
                <p className="font-medium">{user.workingDays.join(', ')}</p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 className="text-xl font-semibold mb-6">프로필 편집</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-gray-500 mb-1">
                  이름
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-gray-500 mb-1">
                  이메일
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label htmlFor="timeZone" className="block text-gray-500 mb-1">
                  시간대
                </label>
                <input
                  type="text"
                  id="timeZone"
                  name="timeZone"
                  value={formData.timeZone}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label htmlFor="workingHoursPerDay" className="block text-gray-500 mb-1">
                  일일 근무 시간
                </label>
                <input
                  type="number"
                  id="workingHoursPerDay"
                  name="workingHoursPerDay"
                  value={formData.workingHoursPerDay}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  저장
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
