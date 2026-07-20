'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { RoundViewProps, PreviousIdea } from "@/lib/index";
import { getUserVirtualProfile } from "@/lib/profile";
import Image from "next/image";

export default function RoundView({ room, currentStatus, currentUserId, userProfile, totalRounds }: RoundViewProps) {
    // ----------------------------------------------------
    // 1. ステート（状態管理）の宣言
    // ----------------------------------------------------
    const displayCount = room.idea_count || 3;

    // ラウンドが変わるたびに入力欄をリセット
    const [ideas, setIdeas] = useState<string[]>(Array(displayCount).fill(''));
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 自分が「このラウンドで送信し終えたか？」を管理するフラグ
    const [isSubmittedThisRound, setIsSubmittedThisRound] = useState(false);
    const [nextRoundIdeas, setNextRoundIdeas] = useState<PreviousIdea[]>([]);
    const [loadingNext, setLoadingNext] = useState(false);

    // タイマー設定（デフォルト60秒）
    const [timeLeft, setTimeLeft] = useState(room.write_time || 60);

    // ----------------------------------------------------
    // 2. 変数・計算ロジック
    // ----------------------------------------------------
    // 現在のラウンド数を特定
    const getRoundNumber = (status: string): number => {
        if (!status) return 1;
        const lowercaseStatus = status.toLowerCase();
        const match = lowercaseStatus.match(/round(\d+)/);
        return match ? parseInt(match[1], 10) : 1;
    };

    const currentRound = getRoundNumber(currentStatus);

    // プロフィール設定
    const myProfile = userProfile || getUserVirtualProfile(currentUserId);

    // ----------------------------------------------------
    // 3. useEffect (副作用・データ取得ロジック)
    // ----------------------------------------------------

    // ラウンド切り替え時のリセット処理
    useEffect(() => {
        setIdeas(Array(displayCount).fill(''));
        setIsSubmittedThisRound(false);
        setTimeLeft(room.write_time || 60);
    }, [currentStatus, room.write_time, displayCount]);

    // 他人のアイデア取得ロジック（Round 2以降）
    useEffect(() => {
        if (currentRound === 1) return;

        const targetRound = currentRound - 1;

        const fetchNextIdeas = async () => {
            setLoadingNext(true);
            try {
                const { data: userData, error: userError } = await supabase
                    .from('ideas')
                    .select('user_id')
                    .eq('room_id', room.id);

                if (userError) throw userError;

                // 重複のないユーザーIDのリスト（＝座席の基準）を作成してソートします。
                const userIds = Array.from(new Set(userData?.map(d => d.user_id))).sort();

                if (userIds.length <= 1) {
                    // 自分しかいない場合は、回せるシートがないので処理を抜けます。
                    setNextRoundIdeas([]);
                    return;
                }

                // 席順（userIds配列）の中から、自分の位置（インデックス）を探す処理。
                const myIndex = userIds.indexOf(currentUserId);

                // ブレインライティングの回転ロジック（席替え計算）
                // ラウンドごとにシートが1つずつズレて回ってくるように計算します。
                // 計算式：（自分の位置 - 現在のラウンド + 参加人数）% 参加人数
                // インターバル中は「次に回ってくるシート」を先読みしたいので、調整用のオフセットを入れます。
                const offset = currentRound - 1;
                let targetUserIndex = (myIndex - offset) % userIds.length;
                if (targetUserIndex < 0) {
                    targetUserIndex += userIds.length; // マイナス値の調整
                }

                 const targetUserId = userIds[targetUserIndex];

                 // 特定した「前の持ち主（targetUserId）」が書いた、targetRound までの全履歴を取得します。

                const { data, error } = await supabase
                    .from('ideas')
                    .select('id, idea_text, round_number, user_id')
                    .eq('room_id', room.id)
                    .eq('user_id', targetUserId) // 特定したユーザーのシートのみを指定
                    .lte('round_number', targetRound) // 指定ラウンド「以下（lte）」の全履歴を取得
                    .order('round_number', { ascending: true }); // 取得したアイデアをラウンド順に並べます。
                if (error) throw error;

                setNextRoundIdeas(data || []);
            } catch (err) {
                // デバッグ：エラーが発生した場合はコンソールに出力します。
                console.error("アイデアの読み込みに失敗しました。:", err);
            } finally {
                setLoadingNext(false);
            }
        };
        fetchNextIdeas();

        // 相手の送信ラグを考慮し、インターバル突入時だけでなく、2秒ごとに再取得（簡易同期フェッチ）をかけます。
        const intervalId = setInterval(fetchNextIdeas, 2000);
        return () => clearInterval(intervalId);

    }, [currentRound, room.id, currentUserId]);

    // タイマーのカウントダウン処理
    useEffect(() => {
        // 集計結果画面ではタイマーを止めます。
        if (timeLeft <= 0 || isSubmittedThisRound) return;

        // 1秒（1000ミリ秒）ごとに、残り時間を -1 します。
        const timerId = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);

        // クリーンアップ処理（コンポーネントが消えたり再実行される時にタイマーを止めます。）
        return () => clearInterval(timerId);
    }, [timeLeft, isSubmittedThisRound]);

    // 残り0秒になった時は自動送信します。
    useEffect(() => {
        // 残り時間が0秒、かつ未送信の場合
        if (timeLeft === 0 && !isSubmittedThisRound) {
            console.log("タイムアップ！自動送信を開始します。");
            autoSubmit();
        }
    }, [timeLeft, isSubmittedThisRound]);

    // ----------------------------------------------------
    // 4. イベントハンドラー（送信・入力処理）
    // ----------------------------------------------------
        const executeSubmit = async (ideasToSend: string[]) => {
        if (isSubmitting || isSubmittedThisRound) return;
        setIsSubmitting(true);
        try {
            const insertData = ideasToSend.map(ideaText => ({
                room_id: room.id,
                round_number: currentRound,
                user_id: currentUserId,
                // もし空欄のままタイムアップした場合は「タイムアップ - 自動送信」と入力する。
                idea_text: ideaText.trim() || 'タイムアップ - 自動送信'
            }));

            // Supabase の `ideas` テーブルに保存します。
            const { error } = await supabase.from('ideas').insert(insertData);

            if (error) throw error;

            // 自分の画面だけ送信完了にします。
            // 親コンポーネント（page.tsx）のリアルタイム監視が全員の完了を検知して、自動的に部屋全体のステータスを次に進めてくれます。
            setIsSubmittedThisRound(true);

        } catch (err) {
            console.error("送信エラー:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // 手動で提出ボタンを押した時の処理
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAllFilled) return;
        await executeSubmit(ideas);
    };

    // タイムアップ時に呼び出す自動送信関数
    const autoSubmit = async () => {
        await executeSubmit(ideas);
    };

    const handleInputChange = (index: number, value: string) => {
        const updatedIdeas = [...ideas];
        updatedIdeas[index] = value;
        setIdeas(updatedIdeas);
    };

    const isAllFilled = ideas.every(idea => idea.trim().length > 0);

    // ----------------------------------------------------
    // 5. 画面描画 (ライティング入力画面)
    // ----------------------------------------------------
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 text-slate-700 w-full">
            <div className="w-full max-w-3xl bg-white py-8 px-12 rounded-2xl border border-slate-100 shadow-xl space-y-8 relative">
                {isSubmittedThisRound ? (
                    <div className="text-center py-12 space-y-4">
                        <div className="w-12 h-12 bg-cyan-500 text-white rounded-full flex items-center justify-center mx-auto text-emerald-600 font-bold text-xl animate-bounce">✓</div>
                        <h2 className="text-xl font-bold text-cyan-500">アイデアの送信が完了しました！</h2>
                        <p className="text-sm text-slate-400 leading-loose">全員の回答が揃うと次のラウンドに進みます。</p>
                    </div>
                ) : (
                    <>
                        {/* 右上にフローティングするタイマーUI */}
                        <div className=
                            {`fixed top-6 right-8 px-4 py-2 rounded-full font-mono font-bold text-sm flex items-center gap-1.5 transition-all z-2 inline-block ${
                                timeLeft <= 10
                                ? 'text-red-500 animate-pulse' : 'text-sky-500'
                            }`}
                        >
                            <span className="text-xs">残り時間</span><br />
                            <span>
                                {timeLeft > 0 ? (
                                    `${Math.floor(timeLeft / 60)}分${String(timeLeft % 60).padStart(2, '0')}秒`
                                ) : (
                                    'Time up!'
                                )}
                            </span>
                        </div>

                        <div className="text-center space-y-2 sticky top-0 z-1 bg-white py-4 border-b border-slate-200">
                            <span className="px-8 py-1 bg-slate-200 inline-block rounded-full font-bold text-sm tracking-wider">
                                Round<span className="ml-1 text-lg text-cyan-700 font-extrabold">{currentRound}</span> / {totalRounds}
                            </span>
                            <h1 className="font-extrabold flex items-end justify-center gap-1 mt-3">
                                <Image 
                                    src={myProfile.avatarUrl} 
                                    alt={`${myProfile.name}のアイコン`}
                                    height={32}
                                    width={32}
                                    unoptimized
                                />
                                <span className="text-2xl text-sky-500 leading-none ml-1">{room.title}</span>
                            </h1>
                        </div>

                        {/* 過去の全履歴がリレー形式で縦に累積表示されるエリア（Round2以降用） */}
                        {currentRound > 1 && (
                            <div className="bg-sky-50 p-4 rounded-lg">
                                <h2 className="text-xs font-bold mb-2">アイデア履歴</h2>
                                {nextRoundIdeas.length > 0 ? (
                                    <div className="space-y-3">
                                        {/* ラウンドごとにグループ分けして綺麗に表示 */}
                                        {[...Array(currentRound - 1)].map((_, rIdx) => {
                                            const rNum = rIdx + 1;
                                            const roundHistory = nextRoundIdeas.filter(i => i.round_number === rNum);

                                            return (
                                                <div key={rNum} className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1">
                                                    <span className="text-xs font-bold text-slate-400 block">Round {rNum} の内容</span>
                                                    <ul className="text-xs text-slate-700 list-disc pl-4 space-y-2 mt-2">
                                                        {roundHistory.map((pIdea, idx) => (
                                                            <li key={pIdea.id || idx} className="font-medium text-slate-300">
                                                                <span className="text-slate-600">{pIdea.idea_text}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 mt-4">アイデア履歴をロード中...</p>
                                )}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* 指定された個数分、入力欄を自動生成します。*/}
                            {ideas.map((idea, index) => (
                                <input
                                    key={index}
                                    type="text"
                                    value={idea}
                                    onChange={(e) => handleInputChange(index, e.target.value)}
                                    placeholder={
                                        currentRound === 1
                                        ? `${index + 1}. あなたの自由なアイデアをひらめくままに書いてみましょう！`
                                        : `${index + 1}. 前の人のアイデアを「拡張」する形で書いてみましょう！`
                                    }
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg placeholder:text-xs outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                                    required
                                    maxLength={100}
                                />
                            ))}

                            {/* 送信ボタン */}
                            <button
                                type="submit"
                                disabled={!isAllFilled || isSubmitting}
                                className={`w-2/3 py-3 bg-cyan-500 hover:bg-sky-600 active:bg-sky-500 text-sm text-white font-bold rounded-full transition-all text-lg tracking-wider mx-auto block mt-6 shadow-sm ${
                                    isAllFilled
                                    ? 'bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 cursor-pointer shadow-cyan-500/10'
                                    : 'bg-slate-300 cursor-not-allowed text-slate-400'
                                }`}
                            >
                                {isSubmitting ? '送信中...' : '提出する'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </main>
    );
}