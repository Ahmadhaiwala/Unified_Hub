import { supabase } from '../lib/supabase'

function Chat() {
  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messeges')
      .select('*')
  if (error) {
  console.error('Supabase error:', error)
  return
}


    console.log(data)
  }

  return (
    <button onClick={fetchMessages}>
      Load Messages
    </button>
  )
}

export default Chat
