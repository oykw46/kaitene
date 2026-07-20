export interface RoomData {
    id: string; // session id
    title: string; // 会議の議題
    status: string; // ステータス（waiting, round）
    created_by: string; // 誰が作ったのか？
    max_participants: number; // 最大参加人数
    idea_count: number; // 書き出してほしいアイデアの個数
    write_time: number; // アイデアを書き出す時間（1ラウンドあたりの持ち時間）
    interval_time: number; // 他の人のアイデアを読み込む時間
}

export interface UserProfile {
    name: string;
    emoji: string;
    avatarUrl: string;
    bg: string;
    border: string;
    text: string;
}

export interface RoundViewProps {
    room: RoomData;
    currentStatus: string; // Round1, Round2.. と増えていく
    currentUserId: string;
    userProfile?: UserProfile; // WaitingViewで決定したプロフィールを受け取れるように拡張
    totalRounds: number;
}

export interface PreviousIdea { // 前の人のアイデアを表現する型定義
    id: string;
    idea_text: string;
    round_number: number;
    user_id: string;
}
