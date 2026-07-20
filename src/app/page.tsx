'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUserSession } from '@/hooks/useUserSession';
import Link from 'next/link';

export default function Home() {
	const router = useRouter();
	const { session } = useUserSession(); // useUserSession からセッション情報とセッション管理関数を取得します。
	const [ theme, setTheme ] = useState(''); // 会議テーマの入力状態をリアルタイムに記憶しておく.. 〃
	const [ loading, setLoading ] = useState(false); // 会議作成中のローディング用の状態管理。

	// ホストが設定する項目用のステート
	const [ideaCount, setIdeaCount] = useState(3); // 6-3-5法の「3個」
	const [writeTime, setWriteTime] = useState(300); // 6-3-5法の「5分」

	// Supabaseに会議室を作って自動遷移させる関数
	const handleCreateRoom: React.ComponentProps<'form'>['onSubmit'] = async (e) => {
		e.preventDefault();
		if (!theme.trim() || !session) return;

		setLoading(true);
		try {
			const { data, error } = await supabase
				.from('rooms')
				.insert([
					{
						title: theme,
						created_by: session.id,
						max_participants: 6,
						idea_count: ideaCount,
						write_time: writeTime,
						interval_time: 5
					}
				])
				.select()
				.single();

			if (error) throw error;

			if (data) {
				// 作成された部屋の待機画面へ遷移させます。
				router.push(`/room/${data.id}`);
			}
		} catch (err: any) {
            console.error('会議室の作成に失敗しました。詳細エラー:', {
                message: err.message,
                details: err.details,
                code: err.code
			});
			// 画面のアラートにも具体的な原因を表示
            alert(`会議室の作成に失敗しました。\nエラー内容: ${err.message || '不明なエラー'}`);
            setLoading(false);
		}
	};

	return (
		<main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 text-slate-700">
			<div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
				{/* ロゴ・コンセプト */}
				<div className="text-center mb-8">
					<h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">
						Kaitene
					</h1>
					<p className="text-sm text-slate-600">
						静かな人のアイデアも、ちゃんと会議に届く。
					</p>
				</div>

				<form onSubmit={handleCreateRoom} className="space-y-4">
					<div className="space-y-1">
						<label className="block text-sm text-slate-600 font-bold mb-2 mt-10">
							会議のテーマ
						</label>
						<input
							type="text"
							value={theme}
							onChange={(e) => setTheme(e.target.value)}
							placeholder="例：CVRを上げるLPのファーストビュー案"
							className="w-full px-4 py-3 border border-slate-200 text-sm rounded-lg focus:outline-none transition-all focus:ring-2 focus:ring-cyan-500 text-slate-900"
							maxLength={40}
							required
						/>
					</div>

					{/* アイデアの個数・持ち時間などの自由設定 */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<label className="text-xs font-bold text-slate-500">アイデアの個数</label>
							<select
								value={ideaCount}
								onChange={(e) => setIdeaCount
								(Number(e.target.value))}
								className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 transition-all text-sm cursor-pointer appearance-none"
							>
								<option value={1}>1個</option>
								<option value={2}>2個</option>
								<option value={3}>3個</option>

							</select>
						</div>
						<div className="space-y-1">
							<label className="text-xs font-bold text-slate-500">1ラウンドの記入時間</label>
							<select
								value={writeTime}
								onChange={(e) => setWriteTime
								(Number(e.target.value))}
								className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 transition-all text-sm cursor-pointer appearance-none"
							>
								<option value={10}>10秒（テスト用）</option>
								<option value={30}>30秒</option>
								<option value={60}>1分</option>
								<option value={180}>3分</option>
								<option value={300}>5分</option>
							</select>
						</div>
					</div>

					<button
						type="submit"
						disabled={loading || !theme.trim()}
						className="w-full py-4 bg-cyan-500 hover:bg-sky-600 text-white font-bold rounded-xl transition-all shadow-md shadow-cyan-500/10 cursor-pointer mt-2 text-sm"
					>
						{loading ? '作成中..' : '会議室を解放する'}
					</button>
				</form>
			</div>
			<Link href="/privacy" className="mt-8 text-xs text-sky-500 transition-all font-medium hover:opacity-70">プライバシーポリシー</Link>
		</main>
	);
}