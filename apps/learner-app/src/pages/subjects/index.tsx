import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { PageLoader } from '@/components/PageLoader';

// K5 Subjects
const K5Math = lazy(() => import('./k5/Math'));
const K5Reading = lazy(() => import('./k5/Reading'));
const K5Science = lazy(() => import('./k5/Science'));
const K5SocialStudies = lazy(() => import('./k5/SocialStudies'));
const K5Art = lazy(() => import('./k5/Art'));
const K5Music = lazy(() => import('./k5/Music'));
const K5Writing = lazy(() => import('./k5/Writing'));
const K5PE = lazy(() => import('./k5/PE'));

// Middle School Subjects
const MSAlgebra = lazy(() => import('./ms/Algebra'));
const MSGeometry = lazy(() => import('./ms/Geometry'));
const MSPreAlgebra = lazy(() => import('./ms/PreAlgebra'));
const MSEnglish = lazy(() => import('./ms/English'));
const MSScience = lazy(() => import('./ms/Science'));
const MSHistory = lazy(() => import('./ms/History'));

// High School Subjects
const HSCalculus = lazy(() => import('./hs/Calculus'));
const HSBiology = lazy(() => import('./hs/Biology'));
const HSChemistry = lazy(() => import('./hs/Chemistry'));
const HSPhysics = lazy(() => import('./hs/Physics'));
const HSEnglish = lazy(() => import('./hs/English'));
const HSHistory = lazy(() => import('./hs/History'));
const HSAlgebra2 = lazy(() => import('./hs/Algebra2'));
const HSGeometry = lazy(() => import('./hs/Geometry'));

export function SubjectRoutes() {
  return (
    <Suspense fallback={<PageLoader message="Loading subject..." />}>
      <Routes>
        {/* K5 Routes */}
        <Route path="k5/math" element={<K5Math />} />
        <Route path="k5/reading" element={<K5Reading />} />
        <Route path="k5/science" element={<K5Science />} />
        <Route path="k5/social-studies" element={<K5SocialStudies />} />
        <Route path="k5/art" element={<K5Art />} />
        <Route path="k5/music" element={<K5Music />} />
        <Route path="k5/writing" element={<K5Writing />} />
        <Route path="k5/pe" element={<K5PE />} />

        {/* Middle School Routes */}
        <Route path="ms/algebra" element={<MSAlgebra />} />
        <Route path="ms/geometry" element={<MSGeometry />} />
        <Route path="ms/pre-algebra" element={<MSPreAlgebra />} />
        <Route path="ms/english" element={<MSEnglish />} />
        <Route path="ms/science" element={<MSScience />} />
        <Route path="ms/history" element={<MSHistory />} />

        {/* High School Routes */}
        <Route path="hs/calculus" element={<HSCalculus />} />
        <Route path="hs/biology" element={<HSBiology />} />
        <Route path="hs/chemistry" element={<HSChemistry />} />
        <Route path="hs/physics" element={<HSPhysics />} />
        <Route path="hs/english" element={<HSEnglish />} />
        <Route path="hs/history" element={<HSHistory />} />
        <Route path="hs/algebra-2" element={<HSAlgebra2 />} />
        <Route path="hs/geometry" element={<HSGeometry />} />
      </Routes>
    </Suspense>
  );
}

export default SubjectRoutes;
