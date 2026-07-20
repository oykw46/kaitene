/* セッション管理用カスタムフック
 * ユーザー名をブラウザの localStorage に保存し、セッションを管理するためのフックです。
 * 次回アクセス次にも同一人物として認識できるようにします。
 */

import { useState, useEffect } from 'react';

// ユーザー情報の型定義（IDと名前を持たせます。）
// type | interface どちらも型定義で用いるメソッド。
// interface の方がオブジェクトの構造を定義するのに適しているため、今回は interface を使用します。
export interface UserSession {
    id: string; // ユーザーID（例: UUID）
    name: string; // ユーザー名
}

export function useUserSession() {
    // 今、誰がログインしているか？データを記憶しておく「箱」のようなもの。
    // 初期値は null（誰もいない空っぽの箱）
    // <UserSession | null> は、props 通りのユーザーデータ / null のどちらかが入る想定です。
    const [session, setSession] = useState<UserSession | null>(null);

    // コンポーネントが画面に描画された時に、localStorageからユーザー情報を読み込みます。
    useEffect(() => {
        const savedSession = localStorage.getItem('kaitene_session'); // ブラウザ側の「メモ帳」のようなイメージ。localStorageからセッション情報を取得します。
        if (savedSession) { // セッション情報が存在する場合は、保存されたデータをセットします。
            setSession(JSON.parse(savedSession)); // JSON文字列をオブジェクトに変換してセットします。
        }
    }, []); // [] は、最初の一回だけ実行することを意味します。

    // ユーザー情報を新しく更新・保存する関数。
    const saveSession = (name: string) => {
        const newSession: UserSession = { // 新しいユーザーセッションを作成します。
            id: crypto.randomUUID(), // ブラウザ側でランダムなユーザーIDを生成します。
            // ちなみに「UUID」とは、ネットワーク上で128ビットの識別子を生成する技術で、事実上「世界中で重複しない」文字列を作ることができるらしいです..！
            name: name,
        };
        localStorage.setItem('kaitene_session', JSON.stringify(newSession)); // 新しいセッション情報をlocalStorageに保存
        setSession(newSession); // 状態を更新して新しいセッション情報をセット
    };

    // ログアウト時の処理（セッション解除）
    const clearSession = () => {
        localStorage.removeItem('kaitene_session'); // localStorageからセッション情報を削除
        setSession(null); // 状態をnullにしてセッション情報をクリア
    };

    return { session, saveSession, clearSession }; // セッション情報とセッションを保存・クリアする関数を返す
}