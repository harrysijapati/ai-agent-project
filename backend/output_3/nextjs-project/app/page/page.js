import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const featuredProducts = [
    {
      id: 1,
      name: 'Classic White T-Shirt',
      description: 'Comfortable cotton blend tee',
      price: 29.99,
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400'
    },
    {
      id: 2,
      name: 'Denim Jacket',
      description: 'Vintage style denim jacket',
      price: 79.99,
      image: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=400'
    },
    {
      id: 3,
      name: 'Summer Dress',
      description: 'Flowy summer dress perfect for any occasion',
      price: 59.99,
      image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400'
    },
    {
      id: 4,
      name: 'Leather Boots',
      description: 'Durable leather boots for all seasons',
      price: 129.99,
      image: 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5d?w=400'
    }
  ];

  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <section className="relative h-96 bg-gradient-to-r from-gray-900 to-gray-700 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-5xl font-bold mb-4">Welcome to StyleHub</h1>
          <p className="text-xl mb-8">Discover the latest fashion trends and timeless classics</p>
          <button className="bg-white text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
            Shop Now
          </button>
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Featured Products</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Categories Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Shop by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">M</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Men's Collection</h3>
              <p className="text-gray-600 mb-4">Stylish and comfortable clothing for men</p>
              <a href="/men" className="text-blue-500 hover:underline">Shop Men's →</a>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">W</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Women's Collection</h3>
              <p className="text-gray-600 mb-4">Elegant and trendy fashion for women</p>
              <a href="/women" className="text-pink-500 hover:underline">Shop Women's →</a>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">A</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Accessories</h3>
              <p className="text-gray-600 mb-4">Complete your look with our accessories</p>
              <a href="/accessories" className="text-green-500 hover:underline">Shop Accessories →</a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}