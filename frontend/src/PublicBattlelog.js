import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Battlelog from './components/Battlelog';

// This is the PUBLIC battlelog - no authentication required!
function PublicBattlelog() {
  return (
    <Router>
      <Routes>
        <Route path="*" element={<Battlelog />} />
      </Routes>
    </Router>
  );
}

export default PublicBattlelog;
