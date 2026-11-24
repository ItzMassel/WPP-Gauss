import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {BrowserRouter, Route, Routes} from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import QuizPage from './pages/QuizPage.tsx'
import LecturePage from './pages/LecturePage.tsx'
import GamePage from './pages/GamePage.tsx'
import GaussLessonPage from './pages/GaussLessonPage.tsx'
import AuthPage from './pages/AuthPage.tsx'
import {AuthProvider} from './auth/AuthContext'
import {applyTheme} from './theme/applyTheme'

applyTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/quiz/:lectureId" element={<LecturePage />} />
        <Route path="/spiel" element={<GamePage />} />
        <Route path="/lektion" element={<GaussLessonPage />} />
        <Route path="/anmelden" element={<AuthPage />} />
      </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
