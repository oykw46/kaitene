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
			// 1. 環境変数が本番環境で正しく読み込まれているかチェック
			const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
			const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

			console.log("【デバッグ】URL存在チェック:", !!supabaseUrl);
			console.log("【デバッグ】Key存在チェック:", !!supabaseKey);

			if (!supabaseUrl || !supabaseKey) {
				alert("エラー: Vercelの環境変数 (NEXT_PUBLIC_...) が設定されていないか、読み込めていません。");
				setLoading(false);
				return;
			}

			// 2. Supabaseへ会議室作成のリクエストを送信
			const { data, error } = await supabase
				.from("rooms") // テーブル名（ご自身の環境に合わせて変更してください）
				.insert([{ name: "新しい会議室" }])
				.select();

			// 3. エラーが発生した場合、アラートで画面に表示
			if (error) {
				console.error("Supabaseエラー詳細:", error);
				alert(`Supabaseエラー発生:\nメッセージ: ${error.message}\n詳細: ${error.details}\nヒント: ${error.hint}`);
				setLoading(false);
				return;
			}

			// 4. 成功した場合
			console.log("作成成功:", data);
			alert("会議室の作成に成功しました！");
			
			// 必要に応じて画面遷移など（例: router.push(`/room/${data[0].id}`)）

			} catch (err: any) {
		// 想定外のJavaScriptエラーをキャッチして表示
		console.error("予期せぬエラー:", err);
		alert(`予期せぬエラーが発生しました: ${err?.message || JSON.stringify(err)}`);
		} finally {
			setLoading(false);
		}
	};

	return (
		<main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 text-slate-700">
			<div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
				{/* ロゴ・コンセプト */}
				<div className="text-center mb-8">
					<h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-wide">
						kaiten<span className="text-sky-500">e</span>
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