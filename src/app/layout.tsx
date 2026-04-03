import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ziele App – Dein persönlicher Fahrplan",
  description: "Gib deine Ziele ein und erhalte sofort deinen strukturierten Fahrplan – von der 5-Jahres-Vision bis zum Wochenziel. Direkt in deinen Kalender exportierbar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased" lang="de">
        {children}
      </body>
    </html>
  );
}
