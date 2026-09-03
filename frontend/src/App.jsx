import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
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
import CompleteRegistration from './components/Auth/CompleteRegistration'
import ClientDashboard from './components/ClientDashboard'
import TvDashboard from './components/TvDashboard'
import AvisosCarousel from './components/AvisosCarousel'
import CafeComGraxa from './components/CafeComGraxa'
import Revisoes from './components/Revisoes'
import RevisaoDetalhes from './components/RevisaoDetalhes'
import Stats from './components/Stats'
import { OrcamentoBand, WhatsAppBand } from './components/CtaBands'

import Navbar from './components/Navbar'
import Testimonials from './components/Testimonials'
import Footer from './components/Footer'

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
            <OrcamentoBand />
            <Stats />
            <div id="contato"><AboutUs /></div>
            <div id="galeria"><Gallery /></div>
            <Testimonials />
            <div id="orcamento"><BudgetForm /></div>
            <WhatsAppBand />
            <Footer theme="dark" />
          </>
        } />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/fluxo-de-caixa" element={<AdminDashboard initialTab="fluxo_caixa" />} />
      <Route path="/fluxo_caixa" element={<AdminDashboard initialTab="fluxo_caixa" />} />
      <Route path="/caixa" element={<AdminDashboard initialTab="fluxo_caixa" />} />
      <Route path="/extrato" element={<AdminDashboard initialTab="fluxo_caixa" initialSubTab="extrato" />} />
      <Route path="/lancamentos" element={<AdminDashboard initialTab="fluxo_caixa" initialSubTab="extrato" />} />
      <Route path="/tv" element={<TvDashboard />} />
      <Route path="/login" element={<><Login /><Footer theme="dark" /></>} />
      <Route path="/cadastro" element={<><Cadastro /><Footer theme="dark" /></>} />
      <Route path="/esqueci-senha" element={<><ForgotPassword /><Footer theme="dark" /></>} />
      <Route path="/reset-password" element={<><ResetPassword /><Footer theme="dark" /></>} />
      <Route path="/completar-cadastro" element={<><CompleteRegistration /><Footer theme="dark" /></>} />
      <Route path="/cliente" element={<ClientDashboard />} />
      <Route path="/cafe-com-graxa" element={<CafeComGraxa />} />
      <Route path="/revisoes" element={<Revisoes />} />
      <Route path="/revisoes/:id" element={<RevisaoDetalhes />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}

export default App
