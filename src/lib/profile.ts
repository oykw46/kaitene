// 偉人プロフィールの型（設計図）を宣言します
export interface VirtualProfile {
  name: string;
  emoji: string;
  avatarUrl: string;
  bg: string;
  border: string;
  text: string;
}

// 偉人リストの定義
const VIRTUAL_PROFILES: VirtualProfile[] = [
  {
    name: 'アインシュタイン', 
    emoji: '',
    avatarUrl: '/ic-einstein.webp',
    bg: 'bg-sky-50', 
    border: 'border-sky-200', 
    text: 'text-sky-700' 
  },
  {
    name: 'エジソン', 
    emoji: '',
    avatarUrl: '/ic-edison.webp',
    bg: 'bg-amber-50', 
    border: 'border-amber-200', 
    text: 'text-amber-700' 
  },
  {
    name: 'ガンジー', 
    emoji: '',
    avatarUrl: '/ic-gandhi.webp',
    bg: 'bg-emerald-50', 
    border: 'border-emerald-200', 
    text: 'text-emerald-700' 
  },
  {
    name: '諸葛孔明', 
    emoji: '',
    avatarUrl: '/ic-zhuge-liang.webp',
    bg: 'bg-teal-50', 
    border: 'border-teal-200', 
    text: 'text-teal-700' 
  },
  {
    name: 'クレオパトラ', 
    emoji: '',
    avatarUrl: '/ic-cleopatra.webp',
    bg: 'bg-yellow-50', 
    border: 'border-yellow-200', 
    text: 'text-yellow-800' 
  },
  {
    name: 'ダーウィン', 
    emoji: '',
    avatarUrl: '/ic-darwin.webp',
    bg: 'bg-lime-50', 
    border: 'border-lime-200', 
    text: 'text-lime-700' 
  },
  {
    name: '孔子', 
    emoji: '',
    avatarUrl: '/ic-confucius.webp',
    bg: 'bg-orange-50', 
    border: 'border-orange-200', 
    text: 'text-orange-700' 
  },
  {
    name: 'マルクス', 
    emoji: '',
    avatarUrl: '/ic-marx.webp',
    bg: 'bg-red-50', 
    border: 'border-red-200', 
    text: 'text-red-700' 
  },
  {
    name: 'モーツァルト', 
    emoji: '',
    avatarUrl: '/ic-mozart.webp',
    bg: 'bg-pink-50', 
    border: 'border-pink-200', 
    text: 'text-pink-700' 
  },
  {
    name: 'ジャンヌダルク', 
    emoji: '',
    avatarUrl: '/ic-joan-of-arc.webp',
    bg: 'bg-slate-100', 
    border: 'border-slate-300', 
    text: 'text-slate-700' 
  },
  {
    name: 'ダヴィンチ', 
    emoji: '',
    avatarUrl: '/ic-da-vinci.webp',
    bg: 'bg-indigo-50', 
    border: 'border-indigo-200', 
    text: 'text-indigo-700' 
  },
  {
    name: 'リンカーン', 
    emoji: '',
    avatarUrl: '/ic-lincoln.webp',
    bg: 'bg-blue-50', 
    border: 'border-blue-200', 
    text: 'text-blue-700' 
  },
  {
    name: 'ニュートン', 
    emoji: '',
    avatarUrl: '/ic-newton.webp',
    bg: 'bg-cyan-50', 
    border: 'border-cyan-200', 
    text: 'text-cyan-700' 
  },
  {
    name: 'カエサル', 
    emoji: '',
    avatarUrl: '/ic-caesar.webp',
    bg: 'bg-purple-50', 
    border: 'border-purple-200', 
    text: 'text-purple-700' 
  }
];

// ユーザーのIDから固定の偉人プロフィールを決定する関数（戻り値の型を VirtualProfile に指定）
export function getUserVirtualProfile(userId: string): VirtualProfile {
	// 安全装置: userId が空の場合は先頭の要素を返す
	if (!userId) {
		return VIRTUAL_PROFILES[0];
	}

	// 文字列（UUID）を一文字ずつ数値に変換して合計します
	let hash = 0;
	for (let i = 0; i < userId.length; i++) {
		// charCodeAt で文字のコード（数字）を取得して足していく
		hash += userId.charCodeAt(i);
	}

	// 合計値を偉人リストの総数で割った「余り」をインデックスにする
	const index = hash % VIRTUAL_PROFILES.length;

	// デバッグ用ログ
	console.log(`ハッシュ計算デバッグ - ID: ${userId.slice(0, 8)}... -> Index: ${index}`);

	return VIRTUAL_PROFILES[index];
}