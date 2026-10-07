import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Report from "./pages/Report";
import Interview from "./pages/Interview";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/interview" element={<Interview />} />
        <Route path="/report/:sessionId" element={<Report />} />
        <Route path="/report" element={<Report />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
