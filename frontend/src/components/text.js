import  {supabase } from '../lib/supabase'
function TestSupabase() {
    const testConnection = async () => {
        const { data, error } = await supabase
            .from('messeqges')
            .select('*')
        console.log('Data:', data)
        console.log('Error:', error)
    }

    return (
        <button onClick={testConnection}>
            Test Supabase Connection
        </button>
    )
}
export default TestSupabase