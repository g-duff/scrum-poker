import { BrowserRouter, Route, Routes } from 'react-router';
import { HomePage } from '#src/pages/HomePage';
import { SessionPage } from '#src/pages/SessionPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/s/:id" element={<SessionPage />} />
      </Routes>
    </BrowserRouter>
  );
}
