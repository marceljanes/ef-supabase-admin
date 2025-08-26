import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Test Supabase connection
    const { data, error } = await supabase
      .from('exam_pages')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase error:', error);
      return Response.json({ 
        error: 'Database connection failed', 
        details: error.message 
      }, { status: 500 });
    }

    return Response.json({ 
      success: true, 
      message: 'Database connection successful',
      data: data
    });
  } catch (error) {
    console.error('Connection test error:', error);
    return Response.json({ 
      error: 'Connection test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
