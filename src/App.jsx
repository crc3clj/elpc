import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Elpc from "./ELPC";
import Editor from "./Editor";

export default function App() {
  return (
    <BrowserRouter basename="/CRC3CLJ/elpc">
      <Routes>
        <Route path="/" element={<Elpc />} />
        <Route path="/editor" element={<Editor />} />
      </Routes>
    </BrowserRouter>
  );
}