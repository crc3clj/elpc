import React from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import Elpc from "./Elpc";
import Editor from "./Editor";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Elpc />} />
        <Route path="/editor" element={<Editor />} />
      </Routes>
    </HashRouter>
  );
}