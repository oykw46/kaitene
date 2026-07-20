import { createClient } from '@supabase/supabase-js';

// Supabase の SQL データベースと接続するための匿名キーを環境変数から取得します。
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
        'Supabaseの環境変数が設定されていません。.env.local ファイルを確認してください。'
    )
}

// Next.js 全体で使い回す Supabase の接続窓口になります。
export const supabase = createClient(supabaseUrl, supabaseAnonKey);