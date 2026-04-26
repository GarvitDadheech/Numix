import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import SplashScreen from './screens/SplashScreen'
import VerifyScreen from './screens/VerifyScreen'
import HomeScreen from './screens/HomeScreen'
import LobbyScreen from './screens/LobbyScreen'
import GameScreen from './screens/GameScreen'
import ResultScreen from './screens/ResultScreen'
import LeaderboardScreen from './screens/LeaderboardScreen'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/verify" element={<VerifyScreen />} />
        <Route path="/home" element={<HomeScreen />} />
        <Route path="/lobby" element={<LobbyScreen />} />
        <Route path="/game/:gameId" element={<GameScreen />} />
        <Route path="/result" element={<ResultScreen />} />
        <Route path="/leaderboard" element={<LeaderboardScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
