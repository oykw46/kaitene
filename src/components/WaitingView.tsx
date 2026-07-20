'use client';

import { useState } from 'react'
import { RoomData, UserProfile } from "@/lib/index";
import { getUserVirtualProfile } from "@/lib/profile";
import Image from "next/image";

// 参加者のデータ構造を定義
interface Participant {
    id: string;
    user_id: string;
    name: string;
}

// 親（page.tsx）から受け取るデータの型定義
interface WaitingViewProps { // 1. データを入れる箱自体の設計図。
    room: RoomData;
    isHost: boolean;
    currentUserId: string; // 自分のIDを受け取る
    currentUserName: string; // 自分の名前
    participants: Participant[]; // room/[id]/page.tsx からリアルタイムのリストを受け取ります。
    onStartMeeting: () => Promise<void>;
}

export default function WaitingView({ // 2. 実際に受け取る仕様書の中身。
    room, isHost, currentUserId, currentUserName, participants, onStartMeeting
}: WaitingViewProps) {
    const [copied, setCopied] = useState(false);

    // 自分自身のUserProfile（偉人アバター）を取得します。
    const myProfile: UserProfile = getUserVirtualProfile(currentUserId);

    // 画面のURLをクリップボードにコピーする関数
    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // 2秒後に「コピー完了」を元に戻します。
        } catch (err) {
            console.error('URLのコピーに失敗しました。:', err);
        }
    };
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 text-slate-700 w-full">
            <div className="w-full max-w-3xl bg-white py-8 px-12 rounded-2xl border border-slate-100 shadow-xl space-y-8">
                {/* 会議室ヘッダー情報 */}
                <div className="text-center space-y-2">
                    <span className="px-8 py-2 bg-slate-200 inline-block rounded-full font-bold text-xs uppercase tracking-wider">
                        {isHost ? 'ホスト管理画面' : '待機中'}
                    </span>
                    <h1 className="font-extrabold flex items-end justify-center gap-1 mt-3">
                        <span className="text-2xl text-cyan-600 leading-none">{room.title}</span>
                    </h1>
                </div>

                <hr className="border-slate-200" />

                {/* リアルタイム参加者一覧 */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-sm font-bold text-slate-400 tracking-wider uppercase">
                            参加者（{participants.length}人）
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {participants.map((p) => {
                            // 参加者それぞれのuser_idから、その場でアバター情報を割り当てます。
                            const isMe = p.user_id === currentUserId;
                            const seedId = p.user_id || p.id || p.name;
                            const participantProfile = getUserVirtualProfile(seedId);

                            return (
                                <div
                                    key={p.id}
                                    className={`px-4 py-3 rounded-xl border border-slate-200 text-sm flex items-center gap-2 transition-all bg-slate-50 text-slate-700 ${
                                        isMe 
                                        ? 'font-bold' 
                                        : ''
                                    }`}
                                >
                                    {/* ★ 画像最適化対応のアイコン表示エリア */}
                                    {participantProfile.avatarUrl ? (
                                        <div className="relative rounded-full overflow-hidden border border-slate-200 bg-white flex-shrink-0">
                                            <Image 
                                                src={participantProfile.avatarUrl} 
                                                alt={`${participantProfile.name}のアイコン`}
                                                height={42}
                                                width={42}
                                                unoptimized
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-slate-200 flex-shrink-0 text-xl">
                                            {participantProfile.emoji}
                                        </div>
                                    )}
                                    <div className="flex flex-col min-w-0">
                                        {/* 割り当てられた偉人名を表示 */}
                                        <span className="truncate font-bold">
                                            {participantProfile.name}さん
                                        </span>
                                    </div>
                                    {isMe && <span className="text-xs text-sky-500 font-bold ml-auto">(あなた)</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 招待用URLコピーエリア */}
                <div className="bg-slate-200 p-4 rounded-2xl">
                    <label className="text-xs font-semibold block">メンバー招待用URL（クリックしてコピー）</label>
                    <div className="flex gap-3 mt-3">
                        <input
                            type="text"
                            value={typeof window !== 'undefined' ? window.location.href : ''}
                            readOnly
                            className="w-full px-3 py-2 bg-slate-50 rounded-lg text-xs text-slate-400 select-all outline-none flex-1 overflow-hidden text-ellipsis"
                        />
                        <button
                            onClick={handleCopyUrl}
                            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer w-[80px] ${
                                copied 
                                ? 'bg-sky-500 text-white' 
                                : 'bg-slate-600 hover:bg-slate-700 text-white'
                            }`}
                        >
                            {copied ? 'copied!' : 'copy'}
                        </button>
                    </div>
                </div>

                {/* ホストだけに表示される「コントロールパネル」 */}
                {isHost ? (
                    <div className="pt-4 rounded-xl text-center space-y-4">
                        <p className="text-xs text-slate-500 font-medium">
                            全員が集まったら、下のボタンを押して会議を開始してください。
                        </p>
                        <button
                            onClick={onStartMeeting}
                            className="w-2/3 py-4 bg-cyan-500 hover:bg-sky-600 active:bg-sky-600 text-white font-bold rounded-full transition-all text-lg cursor-pointer tracking-wider"
                        >
                            Let's Start!
                        </button>
                    </div>
                ) : (
                    <p className="text-center text-slate-500 text-xs animate-pulse py-4">
                        ホストが会議を開始するまで、この画面のまましばらくお待ちください..
                    </p>
                )}
            </div>
        </main>
    );
}