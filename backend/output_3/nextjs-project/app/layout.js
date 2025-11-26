import './globals.css'

export const metadata = {
  title: 'AI Generated Next.js App',
  description: 'Created by AI Agent',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
