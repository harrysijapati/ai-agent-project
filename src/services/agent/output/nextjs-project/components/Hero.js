export default function Hero() {
  return (
    <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Welcome to Our Amazing Platform
        </h1>
        <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
          Discover the power of modern web development with Next.js 14. Build fast, scalable applications with ease.
        </p>
        <div className="space-x-4">
          <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition duration-300">
            Get Started
          </button>
          <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition duration-300">
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}