import './globals.css'

export const metadata = {
  title: 'AI Agent Builder',
  description: 'ReAct Pattern Agent for Creating Next.js Pages & Components',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
