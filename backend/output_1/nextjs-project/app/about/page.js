import Link from 'next/link';

export default function About() {
  const skills = [
    { category: 'Frontend', technologies: ['React', 'Next.js', 'Vue.js', 'TypeScript', 'Tailwind CSS'] },
    { category: 'Backend', technologies: ['Node.js', 'Express.js', 'Python', 'PostgreSQL', 'MongoDB'] },
    { category: 'Tools & Others', technologies: ['Git', 'Docker', 'AWS', 'Figma', 'Jest'] }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Portfolio</h1>
            <div className="space-x-6">
              <Link href="/home" className="text-gray-700 hover:text-blue-600">Home</Link>
              <Link href="/projects" className="text-gray-700 hover:text-blue-600">Projects</Link>
              <Link href="/about" className="text-blue-600 font-semibold">About</Link>
              <Link href="/contact" className="text-gray-700 hover:text-blue-600">Contact</Link>
            </div>
          </div>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">About Me</h2>
          <p className="text-xl text-gray-600">
            Passionate developer with a love for creating innovative solutions
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <div>
            <img
              src="/api/placeholder/400/500"
              alt="Profile"
              className="w-full rounded-lg shadow-md"
            />
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Hello! I'm John Doe</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                I'm a full-stack developer with over 5 years of experience building web applications. 
                I have a passion for creating user-friendly, efficient, and scalable solutions.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                My journey in web development started during my computer science studies, and I've been 
                continuously learning and adapting to new technologies ever since.
              </p>
              <p className="text-gray-600 leading-relaxed">
                When I'm not coding, you can find me exploring new technologies, contributing to open-source 
                projects, or enjoying outdoor activities.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-16">
          <h3 className="text-3xl font-semibold text-gray-900 mb-8 text-center">Skills & Technologies</h3>
          <div className="grid md:grid-cols-3 gap-8">
            {skills.map((skillGroup, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-md">
                <h4 className="text-xl font-semibold text-gray-900 mb-4">{skillGroup.category}</h4>
                <div className="flex flex-wrap gap-2">
                  {skillGroup.technologies.map((tech, techIndex) => (
                    <span
                      key={techIndex}
                      className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md">
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Experience</h3>
          <div className="space-y-6">
            <div className="border-l-4 border-blue-600 pl-6">
              <h4 className="text-lg font-semibold text-gray-900">Senior Full Stack Developer</h4>
              <p className="text-blue-600 font-medium">Tech Solutions Inc. • 2022 - Present</p>
              <p className="text-gray-600 mt-2">
                Lead development of enterprise web applications, mentor junior developers, 
                and collaborate with cross-functional teams to deliver high-quality solutions.
              </p>
            </div>
            <div className="border-l-4 border-blue-600 pl-6">
              <h4 className="text-lg font-semibold text-gray-900">Full Stack Developer</h4>
              <p className="text-blue-600 font-medium">Digital Agency Co. • 2020 - 2022</p>
              <p className="text-gray-600 mt-2">
                Developed responsive web applications for various clients, focusing on 
                performance optimization and user experience.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p>&copy; 2024 My Portfolio. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}