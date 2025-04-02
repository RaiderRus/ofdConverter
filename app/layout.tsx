import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "antd/dist/reset.css";
import Layout from "../frontend/components/Layout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OFD Converter",
  description: "Конвертер OFD файлов",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
