import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-700 py-12 px-4 flex justify-center">
      <div className="max-w-3xl w-full bg-white p-8 md:p-12 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <h1 className="text-2xl font-bold text-slate-600 border-b pb-4">
          プライバシーポリシー・利用規約
        </h1>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-sky-500">1. データの収集と利用目的</h2>
          <p className="text-sm leading-relaxed text-slate-600">
            本サービスでは、ブレインライティング機能を提供するため、ユーザーが入力したアイデアテキスト、部屋の識別情報、および匿名で識別するためのIDをデータベース（Supabase）に保存・利用します。氏名やメールアドレスなどの個人を特定する情報は収集いたしません。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-sky-500">2. 外部サービスの利用</h2>
          <p className="text-sm leading-relaxed text-slate-600">
            本サービスは、データの保存・管理のためにクラウドサービス「Supabase」を利用しています。送信されたデータはSupabaseのセキュリティポリシーに基づき適切に管理されます。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-sky-500">3. 免責事項</h2>
          <p className="text-sm leading-relaxed text-slate-600">
            本サービスの利用により発生したいかなる損害・トラブルについても、当方は一切の責任を負いかねます。また、入力するテキストには個人情報や秘密情報を含めないようお願いいたします。
          </p>
        </section>

        <div className="pt-6 border-t border-slate-100 flex justify-center">
          <Link 
            href="/" 
            className="px-6 py-2 bg-sky-500 text-white text-sm font-bold rounded-full hover:bg-sky-600 transition-all"
          >
            トップページに戻る
          </Link>
        </div>
      </div>
    </main>
  );
}