export default function TestEnvPage() {
  // Log ra console để kiểm tra
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Có key' : 'Không có key')
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Kiểm tra Environment Variables</h1>
      
      <div className="space-y-2">
        <div className="p-4 border rounded">
          <strong>NEXT_PUBLIC_SUPABASE_URL:</strong><br/>
          {process.env.NEXT_PUBLIC_SUPABASE_URL ? (
            <span className="text-green-600">✅ {process.env.NEXT_PUBLIC_SUPABASE_URL}</span>
          ) : (
            <span className="text-red-600">❌ Không tìm thấy</span>
          )}
        </div>
        
        <div className="p-4 border rounded">
          <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong><br/>
          {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? (
            <span className="text-green-600">✅ Đã có key (độ dài: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length} ký tự)</span>
          ) : (
            <span className="text-red-600">❌ Không tìm thấy</span>
          )}
        </div>

        <div className="p-4 border rounded">
          <strong>SUPABASE_SERVICE_ROLE_KEY:</strong><br/>
          {process.env.SUPABASE_SERVICE_ROLE_KEY ? (
            <span className="text-green-600">✅ Đã có key (độ dài: {process.env.SUPABASE_SERVICE_ROLE_KEY.length} ký tự)</span>
          ) : (
            <span className="text-red-600">❌ Không tìm thấy</span>
          )}
        </div>

        <div className="p-4 border rounded">
          <strong>NEXT_PUBLIC_APP_URL:</strong><br/>
          {process.env.NEXT_PUBLIC_APP_URL ? (
            <span className="text-green-600">✅ {process.env.NEXT_PUBLIC_APP_URL}</span>
          ) : (
            <span className="text-red-600">❌ Không tìm thấy</span>
          )}
        </div>
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
        <h2 className="font-bold mb-2">📋 Debug Info:</h2>
        <pre className="text-xs overflow-auto">
{JSON.stringify({
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓' : '✗',
  ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓' : '✗',
  SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗',
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ? '✓' : '✗',
}, null, 2)}
        </pre>
      </div>
    </div>
  )
}
