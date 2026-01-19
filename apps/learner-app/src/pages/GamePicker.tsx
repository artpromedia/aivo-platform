'use client';

export default function GamePicker() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Choose a Game</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <GameCard title="Math Challenge" description="Test your math skills" />
          <GameCard title="Word Builder" description="Build words and expand vocabulary" />
          <GameCard title="Science Quiz" description="Explore scientific concepts" />
        </div>
      </div>
    </div>
  );
}

function GameCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}
