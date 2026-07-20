'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { PreviousIdea } from '@/lib/index';
import { getUserVirtualProfile } from '@/lib/profile';
import Link from 'next/link';

interface Room {
  id: string;
  title?: string;
  max_participants?: number;
}

export default function RoomResultPage() {
  const params = useParams();
  const roomId = params.id as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [allResults, setAllResults] = useState<PreviousIdea[]>([]);
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [loadingResults, setLoadingResults] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // 1. 部屋情報・参加者数の取得
  useEffect(() => {
    if (!roomId) return;

    const fetchRoomAndParticipants = async () => {
      try {
        // 部屋情報取得
        const { data: roomData } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .maybeSingle();

        if (roomData) setRoom(roomData);

        // 参加者数取得
        const { data: partData } = await supabase
          .from('participants')
          .select('id')
          .eq('room_id', roomId);

        if (partData) setParticipantCount(partData.length);
      } catch (err) {
        console.error('部屋データの取得に失敗しました:', err);
      }
    };

    fetchRoomAndParticipants();
  }, [roomId]);

  // 2. 全アイデア結果の取得
  useEffect(() => {
    if (!roomId) return;

    const fetchAllResults = async () => {
      setLoadingResults(true);
      try {
        const { data, error } = await supabase
          .from('ideas')
          .select('id, idea_text, round_number, user_id')
          .eq('room_id', roomId)
          .order('round_number', { ascending: true })
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (data) setAllResults(data as PreviousIdea[]);
      } catch (err) {
        console.error('結果の取得に失敗しました:', err);
      } finally {
        setLoadingResults(false);
      }
    };

    fetchAllResults();
  }, [roomId]);

  // 重複のないユーザーIDリストの生成
  const uniqueUserIds = Array.from(new Set(allResults.map((item) => item.user_id)));

  // 集計結果の中の最大ラウンド数を取得
  const maxRoundInResults =
    allResults.length > 0 ? Math.max(...allResults.map((item) => item.round_number)) : 0;

  // 総ラウンド数の決定
  const totalRounds =
    participantCount || maxRoundInResults || uniqueUserIds.length || room?.max_participants || 6;

  // PDF印刷機能
  const handlePrint = () => {
    window.print();
  };

  // URLコピー機能
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ExportCsvButtonへ渡す単純なアイデアテキスト配列の生成
  const exportIdeas = allResults.map((item) => item.idea_text);

  return (
<main className="flex min-h-screen flex-col items-center pt-6 pb-12 px-4 bg-slate-50 text-slate-700 w-full">
    <div className="w-full max-w-6xl bg-white py-8 px-6 md:px-10 rounded-2xl border border-slate-200 shadow-xl space-y-8 tracking-wider">
        <div className="text-center space-y-2">
            <span className="px-8 py-2 bg-slate-200 inline-block rounded-full font-bold text-xs">
                集計結果
            </span>
            <h1 className="font-extrabold flex items-end justify-center gap-1 mt-3">
                <span className="text-2xl text-sky-500 leading-none">{room?.title || 'ブレインライティング結果'}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-3">
                参加者全員が書き込んだアイデアの全記録です。
            </p>
        </div>

        <hr className="border-slate-200" />

        {/* 集計データ一覧 */}
        {loadingResults ? (
          <p className="text-center text-slate-400 animate-pulse py-12">
            データを集計しています..
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {uniqueUserIds.map((uId) => {
              // 起点となったユーザーのプロフィール
              const originalOwnerProfile = getUserVirtualProfile(uId);

              // シートごとのアイデアを特定する計算（リレーロジック）
              const seatIdeas = allResults.filter((item) => {
                const userIdsList = Array.from(
                  new Set(allResults.map((i) => i.user_id))
                ).sort();
                const ownerIndex = userIdsList.indexOf(uId);
                const ideaWriterIndex = userIdsList.indexOf(item.user_id);

                const expectedOffset = item.round_number - 1;
                const calculatedOwnerIndex =
                  (ideaWriterIndex - expectedOffset + userIdsList.length) % userIdsList.length;
                return calculatedOwnerIndex === ownerIndex;
              });

              return (
                <div
                  key={uId}
                  className="flex flex-col border border-slate-200 rounded-2xl overflow-hidden bg-white"
                >
                  {/* ヘッダー：Round 1 担当者のプロフィール */}
                  <div className="py-2 px-4 flex items-center justify-start gap-3 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <Image
                        src={originalOwnerProfile.avatarUrl}
                        alt={`${originalOwnerProfile.name}のアイコン`}
                        height={32}
                        width={32}
                        unoptimized
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm truncate text-slate-600">
                          {originalOwnerProfile.name}さん<span className="text-[10px] text-slate-400">（起点）</span>
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* 各ラウンドのアイデアカード */}
                  <div className="flex-1 space-y-4 bg-slate-100 p-2">
                    {[...Array(totalRounds)].map((_, rIdx) => {
                      const roundNum = rIdx + 1;
                      const currentRoundIdeas = seatIdeas.filter(
                        (i) => i.round_number === roundNum
                      );

                      const realWriterId = currentRoundIdeas[0]?.user_id;
                      const writerProfile = realWriterId
                        ? getUserVirtualProfile(realWriterId)
                        : null;

                      return (
                        <div
                          key={roundNum}
                          className="p-3.5 space-y-2 transition-all bg-white"
                        >
                          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                            <span className="text-xs font-bold text-sky-500 leading-none">
                              Round {roundNum}
                            </span>
                            {writerProfile && (
                              <span
                                className={`text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-0.5 ${writerProfile.bg} ${writerProfile.text}`}
                              >
                                <span>{writerProfile.name}さん</span>
                              </span>
                            )}
                          </div>

                          {currentRoundIdeas.length > 0 ? (
                            <ul className="space-y-1.5 list-disc pl-4 text-sm font-medium text-slate-800">
                              {currentRoundIdeas.map((idea) => (
                                <li
                                  key={idea.id}
                                  className="leading-relaxed break-words text-slate-300"
                                >
                                  <span className="text-slate-600">{idea.idea_text}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm font-medium text-slate-400 leading-relaxed break-words italic">
                              相手の送信を待っています..
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ボタン操作エリア */}
        <div className="space-y-4 print:hidden pt-4">
            <button
                onClick={handleCopyUrl}
                className="w-1/3 block mx-auto text-sm px-8 py-4 bg-cyan-500 hover:bg-sky-600 active:bg-sky-600 text-white font-bold rounded-full transition-all text-lg cursor-pointer tracking-wider shadow-md"
            >
                {copied ? '✓ URLをコピーしました' : 'URLを共有'}
            </button>
        </div>
      </div>
			<Link href="/privacy" className="mt-8 text-xs text-sky-500 transition-all font-medium hover:opacity-70">プライバシーポリシー</Link>
    </main>
  );
}