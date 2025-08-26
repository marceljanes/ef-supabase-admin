import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('Testing questions table...');
    
    // First, try to get the count
    const { data: countData, error: countError } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      console.error('Count error:', countError);
      return Response.json({ 
        error: 'Failed to count questions', 
        details: countError.message,
        code: countError.code
      }, { status: 500 });
    }

    // Then try to get actual data
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .limit(3);
    
    if (error) {
      console.error('Questions error:', error);
      return Response.json({ 
        error: 'Failed to fetch questions', 
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    return Response.json({ 
      success: true, 
      count: countData,
      sampleData: data,
      message: 'Questions test successful'
    });
  } catch (error) {
    console.error('Questions test error:', error);
    return Response.json({ 
      error: 'Questions test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
