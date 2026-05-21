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
import ForgotPassword from './components/Auth/ForgotPassword'
import ResetPassword from './components/Auth/ResetPassword'
import ClientDashboard from './components/ClientDashboard'
import TvDashboard from './components/TvDashboard'
import AvisosCarousel from './components/AvisosCarousel'

import Navbar from './components/Navbar'
import Testimonials from './components/Testimonials'

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={
          <>
            <div id="inicio"><Hero /></div>
            <AvisosCarousel />
            <div id="servicos"><Services /></div>
            <div id="galeria"><Gallery /></div>
            <Testimonials />
            <div id="orcamento"><BudgetForm /></div>
            <div id="contato"><AboutUs /></div>
          </>
        } />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/tv" element={<TvDashboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route path="/esqueci-senha" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/cliente" element={<ClientDashboard />} />
    </Routes>
  )
}

export default App
