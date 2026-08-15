'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from 'next/navigation';
import { supabase } from "@/lib/supabase";
import { useUserSession } from "@/hooks/useUserSession";
import RoundView from "@/components/RoundView";
import WaitingView from "@/components/WaitingView";
import { getUserVirtualProfile } from "@/lib/profile";

interface RoomData {
    id: string;
    title: string;
    status: string;
    created_by: string;
    max_participants: number;
    idea_count: number;
    write_time: number;
    interval_time: number;
}

interface Participant {
    id: string;
    user_id: string;
    name: string;
}

export default function Room() {
    const params = useParams();
    const router = useRouter();
    // URLパラメータから安全に roomId を取得します
    const roomId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

    const { session } = useUserSession();
    const [room, setRoom] = useState<RoomData | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]); // リアルタイム参加者リストの箱
    const [loading, setLoading] = useState(true);
    const [isHost, setIsHost] = useState(false);
    const [myVirtualName, setMyVirtualName] = useState(''); // 自分の偉人名を保持する状態変数
    const [myVirtualProfile, setMyVirtualProfile] = useState<any>(null);

    // 1. 全ラウンドが完了して status が 'result' になった時の自動遷移処理
    useEffect(() => {
        if (room?.status === 'result' && roomId) {
            console.log('全ラウンドが終了しました。結果画面へ移動します。');
            router.push(`/room/${roomId}/result`);
        }
    }, [room?.status, roomId, router]);

    // 2. 部屋データ・参加者・Supabaseリアルタイム監視
    useEffect(() => {
        if (!roomId || !session?.id) return;

        const currentUserId = session.id;

        // セッションIDが確定した段階で、固有の偉人プロフィールを生成して保存します
        const myProfile = getUserVirtualProfile(currentUserId);
        setMyVirtualProfile(myProfile);
        setMyVirtualName(myProfile.name);

        // 初回の部屋データおよび参加者データの取得関数
        const fetchRoomAndParticipants = async () => {
            const { data: roomData, error: roomError } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', roomId)
            .single();

        if (roomError) {
            console.error('部屋データの取得に失敗しました:', roomError);
            setLoading(false);
            return;
        }

        if (roomData) {
            setRoom(roomData);
                // 自分がホストかどうかを判定
                if (roomData.created_by === currentUserId) {
                    setIsHost(true);
                }
                
                // 自分の偉人名を座席表（participantsテーブル）にアップサート（追加・更新）します
                await supabase
                    .from('participants')
                    .upsert(
                        { room_id: roomId, user_id: currentUserId, name: myProfile.name },
                        { onConflict: 'room_id, user_id' }
                );
        }

        // 現在この部屋にいる参加者一覧をsupabaseから取得します。
        const { data: partData, error: partError } = await supabase
            .from('participants')
            .select('*')
            .eq('room_id', roomId);

            if (!partError && partData) {
                setParticipants(partData);
            }
            setLoading(false);
        };

        fetchRoomAndParticipants();

        // リアルタイム機能: 部屋のステータスや参加者の変更をリアルタイムに監視します。
        // ① roomsテーブルの変更を監視
        const roomChannel = supabase
            .channel(`room-changes-${roomId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', filter: `id=eq.${roomId}`, schema: 'public', table: 'rooms' },
                (payload) => {
                    setRoom(payload.new as RoomData);
                }
            )
            .subscribe();

        // ② participantsテーブルの変更を監視
        const participantsChannel = supabase
            .channel(`participants-changes-${roomId}`)
            .on(
                'postgres_changes',
                { event: '*', filter: `room_id=eq.${roomId}`, schema: 'public', table: 'participants' },
                async () => {
                    // 誰かが入室・退室した場合は、最新のリストを再取得して画面を更新します。
                    const { data } = await supabase
                        .from('participants')
                        .select('*')
                        .eq('room_id', roomId);
                    if (data) setParticipants(data);
                }
            )
            .subscribe();

        // ③ アイデア送信を監視
        const ideasChannel = supabase
            .channel(`ideas-changes-${roomId}`)
            .on(
                'postgres_changes',
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'ideas' 
                },
                async () => {
                    // 最新の部屋情報と参加者情報を並行取得
                    const [{ data: latestRoom }, { data: latestParts }] = await Promise.all([
                        supabase.from('rooms').select('*').eq('id', roomId).single(),
                        supabase.from('participants').select('*').eq('room_id', roomId)
                    ]);

                    if (!latestRoom || !latestParts) return;

                    const currentStatus = latestRoom.status; // 例：round1
                    const match = currentStatus.match(/^round(\d+)$/);

                    // ステータスが "roundX" の形式のときのみ、提出完了チェックを行います。
                    if (match) {
                        // 【修正ポイント①】「match[1]」から正しく現在のラウンドの数字（1, 2...）を抽出します。
                        const currentRoundNum = parseInt(match[1], 10);

                        // 最新のステータス（数値型）に紐づくアイデアを全件取得します。
                        // 【修正ポイント②】文字列ではなく、数値化した「currentRoundNum」で比較します。
                        const { data: currentIdeas } = await supabase
                        .from('ideas')
                        .select('user_id') // 誰が送ったか（ユーザーID）だけを取得
                        .eq('room_id', roomId)
                        .eq('round_number', currentRoundNum);

                    if (currentIdeas) {
                        // 重複を除いた「実際に提出した人数」を算出
                        const submittedUserIds = new Set(currentIdeas.map(i => i.user_id));
                        const totalSubmittedUsers = submittedUserIds.size; // 提出済みの人数
                        const totalParticipants = latestParts.length;     // 部屋にいる全人数

                        // ホストの画面だけで、全員の提出完了を検知して次のラウンドへ進めます。
                        // ホストの判定も最新データ（latestRoom.created_by）を基準にします。
                        const amIHost = latestRoom.created_by === currentUserId;

                        if (amIHost && totalSubmittedUsers >= totalParticipants) {
                            // 次のラウンド番号を設定します。
                                // 最大ラウンド数（例: 6）に達した場合は、結果画面（'result'）へ遷移させます。
                                const maxRounds = totalParticipants; 
                                let nextStatus = 'result';

                                if (currentRoundNum < maxRounds) {
                                    nextStatus = `round${currentRoundNum + 1}`;
                                }

                                // 自動生成された次のステータスで部屋を更新！
                                await supabase
                                    .from('rooms')
                                    .update({ status: nextStatus })
                                    .eq('id', roomId);
                            }
                        }
                    }
                }
            )
            .subscribe();

            return () => {
                supabase.removeChannel(roomChannel);
                supabase.removeChannel(participantsChannel);
                supabase.removeChannel(ideasChannel);
            };
    }, [roomId, session?.id]);

    // ホストがボタンを押して会議を開始する関数
    const handleStartMeeting = async () => {
        if (!room) return;

        // データベースのステータスを 'waiting' から 'round1' に更新します。
        const { error } = await supabase
            .from('rooms')
            .update({ status: 'round1'})
            .eq('id', room.id);
            
            if (error) {
                console.error('会議の開始に失敗しました:', error);
                alert('会議を開始できませんでした。');
            }
        };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
                <p className="animate-pulse text-sm">会議室データを読み込み中...</p>
            </div>
        );
    }
    if (!room) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 text-rose-500 font-medium">
                <p className="text-sm text-rose-400">指定された会議室が見つかりませんでした。URLが正しいか念のためご確認くださいませ。</p>
            </div>
        );
    }

    // ステータスが 'waiting' の場合に表示する内容
    if (room.status === 'waiting') {
        return (
            <WaitingView
                room={room}
                isHost={isHost}
                currentUserId={session?.id || ''}
                currentUserName={myVirtualName}
                participants={participants} // 最新のリアルタイム参加者リスト
                onStartMeeting={handleStartMeeting}
            />
        );
    }

    // ステータスが 'round1', 'round2' などの場合は、自動で入力画面に切り替わります。
    return <RoundView room={room} currentStatus={room.status} currentUserId={session?.id || ''} userProfile={myVirtualProfile || undefined} totalRounds={participants.length} />;
 }