import Link from 'next/link';

export default function Menu() {
  const menuItems = {
    appetizers: [
      { name: 'Bruschetta Trio', price: '$14', description: 'Three varieties with tomato, olive tapenade, and ricotta' },
      { name: 'Burrata & Prosciutto', price: '$18', description: 'Creamy burrata with San Daniele prosciutto and arugula' },
      { name: 'Calamari Fritti', price: '$16', description: 'Crispy squid rings with spicy marinara sauce' }
    ],
    mains: [
      { name: 'Truffle Risotto', price: '$28', description: 'Creamy arborio rice with black truffle and parmesan' },
      { name: 'Osso Buco', price: '$34', description: 'Braised veal shanks with saffron risotto and gremolata' },
      { name: 'Branzino al Sale', price: '$32', description: 'Mediterranean sea bass baked in sea salt crust' },
      { name: 'Bistecca Fiorentina', price: '$48', description: 'Grilled T-bone steak with rosemary and garlic' }
    ],
    desserts: [
      { name: 'Tiramisu', price: '$12', description: 'Classic Italian dessert with espresso and mascarpone' },
      { name: 'Panna Cotta', price: '$10', description: 'Vanilla bean panna cotta with berry compote' },
      { name: 'Cannoli Siciliani', price: '$14', description: 'Traditional Sicilian cannoli with ricotta and pistachios' }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-gray-800">Bella Vista</Link>
            <div className="space-x-6">
              <Link href="/" className="text-gray-600 hover:text-gray-800">Home</Link>
              <Link href="/menu" className="text-orange-500 font-semibold">Menu</Link>
              <Link href="/reservations" className="text-gray-600 hover:text-gray-800">Reservations</Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Menu Content */}
      <div className="container mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-center mb-12 text-gray-800">Our Menu</h1>
        
        {/* Appetizers */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-orange-500 border-b-2 border-orange-200 pb-2">Appetizers</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {menuItems.appetizers.map((item, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-semibold text-gray-800">{item.name}</h3>
                  <span className="text-orange-500 font-bold text-lg">{item.price}</span>
                </div>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Main Courses */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-orange-500 border-b-2 border-orange-200 pb-2">Main Courses</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {menuItems.mains.map((item, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-semibold text-gray-800">{item.name}</h3>
                  <span className="text-orange-500 font-bold text-lg">{item.price}</span>
                </div>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Desserts */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-orange-500 border-b-2 border-orange-200 pb-2">Desserts</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {menuItems.desserts.map((item, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-semibold text-gray-800">{item.name}</h3>
                  <span className="text-orange-500 font-bold text-lg">{item.price}</span>
                </div>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <div className="text-center bg-orange-50 rounded-lg p-8">
          <h3 className="text-2xl font-bold mb-4 text-gray-800">Ready to Dine?</h3>
          <p className="text-gray-600 mb-6">Reserve your table now and experience the finest Italian cuisine</p>
          <Link href="/reservations" className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold">Make a Reservation</Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-6 text-center">
          <p>&copy; 2024 Bella Vista Restaurant. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}