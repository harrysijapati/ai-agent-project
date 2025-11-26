export default function Welcome() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-800 mb-4">Hello! 👋</h1>
        <p className="text-xl text-gray-600 mb-8">Welcome to your new Next.js 14 application</p>
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">Getting Started</h2>
          <p className="text-gray-600">Your Next.js app with App Router is ready to go. Start building amazing things!</p>
        </div>
      </div>
    </div>
  );
}