import "./globals.css";

export const metadata = {
  title: "Handbook",
  description:
    "A reasoning-memory layer for financial decisions, built as a Claude MCP connector.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
