import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/auth/Auth'

function App() {
  console.log(Auth)
  return (
    <div className="App">
      <Auth />
    </div>
  )
  
}

export default App
