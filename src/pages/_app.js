import { Geist, Inter } from "next/font/google";
import "@/styles/globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export default function App({ Component, pageProps }) {
  return (
    <div
      className={`${geist.variable} ${inter.variable} font-inter antialiased min-h-screen bg-background text-on-background`}
    >
      <Component {...pageProps} />
    </div>
  );
}
