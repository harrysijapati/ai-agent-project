export default function About() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold text-gray-800 mb-6">About TechCorp</h2>
            <p className="text-lg text-gray-600 mb-6">
              Founded in 2015, TechCorp has been at the forefront of digital innovation, 
              helping businesses transform their operations through cutting-edge software solutions.
            </p>
            <p className="text-lg text-gray-600 mb-6">
              Our team of experienced developers, designers, and strategists work collaboratively 
              to deliver high-quality, scalable solutions that drive real business results.
            </p>
            <div className="grid grid-cols-3 gap-8 mt-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">500+</div>
                <div className="text-gray-600">Projects Completed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">50+</div>
                <div className="text-gray-600">Happy Clients</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">8+</div>
                <div className="text-gray-600">Years Experience</div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-8 rounded-lg">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Our Mission</h3>
            <p className="text-gray-700 mb-6">
              To empower businesses with innovative software solutions that simplify complex 
              processes and accelerate growth in the digital age.
            </p>
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Our Values</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-center"><span className="text-blue-600 mr-2">✓</span> Innovation & Excellence</li>
              <li className="flex items-center"><span className="text-blue-600 mr-2">✓</span> Client-Centric Approach</li>
              <li className="flex items-center"><span className="text-blue-600 mr-2">✓</span> Transparency & Trust</li>
              <li className="flex items-center"><span className="text-blue-600 mr-2">✓</span> Continuous Learning</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}