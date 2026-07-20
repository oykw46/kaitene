import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Supabaseから取得する会議室データの型を定義
interface RoomData {
    id: string; // session id
    title: string; // 会議の議題
    status: string; // ステータス（waiting, round）
    created_by: string; // 誰が作ったのか？
    max_participants: number; // 最大参加人数
    idea_count: number; // 書き出してほしいアイデアの個数
    write_time: number; // アイデアを書き出す時間（1ラウンドあたりの持ち時間）
    interval_time: number; // 他の人のアイデアを読み込む時間
}

// ユーザーデータの型を定義（Supabaseでリアルタイム同期する）
interface OnlineUser {
    user_id: string;
    user_name: string;
}

export function useRoomRealtime(roomId: string, session: any) {
    const [room, setRoom] = useState<RoomData | null>(null);
    const [loading, setLoading] = useState(true);
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]); // 参加しているメンバーを記憶する配列
    const [isHost, setIsHost] = useState(false); // 自分がこの会議室のホストか？
    const [currentStatus, setCurrentStatus] = useState('waiting'); //現在の会議のステータス（waiting → round1 で開始）
    const [roomChannel, setRoomChannel] = useState<any>(null); // リアルタイム通信用のチャンネルを保持するStateです。

    // 画面が描画されたら、URLのIDを元にSupabaseから会議室の情報を取得します。
    useEffect(() => {
        async function fetchRoom() {
            try {
                const { data, error } = await supabase
                    .from('rooms') // 取得元のデータベース名を指定します。
                    .select('*') // * = すべてのデータが対象。
                    .eq('id', roomId) // URLのIDと一致する会議室を探す。
                    .single(); // 作成されたデータ（1件）のみを取得します。

                if (error) throw error; // エラーが起きた際は、処理を中断します。
                setRoom(data); // setRoomにデータをセットします。

                if (data) { // データが取得できた場合の処理
                    setCurrentStatus(data.status); // setCurrentStatus のステータスを更新します。
                }

                if (data && session && data.created_by === session.id) { // 会議室の作成者IDと自分のセッションIDが一致するか比較する処理です。
                    setIsHost(true);
                } else {
                    setIsHost(false);
                }
            } catch (err) { // フェッチ失敗した場合
                console.error('会議室情報の取得に失敗:', err);
            } finally { // 最後にloading画面を解除
                setLoading(false);
            }
        }

        if (roomId && session) { // 会議室のidとセッションが揃ったら上記関数を実行します。
            fetchRoom();
        }
    }, [roomId, session]); // フェッチしたデータを roomId, session にセットします。

    // 参加者の同期（Presence）+ 開始のシグナル受信設定（Broadcast）
    useEffect(() => {
        if (!roomId || !session) return; // roomIdとsession未取得なら何も返しません。

        const channel = supabase.channel(`room_presence_${roomId}`, {
            // presence とは、supabase の標準機能で「クライアント間でユーザー状態を共有」することができます。
            config: {
                presence: {
                    key: session.id, // UUIDで発行したセッション内にいるユーザーの状態を検知します。
                },
            },
        });

        // Presence. メンバーの入退室を監視する処理
        channel.on('presence', { event: 'sync' }, () => { // Supabase で presence を実行する書き方です。
            const state = channel.presenceState(); // state にチャンネルの状態をセットします。
            const formattedUsers: OnlineUser[] = Object.keys(state).map((key) => { // 会議に参加中のユーザーをマッピング処理で一人ずつ見ていきます。
                const presenceList = state[key] as any[];
                return {
                    user_id: key, // ユーザーIDをkeyにセット
                    user_name: presenceList[0]?.user_name || '名無しさん', // ユーザーネームを判定
                };
            });
            setOnlineUsers(formattedUsers); // ユーザー情報を検知し終えたら setOnlineUsers にセットします。
        });

        // Broadcast. 誰かが [start_conference] シグナルを飛ばしたら感知する設定 
        channel.on('broadcast', { event: 'start_conference' }, (payload) => { // supabse でクライアント側からメッセージを送る処理です。
            console.log('会議開始のシグナルを受信しました！', payload);
            setCurrentStatus('round1'); // 全員の画面を 'round1' に書き換えます。
        });

        channel.subscribe(async (status) => { // Supabase にリアルタイム接続申請を出すイメージ。
            if (status === 'SUBSCRIBED') { // ユーザーの入退室を監視します。
                await channel.track({
                    user_name: session.name, // ユーザー名を「○○で参加しました！」と存在をアナウンスするイメージです。
                });
            }
        });
        setRoomChannel(channel); // 後でボタンを押した時に使えるように state にチャンネルを保存しておきます。

        return () => {
            channel.unsubscribe(); // ユーザーが退室したら Supabase 側に退室指示を出します。
        };
    }, [roomId, session]);

    // ホストが「会議スタート」ボタンを押した時の処理
    const startConference = async () => {
        if (!roomChannel) return; // roomChannel 未設定の場合は、何も返しません。

        // 同じチャンネル（会議室）にいる全員に向けてシグナルを発信します。
        await roomChannel.send({ // supabse の broadcast 機能でメッセージを送ります。
            type: 'broadcast',
            event: 'start_conference',
            payload: { message: '会議が始まりました！' },
        });

        setCurrentStatus('round1'); // ホスト自身の画面も 'round1' に切り替えます。
    };

    // 画面側(コンポーネント)で使いたい変数や関数だけを外に出します。
    return {
        room,
        loading,
        onlineUsers,
        isHost,
        currentStatus,
        startConference
    };
}
