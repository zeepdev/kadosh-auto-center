import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Hero from './components/Hero'
import AboutUs from './components/AboutUs'
import Services from './components/Services'
import Gallery from './components/Gallery'
import BudgetForm from './components/BudgetForm'
import AdminDashboard from './components/Admin/AdminDashboard'
import Login from './components/Auth/Login'
import Cadastro from './components/Auth/Cadastro'
import ClientDashboard from './components/ClientDashboard'

function App() {
  return (
    <Routes>
      <Route path="/" element={
        <>
          <Hero />
          <Services />
          <Gallery />
          <BudgetForm />
          <AboutUs />
        </>
      } />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route path="/cliente" element={<ClientDashboard />} />
    </Routes>
  )
}

export default App
