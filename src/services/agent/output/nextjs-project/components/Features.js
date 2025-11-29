export default function Features() {
  const features = [
    {
      title: "Fast Performance",
      description: "Built with Next.js 14 for optimal speed and performance.",
      icon: "⚡"
    },
    {
      title: "Modern Design",
      description: "Clean and responsive design using Tailwind CSS.",
      icon: "🎨"
    },
    {
      title: "Easy to Use",
      description: "Simple and intuitive interface for the best user experience.",
      icon: "✨"
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Amazing Features
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover what makes our platform special with these incredible features.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}