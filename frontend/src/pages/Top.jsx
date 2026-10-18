import React from 'react'
import { useNavigate } from 'react-router-dom'
import "../styles/top.css"
import courtImg from '../assets/court.svg'

const Top = () => {
  const navigate = useNavigate()

  return (
    <main className='main'>
      <div className="heading">
        <div className="title-row">
          <img className='img' src={courtImg} alt="Court Logo" />
          <h1>LegalAI</h1>
        </div>
        <small id='shortheading'>(Your Personal Legal Assistant)</small>
      </div>
      <button className='startbtn' onClick={() => navigate('/login')}>Get started</button>
    </main>
  )
}

export default Top