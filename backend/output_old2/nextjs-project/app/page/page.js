import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-md">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Bella Vista</h1>
            <div className="space-x-6">
              <Link href="/" className="text-gray-600 hover:text-gray-800">Home</Link>
              <Link href="/menu" className="text-gray-600 hover:text-gray-800">Menu</Link>
              <Link href="/reservations" className="text-gray-600 hover:text-gray-800">Reservations</Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-amber-50 to-orange-100 py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-5xl font-bold text-gray-800 mb-4">Welcome to Bella Vista</h2>
          <p className="text-xl text-gray-600 mb-8">Experience authentic Italian cuisine in an elegant atmosphere</p>
          <div className="space-x-4">
            <Link href="/menu" className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold">View Menu</Link>
            <Link href="/reservations" className="bg-transparent border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white px-8 py-3 rounded-lg font-semibold">Make Reservation</Link>
          </div>
        </div>
      </section>

      {/* Featured Items */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <h3 className="text-3xl font-bold text-center mb-12">Our Specialties</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
              <h4 className="text-xl font-semibold mb-2">Truffle Risotto</h4>
              <p className="text-gray-600">Creamy arborio rice with black truffle and parmesan</p>
            </div>
            <div className="text-center">
              <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
              <h4 className="text-xl font-semibold mb-2">Osso Buco</h4>
              <p className="text-gray-600">Braised veal shanks with saffron risotto</p>
            </div>
            <div className="text-center">
              <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
              <h4 className="text-xl font-semibold mb-2">Tiramisu</h4>
              <p className="text-gray-600">Classic Italian dessert with espresso and mascarpone</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-6 text-center">
          <p>&copy; 2024 Bella Vista Restaurant. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}