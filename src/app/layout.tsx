import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ----------------------------------------------------
// サイト全体のSEO・OGP・アイコン設定
// ----------------------------------------------------
export const metadata: Metadata = {
    // 1. 基本的なSEO情報
    title: {
        default: "kaitene - ブレインライティングアプリ",
        template: "%s | kaitene", // 各ページでタイトルを拡張する際のテンプレート
    },
    description: "オンラインでスムーズにアイデア出しができる、リアルタイム・ブレインライティングツールです。",
    
    // 2. ファビコン・アイコン設定
    icons: {
        icon: "/favicon.ico",
        apple: "/apple-touch-icon.png",
    },

    // 3. OGP設定（LINE, Discord, Facebookなど）
    openGraph: {
        title: "kaitene - ブレインライティングアプリ",
        description: "オンラインでスムーズにアイデア出しができる、リアルタイム・ブレインライティングツールです。",
        url: "https://kaitene.vercel.app", // ※ご自身のVercelドメインに変更してください
        siteName: "kaitene",
        images: [
            {
                url: "/ogp-image.png", // public/ogp-image.png を参照します
                width: 1200,
                height: 630,
                alt: "kaitene メイン画像",
            },
        ],
        locale: "ja_JP",
        type: "website",
    },

    // 4. X (旧Twitter) カード設定
    twitter: {
        card: "summary_large_image", // 大きな画像付きカード表示
        title: "kaitene - ブレインライティングアプリ",
        description: "オンラインでスムーズにアイデア出しができる、リアルタイム・ブレインライティングツールです。",
        images: ["/ogp-image.png"],
    },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
