import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Portfolio</h1>
            <div className="space-x-6">
              <Link href="/home" className="text-gray-700 hover:text-blue-600">Home</Link>
              <Link href="/projects" className="text-gray-700 hover:text-blue-600">Projects</Link>
              <Link href="/about" className="text-gray-700 hover:text-blue-600">About</Link>
              <Link href="/contact" className="text-gray-700 hover:text-blue-600">Contact</Link>
            </div>
          </div>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <section className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">Welcome to My Portfolio</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            I'm a passionate developer creating innovative solutions and beautiful experiences.
          </p>
          <Link href="/projects" className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition">
            View My Work
          </Link>
        </section>

        <section className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3">Web Development</h3>
            <p className="text-gray-600">Full-stack web applications using modern technologies like React, Next.js, and Node.js.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3">UI/UX Design</h3>
            <p className="text-gray-600">Creating intuitive and beautiful user interfaces with a focus on user experience.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3">Mobile Apps</h3>
            <p className="text-gray-600">Building cross-platform mobile applications with React Native and Flutter.</p>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p>&copy; 2024 My Portfolio. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}