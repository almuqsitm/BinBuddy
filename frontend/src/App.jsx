import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'


function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div className='bg-green-100 h-screen'>
        <h1 className='text-3xl font-bold text-center'>Welcome to BinBuddy!</h1>
      </div>
    </>
  )
}

export default App
