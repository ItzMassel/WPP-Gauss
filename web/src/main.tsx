import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {BrowserRouter, Route, Routes} from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import QuizPage from './pages/QuizPage.tsx'
import LecturePage from './pages/LecturePage.tsx'
import GamePage from './pages/GamePage.tsx'
import {applyTheme} from './theme/applyTheme'

applyTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/quiz/:lectureId" element={<LecturePage />} />
        <Route path="/spiel" element={<GamePage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
